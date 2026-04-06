import { useState } from 'react';
import { Star } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

interface WriteReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  barberId: string;
  shopName: string;
  onReviewSubmitted?: () => void;
}

export function WriteReviewDialog({
  open,
  onOpenChange,
  bookingId,
  barberId,
  shopName,
  onReviewSubmitted,
}: WriteReviewDialogProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({
        title: t('toasts.review.ratingRequired'),
        description: t('toasts.review.ratingRequiredDesc'),
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: t('toasts.error'),
        description: t('toasts.auth.mustBeLoggedIn'),
        variant: 'destructive',
      });
      setIsSubmitting(false);
      return;
    }

    const { error } = await supabase.from('reviews').insert({
      booking_id: bookingId,
      barber_id: barberId,
      customer_id: user.id,
      rating,
      comment: comment.trim() || null,
    });

    if (error) {
      console.error('Review error:', error);
      toast({
        title: t('toasts.error'),
        description: error.code === '23505' 
          ? t('toasts.review.alreadyReviewed')
          : t('toasts.review.submitError'),
        variant: 'destructive',
      });
    } else {
      toast({
        title: t('toasts.review.submitted'),
        description: t('toasts.review.submittedDesc'),
      });
      onOpenChange(false);
      setRating(0);
      setComment('');
      onReviewSubmitted?.();
    }

    setIsSubmitting(false);
  };

  const getRatingLabel = (r: number) => {
    switch (r) {
      case 1: return t('dialogs.review.poor');
      case 2: return t('dialogs.review.fair');
      case 3: return t('dialogs.review.good');
      case 4: return t('dialogs.review.veryGood');
      case 5: return t('dialogs.review.excellent');
      default: return t('dialogs.review.selectRating');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl tracking-wider">
            {t('dialogs.review.title', { shopName: shopName.toUpperCase() })}
          </DialogTitle>
          <DialogDescription>
            {t('dialogs.review.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Star Rating */}
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm text-muted-foreground tracking-wider">{t('dialogs.review.tapToRate')}</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => setRating(star)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-8 h-8 transition-colors ${
                      star <= (hoveredRating || rating)
                        ? 'fill-accent text-accent'
                        : 'text-border'
                    }`}
                  />
                </button>
              ))}
            </div>
            <p className="text-sm font-medium">
              {getRatingLabel(rating)}
            </p>
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground tracking-wider">
              {t('dialogs.review.yourReview')}
            </label>
            <Textarea
              placeholder={t('dialogs.review.placeholder')}
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 1000))}
              maxLength={1000}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">{comment.length}/1000</p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            {t('dialogs.review.cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || rating === 0}
            className="flex-1 bg-foreground text-background hover:bg-accent"
          >
            {isSubmitting ? t('dialogs.review.submitting') : t('dialogs.review.submit')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}