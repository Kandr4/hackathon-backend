import pool from '../config/database.js';
import { orchestrator } from '../agents/index.js';

export const getTopics = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT t.*, 
        (SELECT COUNT(*) FROM lessons WHERE topic_id = t.id) as lesson_count,
        (SELECT COUNT(*) FROM quizzes WHERE topic_id = t.id) as quiz_count
       FROM topics t
       WHERE t.user_id = $1
       ORDER BY t.created_at DESC`,
      [req.user.id]
    );

    // Get lesson progress for each topic
    const topicsWithProgress = await Promise.all(
      result.rows.map(async (topic) => {
        const progressResult = await pool.query(
          `SELECT COUNT(*) as completed_lessons
           FROM lesson_progress lp
           JOIN lessons l ON lp.lesson_id = l.id
           WHERE l.topic_id = $1 AND lp.user_id = $2 AND lp.completed = true`,
          [topic.id, req.user.id]
        );

        return {
          ...topic,
          completed_lessons: parseInt(progressResult.rows[0].completed_lessons)
        };
      })
    );

    res.json({ topics: topicsWithProgress });
  } catch (error) {
    next(error);
  }
};

export const getTopic = async (req, res, next) => {
  const { id } = req.params;

  try {
    const topicResult = await pool.query(
      'SELECT * FROM topics WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (topicResult.rows.length === 0) {
      return res.status(404).json({ error: 'Topic not found' });
    }

    const topic = topicResult.rows[0];

    // Get lessons for this topic with progress
    const lessonsResult = await pool.query(
      `SELECT l.*, 
        COALESCE(lp.completed, false) as completed
       FROM lessons l
       LEFT JOIN lesson_progress lp ON l.id = lp.lesson_id AND lp.user_id = $2
       WHERE l.topic_id = $1
       ORDER BY l.order_index ASC`,
      [id, req.user.id]
    );

    // Get quizzes for this topic
    const quizzesResult = await pool.query(
      `SELECT q.id, q.title, q.description, q.order_index,
        (SELECT COUNT(*) FROM quiz_questions WHERE quiz_id = q.id) as question_count
       FROM quizzes q
       WHERE q.topic_id = $1
       ORDER BY q.order_index ASC`,
      [id]
    );

    res.json({
      topic: {
        ...topic,
        lessons: lessonsResult.rows,
        quizzes: quizzesResult.rows
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create Topic - Automatically generates learning path using Model 1
 */
export const createTopic = async (req, res, next) => {
  const { name, description } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Topic name is required' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Create the topic
    const topicResult = await client.query(
      'INSERT INTO topics (name, description, user_id) VALUES ($1, $2, $3) RETURNING *',
      [name, description || null, req.user.id]
    );

    const topic = topicResult.rows[0];

    // ===== Model 1: Generate Learning Path =====
    console.log('📚 [Model 1] Generating learning path for:', name);
    const learningPathResponse = await orchestrator.communication.sendMessage(
      'TopicController',
      'LearningPathGenerator',
      {
        action: 'generate_learning_path',
        data: {
          topicName: name,
          topicDescription: description || null,
          userId: req.user.id,
        },
      }
    );

    if (!learningPathResponse.success) {
      console.error('Model 1 failed:', learningPathResponse.error);
      // Fallback to basic structure if Model 1 fails
      await client.query(
        `INSERT INTO learning_paths (user_id, topic_id, lesson_outline, total_lessons)
         VALUES ($1, $2, $3, $4)`,
        [req.user.id, topic.id, JSON.stringify([]), 0]
      );
      await client.query('COMMIT');
      return res.status(201).json({
        message: 'Topic created with basic structure',
        topic,
        warning: 'Learning path generation failed',
      });
    }

    const learningPath = learningPathResponse.data.learningPath;

    // Save learning path to database
    await client.query(
      `INSERT INTO learning_paths (user_id, topic_id, lesson_outline, total_lessons, estimated_duration_hours)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        req.user.id,
        topic.id,
        JSON.stringify(learningPath.lessons || []),
        learningPath.totalLessons,
        learningPath.estimatedDurationHours,
      ]
    );

    // Create lessons and quizzes from learning path
    let quizCounter = 1;
    for (const lesson of learningPath.lessons || []) {
      // Create the lesson
      await client.query(
        `INSERT INTO lessons (topic_id, title, content, order_index)
         VALUES ($1, $2, $3, $4)`,
        [
          topic.id,
          lesson.title,
          lesson.description || `Content for ${lesson.title}`,
          lesson.order,
        ]
      );

      // Create quiz if this lesson has one
      if (lesson.hasQuiz) {
        const quizResult = await client.query(
          `INSERT INTO quizzes (topic_id, title, description, order_index)
           VALUES ($1, $2, $3, $4) RETURNING id`,
          [
            topic.id,
            `Quiz ${quizCounter}: ${lesson.title}`,
            `Test your understanding of ${lesson.title}`,
            lesson.order,
          ]
        );
        
        const quizId = quizResult.rows[0].id;
        
        // Insert quiz questions if they exist
        if (lesson.quizQuestions && Array.isArray(lesson.quizQuestions)) {
          for (let i = 0; i < lesson.quizQuestions.length; i++) {
            const q = lesson.quizQuestions[i];
            await client.query(
              `INSERT INTO quiz_questions (quiz_id, question, options, correct_answer, order_index)
               VALUES ($1, $2, $3, $4, $5)`,
              [
                quizId,
                q.question,
                JSON.stringify(q.options),
                q.correctAnswer,
                i + 1,
              ]
            );
          }
          console.log(`✅ Created quiz with ${lesson.quizQuestions.length} questions for: ${lesson.title}`);
        } else {
          console.warn(`⚠️ No questions generated for quiz: ${lesson.title}`);
        }
        
        quizCounter++;
      }
    }

    await client.query('COMMIT');

    // Count the quizzes created
    const quizCount = learningPath.lessons?.filter(l => l.hasQuiz).length || 0;

    res.status(201).json({
      message: 'Topic created with AI-generated learning path',
      topic,
      learningPath: {
        totalLessons: learningPath.totalLessons,
        totalQuizzes: quizCount,
        estimatedDuration: learningPath.estimatedDurationHours,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

export const updateTopic = async (req, res, next) => {
  const { id } = req.params;
  const { name, description } = req.body;

  try {
    const result = await pool.query(
      'UPDATE topics SET name = COALESCE($1, name), description = COALESCE($2, description) WHERE id = $3 AND user_id = $4 RETURNING *',
      [name, description, id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Topic not found' });
    }

    res.json({
      message: 'Topic updated successfully',
      topic: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

export const deleteTopic = async (req, res, next) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM topics WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Topic not found' });
    }

    res.json({ message: 'Topic deleted successfully' });
  } catch (error) {
    next(error);
  }
};
