import BaseAgent from '../core/BaseAgent.js';
import config from '../config/index.js';

/**
 * Model 4: Teacher Model
 * Main teaching model that generates lesson explanations in chat format
 * Uses personalized system prompts from Model 2
 * Uses o1-mini (GPT-thinking medium) for deeper reasoning
 */
export class TeacherModel extends BaseAgent {
  constructor() {
    super({
      name: 'TeacherModel',
      model: 'o1-mini', // Using o1-mini for deeper reasoning
      temperature: 1, // o1 models don't support temperature, but keeping for compatibility
      maxTokens: 8000, // o1-mini supports larger context
      systemPrompt: 'You are an adaptive AI tutor.', // o1 models use different prompting
    });
    
    /** @type {Map<string, string>} */
    this.activeSystemPrompts = new Map(); // userId -> current system prompt
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
      case 'teach':
        return await this.teach(data);
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
        this.activeSystemPrompts.set(data.userId, data.systemPrompt.content);
        return this.createResponse({ message: 'System prompt updated' });
      default:
        return this.createResponse(null, 'Unsupported notification type');
    }
  }

  /**
   * Generate teaching response to user message
   * @private
   */
  async teach(data) {
    const { 
      userId, 
      userMessage, 
      lessonContext = {}, 
      conversationHistory = [],
      systemPromptContent = null,
      userPreferences = {} 
    } = data;

    // Detect if this is an initial lesson explanation
    const isInitialExplanation = conversationHistory.length === 0 && 
                                  userMessage.includes('Please provide a complete, comprehensive explanation');

    // Get the active system prompt for this user (OVERRIDE for initial explanations)
    let activePrompt;
    if (isInitialExplanation) {
      // Build preference-aware prompt for initial explanation
      const prefContext = this.buildPreferenceContext(userPreferences);
      
      activePrompt = `You are an expert educator creating the FIRST comprehensive lesson explanation. Your response MUST be:
- A complete, in-depth tutorial covering all major concepts
- 600-1000 words minimum
- Include multiple examples and code demonstrations
- Structured with clear sections
- Educational and engaging

${prefContext}

DO NOT just say "Welcome" or give a brief intro. This is the MAIN LESSON CONTENT.`;
    } else {
      activePrompt = systemPromptContent || 
                     this.activeSystemPrompts.get(userId) || 
                     this.getDefaultTeachingPrompt();
    }

    // Build conversation context - use more history for better context
    const contextMessages = conversationHistory.slice(-10).map(msg => ({
      role: msg.isUser ? 'user' : 'assistant',
      content: msg.message,
    }));

    // Add lesson context if available
    let lessonContextStr = '';
    if (lessonContext && lessonContext.title) {
      lessonContextStr = `\n\nCURRENT LESSON: "${lessonContext.title}"`;
      if (lessonContext.topic) {
        lessonContextStr += `\nTOPIC: ${lessonContext.topic}`;
      }
      if (lessonContext.description) {
        lessonContextStr += `\nLESSON CONTENT: ${lessonContext.description}`;
      }
    }

    // Different instructions for initial explanation vs regular questions
    const teachingInstructions = isInitialExplanation ? `
TEACHING INSTRUCTIONS - INITIAL LESSON EXPLANATION:
⚠️ CRITICAL: This is the student's FIRST time seeing this lesson. You MUST provide a COMPLETE, COMPREHENSIVE explanation.

MINIMUM REQUIREMENTS:
- 600-1000 words (approximately 4-6 paragraphs)
- Cover ALL major concepts of "${lessonContext?.title || 'this topic'}"
- Include 2-3 concrete examples with explanations
- If applicable, provide code examples with line-by-line explanations
- Explain WHY this topic is important and WHEN to use it

STRUCTURE YOUR RESPONSE:
1. **Introduction** (2-3 sentences): What is this and why does it matter?
2. **Core Concepts** (3-4 paragraphs): Explain the fundamentals in depth
3. **Practical Examples** (2-3 examples): Real-world applications with details
4. **Code Demonstration** (if applicable): Working examples with explanations
5. **Common Use Cases** (1 paragraph): When and where to apply this
6. **Key Takeaways** (2-3 bullet points): Main points to remember
7. **Invitation** (1 sentence): Invite questions

❌ DO NOT:
- Give a brief "welcome" message
- Say "Feel free to ask me anything" without content
- Provide less than 400 words
- Skip examples or explanations

✅ YOU MUST:
- Write a COMPLETE tutorial
- Be thorough and educational
- Include examples and demonstrations
- Make it comprehensive enough to understand the topic fully

This is NOT a greeting - it's the MAIN LESSON CONTENT.` : `
TEACHING INSTRUCTIONS - ANSWERING STUDENT QUESTION:
1. Address the student's question or message directly
2. Provide clear, educational explanations
3. Use the personalized teaching style defined in your system prompt
4. Include examples if requested or if they enhance understanding
5. Be encouraging and supportive
6. Check for understanding when appropriate
7. Keep responses focused (aim for 200-400 words)`;

    const fullPrompt = `${activePrompt}${lessonContextStr}

${conversationHistory.length > 0 ? `CONVERSATION HISTORY:
${contextMessages.map(msg => `${msg.role === 'user' ? 'Student' : 'You'}: ${msg.content}`).join('\n')}

` : ''}STUDENT'S ${isInitialExplanation ? 'REQUEST' : 'MESSAGE'}: "${userMessage}"

${teachingInstructions}

Generate your teaching response now:`;

    try {
      const response = await this.llm.invoke(fullPrompt);
      const teachingResponse = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);

      return this.createResponse({
        response: teachingResponse,
        systemPromptUsed: activePrompt,
        message: 'Teaching response generated',
      });
    } catch (error) {
      console.error('Error generating teaching response:', error);
      return this.createResponse(null, `Error generating response: ${error}`);
    }
  }

  /**
   * Update system prompt for a user
   * @private
   */
  async updateSystemPrompt(data) {
    const { userId, systemPrompt } = data;
    this.activeSystemPrompts.set(userId, systemPrompt);
    return this.createResponse({ message: 'System prompt updated for user' });
  }

  /**
   * Get default teaching prompt
   * @private
   */
  getDefaultTeachingPrompt() {
    return `You are an adaptive AI tutor specializing in personalized education. Your role is to:

1. Provide clear, accurate explanations tailored to the student's level
2. Use examples and analogies to illustrate concepts
3. Break down complex topics into manageable pieces
4. Be patient, encouraging, and supportive
5. Check for understanding regularly
6. Adapt your teaching style based on student needs
7. Maintain a conversational, friendly tone

Always prioritize the student's learning and comprehension. If they seem confused, clarify. If they want more depth, provide it. Be an excellent teacher.`;
  }
}

export default TeacherModel;
