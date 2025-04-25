-- Create interview_preps table
CREATE TABLE IF NOT EXISTS interview_preps (
  id TEXT PRIMARY KEY,
  job_title TEXT NOT NULL,
  company TEXT NOT NULL,
  job_url TEXT,
  resume_text TEXT,
  linkedin_url TEXT,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL, 
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  user_id TEXT
);

-- Create index on expires_at for efficient expiration checks
CREATE INDEX IF NOT EXISTS idx_interview_preps_expires_at ON interview_preps(expires_at);

-- Create index on user_id for efficient user lookup
CREATE INDEX IF NOT EXISTS idx_interview_preps_user_id ON interview_preps(user_id);