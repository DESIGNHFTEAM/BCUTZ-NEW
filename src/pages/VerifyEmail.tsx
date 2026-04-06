import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Mail, Check, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/ui/logo';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import { useRateLimiting } from '@/hooks/useRateLimiting';

const emailSchema = z.string().email('Please enter a valid email');

export default function VerifyEmail() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState('');
  const [rateLimitError, setRateLimitError] = useState<string>('');

  const { toast } = useToast();
  const { 
    checkRateLimit, 
    recordFailedAttempt, 
    recordSuccess, 
    formatRemainingTime 
  } = useRateLimiting();

  const handleResendVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setRateLimitError('');

    // Check rate limiting
    const { isLimited, remainingSeconds } = checkRateLimit();
    if (isLimited) {
      setRateLimitError(`Too many attempts. Please wait ${formatRemainingTime(remainingSeconds)} before trying again.`);
      return;
    }

    const result = emailSchema.safeParse(email);
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        recordFailedAttempt();
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        recordSuccess();
        setEmailSent(true);
        toast({
          title: 'Email sent',
          description: 'Please check your inbox for the verification link.',
        });
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="max-w-md w-full text-center"
        >
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-primary" />
          </div>
          <h1 className="font-display text-3xl font-bold mb-4">Verification email sent</h1>
          <p className="text-muted-foreground mb-8">
            We sent a new verification link to <span className="font-medium text-foreground">{email}</span>
          </p>
          <p className="text-sm text-muted-foreground mb-8">
            Didn't receive the email? Check your spam folder or{' '}
            <button
              onClick={() => setEmailSent(false)}
              className="text-primary hover:underline"
            >
              try again
            </button>
          </p>
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to sign in
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full"
      >
        <Link
          to="/auth"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to sign in
        </Link>

        <Logo size="lg" className="mb-2" />
        <h1 className="font-display text-3xl font-bold mb-2">Resend verification email</h1>
        <p className="text-muted-foreground mb-8">
          Enter your email address and we'll send you a new verification link.
        </p>

        <form onSubmit={handleResendVerification} className="space-y-5">
          {/* Rate Limit Warning */}
          {rateLimitError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-3"
            >
              <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{rateLimitError}</p>
            </motion.div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-12"
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full h-12 bg-gradient-gold hover:opacity-90 text-lg font-semibold"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              'Resend Verification Email'
            )}
          </Button>
        </form>

        <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-border">
          <h3 className="font-medium mb-2">Having trouble?</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Check your spam or junk folder</li>
            <li>• Make sure you entered the correct email</li>
            <li>• Wait a few minutes before trying again</li>
          </ul>
        </div>
      </motion.div>
    </div>
  );
}
