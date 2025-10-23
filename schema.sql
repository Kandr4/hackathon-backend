-- Learning Platform Database Schema

-- Drop existing tables if they exist
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS quiz_attempts CASCADE;
DROP TABLE IF EXISTS quiz_answers CASCADE;
DROP TABLE IF EXISTS quiz_questions CASCADE;
DROP TABLE IF EXISTS quizzes CASCADE;
DROP TABLE IF EXISTS lesson_progress CASCADE;
DROP TABLE IF EXISTS lessons CASCADE;
DROP TABLE IF EXISTS topics CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    
    -- User Preferences (for Model 2 - Preference Management)
    learning_style VARCHAR(50),
    pace VARCHAR(20) DEFAULT 'medium',
    complexity VARCHAR(20) DEFAULT 'intermediate',
    format_preference VARCHAR(20) DEFAULT 'text',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create topics table
CREATE TABLE topics (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create lessons table
CREATE TABLE lessons (
    id SERIAL PRIMARY KEY,
    topic_id INTEGER REFERENCES topics(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create lesson_progress table to track user progress
CREATE TABLE lesson_progress (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    lesson_id INTEGER REFERENCES lessons(id) ON DELETE CASCADE,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, lesson_id)
);

-- Create quizzes table
CREATE TABLE quizzes (
    id SERIAL PRIMARY KEY,
    topic_id INTEGER REFERENCES topics(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create quiz_questions table
CREATE TABLE quiz_questions (
    id SERIAL PRIMARY KEY,
    quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    options JSONB NOT NULL, -- Array of options stored as JSON
    correct_answer INTEGER NOT NULL, -- Index of correct answer in options array
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create quiz_attempts table to track user quiz attempts
CREATE TABLE quiz_attempts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    total_questions INTEGER NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create quiz_answers table to store individual answers
CREATE TABLE quiz_answers (
    id SERIAL PRIMARY KEY,
    attempt_id INTEGER REFERENCES quiz_attempts(id) ON DELETE CASCADE,
    question_id INTEGER REFERENCES quiz_questions(id) ON DELETE CASCADE,
    selected_answer INTEGER NOT NULL,
    is_correct BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create chat_messages table for lesson conversations
CREATE TABLE chat_messages (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    lesson_id INTEGER REFERENCES lessons(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_user BOOLEAN NOT NULL DEFAULT TRUE, -- true if from user, false if from AI
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX idx_topics_user_id ON topics(user_id);
CREATE INDEX idx_lessons_topic_id ON lessons(topic_id);
CREATE INDEX idx_lesson_progress_user_id ON lesson_progress(user_id);
CREATE INDEX idx_lesson_progress_lesson_id ON lesson_progress(lesson_id);
CREATE INDEX idx_quizzes_topic_id ON quizzes(topic_id);
CREATE INDEX idx_quiz_questions_quiz_id ON quiz_questions(quiz_id);
CREATE INDEX idx_quiz_attempts_user_id ON quiz_attempts(user_id);
CREATE INDEX idx_quiz_attempts_quiz_id ON quiz_attempts(quiz_id);
CREATE INDEX idx_quiz_answers_attempt_id ON quiz_answers(attempt_id);
CREATE INDEX idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX idx_chat_messages_lesson_id ON chat_messages(lesson_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_topics_updated_at BEFORE UPDATE ON topics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lessons_updated_at BEFORE UPDATE ON lessons
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lesson_progress_updated_at BEFORE UPDATE ON lesson_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quizzes_updated_at BEFORE UPDATE ON quizzes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quiz_questions_updated_at BEFORE UPDATE ON quiz_questions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for testing
INSERT INTO users (username, email, password_hash) VALUES
('demo', 'demo@example.com', '$2a$10$YourHashedPasswordHere'); -- Password should be hashed with bcrypt

-- Get the demo user id
DO $$
DECLARE
    demo_user_id INTEGER;
    react_topic_id INTEGER;
    js_topic_id INTEGER;
    react_quiz_id INTEGER;
    js_quiz_id INTEGER;
BEGIN
    SELECT id INTO demo_user_id FROM users WHERE username = 'demo';
    
    -- Insert sample topics
    INSERT INTO topics (name, description, user_id) VALUES
    ('Introduction to React', 'Learn the basics of React library', demo_user_id)
    RETURNING id INTO react_topic_id;
    
    INSERT INTO topics (name, description, user_id) VALUES
    ('JavaScript Basics', 'Fundamental concepts of JavaScript', demo_user_id)
    RETURNING id INTO js_topic_id;
    
    -- Insert sample lessons for React topic
    INSERT INTO lessons (topic_id, title, content, order_index) VALUES
    (react_topic_id, 'What is React?', 'React is a JavaScript library for building user interfaces.', 1),
    (react_topic_id, 'JSX Basics', 'JSX is a syntax extension for JavaScript.', 2),
    (react_topic_id, 'Components', 'Components are the building blocks of React applications.', 3);
    
    -- Insert sample lessons for JavaScript topic
    INSERT INTO lessons (topic_id, title, content, order_index) VALUES
    (js_topic_id, 'Variables and Data Types', 'Learn about var, let, const and data types.', 1),
    (js_topic_id, 'Functions', 'Understanding functions in JavaScript.', 2);
    
    -- Insert sample quizzes
    INSERT INTO quizzes (topic_id, title, description, order_index) VALUES
    (react_topic_id, 'React Fundamentals Quiz', 'Test your knowledge of React basics', 1)
    RETURNING id INTO react_quiz_id;
    
    INSERT INTO quizzes (topic_id, title, description, order_index) VALUES
    (js_topic_id, 'JavaScript Quiz', 'Test your JavaScript knowledge', 1)
    RETURNING id INTO js_quiz_id;
    
    -- Insert quiz questions for React quiz
    INSERT INTO quiz_questions (quiz_id, question, options, correct_answer, order_index) VALUES
    (react_quiz_id, 'What is React?', 
     '["A library", "A framework", "A language", "A database"]'::jsonb, 0, 1),
    (react_quiz_id, 'What does JSX stand for?', 
     '["JavaScript XML", "Java Syntax Extension", "JavaScript Extension", "Java XML"]'::jsonb, 0, 2);
    
    -- Insert quiz questions for JavaScript quiz
    INSERT INTO quiz_questions (quiz_id, question, options, correct_answer, order_index) VALUES
    (js_quiz_id, 'Which keyword is used to declare a constant?', 
     '["var", "let", "const", "static"]'::jsonb, 2, 1);
END $$;
