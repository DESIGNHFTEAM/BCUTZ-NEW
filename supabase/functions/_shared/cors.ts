// Shared CORS utility for edge functions
// Uses wildcard CORS to ensure compatibility across all deployment domains

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Get CORS headers for a request
export function getCorsHeaders(_req?: Request, _additionalHeaders?: string): Record<string, string> {
  return corsHeaders;
}

// Helper to handle OPTIONS requests
export function handleCorsPreflightRequest(_req?: Request, _additionalHeaders?: string): Response {
  return new Response(null, { headers: corsHeaders });
}

// Keep for backward compatibility
export function getAllowedOrigins(): string[] {
  return ['*'];
}

export function isOriginAllowed(_origin: string | null): boolean {
  return true;
}
