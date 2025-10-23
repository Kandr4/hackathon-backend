# Agent System Quick Reference

## Quick Start

1. **Add OpenAI API Key to .env**
   ```env
   OPENAI_API_KEY=sk-your-api-key-here
   ```

2. **Start the Server**
   ```bash
   cd hackathon-backend
   npm run dev
   ```

3. **Test Agent Endpoint**
   ```bash
   # Get a JWT token first by logging in
   curl -X POST http://localhost:5000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"your@email.com","password":"password"}'
   
   # Use the token to test agents
   curl -X GET http://localhost:5000/api/agents/status \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```

## Key Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/agents/start-learning` | POST | Initialize adaptive learning |
| `/api/agents/generate-lesson` | POST | Generate AI lesson |
| `/api/agents/analyze-progress` | GET | Analyze user progress |
| `/api/agents/statistics` | GET | Get system stats |
| `/api/lessons/topic/:topicId/lessons/generate-ai` | POST | Generate and save lesson |
| `/api/lessons/:lessonId/evaluate` | POST | Evaluate lesson quality |
| `/api/chat/ai` | POST | Get AI chat response |

## Agent System Components

```
src/agents/
├── config/
│   └── index.js          # Agent configurations
├── core/
│   ├── BaseAgent.js      # Base agent class
│   ├── AgentCommunication.js  # Message routing
│   └── AdaptiveLearningOrchestrator.js  # Main orchestrator
├── individual/
│   ├── SystemPromptGenerator.js
│   ├── LessonGenerator.js
│   ├── LessonEvaluator.js
│   └── ChangeDetector.js
├── types/
│   └── index.js          # Type definitions (JSDoc)
└── index.js              # Main exports
```

## Using Agents in Code

### Import the Orchestrator
```javascript
import { orchestrator } from '../agents/index.js';
```

### Generate a Lesson
```javascript
const result = await orchestrator.generateNewLesson(
  'JavaScript Basics',  // topic
  'beginner',           // difficulty
  userId                // user ID
);

if (result.success) {
  const lesson = result.data.lesson;
  console.log(lesson.title, lesson.content);
}
```

### Communicate with Specific Agent
```javascript
const response = await orchestrator.communication.sendMessage(
  'MyController',
  'LessonGenerator',
  {
    action: 'generate_lesson',
    data: { topic: 'React Hooks', difficulty: 'intermediate' }
  }
);
```

### Analyze User Progress
```javascript
const analysis = await orchestrator.analyzeUserProgress(userId);
if (analysis.success) {
  const pattern = analysis.data.learningPattern;
  console.log('Learning style:', pattern.learningStyle);
  console.log('Strengths:', pattern.strengths);
}
```

## Response Format

All agent operations return:
```javascript
{
  success: boolean,
  data?: any,
  error?: string,
  metadata?: {
    tokensUsed: number,
    processingTime: number,
    model: string
  }
}
```

## Common Issues

### Issue: "OPENAI_API_KEY is required"
**Solution:** Add your API key to `.env` file and restart server

### Issue: Agent timeout
**Solution:** Increase timeout in `src/agents/config/index.js`:
```javascript
system: {
  timeout: 60000  // 60 seconds
}
```

### Issue: Low quality responses
**Solution:** Adjust agent temperature:
```javascript
lessonGenerator: {
  temperature: 0.7  // Lower = more focused, Higher = more creative
}
```

## Development Tips

1. **Check Agent Status**
   ```javascript
   const stats = orchestrator.getSystemStatistics();
   console.log(stats);
   ```

2. **Monitor Agent Activity**
   ```javascript
   const statuses = orchestrator.communication.getAllAgentsStatus();
   statuses.forEach((status, name) => {
     console.log(`${name}: ${status.isProcessing ? 'busy' : 'idle'}`);
   });
   ```

3. **Clear Message History**
   ```javascript
   orchestrator.communication.clearHistory();
   ```

## Cost Management

- **gpt-4o-mini**: ~$0.15 per 1M input tokens, ~$0.60 per 1M output tokens
- Adjust `maxTokens` in config to control costs
- Cache frequently used prompts
- Monitor usage via OpenAI dashboard

## Testing Without OpenAI

For development without an API key, the system will:
- Start successfully with warnings
- Fallback to error responses for agent operations
- Allow testing of other backend features

Enable API key when ready for AI features.
