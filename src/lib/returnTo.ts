/**
 * Safe returnTo URL validation.
 * 
 * Prevents open redirect attacks by ensuring the returnTo value is:
 * 1. A relative path starting with /
 * 2. Not an external URL (no protocol://)
 * 3. Not a protocol-relative URL (no //)
 * 4. Contains only safe characters
 */

import { allRoutes, findRouteConfig } from '@/config/routes';
import { type AppRole } from '@/lib/auth';

/**
 * Check if a returnTo path is a safe internal route.
 * Rejects external URLs, malformed values, and non-existent routes.
 */
export function isSafeInternalReturnTo(path: string | null | undefined): path is string {
  if (!path || typeof path !== 'string') return false;

  // Must start with exactly one /
  if (!path.startsWith('/') || path.startsWith('//')) return false;

  // Reject anything that looks like a full URL
  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(path)) return false;

  // Reject paths with backslashes (Windows path traversal)
  if (path.includes('\\')) return false;

  // Reject data: or javascript: URIs that might sneak in
  if (/^\/?(javascript|data|vbscript):/i.test(path)) return false;

  // Strip query params for route matching
  const pathOnly = path.split('?')[0].split('#')[0];

  // Must match a known route in our config
  const routeConfig = findRouteConfig(pathOnly);
  if (!routeConfig) return false;

  return true;
}

/**
 * Check if a returnTo path is accessible for a user with given roles.
 */
export function isReturnToAllowedForRoles(path: string, roles: AppRole[]): boolean {
  const pathOnly = path.split('?')[0].split('#')[0];
  const routeConfig = findRouteConfig(pathOnly);
  
  if (!routeConfig) return false;
  
  // Public routes are always fine
  if (!routeConfig.authRequired) return true;
  
  // No role restriction = any authenticated user
  if (!routeConfig.allowedRoles || routeConfig.allowedRoles.length === 0) return true;
  
  // Check if user has at least one of the allowed roles
  return routeConfig.allowedRoles.some(role => roles.includes(role));
}

/**
 * Get the default post-login redirect based on the user's highest-priority role.
 */
export function getDefaultRedirectForRole(roles: AppRole[]): string {
  if (roles.includes('founder')) return '/founder/dashboard';
  if (roles.includes('admin')) return '/admin/barber-verification';
  if (roles.includes('barber')) return '/dashboard';
  return '/bookings';
}
