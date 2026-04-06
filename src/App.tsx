import { useEffect, lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { HelmetProvider } from "react-helmet-async";
import { ThemeProvider, useTheme } from "@/hooks/useTheme";
import { AuthProvider } from "@/lib/auth";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { useTranslation } from "react-i18next";
import { useLanguageSync } from "@/hooks/useLanguageSync";
import { useDeepLinks } from "@/hooks/useDeepLinks";
import { useStatusBarThemeSync } from "@/hooks/useStatusBar";
import { useAutoHideSplash } from "@/hooks/useSplashScreen";
import { Loader2 } from 'lucide-react';

// Global components
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { LiveBookingIndicator } from "@/components/LiveBookingIndicator";
import { CookieConsent } from "@/components/CookieConsent";
import { PushNotificationPrompt } from "@/components/PushNotificationPrompt";
import { ScrollToTop } from "@/components/ScrollToTop";
import ErrorBoundary from "@/components/ErrorBoundary";
import { OfflineIndicator } from "@/components/OfflineIndicator";

// Config-driven routing
import { allRoutes, type RouteConfig } from "@/config/routes";
import { RouteGuard } from "@/components/guards/RouteGuard";
import { LayoutRouter } from "@/components/layouts/LayoutRouter";

// ─── Page imports ────────────────────────────────────────────────────
// Public
import Index from "./pages/Index";
import Barbers from "./pages/Barbers";
import BarberProfile from "./pages/BarberProfile";
import HowItWorks from "./pages/HowItWorks";
import About from "./pages/About";
import ForProfessionals from "./pages/ForProfessionals";
import Pricing from "./pages/Pricing";
import Contact from "./pages/Contact";
import Careers from "./pages/Careers";
import Press from "./pages/Press";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import CookiePolicy from "./pages/CookiePolicy";
import Install from "./pages/Install";

// Auth
import Auth from "./pages/Auth";
import VerifyEmail from "./pages/VerifyEmail";
import ResetPassword from "./pages/ResetPassword";

// Customer
import Bookings from "./pages/Bookings";
import CustomerProfile from "./pages/CustomerProfile";
import LoyaltyProgram from "./pages/LoyaltyProgram";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentMethods from "./pages/settings/PaymentMethods";
import Notifications from "./pages/settings/Notifications";
import LanguageRegion from "./pages/settings/LanguageRegion";
import SavedBarbers from "./pages/settings/SavedBarbers";
import TwoFactorAuth from "./pages/settings/TwoFactorAuth";

// Barber
import BarberOnboarding from "./pages/BarberOnboarding";
import Dashboard from "./pages/Dashboard";
import DashboardServices from "./pages/DashboardServices";
import DashboardCalendar from "./pages/DashboardCalendar";
import DashboardAnalytics from "./pages/DashboardAnalytics";
import DashboardEarnings from "./pages/DashboardEarnings";
import BarberDashboardProfile from "./pages/BarberDashboardProfile";
import DashboardCustomers from "./pages/DashboardCustomers";
import DashboardReviews from "./pages/DashboardReviews";
import DashboardMessages from "./pages/DashboardMessages";

// Admin
import AdminReports from "./pages/AdminReports";
import AdminBarberVerification from "./pages/AdminBarberVerification";
import AdminLoyaltyRewards from "./pages/AdminLoyaltyRewards";

// Founder
import FounderActivityLog from "./pages/FounderActivityLog";
import FounderAdminManagement from "./pages/FounderAdminManagement";
import FounderDashboard from "./pages/FounderDashboard";
import FounderEmailPreview from "./pages/FounderEmailPreview";

// Special
import Unauthorized from "./pages/Unauthorized";
import NotFound from "./pages/NotFound";
import ScreenshotMockups from "./pages/ScreenshotMockups";

/**
 * Maps route paths to their React component.
 * Architecture note: We use a lookup map rather than dynamic imports to keep
 * bundle predictable and avoid waterfall loading for critical routes.
 */
const pageComponents: Record<string, React.ComponentType> = {
  '/': Index,
  '/about': About,
  '/contact': Contact,
  '/careers': Careers,
  '/press': Press,
  '/pricing': Pricing,
  '/terms': TermsOfService,
  '/privacy': PrivacyPolicy,
  '/cookies': CookiePolicy,
  '/how-it-works': HowItWorks,
  '/for-professionals': ForProfessionals,
  '/install': Install,
  '/barbers': Barbers,
  '/barber/:id': BarberProfile,
  '/auth': Auth,
  '/verify-email': VerifyEmail,
  '/reset-password': ResetPassword,
  '/bookings': Bookings,
  '/profile': CustomerProfile,
  '/loyalty': LoyaltyProgram,
  '/payment-success': PaymentSuccess,
  '/settings/payment-methods': PaymentMethods,
  '/settings/notifications': Notifications,
  '/settings/language-region': LanguageRegion,
  '/settings/saved-barbers': SavedBarbers,
  '/settings/2fa': TwoFactorAuth,
  '/barber-onboarding': BarberOnboarding,
  '/dashboard': Dashboard,
  '/dashboard/profile': BarberDashboardProfile,
  '/dashboard/services': DashboardServices,
  '/dashboard/calendar': DashboardCalendar,
  '/dashboard/earnings': DashboardEarnings,
  '/dashboard/analytics': DashboardAnalytics,
  '/dashboard/customers': DashboardCustomers,
  '/dashboard/reviews': DashboardReviews,
  '/dashboard/messages': DashboardMessages,
  '/admin/barber-verification': AdminBarberVerification,
  '/admin/reports': AdminReports,
  '/admin/loyalty-rewards': AdminLoyaltyRewards,
  '/founder/admin-management': FounderAdminManagement,
  '/founder/activity-log': FounderActivityLog,
  '/founder/dashboard': FounderDashboard,
  '/founder/email-preview': FounderEmailPreview,
  '/dev/screenshots': ScreenshotMockups,
};

const queryClient = new QueryClient();

const LoadingFallback = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

// Helper to extract language from path
function getLanguageFromPath(pathname: string): string {
  const langMatch = pathname.match(/^\/(de|fr|it)/);
  return langMatch ? langMatch[1] : 'en';
}

function LanguageSyncWrapper() {
  const location = useLocation();
  const { i18n } = useTranslation();
  const { theme } = useTheme();
  
  useDeepLinks();
  useStatusBarThemeSync(theme === 'dark');
  useAutoHideSplash(true, 500);
  
  useEffect(() => {
    const langFromPath = getLanguageFromPath(location.pathname);
    if (i18n.language !== langFromPath) {
      i18n.changeLanguage(langFromPath);
    }
  }, [location.pathname, i18n]);
  
  useLanguageSync();
  return null;
}

/** Generate Route elements from config for a given path prefix */
function renderConfigRoutes(prefix: string = '') {
  return allRoutes.map((routeConfig) => {
    const Component = pageComponents[routeConfig.path];
    if (!Component) return null;

    const fullPath = prefix
      ? `${routeConfig.path === '/' ? '' : routeConfig.path}`
      : routeConfig.path;

    return (
      <Route
        key={`${prefix}${routeConfig.path}`}
        path={fullPath || 'index'}
        index={routeConfig.path === '/' && !prefix ? undefined : routeConfig.path === '/' ? true : undefined}
        element={
          <RouteGuard config={routeConfig}>
            <LayoutRouter layout={routeConfig.layout}>
              <Component />
            </LayoutRouter>
          </RouteGuard>
        }
      />
    );
  });
}

function AnimatedRoutes() {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Root routes (English default) */}
        <Route path="/*">
          {allRoutes.map((config) => {
            const Component = pageComponents[config.path];
            if (!Component) return null;
            return (
              <Route
                key={config.path}
                path={config.path === '/' ? undefined : config.path.slice(1)}
                index={config.path === '/'}
                element={
                  <RouteGuard config={config}>
                    <LayoutRouter layout={config.layout}>
                      <Component />
                    </LayoutRouter>
                  </RouteGuard>
                }
              />
            );
          })}
          <Route path="unauthorized" element={<Unauthorized />} />
        </Route>

        {/* Language-prefixed routes */}
        {['de', 'fr', 'it'].map(lang => (
          <Route key={lang} path={`/${lang}/*`}>
            {allRoutes.map((config) => {
              const Component = pageComponents[config.path];
              if (!Component) return null;
              return (
                <Route
                  key={`${lang}-${config.path}`}
                  path={config.path === '/' ? undefined : config.path.slice(1)}
                  index={config.path === '/'}
                  element={
                    <RouteGuard config={config}>
                      <LayoutRouter layout={config.layout}>
                        <Component />
                      </LayoutRouter>
                    </RouteGuard>
                  }
                />
              );
            })}
            <Route path="unauthorized" element={<Unauthorized />} />
          </Route>
        ))}

        {/* Catch-all 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AnimatePresence>
  );
}

const App = () => (
  <ErrorBoundary>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AuthProvider>
                <CurrencyProvider>
                  <LanguageSyncWrapper />
                  <ScrollToTop />
                  <AnimatedRoutes />
                  <MobileBottomNav />
                  <LiveBookingIndicator />
                  <CookieConsent />
                  <PushNotificationPrompt />
                  <OfflineIndicator />
                </CurrencyProvider>
              </AuthProvider>
            </BrowserRouter>
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </HelmetProvider>
  </ErrorBoundary>
);

export default App;
