import BaseAgent from '../core/BaseAgent.js';
import config from '../config/index.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Agent responsible for evaluating lesson quality
 */
export class LessonEvaluator extends BaseAgent {
  constructor() {
    super({
      ...config.agents.lessonEvaluator,
      systemPrompt: 'You are an expert educational content evaluator specialized in assessing lesson quality and adaptability.',
    });
    
    /** @type {Map<string, import('../types/index.js').EvaluationRubric>} */
    this.rubrics = new Map();
    /** @type {Map<string, import('../types/index.js').LessonEvaluation>} */
    this.evaluations = new Map();
    this.MIN_SCORE_THRESHOLD = config.system.minScoreThreshold;
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
      case 'create_rubric':
        return await this.createRubric(data);
      case 'evaluate_lesson':
        return await this.evaluateLesson(data);
      case 'get_evaluation':
        return await this.getEvaluation(data);
      case 'get_rubric':
        return await this.getRubric(data);
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
      case 'lesson_updated':
        return await this.reevaluateLesson(data);
      default:
        return this.createResponse(null, 'Unsupported notification type');
    }
  }

  /**
   * Create an evaluation rubric
   * @private
   */
  async createRubric(data) {
    const { topic, difficulty, lessonType } = data;

    const rubricTemplate = `Create an evaluation rubric for a lesson about "${topic}" at ${difficulty} level and type ${lessonType}.

The rubric should evaluate:
1. ACCURACY (30 points): Information precision, reliable sources, correct facts
2. CLARITY (25 points): Clear structure, understandable explanations, appropriate language
3. ADAPTABILITY (20 points): Adaptation to user level, relevant examples, logical progression
4. INTERACTIVITY (15 points): Interactive elements, reflection questions, practical exercises
5. MOTIVATION (10 points): Motivating tone, content relevance, engagement

For each criterion, define:
- Clear description
- Maximum points
- Weight (0-1)
- Specific quality indicators

Respond with a JSON object containing the rubric structure with the following format:
{
  "criteria": [
    {
      "name": "Criterion name",
      "description": "Criterion description",
      "maxPoints": number,
      "weight": number
    }
  ],
  "totalPoints": 100
}`;

    try {
      const response = await this.llm.invoke(rubricTemplate);
      const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
      
      // Extract JSON from response
      const rubricData = this.extractJSON(content);

      /** @type {import('../types/index.js').EvaluationRubric} */
      const rubric = {
        id: uuidv4(),
        criteria: rubricData.criteria || this.getDefaultCriteria(),
        totalPoints: rubricData.totalPoints || 100,
        createdAt: new Date(),
      };

      this.rubrics.set(rubric.id, rubric);

      return this.createResponse({
        rubric,
        message: 'Rubric created successfully',
      });
    } catch (error) {
      return this.createResponse(null, `Error creating rubric: ${error}`);
    }
  }

  /**
   * Evaluate a lesson
   * @private
   */
  async evaluateLesson(data) {
    const { lesson, rubricId } = data;

    // Use specific rubric or create a new one
    let rubric;
    if (rubricId && this.rubrics.has(rubricId)) {
      rubric = this.rubrics.get(rubricId);
    } else {
      const rubricResponse = await this.createRubric({
        topic: lesson.topic,
        difficulty: lesson.difficulty,
        lessonType: 'educational',
      });
      
      if (!rubricResponse.success || !rubricResponse.data) {
        return this.createResponse(null, 'Error creating rubric for evaluation');
      }
      
      rubric = rubricResponse.data.rubric;
    }

    const evaluationTemplate = `EVALUATE the following lesson using the provided rubric:

LESSON:
Title: ${lesson.title}
Content: ${lesson.content}
Topic: ${lesson.topic}
Difficulty: ${lesson.difficulty}

RUBRIC:
${JSON.stringify(rubric, null, 2)}

REQUIRED EVALUATION:
1. Evaluate each rubric criterion (0 to max points)
2. Provide specific feedback for each criterion
3. Calculate total score
4. Determine if the lesson passes (minimum ${this.MIN_SCORE_THRESHOLD} points)
5. Provide overall improvement recommendations

Respond with a JSON object in the following format:
{
  "scores": {
    "criterionName": {
      "score": number,
      "feedback": "string"
    }
  },
  "totalScore": number,
  "overallFeedback": "string",
  "recommendations": ["string"]
}`;

    try {
      const response = await this.llm.invoke(evaluationTemplate);
      const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
      
      const evaluationData = this.extractJSON(content);
      const totalScore = evaluationData.totalScore || 0;

      /** @type {import('../types/index.js').LessonEvaluation} */
      const evaluation = {
        lessonId: lesson.id,
        score: totalScore,
        maxScore: rubric.totalPoints,
        feedback: evaluationData.overallFeedback || 'No feedback provided',
        rubricUsed: rubric.id,
        evaluatedAt: new Date(),
        passed: totalScore >= this.MIN_SCORE_THRESHOLD,
      };

      this.evaluations.set(lesson.id, evaluation);

      return this.createResponse({
        evaluation,
        detailedScores: evaluationData.scores,
        recommendations: evaluationData.recommendations,
        message: 'Lesson evaluated successfully',
      });
    } catch (error) {
      return this.createResponse(null, `Error evaluating lesson: ${error}`);
    }
  }

  /**
   * Get an evaluation by lesson ID
   * @private
   */
  async getEvaluation(data) {
    const { lessonId } = data;
    const evaluation = this.evaluations.get(lessonId);
    
    if (!evaluation) {
      return this.createResponse(null, 'Evaluation not found');
    }

    return this.createResponse({ evaluation });
  }

  /**
   * Get a rubric by ID
   * @private
   */
  async getRubric(data) {
    const { rubricId } = data;
    const rubric = this.rubrics.get(rubricId);
    
    if (!rubric) {
      return this.createResponse(null, 'Rubric not found');
    }

    return this.createResponse({ rubric });
  }

  /**
   * Re-evaluate a lesson
   * @private
   */
  async reevaluateLesson(data) {
    return await this.evaluateLesson(data);
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

  /**
   * Get default criteria
   * @private
   */
  getDefaultCriteria() {
    return [
      { name: 'Accuracy', description: 'Information precision and correctness', maxPoints: 30, weight: 0.3 },
      { name: 'Clarity', description: 'Clear structure and explanations', maxPoints: 25, weight: 0.25 },
      { name: 'Adaptability', description: 'Adaptation to user level', maxPoints: 20, weight: 0.2 },
      { name: 'Interactivity', description: 'Interactive elements and exercises', maxPoints: 15, weight: 0.15 },
      { name: 'Motivation', description: 'Engaging and motivating content', maxPoints: 10, weight: 0.1 },
    ];
  }
}

export default LessonEvaluator;
