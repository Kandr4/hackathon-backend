import pool from '../config/database.js';

export const getQuiz = async (req, res, next) => {
  const { quizId } = req.params;

  try {
    const quizResult = await pool.query(
      'SELECT * FROM quizzes WHERE id = $1',
      [quizId]
    );

    if (quizResult.rows.length === 0) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const quiz = quizResult.rows[0];

    // Get questions for this quiz
    const questionsResult = await pool.query(
      'SELECT id, question, options, correct_answer, order_index FROM quiz_questions WHERE quiz_id = $1 ORDER BY order_index ASC',
      [quizId]
    );

    res.json({
      quiz: {
        ...quiz,
        questions: questionsResult.rows
      }
    });
  } catch (error) {
    next(error);
  }
};

export const createQuiz = async (req, res, next) => {
  const { topicId } = req.params;
  const { title, description, order_index } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Quiz title is required' });
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
        'SELECT COALESCE(MAX(order_index), 0) + 1 as next_order FROM quizzes WHERE topic_id = $1',
        [topicId]
      );
      finalOrderIndex = maxOrderResult.rows[0].next_order;
    }

    const result = await pool.query(
      'INSERT INTO quizzes (topic_id, title, description, order_index) VALUES ($1, $2, $3, $4) RETURNING *',
      [topicId, title, description || null, finalOrderIndex]
    );

    res.status(201).json({
      message: 'Quiz created successfully',
      quiz: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

export const addQuestion = async (req, res, next) => {
  const { quizId } = req.params;
  const { question, options, correct_answer, order_index } = req.body;

  if (!question || !options || correct_answer === undefined) {
    return res.status(400).json({ error: 'Question, options, and correct_answer are required' });
  }

  if (!Array.isArray(options) || options.length < 2) {
    return res.status(400).json({ error: 'Options must be an array with at least 2 items' });
  }

  if (correct_answer < 0 || correct_answer >= options.length) {
    return res.status(400).json({ error: 'Invalid correct_answer index' });
  }

  try {
    // Verify quiz belongs to user's topic
    const quizCheck = await pool.query(
      `SELECT q.* FROM quizzes q
       JOIN topics t ON q.topic_id = t.id
       WHERE q.id = $1 AND t.user_id = $2`,
      [quizId, req.user.id]
    );

    if (quizCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    // Get next order index if not provided
    let finalOrderIndex = order_index;
    if (finalOrderIndex === undefined) {
      const maxOrderResult = await pool.query(
        'SELECT COALESCE(MAX(order_index), 0) + 1 as next_order FROM quiz_questions WHERE quiz_id = $1',
        [quizId]
      );
      finalOrderIndex = maxOrderResult.rows[0].next_order;
    }

    const result = await pool.query(
      'INSERT INTO quiz_questions (quiz_id, question, options, correct_answer, order_index) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [quizId, question, JSON.stringify(options), correct_answer, finalOrderIndex]
    );

    res.status(201).json({
      message: 'Question added successfully',
      question: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

export const submitQuiz = async (req, res, next) => {
  const { quizId } = req.params;
  const { answers } = req.body; // Array of { questionId, selectedAnswer }

  if (!Array.isArray(answers)) {
    return res.status(400).json({ error: 'Answers must be an array' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get all questions for the quiz
    const questionsResult = await client.query(
      'SELECT id, correct_answer FROM quiz_questions WHERE quiz_id = $1',
      [quizId]
    );

    const questions = questionsResult.rows;
    const questionsMap = new Map(questions.map(q => [q.id, q.correct_answer]));

    // Calculate score
    let score = 0;
    const answersData = [];

    for (const answer of answers) {
      const correctAnswer = questionsMap.get(answer.questionId);
      const isCorrect = correctAnswer === answer.selectedAnswer;
      if (isCorrect) score++;

      answersData.push({
        questionId: answer.questionId,
        selectedAnswer: answer.selectedAnswer,
        isCorrect
      });
    }

    // Create quiz attempt
    const attemptResult = await client.query(
      'INSERT INTO quiz_attempts (user_id, quiz_id, score, total_questions) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.user.id, quizId, score, questions.length]
    );

    const attempt = attemptResult.rows[0];

    // Save individual answers
    for (const answerData of answersData) {
      await client.query(
        'INSERT INTO quiz_answers (attempt_id, question_id, selected_answer, is_correct) VALUES ($1, $2, $3, $4)',
        [attempt.id, answerData.questionId, answerData.selectedAnswer, answerData.isCorrect]
      );
    }

    await client.query('COMMIT');

    res.json({
      message: 'Quiz submitted successfully',
      attempt: {
        ...attempt,
        answers: answersData
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

export const getQuizAttempts = async (req, res, next) => {
  const { quizId } = req.params;

  try {
    const result = await pool.query(
      `SELECT qa.*, 
        json_agg(
          json_build_object(
            'question_id', qans.question_id,
            'selected_answer', qans.selected_answer,
            'is_correct', qans.is_correct
          )
        ) as answers
       FROM quiz_attempts qa
       LEFT JOIN quiz_answers qans ON qa.id = qans.attempt_id
       WHERE qa.quiz_id = $1 AND qa.user_id = $2
       GROUP BY qa.id
       ORDER BY qa.completed_at DESC`,
      [quizId, req.user.id]
    );

    res.json({ attempts: result.rows });
  } catch (error) {
    next(error);
  }
};

export const deleteQuiz = async (req, res, next) => {
  const { quizId } = req.params;

  try {
    // Verify quiz belongs to user's topic
    const quizCheck = await pool.query(
      `SELECT q.* FROM quizzes q
       JOIN topics t ON q.topic_id = t.id
       WHERE q.id = $1 AND t.user_id = $2`,
      [quizId, req.user.id]
    );

    if (quizCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    await pool.query('DELETE FROM quizzes WHERE id = $1', [quizId]);

    res.json({ message: 'Quiz deleted successfully' });
  } catch (error) {
    next(error);
  }
};
