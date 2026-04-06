import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ArrowLeft, Mail, Lock, Eye, EyeOff, Check, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/ui/logo';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import { getPathWithLanguage, getLanguageFromPath } from '@/lib/i18n';
import { useRateLimiting } from '@/hooks/useRateLimiting';

const emailSchema = z.string().email('Please enter a valid email');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

export default function ResetPassword() {
  const { t } = useTranslation();
  const location = useLocation();
  const currentLang = getLanguageFromPath(location.pathname);
  const getLocalizedPath = (path: string) => getPathWithLanguage(path, currentLang);
  
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<'request' | 'reset'>('request');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [rateLimitError, setRateLimitError] = useState<string>('');

  const navigate = useNavigate();
  const { toast } = useToast();
  const { 
    checkRateLimit, 
    recordFailedAttempt, 
    recordSuccess, 
    formatRemainingTime 
  } = useRateLimiting();

  useEffect(() => {
    // Check URL params (some flows use query params)
    const type = searchParams.get('type');
    if (type === 'recovery') {
      setMode('reset');
    }

    // Listen for Supabase auth state change - this is the primary way
    // to detect recovery mode (Supabase sends tokens as hash fragments)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('reset');
      }
    });

    return () => subscription.unsubscribe();
  }, [searchParams]);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setRateLimitError('');
    
    // Check rate limiting
    const { isLimited, remainingSeconds } = checkRateLimit();
    if (isLimited) {
      setRateLimitError(`Too many attempts. Please wait ${formatRemainingTime(remainingSeconds)} before trying again.`);
      return;
    }
    
    const result = emailSchema.safeParse(email);
    if (!result.success) {
      setErrors({ email: t('resetPassword.errors.invalidEmail') });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}${getLocalizedPath('/reset-password')}`,
      });

      if (error) {
        recordFailedAttempt();
        toast({
          title: t('resetPassword.errors.title'),
          description: error.message,
          variant: 'destructive',
        });
      } else {
        recordSuccess();
        setEmailSent(true);
        toast({
          title: t('resetPassword.emailSent.toastTitle'),
          description: t('resetPassword.emailSent.toastDescription'),
        });
      }
    } catch (err) {
      toast({
        title: t('resetPassword.errors.title'),
        description: t('resetPassword.errors.general'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      setErrors({ password: t('resetPassword.errors.weakPassword') });
      return;
    }

    if (password !== confirmPassword) {
      setErrors({ confirmPassword: t('resetPassword.errors.passwordMismatch') });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        toast({
          title: t('resetPassword.errors.title'),
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: t('resetPassword.success.title'),
          description: t('resetPassword.success.description'),
        });
        navigate(getLocalizedPath('/auth'));
      }
    } catch (err) {
      toast({
        title: t('resetPassword.errors.title'),
        description: t('resetPassword.errors.general'),
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
          <h1 className="font-display text-3xl tracking-wider mb-4">{t('resetPassword.emailSent.title')}</h1>
          <p className="text-muted-foreground mb-8">
            {t('resetPassword.emailSent.description')} <span className="font-medium text-foreground">{email}</span>
          </p>
          <p className="text-sm text-muted-foreground mb-8">
            {t('resetPassword.emailSent.noEmail')}{' '}
            <button
              onClick={() => setEmailSent(false)}
              className="text-primary hover:underline"
            >
              {t('resetPassword.emailSent.tryAgain')}
            </button>
          </p>
          <Link
            to={getLocalizedPath('/auth')}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('resetPassword.backToSignIn')}
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
          to={getLocalizedPath('/auth')}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('resetPassword.backToSignIn')}
        </Link>

        <Logo size="lg" className="mb-2" />
        <h1 className="font-display text-3xl tracking-wider mb-2">
          {mode === 'request' ? t('resetPassword.request.title') : t('resetPassword.reset.title')}
        </h1>
        <p className="text-muted-foreground mb-8">
          {mode === 'request'
            ? t('resetPassword.request.subtitle')
            : t('resetPassword.reset.subtitle')}
        </p>

        {mode === 'request' ? (
          <form onSubmit={handleRequestReset} className="space-y-5">
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
              <Label htmlFor="email">{t('auth.email')}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder={t('auth.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12"
                />
              </div>
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-gradient-gold hover:opacity-90 text-lg font-semibold"
              disabled={isLoading}
            >
              {isLoading ? t('resetPassword.request.sending') : t('resetPassword.request.button')}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="password">{t('resetPassword.reset.newPassword')}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t('resetPassword.reset.confirmPassword')}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 h-12"
                />
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-gradient-gold hover:opacity-90 text-lg font-semibold"
              disabled={isLoading}
            >
              {isLoading ? t('resetPassword.reset.updating') : t('resetPassword.reset.button')}
            </Button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
