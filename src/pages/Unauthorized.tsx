import { Link } from 'react-router-dom';
import { ShieldX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { useTranslation } from 'react-i18next';

export default function Unauthorized() {
  const { user, hasRole } = useAuth();
  const { t } = useTranslation();

  // Determine best redirect based on user's role
  const getRedirectPath = () => {
    if (!user) return '/auth';
    if (hasRole('founder')) return '/founder/dashboard';
    if (hasRole('admin')) return '/admin/barber-verification';
    if (hasRole('barber')) return '/dashboard';
    return '/bookings';
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center max-w-md space-y-6">
        <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <ShieldX className="w-8 h-8 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">
          {t('unauthorized.title', 'Access Denied')}
        </h1>
        <p className="text-muted-foreground">
          {t('unauthorized.message', "You don't have permission to access this page. If you believe this is an error, please contact support.")}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild>
            <Link to={getRedirectPath()}>
              {t('unauthorized.goHome', 'Go to Dashboard')}
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/">
              {t('unauthorized.backHome', 'Back to Home')}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
