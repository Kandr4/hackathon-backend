import express from 'express';
import {
  getLessons,
  getLesson,
  createLesson,
  updateLesson,
  deleteLesson,
  completeLesson,
  uncompleteLesson,
  generateAILesson,
  evaluateLesson
} from '../controllers/lessonController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/topic/:topicId/lessons', getLessons);
router.get('/:lessonId', getLesson);
router.post('/topic/:topicId/lessons', createLesson);
router.put('/:lessonId', updateLesson);
router.delete('/:lessonId', deleteLesson);
router.post('/:lessonId/complete', completeLesson);
router.post('/:lessonId/uncomplete', uncompleteLesson);

// AI-powered endpoints
router.post('/topic/:topicId/lessons/generate-ai', generateAILesson);
router.post('/:lessonId/evaluate', evaluateLesson);

export default router;
