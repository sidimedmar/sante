-- Create submissions table for PNES form data
CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wilaya TEXT NOT NULL,
  moughataa TEXT NOT NULL,
  name TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  education_level TEXT NOT NULL,
  last_certificate TEXT NOT NULL,
  field TEXT NOT NULL,
  years_of_service TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  q1 TEXT,
  q2 TEXT[],
  q3 TEXT[],
  q4 TEXT[],
  q5 TEXT[],
  q6 TEXT[],
  q7 TEXT[],
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- Policy to allow anyone to insert (anonymous submissions)
CREATE POLICY "Allow anonymous inserts" ON submissions
  FOR INSERT
  WITH CHECK (true);

-- Policy to allow anyone to read submissions (for admin panel)
CREATE POLICY "Allow all reads" ON submissions
  FOR SELECT
  USING (true);

-- Policy to allow updates
CREATE POLICY "Allow all updates" ON submissions
  FOR UPDATE
  USING (true);

-- Policy to allow deletes
CREATE POLICY "Allow all deletes" ON submissions
  FOR DELETE
  USING (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_submissions_submitted_at ON submissions(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_wilaya ON submissions(wilaya);
