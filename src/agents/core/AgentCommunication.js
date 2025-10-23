/**
 * Agent communication system for routing messages between agents
 */
export class AgentCommunication {
  constructor() {
    /** @type {Map<string, import('./BaseAgent.js').BaseAgent>} */
    this.agents = new Map();
    /** @type {import('../types/index.js').AgentMessage[]} */
    this.messageHistory = [];
  }

  /**
   * Register an agent in the communication system
   * @param {import('./BaseAgent.js').BaseAgent} agent
   */
  registerAgent(agent) {
    const agentName = agent.config.name;
    if (this.agents.has(agentName)) {
      console.warn(`Agent ${agentName} is already registered. Overwriting...`);
    }
    this.agents.set(agentName, agent);
    console.log(`✅ Agent registered: ${agentName}`);
  }

  /**
   * Unregister an agent from the communication system
   * @param {string} agentName
   */
  unregisterAgent(agentName) {
    if (this.agents.has(agentName)) {
      this.agents.delete(agentName);
      console.log(`🔌 Agent unregistered: ${agentName}`);
    }
  }

  /**
   * Send a message from one agent to another
   * @param {string} from - Sender agent name
   * @param {string} to - Recipient agent name
   * @param {*} content - Message content
   * @param {'request'|'response'|'notification'} type - Message type
   * @param {'low'|'medium'|'high'|'urgent'} priority - Message priority
   * @returns {Promise<import('../types/index.js').AgentResponse>}
   */
  async sendMessage(from, to, content, type = 'request', priority = 'medium') {
    const recipientAgent = this.agents.get(to);
    
    if (!recipientAgent) {
      return {
        success: false,
        error: `Recipient agent '${to}' not found`,
      };
    }

    /** @type {import('../types/index.js').AgentMessage} */
    const message = {
      from,
      to,
      type,
      content,
      timestamp: new Date(),
      priority,
    };

    // Store message in history
    this.messageHistory.push(message);

    // Send message to recipient agent
    try {
      const response = await recipientAgent.receiveMessage(message);
      return response;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error in message delivery',
      };
    }
  }

  /**
   * Broadcast a message to all agents
   * @param {string} from - Sender agent name
   * @param {*} content - Message content
   * @param {'notification'} type - Message type (broadcasts are typically notifications)
   * @returns {Promise<Map<string, import('../types/index.js').AgentResponse>>}
   */
  async broadcast(from, content, type = 'notification') {
    const responses = new Map();

    for (const [agentName, agent] of this.agents) {
      if (agentName !== from) {
        const response = await this.sendMessage(from, agentName, content, type);
        responses.set(agentName, response);
      }
    }

    return responses;
  }

  /**
   * Get message history
   * @param {number} limit - Maximum number of messages to return
   * @returns {import('../types/index.js').AgentMessage[]}
   */
  getMessageHistory(limit = 100) {
    return this.messageHistory.slice(-limit);
  }

  /**
   * Clear message history
   */
  clearHistory() {
    this.messageHistory = [];
  }

  /**
   * Get all registered agents
   * @returns {string[]}
   */
  getRegisteredAgents() {
    return Array.from(this.agents.keys());
  }

  /**
   * Get agent status
   * @param {string} agentName
   * @returns {{name: string, isProcessing: boolean, queueLength: number} | null}
   */
  getAgentStatus(agentName) {
    const agent = this.agents.get(agentName);
    return agent ? agent.getStatus() : null;
  }

  /**
   * Get all agents' statuses
   * @returns {Map<string, {name: string, isProcessing: boolean, queueLength: number}>}
   */
  getAllAgentsStatus() {
    const statuses = new Map();
    for (const [name, agent] of this.agents) {
      statuses.set(name, agent.getStatus());
    }
    return statuses;
  }
}

export default AgentCommunication;
