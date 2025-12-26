-- Create reader_presence table for tracking active readers
CREATE TABLE reader_presence (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index for efficient cleanup queries
CREATE INDEX idx_reader_presence_heartbeat ON reader_presence(last_heartbeat);

-- Enable Row Level Security
ALTER TABLE reader_presence ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read presence (view who's online)
CREATE POLICY "Presence is publicly readable" ON reader_presence
  FOR SELECT USING (true);

-- Policy: Users can only update their own presence
CREATE POLICY "Users can update own presence" ON reader_presence
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can insert their own presence
CREATE POLICY "Users can insert own presence" ON reader_presence
  FOR INSERT WITH CHECK (auth.uid() = user_id);
