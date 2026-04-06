/**
 * RouteGuard — config-driven route protection.
 * 
 * Reads route metadata from the central config and enforces auth + role rules.
 * Unlike per-page auth checks, this ensures no protected UI is ever rendered
 * before validation completes.
 */

import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, type AppRole } from '@/lib/auth';
import { Loader2 } from 'lucide-react';
import { type RouteConfig } from '@/config/routes';

interface RouteGuardProps {
  children: ReactNode;
  config: RouteConfig;
}

export function RouteGuard({ children, config }: RouteGuardProps) {
  const { user, isLoading, hasRole } = useAuth();
  const location = useLocation();

  // Show loading spinner while auth state is resolving
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Route doesn't require auth — render immediately
  if (!config.authRequired) {
    return <>{children}</>;
  }

  // Auth required but user not logged in — redirect to auth with return URL
  if (!user) {
    const returnTo = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/auth?returnTo=${returnTo}`} replace />;
  }

  // Check role requirements
  if (config.allowedRoles && config.allowedRoles.length > 0) {
    const requireAny = config.requireAnyRole !== false; // default true
    const hasRequiredRole = requireAny
      ? config.allowedRoles.some(role => hasRole(role))
      : config.allowedRoles.every(role => hasRole(role));

    if (!hasRequiredRole) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <>{children}</>;
}
