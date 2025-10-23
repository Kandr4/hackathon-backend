import express from 'express';
import { orchestrator } from '../agents/index.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

/**
 * Start adaptive learning for a topic
 * POST /api/agents/start-learning
 */
router.post('/start-learning', async (req, res, next) => {
  const { topic } = req.body;

  if (!topic) {
    return res.status(400).json({ error: 'Topic is required' });
  }

  try {
    console.log(`🚀 Starting adaptive learning for user ${req.user.id} on topic: ${topic}`);
    
    const result = await orchestrator.startAdaptiveLearning(topic, req.user.id);

    if (!result.success) {
      return res.status(500).json({ 
        error: 'Failed to start adaptive learning',
        details: result.error 
      });
    }

    res.json({
      message: 'Adaptive learning started successfully',
      data: result.data,
    });
  } catch (error) {
    console.error('Error starting adaptive learning:', error);
    next(error);
  }
});

/**
 * Analyze user progress
 * GET /api/agents/analyze-progress
 */
router.get('/analyze-progress', async (req, res, next) => {
  try {
    const result = await orchestrator.analyzeUserProgress(req.user.id);

    if (!result.success) {
      return res.status(500).json({ 
        error: 'Failed to analyze progress',
        details: result.error 
      });
    }

    res.json({
      message: 'Progress analyzed successfully',
      analysis: result.data,
    });
  } catch (error) {
    console.error('Error analyzing progress:', error);
    next(error);
  }
});

/**
 * Get system statistics
 * GET /api/agents/statistics
 */
router.get('/statistics', async (req, res, next) => {
  try {
    const stats = orchestrator.getSystemStatistics();

    res.json({
      message: 'System statistics retrieved',
      statistics: stats,
    });
  } catch (error) {
    console.error('Error getting statistics:', error);
    next(error);
  }
});

/**
 * Generate adaptive lesson
 * POST /api/agents/generate-lesson
 */
router.post('/generate-lesson', async (req, res, next) => {
  const { topic, difficulty = 'intermediate' } = req.body;

  if (!topic) {
    return res.status(400).json({ error: 'Topic is required' });
  }

  try {
    const result = await orchestrator.generateNewLesson(topic, difficulty, req.user.id);

    if (!result.success) {
      return res.status(500).json({ 
        error: 'Failed to generate lesson',
        details: result.error 
      });
    }

    res.json({
      message: 'Lesson generated successfully',
      lesson: result.data.lesson,
    });
  } catch (error) {
    console.error('Error generating lesson:', error);
    next(error);
  }
});

/**
 * Evaluate system with curriculum
 * POST /api/agents/evaluate-system
 */
router.post('/evaluate-system', async (req, res, next) => {
  const { topic, curriculum } = req.body;

  if (!topic || !curriculum || !Array.isArray(curriculum)) {
    return res.status(400).json({ 
      error: 'Topic and curriculum array are required' 
    });
  }

  try {
    const result = await orchestrator.evaluateSystem(topic, curriculum);

    if (!result.success) {
      return res.status(500).json({ 
        error: 'Failed to evaluate system',
        details: result.error 
      });
    }

    res.json({
      message: 'System evaluated successfully',
      evaluation: result.data,
    });
  } catch (error) {
    console.error('Error evaluating system:', error);
    next(error);
  }
});

/**
 * Get agent status
 * GET /api/agents/status
 */
router.get('/status', async (req, res, next) => {
  try {
    const agentStatuses = orchestrator.communication.getAllAgentsStatus();
    const statusArray = Array.from(agentStatuses.entries()).map(([name, status]) => ({
      name,
      ...status,
    }));

    res.json({
      message: 'Agent statuses retrieved',
      agents: statusArray,
      systemRunning: orchestrator.isRunning,
    });
  } catch (error) {
    console.error('Error getting agent status:', error);
    next(error);
  }
});

export default router;
