import dotenv from 'dotenv';

dotenv.config();

/**
 * @typedef {Object} AgentConfig
 * @property {string} name - Agent name
 * @property {string} model - Gemini model to use
 * @property {number} temperature - Temperature for LLM responses
 * @property {number} maxOutputTokens - Maximum output tokens for responses
 * @property {string} systemPrompt - System prompt for the agent
 */

export const config = {
  // Gemini Configuration
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  
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
      model: 'gemini-2.5-flash',
      temperature: 0.7,
      maxOutputTokens: 1500,
    },
    lessonGenerator: {
      name: 'LessonGenerator',
      model: 'gemini-2.5-flash',
      temperature: 0.8,
      maxOutputTokens: 3000,
    },
    lessonEvaluator: {
      name: 'LessonEvaluator',
      model: 'gemini-2.5-flash',
      temperature: 0.3,
      maxOutputTokens: 2000,
    },
    changeDetector: {
      name: 'ChangeDetector',
      model: 'gemini-2.5-flash',
      temperature: 0.5,
      maxOutputTokens: 2000,
    },
    finalEvaluator: {
      name: 'FinalEvaluator',
      model: 'gemini-2.5-flash',
      temperature: 0.4,
      maxOutputTokens: 2500,
    },
  },
};

/**
 * Validate configuration
 */
export const validateConfig = () => {
  if (!config.geminiApiKey) {
    throw new Error('GEMINI_API_KEY is required in environment variables');
  }
  
  console.log('✅ Agent configuration validated successfully');
};

export default config;
