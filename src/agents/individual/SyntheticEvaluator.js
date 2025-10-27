import BaseAgent from '../core/BaseAgent.js';
import config from '../config/index.js';

/**
 * Model 6: Synthetic Evaluator
 * Simulates a student learning through lessons and evaluates the system
 */
export class SyntheticEvaluator extends BaseAgent {
  constructor() {
    super({
      name: 'SyntheticEvaluator',
      model: 'gemini-2.5-flash',
      temperature: 0.8,
      maxOutputTokens: 2000,
      systemPrompt: 'You are a synthetic student evaluating an educational system.',
    });
  }

  /**
   * Generate a random student persona for testing system adaptability
   */
  async generatePersona() {
    const personaPrompt = `Generate a realistic student persona for testing an adaptive learning system. Create a unique personality each time.

Create a persona with these characteristics:

1. **Background**: Age, occupation/education level, prior knowledge
2. **Learning Style**: Visual, auditory, kinesthetic, reading/writing, or mixed
3. **Communication Style**: Formal, casual, concise, verbose, uses questions frequently
4. **Personality Traits**: Curious, skeptical, impatient, detail-oriented, etc.
5. **Learning Challenges**: Time constraints, language barriers, learning disabilities, anxiety
6. **Goals & Motivation**: Why are they learning this topic?
7. **Technical Proficiency**: Beginner, intermediate, advanced

Return ONLY a JSON object (no markdown) with this structure:
{
  "name": "A fictional name",
  "age": number,
  "background": "Brief description",
  "occupation": "Job or student status",
  "learningStyle": "primary learning style",
  "communicationStyle": "how they communicate",
  "personality": ["trait1", "trait2", "trait3"],
  "challenges": ["challenge1", "challenge2"],
  "priorKnowledge": "beginner|intermediate|advanced",
  "motivation": "Why they want to learn",
  "expectations": "What they expect from lessons"
}`;

    try {
      const response = await this.llm.invoke(personaPrompt);
      const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
      const persona = this.extractJSON(content);
      
      console.log(`\n👤 Generated Persona: ${persona.name} (${persona.occupation})`);
      console.log(`   Learning Style: ${persona.learningStyle}`);
      console.log(`   Communication: ${persona.communicationStyle}`);
      console.log(`   Challenges: ${persona.challenges.join(', ')}`);
      
      return persona;
    } catch (error) {
      console.error('Error generating persona:', error);
      // Fallback persona
      return {
        name: "Alex Martinez",
        age: 28,
        background: "Career switcher with basic technical knowledge",
        occupation: "Junior Developer",
        learningStyle: "mixed with preference for examples",
        communicationStyle: "casual and asks many questions",
        personality: ["curious", "detail-oriented", "occasionally impatient"],
        challenges: ["limited time", "no formal CS education"],
        priorKnowledge: "beginner",
        motivation: "Career advancement",
        expectations: "Clear explanations with practical examples"
      };
    }
  }

  /**
   * Generate persona-specific questions for a lesson
   */
  async generatePersonaQuestions(persona, lessonTitle, lessonContent) {
    const questionsPrompt = `You are roleplaying as a student with this persona:

NAME: ${persona.name}
BACKGROUND: ${persona.background}
OCCUPATION: ${persona.occupation}
LEARNING STYLE: ${persona.learningStyle}
COMMUNICATION STYLE: ${persona.communicationStyle}
PERSONALITY: ${persona.personality.join(', ')}
CHALLENGES: ${persona.challenges.join(', ')}
PRIOR KNOWLEDGE: ${persona.priorKnowledge}
MOTIVATION: ${persona.motivation}

You are learning about: "${lessonTitle}"
Content preview: ${lessonContent?.substring(0, 300) || 'Not provided'}...

Generate 3-4 questions that THIS SPECIFIC PERSON would naturally ask about this topic. 
The questions should reflect:
- Their communication style (${persona.communicationStyle})
- Their learning challenges (${persona.challenges.join(', ')})
- Their prior knowledge level (${persona.priorKnowledge})
- Their personality traits (${persona.personality.join(', ')})

Return ONLY a JSON array of strings (no markdown):
["question 1", "question 2", "question 3"]

Examples:
- If they're impatient: "Can you just give me the key points?"
- If they're visual learner: "Can you show me a diagram or example?"
- If they have limited time: "What's the fastest way to understand this?"
- If they're skeptical: "How do I know this actually works in practice?"
- If they're detail-oriented: "Can you explain exactly how this works under the hood?"`;

    try {
      const response = await this.llm.invoke(questionsPrompt);
      const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
      const questions = this.extractJSON(content);
      return Array.isArray(questions) ? questions : [
        "Can you explain this differently?",
        "Can you give me an example?",
        "How does this apply to real situations?"
      ];
    } catch (error) {
      console.error('Error generating persona questions:', error);
      return [
        "Can you explain this differently?",
        "Can you give me an example?",
        "How does this apply to real situations?"
      ];
    }
  }

  /**
   * @param {import('../types/index.js').AgentMessage} message
   * @returns {Promise<import('../types/index.js').AgentResponse>}
   */
  async processMessage(message) {
    try {
      switch (message.type) {
        case 'request':
          return await this.handleRequest(message);
        default:
          return this.createResponse(null, 'Unsupported message type');
      }
    } catch (error) {
      return this.createResponse(null, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Handle request messages
   * @private
   */
  async handleRequest(message) {
    const { action, data } = message.content;

    switch (action) {
      case 'generate_persona':
        return await this.generatePersonaAction();
      case 'generate_questions':
        return await this.generateQuestionsAction(data);
      case 'evaluate_adaptability':
        return await this.evaluateAdaptability(data);
      case 'evaluate_lesson':
        return await this.evaluateLesson(data);
      case 'evaluate_topic':
        return await this.evaluateTopic(data);
      default:
        return this.createResponse(null, 'Unsupported action');
    }
  }

  /**
   * Action wrapper for generating persona
   */
  async generatePersonaAction() {
    const persona = await this.generatePersona();
    return this.createResponse({ persona });
  }

  /**
   * Action wrapper for generating questions
   */
  async generateQuestionsAction(data) {
    const { persona, lessonTitle, lessonContent } = data;
    const questions = await this.generatePersonaQuestions(persona, lessonTitle, lessonContent);
    return this.createResponse({ questions });
  }

  /**
   * Evaluate how well the system adapted to the student persona
   */
  async evaluateAdaptability(data) {
    const { persona, question, response } = data;

    const adaptabilityPrompt = `You are evaluating how well an AI teaching system adapted to a specific student's needs.

STUDENT PERSONA:
- Name: ${persona.name}
- Background: ${persona.background}
- Learning Style: ${persona.learningStyle}
- Communication Style: ${persona.communicationStyle}
- Personality: ${persona.personality.join(', ')}
- Challenges: ${persona.challenges.join(', ')}
- Prior Knowledge: ${persona.priorKnowledge}
- Expectations: ${persona.expectations}

STUDENT QUESTION: ${question}

AI TEACHER RESPONSE: ${response}

Evaluate how well the response adapted to this specific student's needs on these criteria:

1. **Learning Style Match (0-20)**: Did the response align with their learning style (${persona.learningStyle})?
2. **Communication Match (0-20)**: Did it match their communication preference (${persona.communicationStyle})?
3. **Knowledge Level (0-20)**: Was it appropriate for their knowledge level (${persona.priorKnowledge})?
4. **Challenge Accommodation (0-20)**: Did it address their challenges (${persona.challenges.join(', ')})?
5. **Expectation Fulfillment (0-20)**: Did it meet their expectations (${persona.expectations})?

Return ONLY valid JSON (no markdown):
{
  "adaptabilityScore": number (0-100),
  "breakdown": {
    "learningStyleMatch": number (0-20),
    "communicationMatch": number (0-20),
    "knowledgeLevel": number (0-20),
    "challengeAccommodation": number (0-20),
    "expectationFulfillment": number (0-20)
  },
  "adaptations": ["specific adaptation 1", "specific adaptation 2"],
  "missedOpportunities": ["what could be improved 1", "what could be improved 2"],
  "personaFeedback": "What this specific persona would think of the response"
}`;

    try {
      const response = await this.llm.invoke(adaptabilityPrompt);
      const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
      const evaluation = this.extractJSON(content);

      return this.createResponse({
        evaluation,
        message: 'Adaptability evaluation complete',
      });
    } catch (error) {
      console.error('Error evaluating adaptability:', error);
      return this.createResponse({
        evaluation: {
          adaptabilityScore: 50,
          breakdown: {
            learningStyleMatch: 10,
            communicationMatch: 10,
            knowledgeLevel: 10,
            challengeAccommodation: 10,
            expectationFulfillment: 10,
          },
          adaptations: ['Response provided'],
          missedOpportunities: ['Could not evaluate'],
          personaFeedback: 'Unable to evaluate adaptability'
        },
      });
    }
  }

  /**
   * Evaluate a single lesson by simulating student learning
   * @private
   */
  async evaluateLesson(data) {
    const { lessonTitle, lessonContent, teachingResponse } = data;

    const evaluationPrompt = `You are a synthetic student evaluating an educational lesson.

LESSON INFORMATION:
- Title: "${lessonTitle}"
- Content: ${lessonContent || 'Not provided'}

TEACHING RESPONSE RECEIVED:
${teachingResponse}

Your task is to evaluate this lesson as if you were a real student trying to learn. Consider:

1. **Clarity (0-25)**: Is the explanation clear and easy to understand?
2. **Completeness (0-25)**: Does it cover all necessary concepts?
3. **Engagement (0-20)**: Is it interesting and motivating?
4. **Examples (0-15)**: Are there good examples that aid understanding?
5. **Learning Outcome (0-15)**: Would a student actually learn from this?

Respond with a JSON object in this EXACT format:
{
  "overallScore": number (0-100),
  "breakdown": {
    "clarity": number (0-25),
    "completeness": number (0-25),
    "engagement": number (0-20),
    "examples": number (0-15),
    "learningOutcome": number (0-15)
  },
  "strengths": ["strength 1", "strength 2"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "studentFeedback": "What a real student might say about this lesson",
  "wouldRecommend": boolean
}

IMPORTANT: Return ONLY valid JSON, no markdown code blocks or additional text.`;

    try {
      const response = await this.llm.invoke(evaluationPrompt);
      const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
      
      // Extract and parse JSON
      const evaluation = this.extractJSON(content);

      return this.createResponse({
        evaluation,
        message: 'Lesson evaluation complete',
      });
    } catch (error) {
      console.error('Error evaluating lesson:', error);
      
      // Fallback evaluation
      return this.createResponse({
        evaluation: {
          overallScore: 50,
          breakdown: {
            clarity: 12,
            completeness: 12,
            engagement: 10,
            examples: 8,
            learningOutcome: 8,
          },
          strengths: ['Content is present'],
          weaknesses: ['Unable to evaluate properly'],
          studentFeedback: 'Evaluation failed',
          wouldRecommend: false,
        },
        message: 'Fallback evaluation used',
        warning: error.message,
      });
    }
  }

  /**
   * Evaluate an entire topic with multiple lessons
   * @private
   */
  async evaluateTopic(data) {
    const { topicName, lessons } = data;

    const evaluationPrompt = `You are a synthetic student who has just completed a learning topic.

TOPIC: "${topicName}"
NUMBER OF LESSONS: ${lessons.length}

LESSONS COMPLETED:
${lessons.map((l, i) => `${i + 1}. ${l.title} (Score: ${l.score}/100)`).join('\n')}

Provide an overall assessment of this learning path:

{
  "topicScore": number (0-100, average of all lessons),
  "progressionQuality": number (0-100, how well lessons build on each other),
  "overallFeedback": "Brief paragraph about the learning experience",
  "recommendations": ["suggestion 1", "suggestion 2"],
  "completedSuccessfully": boolean
}

IMPORTANT: Return ONLY valid JSON.`;

    try {
      const response = await this.llm.invoke(evaluationPrompt);
      const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
      
      const evaluation = this.extractJSON(content);

      return this.createResponse({
        evaluation,
        message: 'Topic evaluation complete',
      });
    } catch (error) {
      console.error('Error evaluating topic:', error);
      
      const avgScore = lessons.reduce((sum, l) => sum + (l.score || 0), 0) / lessons.length;
      
      return this.createResponse({
        evaluation: {
          topicScore: Math.round(avgScore),
          progressionQuality: 50,
          overallFeedback: 'Evaluation incomplete',
          recommendations: ['Unable to generate recommendations'],
          completedSuccessfully: false,
        },
        warning: error.message,
      });
    }
  }

  /**
   * Extract JSON from text
   * @private
   */
  extractJSON(text) {
    try {
      return JSON.parse(text);
    } catch {
      const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }
      
      const objectMatch = text.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        return JSON.parse(objectMatch[0]);
      }
      
      throw new Error('No valid JSON found in response');
    }
  }
}

export default SyntheticEvaluator;
