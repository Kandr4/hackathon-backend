# Agent System - API Usage Examples

## Complete API Examples with cURL

### Prerequisites
```bash
# 1. Login to get JWT token
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "your_password"
  }'

# Save the token from response
export TOKEN="your_jwt_token_here"
```

## Agent Endpoints

### 1. Start Adaptive Learning
```bash
curl -X POST http://localhost:5000/api/agents/start-learning \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "Introduction to Python Programming"
  }'
```

**Response:**
```json
{
  "message": "Adaptive learning started successfully",
  "data": {
    "systemPrompt": { ... },
    "lesson": {
      "id": "uuid-here",
      "title": "Getting Started with Python",
      "content": "# Introduction to Python...",
      "difficulty": "intermediate",
      "topic": "Introduction to Python Programming"
    },
    "evaluation": {
      "lessonId": "uuid-here",
      "score": 85,
      "passed": true,
      "feedback": "Excellent lesson..."
    }
  }
}
```

### 2. Generate AI Lesson
```bash
curl -X POST http://localhost:5000/api/agents/generate-lesson \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "JavaScript Async/Await",
    "difficulty": "advanced"
  }'
```

### 3. Analyze User Progress
```bash
curl -X GET http://localhost:5000/api/agents/analyze-progress \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "message": "Progress analyzed successfully",
  "analysis": {
    "learningPattern": {
      "questionTypes": ["conceptual", "practical"],
      "difficultyPreference": "intermediate",
      "learningStyle": "visual",
      "commonMistakes": ["syntax errors"],
      "strengths": ["problem solving"]
    },
    "recommendations": [
      "Continue with intermediate level",
      "Include more visual examples"
    ]
  }
}
```

### 4. Get System Statistics
```bash
curl -X GET http://localhost:5000/api/agents/statistics \
  -H "Authorization: Bearer $TOKEN"
```

### 5. Get Agent Status
```bash
curl -X GET http://localhost:5000/api/agents/status \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "message": "Agent statuses retrieved",
  "agents": [
    {
      "name": "SystemPromptGenerator",
      "isProcessing": false,
      "queueLength": 0
    },
    {
      "name": "LessonGenerator",
      "isProcessing": false,
      "queueLength": 0
    }
  ],
  "systemRunning": true
}
```

### 6. Evaluate System with Curriculum
```bash
curl -X POST http://localhost:5000/api/agents/evaluate-system \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "Web Development Fundamentals",
    "curriculum": [
      "HTML Basics",
      "CSS Styling",
      "JavaScript Introduction",
      "DOM Manipulation",
      "Responsive Design"
    ]
  }'
```

## Lesson Endpoints

### 1. Generate AI Lesson and Save to Database
```bash
curl -X POST http://localhost:5000/api/lessons/topic/1/lessons/generate-ai \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Understanding React Hooks",
    "difficulty": "intermediate",
    "saveToDatabase": true
  }'
```

**Response:**
```json
{
  "message": "AI-generated lesson created and saved successfully",
  "lesson": {
    "id": 123,
    "topic_id": 1,
    "title": "Understanding React Hooks",
    "content": "# React Hooks\n\nReact Hooks allow you to...",
    "order_index": 5,
    "created_at": "2024-01-01T00:00:00Z"
  },
  "aiMetadata": {
    "difficulty": "intermediate",
    "generatedAt": "2024-01-01T00:00:00Z"
  }
}
```

### 2. Generate AI Lesson Without Saving
```bash
curl -X POST http://localhost:5000/api/lessons/topic/1/lessons/generate-ai \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "CSS Grid Layout",
    "difficulty": "beginner",
    "saveToDatabase": false
  }'
```

### 3. Evaluate Existing Lesson
```bash
curl -X POST http://localhost:5000/api/lessons/123/evaluate \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "message": "Lesson evaluated successfully",
  "evaluation": {
    "lessonId": 123,
    "score": 87,
    "maxScore": 100,
    "passed": true,
    "feedback": "The lesson demonstrates excellent...",
    "rubricUsed": "rubric-uuid",
    "evaluatedAt": "2024-01-01T00:00:00Z"
  },
  "detailedScores": {
    "Accuracy": { "score": 28, "feedback": "Information is precise..." },
    "Clarity": { "score": 23, "feedback": "Well-structured..." },
    "Adaptability": { "score": 18, "feedback": "Good adaptation..." },
    "Interactivity": { "score": 12, "feedback": "Includes exercises..." },
    "Motivation": { "score": 6, "feedback": "Engaging content..." }
  },
  "recommendations": [
    "Add more interactive examples",
    "Include practice exercises"
  ]
}
```

## Chat Endpoints

### Generate AI Response
```bash
curl -X POST http://localhost:5000/api/chat/ai \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Can you explain what closures are in JavaScript?",
    "lessonId": "123"
  }'
```

**Response:**
```json
{
  "response": "# Understanding Closures in JavaScript\n\nA closure is a function that has access to variables in its outer (enclosing) lexical scope...\n\n**Example:**\n```javascript\nfunction outer() {\n  let count = 0;\n  return function inner() {\n    count++;\n    return count;\n  }\n}\n```"
}
```

## JavaScript/Frontend Integration

### Using Fetch API

```javascript
// 1. Start Adaptive Learning
async function startLearning(topic) {
  const response = await fetch('http://localhost:5000/api/agents/start-learning', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ topic })
  });
  
  const data = await response.json();
  console.log('Learning started:', data);
}

// 2. Generate AI Lesson
async function generateLesson(topicId, title, difficulty) {
  const response = await fetch(
    `http://localhost:5000/api/lessons/topic/${topicId}/lessons/generate-ai`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        title, 
        difficulty, 
        saveToDatabase: true 
      })
    }
  );
  
  const data = await response.json();
  return data.lesson;
}

// 3. Get AI Chat Response
async function getChatResponse(message, lessonId) {
  const response = await fetch('http://localhost:5000/api/chat/ai', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ message, lessonId })
  });
  
  const data = await response.json();
  return data.response;
}

// 4. Analyze Progress
async function analyzeProgress() {
  const response = await fetch('http://localhost:5000/api/agents/analyze-progress', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const data = await response.json();
  return data.analysis;
}

// 5. Evaluate Lesson
async function evaluateLesson(lessonId) {
  const response = await fetch(
    `http://localhost:5000/api/lessons/${lessonId}/evaluate`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  
  const data = await response.json();
  return data.evaluation;
}
```

## React Integration Example

```jsx
import { useState } from 'react';
import axios from 'axios';

function AILessonGenerator() {
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('intermediate');
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(false);

  const generateLesson = async () => {
    setLoading(true);
    try {
      const response = await axios.post(
        '/api/agents/generate-lesson',
        { topic, difficulty },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      setLesson(response.data.lesson);
    } catch (error) {
      console.error('Error generating lesson:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input 
        value={topic} 
        onChange={e => setTopic(e.target.value)}
        placeholder="Enter topic"
      />
      <select 
        value={difficulty} 
        onChange={e => setDifficulty(e.target.value)}
      >
        <option value="beginner">Beginner</option>
        <option value="intermediate">Intermediate</option>
        <option value="advanced">Advanced</option>
      </select>
      <button onClick={generateLesson} disabled={loading}>
        {loading ? 'Generating...' : 'Generate Lesson'}
      </button>
      
      {lesson && (
        <div>
          <h2>{lesson.title}</h2>
          <div dangerouslySetInnerHTML={{ __html: lesson.content }} />
        </div>
      )}
    </div>
  );
}
```

## Testing Checklist

- [ ] Login and get JWT token
- [ ] Test agent status endpoint
- [ ] Generate a simple lesson
- [ ] Evaluate a lesson
- [ ] Start adaptive learning
- [ ] Analyze progress
- [ ] Get system statistics
- [ ] Test chat AI response
- [ ] Save AI-generated lesson to database

## Troubleshooting

### No Response from Agent Endpoints
- Check if OPENAI_API_KEY is set in .env
- Verify server logs for errors
- Check agent status endpoint

### 401 Unauthorized
- Ensure JWT token is valid
- Include Authorization header in all requests

### 500 Internal Server Error
- Check server logs
- Verify OpenAI API key is valid
- Check network connectivity
