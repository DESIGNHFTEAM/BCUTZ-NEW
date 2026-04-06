import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Play, Pause, Trash2, Film, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useVideoUpload } from '@/hooks/useVideoUpload';
import { cn } from '@/lib/utils';

interface VideoUploaderProps {
  userId: string;
  videos: string[];
  maxVideos?: number;
  onVideosChange: (videos: string[]) => void;
  className?: string;
}

export function VideoUploader({
  userId,
  videos,
  maxVideos = 5,
  onVideosChange,
  className,
}: VideoUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  
  const { uploadVideo, deleteVideo, isUploading, uploadProgress, isDeleting, maxDuration } = useVideoUpload({
    onUploadComplete: (url) => {
      onVideosChange([...videos, url]);
    },
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (videos.length >= maxVideos) {
      return;
    }

    await uploadVideo(file, userId);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (videoUrl: string) => {
    const success = await deleteVideo(videoUrl);
    if (success) {
      onVideosChange(videos.filter((v) => v !== videoUrl));
    }
  };

  const togglePlay = (videoUrl: string) => {
    setPlayingVideo(playingVideo === videoUrl ? null : videoUrl);
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Film className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Showcase Videos</h3>
          <span className="text-sm text-muted-foreground">
            ({videos.length}/{maxVideos})
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>Max 60s per video</span>
        </div>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
        <AlertCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
        <p className="text-xs text-muted-foreground">
          Upload short videos showcasing your work, shop atmosphere, or techniques. 
          Videos should be under 1 minute and in MP4, WebM, or MOV format.
        </p>
      </div>

      {/* Video Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {videos.map((videoUrl, index) => (
            <motion.div
              key={videoUrl}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              layout
              className="relative aspect-[9/16] bg-black rounded-lg overflow-hidden group"
            >
              <video
                src={videoUrl}
                className="w-full h-full object-cover"
                loop
                muted
                playsInline
                autoPlay={playingVideo === videoUrl}
                onClick={() => togglePlay(videoUrl)}
              />
              
              {/* Play/Pause Overlay */}
              <div 
                className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                onClick={() => togglePlay(videoUrl)}
              >
                {playingVideo === videoUrl ? (
                  <Pause className="w-12 h-12 text-white" />
                ) : (
                  <Play className="w-12 h-12 text-white" />
                )}
              </div>

              {/* Video Number Badge */}
              <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                #{index + 1}
              </div>

              {/* Delete Button */}
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(videoUrl);
                }}
                disabled={isDeleting}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Upload Button */}
        {videos.length < maxVideos && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative aspect-[9/16] border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-3 hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            {isUploading ? (
              <div className="flex flex-col items-center gap-3 p-4 w-full">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Upload className="w-6 h-6 text-primary animate-pulse" />
                </div>
                <div className="w-full px-4">
                  <Progress value={uploadProgress} className="h-2" />
                </div>
                <span className="text-sm text-muted-foreground">{uploadProgress}%</span>
              </div>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <Upload className="w-6 h-6 text-muted-foreground" />
                </div>
                <span className="text-sm text-muted-foreground text-center px-4">
                  Upload Video
                </span>
                <span className="text-xs text-muted-foreground">
                  MP4, WebM, MOV
                </span>
              </>
            )}
          </motion.div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime,video/x-m4v"
        className="hidden"
        onChange={handleFileSelect}
        disabled={isUploading || videos.length >= maxVideos}
      />
    </div>
  );
}
