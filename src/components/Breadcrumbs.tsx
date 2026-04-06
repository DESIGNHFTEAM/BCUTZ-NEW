import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getPathWithLanguage, getLanguageFromPath, LanguageCode } from '@/lib/i18n';
import { Helmet } from 'react-helmet-async';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

// Valid routes that actually exist in the app
const validRoutes: Set<string> = new Set([
  '/',
  '/about',
  '/barbers',
  '/bookings',
  '/careers',
  '/contact',
  '/cookies',
  '/dashboard',
  '/dashboard/profile',
  '/dashboard/services',
  '/dashboard/calendar',
  '/dashboard/analytics',
  '/dashboard/earnings',
  '/dashboard/customers',
  '/dashboard/reviews',
  '/dashboard/messages',
  '/barber-onboarding',
  '/for-professionals',
  '/how-it-works',
  '/install',
  '/loyalty',
  '/payment-success',
  '/press',
  '/pricing',
  '/privacy',
  '/terms',
  '/profile',
  '/settings/payment-methods',
  '/settings/notifications',
  '/settings/language-region',
  '/settings/saved-barbers',
  '/settings/2fa',
  '/auth',
  '/reset-password',
  '/verify-email',
  '/admin/barber-verification',
  '/admin/reports',
  '/admin/loyalty-rewards',
  '/founder/admin-management',
  '/founder/activity-log',
  '/founder/dashboard',
  '/founder/email-preview',
]);

// Mapping route segments to translation keys
const routeTranslationKeys: Record<string, string> = {
  '': 'breadcrumbs.home',
  'about': 'breadcrumbs.about',
  'barbers': 'breadcrumbs.barbers',
  'barber': 'breadcrumbs.barberProfile',
  'barber-onboarding': 'breadcrumbs.barberOnboarding',
  'bookings': 'breadcrumbs.bookings',
  'careers': 'breadcrumbs.careers',
  'contact': 'breadcrumbs.contact',
  'cookies': 'breadcrumbs.cookiePolicy',
  'dashboard': 'breadcrumbs.dashboard',
  'services': 'breadcrumbs.services',
  'calendar': 'breadcrumbs.calendar',
  'analytics': 'breadcrumbs.analytics',
  'earnings': 'breadcrumbs.earnings',
  'customers': 'breadcrumbs.customers',
  'reviews': 'breadcrumbs.reviews',
  'profile': 'breadcrumbs.profile',
  'messages': 'breadcrumbs.messages',
  'founder': 'breadcrumbs.founder',
  'activity-log': 'breadcrumbs.activityLog',
  'admin-management': 'breadcrumbs.adminManagement',
  'admin': 'breadcrumbs.admin',
  'reports': 'breadcrumbs.adminReports',
  'barber-verification': 'breadcrumbs.verification',
  'loyalty-rewards': 'breadcrumbs.loyaltyRewards',
  'email-preview': 'breadcrumbs.emailPreview',
  'for-professionals': 'breadcrumbs.forProfessionals',
  'how-it-works': 'breadcrumbs.howItWorks',
  'install': 'breadcrumbs.install',
  'loyalty': 'breadcrumbs.loyalty',
  'payment-success': 'breadcrumbs.paymentSuccess',
  'press': 'breadcrumbs.press',
  'pricing': 'breadcrumbs.pricing',
  'privacy': 'breadcrumbs.privacyPolicy',
  'reset-password': 'breadcrumbs.resetPassword',
  'settings': 'breadcrumbs.settings',
  'language-region': 'breadcrumbs.languageRegion',
  'notifications': 'breadcrumbs.notifications',
  'payment-methods': 'breadcrumbs.paymentMethods',
  'saved-barbers': 'breadcrumbs.savedBarbers',
  '2fa': 'breadcrumbs.twoFactorAuth',
  'terms': 'breadcrumbs.termsOfService',
  'verify-email': 'breadcrumbs.verifyEmail',
  'auth': 'breadcrumbs.signIn',
};

// Check if a path is a valid navigable route
const isValidRoute = (path: string): boolean => {
  // Check exact match
  if (validRoutes.has(path)) return true;
  
  // Check for dynamic routes like /barber/:id
  if (path.startsWith('/barber/')) return true;
  
  return false;
};

// Generate JSON-LD structured data for breadcrumbs
const generateBreadcrumbSchema = (breadcrumbs: BreadcrumbItem[], baseUrl: string) => {
  const itemListElement = breadcrumbs.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.label,
    item: item.href ? `${baseUrl}${item.href}` : undefined,
  }));

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement,
  };
};

export function Breadcrumbs() {
  const location = useLocation();
  const { t } = useTranslation();
  const currentLang = getLanguageFromPath(location.pathname) as LanguageCode;
  const pathnames = location.pathname.split('/').filter(x => x && !['de', 'fr', 'en', 'it'].includes(x));
  
  // Don't show breadcrumbs on home page
  if (pathnames.length === 0) return null;

  // Helper to get localized path
  const getLocalizedPath = (path: string) => getPathWithLanguage(path, currentLang);

  // Helper to get translated label
  const getLabel = (segment: string, fullPath: string): string => {
    const translationKey = routeTranslationKeys[segment];
    if (translationKey) {
      return t(translationKey);
    }
    // If this is a UUID (dynamic route param), skip showing it
    const uuidRegex = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;
    if (uuidRegex.test(segment)) {
      return null as any; // Will be filtered out
    }
    // Fallback: capitalize segment
    return segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
  };
  
  const breadcrumbs: BreadcrumbItem[] = [
    { label: t('breadcrumbs.home'), href: getLocalizedPath('/') }
  ];
  
  let currentPath = '';
  pathnames.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const isLast = index === pathnames.length - 1;
    
    // Skip UUID segments (dynamic route params like barber IDs)
    const uuidRegex = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;
    if (uuidRegex.test(segment)) return;
    
    // Only add href if it's a valid route and not the last item
    const shouldHaveLink = !isLast && isValidRoute(currentPath);
    
    breadcrumbs.push({
      label: getLabel(segment, currentPath),
      href: shouldHaveLink ? getLocalizedPath(currentPath) : undefined
    });
  });

  // Generate structured data
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://bcutz.lovable.app';
  const breadcrumbSchema = generateBreadcrumbSchema(breadcrumbs, baseUrl);
  
  return (
    <>
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbSchema)}
        </script>
      </Helmet>
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-muted-foreground mb-4 flex-wrap">
        {breadcrumbs.map((item, index) => (
          <div key={index} className="flex items-center gap-1">
            {index > 0 && <ChevronRight className="w-4 h-4 shrink-0" />}
            {index === 0 ? (
              <Link to={item.href!} className="hover:text-foreground transition-colors">
                <Home className="w-4 h-4" />
              </Link>
            ) : item.href ? (
              <Link to={item.href} className="hover:text-foreground transition-colors">
                {item.label}
              </Link>
            ) : (
              <span className="text-foreground font-medium">{item.label}</span>
            )}
          </div>
        ))}
      </nav>
    </>
  );
}
