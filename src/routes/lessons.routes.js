const express = require('express');
const router = express.Router();
const lessonsController = require('../controllers/lessons.controller');

// Create a new lesson
router.post('/', lessonsController.createLesson);

// Get all lessons
router.get('/', lessonsController.getAllLessons);

// Get a lesson by ID
router.get('/:id', lessonsController.getLessonById);

// Update a lesson by ID
router.put('/:id', lessonsController.updateLessonById);

// Delete a lesson by ID
router.delete('/:id', lessonsController.deleteLessonById);

module.exports = router;