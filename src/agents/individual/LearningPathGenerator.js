import BaseAgent from '../core/BaseAgent.js';
import config from '../config/index.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Model 1: Learning Path Generator
 * Generates complete learning timeline with lesson titles and quizzes
 * when a user creates a new topic
 */
export class LearningPathGenerator extends BaseAgent {
  constructor() {
    super({
      name: 'LearningPathGenerator',
      model: 'gpt-5',
      temperature: 0.7,
      maxTokens: 3000,
      systemPrompt: 'You are an expert curriculum designer who creates comprehensive learning paths.',
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
      case 'generate_learning_path':
        return await this.generateLearningPath(data);
      default:
        return this.createResponse(null, 'Unsupported action');
    }
  }

  /**
   * Generate a complete learning path for a topic
   * @private
   */
  async generateLearningPath(data) {
    const { 
      topicName, 
      userLevel = 'intermediate', 
      desiredDuration = null,
      includeQuizzes = true 
    } = data;

    const pathPrompt = `You are an expert curriculum designer. Create a comprehensive learning path for: "${topicName}"

User Level: ${userLevel}
${desiredDuration ? `Desired Duration: ${desiredDuration} hours` : 'Duration: Flexible'}
Include Quizzes: ${includeQuizzes ? 'Yes' : 'No'}

Create a structured learning timeline that:
1. Breaks down the topic into logical lesson modules
2. Orders lessons from foundational to advanced
3. Includes quiz checkpoints after key concepts with ACTUAL QUESTIONS
4. Estimates realistic time for each lesson
5. Provides clear, descriptive lesson titles

Requirements:
- Minimum 5 lessons, maximum 20 lessons
- Each lesson should have a clear, actionable title
- Mark which lessons should have quizzes (typically every 2-3 lessons)
- For each quiz, generate 3-5 multiple choice questions with 4 options each
- Estimate duration for each lesson (15min - 2 hours)
- Total path should be comprehensive but not overwhelming

Respond with a JSON object in this EXACT format:
{
  "totalLessons": number,
  "estimatedDurationHours": number,
  "difficultyLevel": "${userLevel}",
  "lessons": [
    {
      "order": 1,
      "title": "Lesson title here",
      "description": "Brief description",
      "estimatedMinutes": number,
      "hasQuiz": boolean,
      "prerequisites": ["previous lesson titles if any"],
      "quizQuestions": [
        {
          "question": "Question text here",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctAnswer": 0
        }
      ]
    }
  ]
}

IMPORTANT: 
- Return ONLY valid JSON, no markdown code blocks or additional text
- correctAnswer is the index (0-3) of the correct option in the options array
- If hasQuiz is true, include 3-5 questions in quizQuestions array
- If hasQuiz is false, quizQuestions can be empty array or omitted`;

    try {
      const response = await this.llm.invoke(pathPrompt);
      const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
      
      // Extract and parse JSON
      const pathData = this.extractJSON(content);
      
      if (!pathData.lessons || !Array.isArray(pathData.lessons)) {
        throw new Error('Invalid learning path structure');
      }

      // Calculate total duration
      const totalMinutes = pathData.lessons.reduce((sum, lesson) => sum + (lesson.estimatedMinutes || 60), 0);
      const estimatedDurationHours = Math.round((totalMinutes / 60) * 10) / 10;

      const learningPath = {
        id: uuidv4(),
        topicName,
        totalLessons: pathData.lessons.length,
        estimatedDurationHours,
        difficultyLevel: userLevel,
        lessons: pathData.lessons.map((lesson, index) => ({
          order: index + 1,
          title: lesson.title,
          description: lesson.description || '',
          estimatedMinutes: lesson.estimatedMinutes || 60,
          hasQuiz: lesson.hasQuiz || false,
          prerequisites: lesson.prerequisites || [],
          quizQuestions: lesson.quizQuestions || [],
        })),
        generatedAt: new Date(),
      };

      return this.createResponse({
        learningPath,
        message: `Learning path generated with ${learningPath.totalLessons} lessons`,
      });
    } catch (error) {
      console.error('Error generating learning path:', error);
      
      // Fallback: Create a basic 5-lesson structure
      const fallbackPath = this.createFallbackPath(topicName, userLevel);
      return this.createResponse({
        learningPath: fallbackPath,
        message: 'Generated fallback learning path',
        warning: 'Used fallback due to generation error',
      });
    }
  }

  /**
   * Create a fallback learning path if AI generation fails
   * @private
   */
  createFallbackPath(topicName, userLevel) {
    return {
      id: uuidv4(),
      topicName,
      totalLessons: 5,
      estimatedDurationHours: 5,
      difficultyLevel: userLevel,
      lessons: [
        {
          order: 1,
          title: `Introduction to ${topicName}`,
          description: 'Overview and fundamentals',
          estimatedMinutes: 60,
          hasQuiz: false,
          prerequisites: [],
          quizQuestions: [],
        },
        {
          order: 2,
          title: `Core Concepts of ${topicName}`,
          description: 'Essential principles and theory',
          estimatedMinutes: 60,
          hasQuiz: true,
          prerequisites: [`Introduction to ${topicName}`],
          quizQuestions: [
            {
              question: `What is the main purpose of ${topicName}?`,
              options: ["Option A - To be determined", "Option B - To be determined", "Option C - To be determined", "Option D - To be determined"],
              correctAnswer: 0
            },
            {
              question: `Which of the following is a core concept in ${topicName}?`,
              options: ["Concept A", "Concept B", "Concept C", "All of the above"],
              correctAnswer: 3
            },
            {
              question: `What is a key benefit of learning ${topicName}?`,
              options: ["Better understanding", "Improved skills", "Career advancement", "All of the above"],
              correctAnswer: 3
            }
          ],
        },
        {
          order: 3,
          title: `Practical Applications`,
          description: 'Real-world examples and use cases',
          estimatedMinutes: 60,
          hasQuiz: false,
          prerequisites: [`Core Concepts of ${topicName}`],
          quizQuestions: [],
        },
        {
          order: 4,
          title: `Advanced Techniques`,
          description: 'Deep dive into advanced topics',
          estimatedMinutes: 60,
          hasQuiz: true,
          prerequisites: ['Practical Applications'],
          quizQuestions: [
            {
              question: `What is an advanced technique in ${topicName}?`,
              options: ["Technique A", "Technique B", "Technique C", "Technique D"],
              correctAnswer: 0
            },
            {
              question: `When should you use advanced features?`,
              options: ["Always", "Never", "When appropriate for the use case", "Only for beginners"],
              correctAnswer: 2
            },
            {
              question: `What is a common pitfall to avoid?`,
              options: ["Overcomplicating solutions", "Not testing thoroughly", "Ignoring best practices", "All of the above"],
              correctAnswer: 3
            }
          ],
        },
        {
          order: 5,
          title: `Mastery and Best Practices`,
          description: 'Expert-level insights and final review',
          estimatedMinutes: 60,
          hasQuiz: true,
          prerequisites: ['Advanced Techniques'],
          quizQuestions: [
            {
              question: `What is the most important best practice for ${topicName}?`,
              options: ["Following standards", "Regular practice", "Continuous learning", "All of the above"],
              correctAnswer: 3
            },
            {
              question: `How can you master ${topicName}?`,
              options: ["Reading documentation", "Hands-on practice", "Learning from experts", "All of the above"],
              correctAnswer: 3
            },
            {
              question: `What should you do next after completing this course?`,
              options: ["Build a project", "Teach others", "Keep learning", "All of the above"],
              correctAnswer: 3
            }
          ],
        },
      ],
      generatedAt: new Date(),
    };
  }

  /**
   * Extract JSON from text
   * @private
   */
  extractJSON(text) {
    try {
      // Try to parse directly
      return JSON.parse(text);
    } catch {
      // Try to extract JSON from markdown code block
      const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }
      
      // Try to find JSON object in text
      const objectMatch = text.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        return JSON.parse(objectMatch[0]);
      }
      
      throw new Error('Could not extract JSON from response');
    }
  }
}

export default LearningPathGenerator;
