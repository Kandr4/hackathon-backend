import { ChatOpenAI } from '@langchain/openai';
import config from '../config/index.js';

/**
 * Base class for all agents in the adaptive learning system
 */
export class BaseAgent {
  /**
   * @param {import('../types/index.js').AgentConfig} agentConfig
   */
  constructor(agentConfig) {
    this.config = agentConfig;
    /** @type {import('../types/index.js').AgentMessage[]} */
    this.messageQueue = [];
    this.isProcessing = false;
    this.initializeLLM();
  }

  /**
   * Initialize the LLM with OpenAI
   * @private
   */
  initializeLLM() {
    const modelName = this.config.model;
    
    this.llm = new ChatOpenAI({
      modelName: modelName,
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
      openAIApiKey: config.openaiApiKey,
    });
  }

  /**
   * Process an incoming message - must be implemented by subclasses
   * @param {import('../types/index.js').AgentMessage} message
   * @returns {Promise<import('../types/index.js').AgentResponse>}
   */
  async processMessage(message) {
    throw new Error('processMessage must be implemented by subclass');
  }

  /**
   * Send a message to another agent
   * @param {string} to - Recipient agent name
   * @param {*} content - Message content
   * @param {'request'|'response'|'notification'} type - Message type
   * @protected
   */
  async sendMessage(to, content, type = 'request') {
    /** @type {import('../types/index.js').AgentMessage} */
    const message = {
      from: this.config.name,
      to,
      type,
      content,
      timestamp: new Date(),
      priority: 'medium',
    };

    // In a real system, this would be sent through a message broker
    this.messageQueue.push(message);
  }

  /**
   * Receive and process a message
   * @param {import('../types/index.js').AgentMessage} message
   * @returns {Promise<import('../types/index.js').AgentResponse>}
   */
  async receiveMessage(message) {
    try {
      this.isProcessing = true;
      const response = await this.processMessage(message);
      this.isProcessing = false;
      return response;
    } catch (error) {
      this.isProcessing = false;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get the current status of the agent
   * @returns {{name: string, isProcessing: boolean, queueLength: number}}
   */
  getStatus() {
    return {
      name: this.config.name,
      isProcessing: this.isProcessing,
      queueLength: this.messageQueue.length,
    };
  }

  /**
   * Clear the message queue
   */
  clearMessageQueue() {
    this.messageQueue = [];
  }

  /**
   * Create a standardized response
   * @template T
   * @param {T} [data]
   * @param {string} [error]
   * @returns {import('../types/index.js').AgentResponse}
   * @protected
   */
  createResponse(data, error) {
    return {
      success: !error,
      data,
      error,
      metadata: {
        tokensUsed: 0, // Would be calculated in real implementation
        processingTime: 0, // Would be calculated in real implementation
        model: this.config.model,
      },
    };
  }
}

export default BaseAgent;
