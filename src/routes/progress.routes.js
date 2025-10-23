const express = require('express');
const router = express.Router();
const progressController = require('../controllers/progress.controller');

// Endpoint to get user progress
router.get('/:userId', progressController.getUserProgress);

// Endpoint to update user progress
router.put('/:userId', progressController.updateUserProgress);

// Endpoint to create new progress entry
router.post('/', progressController.createProgressEntry);

// Endpoint to delete progress entry
router.delete('/:progressId', progressController.deleteProgressEntry);

module.exports = router;