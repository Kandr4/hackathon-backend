import express from 'express';
import {
  getLessons,
  getLesson,
  createLesson,
  updateLesson,
  deleteLesson,
  completeLesson,
  uncompleteLesson
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

export default router;
