import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.22.4";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

// UUID validation regex
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Input validation schema with strict limits
const NotificationRequestSchema = z.object({
  userId: z.string().regex(uuidRegex, "Invalid UUID format").optional(),
  userIds: z.array(z.string().regex(uuidRegex, "Invalid UUID format")).max(100, "Maximum 100 users per request").optional(),
  title: z.string().min(1, "Title is required").max(100, "Title must be 100 characters or less"),
  body: z.string().min(1, "Body is required").max(500, "Body must be 500 characters or less"),
  data: z.record(z.string().max(200, "Data values must be 200 characters or less")).optional(),
  imageUrl: z.string().url("Invalid image URL").max(2048, "Image URL too long").optional(),
});

type NotificationRequest = z.infer<typeof NotificationRequestSchema>;

interface FCMMessage {
  message: {
    token: string;
    notification: {
      title: string;
      body: string;
      image?: string;
    };
    data?: Record<string, string>;
    android?: {
      priority: string;
      notification: {
        sound: string;
        click_action: string;
        channel_id: string;
      };
    };
    apns?: {
      payload: {
        aps: {
          sound: string;
          badge: number;
          'mutable-content': number;
        };
      };
    };
  };
}

function logStep(step: string, details?: unknown) {
  console.log(`[PUSH-NOTIFICATION] ${step}`, details ? JSON.stringify(details) : '');
}

async function getAccessToken(serviceAccount: {
  client_email: string;
  private_key: string;
  token_uri: string;
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 3600;

  // Create JWT header and claims
  const header = { alg: 'RS256', typ: 'JWT' };
  const claims = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: serviceAccount.token_uri,
    iat: now,
    exp: exp,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
  };

  // Base64URL encode
  const base64url = (data: unknown): string => {
    const json = JSON.stringify(data);
    const bytes = new TextEncoder().encode(json);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };

  const headerB64 = base64url(header);
  const claimsB64 = base64url(claims);
  const signatureInput = `${headerB64}.${claimsB64}`;

  // Import private key and sign
  const pemContents = serviceAccount.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\n/g, '');
  
  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBytes = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signatureInput)
  );

  let signatureB64 = '';
  const signatureArray = new Uint8Array(signatureBytes);
  for (let i = 0; i < signatureArray.length; i++) {
    signatureB64 += String.fromCharCode(signatureArray[i]);
  }
  signatureB64 = btoa(signatureB64).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const jwt = `${signatureInput}.${signatureB64}`;

  // Exchange JWT for access token
  const tokenResponse = await fetch(serviceAccount.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    throw new Error(`Failed to get access token: ${error}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

async function sendFCMMessage(
  accessToken: string,
  projectId: string,
  message: FCMMessage
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      logStep('FCM send failed', error);
      return { success: false, error: error.error?.message || 'Unknown error' };
    }

    const result = await response.json();
    logStep('FCM send success', { messageId: result.name });
    return { success: true };
  } catch (error) {
    logStep('FCM send error', error);
    return { success: false, error: String(error) };
  }
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }

  try {
    logStep('Starting push notification send');

    // SECURITY: Verify service role authentication
    // This function should ONLY be called by other edge functions using the service role key
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      logStep('Unauthorized: Missing Authorization header');
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized: Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!serviceRoleKey || token !== serviceRoleKey) {
      logStep('Forbidden: Service role authentication required');
      return new Response(
        JSON.stringify({ success: false, error: 'Forbidden: Service role authentication required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logStep('Service role authentication verified');

    const serviceAccountJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_KEY');
    if (!serviceAccountJson) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY not configured');
    }

    const serviceAccount = JSON.parse(serviceAccountJson);
    const projectId = serviceAccount.project_id;

    if (!projectId) {
      throw new Error('Invalid service account: missing project_id');
    }

    logStep('Service account loaded', { projectId });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse and validate input
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      throw new Error('Invalid JSON in request body');
    }

    const parseResult = NotificationRequestSchema.safeParse(rawBody);
    if (!parseResult.success) {
      const errorMessage = parseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new Error(`Validation failed: ${errorMessage}`);
    }

    const { userId, userIds, title, body: notificationBody, data, imageUrl } = parseResult.data;

    const targetUserIds = userIds || (userId ? [userId] : []);
    
    if (targetUserIds.length === 0) {
      throw new Error('No target users specified');
    }

    logStep('Fetching push tokens', { userCount: targetUserIds.length });

    // Fetch all push tokens for target users
    const { data: tokens, error: tokensError } = await supabase
      .from('push_tokens')
      .select('token, platform, user_id')
      .in('user_id', targetUserIds);

    if (tokensError) {
      throw new Error(`Failed to fetch tokens: ${tokensError.message}`);
    }

    if (!tokens || tokens.length === 0) {
      logStep('No push tokens found for users');
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No push tokens found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logStep('Found push tokens', { count: tokens.length });

    // Get access token for FCM
    const accessToken = await getAccessToken(serviceAccount);
    logStep('Got FCM access token');

    // Prepare data payload (FCM requires all values to be strings)
    const dataPayload: Record<string, string> = {};
    if (data) {
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) {
          dataPayload[key] = String(value);
        }
      });
    }

    // Send to all tokens
    const results = await Promise.all(
      tokens.map(async ({ token, platform }) => {
        const message: FCMMessage = {
          message: {
            token,
            notification: {
              title,
              body: notificationBody,
              ...(imageUrl && { image: imageUrl }),
            },
            ...(Object.keys(dataPayload).length > 0 && { data: dataPayload }),
            android: {
              priority: 'high',
              notification: {
                sound: 'default',
                click_action: 'FLUTTER_NOTIFICATION_CLICK',
                channel_id: 'bcutz_notifications',
              },
            },
            apns: {
              payload: {
                aps: {
                  sound: 'default',
                  badge: 1,
                  'mutable-content': 1,
                },
              },
            },
          },
        };

        const result = await sendFCMMessage(accessToken, projectId, message);
        
        // If token is invalid, remove it from database
        if (!result.success && result.error?.includes('not a valid FCM registration token')) {
          await supabase.from('push_tokens').delete().eq('token', token);
          logStep('Removed invalid token', { platform });
        }

        return { token: token.substring(0, 20) + '...', platform, ...result };
      })
    );

    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    logStep('Push notification send complete', { successCount, failedCount });

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        failed: failedCount,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    logStep('Error', error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
