-- Create feed_posts table for public community feed
CREATE TABLE IF NOT EXISTS feed_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  nickname TEXT,
  body TEXT NOT NULL CHECK (char_length(body) >= 1 AND char_length(body) <= 2000),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ,
  is_edited BOOLEAN DEFAULT false
);

-- Create index for efficient chronological queries
CREATE INDEX idx_feed_posts_created_at ON feed_posts(created_at DESC);

-- Create index for user's posts lookup
CREATE INDEX idx_feed_posts_user_id ON feed_posts(user_id);

-- Enable Row Level Security
ALTER TABLE feed_posts ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone authenticated can read all posts
CREATE POLICY "Anyone can read feed posts"
  ON feed_posts
  FOR SELECT
  USING (true);

-- Policy: Authenticated users can insert their own posts
CREATE POLICY "Authenticated users can create posts"
  ON feed_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own posts (within 5 minutes)
CREATE POLICY "Users can update own posts within 5 minutes"
  ON feed_posts
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id 
    AND created_at > now() - interval '5 minutes'
  )
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own posts (optional, for future use)
CREATE POLICY "Users can delete own posts"
  ON feed_posts
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
