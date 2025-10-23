import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/authRoutes.js';
import topicRoutes from './routes/topicRoutes.js';
import lessonRoutes from './routes/lessonRoutes.js';
import quizRoutes from './routes/quizRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import agentRoutes from './routes/agentRoutes.js';
import evaluationRoutes from './routes/evaluationRoutes.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import pool from './config/database.js';
import { validateConfig } from './agents/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Validate agent configuration
try {
  validateConfig();
} catch (error) {
  console.error('❌ Agent configuration error:', error.message);
  console.warn('⚠️ Server will start, but AI features may not work without OPENAI_API_KEY');
}

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Static file serving for generated videos
const videosDir = path.join(__dirname, '..', 'generated_videos');
app.use('/videos', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
}, express.static(videosDir));
console.log(`📁 Serving videos from: ${videosDir}`);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/topics', topicRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/evaluation', evaluationRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    console.log('Database connection successful');

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
