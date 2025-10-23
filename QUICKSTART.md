# Quick Start Guide

Get the Learning Platform backend up and running in 5 minutes!

## Prerequisites Check

Make sure you have these installed:
- Node.js v14+ (`node --version`)
- PostgreSQL v12+ (`psql --version`)
- npm or yarn

## Step 1: Install Dependencies

```powershell
cd backend
npm install
```

## Step 2: Configure Environment

Create a `.env` file:

```powershell
copy .env.example .env
```

Edit `.env` with your database credentials:
```env
PORT=5000
DATABASE_URL=postgresql://postgres:your_actual_password@localhost:5432/learning_platform
JWT_SECRET=change_this_to_a_random_secret_string
```

## Step 3: Create Database

Open PostgreSQL command line:

```powershell
# Using psql
psql -U postgres
```

In psql:
```sql
CREATE DATABASE learning_platform;
\q
```

Or using command line:
```powershell
createdb -U postgres learning_platform
```

## Step 4: Initialize Database Schema

```powershell
npm run init-db
```

You should see: `Database initialized successfully!`

## Step 5: Start the Server

Development mode (with auto-reload):
```powershell
npm run dev
```

Or production mode:
```powershell
npm start
```

You should see:
```
Connected to PostgreSQL database
Database connection successful
Server is running on port 5000
Environment: development
```

## Step 6: Test the API

Test the health endpoint:

```powershell
curl http://localhost:5000/health
```

Response should be:
```json
{"status":"ok","message":"Server is running"}
```

## Step 7: Create Your First User

```powershell
curl -X POST http://localhost:5000/api/auth/register `
  -H "Content-Type: application/json" `
  -d '{\"username\":\"admin\",\"email\":\"admin@example.com\",\"password\":\"admin123\"}'
```

Save the token from the response!

## Quick Test

Test getting topics (should return empty array for new user):

```powershell
curl -X GET http://localhost:5000/api/topics `
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Common Issues

### Database Connection Failed

**Problem**: `error: password authentication failed for user "postgres"`

**Solution**: Check your DB_PASSWORD in `.env` file

### Port Already in Use

**Problem**: `Error: listen EADDRINUSE: address already in use :::5000`

**Solution**: 
1. Change PORT in `.env` to another port (e.g., 5001)
2. Or kill the process using port 5000

### Database Does Not Exist

**Problem**: `database "learning_platform" does not exist`

**Solution**: Run the createdb command from Step 3

## Next Steps

1. Read the [README.md](README.md) for full documentation
2. Check [API_TESTING.md](API_TESTING.md) for API examples
3. Connect your frontend to the backend
4. Start building your learning platform!

## Directory Structure

```
backend/
├── src/
│   ├── config/          # Database configuration
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Authentication & error handling
│   ├── routes/          # API routes
│   └── server.js        # Main application
├── schema.sql           # Database schema
├── package.json         # Dependencies
└── .env                 # Configuration (create this)
```

## Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with hot reload
- `npm run init-db` - Initialize/reset database

## Default Port

The server runs on **http://localhost:5000** by default.

## API Base URL

All API endpoints are prefixed with `/api`:
- Authentication: `/api/auth/*`
- Topics: `/api/topics/*`
- Lessons: `/api/lessons/*`
- Quizzes: `/api/quiz/*`
- Chat: `/api/chat/*`

## Support

Need help? Check:
1. Console logs for error messages
2. Database connection settings in `.env`
3. PostgreSQL service is running
4. All dependencies are installed

---

**You're all set!** 🚀

The backend is ready to accept requests from your frontend.
