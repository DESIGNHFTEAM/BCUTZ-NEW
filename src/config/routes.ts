/**
 * Central route configuration — single source of truth for all routes.
 * 
 * Architecture decision: Config-driven routing eliminates scattered auth checks
 * and role guards across individual pages. Every route's access rules, layout,
 * and nav visibility are declared here, making security audits straightforward.
 */

import { type AppRole } from '@/lib/auth';

export type LayoutType = 'public' | 'customer' | 'barber' | 'admin' | 'founder' | 'minimal';

export interface RouteConfig {
  path: string;
  title: string;
  authRequired: boolean;
  /** Empty array = any authenticated user. Undefined = no role check. */
  allowedRoles?: AppRole[];
  /** If true, user needs ANY of the roles. If false, needs ALL. Default: true */
  requireAnyRole?: boolean;
  layout: LayoutType;
  /** Show in primary navigation */
  navVisible: boolean;
  /** Navigation group for organizing nav items */
  navGroup?: 'public' | 'customer' | 'barber' | 'admin' | 'founder';
  /** Nav icon name (for programmatic icon rendering) */
  navIcon?: string;
  /** Nav order within group */
  navOrder?: number;
}

// ─── Public / Marketing ──────────────────────────────────────────────
export const publicRoutes: RouteConfig[] = [
  { path: '/', title: 'Home', authRequired: false, layout: 'public', navVisible: false },
  { path: '/about', title: 'About', authRequired: false, layout: 'public', navVisible: false },
  { path: '/contact', title: 'Contact', authRequired: false, layout: 'public', navVisible: false },
  { path: '/careers', title: 'Careers', authRequired: false, layout: 'public', navVisible: false },
  { path: '/press', title: 'Press', authRequired: false, layout: 'public', navVisible: false },
  { path: '/pricing', title: 'Pricing', authRequired: false, layout: 'public', navVisible: false },
  { path: '/terms', title: 'Terms of Service', authRequired: false, layout: 'public', navVisible: false },
  { path: '/privacy', title: 'Privacy Policy', authRequired: false, layout: 'public', navVisible: false },
  { path: '/cookies', title: 'Cookie Policy', authRequired: false, layout: 'public', navVisible: false },
  { path: '/how-it-works', title: 'How It Works', authRequired: false, layout: 'public', navVisible: true, navGroup: 'public', navOrder: 2 },
  { path: '/for-professionals', title: 'For Professionals', authRequired: false, layout: 'public', navVisible: true, navGroup: 'public', navOrder: 3 },
  { path: '/install', title: 'Install App', authRequired: false, layout: 'public', navVisible: false },
  { path: '/barbers', title: 'Find Barbers', authRequired: false, layout: 'public', navVisible: true, navGroup: 'public', navOrder: 1 },
  { path: '/barber/:id', title: 'Barber Profile', authRequired: false, layout: 'public', navVisible: false },
];

// ─── Auth (minimal layout, no nav chrome) ────────────────────────────
export const authRoutes: RouteConfig[] = [
  { path: '/auth', title: 'Sign In', authRequired: false, layout: 'minimal', navVisible: false },
  { path: '/verify-email', title: 'Verify Email', authRequired: false, layout: 'minimal', navVisible: false },
  { path: '/reset-password', title: 'Reset Password', authRequired: false, layout: 'minimal', navVisible: false },
];

// ─── Customer ────────────────────────────────────────────────────────
export const customerRoutes: RouteConfig[] = [
  { path: '/bookings', title: 'My Bookings', authRequired: true, layout: 'customer', navVisible: true, navGroup: 'customer', navIcon: 'Calendar', navOrder: 1 },
  { path: '/profile', title: 'Profile', authRequired: true, layout: 'customer', navVisible: true, navGroup: 'customer', navIcon: 'User', navOrder: 2 },
  { path: '/loyalty', title: 'Loyalty Program', authRequired: true, layout: 'customer', navVisible: false },
  { path: '/payment-success', title: 'Payment Success', authRequired: true, layout: 'customer', navVisible: false },
  { path: '/settings/payment-methods', title: 'Payment Methods', authRequired: true, layout: 'customer', navVisible: false },
  { path: '/settings/notifications', title: 'Notifications', authRequired: true, layout: 'customer', navVisible: false },
  { path: '/settings/language-region', title: 'Language & Region', authRequired: true, layout: 'customer', navVisible: false },
  { path: '/settings/saved-barbers', title: 'Saved Barbers', authRequired: true, layout: 'customer', navVisible: false },
  { path: '/settings/2fa', title: 'Two-Factor Auth', authRequired: true, layout: 'customer', navVisible: false },
];

// ─── Barber Dashboard ────────────────────────────────────────────────
export const barberRoutes: RouteConfig[] = [
  { path: '/barber-onboarding', title: 'Barber Onboarding', authRequired: true, layout: 'customer', navVisible: false },
  { path: '/dashboard', title: 'Dashboard', authRequired: true, allowedRoles: ['barber'], layout: 'barber', navVisible: true, navGroup: 'barber', navIcon: 'LayoutDashboard', navOrder: 1 },
  { path: '/dashboard/profile', title: 'Shop Profile', authRequired: true, allowedRoles: ['barber'], layout: 'barber', navVisible: true, navGroup: 'barber', navIcon: 'User', navOrder: 2 },
  { path: '/dashboard/services', title: 'Services', authRequired: true, allowedRoles: ['barber'], layout: 'barber', navVisible: true, navGroup: 'barber', navIcon: 'Scissors', navOrder: 3 },
  { path: '/dashboard/calendar', title: 'Calendar', authRequired: true, allowedRoles: ['barber'], layout: 'barber', navVisible: true, navGroup: 'barber', navIcon: 'Calendar', navOrder: 4 },
  { path: '/dashboard/earnings', title: 'Earnings', authRequired: true, allowedRoles: ['barber'], layout: 'barber', navVisible: true, navGroup: 'barber', navIcon: 'DollarSign', navOrder: 5 },
  { path: '/dashboard/analytics', title: 'Analytics', authRequired: true, allowedRoles: ['barber'], layout: 'barber', navVisible: true, navGroup: 'barber', navIcon: 'TrendingUp', navOrder: 6 },
  { path: '/dashboard/customers', title: 'Customers', authRequired: true, allowedRoles: ['barber'], layout: 'barber', navVisible: true, navGroup: 'barber', navIcon: 'Users', navOrder: 7 },
  { path: '/dashboard/reviews', title: 'Reviews', authRequired: true, allowedRoles: ['barber'], layout: 'barber', navVisible: true, navGroup: 'barber', navIcon: 'Star', navOrder: 8 },
  { path: '/dashboard/messages', title: 'Messages', authRequired: true, allowedRoles: ['barber'], layout: 'barber', navVisible: true, navGroup: 'barber', navIcon: 'MessageSquare', navOrder: 9 },
];

// ─── Admin ───────────────────────────────────────────────────────────
export const adminRoutes: RouteConfig[] = [
  { path: '/admin/barber-verification', title: 'Barber Verification', authRequired: true, allowedRoles: ['admin', 'founder'], layout: 'admin', navVisible: true, navGroup: 'admin', navIcon: 'Shield', navOrder: 1 },
  { path: '/admin/reports', title: 'Reports', authRequired: true, allowedRoles: ['admin', 'founder'], layout: 'admin', navVisible: true, navGroup: 'admin', navIcon: 'AlertTriangle', navOrder: 2 },
  { path: '/admin/loyalty-rewards', title: 'Loyalty Rewards', authRequired: true, allowedRoles: ['admin', 'founder'], layout: 'admin', navVisible: true, navGroup: 'admin', navIcon: 'Star', navOrder: 3 },
];

// ─── Founder ─────────────────────────────────────────────────────────
export const founderRoutes: RouteConfig[] = [
  { path: '/founder/admin-management', title: 'Admin Management', authRequired: true, allowedRoles: ['founder'], layout: 'founder', navVisible: true, navGroup: 'founder', navIcon: 'Crown', navOrder: 1 },
  { path: '/founder/activity-log', title: 'Activity Log', authRequired: true, allowedRoles: ['founder'], layout: 'founder', navVisible: true, navGroup: 'founder', navIcon: 'Activity', navOrder: 2 },
  { path: '/founder/dashboard', title: 'Founder Dashboard', authRequired: true, allowedRoles: ['founder'], layout: 'founder', navVisible: true, navGroup: 'founder', navIcon: 'LayoutDashboard', navOrder: 3 },
  { path: '/founder/email-preview', title: 'Email Preview', authRequired: true, allowedRoles: ['founder'], layout: 'founder', navVisible: true, navGroup: 'founder', navIcon: 'Mail', navOrder: 4 },
];

// ─── Dev-only routes ─────────────────────────────────────────────────
export const devRoutes: RouteConfig[] = [
  { path: '/dev/screenshots', title: 'Screenshot Mockups', authRequired: false, layout: 'minimal', navVisible: false },
];

/** All routes combined */
export const allRoutes: RouteConfig[] = [
  ...publicRoutes,
  ...authRoutes,
  ...customerRoutes,
  ...barberRoutes,
  ...adminRoutes,
  ...founderRoutes,
  ...devRoutes,
];

/** Look up a route config by path (static segments only, ignores params) */
export function findRouteConfig(pathname: string): RouteConfig | undefined {
  // Strip language prefix
  const cleanPath = pathname.replace(/^\/(de|fr|it)(\/|$)/, '/');
  
  return allRoutes.find(r => {
    // Handle dynamic segments like :id
    const pattern = r.path.replace(/:[^/]+/g, '[^/]+');
    const regex = new RegExp(`^${pattern}$`);
    return regex.test(cleanPath);
  });
}

/** Get visible nav routes for a specific group */
export function getNavRoutes(group: RouteConfig['navGroup']): RouteConfig[] {
  return allRoutes
    .filter(r => r.navVisible && r.navGroup === group)
    .sort((a, b) => (a.navOrder ?? 99) - (b.navOrder ?? 99));
}
