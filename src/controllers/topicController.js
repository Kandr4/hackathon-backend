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

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Create the topic
    const topicResult = await client.query(
      'INSERT INTO topics (name, description, user_id) VALUES ($1, $2, $3) RETURNING *',
      [name, description || null, req.user.id]
    );

    const topic = topicResult.rows[0];

    // Generate mock lessons
    const lessons = [
      {
        title: `Introduction to ${name}`,
        content: `Welcome to ${name}! In this lesson, we'll cover the fundamentals and get you started with the basics.`,
        order_index: 0
      },
      {
        title: `Core Concepts of ${name}`,
        content: `Now that you understand the basics, let's dive deeper into the core concepts and principles of ${name}.`,
        order_index: 1
      },
      {
        title: `Practical Applications`,
        content: `Let's explore how ${name} is used in real-world scenarios and practice with some hands-on examples.`,
        order_index: 2
      },
      {
        title: `Advanced Techniques`,
        content: `Take your knowledge to the next level with these advanced techniques and best practices in ${name}.`,
        order_index: 3
      },
      {
        title: `Summary and Next Steps`,
        content: `Congratulations! Let's review what you've learned and discuss where to go from here with ${name}.`,
        order_index: 4
      }
    ];

    for (const lesson of lessons) {
      await client.query(
        'INSERT INTO lessons (topic_id, title, content, order_index) VALUES ($1, $2, $3, $4)',
        [topic.id, lesson.title, lesson.content, lesson.order_index]
      );
    }

    // Generate mock quizzes
    const quizzes = [
      {
        title: `${name} - Basics Quiz`,
        description: 'Test your understanding of the fundamental concepts',
        order_index: 5,
        questions: [
          {
            question: `What is the primary purpose of ${name}?`,
            options: ['Option A: To solve basic problems', 'Option B: To improve efficiency', 'Option C: To enable new capabilities', 'Option D: All of the above'],
            correct_answer: 3
          },
          {
            question: `Which of the following is a key concept in ${name}?`,
            options: ['Option A: Understanding fundamentals', 'Option B: Ignoring details', 'Option C: Random guessing', 'Option D: Skipping practice'],
            correct_answer: 0
          },
          {
            question: `How should you approach learning ${name}?`,
            options: ['Option A: Rush through content', 'Option B: Practice regularly', 'Option C: Avoid examples', 'Option D: Skip lessons'],
            correct_answer: 1
          }
        ]
      },
      {
        title: `${name} - Advanced Quiz`,
        description: 'Challenge yourself with advanced topics',
        order_index: 6,
        questions: [
          {
            question: `What is an advanced technique in ${name}?`,
            options: ['Option A: Applying best practices', 'Option B: Ignoring guidelines', 'Option C: Using outdated methods', 'Option D: Avoiding documentation'],
            correct_answer: 0
          },
          {
            question: `In real-world applications, ${name} is most effective when:`,
            options: ['Option A: Used without planning', 'Option B: Combined with proper understanding', 'Option C: Applied randomly', 'Option D: Avoided completely'],
            correct_answer: 1
          }
        ]
      }
    ];

    for (const quiz of quizzes) {
      const quizResult = await client.query(
        'INSERT INTO quizzes (topic_id, title, description, order_index) VALUES ($1, $2, $3, $4) RETURNING *',
        [topic.id, quiz.title, quiz.description, quiz.order_index]
      );

      const quizId = quizResult.rows[0].id;

      for (const question of quiz.questions) {
        await client.query(
          'INSERT INTO quiz_questions (quiz_id, question, options, correct_answer) VALUES ($1, $2, $3, $4)',
          [quizId, question.question, JSON.stringify(question.options), question.correct_answer]
        );
      }
    }

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Topic created successfully with learning path',
      topic
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
