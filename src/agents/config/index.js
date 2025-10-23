import dotenv from 'dotenv';

dotenv.config();

/**
 * @typedef {Object} AgentConfig
 * @property {string} name - Agent name
 * @property {string} model - OpenAI model to use
 * @property {number} temperature - Temperature for LLM responses
 * @property {number} maxTokens - Maximum tokens for responses
 * @property {string} systemPrompt - System prompt for the agent
 */

export const config = {
  // OpenAI Configuration
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  
  // System Configuration
  system: {
    minScoreThreshold: 70, // Minimum score for lesson approval
    maxRetries: 3, // Maximum retries for agent operations
    timeout: 30000, // Request timeout in ms
  },

  // Agent Configurations
  agents: {
    systemPromptGenerator: {
      name: 'SystemPromptGenerator',
      model: 'gpt-4o-mini',
      temperature: 0.7,
      maxTokens: 1500,
    },
    lessonGenerator: {
      name: 'LessonGenerator',
      model: 'gpt-4o-mini',
      temperature: 0.8,
      maxTokens: 3000,
    },
    lessonEvaluator: {
      name: 'LessonEvaluator',
      model: 'gpt-4o-mini',
      temperature: 0.3,
      maxTokens: 2000,
    },
    changeDetector: {
      name: 'ChangeDetector',
      model: 'gpt-4o-mini',
      temperature: 0.5,
      maxTokens: 2000,
    },
    finalEvaluator: {
      name: 'FinalEvaluator',
      model: 'gpt-4o-mini',
      temperature: 0.4,
      maxTokens: 2500,
    },
  },
};

/**
 * Validate configuration
 */
export const validateConfig = () => {
  if (!config.openaiApiKey) {
    throw new Error('OPENAI_API_KEY is required in environment variables');
  }
  
  console.log('✅ Agent configuration validated successfully');
};

export default config;
