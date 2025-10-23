import pool from '../config/database.js';

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

export const createTopic = async (req, res, next) => {
  const { name, description } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Topic name is required' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO topics (name, description, user_id) VALUES ($1, $2, $3) RETURNING *',
      [name, description || null, req.user.id]
    );

    res.status(201).json({
      message: 'Topic created successfully',
      topic: result.rows[0]
    });
  } catch (error) {
    next(error);
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
