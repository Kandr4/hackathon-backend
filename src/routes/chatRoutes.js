import express from 'express';
import {
  getChatMessages,
  createChatMessage,
  deleteChatMessages,
  generateAIResponse,
  generateInitialExplanation
} from '../controllers/chatController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/lesson/:lessonId/messages', getChatMessages);
router.post('/lesson/:lessonId/messages', createChatMessage);
router.delete('/lesson/:lessonId/messages', deleteChatMessages);
router.post('/lesson/:lessonId/initial-explanation', generateInitialExplanation);
router.post('/lesson/:lessonId/ai-response', generateAIResponse);

export default router;
