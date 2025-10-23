import AgentCommunication from './AgentCommunication.js';
import SystemPromptGenerator from '../individual/SystemPromptGenerator.js';
import LessonGenerator from '../individual/LessonGenerator.js';
import LessonEvaluator from '../individual/LessonEvaluator.js';
import ChangeDetector from '../individual/ChangeDetector.js';
import LearningPathGenerator from '../individual/LearningPathGenerator.js';
import ConversationAnalyzer from '../individual/ConversationAnalyzer.js';
import TeacherModel from '../individual/TeacherModel.js';
import ResponseEvaluator from '../individual/ResponseEvaluator.js';
import SyntheticEvaluator from '../individual/SyntheticEvaluator.js';
import VideoGenerator from '../individual/VideoGenerator.js';
import FlashcardGenerator from '../individual/FlashcardGenerator.js';

/**
 * Orchestrator for the 8-model multimodal adaptive learning system
 * Coordinates all agents to provide personalized learning experiences
 */
export class AdaptiveLearningOrchestrator {
  constructor() {
    this.communication = new AgentCommunication();
    this.initializeAgents();
    this.initializeSystemState();
    this.isRunning = false;
  }

  /**
   * Initialize all agents
   * @private
   */
  initializeAgents() {
    // Model 1: Learning Path Generator
    const learningPathGenerator = new LearningPathGenerator();
    
    // Model 2: System Prompt Creator
    const systemPromptGenerator = new SystemPromptGenerator();
    
    // Model 3: Conversation Analyzer
    const conversationAnalyzer = new ConversationAnalyzer();
    
    // Model 4: Teacher Model (Text-based)
    const teacherModel = new TeacherModel();
    
    // Model 5: Response Evaluator
    const responseEvaluator = new ResponseEvaluator();
    
    // Model 6: Synthetic Evaluator
    const syntheticEvaluator = new SyntheticEvaluator();
    
    // Model 7: Video Generator (Visual learning)
    const videoGenerator = new VideoGenerator();
    
    // Model 8: Flashcard Generator (Spaced repetition)
    const flashcardGenerator = new FlashcardGenerator();
    
    // Legacy agents (still useful)
    const lessonGenerator = new LessonGenerator();
    const lessonEvaluator = new LessonEvaluator();
    const changeDetector = new ChangeDetector();

    this.communication.registerAgent(learningPathGenerator);
    this.communication.registerAgent(systemPromptGenerator);
    this.communication.registerAgent(conversationAnalyzer);
    this.communication.registerAgent(teacherModel);
    this.communication.registerAgent(responseEvaluator);
    this.communication.registerAgent(syntheticEvaluator);
    this.communication.registerAgent(videoGenerator);
    this.communication.registerAgent(flashcardGenerator);
    this.communication.registerAgent(lessonGenerator);
    this.communication.registerAgent(lessonEvaluator);
    this.communication.registerAgent(changeDetector);
    
    console.log('✅ All 8 models initialized and registered (multimodal learning enabled)');
  }

  /**
   * Initialize system state
   * @private
   */
  initializeSystemState() {
    /** @type {import('../types/index.js').SystemState} */
    this.systemState = {
      currentTopic: '',
      activeLessons: [],
      userProgress: {
        userId: '',
        topic: '',
        currentLesson: '',
        completedLessons: [],
        learningPattern: {
          questionTypes: [],
          difficultyPreference: 'intermediate',
          learningStyle: 'mixed',
          commonMistakes: [],
          strengths: [],
        },
        lastActivity: new Date(),
      },
      systemPrompts: new Map(),
      evaluations: [],
      learningMetrics: {
        totalLessons: 0,
        completedLessons: 0,
        averageScore: 0,
        learningVelocity: 0,
        adaptationCount: 0,
      },
    };
  }

  /**
   * Start adaptive learning for a topic and user
   * @param {string} topic
   * @param {string} userId
   * @returns {Promise<import('../types/index.js').AgentResponse>}
   */
  async startAdaptiveLearning(topic, userId) {
    try {
      this.isRunning = true;
      this.systemState.currentTopic = topic;
      this.systemState.userProgress.userId = userId;
      this.systemState.userProgress.topic = topic;

      console.log(`🚀 Starting adaptive learning system for topic: ${topic}`);

      // Step 1: Generate initial system prompt
      const systemPromptResponse = await this.generateInitialSystemPrompt(topic);
      if (!systemPromptResponse.success) {
        throw new Error(`Error generating system prompt: ${systemPromptResponse.error}`);
      }

      // Step 2: Generate initial lesson
      const lessonResponse = await this.generateInitialLesson(topic);
      if (!lessonResponse.success) {
        throw new Error(`Error generating initial lesson: ${lessonResponse.error}`);
      }

      // Step 3: Evaluate lesson
      const evaluationResponse = await this.evaluateLesson(lessonResponse.data.lesson);
      if (!evaluationResponse.success) {
        throw new Error(`Error evaluating lesson: ${evaluationResponse.error}`);
      }

      return {
        success: true,
        data: {
          systemPrompt: systemPromptResponse.data,
          lesson: lessonResponse.data,
          evaluation: evaluationResponse.data,
          systemState: this.systemState,
        },
      };
    } catch (error) {
      this.isRunning = false;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Generate a new lesson
   * @param {string} topic
   * @param {'beginner'|'intermediate'|'advanced'} difficulty
   * @param {string} userId
   * @returns {Promise<import('../types/index.js').AgentResponse>}
   */
  async generateNewLesson(topic, difficulty = 'intermediate', userId = null) {
    const userLevel = userId ? this.getUserLevel(userId) : 'intermediate';
    const learningStyle = userId ? this.getUserLearningStyle(userId) : 'mixed';

    const response = await this.communication.sendMessage(
      'Orchestrator',
      'LessonGenerator',
      {
        action: 'generate_lesson',
        data: {
          topic,
          difficulty,
          userLevel,
          learningStyle,
          previousLessons: this.systemState.userProgress.completedLessons,
        },
      }
    );

    if (response.success && response.data?.lesson) {
      this.systemState.activeLessons.push(response.data.lesson.id);
      this.systemState.learningMetrics.totalLessons++;
    }

    return response;
  }

  /**
   * Evaluate the entire system
   * @param {string} topic
   * @param {string[]} curriculum
   * @returns {Promise<import('../types/index.js').AgentResponse>}
   */
  async evaluateSystem(topic, curriculum) {
    try {
      const evaluations = [];

      for (const lessonTopic of curriculum) {
        const lessonResponse = await this.generateNewLesson(lessonTopic, 'intermediate');
        
        if (lessonResponse.success && lessonResponse.data?.lesson) {
          const evalResponse = await this.evaluateLesson(lessonResponse.data.lesson);
          if (evalResponse.success) {
            evaluations.push(evalResponse.data);
          }
        }
      }

      const finalReport = this.compileFinalReport(evaluations);

      return {
        success: true,
        data: {
          evaluations,
          finalReport,
          systemState: this.systemState,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Generate initial system prompt
   * @private
   */
  async generateInitialSystemPrompt(topic) {
    const response = await this.communication.sendMessage(
      'Orchestrator',
      'SystemPromptGenerator',
      {
        action: 'generate_system_prompt',
        data: {
          topic,
          userLevel: 'intermediate',
          learningStyle: 'adaptive',
        },
      }
    );

    if (response.success && response.data?.systemPrompt) {
      this.systemState.systemPrompts.set(
        response.data.systemPrompt.id,
        response.data.systemPrompt
      );
    }

    return response;
  }

  /**
   * Generate initial lesson
   * @private
   */
  async generateInitialLesson(topic) {
    return await this.communication.sendMessage(
      'Orchestrator',
      'LessonGenerator',
      {
        action: 'generate_lesson',
        data: {
          topic,
          difficulty: 'intermediate',
          userLevel: 'intermediate',
          learningStyle: 'mixed',
        },
      }
    );
  }

  /**
   * Evaluate a lesson
   * @private
   */
  async evaluateLesson(lesson) {
    const response = await this.communication.sendMessage(
      'Orchestrator',
      'LessonEvaluator',
      {
        action: 'evaluate_lesson',
        data: { lesson },
      }
    );

    if (response.success && response.data?.evaluation) {
      this.systemState.evaluations.push(response.data.evaluation);
    }

    return response;
  }

  /**
   * Analyze user progress
   * @param {string} userId
   * @returns {Promise<import('../types/index.js').AgentResponse>}
   */
  async analyzeUserProgress(userId) {
    return await this.communication.sendMessage(
      'Orchestrator',
      'ChangeDetector',
      {
        action: 'analyze_progress',
        data: {
          userId,
          currentProgress: this.systemState.userProgress,
        },
      }
    );
  }

  /**
   * Get user level
   * @private
   */
  getUserLevel(userId) {
    return this.systemState.userProgress.learningPattern.difficultyPreference || 'intermediate';
  }

  /**
   * Get user learning style
   * @private
   */
  getUserLearningStyle(userId) {
    return this.systemState.userProgress.learningPattern.learningStyle || 'mixed';
  }

  /**
   * Compile final report
   * @private
   */
  compileFinalReport(evaluations) {
    const totalScore = evaluations.reduce((sum, evaluation) => sum + (evaluation.evaluation?.score || 0), 0);
    const avgScore = evaluations.length > 0 ? totalScore / evaluations.length : 0;
    const passedCount = evaluations.filter(evaluation => evaluation.evaluation?.passed).length;

    return `
# System Evaluation Report

## Summary
- Total Lessons Evaluated: ${evaluations.length}
- Average Score: ${avgScore.toFixed(2)}
- Lessons Passed: ${passedCount}/${evaluations.length}
- Pass Rate: ${((passedCount / evaluations.length) * 100).toFixed(2)}%

## Metrics
${JSON.stringify(this.systemState.learningMetrics, null, 2)}
`;
  }

  /**
   * Get system statistics
   * @returns {object}
   */
  getSystemStatistics() {
    return {
      isRunning: this.isRunning,
      currentTopic: this.systemState.currentTopic,
      totalLessons: this.systemState.learningMetrics.totalLessons,
      completedLessons: this.systemState.learningMetrics.completedLessons,
      averageScore: this.systemState.learningMetrics.averageScore,
      registeredAgents: this.communication.getRegisteredAgents(),
    };
  }

  /**
   * Stop the system
   */
  stopSystem() {
    this.isRunning = false;
    console.log('🛑 System stopped');
  }
}

export default AdaptiveLearningOrchestrator;
