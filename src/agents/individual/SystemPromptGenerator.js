import BaseAgent from '../core/BaseAgent.js';
import config from '../config/index.js';
import pool from '../../config/database.js';

/**
 * Model 2: System Prompt Creator & Preference Manager
 * Generates and updates system prompts for Model 4 and Model 5
 * Manages global user preferences with update/removal capabilities
 * Uses gemini-2.5-flash for intelligent preference detection and management
 */
export class SystemPromptGenerator extends BaseAgent {
  constructor() {
    super({
      name: 'SystemPromptGenerator',
      model: 'gemini-2.5-flash', // Using gemini-2.5-flash for preference analysis
      temperature: 0.3,
      maxOutputTokens: 2000,
      systemPrompt: `You are an expert preference analyzer and system prompt creator for educational AI.

Your responsibilities:
1. Analyze user messages to detect preference changes
2. Update global preferences (format, style, complexity)
3. Remove outdated/conflicting preferences
4. Generate personalized system prompts for teaching models

Key capabilities:
- Detect explicit preferences: "I hate text, use flashcards", "I prefer videos"
- Detect implicit preferences from learning patterns
- Remove outdated preferences when user changes mind
- Maintain preference history and reasoning`,
    });
    
    /** @type {Map<string, any>} */
    this.userPreferences = new Map(); // Cache user preferences
  }

  /**
   * @param {import('../types/index.js').AgentMessage} message
   * @returns {Promise<import('../types/index.js').AgentResponse>}
   */
  async processMessage(message) {
    try {
      switch (message.type) {
        case 'request':
          return await this.handleRequest(message);
        case 'notification':
          return await this.handleNotification(message);
        default:
          return this.createResponse(null, 'Unsupported message type');
      }
    } catch (error) {
      return this.createResponse(null, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Handle request messages
   * @private
   */
  async handleRequest(message) {
    const { action, data } = message.content;

    switch (action) {
      case 'generate_system_prompt':
        return await this.generateSystemPrompt(data);
      case 'update_system_prompt':
        return await this.updateSystemPrompt(data);
      case 'analyze_preferences':
        return await this.analyzeAndUpdatePreferences(data);
      default:
        return this.createResponse(null, 'Unsupported action');
    }
  }

  /**
   * Analyze user message and update global preferences
   * Detects new preferences, updates existing ones, removes outdated ones
   * @private
   */
  async analyzeAndUpdatePreferences(data) {
    const { userId, userMessage, userPreferences = {}, conversationHistory = [] } = data;

    console.log(`🔍 [Model 2] Analyzing preferences for user ${userId}...`);

    // Get current stored preferences
    let currentPrefs = await this.getUserPreferences(userId);

    const analysisPrompt = `You are analyzing a user's message to update their learning preferences.

CURRENT USER PREFERENCES:
${JSON.stringify(currentPrefs, null, 2)}

USER'S LATEST MESSAGE:
"${userMessage}"

RECENT CONVERSATION HISTORY:
${conversationHistory.slice(-3).map(msg => `${msg.is_user ? 'Student' : 'Teacher'}: ${msg.message}`).join('\n')}

TASK:
1. Detect if the user is expressing a NEW preference or CHANGING an existing one
2. Identify which preferences to UPDATE or REMOVE
3. Determine the preferred output format (text/video/flashcards)

PREFERENCE DETECTION RULES:

**Explicit Format Preferences** (HIGH PRIORITY - SAVE GLOBALLY):
- "I hate text" / "too much text" → Set formatPreference to "flashcards" or "video"
- "use flashcards" / "give me flashcards" → formatPreference = "flashcards"
- "I prefer videos" / "make a video" → formatPreference = "video"
- "explain in text" / "write it out" → formatPreference = "text"
- "no more videos" → Remove video preference

**Changing Preferences** (REMOVE OLD, SET NEW):
- "No, I like X better" → removePreferences: [old format], set new formatPreference
- "Actually, I prefer Y" → Remove conflicting preferences, set new one
- "Change to Z" → Update to new preference

**Additional Preference Types**:
- "always give examples" → wants_examples = true
- "I don't need examples" → wants_examples = false
- "use analogies" → wants_analogies = true
- "I learn better with exercises" → wants_exercises = true

**Implicit Preferences**:
- Asking "summarize" / "key points" → Suggest flashcards
- Asking "show me" / "demonstrate" → Suggest video
- Asking "explain in detail" → Suggest text

**Learning Style Detection**:
- Visual language ("show", "see", "picture") → learning_style = "visual"
- "I like to hear" / "read aloud" → learning_style = "auditory"  
- "I prefer to read" → learning_style = "reading_writing"
- "hands-on" → learning_style = "kinesthetic"

RESPONSE FORMAT (JSON only):
{
  "preferencesChanged": boolean,
  "updates": {
    "formatPreference": "text|video|flashcards|null",
    "explanation_style": "concise|detailed|balanced|null",
    "learningStyle": "visual|auditory|reading_writing|kinesthetic|mixed|null",
    "pace": "slow|normal|fast|null",
    "complexity": "beginner|intermediate|advanced|null",
    "wants_examples": boolean or null,
    "wants_analogies": boolean or null,
    "wants_exercises": boolean or null,
    "removePreferences": ["list", "of", "outdated", "preference", "field", "names"]
  },
  "reasoning": "Why these changes were made",
  "preferredFormat": "text|video|flashcards",
  "confidence": number (0-100),
  "indicators": ["specific evidence from message"]
}

If NO preference changes detected, set preferencesChanged to false and return current format.`;

    try {
      const response = await this.llm.invoke(analysisPrompt);
      const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
      const analysis = this.extractJSON(content);

      console.log(`📊 [Model 2] Preference analysis:`, {
        changed: analysis.preferencesChanged,
        format: analysis.preferredFormat,
        confidence: analysis.confidence
      });

      // Update preferences if changed
      if (analysis.preferencesChanged) {
        currentPrefs = await this.updateUserPreferences(userId, analysis.updates, currentPrefs);
        console.log(`✅ [Model 2] Preferences updated for user ${userId}`);
      }

      return this.createResponse({
        formatAnalysis: {
          preferredFormat: analysis.preferredFormat || currentPrefs.formatPreference || 'text',
          confidence: analysis.confidence || 50,
          reasoning: analysis.reasoning,
          indicators: analysis.indicators || [],
          preferencesUpdated: analysis.preferencesChanged,
          currentPreferences: currentPrefs
        }
      });

    } catch (error) {
      console.error('Error analyzing preferences:', error);
      
      // Fallback to current preferences
      return this.createResponse({
        formatAnalysis: {
          preferredFormat: currentPrefs.formatPreference || 'text',
          confidence: 50,
          reasoning: 'Using stored preferences (analysis failed)',
          indicators: [],
          preferencesUpdated: false,
          currentPreferences: currentPrefs
        }
      });
    }
  }

  /**
   * Get user preferences from database
   * @private
   */
  async getUserPreferences(userId) {
    try {
      // Check cache first
      if (this.userPreferences.has(userId)) {
        return this.userPreferences.get(userId);
      }

      const result = await pool.query(
        `SELECT learning_style, pace, preferred_difficulty, explanation_style, 
                wants_examples, wants_analogies, wants_exercises, custom_preferences 
         FROM user_preferences WHERE user_id = $1`,
        [userId]
      );

      if (result.rows.length > 0) {
        const row = result.rows[0];
        const prefs = {
          learningStyle: row.learning_style,
          pace: row.pace,
          complexity: row.preferred_difficulty,
          formatPreference: row.explanation_style,
          wants_examples: row.wants_examples,
          wants_analogies: row.wants_analogies,
          wants_exercises: row.wants_exercises,
          custom: row.custom_preferences || {}
        };
        
        // Cache it
        this.userPreferences.set(userId, prefs);
        return prefs;
      }

      // Default preferences - create entry if doesn't exist
      await pool.query(
        `INSERT INTO user_preferences (user_id, learning_style, pace, preferred_difficulty, explanation_style, wants_examples, wants_analogies, wants_exercises)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (user_id) DO NOTHING`,
        [userId, 'mixed', 'normal', 'intermediate', 'balanced', true, true, true]
      );

      const defaultPrefs = {
        learningStyle: 'mixed',
        pace: 'normal',
        complexity: 'intermediate',
        formatPreference: 'balanced',
        wants_examples: true,
        wants_analogies: true,
        wants_exercises: true,
        custom: {}
      };

      this.userPreferences.set(userId, defaultPrefs);
      return defaultPrefs;
    } catch (error) {
      console.error('Error getting user preferences:', error);
      return {
        learningStyle: 'mixed',
        pace: 'normal',
        complexity: 'intermediate',
        formatPreference: 'balanced',
        wants_examples: true,
        wants_analogies: true,
        wants_exercises: true,
        custom: {}
      };
    }
  }

  /**
   * Update user preferences in database
   * @private
   */
  async updateUserPreferences(userId, updates, currentPrefs) {
    try {
      const newPrefs = { ...currentPrefs };

      // Apply updates
      if (updates.formatPreference !== null && updates.formatPreference !== undefined) {
        newPrefs.formatPreference = updates.formatPreference;
      }
      if (updates.learningStyle !== null && updates.learningStyle !== undefined) {
        newPrefs.learningStyle = updates.learningStyle;
      }
      if (updates.pace !== null && updates.pace !== undefined) {
        newPrefs.pace = updates.pace;
      }
      if (updates.complexity !== null && updates.complexity !== undefined) {
        newPrefs.complexity = updates.complexity;
      }
      if (updates.wants_examples !== null && updates.wants_examples !== undefined) {
        newPrefs.wants_examples = updates.wants_examples;
      }
      if (updates.wants_analogies !== null && updates.wants_analogies !== undefined) {
        newPrefs.wants_analogies = updates.wants_analogies;
      }
      if (updates.wants_exercises !== null && updates.wants_exercises !== undefined) {
        newPrefs.wants_exercises = updates.wants_exercises;
      }
      if (updates.explanation_style !== null && updates.explanation_style !== undefined) {
        newPrefs.formatPreference = updates.explanation_style; // Map explanation_style to formatPreference
      }

      // Remove outdated preferences if specified
      if (updates.removePreferences && Array.isArray(updates.removePreferences)) {
        updates.removePreferences.forEach(pref => {
          if (pref === 'formatPreference' || pref === 'explanation_style') {
            newPrefs.formatPreference = 'balanced';
          }
          if (pref === 'learningStyle') newPrefs.learningStyle = 'mixed';
          if (pref === 'pace') newPrefs.pace = 'normal';
          if (pref === 'complexity') newPrefs.complexity = 'intermediate';
          if (pref === 'wants_examples') newPrefs.wants_examples = true;
          if (pref === 'wants_analogies') newPrefs.wants_analogies = true;
          if (pref === 'wants_exercises') newPrefs.wants_exercises = true;
        });
      }

      // Update database - use user_preferences table
      await pool.query(
        `UPDATE user_preferences 
         SET learning_style = $1, 
             pace = $2, 
             preferred_difficulty = $3, 
             explanation_style = $4,
             wants_examples = $5,
             wants_analogies = $6,
             wants_exercises = $7,
             preference_changes_count = preference_changes_count + 1
         WHERE user_id = $8`,
        [
          newPrefs.learningStyle, 
          newPrefs.pace, 
          newPrefs.complexity, 
          newPrefs.formatPreference,
          newPrefs.wants_examples,
          newPrefs.wants_analogies,
          newPrefs.wants_exercises,
          userId
        ]
      );

      // Update cache
      this.userPreferences.set(userId, newPrefs);

      console.log(`💾 [Model 2] Saved preferences to user_preferences table:`, newPrefs);

      return newPrefs;
    } catch (error) {
      console.error('Error updating user preferences:', error);
      return currentPrefs;
    }
  }

  /**
   * Extract JSON from text
   * @private
   */
  extractJSON(text) {
    try {
      return JSON.parse(text);
    } catch {
      const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }
      
      const objectMatch = text.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        return JSON.parse(objectMatch[0]);
      }
      
      throw new Error('No valid JSON found in response');
    }
  }

  /**
   * Handle notification messages
   * @private
   */
  async handleNotification(message) {
    const { event, data } = message.content;

    switch (event) {
      case 'feedback_received':
        return await this.incorporateFeedback(data);
      case 'learning_pattern_detected':
        return await this.adaptToLearningPattern(data);
      default:
        return this.createResponse({ acknowledged: true });
    }
  }

  /**
   * Generate initial system prompt
   * @private
   */
  async generateSystemPrompt(data) {
    const { userId, userPreferences = {}, lessonContext = {} } = data;

    // Get latest preferences from database
    const currentPrefs = await this.getUserPreferences(userId);

    const lessonTitle = lessonContext?.title || 'General Learning Topic';
    const lessonTopic = lessonContext?.topic || 'General';
    const learningStyle = currentPrefs.learningStyle || userPreferences.learningStyle || 'adaptive';
    const pace = currentPrefs.pace || userPreferences.pace || 'medium';
    const complexity = currentPrefs.complexity || userPreferences.complexity || 'intermediate';
    const formatPref = currentPrefs.formatPreference || userPreferences.formatPreference || 'text';

    const systemPrompt = `You are an AI tutor helping a student learn about "${lessonTitle}" (Topic: ${lessonTopic}).

STUDENT PROFILE:
- Learning Style: ${learningStyle}
- Preferred Pace: ${pace}
- Complexity Level: ${complexity}
- Preferred Format: ${formatPref}

YOUR ROLE:
- Provide clear, personalized explanations
- Adapt to the student's learning pace
- Use examples relevant to their level
- Encourage questions and exploration
- ${formatPref === 'flashcards' ? 'Focus on bite-sized, memorizable facts' : ''}
- ${formatPref === 'video' ? 'Describe visual demonstrations clearly' : ''}
- ${formatPref === 'text' ? 'Provide detailed written explanations' : ''}

TEACHING APPROACH:
- ${pace === 'fast' ? 'Be concise and efficient' : pace === 'slow' ? 'Be patient and thorough' : 'Balance detail with clarity'}
- ${complexity === 'basic' ? 'Use simple language and basic concepts' : complexity === 'advanced' ? 'Include technical details and advanced concepts' : 'Provide intermediate-level explanations'}
- Always check for understanding
- Build on previous knowledge

Remember: Adapt your teaching style based on student responses and feedback.`;

    console.log(`✅ [Model 2] Generated system prompt for user ${userId}`);

    return this.createResponse({
      systemPrompt,
      version: 1,
      preferences: currentPrefs
    });
  }

  /**
   * Update system prompt based on feedback
   * @private
   */
  async updateSystemPrompt(data) {
    const { userId, feedback, previousPrompt } = data;

    console.log(`🔄 [Model 2] Updating system prompt based on feedback`);

    // Get current preferences
    const currentPrefs = await this.getUserPreferences(userId);

    // Regenerate with updated preferences
    return await this.generateSystemPrompt({ userId, userPreferences: currentPrefs });
  }

  /**
   * Get current system prompt
   * @private
   */
  async getSystemPrompt(data) {
    const { userId } = data;
    
    const currentPrefs = await this.getUserPreferences(userId);
    
    return this.createResponse({
      preferences: currentPrefs
    });
  }

  /**
   * Adapt to detected learning patterns
   * @private
   */
  async adaptToLearningPattern(data) {
    console.log(`📈 [Model 2] Adapting to learning pattern`);
    return this.createResponse({ acknowledged: true });
  }

  /**
   * Incorporate feedback
   * @private
   */
  async incorporateFeedback(data) {
    console.log(`💡 [Model 2] Incorporating feedback`);
    return this.createResponse({ acknowledged: true });
  }
}

export default SystemPromptGenerator;
