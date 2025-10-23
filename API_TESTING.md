# API Testing Guide

This document provides example requests for testing the Learning Platform API.

## Setup

1. Make sure the server is running: `npm run dev`
2. Server should be accessible at: `http://localhost:5000`

## Authentication Flow

### 1. Register a New User

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "demo",
    "email": "demo@example.com",
    "password": "demo123"
  }'
```

Response:
```json
{
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "demo",
    "email": "demo@example.com"
  }
}
```

### 2. Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "demo",
    "password": "demo123"
  }'
```

**Save the token from the response for subsequent requests!**

### 3. Get User Profile

```bash
curl -X GET http://localhost:5000/api/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Topics

### Create a Topic

```bash
curl -X POST http://localhost:5000/api/topics \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Introduction to React",
    "description": "Learn the basics of React library"
  }'
```

### Get All Topics

```bash
curl -X GET http://localhost:5000/api/topics \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Get Single Topic (with lessons and quizzes)

```bash
curl -X GET http://localhost:5000/api/topics/1 \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Update Topic

```bash
curl -X PUT http://localhost:5000/api/topics/1 \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "React Advanced",
    "description": "Advanced React concepts"
  }'
```

### Delete Topic

```bash
curl -X DELETE http://localhost:5000/api/topics/1 \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Lessons

### Create a Lesson

```bash
curl -X POST http://localhost:5000/api/lessons/topic/1/lessons \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "What is React?",
    "content": "React is a JavaScript library for building user interfaces.",
    "order_index": 1
  }'
```

### Get Lessons for a Topic

```bash
curl -X GET http://localhost:5000/api/lessons/topic/1/lessons \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Get Single Lesson

```bash
curl -X GET http://localhost:5000/api/lessons/1 \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Update Lesson

```bash
curl -X PUT http://localhost:5000/api/lessons/1 \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Introduction to React",
    "content": "Updated content about React..."
  }'
```

### Complete a Lesson

```bash
curl -X POST http://localhost:5000/api/lessons/1/complete \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Mark Lesson as Incomplete

```bash
curl -X POST http://localhost:5000/api/lessons/1/uncomplete \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Delete Lesson

```bash
curl -X DELETE http://localhost:5000/api/lessons/1 \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Quizzes

### Create a Quiz

```bash
curl -X POST http://localhost:5000/api/quiz/topic/1/quiz \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "React Fundamentals Quiz",
    "description": "Test your knowledge of React basics",
    "order_index": 1
  }'
```

### Add Question to Quiz

```bash
curl -X POST http://localhost:5000/api/quiz/1/question \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What is React?",
    "options": ["A library", "A framework", "A language", "A database"],
    "correct_answer": 0,
    "order_index": 1
  }'
```

### Get Quiz (with all questions)

```bash
curl -X GET http://localhost:5000/api/quiz/1 \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Submit Quiz Answers

```bash
curl -X POST http://localhost:5000/api/quiz/1/submit \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "answers": [
      {
        "questionId": 1,
        "selectedAnswer": 0
      },
      {
        "questionId": 2,
        "selectedAnswer": 2
      }
    ]
  }'
```

Response includes score and detailed results:
```json
{
  "message": "Quiz submitted successfully",
  "attempt": {
    "id": 1,
    "user_id": 1,
    "quiz_id": 1,
    "score": 1,
    "total_questions": 2,
    "completed_at": "2025-10-23T...",
    "answers": [
      {
        "questionId": 1,
        "selectedAnswer": 0,
        "isCorrect": true
      },
      {
        "questionId": 2,
        "selectedAnswer": 2,
        "isCorrect": false
      }
    ]
  }
}
```

### Get Quiz Attempts History

```bash
curl -X GET http://localhost:5000/api/quiz/1/attempts \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Delete Quiz

```bash
curl -X DELETE http://localhost:5000/api/quiz/1 \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Chat Messages

### Get Chat Messages for a Lesson

```bash
curl -X GET "http://localhost:5000/api/chat/lesson/1/messages?limit=50&offset=0" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Create Chat Message (User)

```bash
curl -X POST http://localhost:5000/api/chat/lesson/1/messages \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is JSX?",
    "is_user": true
  }'
```

### Create Chat Message (AI Response)

```bash
curl -X POST http://localhost:5000/api/chat/lesson/1/messages \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "JSX is a syntax extension for JavaScript...",
    "is_user": false
  }'
```

### Generate AI Response (Mock)

```bash
curl -X POST http://localhost:5000/api/chat/ai-response \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Explain React hooks"
  }'
```

### Delete All Chat Messages for a Lesson

```bash
curl -X DELETE http://localhost:5000/api/chat/lesson/1/messages \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Health Check

```bash
curl -X GET http://localhost:5000/health
```

Response:
```json
{
  "status": "ok",
  "message": "Server is running"
}
```

## Complete Workflow Example

Here's a complete workflow from registration to taking a quiz:

```bash
# 1. Register
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"test123"}' \
  | jq -r '.token')

# 2. Create a topic
TOPIC_ID=$(curl -s -X POST http://localhost:5000/api/topics \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"JavaScript Basics","description":"Learn JS"}' \
  | jq -r '.topic.id')

# 3. Create a lesson
LESSON_ID=$(curl -s -X POST http://localhost:5000/api/lessons/topic/$TOPIC_ID/lessons \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Variables","content":"Learn about var, let, const"}' \
  | jq -r '.lesson.id')

# 4. Complete the lesson
curl -X POST http://localhost:5000/api/lessons/$LESSON_ID/complete \
  -H "Authorization: Bearer $TOKEN"

# 5. Create a quiz
QUIZ_ID=$(curl -s -X POST http://localhost:5000/api/quiz/topic/$TOPIC_ID/quiz \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"JS Quiz","description":"Test yourself"}' \
  | jq -r '.quiz.id')

# 6. Add a question
QUESTION_ID=$(curl -s -X POST http://localhost:5000/api/quiz/$QUIZ_ID/question \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"question":"Which declares a constant?","options":["var","let","const","static"],"correct_answer":2}' \
  | jq -r '.question.id')

# 7. Submit quiz
curl -X POST http://localhost:5000/api/quiz/$QUIZ_ID/submit \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"answers\":[{\"questionId\":$QUESTION_ID,\"selectedAnswer\":2}]}"
```

## Using with Postman

1. Import these requests into Postman
2. Create an environment with:
   - `baseUrl`: `http://localhost:5000`
   - `token`: (will be set after login)
3. Set up a test in the login request to save the token:
   ```javascript
   pm.environment.set("token", pm.response.json().token);
   ```
4. Use `{{baseUrl}}` and `{{token}}` in your requests

## Notes

- Replace `YOUR_TOKEN_HERE` with the actual JWT token received from login/register
- Replace numeric IDs (1, 2, etc.) with actual IDs from your database
- The token expires after 7 days by default (configurable in .env)
- All protected endpoints require the Authorization header
