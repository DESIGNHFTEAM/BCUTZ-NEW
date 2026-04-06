import { useState } from 'react';
import { Flag, AlertTriangle, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface ReportButtonProps {
  reportedUserId?: string;
  reportedBarberId?: string;
  variant?: 'icon' | 'button';
  className?: string;
}

export function ReportButton({ 
  reportedUserId, 
  reportedBarberId, 
  variant = 'icon',
  className = ''
}: ReportButtonProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user } = useAuth();
  const { toast } = useToast();

  const reportCategories = [
    { value: 'scam', label: t('dialogs.categories.scam') },
    { value: 'inappropriate', label: t('dialogs.categories.inappropriate') },
    { value: 'fake', label: t('dialogs.categories.fake') },
    { value: 'spam', label: t('dialogs.categories.spam') },
    { value: 'other', label: t('dialogs.categories.other') },
  ];

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: t('toasts.auth.signInRequired'),
        description: t('toasts.auth.signInRequiredDesc'),
        variant: 'destructive',
      });
      return;
    }

    if (!category || !description.trim()) {
      toast({
        title: t('toasts.report.missingInfo'),
        description: t('toasts.report.missingInfoDesc'),
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.from('reports').insert({
      reporter_id: user.id,
      reported_user_id: reportedUserId || null,
      reported_barber_id: reportedBarberId || null,
      category,
      description: description.trim(),
    });

    if (error) {
      toast({
        title: t('toasts.error'),
        description: t('toasts.report.submitError'),
        variant: 'destructive',
      });
    } else {
      toast({
        title: t('toasts.report.submitted'),
        description: t('toasts.report.submittedDesc'),
      });
      setIsOpen(false);
      setCategory('');
      setDescription('');
    }

    setIsSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {variant === 'icon' ? (
          <Button
            variant="outline"
            size="icon"
            glow={false}
            className={cn("h-8 w-8 border-border bg-background text-foreground/80 hover:bg-secondary hover:text-destructive", className)}
          >
            <Flag className="w-4 h-4" />
          </Button>
        ) : (
          <Button 
            variant="outline" 
            className={cn("text-destructive border-destructive/30 hover:bg-destructive/10", className)}
          >
            <Flag className="w-4 h-4 mr-2" />
            {t('dialogs.report.reportIssue')}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            {t('dialogs.report.title')}
          </DialogTitle>
          <DialogDescription>
            {t('dialogs.report.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>{t('dialogs.report.category')}</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder={t('dialogs.report.selectCategory')} />
              </SelectTrigger>
              <SelectContent>
                {reportCategories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('dialogs.report.descriptionLabel')}</Label>
            <Textarea
              placeholder={t('dialogs.report.descriptionPlaceholder')}
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 2000))}
              maxLength={2000}
              rows={4}
            />
            <p className="text-xs text-muted-foreground text-right">{description.length}/2000</p>
            <p className="text-xs text-muted-foreground">
              {t('dialogs.report.descriptionHint')}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            {t('dialogs.report.cancel')}
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !category || !description.trim()}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isSubmitting ? (
              t('dialogs.report.submitting')
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                {t('dialogs.report.submitReport')}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}