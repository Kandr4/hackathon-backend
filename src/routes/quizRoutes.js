import express from 'express';
import {
  getQuiz,
  createQuiz,
  addQuestion,
  submitQuiz,
  getQuizAttempts,
  deleteQuiz
} from '../controllers/quizController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/:quizId', getQuiz);
router.post('/topic/:topicId/quiz', createQuiz);
router.post('/:quizId/question', addQuestion);
router.post('/:quizId/submit', submitQuiz);
router.get('/:quizId/attempts', getQuizAttempts);
router.delete('/:quizId', deleteQuiz);

export default router;
