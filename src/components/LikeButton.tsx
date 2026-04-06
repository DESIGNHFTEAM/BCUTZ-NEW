import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface LikeButtonProps {
  barberId: string;
  className?: string;
  showCount?: boolean;
  variant?: 'icon' | 'button';
}

export function LikeButton({ barberId, className, showCount = false, variant = 'icon' }: LikeButtonProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchLikeStatus();
  }, [barberId, user]);

  const fetchLikeStatus = async () => {
    // Get total saves count
    const { count } = await supabase
      .from('saved_barbers')
      .select('*', { count: 'exact', head: true })
      .eq('barber_id', barberId);
    
    setLikeCount(count || 0);

    // Check if current user has saved
    if (user) {
      const { data } = await supabase
        .from('saved_barbers')
        .select('id')
        .eq('barber_id', barberId)
        .eq('user_id', user.id)
        .maybeSingle();
      
      setIsLiked(!!data);
    }
  };

  const handleToggleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to save barbers.',
      });
      navigate('/auth');
      return;
    }

    setIsLoading(true);

    if (isLiked) {
      // Unlike
      const { error } = await supabase
        .from('saved_barbers')
        .delete()
        .eq('barber_id', barberId)
        .eq('user_id', user.id);

      if (!error) {
        setIsLiked(false);
        setLikeCount((prev) => prev - 1);
        toast({
          title: 'Removed from favorites',
          description: 'Barber removed from your saved list.',
        });
      }
    } else {
      // Like
      const { error } = await supabase
        .from('saved_barbers')
        .insert({
          barber_id: barberId,
          user_id: user.id,
        });

      if (!error) {
        setIsLiked(true);
        setLikeCount((prev) => prev + 1);
        toast({
          title: 'Saved!',
          description: 'Barber added to your favorites.',
        });
      }
    }

    setIsLoading(false);
  };

  if (variant === 'button') {
    return (
      <button
        onClick={handleToggleLike}
        disabled={isLoading}
        className={cn(
          'flex items-center gap-2 px-4 py-2 border-2 transition-all',
          isLiked
            ? 'border-accent bg-accent/10 text-accent'
            : 'border-border hover:border-foreground',
          className
        )}
      >
        <Heart
          className={cn('w-5 h-5 transition-all', isLiked && 'fill-accent')}
        />
        <span className="text-sm tracking-wider">
          {isLiked ? 'SAVED' : 'SAVE'}
          {showCount && likeCount > 0 && ` (${likeCount})`}
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={handleToggleLike}
      disabled={isLoading}
      className={cn(
        'group flex flex-col items-center gap-1 transition-transform hover:scale-110',
        className
      )}
    >
      <Heart
        className={cn(
          'w-7 h-7 transition-all',
          isLiked ? 'fill-accent text-accent' : 'text-foreground group-hover:text-accent'
        )}
      />
      {showCount && (
        <span className="text-xs font-medium">{likeCount}</span>
      )}
    </button>
  );
}
