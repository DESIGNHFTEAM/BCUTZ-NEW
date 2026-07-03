// Shared CORS utility for edge functions.
//
// SECURITY (finding #4): we no longer reflect a wildcard `*` origin. Instead we
// keep an explicit allow-list of the domains the BCUTZ frontend is served from
// and echo the request's Origin only when it matches. Browser callers from any
// other origin receive the primary production origin in Access-Control-Allow-Origin,
// which their browser rejects (the values won't match) — so cross-origin abuse
// from arbitrary sites is blocked, while every legitimate BCUTZ surface keeps working.
//
// Server-to-server callers (cron jobs, Stripe webhook, internal invokes) send no
// Origin header and don't enforce CORS, so they are unaffected by this list.

const ALLOWED_ORIGINS: readonly string[] = [
  "https://bcutz.com",
  "https://www.bcutz.com",
  "https://bcutz.lovable.app",
  "https://preview--bcutz.lovable.app",
  // Local development (Vite / Capacitor live-reload)
  "http://localhost:5173",
  "http://localhost:8080",
  "http://localhost:3000",
  "capacitor://localhost",
];

// Primary origin used as the fallback when the request Origin is missing or not
// allow-listed. Keeping a real origin here (never `*`) means disallowed browser
// origins get a value that fails their same-origin comparison.
const PRIMARY_ORIGIN = "https://bcutz.com";

const BASE_ALLOW_HEADERS =
  "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version";

function resolveOrigin(req?: Request): string {
  const origin = req?.headers.get("Origin");
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    return origin;
  }
  return PRIMARY_ORIGIN;
}

// Get CORS headers for a request. Pass the Request so the Origin can be matched
// against the allow-list; `additionalHeaders` appends to Access-Control-Allow-Headers.
export function getCorsHeaders(req?: Request, additionalHeaders?: string): Record<string, string> {
  const allowHeaders = additionalHeaders
    ? `${BASE_ALLOW_HEADERS}, ${additionalHeaders}`
    : BASE_ALLOW_HEADERS;
  return {
    "Access-Control-Allow-Origin": resolveOrigin(req),
    "Access-Control-Allow-Headers": allowHeaders,
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    // Prevent shared caches from serving one origin's CORS response to another.
    "Vary": "Origin",
  };
}

// Helper to handle OPTIONS (preflight) requests.
export function handleCorsPreflightRequest(req?: Request, additionalHeaders?: string): Response {
  return new Response(null, { headers: getCorsHeaders(req, additionalHeaders) });
}

// Backward-compatible helpers (now backed by the real allow-list).
export function getAllowedOrigins(): string[] {
  return [...ALLOWED_ORIGINS];
}

export function isOriginAllowed(origin: string | null): boolean {
  return !!origin && ALLOWED_ORIGINS.includes(origin);
}
