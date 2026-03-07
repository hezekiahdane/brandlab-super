-- Milestone 6: Create private storage bucket for workspace assets.
-- Run this in Supabase SQL Editor.

-- Create the bucket (private by default)
INSERT INTO storage.buckets (id, name, public)
VALUES ('assets', 'assets', false)
ON CONFLICT (id) DO NOTHING;

-- Policy: workspace members can upload files into their workspace folder
CREATE POLICY "assets_insert_member"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'assets'
    AND public.is_workspace_member((storage.foldername(name))[1]::uuid)
  );

-- Policy: workspace members can read files from their workspace folder
CREATE POLICY "assets_select_member"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'assets'
    AND public.is_workspace_member((storage.foldername(name))[1]::uuid)
  );

-- Policy: workspace members can delete files from their workspace folder
CREATE POLICY "assets_delete_member"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'assets'
    AND public.is_workspace_member((storage.foldername(name))[1]::uuid)
  );
