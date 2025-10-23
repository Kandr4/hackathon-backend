/**
 * @fileoverview Type definitions for the adaptive learning agent system
 */

/**
 * @typedef {Object} Lesson
 * @property {string} id - Unique identifier
 * @property {string} title - Lesson title
 * @property {string} content - Lesson content
 * @property {'beginner'|'intermediate'|'advanced'} difficulty - Difficulty level
 * @property {string} topic - Topic name
 * @property {Date} createdAt - Creation timestamp
 * @property {Date} updatedAt - Last update timestamp
 */

/**
 * @typedef {Object} SystemPrompt
 * @property {string} id - Unique identifier
 * @property {string} content - Prompt content
 * @property {number} version - Version number
 * @property {Date} createdAt - Creation timestamp
 * @property {Date} updatedAt - Last update timestamp
 */

/**
 * @typedef {Object} RubricCriteria
 * @property {string} name - Criteria name
 * @property {string} description - Criteria description
 * @property {number} maxPoints - Maximum points
 * @property {number} weight - Weight (0-1)
 */

/**
 * @typedef {Object} EvaluationRubric
 * @property {string} id - Unique identifier
 * @property {RubricCriteria[]} criteria - Evaluation criteria
 * @property {number} totalPoints - Total possible points
 * @property {Date} createdAt - Creation timestamp
 */

/**
 * @typedef {Object} LessonEvaluation
 * @property {string} lessonId - Lesson identifier
 * @property {number} score - Achieved score
 * @property {number} maxScore - Maximum possible score
 * @property {string} feedback - Evaluation feedback
 * @property {string} rubricUsed - Rubric identifier
 * @property {Date} evaluatedAt - Evaluation timestamp
 * @property {boolean} passed - Whether the lesson passed
 */

/**
 * @typedef {Object} LearningPattern
 * @property {string[]} questionTypes - Types of questions asked
 * @property {string} difficultyPreference - Preferred difficulty
 * @property {string} learningStyle - Learning style (visual, auditory, kinesthetic, mixed)
 * @property {string[]} commonMistakes - Common mistakes made
 * @property {string[]} strengths - User strengths
 */

/**
 * @typedef {Object} UserProgress
 * @property {string} userId - User identifier
 * @property {string} topic - Current topic
 * @property {string} currentLesson - Current lesson ID
 * @property {string[]} completedLessons - Completed lesson IDs
 * @property {LearningPattern} learningPattern - Learning pattern
 * @property {Date} lastActivity - Last activity timestamp
 */

/**
 * @typedef {Object} AgentMessage
 * @property {string} from - Sender agent name
 * @property {string} to - Recipient agent name
 * @property {'request'|'response'|'notification'} type - Message type
 * @property {*} content - Message content
 * @property {Date} timestamp - Message timestamp
 * @property {'low'|'medium'|'high'|'urgent'} priority - Message priority
 */

/**
 * @typedef {Object} SystemState
 * @property {string} currentTopic - Current topic
 * @property {string[]} activeLessons - Active lesson IDs
 * @property {UserProgress} userProgress - User progress data
 * @property {Map<string, SystemPrompt>} systemPrompts - System prompts
 * @property {LessonEvaluation[]} evaluations - Evaluations
 * @property {LearningMetrics} learningMetrics - Learning metrics
 */

/**
 * @typedef {Object} LearningMetrics
 * @property {number} totalLessons - Total lessons
 * @property {number} completedLessons - Completed lessons
 * @property {number} averageScore - Average score
 * @property {number} learningVelocity - Learning velocity
 * @property {number} adaptationCount - Number of adaptations
 */

/**
 * @typedef {Object} AgentConfig
 * @property {string} name - Agent name
 * @property {string} model - OpenAI model
 * @property {number} temperature - Temperature setting
 * @property {number} maxTokens - Maximum tokens
 * @property {string} systemPrompt - System prompt
 */

/**
 * @typedef {Object} AgentResponseMetadata
 * @property {number} tokensUsed - Tokens used
 * @property {number} processingTime - Processing time in ms
 * @property {string} model - Model used
 */

/**
 * @typedef {Object} AgentResponse
 * @property {boolean} success - Whether the operation succeeded
 * @property {*} [data] - Response data
 * @property {string} [error] - Error message if failed
 * @property {AgentResponseMetadata} [metadata] - Response metadata
 */

export default {};
