import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
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
import { toast } from 'sonner';

interface BarberReviewReplyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reviewId: string;
  customerName: string;
  rating: number;
  comment: string | null;
  existingReply?: string | null;
  onReplySubmitted: () => void;
}

export function BarberReviewReplyDialog({
  open,
  onOpenChange,
  reviewId,
  customerName,
  rating,
  comment,
  existingReply,
  onReplySubmitted,
}: BarberReviewReplyDialogProps) {
  const [reply, setReply] = useState(existingReply || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reply.trim()) {
      toast.error('Please enter a reply');
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase
      .from('reviews')
      .update({
        barber_reply: reply.trim(),
        barber_replied_at: new Date().toISOString(),
      })
      .eq('id', reviewId);

    if (error) {
      console.error('Reply error:', error);
      toast.error('Failed to submit reply');
    } else {
      toast.success('Reply submitted successfully');
      onOpenChange(false);
      onReplySubmitted();
    }

    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Reply to Review
          </DialogTitle>
          <DialogDescription>
            Respond to {customerName}'s {rating}-star review
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Original Review */}
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className={i < rating ? 'text-amber-500' : 'text-muted-foreground'}>
                    ★
                  </span>
                ))}
              </div>
              <span className="text-sm text-muted-foreground">by {customerName}</span>
            </div>
            {comment && <p className="text-sm">{comment}</p>}
            {!comment && <p className="text-sm text-muted-foreground italic">No comment provided</p>}
          </div>

          {/* Reply Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Your Reply</label>
            <Textarea
              placeholder="Thank you for your feedback..."
              value={reply}
              onChange={(e) => setReply(e.target.value.slice(0, 1000))}
              maxLength={1000}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">{reply.length}/1000</p>
            <p className="text-xs text-muted-foreground">
              Your reply will be visible to everyone viewing your profile.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !reply.trim()}
            className="flex-1"
          >
            {isSubmitting ? 'Submitting...' : existingReply ? 'Update Reply' : 'Submit Reply'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
