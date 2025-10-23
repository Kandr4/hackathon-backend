import pool from '../config/database.js';

/**
 * Get or create user preferences
 */
export const getUserPreferences = async (userId) => {
  try {
    let result = await pool.query(
      'SELECT * FROM user_preferences WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      // Create default preferences
      result = await pool.query(
        `INSERT INTO user_preferences (user_id) 
         VALUES ($1) 
         RETURNING *`,
        [userId]
      );
    }

    return result.rows[0];
  } catch (error) {
    console.error('Error getting user preferences:', error);
    throw error;
  }
};

/**
 * Update user preferences
 */
export const updateUserPreferences = async (userId, preferences) => {
  try {
    const fields = [];
    const values = [];
    let paramCount = 1;

    // Build dynamic update query
    Object.entries(preferences).forEach(([key, value]) => {
      fields.push(`${key} = $${paramCount}`);
      values.push(value);
      paramCount++;
    });

    if (fields.length === 0) {
      return await getUserPreferences(userId);
    }

    values.push(userId);
    const query = `
      UPDATE user_preferences 
      SET ${fields.join(', ')}
      WHERE user_id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error('Error updating user preferences:', error);
    throw error;
  }
};

/**
 * Increment interaction counters
 */
export const incrementInteractionStats = async (userId, field) => {
  try {
    const validFields = ['stuck_count', 'preference_changes_count', 'total_interactions'];
    if (!validFields.includes(field)) {
      throw new Error('Invalid field name');
    }

    await pool.query(
      `UPDATE user_preferences 
       SET ${field} = ${field} + 1 
       WHERE user_id = $1`,
      [userId]
    );
  } catch (error) {
    console.error('Error incrementing stats:', error);
  }
};

export default {
  getUserPreferences,
  updateUserPreferences,
  incrementInteractionStats,
};
