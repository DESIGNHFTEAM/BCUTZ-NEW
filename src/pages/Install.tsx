import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { 
  Smartphone, 
  Download, 
  Share, 
  Plus, 
  MoreVertical, 
  Check,
  Apple,
  Chrome,
  MonitorSmartphone,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { PageTransition } from '@/components/animations/PageTransition';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useDeviceDetection, DeviceType } from '@/hooks/useDeviceDetection';
import { SoftwareApplicationSchema } from '@/components/seo/SoftwareApplicationSchema';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const Install = () => {
  const { t } = useTranslation();
  const { deviceType, browserType, isStandalone, canInstallPWA, isMobile } = useDeviceDetection();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return;
    
    setIsInstalling(true);
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
    setIsInstalling(false);
  };

  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 }
  };

  // Already installed message
  if (isStandalone) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-background">
<main className="container mx-auto px-4 py-16">
            <motion.div {...fadeIn} className="max-w-2xl mx-auto text-center">
              <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="w-10 h-10 text-primary" />
              </div>
              <h1 className="text-3xl font-bold mb-4">App Already Installed!</h1>
              <p className="text-muted-foreground mb-8">
                You're already using BCUTZ as an installed app. Enjoy the full experience!
              </p>
              <Button onClick={() => window.location.href = '/barbers'}>
                Find Barbers <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>
          </main>
</div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <SoftwareApplicationSchema
        name="BCUTZ"
        description="Book your next haircut with BCUTZ - Switzerland's premier barber booking app. Find verified professional barbers, book appointments, and manage your grooming schedule."
        applicationCategory="LifestyleApplication"
        operatingSystem={['iOS', 'Android', 'Windows', 'macOS', 'Chrome OS']}
        url="https://bcutz.lovable.app/install"
        image="https://bcutz.lovable.app/pwa-512x512.png"
        offers={{ price: '0', priceCurrency: 'CHF' }}
        author={{ name: 'BCUTZ', url: 'https://bcutz.lovable.app' }}
        features={[
          'Find verified barbers',
          'Book appointments online',
          'Secure payments',
          'Push notifications',
          'Works offline',
          'Loyalty rewards program',
        ]}
      />
      <div className="min-h-screen bg-background">
<main className="container mx-auto px-4 py-12 pt-24">
          <Breadcrumbs />
          <motion.div {...fadeIn} className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="text-center mb-12">
              <Badge variant="secondary" className="mb-4">
                <Smartphone className="w-3 h-3 mr-1" />
                Get the App
              </Badge>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                Install BCUTZ
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Get the best experience with our app. Fast, offline-ready, and always at your fingertips.
              </p>
            </div>

            {/* Device-specific instructions */}
            <div className="grid md:grid-cols-2 gap-6 mb-12">
              {/* PWA Install Card - Show if available */}
              {canInstallPWA && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Card className={`h-full ${deviceType !== 'ios' ? 'border-primary ring-2 ring-primary/20' : ''}`}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <Download className="w-5 h-5" />
                          Install Now
                        </CardTitle>
                        {deviceType !== 'ios' && (
                          <Badge>Recommended</Badge>
                        )}
                      </div>
                      <CardDescription>
                        Add to your home screen instantly
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {deferredPrompt ? (
                        <Button 
                          className="w-full" 
                          size="lg"
                          onClick={handleInstallPWA}
                          disabled={isInstalling}
                        >
                          {isInstalling ? 'Installing...' : 'Install App'}
                          <Download className="ml-2 h-4 w-4" />
                        </Button>
                      ) : (
                        <DeviceInstructions deviceType={deviceType} browserType={browserType} />
                      )}
                      
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-primary" />
                          Works offline
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-primary" />
                          No app store required
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-primary" />
                          Always up to date
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* App Store Card */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card className={`h-full ${deviceType === 'ios' ? 'border-primary ring-2 ring-primary/20' : ''}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Apple className="w-5 h-5" />
                        App Store
                      </CardTitle>
                      {deviceType === 'ios' && (
                        <Badge>Recommended for iOS</Badge>
                      )}
                    </div>
                    <CardDescription>
                      Download from Apple App Store
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button 
                      className="w-full" 
                      size="lg" 
                      variant={deviceType === 'ios' ? 'default' : 'outline'}
                      disabled
                    >
                      Coming Soon
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </Button>
                    <p className="text-sm text-muted-foreground text-center">
                      We're working on our iOS app. Use the PWA in the meantime!
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Play Store Card */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Card className={`h-full ${deviceType === 'android' && !canInstallPWA ? 'border-primary ring-2 ring-primary/20' : ''}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <MonitorSmartphone className="w-5 h-5" />
                        Play Store
                      </CardTitle>
                      {deviceType === 'android' && !deferredPrompt && (
                        <Badge>For Android</Badge>
                      )}
                    </div>
                    <CardDescription>
                      Download from Google Play Store
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button 
                      className="w-full" 
                      size="lg" 
                      variant={deviceType === 'android' && !deferredPrompt ? 'default' : 'outline'}
                      disabled
                    >
                      Coming Soon
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </Button>
                    <p className="text-sm text-muted-foreground text-center">
                      Android app coming soon. Install the PWA for now!
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Desktop Card */}
              {!isMobile && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <Card className="h-full">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Chrome className="w-5 h-5" />
                        Desktop App
                      </CardTitle>
                      <CardDescription>
                        Install as a desktop application
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {deferredPrompt ? (
                        <Button 
                          className="w-full" 
                          size="lg"
                          onClick={handleInstallPWA}
                          disabled={isInstalling}
                        >
                          {isInstalling ? 'Installing...' : 'Install Desktop App'}
                          <Download className="ml-2 h-4 w-4" />
                        </Button>
                      ) : (
                        <div className="text-sm text-muted-foreground space-y-2">
                          <p>In your browser, click the install icon in the address bar or:</p>
                          <ol className="list-decimal list-inside space-y-1">
                            <li>Open browser menu (⋮)</li>
                            <li>Select "Install BCUTZ..."</li>
                          </ol>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </div>

            {/* Features section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="text-center"
            >
              <h2 className="text-2xl font-bold mb-6">Why Install?</h2>
              <div className="grid sm:grid-cols-3 gap-6">
                <div className="p-6 rounded-lg bg-muted/50">
                  <Download className="w-8 h-8 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold mb-2">Instant Access</h3>
                  <p className="text-sm text-muted-foreground">
                    Launch directly from your home screen
                  </p>
                </div>
                <div className="p-6 rounded-lg bg-muted/50">
                  <Smartphone className="w-8 h-8 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold mb-2">Works Offline</h3>
                  <p className="text-sm text-muted-foreground">
                    Browse barbers even without internet
                  </p>
                </div>
                <div className="p-6 rounded-lg bg-muted/50">
                  <Check className="w-8 h-8 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold mb-2">Always Updated</h3>
                  <p className="text-sm text-muted-foreground">
                    Get the latest features automatically
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </main>
</div>
    </PageTransition>
  );
};

// Device-specific installation instructions component
function DeviceInstructions({ deviceType, browserType }: { deviceType: DeviceType; browserType: string }) {
  if (deviceType === 'ios') {
    return (
      <div className="space-y-3 text-sm">
        <p className="font-medium">To install on iOS Safari:</p>
        <ol className="space-y-2">
          <li className="flex items-start gap-2">
            <span className="bg-primary text-primary-foreground w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0">1</span>
            <span>Tap the <Share className="w-4 h-4 inline mx-1" /> Share button</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="bg-primary text-primary-foreground w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0">2</span>
            <span>Scroll down and tap <Plus className="w-4 h-4 inline mx-1" /> "Add to Home Screen"</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="bg-primary text-primary-foreground w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0">3</span>
            <span>Tap "Add" in the top right</span>
          </li>
        </ol>
      </div>
    );
  }

  if (deviceType === 'android') {
    return (
      <div className="space-y-3 text-sm">
        <p className="font-medium">To install on Android:</p>
        <ol className="space-y-2">
          <li className="flex items-start gap-2">
            <span className="bg-primary text-primary-foreground w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0">1</span>
            <span>Tap the <MoreVertical className="w-4 h-4 inline mx-1" /> menu button</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="bg-primary text-primary-foreground w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0">2</span>
            <span>Tap "Add to Home screen" or "Install app"</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="bg-primary text-primary-foreground w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0">3</span>
            <span>Confirm by tapping "Add"</span>
          </li>
        </ol>
      </div>
    );
  }

  return (
    <div className="text-sm text-muted-foreground">
      <p>Look for the install icon in your browser's address bar, or use the browser menu to install this app.</p>
    </div>
  );
}

export default Install;
