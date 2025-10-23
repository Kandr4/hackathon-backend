import BaseAgent from '../core/BaseAgent.js';
import config from '../config/index.js';

/**
 * Model 8: Flashcard Generator
 * Creates flashcards for spaced repetition learning
 * Uses o1-mini (GPT-thinking medium) for better flashcard generation
 */
export class FlashcardGenerator extends BaseAgent {
  constructor() {
    super({
      name: 'FlashcardGenerator',
      model: 'gpt-5-thinking', // Using GPT-5 for deeper reasoning in flashcard creation
      reasoning: {
        "effort": "minimum"
      },
      temperature: 1, // o1 models don't support temperature
      maxTokens: 4000,
      systemPrompt: 'You are an educational flashcard creator specializing in knowledge retention and spaced repetition.',
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
      case 'teach':
        return await this.generateFlashcards(data);
      default:
        return this.createResponse(null, 'Unsupported action');
    }
  }

  /**
   * Generate flashcards for the lesson content
   * @private
   */
  async generateFlashcards(data) {
    const { 
      userId, 
      userMessage, 
      lessonContext, 
      conversationHistory = [],
      systemPrompt = '',
      userPreferences = {}
    } = data;

    // Build context from conversation history
    const historyContext = conversationHistory
      .slice(-6)
      .map(msg => `${msg.is_user ? 'Student' : 'Teacher'}: ${msg.message}`)
      .join('\n');

    const flashcardPrompt = `${systemPrompt}

You are creating EDUCATIONAL FLASHCARDS for spaced repetition learning.

LESSON CONTEXT:
- Topic: ${lessonContext.topic || 'General'}
- Lesson: ${lessonContext.title || 'Introduction'}
- Description: ${lessonContext.description || 'Not provided'}

STUDENT PREFERENCES:
${userPreferences.learningStyle ? `- Learning Style: ${userPreferences.learningStyle}` : ''}
${userPreferences.complexity ? `- Complexity: ${userPreferences.complexity}` : ''}

CONVERSATION HISTORY:
${historyContext || 'This is the start of the conversation'}

STUDENT QUESTION: ${userMessage}

Create 5-8 flashcards covering the key concepts. Each flashcard should:

1. Have a clear, specific FRONT (question/prompt)
2. Have a complete, educational BACK (answer/explanation)
3. Include difficulty level (easy/medium/hard)
4. Add relevant tags for categorization
5. Optionally include hints or mnemonics

Return a JSON object with this structure:
{
  "topic": "Topic name",
  "subtopic": "Specific subtopic",
  "totalCards": number,
  "flashcards": [
    {
      "id": 1,
      "front": "Question or prompt",
      "back": "Answer with explanation",
      "difficulty": "easy|medium|hard",
      "tags": ["tag1", "tag2"],
      "hint": "Optional hint to help recall",
      "mnemonic": "Optional memory aid",
      "example": "Optional practical example"
    }
  ],
  "studyTips": ["tip 1", "tip 2"],
  "reviewSchedule": "Suggested review intervals"
}

Make flashcards concise, clear, and focused on ONE concept per card.
Use active recall techniques and varied question formats (definition, application, comparison, etc.)`;

    try {
      const response = await this.llm.invoke(flashcardPrompt);
      const content = typeof response.content === 'string' 
        ? response.content 
        : JSON.stringify(response.content);

      // Try to extract JSON
      let flashcardSet;
      try {
        flashcardSet = this.extractJSON(content);
      } catch (jsonError) {
        // If JSON extraction fails, create a simple flashcard from the content
        console.warn('Failed to parse flashcards as JSON, creating fallback');
        flashcardSet = {
          topic: lessonContext.title || 'General Topic',
          subtopic: userMessage.substring(0, 50),
          totalCards: 1,
          flashcards: [{
            id: 1,
            front: userMessage,
            back: content.substring(0, 300),
            difficulty: "medium",
            tags: ["general"],
            hint: "Think about the key concepts",
            mnemonic: null,
            example: null
          }],
          studyTips: ["Review regularly", "Use spaced repetition"],
          reviewSchedule: "Review in 1 day, 3 days, 7 days, 14 days"
        };
      }

      // Ensure all flashcards have IDs
      if (flashcardSet.flashcards) {
        flashcardSet.flashcards = flashcardSet.flashcards.map((card, idx) => ({
          ...card,
          id: card.id || idx + 1
        }));
        flashcardSet.totalCards = flashcardSet.flashcards.length;
      }

      return this.createResponse({
        response: flashcardSet,
        responseType: 'flashcards',
        message: 'Flashcards generated successfully',
      });

    } catch (error) {
      console.error('Error generating flashcards:', error);
      return this.createResponse(
        null,
        `Failed to generate flashcards: ${error.message}`
      );
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
}

export default FlashcardGenerator;
