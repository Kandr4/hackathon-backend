const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');

// Endpoint for getting AI recommendations
router.get('/recommendations', aiController.getRecommendations);

// Endpoint for generating AI-based content
router.post('/generate-content', aiController.generateContent);

// Endpoint for querying AI models
router.post('/query', aiController.queryAI);

// Export the router
module.exports = router;