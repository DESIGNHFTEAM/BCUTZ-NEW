import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const MAX_VIDEO_DURATION = 70; // Allow up to 70s (publicly advertised as 60s)
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB max
const ALLOWED_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v'];

interface UseVideoUploadOptions {
  bucket?: string;
  onUploadComplete?: (url: string) => void;
  onDelete?: (url: string) => void;
}

export function useVideoUpload(options: UseVideoUploadOptions = {}) {
  const { bucket = 'videos', onUploadComplete, onDelete } = options;
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  const validateVideo = (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      // Check file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error('Invalid file type. Please upload MP4, WebM, or MOV files.');
        resolve(false);
        return;
      }

      // Check file size
      if (file.size > MAX_VIDEO_SIZE) {
        toast.error('Video is too large. Maximum size is 50MB.');
        resolve(false);
        return;
      }

      // Check video duration
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        if (video.duration > MAX_VIDEO_DURATION) {
          toast.error(`Video is too long. Maximum duration is ${MAX_VIDEO_DURATION} seconds.`);
          resolve(false);
        } else {
          resolve(true);
        }
      };

      video.onerror = () => {
        toast.error('Could not read video file. Please try a different file.');
        resolve(false);
      };

      video.src = URL.createObjectURL(file);
    });
  };

  const uploadVideo = async (file: File, userId: string): Promise<string | null> => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const isValid = await validateVideo(file);
      if (!isValid) {
        setIsUploading(false);
        return null;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      // Simulate progress (Supabase doesn't provide upload progress)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      clearInterval(progressInterval);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error('Failed to upload video. Please try again.');
        setIsUploading(false);
        return null;
      }

      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
      
      setUploadProgress(100);
      toast.success('Video uploaded successfully!');
      
      onUploadComplete?.(urlData.publicUrl);
      
      setIsUploading(false);
      return urlData.publicUrl;
    } catch (error) {
      console.error('Video upload error:', error);
      toast.error('Failed to upload video. Please try again.');
      setIsUploading(false);
      return null;
    }
  };

  const deleteVideo = async (videoUrl: string): Promise<boolean> => {
    setIsDeleting(true);

    try {
      // Extract path from URL
      const url = new URL(videoUrl);
      const pathParts = url.pathname.split('/');
      const bucketIndex = pathParts.findIndex((p) => p === bucket);
      const filePath = pathParts.slice(bucketIndex + 1).join('/');

      const { error } = await supabase.storage.from(bucket).remove([filePath]);

      if (error) {
        console.error('Delete error:', error);
        toast.error('Failed to delete video.');
        setIsDeleting(false);
        return false;
      }

      toast.success('Video deleted.');
      onDelete?.(videoUrl);
      
      setIsDeleting(false);
      return true;
    } catch (error) {
      console.error('Video delete error:', error);
      toast.error('Failed to delete video.');
      setIsDeleting(false);
      return false;
    }
  };

  return {
    uploadVideo,
    deleteVideo,
    isUploading,
    uploadProgress,
    isDeleting,
    maxDuration: MAX_VIDEO_DURATION,
    maxSize: MAX_VIDEO_SIZE,
  };
}
