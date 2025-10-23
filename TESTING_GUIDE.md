# Quick Start - Testing the 6-Model System

## Prerequisites
1. **Database**: Run migrations first
   ```bash
   psql $DATABASE_URL -f migrations/add_agent_system_tables.sql
   ```

2. **Environment**: Ensure `.env` has `OPENAI_API_KEY`

3. **Server**: Start the backend
   ```bash
   cd hackathon-backend
   npm start
   ```

---

## Test 1: Create Topic (Model 1)

### Request:
```bash
curl -X POST http://localhost:3000/api/topics \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "JavaScript Fundamentals",
    "description": "Learn JavaScript from scratch"
  }'
```

### Expected Logs:
```
📚 [Model 1] Generating learning path for: JavaScript Fundamentals
```

### Expected Response:
```json
{
  "message": "Topic created with AI-generated learning path",
  "topic": { "id": "...", "name": "JavaScript Fundamentals", ... },
  "learningPath": {
    "totalLessons": 8,
    "totalQuizzes": 2,
    "estimatedDuration": 6.5
  }
}
```

---

## Test 2: Send Chat Message (Models 3, 2, 4, 5)

### Request:
```bash
curl -X POST http://localhost:3000/api/chat/LESSON_ID/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "message": "Can you explain what variables are?",
    "lessonId": "LESSON_ID"
  }'
```

### Expected Logs:
```
🔍 [Model 3] Analyzing conversation...
👨‍🏫 [Model 4] Generating teaching response...
📊 [Model 5] Evaluating teaching response...
✅ Response passed (score: 85/100)
```

### Expected Response:
```json
{
  "response": "Variables are containers for storing data values...",
  "passed": true,
  "score": 85,
  "evaluation": {
    "totalScore": 85,
    "passed": true,
    "feedback": "Excellent explanation with good examples",
    "breakdown": {
      "accuracy": { "score": 28, "weight": 30 },
      "clarity": { "score": 22, "weight": 25 },
      "relevance": { "score": 17, "weight": 20 },
      "pedagogy": { "score": 13, "weight": 15 },
      "alignment": { "score": 5, "weight": 10 }
    }
  },
  "analysis": {
    "wasStuck": false,
    "hadNewPreferences": false,
    "promptsAdjusted": false
  }
}
```

---

## Test 3: Trigger System Prompt Adjustment (Model 2)

### Scenario: Send messages indicating stuck pattern

#### Message 1:
```bash
curl -X POST http://localhost:3000/api/chat/LESSON_ID/generate \
  -d '{"message": "I dont understand this"}'
```

#### Message 2:
```bash
curl -X POST http://localhost:3000/api/chat/LESSON_ID/generate \
  -d '{"message": "Still confused"}'
```

#### Message 3:
```bash
curl -X POST http://localhost:3000/api/chat/LESSON_ID/generate \
  -d '{"message": "Can you explain it differently?"}'
```

### Expected Logs (on message 3):
```
🔍 [Model 3] Analyzing conversation...
🔧 [Model 2] Adjusting system prompts...
👨‍🏫 [Model 4] Generating teaching response...
📊 [Model 5] Evaluating teaching response...
✅ Response passed (score: 82/100)
```

### Expected Response:
```json
{
  "response": "Let me break this down step by step...",
  "passed": true,
  "score": 82,
  "analysis": {
    "wasStuck": true,
    "hadNewPreferences": false,
    "promptsAdjusted": true
  },
  "metadata": {
    "promptVersion": 2
  }
}
```

---

## Test 4: Trigger Preference Change (Model 2)

### Request:
```bash
curl -X POST http://localhost:3000/api/chat/LESSON_ID/generate \
  -d '{"message": "Can you give me more examples?"}'
```

### Expected Logs:
```
🔍 [Model 3] Analyzing conversation...
🔧 [Model 2] Adjusting system prompts...
👨‍🏫 [Model 4] Generating teaching response...
```

### Expected Behavior:
- Model 3 detects preference for examples
- `user_preferences.wants_examples` updated to `true`
- Model 2 adjusts prompts to include more examples
- Model 4 generates response with examples

---

## Test 5: Check Database Updates

### User Preferences:
```sql
SELECT * FROM user_preferences WHERE user_id = 'YOUR_USER_ID';
```

**Expected**: `stuck_count`, `preference_changes_count`, `total_interactions` incremented

### Learning Paths:
```sql
SELECT * FROM learning_paths WHERE topic_id = 'YOUR_TOPIC_ID';
```

**Expected**: JSON structure with lessons and quizzes from Model 1

### Lesson Evaluations:
```sql
SELECT * FROM lesson_evaluations WHERE lesson_id = 'YOUR_LESSON_ID';
```

**Expected**: Scores, rubric details, and feedback from Model 5

### System Prompt History:
```sql
SELECT * FROM system_prompt_history WHERE user_id = 'YOUR_USER_ID' ORDER BY created_at DESC;
```

**Expected**: Prompt versions with `stuck_detection` or `preference_change` triggers

---

## Frontend Integration Example

### JavaScript/React:
```javascript
// Send chat message
async function sendMessage(message, lessonId, token) {
  const response = await fetch(`http://localhost:3000/api/chat/${lessonId}/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ message, lessonId })
  });
  
  const data = await response.json();
  
  if (data.passed) {
    console.log('AI Response:', data.response);
    console.log('Quality Score:', data.score);
    console.log('Evaluation:', data.evaluation.feedback);
  } else {
    console.warn('Response quality below threshold:', data.warning);
  }
  
  return data;
}

// Create topic
async function createTopic(name, description, token) {
  const response = await fetch('http://localhost:3000/api/topics', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ name, description })
  });
  
  const data = await response.json();
  console.log('Topic created with', data.learningPath.totalLessons, 'lessons');
  
  return data;
}
```

---

## Troubleshooting

### Issue: "Agent not found"
**Solution**: Ensure orchestrator initialized in `src/agents/index.js`

### Issue: Model 1 generates empty path
**Solution**: Check OPENAI_API_KEY is valid and has credits

### Issue: Score always fails (< 70)
**Solution**: Model 5 may be too strict, check rubric weights in ResponseEvaluator

### Issue: Model 2 never triggers
**Solution**: Send more stuck/preference messages to meet threshold

---

## Performance Expectations

- **Model 1** (Topic Creation): 5-15 seconds
- **Model 3** (Analysis): 1-3 seconds
- **Model 4** (Teaching): 3-8 seconds
- **Model 5** (Evaluation): 2-5 seconds
- **Total Chat Response Time**: 6-16 seconds

---

## Next Steps

1. ✅ Test all endpoints
2. ✅ Verify database updates
3. ✅ Integrate with frontend
4. ⏳ Implement Model 6 (optional)
5. ⏳ Add retry logic for failed responses (optional)
6. ⏳ Create analytics dashboard (optional)
