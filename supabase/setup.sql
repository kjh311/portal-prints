-- 1. Create the 'captures' table
CREATE TABLE captures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  video_url TEXT NOT NULL,
  image_path TEXT NOT NULL, -- Path in Supabase Storage
  qr_path TEXT,            -- Reserved for future QR logic
  created_at TIMESTAMPTZ DEFAULT NOW(),
  video_title TEXT        -- Added from our MVP requirements
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE captures ENABLE ROW LEVEL SECURITY;

-- 3. Create Policies
-- Users can insert their own captures
CREATE POLICY "Users can insert their own captures"
ON captures FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view only their own captures
CREATE POLICY "Users can view their own captures"
ON captures FOR SELECT
USING (auth.uid() = user_id);

-- Users can delete their own captures
CREATE POLICY "Users can delete their own captures"
ON captures FOR DELETE
USING (auth.uid() = user_id);
