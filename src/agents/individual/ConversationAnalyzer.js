import BaseAgent from '../core/BaseAgent.js';
import config from '../config/index.js';

/**
 * Model 3: Conversation Analyzer
 * Detects when user is stuck or expresses new preferences
 * Sends feedback to Model 2 (System Prompt Creator) for adjustments
 * Uses GPT-4o for advanced preference detection and management
 */
export class ConversationAnalyzer extends BaseAgent {
  constructor() {
    super({
      name: 'ConversationAnalyzer',
      model: 'gpt-5-nano', // Using GPT-4o (gpt5 equivalent) for preference analysis
      temperature: 0.3,
      maxTokens: 1500,
      systemPrompt: `You are an expert conversation analyzer for educational AI systems.

Your primary responsibilities:
1. **Detect Global Learning Preferences**: Identify when users express preferences that should be saved globally
2. **Detect Preference Changes**: Recognize when users want to change existing preferences
3. **Identify Outdated Preferences**: Flag preferences that conflict with new ones and should be removed
4. **Detect Learning Struggles**: Identify when users are stuck or confused

Key Capabilities:
- Parse explicit preferences: "I hate text, use flashcards", "I prefer videos", "Give me more examples"
- Detect implicit preferences from patterns: repeated requests, learning style indicators
- Identify conflicting preferences: "No, I like videos better" → remove flashcard preference
- Distinguish between one-off requests vs. global preferences
- Track user frustration and confusion signals

Preference Types to Track:
- Format preferences: text, video, flashcards
- Learning style: visual, auditory, reading/writing, kinesthetic
- Explanation style: concise, detailed, balanced
- Pace: slow, normal, fast
- Wants examples, analogies, exercises (boolean preferences)`,
    });
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
      case 'analyze_conversation':
        return await this.analyzeConversation(data);
      case 'route_to_teacher':
        return await this.routeToAppropriateTeacher(data);
      default:
        return this.createResponse(null, 'Unsupported action');
    }
  }

  /**
   * Route to the appropriate teaching model based on format preference
   * @private
   */
  async routeToAppropriateTeacher(data) {
    const { formatPreference, userMessage, lessonContext } = data;

    // Map format preferences to model names
    const modelRouting = {
      'text': 'TeacherModel',        // Model 4 - Traditional text explanations
      'video': 'VideoGenerator',      // Model 7 - Video scripts/storyboards
      'flashcards': 'FlashcardGenerator'  // Model 8 - Flashcard sets
    };

    const targetModel = modelRouting[formatPreference] || 'TeacherModel';

    console.log(`🔀 [Model 3] Routing to ${targetModel} for ${formatPreference} format`);

    return this.createResponse({
      targetModel,
      format: formatPreference,
      message: `Routing to ${targetModel} for ${formatPreference} learning`,
    });
  }

  /**
   * Analyze a user message in context to detect issues or preferences
   * @private
   */
  async analyzeConversation(data) {
    const { 
      userMessage, 
      conversationHistory = [], 
      currentPreferences = {},
      lessonContext = null 
    } = data;

    const analysisPrompt = `You are analyzing a learning conversation to detect GLOBAL PREFERENCES that should be saved to the user's profile.

USER MESSAGE: "${userMessage}"

CONVERSATION HISTORY (last 10 messages):
${conversationHistory.slice(-10).map((msg, i) => `${i + 1}. ${msg.isUser ? 'Student' : 'Teacher'}: ${msg.message.substring(0, 200)}...`).join('\n')}

CURRENT SAVED PREFERENCES:
${JSON.stringify(currentPreferences, null, 2)}

${lessonContext ? `LESSON CONTEXT:
Title: ${lessonContext.title}
Topic: ${lessonContext.topic}` : ''}

CRITICAL TASK: Detect GLOBAL preferences to save/update/remove from user profile.

🔍 PREFERENCE DETECTION RULES:

**EXPLICIT FORMAT PREFERENCES** (High Priority - SAVE GLOBALLY):
- "I hate text" / "too much text" → Remove text, suggest video/flashcards
- "use flashcards" / "give me flashcards" → formatPreference = "flashcards"
- "I prefer videos" / "make a video" → formatPreference = "video"
- "explain in text" / "write it out" → formatPreference = "text"

**CHANGING PREFERENCES** (REMOVE OLD, SAVE NEW):
- "No, I like X better" → Remove previous format, set new format
- "Actually, I prefer Y" → Update preference, remove conflicting ones
- User contradicts previous preference → Flag for removal

**IMPLICIT GLOBAL PREFERENCES**:
- "always give examples" → wants_examples = true
- "I learn better with analogies" → wants_analogies = true
- "keep it simple" → explanation_style = "concise"
- "I like detailed explanations" → explanation_style = "detailed"

**ONE-OFF REQUESTS** (DO NOT SAVE):
- "can you give AN example?" → Not global, just this time
- "explain THIS again" → Not a preference
- "what does THIS mean?" → Normal question

**LEARNING STRUGGLES** (Detect but don't save as preference):
- Repeated questions about same concept
- "I don't understand" / "I'm confused"
- Multiple clarification requests

Respond with JSON in this EXACT format:
{
  "isStuck": boolean,
  "stuckReason": "string or null",
  "stuckSeverity": "low|medium|high or null",
  "hasNewPreference": boolean,
  "isGlobalPreference": boolean,
  "newPreferences": {
    "formatPreference": "text|video|flashcards|null",
    "explanation_style": "concise|detailed|balanced|null",
    "wants_examples": boolean or null,
    "wants_analogies": boolean or null,
    "wants_exercises": boolean or null,
    "pace": "slow|normal|fast|null",
    "learning_style": "visual|auditory|reading_writing|kinesthetic|mixed|null"
  },
  "preferencesToRemove": ["list", "of", "conflicting", "preference", "names"],
  "reasoning": "Why this is/isn't a global preference",
  "needsAdjustment": boolean,
  "suggestedAdjustments": ["array of suggestions"],
  "confidence": number (0-100)
}

Return ONLY valid JSON, no markdown or extra text.`;

    try {
      const response = await this.llm.invoke(analysisPrompt);
      const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
      
      const analysis = this.extractJSON(content);

      // Validate and structure the response
      const structuredAnalysis = {
        isStuck: analysis.isStuck || false,
        stuckReason: analysis.stuckReason || null,
        stuckSeverity: analysis.stuckSeverity || null,
        hasNewPreference: analysis.hasNewPreference || false,
        isGlobalPreference: analysis.isGlobalPreference || false,
        newPreferences: analysis.newPreferences || {},
        preferencesToRemove: analysis.preferencesToRemove || [],
        reasoning: analysis.reasoning || '',
        needsAdjustment: analysis.needsAdjustment || false,
        suggestedAdjustments: analysis.suggestedAdjustments || [],
        confidence: analysis.confidence || 50,
        analyzedAt: new Date(),
      };

      return this.createResponse({
        analysis: structuredAnalysis,
        message: 'Conversation analyzed successfully',
      });
    } catch (error) {
      console.error('Error analyzing conversation:', error);
      
      // Fallback analysis based on simple heuristics
      const fallbackAnalysis = this.createFallbackAnalysis(userMessage, conversationHistory);
      
      return this.createResponse({
        analysis: fallbackAnalysis,
        message: 'Used fallback analysis',
        warning: 'AI analysis failed, using heuristics',
      });
    }
  }

  /**
   * Create fallback analysis using simple heuristics
   * @private
   */
  createFallbackAnalysis(userMessage, conversationHistory) {
    const msg = userMessage.toLowerCase();
    
    // Check for stuck indicators
    const stuckPhrases = [
      'don\'t understand',
      'confused',
      'lost',
      'help',
      'still don\'t get',
      'what do you mean',
      'can you explain again',
    ];
    const isStuck = stuckPhrases.some(phrase => msg.includes(phrase));

    // Check for preference indicators
    const preferencePhrases = {
      examples: ['more examples', 'show me', 'give me an example'],
      simpler: ['simpler', 'easier', 'basic', 'simple terms'],
      detailed: ['more detail', 'elaborate', 'explain more', 'in depth'],
      slower: ['slower', 'too fast', 'slow down'],
    };

    const hasNewPreference = Object.values(preferencePhrases).some(phrases => 
      phrases.some(phrase => msg.includes(phrase))
    );

    const newPreferences = {};
    if (preferencePhrases.examples.some(p => msg.includes(p))) {
      newPreferences.wants_examples = true;
    }
    if (preferencePhrases.simpler.some(p => msg.includes(p))) {
      newPreferences.explanation_style = 'concise';
    }
    if (preferencePhrases.detailed.some(p => msg.includes(p))) {
      newPreferences.explanation_style = 'detailed';
    }
    if (preferencePhrases.slower.some(p => msg.includes(p))) {
      newPreferences.pace = 'slow';
    }

    return {
      isStuck,
      stuckReason: isStuck ? 'User expressed confusion or difficulty' : null,
      stuckSeverity: isStuck ? 'medium' : null,
      hasNewPreference,
      newPreferences,
      needsAdjustment: isStuck || hasNewPreference,
      suggestedAdjustments: [
        ...(isStuck ? ['Provide clearer explanations', 'Break down concepts further'] : []),
        ...(hasNewPreference ? ['Adjust teaching style based on preferences'] : []),
      ],
      feedback: isStuck || hasNewPreference ? 'User needs teaching approach adjustment' : 'Conversation proceeding normally',
      confidence: 60,
      analyzedAt: new Date(),
    };
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
      throw new Error('Could not extract JSON from response');
    }
  }
}

export default ConversationAnalyzer;
