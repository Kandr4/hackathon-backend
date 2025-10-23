import BaseAgent from '../core/BaseAgent.js';
import config from '../config/index.js';

/**
 * Model 2: System Prompt Creator
 * Generates and updates system prompts for Model 4 and Model 5
 * Based on user preferences, personality, and feedback from Model 3
 */
export class SystemPromptGenerator extends BaseAgent {
  constructor() {
    super({
      ...config.agents.systemPromptGenerator,
      systemPrompt: 'You are an expert at creating personalized system prompts for educational AI tutors based on user preferences and personality.',
    });
    
    /** @type {Map<string, import('../types/index.js').SystemPrompt>} */
    this.systemPrompts = new Map();
    this.currentVersion = 1;
    /** @type {Map<string, number>} */
    this.userPromptVersions = new Map(); // Track versions per user
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
      case 'get_system_prompt':
        return await this.getSystemPrompt(data);
      case 'generate_personalized_prompt':
        return await this.generatePersonalizedPrompt(data);
      case 'adjust_from_feedback':
        return await this.adjustFromFeedback(data);
      default:
        return this.createResponse(null, 'Unsupported action');
    }
  }

  /**
   * Handle notification messages
   * @private
   */
  async handleNotification(message) {
    const { type, data } = message.content;

    switch (type) {
      case 'learning_pattern_change':
        return await this.adaptToLearningPattern(data);
      case 'user_feedback':
        return await this.incorporateFeedback(data);
      default:
        return this.createResponse(null, 'Unsupported notification type');
    }
  }

  /**
   * Generate a new system prompt
   * @private
   */
  async generateSystemPrompt(data) {
    const { topic, userLevel, learningStyle } = data;

    const promptTemplate = `Create an effective system prompt for an educational AI tutor specialized in "${topic}".

Context:
- Topic: ${topic}
- User Level: ${userLevel}
- Learning Style: ${learningStyle}

Create a system prompt that:
1. Defines the AI's role as a specialized tutor
2. Sets the appropriate tone and communication style
3. Includes specific instructions for adapting to the user's level
4. Provides guidelines for generating quality educational content
5. Includes criteria for evaluating user progress

The prompt should be clear, concise, and action-oriented. Output only the system prompt text.`;

    try {
      const response = await this.llm.invoke(promptTemplate);
      const promptContent = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);

      /** @type {import('../types/index.js').SystemPrompt} */
      const systemPrompt = {
        id: `prompt_${topic.replace(/\s+/g, '_')}_${Date.now()}`,
        content: promptContent,
        version: this.currentVersion,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.systemPrompts.set(systemPrompt.id, systemPrompt);
      this.currentVersion++;

      return this.createResponse({
        systemPrompt,
        message: 'System prompt generated successfully',
      });
    } catch (error) {
      return this.createResponse(null, `Error generating system prompt: ${error}`);
    }
  }

  /**
   * Update an existing system prompt
   * @private
   */
  async updateSystemPrompt(data) {
    const { promptId, feedback, learningPattern } = data;
    
    const existingPrompt = this.systemPrompts.get(promptId);
    if (!existingPrompt) {
      return this.createResponse(null, 'System prompt not found');
    }

    const updateTemplate = `Current system prompt: ${existingPrompt.content}

Feedback received: ${feedback}
Learning pattern detected: ${JSON.stringify(learningPattern)}

Update the system prompt based on:
1. The feedback provided
2. The identified learning patterns
3. The user's specific needs
4. Best pedagogical practices

Maintain the original structure but improve the prompt's effectiveness. Output only the updated system prompt text.`;

    try {
      const response = await this.llm.invoke(updateTemplate);
      const updatedContent = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);

      /** @type {import('../types/index.js').SystemPrompt} */
      const updatedPrompt = {
        ...existingPrompt,
        content: updatedContent,
        version: existingPrompt.version + 1,
        updatedAt: new Date(),
      };

      this.systemPrompts.set(promptId, updatedPrompt);

      return this.createResponse({
        systemPrompt: updatedPrompt,
        message: 'System prompt updated successfully',
      });
    } catch (error) {
      return this.createResponse(null, `Error updating system prompt: ${error}`);
    }
  }

  /**
   * Get a system prompt by ID
   * @private
   */
  async getSystemPrompt(data) {
    const { promptId } = data;
    const prompt = this.systemPrompts.get(promptId);
    
    if (!prompt) {
      return this.createResponse(null, 'System prompt not found');
    }

    return this.createResponse({ systemPrompt: prompt });
  }

  /**
   * Adapt to learning pattern changes
   * @private
   */
  async adaptToLearningPattern(data) {
    // Implementation for adapting to learning pattern changes
    return this.createResponse({ message: 'Learning pattern adaptation noted' });
  }

  /**
   * Incorporate user feedback
   * @private
   */
  async incorporateFeedback(data) {
    // Implementation for incorporating user feedback
    return this.createResponse({ message: 'User feedback incorporated' });
  }

  /**
   * Generate personalized system prompt based on user preferences and personality
   * @private
   */
  async generatePersonalizedPrompt(data) {
    const { 
      userId, 
      lessonTopic, 
      userPreferences = {}, 
      targetModel = 'teacher' // 'teacher' for Model 4, 'evaluator' for Model 5
    } = data;

    const promptForTeacher = `Create a highly personalized system prompt for an AI tutor teaching "${lessonTopic}".

USER PREFERENCES AND PERSONALITY:
${JSON.stringify(userPreferences, null, 2)}

TEACHING APPROACH REQUIREMENTS:
Based on the user's preferences, create a system prompt that:
1. Matches their preferred learning style: ${userPreferences.learning_style || 'mixed'}
2. Uses their preferred explanation style: ${userPreferences.explanation_style || 'balanced'}
3. Adjusts pace to: ${userPreferences.pace || 'normal'}
4. ${userPreferences.wants_examples ? 'ALWAYS includes practical examples' : 'Uses examples when relevant'}
5. ${userPreferences.wants_analogies ? 'Uses analogies and metaphors frequently' : 'Uses analogies occasionally'}
6. ${userPreferences.wants_exercises ? 'Includes practice exercises' : 'Focuses on explanations'}

PERSONALITY ADAPTATION:
- Curiosity level: ${userPreferences.curiosity_level || 5}/10 - ${userPreferences.curiosity_level > 7 ? 'Encourage deep exploration' : userPreferences.curiosity_level > 4 ? 'Balance depth and breadth' : 'Focus on essentials'}
- Patience level: ${userPreferences.patience_level || 5}/10 - ${userPreferences.patience_level > 7 ? 'Can use more complex explanations' : 'Keep it simple and clear'}
- Detail orientation: ${userPreferences.detail_orientation || 5}/10 - ${userPreferences.detail_orientation > 7 ? 'Provide comprehensive details' : 'Focus on key points'}

The system prompt should instruct the AI to:
- Act as a personalized tutor specifically for this user
- Adapt communication style to match preferences
- Be encouraging and supportive
- Check for understanding regularly
- Adjust if user seems confused

Output ONLY the system prompt text, no JSON or extra formatting.`;

    const promptForEvaluator = `Create a system prompt for an AI evaluator that will assess teaching responses for "${lessonTopic}".

USER PREFERENCES (for context):
${JSON.stringify(userPreferences, null, 2)}

EVALUATION APPROACH:
The evaluator should:
1. Create rubrics that align with the user's learning preferences
2. Evaluate if explanations match the user's preferred style
3. Check if pace and depth are appropriate
4. Assess if examples/analogies are used as preferred
5. Verify teaching quality and accuracy

The system prompt should instruct the evaluator to:
- Generate appropriate rubrics for each response
- Score responses objectively (0-100)
- Provide constructive feedback
- Consider user preferences in evaluation
- Maintain high quality standards (minimum 70 to pass)

Output ONLY the system prompt text, no JSON or extra formatting.`;

    const selectedPrompt = targetModel === 'teacher' ? promptForTeacher : promptForEvaluator;

    try {
      const response = await this.llm.invoke(selectedPrompt);
      const promptContent = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);

      // Get or create user version number
      const userKey = `${userId}_${targetModel}`;
      const currentVersion = this.userPromptVersions.get(userKey) || 0;
      const newVersion = currentVersion + 1;
      this.userPromptVersions.set(userKey, newVersion);

      /** @type {import('../types/index.js').SystemPrompt} */
      const systemPrompt = {
        id: `prompt_${userId}_${targetModel}_${Date.now()}`,
        content: promptContent,
        version: newVersion,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          userId,
          targetModel,
          userPreferences,
          lessonTopic,
        },
      };

      this.systemPrompts.set(systemPrompt.id, systemPrompt);

      return this.createResponse({
        systemPrompt,
        message: `Personalized ${targetModel} prompt generated (v${newVersion})`,
      });
    } catch (error) {
      return this.createResponse(null, `Error generating personalized prompt: ${error}`);
    }
  }

  /**
   * Adjust system prompt based on feedback from Model 3
   * @private
   */
  async adjustFromFeedback(data) {
    const { 
      currentPromptId, 
      userId, 
      feedback, 
      analysis, 
      targetModel = 'teacher' 
    } = data;

    const existingPrompt = this.systemPrompts.get(currentPromptId);
    if (!existingPrompt) {
      return this.createResponse(null, 'Current system prompt not found');
    }

    const adjustmentPrompt = `You need to adjust an AI tutor's system prompt based on conversation analysis feedback.

CURRENT SYSTEM PROMPT:
${existingPrompt.content}

ANALYSIS FEEDBACK:
${JSON.stringify(analysis, null, 2)}

SPECIFIC FEEDBACK:
${feedback}

ADJUSTMENTS NEEDED:
${analysis.isStuck ? `- User is stuck (${analysis.stuckSeverity} severity): ${analysis.stuckReason}` : ''}
${analysis.hasNewPreference ? `- New preferences detected: ${JSON.stringify(analysis.newPreferences)}` : ''}
${analysis.suggestedAdjustments ? analysis.suggestedAdjustments.map(adj => `- ${adj}`).join('\n') : ''}

TASK:
Update the system prompt to address these issues:
1. If user is stuck: Add instructions for clearer, more structured explanations
2. If new preferences: Incorporate the new preferences into teaching style
3. Maintain the personalized tone and approach
4. Keep it concise but effective

Output ONLY the updated system prompt text, no JSON or extra formatting.`;

    try {
      const response = await this.llm.invoke(adjustmentPrompt);
      const updatedContent = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);

      const userKey = `${userId}_${targetModel}`;
      const currentVersion = this.userPromptVersions.get(userKey) || existingPrompt.version;
      const newVersion = currentVersion + 1;
      this.userPromptVersions.set(userKey, newVersion);

      /** @type {import('../types/index.js').SystemPrompt} */
      const updatedPrompt = {
        ...existingPrompt,
        id: `prompt_${userId}_${targetModel}_${Date.now()}`,
        content: updatedContent,
        version: newVersion,
        updatedAt: new Date(),
        metadata: {
          ...existingPrompt.metadata,
          adjustedFrom: currentPromptId,
          adjustmentReason: analysis.isStuck ? 'stuck_detection' : 'preference_change',
          adjustmentDetails: analysis,
        },
      };

      this.systemPrompts.set(updatedPrompt.id, updatedPrompt);

      return this.createResponse({
        systemPrompt: updatedPrompt,
        previousVersion: existingPrompt.version,
        newVersion: updatedPrompt.version,
        message: 'System prompt adjusted based on feedback',
      });
    } catch (error) {
      return this.createResponse(null, `Error adjusting prompt: ${error}`);
    }
  }
}

export default SystemPromptGenerator;
