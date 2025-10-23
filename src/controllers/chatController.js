import pool from '../config/database.js';
import { orchestrator } from '../agents/index.js';
import { getUserPreferences, incrementInteractionStats } from '../services/userPreferencesService.js';

// In-memory cache to prevent duplicate initial explanation generation
const generatingInitialExplanations = new Map(); // lessonId-userId -> Promise

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
    const lessonCheck = await pool.query(
      'SELECT * FROM lessons WHERE id = $1',
      [lessonId]
    );

    if (lessonCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    // For system messages (is_user = false), check if it already exists to prevent duplicates
    if (!is_user) {
      const existingMessage = await pool.query(
        `SELECT id FROM chat_messages 
         WHERE user_id = $1 AND lesson_id = $2 AND message = $3 AND is_user = false 
         ORDER BY created_at DESC 
         LIMIT 1`,
        [req.user.id, lessonId, message]
      );

      if (existingMessage.rows.length > 0) {
        console.log('⚠️ Duplicate system message detected, skipping save');
        return res.status(200).json({
          message: 'Message already exists',
          chatMessage: existingMessage.rows[0],
          duplicate: true
        });
      }
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

/**
 * Generate Initial Lesson Explanation
 * Called when user first enters a lesson with no chat history
 */
export const generateInitialExplanation = async (req, res, next) => {
  const { lessonId } = req.params;
  const userId = req.user.id;
  const cacheKey = `${lessonId}-${userId}`;

  try {
    // Check if already generating for this lesson+user
    if (generatingInitialExplanations.has(cacheKey)) {
      console.log('⚠️ Duplicate request detected, waiting for ongoing generation...');
      try {
        // Wait for the ongoing generation to complete
        const result = await generatingInitialExplanations.get(cacheKey);
        return res.json(result);
      } catch (error) {
        console.error('Error waiting for ongoing generation:', error);
        return res.status(500).json({ error: 'Generation in progress failed' });
      }
    }

    // Check if there are existing messages for this lesson
    const existingMessages = await pool.query(
      'SELECT COUNT(*) as count FROM chat_messages WHERE lesson_id = $1 AND user_id = $2 AND is_user = false',
      [lessonId, userId]
    );

    if (parseInt(existingMessages.rows[0].count) > 0) {
      console.log('⚠️ Lesson already has messages, skipping generation');
      return res.status(400).json({ 
        error: 'Lesson already has messages. Use regular chat endpoint.' 
      });
    }

    console.log(`🎓 [Initial Lesson] Generating complete explanation for lesson ${lessonId}...`);

    // Create a promise for this generation and store it
    const generationPromise = (async () => {
      try {

    // Get lesson context
    const lessonResult = await pool.query(
      `SELECT l.*, t.name as topic_name FROM lessons l
       JOIN topics t ON l.topic_id = t.id
       WHERE l.id = $1`,
      [lessonId]
    );

    if (lessonResult.rows.length === 0) {
      throw new Error('Lesson not found');
    }

    const lessonContext = lessonResult.rows[0];
    const userPreferences = await getUserPreferences(userId);

    console.log('🎓 [Initial Lesson] Generating complete explanation for:', lessonContext.title);

    // Generate personalized system prompt (Model 2)
    const teacherPromptResponse = await orchestrator.communication.sendMessage(
      'ChatController',
      'SystemPromptGenerator',
      {
        action: 'generate_personalized_prompt',
        data: {
          userId,
          lessonTopic: lessonContext.topic_name || 'General Learning',
          userPreferences,
          targetModel: 'teacher',
        },
      }
    );

    const teacherPromptContent = teacherPromptResponse.success 
      ? teacherPromptResponse.data.systemPrompt.content 
      : null;

    // Generate comprehensive lesson explanation (Model 4) with retry logic
    console.log('👨‍🏫 [Model 4] Generating initial lesson explanation...');
    
    let explanation = null;
    let evaluation = null;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      attempts++;
      
      // Generate teaching response
      const teachingResponse = await orchestrator.communication.sendMessage(
        'ChatController',
        'TeacherModel',
        {
          action: 'teach',
          data: {
            userId,
            userMessage: attempts === 1 
              ? `Please provide a complete, comprehensive explanation of this lesson: "${lessonContext.title}". Cover all the main concepts, include examples, and make it engaging. This is the first explanation for this lesson.`
              : `Please provide a complete, comprehensive explanation of this lesson: "${lessonContext.title}". 

PREVIOUS ATTEMPT FEEDBACK (Score: ${evaluation?.totalScore || 0}/100):
${evaluation?.overallFeedback || 'No feedback'}

IMPROVEMENTS NEEDED:
${evaluation?.improvements?.join('\n- ') || 'Improve overall quality'}

Please address these issues and provide a better explanation.`,
            lessonContext: {
              title: lessonContext.title,
              topic: lessonContext.topic_name,
              description: lessonContext.content,
            },
            conversationHistory: [],
            systemPromptContent: teacherPromptContent,
          },
        }
      );

      if (!teachingResponse.success) {
        console.error('Model 4 teaching failed:', teachingResponse.error);
        if (attempts === maxAttempts) {
          throw new Error(`Failed to generate lesson explanation after ${maxAttempts} retries: ${teachingResponse.error}`);
        }
        continue;
      }

      explanation = teachingResponse.data.response;

      // Evaluate the explanation (Model 5)
      console.log(`📊 [Model 5] Evaluating explanation (Attempt ${attempts}/${maxAttempts})...`);
      const evaluationResponse = await orchestrator.communication.sendMessage(
        'ChatController',
        'ResponseEvaluator',
        {
          action: 'evaluate_response',
          data: {
            teachingResponse: explanation,
            userMessage: 'Initial lesson explanation',
            lessonContext: {
              title: lessonContext.title,
              topic: lessonContext.topic_name,
            },
            userPreferences,
            conversationHistory: [],
          },
        }
      );

      evaluation = evaluationResponse.success 
        ? evaluationResponse.data.evaluation 
        : { passed: false, totalScore: 0, overallFeedback: 'Evaluation failed' };

      console.log(`Score: ${evaluation.totalScore}/100 - ${evaluation.passed ? '✅ PASSED' : '❌ FAILED'}`);

      // If score >= 70, we're done
      if (evaluation.passed || evaluation.totalScore >= 70) {
        console.log(`✅ Initial explanation accepted after ${attempts} attempt(s)`);
        break;
      }

      // If not passed and not last attempt, retry
      if (attempts < maxAttempts) {
        console.log(`🔄 Regenerating response based on feedback...`);
      }
    }

    // If still failed after all attempts, return with warning
    if (!evaluation.passed && evaluation.totalScore < 70) {
      console.warn(`⚠️ Response quality below threshold after ${maxAttempts} attempts (score: ${evaluation.totalScore})`);
    }

    // Double-check no messages were created during generation (prevent race conditions)
    const doubleCheck = await pool.query(
      'SELECT COUNT(*) as count FROM chat_messages WHERE lesson_id = $1 AND user_id = $2 AND is_user = false',
      [lessonId, userId]
    );

    if (parseInt(doubleCheck.rows[0].count) > 0) {
      console.log('⚠️ Initial explanation already exists (race condition detected), skipping save');
      // Return error object instead of using res
      return {
        _statusCode: 409,
        error: 'Initial explanation already generated',
        message: 'Please refresh to see existing messages'
      };
    }

    // Save the initial explanation to database
    await pool.query(
      `INSERT INTO chat_messages 
       (user_id, lesson_id, message, is_user)
       VALUES ($1, $2, $3, $4)`,
      [userId, lessonId, explanation, false]
    );

    // Save evaluation
    const topicResult = await pool.query(
      'SELECT topic_id FROM lessons WHERE id = $1',
      [lessonId]
    );

    if (topicResult.rows.length > 0) {
      await pool.query(
        `INSERT INTO lesson_evaluations 
         (lesson_id, topic_id, overall_score, evaluation_notes, evaluator_model)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          lessonId,
          topicResult.rows[0].topic_id,
          evaluation.totalScore,
          JSON.stringify({
            type: 'initial_explanation',
            feedback: evaluation.overallFeedback,
            breakdown: evaluation.breakdown,
            passed: evaluation.passed
          }),
          'ResponseEvaluator-gpt-4o-mini',
        ]
      );
    }

    const result = {
      response: explanation,
      type: 'initial_explanation',
      passed: evaluation.passed,
      score: evaluation.totalScore,
      evaluation: {
        totalScore: evaluation.totalScore,
        passed: evaluation.passed,
        feedback: evaluation.overallFeedback,
      },
      metadata: {
        lessonTitle: lessonContext.title,
        topic: lessonContext.topic_name,
      },
    };
        
        return result;
      } catch (innerError) {
        throw innerError;
      }
    })();

    // Store the promise
    generatingInitialExplanations.set(cacheKey, generationPromise);

    try {
      // Wait for generation to complete
      const result = await generationPromise;
      
      // Check if result has a special status code
      if (result._statusCode) {
        const statusCode = result._statusCode;
        delete result._statusCode;
        return res.status(statusCode).json(result);
      }
      
      res.json(result);
    } finally {
      // Clean up cache after 5 seconds
      setTimeout(() => {
        generatingInitialExplanations.delete(cacheKey);
      }, 5000);
    }

  } catch (error) {
    console.error('Error generating initial explanation:', error);
    generatingInitialExplanations.delete(cacheKey);
    next(error);
  }
};

export const generateAIResponse = async (req, res, next) => {
  const { lessonId } = req.params;
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  if (!lessonId) {
    return res.status(400).json({ error: 'Lesson ID is required' });
  }

  try {
    const userId = req.user.id;
    const userPreferences = await getUserPreferences(userId);
    await incrementInteractionStats(userId, 'total_interactions');

    let lessonContext = null;
    if (lessonId) {
      const lessonResult = await pool.query(
        `SELECT l.*, t.name as topic_name FROM lessons l
         JOIN topics t ON l.topic_id = t.id
         WHERE l.id = $1`,
        [lessonId]
      );
      if (lessonResult.rows.length > 0) {
        lessonContext = lessonResult.rows[0];
      }
    }

    const historyResult = lessonId ? await pool.query(
      `SELECT message, is_user, created_at FROM chat_messages
       WHERE lesson_id = $1 AND user_id = $2
       ORDER BY created_at DESC
       LIMIT 20`,
      [lessonId, userId]
    ) : { rows: [] };

    const conversationHistory = historyResult.rows.reverse().map(row => ({
      message: row.message,
      isUser: row.is_user,
      timestamp: row.created_at,
    }));

    console.log(' [Model 3] Analyzing conversation...');
    const analysisResponse = await orchestrator.communication.sendMessage(
      'ChatController',
      'ConversationAnalyzer',
      {
        action: 'analyze_conversation',
        data: {
          userMessage: message,
          conversationHistory,
          currentPreferences: userPreferences,
          lessonContext: lessonContext ? {
            title: lessonContext.title,
            topic: lessonContext.topic_name,
          } : null,
        },
      }
    );

    if (!analysisResponse.success) {
      console.error('Model 3 analysis failed:', analysisResponse.error);
    }

    const analysis = analysisResponse.data?.analysis || {};

    if (analysis.isStuck) {
      await incrementInteractionStats(userId, 'stuck_count');
    }
    if (analysis.hasNewPreference) {
      await incrementInteractionStats(userId, 'preference_changes_count');
    }

    let teacherPromptResponse = null;
    let teacherPromptContent = null;

    if (analysis.needsAdjustment) {
      console.log(' [Model 2] Adjusting system prompts...');

      if (analysis.hasNewPreference && analysis.newPreferences) {
        const updates = {};
        if (analysis.newPreferences.explanation_style) {
          updates.explanation_style = analysis.newPreferences.explanation_style;
        }
        if (analysis.newPreferences.wants_examples !== null) {
          updates.wants_examples = analysis.newPreferences.wants_examples;
        }
        if (analysis.newPreferences.wants_analogies !== null) {
          updates.wants_analogies = analysis.newPreferences.wants_analogies;
        }
        if (analysis.newPreferences.pace) {
          updates.pace = analysis.newPreferences.pace;
        }

        if (Object.keys(updates).length > 0) {
          await pool.query(
            `UPDATE user_preferences 
             SET ${Object.keys(updates).map((key, i) => `${key} = $${i + 1}`).join(', ')}
             WHERE user_id = $${Object.keys(updates).length + 1}`,
            [...Object.values(updates), userId]
          );
          Object.assign(userPreferences, updates);
        }
      }

      teacherPromptResponse = await orchestrator.communication.sendMessage(
        'ChatController',
        'SystemPromptGenerator',
        {
          action: 'generate_personalized_prompt',
          data: {
            userId,
            lessonTopic: lessonContext?.topic_name || 'General Learning',
            userPreferences,
            targetModel: 'teacher',
          },
        }
      );

      if (teacherPromptResponse.success) {
        teacherPromptContent = teacherPromptResponse.data.systemPrompt.content;
        await pool.query(
          `INSERT INTO system_prompt_history 
           (user_id, lesson_id, prompt_version, system_prompt, triggered_by, trigger_details)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            userId,
            lessonId || null,
            teacherPromptResponse.data.systemPrompt.version,
            teacherPromptContent,
            analysis.isStuck ? 'stuck_detection' : 'preference_change',
            JSON.stringify(analysis),
          ]
        );
      }
    }

    // ===== STEP 3: Model 4 - Generate Teaching Response with Retry =====
    console.log('👨‍🏫 [Model 4] Generating teaching response...');
    
    let teacherResponse = null;
    let evaluation = null;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      attempts++;

      const teachingResponse = await orchestrator.communication.sendMessage(
        'ChatController',
        'TeacherModel',
        {
          action: 'teach',
          data: {
            userId,
            userMessage: attempts === 1 
              ? message 
              : `${message}

PREVIOUS RESPONSE FEEDBACK (Score: ${evaluation?.totalScore || 0}/100):
${evaluation?.overallFeedback || 'No feedback'}

IMPROVEMENTS NEEDED:
${evaluation?.improvements?.join('\n- ') || 'Improve overall quality'}

Please provide an improved response that addresses these issues.`,
            lessonContext: lessonContext ? {
              title: lessonContext.title,
              topic: lessonContext.topic_name,
              description: lessonContext.content,
            } : null,
            conversationHistory,
            systemPromptContent: teacherPromptContent,
          },
        }
      );

      if (!teachingResponse.success) {
        console.error('Model 4 teaching failed:', teachingResponse.error);
        if (attempts === maxAttempts) {
          return res.status(500).json({
            error: 'Failed to generate teaching response after retries',
            details: teachingResponse.error,
          });
        }
        continue;
      }

      teacherResponse = teachingResponse.data.response;

      // ===== STEP 4: Model 5 - Evaluate Response =====
      console.log(`📊 [Model 5] Evaluating response (Attempt ${attempts}/${maxAttempts})...`);
      const evaluationResponse = await orchestrator.communication.sendMessage(
        'ChatController',
        'ResponseEvaluator',
        {
          action: 'evaluate_response',
          data: {
            teachingResponse: teacherResponse,
            userMessage: message,
            lessonContext: lessonContext ? {
              title: lessonContext.title,
              topic: lessonContext.topic_name,
            } : null,
            userPreferences,
            conversationHistory,
          },
        }
      );

      evaluation = evaluationResponse.success 
        ? evaluationResponse.data.evaluation 
        : { passed: false, totalScore: 0, overallFeedback: 'Evaluation failed' };

      console.log(`Score: ${evaluation.totalScore}/100 - ${evaluation.passed ? '✅ PASSED' : '❌ FAILED'}`);

      // ===== STEP 5: Check if response passes (score >= 70) =====
      if (evaluation.passed || evaluation.totalScore >= 70) {
        console.log(`✅ Response accepted after ${attempts} attempt(s)`);
        break;
      }

      if (attempts < maxAttempts) {
        console.log(`🔄 Regenerating response based on feedback...`);
      }
    }

    if (!evaluation.passed && evaluation.totalScore < 70) {
      console.log(`❌ Response failed after ${maxAttempts} attempts (score: ${evaluation.totalScore}/100)`);
      
      return res.json({
        response: teacherResponse,
        passed: false,
        score: evaluation.totalScore,
        feedback: evaluation.overallFeedback,
        warning: `Response quality below threshold after ${maxAttempts} attempts`,
        attemptsUsed: maxAttempts,
      });
    }

    console.log(`✅ Response passed (score: ${evaluation.totalScore}/100)`);

    // ===== STEP 6: Save to Database =====
    if (lessonId) {
      await pool.query(
        `INSERT INTO chat_messages 
         (user_id, lesson_id, message, is_user)
         VALUES ($1, $2, $3, $4)`,
        [userId, lessonId, teacherResponse, false]
      );

      // Get topic_id for lesson_evaluations
      const topicResult = await pool.query(
        'SELECT topic_id FROM lessons WHERE id = $1',
        [lessonId]
      );

      if (topicResult.rows.length > 0) {
        await pool.query(
          `INSERT INTO lesson_evaluations 
           (lesson_id, topic_id, overall_score, evaluation_notes, evaluator_model)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            lessonId,
            topicResult.rows[0].topic_id,
            evaluation.totalScore,
            JSON.stringify({
              feedback: evaluation.overallFeedback,
              breakdown: evaluation.breakdown,
              passed: evaluation.passed
            }),
            'ResponseEvaluator-gpt-4o-mini',
          ]
        );
      }
    }

    // ===== STEP 7: Send Response to Frontend =====
    res.json({
      response: teacherResponse,
      passed: true,
      score: evaluation.totalScore,
      evaluation: {
        totalScore: evaluation.totalScore,
        passed: evaluation.passed,
        feedback: evaluation.overallFeedback,
        breakdown: evaluation.breakdown,
      },
      analysis: {
        wasStuck: analysis.isStuck,
        hadNewPreferences: analysis.hasNewPreference,
        promptsAdjusted: analysis.needsAdjustment,
      },
      metadata: {
        model3: 'ConversationAnalyzer',
        model4: 'TeacherModel',
        model5: 'ResponseEvaluator',
        promptVersion: teacherPromptResponse?.data?.systemPrompt?.version || null,
        attemptsUsed: attempts,
      },
    });

  } catch (error) {
    console.error('Error in 6-model chat flow:', error);
    next(error);
  }
};
