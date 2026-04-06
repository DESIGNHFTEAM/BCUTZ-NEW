import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CreditCard, CheckCircle2, AlertCircle, ExternalLink, Loader2 } from 'lucide-react';

interface ConnectStatus {
  hasAccount: boolean;
  isOnboarded: boolean;
  canReceivePayments: boolean;
  accountId?: string;
}

export function StripeConnectSetup() {
  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  const checkStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('check-connect-status');
      
      if (error) throw error;
      setStatus(data);
    } catch (error) {
      console.error('Error checking Connect status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();

    // Check for return from Stripe onboarding
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('stripe_onboarding') === 'complete') {
      toast.success('Stripe onboarding completed! Verifying your account...');
      checkStatus();
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
    if (urlParams.get('stripe_refresh') === 'true') {
      toast.info('Please complete your Stripe onboarding to receive payments.');
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleSetupConnect = async () => {
    setConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-connect-account');
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
        toast.info('Complete your payment setup in the new tab');
      }
    } catch (error: any) {
      console.error('Error setting up Connect:', error);
      toast.error(error.message || 'Failed to start payment setup');
    } finally {
      setConnecting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Payment Setup</CardTitle>
              <CardDescription>Receive payments directly to your bank</CardDescription>
            </div>
          </div>
          {status?.canReceivePayments && (
            <Badge variant="default" className="bg-green-500/20 text-green-500 border-green-500/30">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Active
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!status?.hasAccount ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Set up Stripe Connect to receive payments directly from your bookings. 
              You'll receive the full service amount — customers pay a CHF 2 booking fee separately.
            </p>
            <Button onClick={handleSetupConnect} disabled={connecting}>
              {connecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Setting up...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Set Up Payments
                </>
              )}
            </Button>
          </div>
        ) : !status?.isOnboarded ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-500">Complete Setup Required</p>
                <p className="text-sm text-muted-foreground">
                  Please complete your Stripe onboarding to start receiving payments.
                </p>
              </div>
            </div>
            <Button onClick={handleSetupConnect} disabled={connecting}>
              {connecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Complete Setup
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-500">Payments Active</p>
                <p className="text-sm text-muted-foreground">
                  You're all set to receive payments from bookings directly to your bank account.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleSetupConnect}>
                <ExternalLink className="w-4 h-4 mr-2" />
                Manage Stripe Account
              </Button>
              <Button variant="ghost" size="sm" onClick={checkStatus}>
                Refresh Status
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
