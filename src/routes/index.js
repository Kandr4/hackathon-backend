const express = require('express');
const router = express.Router();

const healthRoutes = require('./health.routes');
const authRoutes = require('./auth.routes');
const usersRoutes = require('./users.routes');
const coursesRoutes = require('./courses.routes');
const lessonsRoutes = require('./lessons.routes');
const progressRoutes = require('./progress.routes');
const quizzesRoutes = require('./quizzes.routes');
const aiRoutes = require('./ai.routes');
const webhooksRoutes = require('./webhooks.routes');

// Health check route
router.use('/health', healthRoutes);

// Authentication routes
router.use('/auth', authRoutes);

// User management routes
router.use('/users', usersRoutes);

// Course management routes
router.use('/courses', coursesRoutes);

// Lesson management routes
router.use('/lessons', lessonsRoutes);

// Progress tracking routes
router.use('/progress', progressRoutes);

// Quiz management routes
router.use('/quizzes', quizzesRoutes);

// AI-related routes
router.use('/ai', aiRoutes);

// Webhook routes
router.use('/webhooks', webhooksRoutes);

module.exports = router;