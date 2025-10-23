import express from 'express';
import { getTopics, getTopic, createTopic, updateTopic, deleteTopic } from '../controllers/topicController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', getTopics);
router.get('/:id', getTopic);
router.post('/', createTopic);
router.put('/:id', updateTopic);
router.delete('/:id', deleteTopic);

export default router;
