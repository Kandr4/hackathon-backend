const express = require('express');
const router = express.Router();
const webhooksController = require('../controllers/webhooks.controller');

// Endpoint to handle incoming webhooks
router.post('/incoming', webhooksController.handleIncomingWebhook);

// Endpoint to verify webhook signatures (if applicable)
router.post('/verify', webhooksController.verifyWebhookSignature);

module.exports = router;