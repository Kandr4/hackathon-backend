-- Add preference columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS learning_style VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS pace VARCHAR(20) DEFAULT 'medium';
ALTER TABLE users ADD COLUMN IF NOT EXISTS complexity VARCHAR(20) DEFAULT 'intermediate';
ALTER TABLE users ADD COLUMN IF NOT EXISTS format_preference VARCHAR(20) DEFAULT 'text';

-- Add updated_at timestamp if not exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_users_updated_at();
