# Adaptive Learning Agents Integration

## Overview

This document describes the integration of the adaptive learning agent system into the hackathon backend. The system uses LangChain and OpenAI to provide intelligent, personalized learning experiences.

## Architecture

### Core Components

1. **BaseAgent** - Abstract base class for all agents
2. **AgentCommunication** - Message routing system between agents
3. **AdaptiveLearningOrchestrator** - Coordinates all agents

### Individual Agents

1. **SystemPromptGenerator** - Creates and updates system prompts for other agents
2. **LessonGenerator** - Generates educational content using AI
3. **LessonEvaluator** - Evaluates lesson quality using rubrics
4. **ChangeDetector** - Monitors and analyzes user learning patterns

## Setup

### Prerequisites

- Node.js 18+
- OpenAI API key

### Installation

The required dependencies have been installed:
- `@langchain/openai` - OpenAI integration
- `@langchain/core` - LangChain core functionality
- `langchain` - Main LangChain library
- `uuid` - Unique ID generation

### Configuration

Add your OpenAI API key to `.env`:

```env
OPENAI_API_KEY=your_api_key_here
```

## API Endpoints

### Agent Routes (`/api/agents`)

#### Start Adaptive Learning
```
POST /api/agents/start-learning
Body: { "topic": "Topic name" }
```
Initializes the adaptive learning system for a specific topic.

#### Generate Lesson
```
POST /api/agents/generate-lesson
Body: { "topic": "Lesson topic", "difficulty": "intermediate" }
```
Generates a new AI-powered lesson.

#### Analyze Progress
```
GET /api/agents/analyze-progress
```
Analyzes the current user's learning progress and patterns.

#### Get Statistics
```
GET /api/agents/statistics
```
Returns system statistics including total lessons, scores, etc.

#### Evaluate System
```
POST /api/agents/evaluate-system
Body: { "topic": "Topic", "curriculum": ["Lesson1", "Lesson2"] }
```
Evaluates the system with a complete curriculum.

#### Get Agent Status
```
GET /api/agents/status
```
Returns the status of all registered agents.

### Enhanced Lesson Routes

#### Generate AI Lesson
```
POST /api/lessons/topic/:topicId/lessons/generate-ai
Body: { 
  "title": "Lesson title", 
  "difficulty": "intermediate",
  "saveToDatabase": true 
}
```
Generates an AI-powered lesson and optionally saves it to the database.

#### Evaluate Lesson
```
POST /api/lessons/:lessonId/evaluate
```
Evaluates an existing lesson using AI rubrics.

### Enhanced Chat Routes

The chat endpoint now uses the adaptive learning agents for intelligent responses:
```
POST /api/chat/ai
Body: { "message": "User question", "lessonId": "optional_lesson_id" }
```

## How It Works

### Adaptive Learning Flow

1. **Initialization**
   - System generates initial prompts tailored to the topic
   - Creates baseline lessons for the user

2. **Lesson Generation**
   - LessonGenerator creates content based on user level and learning style
   - Content is structured with examples, exercises, and key points

3. **Evaluation**
   - LessonEvaluator assesses content quality using multiple criteria
   - Provides detailed feedback and scoring

4. **Adaptation**
   - ChangeDetector monitors user interactions and progress
   - System adjusts difficulty and content based on learning patterns

### Agent Communication

Agents communicate through a message-passing system:

```javascript
const response = await orchestrator.communication.sendMessage(
  'SenderAgent',
  'RecipientAgent',
  {
    action: 'generate_lesson',
    data: { topic, difficulty }
  }
);
```

## Usage Examples

### Generate a Lesson via API

```bash
curl -X POST http://localhost:5000/api/agents/generate-lesson \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "Introduction to JavaScript",
    "difficulty": "beginner"
  }'
```

### Start Adaptive Learning

```bash
curl -X POST http://localhost:5000/api/agents/start-learning \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "Web Development"
  }'
```

### Generate AI Lesson and Save to Database

```bash
curl -X POST http://localhost:5000/api/lessons/topic/1/lessons/generate-ai \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Arrays in JavaScript",
    "difficulty": "intermediate",
    "saveToDatabase": true
  }'
```

## Configuration Options

### Agent Settings (src/agents/config/index.js)

Each agent can be configured with:
- `model` - OpenAI model to use (default: gpt-4o-mini)
- `temperature` - Response randomness (0-1)
- `maxTokens` - Maximum response length
- `systemPrompt` - Base instructions for the agent

### System Settings

- `minScoreThreshold` - Minimum score for lesson approval (default: 70)
- `maxRetries` - Maximum retry attempts (default: 3)
- `timeout` - Request timeout in milliseconds (default: 30000)

## Best Practices

1. **API Key Security**
   - Never commit your OpenAI API key to version control
   - Use environment variables for sensitive data

2. **Error Handling**
   - All agent operations return standardized responses with success/error indicators
   - Fallback responses are provided when agents fail

3. **Performance**
   - Agents cache system prompts and evaluations
   - Consider implementing rate limiting for API endpoints

4. **Cost Management**
   - Monitor OpenAI API usage
   - Adjust `maxTokens` to control response length
   - Use appropriate models (gpt-4o-mini is cost-effective)

## Troubleshooting

### "OPENAI_API_KEY is required" Error
- Add your OpenAI API key to the `.env` file
- Restart the server after updating environment variables

### Agent Not Responding
- Check agent status: `GET /api/agents/status`
- Verify OpenAI API key is valid
- Check server logs for detailed error messages

### Low Quality Responses
- Adjust agent temperature settings
- Modify system prompts in agent configurations
- Increase `maxTokens` for longer responses

## Future Enhancements

- **User Profile Persistence** - Store learning patterns in database
- **Multi-language Support** - Lessons in different languages
- **Advanced Analytics** - Detailed progress tracking and visualization
- **Custom Agent Types** - Quiz generators, study plan creators
- **Real-time Collaboration** - Shared learning sessions

## License

This implementation follows the same license as the main project.
