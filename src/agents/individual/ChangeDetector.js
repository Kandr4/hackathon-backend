import BaseAgent from '../core/BaseAgent.js';
import config from '../config/index.js';

/**
 * Agent responsible for detecting changes in learning patterns
 */
export class ChangeDetector extends BaseAgent {
  constructor() {
    super({
      ...config.agents.changeDetector,
      systemPrompt: 'You are an expert at detecting changes in learning patterns and recommending adaptations.',
    });
    
    /** @type {Map<string, import('../types/index.js').UserProgress[]>} */
    this.userProgressHistory = new Map();
    /** @type {Map<string, import('../types/index.js').LearningPattern>} */
    this.learningPatterns = new Map();
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
      case 'analyze_progress':
        return await this.analyzeProgress(data);
      case 'detect_changes':
        return await this.detectChanges(data);
      case 'get_learning_pattern':
        return await this.getLearningPattern(data);
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
      case 'user_activity':
        return await this.recordUserActivity(data);
      case 'lesson_completed':
        return await this.recordLessonCompletion(data);
      default:
        return this.createResponse(null, 'Unsupported notification type');
    }
  }

  /**
   * Analyze user progress
   * @private
   */
  async analyzeProgress(data) {
    const { userId, currentProgress, timeWindow = 7 } = data;

    const userHistory = this.userProgressHistory.get(userId) || [];

    const analysisTemplate = `ANALYZE the user's learning progress:

USER: ${userId}
CURRENT PROGRESS: ${JSON.stringify(currentProgress, null, 2)}
HISTORY LENGTH: ${userHistory.length} records

DETECT:
1. Learning patterns (strengths, weaknesses, preferences)
2. Stagnation or lack of progress
3. Repeated questions or misunderstood concepts
4. Changes in learning style
5. Adaptation needs

INDICATORS TO EVALUATE:
- Frequency of repeated questions
- Time between completed lessons
- Common error types
- Difficulty preferences
- Detected learning style

Provide a detailed analysis and recommendations for adaptation in JSON format:
{
  "learningPattern": {
    "questionTypes": ["string"],
    "difficultyPreference": "string",
    "learningStyle": "string",
    "commonMistakes": ["string"],
    "strengths": ["string"]
  },
  "recommendations": ["string"],
  "needsAdaptation": boolean
}`;

    try {
      const response = await this.llm.invoke(analysisTemplate);
      const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
      
      const analysisData = this.extractJSON(content);
      const learningPattern = analysisData.learningPattern;

      this.learningPatterns.set(userId, learningPattern);
      userHistory.push(currentProgress);
      this.userProgressHistory.set(userId, userHistory);

      return this.createResponse({
        analysis: analysisData,
        learningPattern,
        recommendations: analysisData.recommendations,
      });
    } catch (error) {
      return this.createResponse(null, `Error analyzing progress: ${error}`);
    }
  }

  /**
   * Detect changes in learning behavior
   * @private
   */
  async detectChanges(data) {
    const { userId, systemState } = data;

    const userHistory = this.userProgressHistory.get(userId) || [];
    const learningPattern = this.learningPatterns.get(userId);

    if (userHistory.length < 2) {
      return this.createResponse({
        changesDetected: false,
        message: 'Insufficient history to detect changes',
      });
    }

    return this.createResponse({
      changesDetected: true,
      learningPattern,
      recommendations: ['Continue monitoring progress', 'Consider difficulty adjustment'],
    });
  }

  /**
   * Get learning pattern for a user
   * @private
   */
  async getLearningPattern(data) {
    const { userId } = data;
    const pattern = this.learningPatterns.get(userId);
    
    if (!pattern) {
      return this.createResponse(null, 'Learning pattern not found');
    }

    return this.createResponse({ learningPattern: pattern });
  }

  /**
   * Record user activity
   * @private
   */
  async recordUserActivity(data) {
    // Implementation for recording user activity
    return this.createResponse({ message: 'User activity recorded' });
  }

  /**
   * Record lesson completion
   * @private
   */
  async recordLessonCompletion(data) {
    // Implementation for recording lesson completion
    return this.createResponse({ message: 'Lesson completion recorded' });
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
      return { learningPattern: {}, recommendations: [], needsAdaptation: false };
    }
  }
}

export default ChangeDetector;
