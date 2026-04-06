import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Shield, ShieldCheck, ShieldOff, Loader2, Copy, Check } from 'lucide-react';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { PageTransition } from '@/components/animations/PageTransition';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getPathWithLanguage, getLanguageFromPath } from '@/lib/i18n';

interface MFAFactor {
  id: string;
  friendly_name: string;
  factor_type: string;
  status: string;
  created_at: string;
}

export default function TwoFactorAuth() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  
  // Helper to get localized path
  const currentLang = getLanguageFromPath(location.pathname);
  const localizedPath = (path: string) => getPathWithLanguage(path, currentLang);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);
  const [factors, setFactors] = useState<MFAFactor[]>([]);
  const [enrollmentData, setEnrollmentData] = useState<{
    qr: string;
    secret: string;
    factorId: string;
  } | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (user) {
      fetchFactors();
    }
  }, [user]);

  const fetchFactors = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      
      // Filter to only verified TOTP factors
      const verifiedFactors = (data?.totp || []).filter(f => f.status === 'verified');
      setFactors(verifiedFactors as MFAFactor[]);
    } catch (error: any) {
      console.error('Error fetching MFA factors:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnroll = async () => {
    setIsEnrolling(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'BCUTZ Authenticator',
      });

      if (error) throw error;

      setEnrollmentData({
        qr: data.totp.qr_code,
        secret: data.totp.secret,
        factorId: data.id,
      });
    } catch (error: any) {
      toast({
        title: t('settings.twoFactorAuth.error'),
        description: error.message || t('settings.twoFactorAuth.enrollError'),
        variant: 'destructive',
      });
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleVerifyEnrollment = async () => {
    if (!enrollmentData || verificationCode.length !== 6) return;
    
    setIsVerifying(true);
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: enrollmentData.factorId,
      });

      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: enrollmentData.factorId,
        challengeId: challengeData.id,
        code: verificationCode,
      });

      if (verifyError) throw verifyError;

      toast({
        title: t('settings.twoFactorAuth.successTitle'),
        description: t('settings.twoFactorAuth.successDesc'),
      });
      
      setEnrollmentData(null);
      setVerificationCode('');
      fetchFactors();
    } catch (error: any) {
      toast({
        title: t('settings.twoFactorAuth.verificationFailed'),
        description: error.message || t('settings.twoFactorAuth.invalidCode'),
        variant: 'destructive',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDisable = async (factorId: string) => {
    setIsDisabling(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;

      toast({
        title: t('settings.twoFactorAuth.disabledTitle'),
        description: t('settings.twoFactorAuth.disabledSuccessDesc'),
      });
      
      fetchFactors();
    } catch (error: any) {
      toast({
        title: t('settings.twoFactorAuth.error'),
        description: error.message || t('settings.twoFactorAuth.disableError'),
        variant: 'destructive',
      });
    } finally {
      setIsDisabling(false);
    }
  };

  const copySecret = () => {
    if (enrollmentData?.secret) {
      navigator.clipboard.writeText(enrollmentData.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const cancelEnrollment = () => {
    setEnrollmentData(null);
    setVerificationCode('');
  };

  const is2FAEnabled = factors.length > 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
<div className="pt-32 pb-16 container mx-auto px-4">
          <div className="flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
<main className="pt-32 pb-24">
          <div className="container mx-auto px-4 max-w-2xl">
            <Breadcrumbs />
            <Link 
              to={localizedPath("/profile")} 
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('settings.backToProfile')}
            </Link>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-foreground text-background flex items-center justify-center">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="font-display text-3xl tracking-wider">{t('settings.twoFactorAuth.title')}</h1>
                  <p className="text-muted-foreground">{t('settings.twoFactorAuth.subtitle')}</p>
                </div>
              </div>

              {/* Current Status */}
              <div className="border-2 border-border p-6 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {is2FAEnabled ? (
                      <ShieldCheck className="w-8 h-8 text-green-500" />
                    ) : (
                      <ShieldOff className="w-8 h-8 text-muted-foreground" />
                    )}
                    <div>
                      <p className="font-display text-lg tracking-wider">
                        {is2FAEnabled ? t('settings.twoFactorAuth.enabled') : t('settings.twoFactorAuth.disabled')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {is2FAEnabled 
                          ? t('settings.twoFactorAuth.enabledDesc')
                          : t('settings.twoFactorAuth.disabledDesc')
                        }
                      </p>
                    </div>
                  </div>
                  {is2FAEnabled && (
                    <Button 
                      variant="outline" 
                      onClick={() => handleDisable(factors[0].id)}
                      disabled={isDisabling}
                      className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                    >
                      {isDisabling ? <Loader2 className="w-4 h-4 animate-spin" /> : t('settings.twoFactorAuth.disable')}
                    </Button>
                  )}
                </div>
              </div>

              {/* Enrollment Flow */}
              {!is2FAEnabled && !enrollmentData && (
                <div className="border-2 border-border p-8 text-center">
                  <Shield className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <h2 className="font-display text-xl tracking-wider mb-2">{t('settings.twoFactorAuth.protectAccount')}</h2>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    {t('settings.twoFactorAuth.protectAccountDesc')}
                  </p>
                  <Button onClick={handleEnroll} disabled={isEnrolling}>
                    {isEnrolling ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t('settings.twoFactorAuth.settingUp')}
                      </>
                    ) : (
                      t('settings.twoFactorAuth.enable2FA')
                    )}
                  </Button>
                </div>
              )}

              {/* QR Code Setup */}
              {enrollmentData && (
                <div className="border-2 border-border p-8">
                  <h2 className="font-display text-xl tracking-wider mb-6 text-center">{t('settings.twoFactorAuth.scanQRCode')}</h2>
                  
                  <div className="flex flex-col items-center gap-6">
                    <div className="bg-white p-4 rounded-lg">
                      <img 
                        src={enrollmentData.qr} 
                        alt="QR Code for authenticator app" 
                        className="w-48 h-48"
                      />
                    </div>
                    
                    <p className="text-sm text-muted-foreground text-center max-w-md">
                      {t('settings.twoFactorAuth.scanQRCodeDesc')}
                    </p>

                    {/* Manual Entry */}
                    <div className="w-full max-w-sm">
                      <Label className="text-xs tracking-widest text-muted-foreground">
                        {t('settings.twoFactorAuth.orEnterManually')}
                      </Label>
                      <div className="flex mt-2">
                        <code className="flex-1 bg-muted p-3 font-mono text-sm break-all">
                          {enrollmentData.secret}
                        </code>
                        <button 
                          onClick={copySecret}
                          className="px-3 bg-foreground text-background hover:bg-accent transition-colors"
                        >
                          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Verification Input */}
                    <div className="w-full max-w-sm">
                      <Label className="text-xs tracking-widest text-muted-foreground">
                        {t('settings.twoFactorAuth.enter6DigitCode')}
                      </Label>
                      <Input
                        type="text"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        className="mt-2 text-center text-2xl tracking-[0.5em] font-mono rounded-none border-2"
                        maxLength={6}
                      />
                    </div>

                    <div className="flex gap-4">
                      <Button variant="outline" onClick={cancelEnrollment}>
                        {t('settings.twoFactorAuth.cancel')}
                      </Button>
                      <Button 
                        onClick={handleVerifyEnrollment} 
                        disabled={verificationCode.length !== 6 || isVerifying}
                      >
                        {isVerifying ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            {t('settings.twoFactorAuth.verifying')}
                          </>
                        ) : (
                          t('settings.twoFactorAuth.verifyAndEnable')
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Info Section */}
              <div className="mt-8 p-6 bg-muted/50 border border-border">
                <h3 className="font-display tracking-wider mb-4">{t('settings.twoFactorAuth.howItWorksTitle')}</h3>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-start gap-3">
                    <span className="font-display text-foreground">1.</span>
                    {t('settings.twoFactorAuth.step1')}
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="font-display text-foreground">2.</span>
                    {t('settings.twoFactorAuth.step2')}
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="font-display text-foreground">3.</span>
                    {t('settings.twoFactorAuth.step3')}
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="font-display text-foreground">4.</span>
                    {t('settings.twoFactorAuth.step4')}
                  </li>
                </ul>
              </div>
            </motion.div>
          </div>
        </main>
</div>
    </PageTransition>
  );
}