import pool from '../config/database.js';

export const getLessons = async (req, res, next) => {
  const { topicId } = req.params;

  try {
    const result = await pool.query(
      `SELECT l.*, 
        COALESCE(lp.completed, false) as completed
       FROM lessons l
       LEFT JOIN lesson_progress lp ON l.id = lp.lesson_id AND lp.user_id = $2
       WHERE l.topic_id = $1
       ORDER BY l.order_index ASC`,
      [topicId, req.user.id]
    );

    res.json({ lessons: result.rows });
  } catch (error) {
    next(error);
  }
};

export const getLesson = async (req, res, next) => {
  const { lessonId } = req.params;

  try {
    const result = await pool.query(
      `SELECT l.*, 
        COALESCE(lp.completed, false) as completed
       FROM lessons l
       LEFT JOIN lesson_progress lp ON l.id = lp.lesson_id AND lp.user_id = $2
       WHERE l.id = $1`,
      [lessonId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    res.json({ lesson: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

export const createLesson = async (req, res, next) => {
  const { topicId } = req.params;
  const { title, content, order_index } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Lesson title is required' });
  }

  try {
    // Verify topic belongs to user
    const topicCheck = await pool.query(
      'SELECT * FROM topics WHERE id = $1 AND user_id = $2',
      [topicId, req.user.id]
    );

    if (topicCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Topic not found' });
    }

    // Get next order index if not provided
    let finalOrderIndex = order_index;
    if (finalOrderIndex === undefined) {
      const maxOrderResult = await pool.query(
        'SELECT COALESCE(MAX(order_index), 0) + 1 as next_order FROM lessons WHERE topic_id = $1',
        [topicId]
      );
      finalOrderIndex = maxOrderResult.rows[0].next_order;
    }

    const result = await pool.query(
      'INSERT INTO lessons (topic_id, title, content, order_index) VALUES ($1, $2, $3, $4) RETURNING *',
      [topicId, title, content || null, finalOrderIndex]
    );

    res.status(201).json({
      message: 'Lesson created successfully',
      lesson: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

export const updateLesson = async (req, res, next) => {
  const { lessonId } = req.params;
  const { title, content, order_index } = req.body;

  try {
    // Verify lesson belongs to user's topic
    const lessonCheck = await pool.query(
      `SELECT l.* FROM lessons l
       JOIN topics t ON l.topic_id = t.id
       WHERE l.id = $1 AND t.user_id = $2`,
      [lessonId, req.user.id]
    );

    if (lessonCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    const result = await pool.query(
      `UPDATE lessons 
       SET title = COALESCE($1, title), 
           content = COALESCE($2, content),
           order_index = COALESCE($3, order_index)
       WHERE id = $4 
       RETURNING *`,
      [title, content, order_index, lessonId]
    );

    res.json({
      message: 'Lesson updated successfully',
      lesson: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

export const deleteLesson = async (req, res, next) => {
  const { lessonId } = req.params;

  try {
    // Verify lesson belongs to user's topic
    const lessonCheck = await pool.query(
      `SELECT l.* FROM lessons l
       JOIN topics t ON l.topic_id = t.id
       WHERE l.id = $1 AND t.user_id = $2`,
      [lessonId, req.user.id]
    );

    if (lessonCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    await pool.query('DELETE FROM lessons WHERE id = $1', [lessonId]);

    res.json({ message: 'Lesson deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const completeLesson = async (req, res, next) => {
  const { lessonId } = req.params;

  try {
    // Check if lesson exists
    const lessonCheck = await pool.query('SELECT * FROM lessons WHERE id = $1', [lessonId]);

    if (lessonCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    // Upsert lesson progress
    const result = await pool.query(
      `INSERT INTO lesson_progress (user_id, lesson_id, completed, completed_at)
       VALUES ($1, $2, true, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, lesson_id)
       DO UPDATE SET completed = true, completed_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [req.user.id, lessonId]
    );

    res.json({
      message: 'Lesson marked as completed',
      progress: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

export const uncompleteLesson = async (req, res, next) => {
  const { lessonId } = req.params;

  try {
    const result = await pool.query(
      `UPDATE lesson_progress 
       SET completed = false, completed_at = NULL
       WHERE user_id = $1 AND lesson_id = $2
       RETURNING *`,
      [req.user.id, lessonId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lesson progress not found' });
    }

    res.json({
      message: 'Lesson marked as incomplete',
      progress: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};
