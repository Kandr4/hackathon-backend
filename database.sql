-- ============================================
-- PostgreSQL Database Schema
-- Backend Hackathon - Learning Management System
-- Created: 2025-10-23
-- ============================================

-- Drop existing tables if they exist (in reverse order of dependencies)
DROP TABLE IF EXISTS progress_lessons CASCADE;
DROP TABLE IF EXISTS progress_quizzes CASCADE;
DROP TABLE IF EXISTS progress CASCADE;
DROP TABLE IF EXISTS quiz_questions CASCADE;
DROP TABLE IF EXISTS quizzes CASCADE;
DROP TABLE IF EXISTS lessons CASCADE;
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for users table
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);

-- ============================================
-- COURSES TABLE
-- ============================================
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    instructor_id UUID NOT NULL,
    is_published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_course_instructor FOREIGN KEY (instructor_id) 
        REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for courses table
CREATE INDEX idx_courses_instructor ON courses(instructor_id);
CREATE INDEX idx_courses_published ON courses(is_published);

-- ============================================
-- LESSONS TABLE
-- ============================================
CREATE TABLE lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    course_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_lesson_course FOREIGN KEY (course_id) 
        REFERENCES courses(id) ON DELETE CASCADE
);

-- Create indexes for lessons table
CREATE INDEX idx_lessons_course ON lessons(course_id);

-- ============================================
-- QUIZZES TABLE
-- ============================================
CREATE TABLE quizzes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_quiz_creator FOREIGN KEY (created_by) 
        REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for quizzes table
CREATE INDEX idx_quizzes_creator ON quizzes(created_by);

-- ============================================
-- QUIZ QUESTIONS TABLE
-- ============================================
CREATE TABLE quiz_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id UUID NOT NULL,
    question TEXT NOT NULL,
    options JSONB NOT NULL, -- Array of options stored as JSONB
    correct_answer TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_question_quiz FOREIGN KEY (quiz_id) 
        REFERENCES quizzes(id) ON DELETE CASCADE
);

-- Create indexes for quiz_questions table
CREATE INDEX idx_quiz_questions_quiz ON quiz_questions(quiz_id);

-- ============================================
-- PROGRESS TABLE
-- ============================================
CREATE TABLE progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    course_id UUID NOT NULL,
    progress_percentage DECIMAL(5,2) DEFAULT 0.00,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_progress_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_progress_course FOREIGN KEY (course_id) 
        REFERENCES courses(id) ON DELETE CASCADE,
    CONSTRAINT unique_user_course UNIQUE(user_id, course_id)
);

-- Create indexes for progress table
CREATE INDEX idx_progress_user ON progress(user_id);
CREATE INDEX idx_progress_course ON progress(course_id);

-- ============================================
-- PROGRESS LESSONS (Many-to-Many relationship)
-- ============================================
CREATE TABLE progress_lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    progress_id UUID NOT NULL,
    lesson_id UUID NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_progress_lessons_progress FOREIGN KEY (progress_id) 
        REFERENCES progress(id) ON DELETE CASCADE,
    CONSTRAINT fk_progress_lessons_lesson FOREIGN KEY (lesson_id) 
        REFERENCES lessons(id) ON DELETE CASCADE,
    CONSTRAINT unique_progress_lesson UNIQUE(progress_id, lesson_id)
);

-- Create indexes for progress_lessons table
CREATE INDEX idx_progress_lessons_progress ON progress_lessons(progress_id);
CREATE INDEX idx_progress_lessons_lesson ON progress_lessons(lesson_id);

-- ============================================
-- PROGRESS QUIZZES (Many-to-Many relationship)
-- ============================================
CREATE TABLE progress_quizzes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    progress_id UUID NOT NULL,
    quiz_id UUID NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    score DECIMAL(5,2),
    CONSTRAINT fk_progress_quizzes_progress FOREIGN KEY (progress_id) 
        REFERENCES progress(id) ON DELETE CASCADE,
    CONSTRAINT fk_progress_quizzes_quiz FOREIGN KEY (quiz_id) 
        REFERENCES quizzes(id) ON DELETE CASCADE,
    CONSTRAINT unique_progress_quiz UNIQUE(progress_id, quiz_id)
);

-- Create indexes for progress_quizzes table
CREATE INDEX idx_progress_quizzes_progress ON progress_quizzes(progress_id);
CREATE INDEX idx_progress_quizzes_quiz ON progress_quizzes(quiz_id);

-- ============================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to users table
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to courses table
CREATE TRIGGER update_courses_updated_at 
    BEFORE UPDATE ON courses 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to lessons table
CREATE TRIGGER update_lessons_updated_at 
    BEFORE UPDATE ON lessons 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SAMPLE DATA (Optional - Comment out if not needed)
-- ============================================

-- Insert sample users
-- INSERT INTO users (username, email, password) VALUES
-- ('john_doe', 'john@example.com', '$2b$10$hashedpassword1'),
-- ('jane_smith', 'jane@example.com', '$2b$10$hashedpassword2'),
-- ('instructor1', 'instructor@example.com', '$2b$10$hashedpassword3');

-- ============================================
-- USEFUL QUERIES
-- ============================================

-- Get all courses with instructor information
-- SELECT c.*, u.username as instructor_name, u.email as instructor_email
-- FROM courses c
-- JOIN users u ON c.instructor_id = u.id;

-- Get all lessons for a specific course
-- SELECT l.* FROM lessons l
-- WHERE l.course_id = 'course-uuid-here'
-- ORDER BY l.created_at;

-- Get user progress for all courses
-- SELECT u.username, c.title as course_title, p.progress_percentage, p.last_updated
-- FROM progress p
-- JOIN users u ON p.user_id = u.id
-- JOIN courses c ON p.course_id = c.id;

-- Get completed lessons for a user in a course
-- SELECT l.title, pl.completed_at
-- FROM progress_lessons pl
-- JOIN lessons l ON pl.lesson_id = l.id
-- JOIN progress p ON pl.progress_id = p.id
-- WHERE p.user_id = 'user-uuid-here' AND p.course_id = 'course-uuid-here';

-- ============================================
-- VIEWS FOR COMMON QUERIES
-- ============================================

-- View for course details with lesson count
CREATE OR REPLACE VIEW course_details AS
SELECT 
    c.id,
    c.title,
    c.description,
    c.is_published,
    c.created_at,
    c.updated_at,
    u.username as instructor_name,
    u.email as instructor_email,
    COUNT(l.id) as lesson_count
FROM courses c
JOIN users u ON c.instructor_id = u.id
LEFT JOIN lessons l ON c.id = l.course_id
GROUP BY c.id, u.username, u.email;

-- View for user progress summary
CREATE OR REPLACE VIEW user_progress_summary AS
SELECT 
    u.id as user_id,
    u.username,
    u.email,
    c.id as course_id,
    c.title as course_title,
    p.progress_percentage,
    p.last_updated,
    COUNT(DISTINCT pl.lesson_id) as lessons_completed,
    COUNT(DISTINCT pq.quiz_id) as quizzes_completed
FROM users u
JOIN progress p ON u.id = p.user_id
JOIN courses c ON p.course_id = c.id
LEFT JOIN progress_lessons pl ON p.id = pl.progress_id
LEFT JOIN progress_quizzes pq ON p.id = pq.progress_id
GROUP BY u.id, u.username, u.email, c.id, c.title, p.progress_percentage, p.last_updated;

-- ============================================
-- DATABASE SETUP COMPLETE
-- ============================================

-- Verify table creation
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;
