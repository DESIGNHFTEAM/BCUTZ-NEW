import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { sendEmail } from "../_shared/smtp.ts";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[WELCOME-EMAIL] ${step}${detailsStr}`);
};

interface WelcomeEmailRequest {
  email: string;
  name?: string;
  userType?: 'customer' | 'barber';
}

function generateWelcomeEmail(name: string, isBarber: boolean): string {
  const displayName = name || "there";
  const year = new Date().getFullYear();
  
  // Customer benefits - focused on convenience and rewards
  const customerContent = '<p style="margin:0 0 16px 0;">Thank you for joining BCUTZ! We\'re excited to have you as part of our community.</p>' +
    '<div style="background:#0a0a0a;border:1px solid #222;padding:20px;margin:24px 0;">' +
    '<p style="color:#c9a227;font-weight:600;margin:0 0 12px 0;">Your BCUTZ Benefits:</p>' +
    '<ul style="list-style:none;padding:0;margin:0;">' +
    '<li style="padding:8px 0;color:#aaa;"><span style="color:#c9a227;margin-right:8px;">&#10003;</span> Discover top-rated barbers near you</li>' +
    '<li style="padding:8px 0;color:#aaa;"><span style="color:#c9a227;margin-right:8px;">&#10003;</span> Book appointments 24/7 in seconds</li>' +
    '<li style="padding:8px 0;color:#aaa;"><span style="color:#c9a227;margin-right:8px;">&#10003;</span> Earn loyalty points with every booking</li>' +
    '<li style="padding:8px 0;color:#aaa;"><span style="color:#c9a227;margin-right:8px;">&#10003;</span> Redeem points for exclusive discounts</li>' +
    '<li style="padding:8px 0;color:#aaa;"><span style="color:#c9a227;margin-right:8px;">&#10003;</span> Read real reviews from verified customers</li>' +
    '</ul></div>' +
    '<p style="margin:0;">Ready for your next fresh cut? Browse our talented barbers and book your first appointment today.</p>';

  // Barber benefits - focused on business growth and tools
  const barberContent = '<p style="margin:0 0 16px 0;">Welcome to BCUTZ! You\'ve just joined a growing community of professional barbers building their businesses.</p>' +
    '<div style="background:#0a0a0a;border:1px solid #222;padding:20px;margin:24px 0;">' +
    '<p style="color:#c9a227;font-weight:600;margin:0 0 12px 0;">Your Business Benefits:</p>' +
    '<ul style="list-style:none;padding:0;margin:0;">' +
    '<li style="padding:8px 0;color:#aaa;"><span style="color:#c9a227;margin-right:8px;">&#10003;</span> Get discovered by new clients in your area</li>' +
    '<li style="padding:8px 0;color:#aaa;"><span style="color:#c9a227;margin-right:8px;">&#10003;</span> Manage your schedule and bookings in one place</li>' +
    '<li style="padding:8px 0;color:#aaa;"><span style="color:#c9a227;margin-right:8px;">&#10003;</span> Set your own prices and services</li>' +
    '<li style="padding:8px 0;color:#aaa;"><span style="color:#c9a227;margin-right:8px;">&#10003;</span> Accept secure payments via Stripe</li>' +
    '<li style="padding:8px 0;color:#aaa;"><span style="color:#c9a227;margin-right:8px;">&#10003;</span> Build your reputation with verified reviews</li>' +
    '<li style="padding:8px 0;color:#aaa;"><span style="color:#c9a227;margin-right:8px;">&#10003;</span> Track your earnings and analytics</li>' +
    '</ul></div>' +
    '<div style="background:#0a0a0a;border:1px solid #222;padding:20px;margin:24px 0;">' +
    '<p style="color:#c9a227;font-weight:600;margin:0 0 12px 0;">Get Started in 3 Steps:</p>' +
    '<ul style="list-style:none;padding:0;margin:0;">' +
    '<li style="padding:8px 0;color:#aaa;"><span style="color:#c9a227;margin-right:8px;">1.</span> Complete your profile with photos and bio</li>' +
    '<li style="padding:8px 0;color:#aaa;"><span style="color:#c9a227;margin-right:8px;">2.</span> Add your services and set your hours</li>' +
    '<li style="padding:8px 0;color:#aaa;"><span style="color:#c9a227;margin-right:8px;">3.</span> Connect Stripe to start receiving bookings</li>' +
    '</ul></div>' +
    '<p style="margin:0;">Questions? Reply to this email - we\'re here to help you grow.</p>';

  const content = isBarber ? barberContent : customerContent;
  const title = isBarber ? "Welcome to BCUTZ" : "Welcome to BCUTZ";
  const ctaText = isBarber ? "COMPLETE YOUR PROFILE" : "FIND A BARBER";
  const ctaUrl = isBarber ? "https://bcutz.lovable.app/dashboard" : "https://bcutz.lovable.app/barbers";
  const badgeText = isBarber ? "BARBER ACCOUNT" : "NEW MEMBER";

  return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>' + title + '</title></head>' +
    '<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif;">' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0a0a0a;">' +
    '<tr><td align="center" style="padding:40px 20px;">' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;">' +
'<tr><td align="center" style="padding-bottom:32px;"><h1 style="margin:0;font-size:48px;font-weight:700;color:#c9a227;font-family:Georgia,serif;letter-spacing:2px;">BCUTZ</h1></td></tr>' +
    '<tr><td style="background-color:#111;border:1px solid #222;padding:32px;">' +
    '<div style="display:inline-block;background:rgba(201,162,39,0.15);color:#c9a227;border:1px solid #c9a227;padding:6px 14px;border-radius:4px;font-size:12px;font-weight:600;letter-spacing:0.5px;margin-bottom:16px;">' + badgeText + '</div>' +
    '<h2 style="color:#fff;font-size:22px;font-weight:600;margin:0 0 16px 0;line-height:1.3;">' + title + '</h2>' +
    '<p style="color:#888;font-size:14px;margin:0 0 20px 0;">Hey ' + displayName + ',</p>' +
    '<div style="color:#aaa;font-size:14px;line-height:1.7;">' + content + '</div>' +
    '<div style="margin:32px 0;text-align:center;">' +
    '<a href="' + ctaUrl + '" style="display:inline-block;background:#c9a227;color:#0a0a0a;text-decoration:none;padding:14px 32px;font-weight:600;letter-spacing:1px;font-size:14px;">' + ctaText + '</a>' +
    '</div></td></tr>' +
    '<tr><td style="padding:24px 0;text-align:center;">' +
    '<p style="color:#444;font-size:11px;margin:0;">&copy; ' + year + ' BCUTZ. All rights reserved.</p>' +
    '<p style="margin:12px 0 0 0;"><a href="https://bcutz.lovable.app" style="color:#c9a227;font-size:11px;text-decoration:none;">bcutz.lovable.app</a></p>' +
    '</td></tr></table></td></tr></table></body></html>';
}

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  try {
    // SECURITY: Require service-role authentication
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceRoleKey || token !== serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Service role authentication required" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { email, name, userType = 'customer' }: WelcomeEmailRequest = await req.json();
    logStep("Processing welcome email request", { email, name, userType });

    if (!email) {
      throw new Error("Email is required");
    }

    const isBarber = userType === 'barber';
    const subject = isBarber 
      ? "Welcome to BCUTZ - Let's Grow Your Business" 
      : "Welcome to BCUTZ - Your Fresh Cut Awaits";
    
    const htmlContent = generateWelcomeEmail(name || "there", isBarber);

    await sendEmail({ to: email, subject: subject, html: htmlContent });

    logStep("Welcome email sent successfully", { email, userType });

    return new Response(
      JSON.stringify({ success: true, message: "Welcome email sent" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    logStep("Error sending welcome email", { error: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
