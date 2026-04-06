import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, User, ArrowLeft, Scissors, AlertTriangle, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/ui/logo';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { useConfetti } from '@/hooks/useConfetti';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import { useRateLimiting } from '@/hooks/useRateLimiting';
import { getPathWithLanguage, getLanguageFromPath, LanguageCode } from '@/lib/i18n';
import { isSafeInternalReturnTo, isReturnToAllowedForRoles, getDefaultRedirectForRole } from '@/lib/returnTo';

const signUpSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signInSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type UserType = 'customer' | 'barber';

export default function Auth() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { t } = useTranslation();
  const currentLang = getLanguageFromPath(location.pathname) as LanguageCode;
  const getLocalizedPath = (path: string) => getPathWithLanguage(path, currentLang);
  
  const [mode, setMode] = useState<'signin' | 'signup'>(
    searchParams.get('mode') === 'signup' ? 'signup' : 'signin'
  );
  const [userType, setUserType] = useState<UserType>(
    searchParams.get('type') === 'barber' ? 'barber' : 'customer'
  );
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
  });
  const [referralCode, setReferralCode] = useState(searchParams.get('ref') || '');
  const [referralValid, setReferralValid] = useState<boolean | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [rateLimitError, setRateLimitError] = useState<string>('');

  const navigate = useNavigate();
  const { signIn, signUp, user, hasRole } = useAuth();
  const { toast } = useToast();
  const { fireCelebration } = useConfetti();
  const { 
    checkRateLimit, 
    recordFailedAttempt, 
    recordSuccess, 
    getRemainingAttempts,
    formatRemainingTime,
    lockoutRemaining,
  } = useRateLimiting();

  // Validate referral code when it changes
  useEffect(() => {
    if (referralCode.trim().length >= 6) {
      validateReferralCode(referralCode.trim());
    } else {
      setReferralValid(null);
    }
  }, [referralCode]);

  const validateReferralCode = async (code: string) => {
    const { data, error } = await supabase
      .from('referrals')
      .select('id')
      .eq('referral_code', code.toUpperCase())
      .eq('status', 'pending')
      .is('referred_user_id', null)
      .maybeSingle();

    setReferralValid(!error && !!data);
  };

  useEffect(() => {
    if (!user) return;

    // Don't redirect if we're about to navigate to barber onboarding
    const pendingBarberOnboarding = sessionStorage.getItem('pending_barber_onboarding');
    if (pendingBarberOnboarding) {
      sessionStorage.removeItem('pending_barber_onboarding');
      navigate('/barber-onboarding');
      return;
    }

    // Determine roles for redirect validation
    const userRoles: Array<'customer' | 'barber' | 'admin' | 'founder'> = [];
    if (hasRole('founder')) userRoles.push('founder');
    if (hasRole('admin')) userRoles.push('admin');
    if (hasRole('barber')) userRoles.push('barber');
    if (hasRole('customer')) userRoles.push('customer');

    // Check for returnTo parameter
    const returnTo = searchParams.get('returnTo');
    const decodedReturnTo = returnTo ? decodeURIComponent(returnTo) : null;

    if (
      isSafeInternalReturnTo(decodedReturnTo) &&
      isReturnToAllowedForRoles(decodedReturnTo, userRoles)
    ) {
      navigate(decodedReturnTo, { replace: true });
    } else {
      navigate(getDefaultRedirectForRole(userRoles), { replace: true });
    }
  }, [user, hasRole, navigate, searchParams]);

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        toast({
          title: 'Google Sign In Failed',
          description: error.message,
          variant: 'destructive',
        });
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to connect with Google',
        variant: 'destructive',
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setRateLimitError('');
    
    // Check rate limiting before attempting authentication
    const { isLimited, remainingSeconds } = checkRateLimit();
    if (isLimited) {
      setRateLimitError(`Too many attempts. Please wait ${formatRemainingTime(remainingSeconds)} before trying again.`);
      return;
    }
    
    setIsLoading(true);

    try {
      if (mode === 'signup') {
        const result = signUpSchema.safeParse(formData);
        if (!result.success) {
          const fieldErrors: Record<string, string> = {};
          result.error.errors.forEach((err) => {
            if (err.path[0]) {
              fieldErrors[err.path[0] as string] = err.message;
            }
          });
          setErrors(fieldErrors);
          setIsLoading(false);
          return;
        }

        const { error, session: newSession } = await signUp(formData.email, formData.password, formData.fullName);
        if (error) {
          // Record failed attempt for rate limiting
          const { isLocked, lockoutSeconds } = recordFailedAttempt();
          
          if (error.message.includes('already registered')) {
            setErrors({ email: 'This email is already registered. Please sign in.' });
          } else {
            toast({
              title: 'Sign up failed',
              description: error.message,
              variant: 'destructive',
            });
          }
          
          if (isLocked) {
            setRateLimitError(`Too many attempts. Please wait ${formatRemainingTime(lockoutSeconds)} before trying again.`);
          }
          
          setIsLoading(false);
          return;
        }
        
        // Clear rate limit on successful signup
        recordSuccess();

        // Process referral code if provided - wait for auth state to settle
        if (referralCode.trim() && referralValid && newSession?.access_token) {
          try {
            // Wait a moment for auth state to propagate
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Verify the session is set
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            
            if (currentSession) {
              const { data: referralResult, error: refError } = await supabase.rpc('process_referral_signup', {
                p_referral_code: referralCode.trim().toUpperCase()
              });
              
              if (refError) {
                console.error('Referral processing error:', refError);
              } else {
                const result = referralResult as { success?: boolean; message?: string } | null;
                if (result?.success) {
                  console.log('Referral processed successfully:', result.message);
                } else {
                  console.log('Referral not processed:', result?.message);
                }
              }
            } else {
              console.log('Session not available for referral processing');
            }
          } catch (refError) {
            console.error('Failed to process referral:', refError);
          }
        }

        // Send welcome email
        try {
          await supabase.functions.invoke('send-welcome-email', {
            body: {
              email: formData.email,
              name: formData.fullName,
              userType: userType
            }
          });
        } catch (emailError) {
          console.error('Failed to send welcome email:', emailError);
        }

        // If signing up as barber, go directly to onboarding without confetti (save that for after setup)
        if (userType === 'barber') {
          // Mark that we're heading to barber onboarding to prevent redirect loop
          sessionStorage.setItem('pending_barber_onboarding', 'true');
          
          toast({
            title: 'Account Created!',
            description: 'Let\'s set up your shop profile now.',
          });
          navigate('/barber-onboarding');
        } else {
          // Fire celebration confetti for customer signup
          fireCelebration();
          
          toast({
            title: '🎉 Welcome to CUTZ!',
            description: referralCode.trim() && referralValid
              ? 'Your account has been created! Complete your first booking to earn 50 bonus points!'
              : 'Your account has been created successfully. Check your email for a welcome message!',
          });
          navigate('/barbers');
        }
      } else {
        const result = signInSchema.safeParse(formData);
        if (!result.success) {
          const fieldErrors: Record<string, string> = {};
          result.error.errors.forEach((err) => {
            if (err.path[0]) {
              fieldErrors[err.path[0] as string] = err.message;
            }
          });
          setErrors(fieldErrors);
          setIsLoading(false);
          return;
        }

        const { error } = await signIn(formData.email, formData.password);
        if (error) {
          // Record failed attempt for rate limiting
          const { isLocked, lockoutSeconds } = recordFailedAttempt();
          const remainingAttempts = getRemainingAttempts();
          
          if (error.message.includes('Invalid login credentials')) {
            setErrors({ password: `Invalid email or password.${remainingAttempts > 0 ? ` ${remainingAttempts} attempts remaining.` : ''}` });
          } else {
            toast({
              title: 'Sign in failed',
              description: error.message,
              variant: 'destructive',
            });
          }
          
          if (isLocked) {
            setRateLimitError(`Too many failed attempts. Please wait ${formatRemainingTime(lockoutSeconds)} before trying again.`);
          }
        } else {
          // Clear rate limit on successful login
          recordSuccess();
        }
        // Navigation will be handled by useEffect when user state updates
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

  return (
    <div className="min-h-screen bg-background flex overflow-x-hidden">
      {/* Left Side - Form */}
      <div className="flex-1 flex flex-col justify-center px-4 py-6 sm:px-6 sm:py-8 md:px-8 md:py-12 lg:px-16 w-full max-w-full overflow-x-hidden">
        <div className="w-full max-w-md mx-auto">
          {/* Back link - hide on mobile */}
          <Link 
            to={getLocalizedPath('/')} 
            className="hidden md:inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('auth.backToHome')}
          </Link>

          <div className="text-center md:text-left mb-4 sm:mb-6">
            <Logo size="md" className="mx-auto md:mx-0 mb-3 sm:mb-4" />
            <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-bold mb-1">
              {mode === 'signin' ? t('auth.welcomeBack') : t('auth.createAccount')}
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm md:text-base mb-3 sm:mb-4">
              {mode === 'signin' 
                ? t('auth.signInSubtitle')
                : userType === 'barber' 
                  ? t('auth.barberSubtitle')
                  : t('auth.customerSubtitle')
              }
            </p>
          </div>

          {/* User Type Toggle - Only show on signup */}
          {mode === 'signup' && (
            <div className="mb-4 sm:mb-6">
              <Label className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3 block">{t('auth.iAmA')}</Label>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setUserType('customer')}
                  className={`p-3 sm:p-4 rounded-xl border-2 transition-all ${
                    userType === 'customer'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <User className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-1 sm:mb-2" />
                  <span className="block text-xs sm:text-sm font-medium">{t('auth.customer')}</span>
                  <span className="block text-[10px] sm:text-xs text-muted-foreground">{t('auth.customerDesc')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setUserType('barber')}
                  className={`p-3 sm:p-4 rounded-xl border-2 transition-all ${
                    userType === 'barber'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Scissors className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-1 sm:mb-2" />
                  <span className="block text-xs sm:text-sm font-medium">{t('auth.barber')}</span>
                  <span className="block text-[10px] sm:text-xs text-muted-foreground">{t('auth.barberDesc')}</span>
                </button>
              </div>
            </div>
          )}

          {/* Social Login Buttons */}
          <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
            <Button 
              type="button"
              variant="outline" 
              glow={false}
              className="w-full h-10 sm:h-12 border-2 text-sm sm:text-base text-foreground"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading}
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 flex-shrink-0" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span className="truncate">{isGoogleLoading ? t('auth.connecting') : t('auth.continueWithGoogle')}</span>
            </Button>

            <div className="relative opacity-50 cursor-not-allowed">
              <Button 
                type="button"
                variant="outline" 
                glow={false}
                className="w-full h-10 sm:h-12 border-2 pointer-events-none text-sm sm:text-base text-foreground"
                disabled
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
                <span className="truncate">{t('auth.continueWithApple')}</span>
                <span className="ml-1 sm:ml-2 text-[10px] sm:text-xs opacity-60 flex-shrink-0">({t('auth.soon')})</span>
              </Button>
            </div>
          </div>

          <div className="relative mb-4 sm:mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-[10px] sm:text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground tracking-widest">
                {t('auth.orContinueWithEmail')}
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-5">
            {/* Account Lockout Warning with Countdown */}
            {(rateLimitError || lockoutRemaining > 0) && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 sm:p-4 bg-destructive/10 border border-destructive/30 rounded-lg"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-destructive">Account Temporarily Locked</p>
                    <p className="text-sm text-destructive/80 mt-1">
                      {rateLimitError || `Too many failed attempts. Please wait ${formatRemainingTime(lockoutRemaining)} before trying again.`}
                    </p>
                    {lockoutRemaining > 0 && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="h-1.5 flex-1 bg-destructive/20 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-destructive rounded-full"
                            initial={{ width: '100%' }}
                            animate={{ width: '0%' }}
                            transition={{ duration: lockoutRemaining, ease: 'linear' }}
                          />
                        </div>
                        <span className="text-xs font-mono text-destructive tabular-nums">
                          {formatRemainingTime(lockoutRemaining)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
            
            {mode === 'signup' && (
              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="fullName" className="text-xs sm:text-sm text-foreground">{t('auth.fullName')}</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder={t('auth.namePlaceholder')}
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="pl-9 sm:pl-10 h-10 sm:h-12 text-sm sm:text-base"
                  />
                </div>
                {errors.fullName && (
                  <p className="text-xs sm:text-sm text-destructive">{errors.fullName}</p>
                )}
              </div>
            )}

            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="email" className="text-xs sm:text-sm text-foreground">{t('auth.email')}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder={t('auth.emailPlaceholder')}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="pl-9 sm:pl-10 h-10 sm:h-12 text-sm sm:text-base"
                />
              </div>
              {errors.email && (
                <p className="text-xs sm:text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="password" className="text-xs sm:text-sm text-foreground">{t('auth.password')}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="pl-9 sm:pl-10 pr-9 sm:pr-10 h-10 sm:h-12 text-sm sm:text-base"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs sm:text-sm text-destructive">{errors.password}</p>
              )}
            </div>

            {/* Referral Code Field - Only show on signup */}
            {mode === 'signup' && (
              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="referralCode" className="text-xs sm:text-sm flex items-center gap-2">
                  <Gift className="w-3.5 h-3.5 text-primary" />
                  Referral Code (Optional)
                </Label>
                <div className="relative">
                  <Input
                    id="referralCode"
                    type="text"
                    placeholder="e.g., ABC12345"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                    className={`h-10 sm:h-12 text-sm sm:text-base font-mono tracking-wider ${
                      referralCode.trim().length >= 6
                        ? referralValid
                          ? 'border-green-500 focus-visible:ring-green-500'
                          : 'border-destructive focus-visible:ring-destructive'
                        : ''
                    }`}
                  />
                  {referralCode.trim().length >= 6 && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {referralValid ? (
                        <span className="text-xs text-green-500 font-medium">✓ Valid</span>
                      ) : (
                        <span className="text-xs text-destructive font-medium">Invalid</span>
                      )}
                    </div>
                  )}
                </div>
                {referralValid && (
                  <p className="text-xs text-green-600 dark:text-green-400">
                    🎁 You'll earn 50 bonus points after your first booking!
                  </p>
                )}
              </div>
            )}

            {mode === 'signin' && (
              <div className="text-right">
                <Link
                  to={getLocalizedPath('/reset-password')}
                  className="text-xs sm:text-sm text-primary hover:underline"
                >
                  {t('auth.forgotPassword')}
                </Link>
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full h-10 sm:h-12 bg-gradient-gold hover:opacity-90 text-sm sm:text-lg font-semibold"
              disabled={isLoading || !!rateLimitError}
            >
              {isLoading ? t('auth.pleaseWait') : mode === 'signin' ? t('auth.signIn') : t('auth.createAccountBtn')}
            </Button>
          </form>

          <div className="mt-4 sm:mt-6 text-center space-y-2 sm:space-y-3">
            <p className="text-muted-foreground text-xs sm:text-sm">
              {mode === 'signin' ? t('auth.noAccount') : t('auth.hasAccount')}
              <button
                onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
                className="text-primary hover:underline font-medium"
              >
                {mode === 'signin' ? t('auth.signUpLink') : t('auth.signInLink')}
              </button>
            </p>
            {mode === 'signin' && (
              <p className="text-xs sm:text-sm text-muted-foreground">
                {t('auth.noVerificationEmail')}{' '}
                <Link to={getLocalizedPath('/verify-email')} className="text-primary hover:underline">
                  {t('auth.resendIt')}
                </Link>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Right Side - Visual */}
      <div className="hidden lg:flex flex-1 bg-gradient-card items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/4 right-1/4 w-80 h-80 bg-primary/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/3 left-1/3 w-64 h-64 bg-accent/15 rounded-full blur-[100px]" />
        </div>
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 text-center p-12"
        >
          <div className="w-32 h-32 rounded-3xl bg-gradient-gold flex items-center justify-center mx-auto mb-8 shadow-gold-lg">
            <Scissors className="w-16 h-16 text-primary-foreground" />
          </div>
          <h2 className="font-display text-4xl font-bold mb-4">
            {userType === 'barber' && mode === 'signup' ? (
              <>
                {t('auth.visual.growYour')}<br />
                <span className="text-gradient-gold">{t('auth.visual.barberBusiness')}</span>
              </>
            ) : (
              <>
                {t('auth.visual.premiumCuts')}<br />
                <span className="text-gradient-gold">{t('auth.visual.zeroHassle')}</span>
              </>
            )}
          </h2>
          <p className="text-muted-foreground text-lg max-w-sm mx-auto">
            {userType === 'barber' && mode === 'signup'
              ? t('auth.visual.barberSubtitle')
              : t('auth.visual.customerSubtitle')
            }
          </p>
        </motion.div>
      </div>
    </div>
  );
}
