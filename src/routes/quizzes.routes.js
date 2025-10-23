const express = require('express');
const router = express.Router();
const quizzesController = require('../controllers/quizzes.controller');

// Endpoint to create a new quiz
router.post('/', quizzesController.createQuiz);

// Endpoint to get all quizzes
router.get('/', quizzesController.getAllQuizzes);

// Endpoint to get a specific quiz by ID
router.get('/:id', quizzesController.getQuizById);

// Endpoint to update a quiz by ID
router.put('/:id', quizzesController.updateQuiz);

// Endpoint to delete a quiz by ID
router.delete('/:id', quizzesController.deleteQuiz);

module.exports = router;