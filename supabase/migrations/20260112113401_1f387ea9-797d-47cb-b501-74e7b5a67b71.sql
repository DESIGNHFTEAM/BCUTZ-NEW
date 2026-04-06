
-- Create storage bucket for barber videos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'videos', 
  'videos', 
  true, 
  52428800, -- 50MB limit for video files
  ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v']
);

-- Create RLS policies for videos bucket
CREATE POLICY "Anyone can view videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'videos');

CREATE POLICY "Barbers can upload their own videos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'videos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Barbers can update their own videos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'videos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Barbers can delete their own videos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'videos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Add videos column to barber_profiles
ALTER TABLE public.barber_profiles
ADD COLUMN videos text[] DEFAULT '{}'::text[];

-- Add comment for documentation
COMMENT ON COLUMN public.barber_profiles.videos IS 'Array of video URLs for barber showcase videos (max 1 min each)';
