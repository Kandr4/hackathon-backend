import BaseAgent from '../core/BaseAgent.js';
import config from '../config/index.js';

/**
 * Model 5: Response Evaluator
 * Creates rubrics and evaluates Model 4's teaching responses
 * Only responses scoring above 70 are sent to the frontend
 */
export class ResponseEvaluator extends BaseAgent {
  constructor() {
    super({
      name: 'ResponseEvaluator',
      model: 'gpt-4o-mini',
      temperature: 0.2,
      maxTokens: 2000,
      systemPrompt: 'You are an expert educational content evaluator who creates rubrics and scores teaching responses.',
    });
    
    this.PASSING_SCORE = 70;
    /** @type {Map<string, any>} */
    this.rubricCache = new Map();
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
      case 'evaluate_response':
        return await this.evaluateResponse(data);
      default:
        return this.createResponse(null, 'Unsupported action');
    }
  }

  /**
   * Evaluate a teaching response from Model 4
   * @private
   */
  async evaluateResponse(data) {
    const { 
      teachingResponse, 
      userMessage, 
      lessonContext = {},
      userPreferences = {},
      conversationHistory = []
    } = data;

    const lessonTitle = lessonContext?.title || 'General Learning Topic';
    const lessonTopic = lessonContext?.topic || 'General';

    const evaluationPrompt = `You are evaluating an AI tutor's response to a student. Your job is to:
1. Create a rubric for what an ideal "golden" response should contain
2. Evaluate the actual response against this rubric
3. Assign a score from 0 to 100

CONTEXT:
Lesson: ${lessonTitle}
Topic: ${lessonTopic}
Student asked: "${userMessage}"

TEACHING RESPONSE TO EVALUATE:
"${teachingResponse}"

USER PREFERENCES (consider these in evaluation):
${JSON.stringify(userPreferences, null, 2)}

CONVERSATION HISTORY (last 3 exchanges):
${conversationHistory.slice(-3).map(msg => `${msg.isUser ? 'Student' : 'Tutor'}: ${msg.message}`).join('\n') || 'No previous conversation'}

EVALUATION TASK:

Step 1 - CREATE RUBRIC (what a golden response should have):
Define 5 criteria with weights that sum to 100:
- Accuracy & Correctness (weight: 30)
- Clarity & Understandability (weight: 25)
- Relevance to Question (weight: 20)
- Pedagogical Quality (examples, structure) (weight: 15)
- Alignment with User Preferences (weight: 10)

Step 2 - EVALUATE EACH CRITERION:
Score each criterion (0-100), then multiply by weight to get weighted score.

Step 3 - CALCULATE TOTAL SCORE:
Sum all weighted scores for final score (0-100).

Step 4 - DETERMINE PASS/FAIL:
Score >= 70 = PASS (response will be sent to student)
Score < 70 = FAIL (response needs regeneration)

Respond with JSON in this EXACT format:
{
  "rubric": {
    "accuracy": { "weight": 0.30, "description": "..." },
    "clarity": { "weight": 0.25, "description": "..." },
    "relevance": { "weight": 0.20, "description": "..." },
    "pedagogy": { "weight": 0.15, "description": "..." },
    "alignment": { "weight": 0.10, "description": "..." }
  },
  "scores": {
    "accuracy": { "score": number, "feedback": "..." },
    "clarity": { "score": number, "feedback": "..." },
    "relevance": { "score": number, "feedback": "..." },
    "pedagogy": { "score": number, "feedback": "..." },
    "alignment": { "score": number, "feedback": "..." }
  },
  "totalScore": number,
  "passed": boolean,
  "overallFeedback": "string",
  "improvements": ["array of specific improvements if failed"]
}

Return ONLY valid JSON, no markdown or extra text.`;

    try {
      const response = await this.llm.invoke(evaluationPrompt);
      const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
      
      const evaluation = this.extractJSON(content);

      // Validate and ensure required fields
      const totalScore = evaluation.totalScore || 0;
      const passed = totalScore >= this.PASSING_SCORE;

      const structuredEvaluation = {
        rubric: evaluation.rubric || this.getDefaultRubric(),
        scores: evaluation.scores || {},
        totalScore,
        passed,
        passingScore: this.PASSING_SCORE,
        overallFeedback: evaluation.overallFeedback || '',
        improvements: evaluation.improvements || [],
        evaluatedAt: new Date(),
      };

      return this.createResponse({
        evaluation: structuredEvaluation,
        message: passed ? 'Response passed evaluation' : 'Response failed evaluation',
      });
    } catch (error) {
      console.error('Error evaluating response:', error);
      
      // Fallback: Basic evaluation
      const fallbackEvaluation = this.createFallbackEvaluation(teachingResponse, userMessage);
      
      return this.createResponse({
        evaluation: fallbackEvaluation,
        message: 'Used fallback evaluation',
        warning: 'AI evaluation failed, using heuristics',
      });
    }
  }

  /**
   * Create fallback evaluation using simple heuristics
   * @private
   */
  createFallbackEvaluation(teachingResponse, userMessage) {
    // Simple heuristic scoring
    let score = 50; // Base score

    // Check response length (not too short, not too long)
    const wordCount = teachingResponse.split(' ').length;
    if (wordCount >= 50 && wordCount <= 500) score += 15;
    else if (wordCount < 20) score -= 20;

    // Check if response addresses the question
    const questionWords = userMessage.toLowerCase().split(' ').filter(w => w.length > 3);
    const responseText = teachingResponse.toLowerCase();
    const addressedWords = questionWords.filter(word => responseText.includes(word)).length;
    const relevanceRatio = addressedWords / Math.max(questionWords.length, 1);
    score += Math.floor(relevanceRatio * 20);

    // Check for educational elements
    if (responseText.includes('example')) score += 5;
    if (responseText.includes('for instance') || responseText.includes('for example')) score += 5;
    if (responseText.match(/\d+\.|•|-/)) score += 5; // Has bullet points or numbering

    // Ensure score is in valid range
    score = Math.max(0, Math.min(100, score));
    const passed = score >= this.PASSING_SCORE;

    return {
      rubric: this.getDefaultRubric(),
      scores: {
        accuracy: { score: score * 0.3, feedback: 'Heuristic evaluation' },
        clarity: { score: score * 0.25, feedback: 'Based on length and structure' },
        relevance: { score: score * 0.2, feedback: 'Based on keyword matching' },
        pedagogy: { score: score * 0.15, feedback: 'Checked for examples' },
        alignment: { score: score * 0.1, feedback: 'Default evaluation' },
      },
      totalScore: score,
      passed,
      passingScore: this.PASSING_SCORE,
      overallFeedback: passed ? 'Response meets basic quality standards' : 'Response needs improvement',
      improvements: passed ? [] : [
        'Add more specific examples',
        'Improve clarity and structure',
        'Better address the student\'s question',
      ],
      evaluatedAt: new Date(),
    };
  }

  /**
   * Get default rubric
   * @private
   */
  getDefaultRubric() {
    return {
      accuracy: { weight: 0.30, description: 'Information is correct and factual' },
      clarity: { weight: 0.25, description: 'Explanation is clear and easy to understand' },
      relevance: { weight: 0.20, description: 'Directly addresses the student\'s question' },
      pedagogy: { weight: 0.15, description: 'Uses good teaching techniques (examples, structure)' },
      alignment: { weight: 0.10, description: 'Matches user\'s learning preferences' },
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

export default ResponseEvaluator;
