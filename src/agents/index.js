/**
 * Main entry point for the adaptive learning agent system
 */

export { AdaptiveLearningOrchestrator } from './core/AdaptiveLearningOrchestrator.js';
export { AgentCommunication } from './core/AgentCommunication.js';
export { BaseAgent } from './core/BaseAgent.js';
export { SystemPromptGenerator } from './individual/SystemPromptGenerator.js';
export { LessonGenerator } from './individual/LessonGenerator.js';
export { LessonEvaluator } from './individual/LessonEvaluator.js';
export { ChangeDetector } from './individual/ChangeDetector.js';
export { LearningPathGenerator } from './individual/LearningPathGenerator.js';
export { ConversationAnalyzer } from './individual/ConversationAnalyzer.js';
export { TeacherModel } from './individual/TeacherModel.js';
export { ResponseEvaluator } from './individual/ResponseEvaluator.js';
export { SyntheticEvaluator } from './individual/SyntheticEvaluator.js';
export { VideoGenerator } from './individual/VideoGenerator.js';
export { FlashcardGenerator } from './individual/FlashcardGenerator.js';
export { default as config, validateConfig } from './config/index.js';

// Create a singleton instance of the orchestrator for the backend
import { AdaptiveLearningOrchestrator } from './core/AdaptiveLearningOrchestrator.js';
export const orchestrator = new AdaptiveLearningOrchestrator();

console.log('✅ Adaptive Learning Agent System initialized with 8-model multimodal architecture');
