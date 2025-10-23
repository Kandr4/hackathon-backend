// ai.controller.js
const aiService = require('../services/ai/recommendation.service');

exports.getRecommendations = async (req, res) => {
    try {
        const recommendations = await aiService.getRecommendations(req.user.id);
        res.status(200).json(recommendations);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching recommendations', error: error.message });
    }
};

exports.getAIInsights = async (req, res) => {
    try {
        const insights = await aiService.getAIInsights(req.body.data);
        res.status(200).json(insights);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching AI insights', error: error.message });
    }
};