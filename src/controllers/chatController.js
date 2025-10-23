import pool from '../config/database.js';

export const getChatMessages = async (req, res, next) => {
  const { lessonId } = req.params;
  const { limit = 50, offset = 0 } = req.query;

  try {
    const result = await pool.query(
      `SELECT * FROM chat_messages 
       WHERE lesson_id = $1 AND user_id = $2
       ORDER BY created_at ASC
       LIMIT $3 OFFSET $4`,
      [lessonId, req.user.id, limit, offset]
    );

    res.json({ messages: result.rows });
  } catch (error) {
    next(error);
  }
};

export const createChatMessage = async (req, res, next) => {
  const { lessonId } = req.params;
  const { message, is_user = true } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    // Verify lesson exists
    const lessonCheck = await pool.query(
      'SELECT * FROM lessons WHERE id = $1',
      [lessonId]
    );

    if (lessonCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    const result = await pool.query(
      'INSERT INTO chat_messages (user_id, lesson_id, message, is_user) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.user.id, lessonId, message, is_user]
    );

    res.status(201).json({
      message: 'Chat message created successfully',
      chatMessage: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

export const deleteChatMessages = async (req, res, next) => {
  const { lessonId } = req.params;

  try {
    await pool.query(
      'DELETE FROM chat_messages WHERE lesson_id = $1 AND user_id = $2',
      [lessonId, req.user.id]
    );

    res.json({ message: 'Chat messages deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// Mock AI response generator (can be replaced with actual AI service)
export const generateAIResponse = async (req, res, next) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    // Simple mock responses - replace with actual AI service like OpenAI
    const responses = [
      "That's a **great question**! Let me explain...\n\n- First, we need to understand the basics\n- Then, we can move to more advanced concepts\n- Finally, we'll practice with examples",
      "I see what you're asking. Here's how it works:\n\n1. Start with the fundamentals\n2. Build on that knowledge\n3. Apply it in real scenarios",
      "**Excellent observation!** The key concept here is understanding how everything connects together.\n\n`Remember`: Practice makes perfect!",
      "Let me break that down for you:\n\n- **Core concept**: This is the foundation\n- **Implementation**: How we use it in practice\n- **Best practices**: Tips for success",
      "That's correct! You're getting the hang of it. 🎉\n\n*Keep up the great work!*",
    ];

    const randomResponse = responses[Math.floor(Math.random() * responses.length)];

    res.json({ response: randomResponse });
  } catch (error) {
    next(error);
  }
};
