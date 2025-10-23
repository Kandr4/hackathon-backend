# AI Learning Platform

## Overview
This project is a backend server for an AI learning platform built with Node.js and Express. The platform aims to provide a comprehensive learning experience through various features such as user authentication, course management, lesson tracking, quizzes, and AI-driven recommendations.

## Features
- User authentication (login, registration)
- Course management (create, update, retrieve courses)
- Lesson management (create, retrieve lessons)
- Progress tracking for users
- Quiz management (create, retrieve quizzes)
- AI functionalities (recommendations)
- Webhook handling for external services
- Health check endpoint

## Project Structure
```
ai-learning-backend
├── src
│   ├── app.js
│   ├── index.js
│   ├── config
│   │   ├── db.js
│   │   └── env.js
│   ├── routes
│   │   ├── index.js
│   │   ├── health.routes.js
│   │   ├── auth.routes.js
│   │   ├── users.routes.js
│   │   ├── courses.routes.js
│   │   ├── lessons.routes.js
│   │   ├── progress.routes.js
│   │   ├── quizzes.routes.js
│   │   ├── ai.routes.js
│   │   └── webhooks.routes.js
│   ├── controllers
│   │   ├── auth.controller.js
│   │   ├── users.controller.js
│   │   ├── courses.controller.js
│   │   ├── lessons.controller.js
│   │   ├── progress.controller.js
│   │   ├── quizzes.controller.js
│   │   ├── ai.controller.js
│   │   └── webhooks.controller.js
│   ├── services
│   │   ├── ai
│   │   │   ├── openai.service.js
│   │   │   └── recommendation.service.js
│   │   └── email.service.js
│   ├── middlewares
│   │   ├── auth.middleware.js
│   │   ├── error.middleware.js
│   │   ├── notFound.middleware.js
│   │   └── rateLimit.middleware.js
│   ├── models
│   │   ├── user.model.js
│   │   ├── course.model.js
│   │   ├── lesson.model.js
│   │   ├── progress.model.js
│   │   └── quiz.model.js
│   └── utils
│       ├── logger.js
│       ├── validators.js
│       └── httpResponses.js
├── tests
│   ├── routes
│   │   ├── health.test.js
│   │   ├── auth.test.js
│   │   └── ai.test.js
│   └── utils
│       └── validators.test.js
├── .env.example
├── .gitignore
├── package.json
├── jest.config.js
└── README.md
```

## Getting Started
1. Clone the repository:
   ```
   git clone <repository-url>
   ```
2. Navigate to the project directory:
   ```
   cd ai-learning-backend
   ```
3. Install dependencies:
   ```
   npm install
   ```
4. Set up environment variables by copying `.env.example` to `.env` and updating the values as needed.
5. Start the server:
   ```
   npm start
   ```

## Testing
To run tests, use the following command:
```
npm test
```

## License
This project is licensed under the MIT License.