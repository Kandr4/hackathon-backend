import express from 'express';
import { runSystemTest, testModel6, evaluateTopic } from '../controllers/evaluationController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

// Run comprehensive Model 6 system test
router.post('/system-test', runSystemTest);

// Test Model 6 on a specific lesson
router.post('/lesson/:lessonId/evaluate', testModel6);

// Evaluate entire topic
router.post('/topic/:topicId/evaluate', evaluateTopic);

export default router;
