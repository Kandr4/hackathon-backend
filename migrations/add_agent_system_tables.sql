-- User Preferences and Personality Table
CREATE TABLE IF NOT EXISTS user_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Learning Style Preferences
  learning_style VARCHAR(50) DEFAULT 'mixed', -- visual, auditory, kinesthetic, reading_writing, mixed
  preferred_difficulty VARCHAR(20) DEFAULT 'intermediate', -- beginner, intermediate, advanced
  pace VARCHAR(20) DEFAULT 'normal', -- slow, normal, fast
  
  -- Communication Preferences
  explanation_style VARCHAR(50) DEFAULT 'balanced', -- concise, detailed, balanced
  wants_examples BOOLEAN DEFAULT true,
  wants_analogies BOOLEAN DEFAULT true,
  wants_exercises BOOLEAN DEFAULT true,
  
  -- Personality Traits
  curiosity_level INTEGER DEFAULT 5 CHECK (curiosity_level >= 1 AND curiosity_level <= 10),
  patience_level INTEGER DEFAULT 5 CHECK (patience_level >= 1 AND patience_level <= 10),
  detail_orientation INTEGER DEFAULT 5 CHECK (detail_orientation >= 1 AND detail_orientation <= 10),
  
  -- Interaction History
  stuck_count INTEGER DEFAULT 0, -- How many times user got stuck
  preference_changes_count INTEGER DEFAULT 0, -- How many times preferences were adjusted
  total_interactions INTEGER DEFAULT 0,
  
  -- Custom Preferences (JSON for flexibility)
  custom_preferences JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(user_id)
);

-- Chat Messages Enhancement (add scoring and model info)
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS model_score INTEGER;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS passed_evaluation BOOLEAN DEFAULT true;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS evaluation_feedback TEXT;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS system_prompt_version INTEGER DEFAULT 1;

-- Learning Path Table (stores generated lesson paths)
CREATE TABLE IF NOT EXISTS learning_paths (
  id SERIAL PRIMARY KEY,
  topic_id INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Path Details
  total_lessons INTEGER NOT NULL,
  estimated_duration_hours DECIMAL(5,2),
  difficulty_level VARCHAR(20),
  
  -- Path Structure (JSON array of lesson outlines)
  lesson_outline JSONB NOT NULL, -- [{order: 1, title: "...", quiz: true}, ...]
  
  -- Status
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed BOOLEAN DEFAULT false,
  
  UNIQUE(topic_id, user_id)
);

-- Lesson Evaluations (from Model 6 - Synthetic Evaluator)
CREATE TABLE IF NOT EXISTS lesson_evaluations (
  id SERIAL PRIMARY KEY,
  lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  topic_id INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  
  -- Evaluation Scores
  overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  content_quality INTEGER CHECK (content_quality >= 0 AND content_quality <= 100),
  engagement_score INTEGER CHECK (engagement_score >= 0 AND engagement_score <= 100),
  learning_effectiveness INTEGER CHECK (learning_effectiveness >= 0 AND learning_effectiveness <= 100),
  
  -- Evaluation Details
  evaluation_notes TEXT,
  simulated_student_responses JSONB, -- Track synthetic student interactions
  
  -- Model Information
  evaluator_model VARCHAR(100),
  evaluated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- System Prompt History (track Model 2 prompt evolution)
CREATE TABLE IF NOT EXISTS system_prompt_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id INTEGER REFERENCES lessons(id) ON DELETE CASCADE,
  
  -- Prompt Details
  prompt_version INTEGER NOT NULL,
  system_prompt TEXT NOT NULL,
  
  -- Trigger Information
  triggered_by VARCHAR(50), -- 'preference_change', 'stuck_detection', 'initial', 'feedback'
  trigger_details JSONB,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_paths_topic_id ON learning_paths(topic_id);
CREATE INDEX IF NOT EXISTS idx_learning_paths_user_id ON learning_paths(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_evaluations_lesson_id ON lesson_evaluations(lesson_id);
CREATE INDEX IF NOT EXISTS idx_system_prompt_history_user_id ON system_prompt_history(user_id);
CREATE INDEX IF NOT EXISTS idx_system_prompt_history_lesson_id ON system_prompt_history(lesson_id);

-- Update trigger for user_preferences updated_at
CREATE OR REPLACE FUNCTION update_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_preferences_updated_at
BEFORE UPDATE ON user_preferences
FOR EACH ROW
EXECUTE FUNCTION update_user_preferences_updated_at();
