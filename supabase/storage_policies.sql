-- Storage RLS Policies for 'screenshots' bucket

-- 1. Allow authenticated users to upload files to a folder named after their UID
-- screenshots/{user_id}/filename.png
CREATE POLICY "Allow authenticated uploads to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'screenshots' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 2. Allow users to view (SELECT) only files in their own folder
CREATE POLICY "Allow users to view own screenshots"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'screenshots' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. Allow users to delete their own screenshots
CREATE POLICY "Allow users to delete own screenshots"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'screenshots' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);
