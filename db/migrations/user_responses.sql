-- Create user_responses table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_responses (
  id SERIAL PRIMARY KEY,
  user_id TEXT,
  interview_prep_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  round_id TEXT NOT NULL,
  situation TEXT,
  action TEXT,
  result TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY (interview_prep_id) REFERENCES interview_preps(id) ON DELETE CASCADE
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_responses_interview_prep_id ON user_responses(interview_prep_id);
CREATE INDEX IF NOT EXISTS idx_user_responses_question_id ON user_responses(question_id);