# Learning Platform Backend

A complete REST API backend for a learning platform built with Express.js and PostgreSQL.

## Features

- **User Authentication**: JWT-based authentication with bcrypt password hashing
- **Topics Management**: CRUD operations for learning topics
- **Lessons**: Create and manage lessons with progress tracking
- **Quizzes**: Interactive quizzes with multiple-choice questions
- **Chat System**: Store and retrieve chat messages for lesson interactions
- **Progress Tracking**: Track user progress through lessons and quizzes

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcryptjs
- **CORS**: Enabled for frontend integration

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## Installation

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Edit `.env` file with your configuration:
```env
PORT=5000
NODE_ENV=development

# PostgreSQL connection URL format:
# postgresql://username:password@host:port/database
DATABASE_URL=postgresql://postgres:your_password_here@localhost:5432/learning_platform

JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRES_IN=7d

FRONTEND_URL=http://localhost:5173
```

5. Create the PostgreSQL database:
```bash
createdb learning_platform
```

6. Initialize the database schema:
```bash
npm run init-db
```

## Running the Server

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on `http://localhost:5000` (or your configured PORT).

## API Endpoints

### Authentication

#### Register User
```
POST /api/auth/register
Content-Type: application/json

{
  "username": "john",
  "email": "john@example.com",
  "password": "password123"
}
```

#### Login
```
POST /api/auth/login
Content-Type: application/json

{
  "username": "john",
  "password": "password123"
}
```

#### Get Profile
```
GET /api/auth/profile
Authorization: Bearer {token}
```

### Topics

#### Get All Topics
```
GET /api/topics
Authorization: Bearer {token}
```

#### Get Single Topic
```
GET /api/topics/:id
Authorization: Bearer {token}
```

#### Create Topic
```
POST /api/topics
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "React Basics",
  "description": "Learn React fundamentals"
}
```

#### Update Topic
```
PUT /api/topics/:id
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Updated Topic Name",
  "description": "Updated description"
}
```

#### Delete Topic
```
DELETE /api/topics/:id
Authorization: Bearer {token}
```

### Lessons

#### Get Lessons for Topic
```
GET /api/lessons/topic/:topicId/lessons
Authorization: Bearer {token}
```

#### Get Single Lesson
```
GET /api/lessons/:lessonId
Authorization: Bearer {token}
```

#### Create Lesson
```
POST /api/lessons/topic/:topicId/lessons
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "Introduction to Components",
  "content": "Components are the building blocks...",
  "order_index": 1
}
```

#### Update Lesson
```
PUT /api/lessons/:lessonId
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "Updated Title",
  "content": "Updated content"
}
```

#### Complete Lesson
```
POST /api/lessons/:lessonId/complete
Authorization: Bearer {token}
```

#### Uncomplete Lesson
```
POST /api/lessons/:lessonId/uncomplete
Authorization: Bearer {token}
```

#### Delete Lesson
```
DELETE /api/lessons/:lessonId
Authorization: Bearer {token}
```

### Quizzes

#### Get Quiz
```
GET /api/quiz/:quizId
Authorization: Bearer {token}
```

#### Create Quiz
```
POST /api/quiz/topic/:topicId/quiz
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "React Quiz",
  "description": "Test your React knowledge",
  "order_index": 1
}
```

#### Add Question to Quiz
```
POST /api/quiz/:quizId/question
Authorization: Bearer {token}
Content-Type: application/json

{
  "question": "What is React?",
  "options": ["A library", "A framework", "A language", "A database"],
  "correct_answer": 0,
  "order_index": 1
}
```

#### Submit Quiz
```
POST /api/quiz/:quizId/submit
Authorization: Bearer {token}
Content-Type: application/json

{
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
}
```

#### Get Quiz Attempts
```
GET /api/quiz/:quizId/attempts
Authorization: Bearer {token}
```

#### Delete Quiz
```
DELETE /api/quiz/:quizId
Authorization: Bearer {token}
```

### Chat

#### Get Chat Messages
```
GET /api/chat/lesson/:lessonId/messages?limit=50&offset=0
Authorization: Bearer {token}
```

#### Create Chat Message
```
POST /api/chat/lesson/:lessonId/messages
Authorization: Bearer {token}
Content-Type: application/json

{
  "message": "What is JSX?",
  "is_user": true
}
```

#### Delete Chat Messages
```
DELETE /api/chat/lesson/:lessonId/messages
Authorization: Bearer {token}
```

#### Generate AI Response
```
POST /api/chat/ai-response
Authorization: Bearer {token}
Content-Type: application/json

{
  "message": "Explain React hooks"
}
```

## Database Schema

The database includes the following tables:

- **users**: User accounts and authentication
- **topics**: Learning topics created by users
- **lessons**: Individual lessons within topics
- **lesson_progress**: Track user progress through lessons
- **quizzes**: Quizzes for testing knowledge
- **quiz_questions**: Questions within quizzes
- **quiz_attempts**: User quiz attempts and scores
- **quiz_answers**: Individual answers in quiz attempts
- **chat_messages**: Chat messages for lesson interactions

See `schema.sql` for the complete database schema.

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── database.js       # Database connection
│   │   └── initDb.js         # Database initialization script
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── topicController.js
│   │   ├── lessonController.js
│   │   ├── quizController.js
│   │   └── chatController.js
│   ├── middleware/
│   │   ├── auth.js           # JWT authentication
│   │   └── errorHandler.js   # Error handling
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── topicRoutes.js
│   │   ├── lessonRoutes.js
│   │   ├── quizRoutes.js
│   │   └── chatRoutes.js
│   └── server.js             # Main server file
├── schema.sql                # Database schema
├── package.json
└── .env.example              # Environment variables template
```

## Security Features

- **Password Hashing**: Passwords are hashed using bcrypt
- **JWT Authentication**: Secure token-based authentication
- **CORS Protection**: Configured CORS for frontend access
- **SQL Injection Prevention**: Parameterized queries with pg
- **Environment Variables**: Sensitive data stored in .env

## Development

### Database Reset

To reset the database and reload the schema:
```bash
npm run init-db
```

### Testing API

You can test the API using:
- Postman
- cURL
- Thunder Client (VS Code extension)
- Your frontend application

## Error Handling

The API returns appropriate HTTP status codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `409`: Conflict
- `500`: Internal Server Error

Error responses follow this format:
```json
{
  "error": "Error message here"
}
```

## Future Enhancements

- [ ] Implement real AI integration (OpenAI, etc.)
- [ ] Add file upload for lesson content
- [ ] Implement role-based access control
- [ ] Add email verification
- [ ] Implement password reset functionality
- [ ] Add rate limiting
- [ ] Implement caching with Redis
- [ ] Add comprehensive logging
- [ ] Create API documentation with Swagger

## License

ISC

## Support

For issues and questions, please open an issue on the GitHub repository.
