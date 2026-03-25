-- Create book_copies table for numbered limited-edition book reservation system
CREATE TABLE IF NOT EXISTS book_copies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  copy_number INTEGER NOT NULL UNIQUE CHECK (copy_number >= 1 AND copy_number <= 100),
  status TEXT NOT NULL CHECK (status IN ('available', 'reserved', 'sold')) DEFAULT 'available',
  reserved_until TIMESTAMPTZ,
  reserved_by_session TEXT,
  stripe_checkout_session_id TEXT,
  price_override INTEGER,
  order_email TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_book_copies_copy_number ON book_copies(copy_number);
CREATE INDEX IF NOT EXISTS idx_book_copies_status ON book_copies(status);
CREATE INDEX IF NOT EXISTS idx_book_copies_reserved_until ON book_copies(reserved_until);
CREATE INDEX IF NOT EXISTS idx_book_copies_reserved_by_session ON book_copies(reserved_by_session);

-- Enable Row Level Security
ALTER TABLE book_copies ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read book copies (public inventory)
CREATE POLICY "Anyone can read book copies"
  ON book_copies
  FOR SELECT
  USING (true);

-- Policy: Authenticated users can update book copies (for reservation/checkout)
-- Note: Service role bypasses RLS, so API routes can update
CREATE POLICY "Authenticated users can update book copies"
  ON book_copies
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can insert book copies (for seeding/admin)
CREATE POLICY "Authenticated users can insert book copies"
  ON book_copies
  FOR INSERT
  TO authenticated
  WITH CHECK (true);