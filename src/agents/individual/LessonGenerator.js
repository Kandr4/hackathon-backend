import BaseAgent from '../core/BaseAgent.js';
import config from '../config/index.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Agent responsible for generating educational lessons
 */
export class LessonGenerator extends BaseAgent {
  constructor() {
    super({
      ...config.agents.lessonGenerator,
      systemPrompt: 'You are an expert educational content creator specialized in generating high-quality lessons.',
    });
    
    /** @type {Map<string, import('../types/index.js').Lesson>} */
    this.generatedLessons = new Map();
    /** @type {import('../types/index.js').SystemPrompt | null} */
    this.currentSystemPrompt = null;
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
      case 'generate_lesson':
        return await this.generateLesson(data);
      case 'regenerate_lesson':
        return await this.regenerateLesson(data);
      case 'get_lesson':
        return await this.getLesson(data);
      case 'update_system_prompt':
        return await this.updateSystemPrompt(data);
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
      case 'system_prompt_updated':
        this.currentSystemPrompt = data.systemPrompt;
        return this.createResponse({ message: 'System prompt updated' });
      case 'evaluation_feedback':
        return await this.handleEvaluationFeedback(data);
      default:
        return this.createResponse(null, 'Unsupported notification type');
    }
  }

  /**
   * Generate a new lesson
   * @private
   */
  async generateLesson(data) {
    const { topic, difficulty = 'intermediate', userLevel = 'intermediate', learningStyle = 'mixed', previousLessons = [] } = data;

    const systemPrompt = this.currentSystemPrompt?.content || this.getDefaultSystemPrompt();
    
    const lessonTemplate = `${systemPrompt}

TASK: Generate a complete lesson about "${topic}" for a ${userLevel} level user with ${learningStyle} learning style.

LESSON REQUIREMENTS:
1. Clear and engaging title
2. Well-structured and progressive content
3. Practical and relevant examples
4. Exercises or reflection questions
5. Adapted to difficulty level: ${difficulty}
6. Considering previous lessons: ${previousLessons.join(', ') || 'None'}

REQUIRED STRUCTURE:
- Introduction to the concept
- Step-by-step explanation
- Concrete examples
- Practical applications
- Key points to remember
- Self-assessment questions

The content should be educational, clear, and motivating. Use markdown formatting for better readability.`;

    try {
      const response = await this.llm.invoke(lessonTemplate);
      const lessonContent = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);

      /** @type {import('../types/index.js').Lesson} */
      const lesson = {
        id: uuidv4(),
        title: this.extractTitle(lessonContent, topic),
        content: lessonContent,
        difficulty,
        topic,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.generatedLessons.set(lesson.id, lesson);

      return this.createResponse({
        lesson,
        message: 'Lesson generated successfully',
      });
    } catch (error) {
      return this.createResponse(null, `Error generating lesson: ${error}`);
    }
  }

  /**
   * Regenerate an existing lesson with feedback
   * @private
   */
  async regenerateLesson(data) {
    const { lessonId, feedback, requirements } = data;
    
    const existingLesson = this.generatedLessons.get(lessonId);
    if (!existingLesson) {
      return this.createResponse(null, 'Lesson not found');
    }

    const regenerationTemplate = `${this.currentSystemPrompt?.content || this.getDefaultSystemPrompt()}

PREVIOUS LESSON: ${existingLesson.content}

FEEDBACK RECEIVED: ${feedback}
ADDITIONAL REQUIREMENTS: ${requirements}

REGENERATE the lesson considering:
1. The feedback provided
2. Additional requirements
3. Maintain topic: ${existingLesson.topic}
4. Maintain difficulty level: ${existingLesson.difficulty}
5. Improve content quality and clarity

The new lesson should be significantly better than the previous one.`;

    try {
      const response = await this.llm.invoke(regenerationTemplate);
      const lessonContent = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);

      /** @type {import('../types/index.js').Lesson} */
      const updatedLesson = {
        ...existingLesson,
        content: lessonContent,
        title: this.extractTitle(lessonContent, existingLesson.topic),
        updatedAt: new Date(),
      };

      this.generatedLessons.set(lessonId, updatedLesson);

      return this.createResponse({
        lesson: updatedLesson,
        message: 'Lesson regenerated successfully',
      });
    } catch (error) {
      return this.createResponse(null, `Error regenerating lesson: ${error}`);
    }
  }

  /**
   * Get a lesson by ID
   * @private
   */
  async getLesson(data) {
    const { lessonId } = data;
    const lesson = this.generatedLessons.get(lessonId);
    
    if (!lesson) {
      return this.createResponse(null, 'Lesson not found');
    }

    return this.createResponse({ lesson });
  }

  /**
   * Update the system prompt
   * @private
   */
  async updateSystemPrompt(data) {
    this.currentSystemPrompt = data.systemPrompt;
    return this.createResponse({ message: 'System prompt updated' });
  }

  /**
   * Handle evaluation feedback
   * @private
   */
  async handleEvaluationFeedback(data) {
    // Implementation for handling evaluation feedback
    return this.createResponse({ message: 'Evaluation feedback received' });
  }

  /**
   * Extract title from lesson content
   * @private
   */
  extractTitle(content, fallbackTopic) {
    // Try to extract title from markdown heading
    const titleMatch = content.match(/^#\s+(.+)$/m);
    if (titleMatch) {
      return titleMatch[1].trim();
    }
    
    // Try to extract from first line
    const firstLine = content.split('\n')[0].trim();
    if (firstLine && firstLine.length < 100) {
      return firstLine.replace(/^#+\s*/, '');
    }
    
    // Fallback to topic
    return `Lesson: ${fallbackTopic}`;
  }

  /**
   * Get default system prompt
   * @private
   */
  getDefaultSystemPrompt() {
    return 'You are an expert educational content creator. Generate clear, engaging, and pedagogically sound lessons.';
  }
}

export default LessonGenerator;
