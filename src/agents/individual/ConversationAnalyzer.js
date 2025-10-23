import BaseAgent from '../core/BaseAgent.js';
import config from '../config/index.js';

/**
 * Model 3: Conversation Analyzer
 * Detects when user is stuck or expresses new preferences
 * Sends feedback to Model 2 (System Prompt Creator) for adjustments
 */
export class ConversationAnalyzer extends BaseAgent {
  constructor() {
    super({
      name: 'ConversationAnalyzer',
      model: 'gpt-4o-mini',
      temperature: 0.3,
      maxTokens: 1500,
      systemPrompt: 'You are an expert at analyzing learning conversations to detect struggles and preferences.',
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
      default:
        return this.createResponse(null, 'Unsupported action');
    }
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

    const analysisPrompt = `You are analyzing a learning conversation to detect:
1. If the user is stuck or struggling with the material
2. If the user has expressed new learning preferences
3. If the teaching approach needs adjustment

USER MESSAGE: "${userMessage}"

CONVERSATION HISTORY (last 10 messages):
${conversationHistory.slice(-10).map((msg, i) => `${i + 1}. ${msg.isUser ? 'Student' : 'Teacher'}: ${msg.message.substring(0, 200)}...`).join('\n')}

CURRENT PREFERENCES:
${JSON.stringify(currentPreferences, null, 2)}

${lessonContext ? `LESSON CONTEXT:
Title: ${lessonContext.title}
Topic: ${lessonContext.topic}` : ''}

ANALYSIS TASK:
Determine if:
A) User is stuck (repeated questions, confusion signals, frustration)
B) User expressed a direct preference (wants more examples, slower pace, different style)
C) Teaching approach needs adjustment based on patterns

STUCK INDICATORS:
- Asking the same question multiple times
- Expressing confusion ("I don't understand", "This is confusing")
- Asking for clarification repeatedly
- Saying they're lost or overwhelmed
- Going in circles without progress

PREFERENCE INDICATORS:
- Direct requests ("Please give more examples", "Can you explain simpler")
- Feedback on teaching style ("Too fast", "Too technical", "Not enough detail")
- Requests for specific formats (visual, analogies, step-by-step)
- Expressions of learning style preferences

Respond with JSON in this EXACT format:
{
  "isStuck": boolean,
  "stuckReason": "string or null",
  "stuckSeverity": "low|medium|high or null",
  "hasNewPreference": boolean,
  "newPreferences": {
    "explanation_style": "string or null",
    "wants_examples": boolean or null,
    "wants_analogies": boolean or null,
    "pace": "string or null",
    "other": "string or null"
  },
  "needsAdjustment": boolean,
  "suggestedAdjustments": ["array of suggestions"],
  "feedback": "Overall feedback for system prompt adjustment",
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
        newPreferences: analysis.newPreferences || {},
        needsAdjustment: analysis.needsAdjustment || false,
        suggestedAdjustments: analysis.suggestedAdjustments || [],
        feedback: analysis.feedback || '',
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
