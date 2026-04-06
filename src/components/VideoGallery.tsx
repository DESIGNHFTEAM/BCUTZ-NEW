import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface VideoGalleryProps {
  videos: string[];
  shopName: string;
  className?: string;
}

export function VideoGallery({ videos, shopName, className }: VideoGalleryProps) {
  const [activeVideo, setActiveVideo] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const modalVideoRef = useRef<HTMLVideoElement>(null);

  // Handle video playback
  useEffect(() => {
    if (modalVideoRef.current) {
      if (isPlaying) {
        modalVideoRef.current.play();
      } else {
        modalVideoRef.current.pause();
      }
    }
  }, [isPlaying, activeVideo]);

  // Auto-play when modal opens
  useEffect(() => {
    if (activeVideo !== null) {
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
    }
  }, [activeVideo]);

  const handlePrevious = () => {
    if (activeVideo !== null && activeVideo > 0) {
      setActiveVideo(activeVideo - 1);
    }
  };

  const handleNext = () => {
    if (activeVideo !== null && activeVideo < videos.length - 1) {
      setActiveVideo(activeVideo + 1);
    }
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeVideo === null) return;
      
      switch (e.key) {
        case 'Escape':
          setActiveVideo(null);
          break;
        case 'ArrowLeft':
          handlePrevious();
          break;
        case 'ArrowRight':
          handleNext();
          break;
        case ' ':
          e.preventDefault();
          setIsPlaying(!isPlaying);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeVideo, isPlaying]);

  if (!videos || videos.length === 0) {
    return null;
  }

  return (
    <>
      {/* Video Thumbnails - Horizontal Scroll */}
      <div className={cn('relative', className)}>
        <h3 className="font-display text-lg font-semibold mb-4 tracking-wider">
          SHOWCASE VIDEOS
        </h3>
        
        <div className="flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide">
          {videos.map((videoUrl, index) => (
            <motion.div
              key={videoUrl}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="relative flex-shrink-0 w-32 aspect-[9/16] bg-black rounded-lg overflow-hidden cursor-pointer snap-start group"
              onClick={() => setActiveVideo(index)}
            >
              <video
                src={videoUrl}
                className="w-full h-full object-cover"
                muted
                playsInline
                preload="none"
                poster=""
              />
              
              {/* Play Overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/20 transition-colors">
                <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
                  <Play className="w-5 h-5 text-black ml-0.5" />
                </div>
              </div>

              {/* Video Number */}
              <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded">
                {index + 1}/{videos.length}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Fullscreen Video Modal */}
      <AnimatePresence>
        {activeVideo !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black flex items-center justify-center"
            onClick={() => setActiveVideo(null)}
          >
            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-10 text-white hover:bg-white/20"
              onClick={() => setActiveVideo(null)}
            >
              <X className="w-6 h-6" />
            </Button>

            {/* Shop Name */}
            <div className="absolute top-4 left-4 z-10">
              <p className="text-white font-display text-sm tracking-wider">{shopName.toUpperCase()}</p>
              <p className="text-white/60 text-xs">{activeVideo + 1} / {videos.length}</p>
            </div>

            {/* Navigation Arrows */}
            {activeVideo > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20 h-12 w-12"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrevious();
                }}
              >
                <ChevronLeft className="w-8 h-8" />
              </Button>
            )}

            {activeVideo < videos.length - 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20 h-12 w-12"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
              >
                <ChevronRight className="w-8 h-8" />
              </Button>
            )}

            {/* Video Container */}
            <div 
              className="relative max-w-md w-full h-full max-h-[90vh] flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <video
                ref={modalVideoRef}
                src={videos[activeVideo]}
                className="max-w-full max-h-full object-contain rounded-lg"
                loop
                playsInline
                muted={isMuted}
                autoPlay
                onClick={() => setIsPlaying(!isPlaying)}
              />

              {/* Video Controls */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/60 backdrop-blur-sm rounded-full px-4 py-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white hover:bg-white/20"
                  onClick={() => setIsPlaying(!isPlaying)}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white hover:bg-white/20"
                  onClick={() => setIsMuted(!isMuted)}
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </Button>
              </div>

              {/* Play/Pause Indicator */}
              <AnimatePresence>
                {!isPlaying && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  >
                    <div className="w-20 h-20 rounded-full bg-black/50 flex items-center justify-center">
                      <Play className="w-10 h-10 text-white ml-1" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Video Dots Indicator */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {videos.map((_, index) => (
                <button
                  key={index}
                  className={cn(
                    'w-2 h-2 rounded-full transition-colors',
                    index === activeVideo ? 'bg-white' : 'bg-white/40'
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveVideo(index);
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
