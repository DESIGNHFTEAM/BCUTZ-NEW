/**
 * Layout wrappers — provide shared page chrome (Navbar, Footer) per layout type.
 * 
 * Architecture: Pages never import Navbar/Footer directly. The LayoutRouter
 * selects the correct layout shell based on route config, ensuring consistent
 * chrome and preventing duplicate rendering.
 */

import { ReactNode } from 'react';
import { type LayoutType } from '@/config/routes';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

// ─── Public Marketing ───────────────────────────────────────────────
// Full navbar + footer for public-facing pages.
export function PublicMarketingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Navbar />
      <div className="pt-14 md:pt-16">{children}</div>
      <Footer />
    </>
  );
}

// ─── Customer App ───────────────────────────────────────────────────
// Signed-in customer shell with navbar + footer.
export function CustomerAppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Navbar />
      <div className="pt-14 md:pt-16">{children}</div>
      <Footer />
    </>
  );
}

// ─── Barber Dashboard ───────────────────────────────────────────────
// Barber dashboard shell — navbar, no footer (dashboard UIs rarely need one).
export function BarberDashboardLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Navbar />
      <div className="pt-14 md:pt-16">{children}</div>
    </>
  );
}

// ─── Admin / Founder ────────────────────────────────────────────────
// Admin shell — navbar only.
export function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Navbar />
      <div className="pt-14 md:pt-16">{children}</div>
    </>
  );
}

// ─── Minimal (Auth, Verify, Reset) ──────────────────────────────────
// No navbar or footer — clean auth experience.
export function MinimalLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

// ─── Layout Router ──────────────────────────────────────────────────

interface LayoutRouterProps {
  layout: LayoutType;
  children: ReactNode;
}

export function LayoutRouter({ layout, children }: LayoutRouterProps) {
  switch (layout) {
    case 'public':
      return <PublicMarketingLayout>{children}</PublicMarketingLayout>;
    case 'customer':
      return <CustomerAppLayout>{children}</CustomerAppLayout>;
    case 'barber':
      return <BarberDashboardLayout>{children}</BarberDashboardLayout>;
    case 'admin':
    case 'founder':
      return <AdminLayout>{children}</AdminLayout>;
    case 'minimal':
      return <MinimalLayout>{children}</MinimalLayout>;
    default:
      return <PublicMarketingLayout>{children}</PublicMarketingLayout>;
  }
}
