-- Fix Supabase Storage RLS policies for complaint-attachments bucket

-- First, let's check if the bucket exists and create it if needed
-- Note: Bucket creation needs to be done in Supabase Dashboard, but we can set policies

-- Enable RLS on the bucket (if not already enabled)
-- This needs to be done in Supabase Dashboard: Storage > complaint-attachments > Settings > Enable RLS

-- Create policies for the complaint-attachments bucket
-- Policy 1: Allow authenticated users to upload files
CREATE POLICY "Allow authenticated users to upload files" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'complaint-attachments');

-- Policy 2: Allow authenticated users to view files
CREATE POLICY "Allow authenticated users to view files" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'complaint-attachments');

-- Policy 3: Allow authenticated users to update files
CREATE POLICY "Allow authenticated users to update files" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'complaint-attachments');

-- Policy 4: Allow authenticated users to delete files
CREATE POLICY "Allow authenticated users to delete files" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'complaint-attachments');

-- Alternative: More permissive policy for testing
-- DROP POLICY IF EXISTS "Allow all authenticated users full access" ON storage.objects;
-- CREATE POLICY "Allow all authenticated users full access" ON storage.objects
-- FOR ALL TO authenticated
-- USING (bucket_id = 'complaint-attachments')
-- WITH CHECK (bucket_id = 'complaint-attachments');
