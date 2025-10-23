const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

// User registration
router.post('/register', authController.register);

// User login
router.post('/login', authController.login);

// Password reset request
router.post('/reset-password', authController.requestPasswordReset);

// Password reset
router.post('/reset-password/:token', authController.resetPassword);

module.exports = router;