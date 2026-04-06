import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { sendEmail } from "../_shared/smtp.ts";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[RE-ENGAGEMENT] ${step}${detailsStr}`);
};

function generateReengagementEmail(name: string, daysSinceLastBooking: number): string {
  const year = new Date().getFullYear();
  
  return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>We Miss You - BCUTZ</title></head>' +
    '<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif;">' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0a0a0a;">' +
    '<tr><td align="center" style="padding:40px 20px;">' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;">' +
    '<tr><td align="center" style="padding-bottom:32px;"><h1 style="margin:0;font-size:48px;font-weight:700;color:#c9a227;font-family:Georgia,serif;letter-spacing:2px;">BCUTZ</h1></td></tr>' +
    '<tr><td style="background-color:#111;border:1px solid #222;padding:32px;">' +
    '<div style="display:inline-block;background:rgba(201,162,39,0.15);color:#c9a227;border:1px solid #c9a227;padding:6px 14px;border-radius:4px;font-size:12px;font-weight:600;letter-spacing:0.5px;margin-bottom:16px;">WE MISS YOU</div>' +
    '<h2 style="color:#fff;font-size:22px;font-weight:600;margin:0 0 16px 0;line-height:1.3;">It\'s been a while</h2>' +
    '<p style="color:#888;font-size:14px;margin:0 0 20px 0;">Hey ' + name + ',</p>' +
    '<div style="color:#aaa;font-size:14px;line-height:1.7;">' +
    '<p style="margin:0 0 16px 0;">It\'s been <strong style="color:#c9a227;">' + daysSinceLastBooking + ' days</strong> since your last booking with BCUTZ. Your hair deserves the best care!</p>' +
    '<div style="background:rgba(201,162,39,0.1);border:1px solid #c9a227;padding:20px;margin:24px 0;text-align:center;">' +
    '<p style="color:#c9a227;font-weight:600;margin:0 0 8px 0;font-size:12px;letter-spacing:1px;">WELCOME BACK OFFER</p>' +
    '<p style="color:#fff;font-size:24px;font-weight:700;margin:0 0 8px 0;">20% OFF + 2X POINTS</p>' +
    '<p style="color:#888;font-size:12px;margin:0;">Book within 48 hours · Code: COMEBACK20</p>' +
    '</div>' +
    '<p style="color:#c9a227;font-weight:600;margin:24px 0 12px 0;font-size:12px;text-transform:uppercase;letter-spacing:1px;">While you were away:</p>' +
    '<ul style="list-style:none;padding:0;margin:0;">' +
    '<li style="padding:8px 0;color:#aaa;"><span style="color:#c9a227;margin-right:8px;">&#10003;</span> New barbers joined in your area</li>' +
    '<li style="padding:8px 0;color:#aaa;"><span style="color:#c9a227;margin-right:8px;">&#10003;</span> Express booking - book in 30 seconds</li>' +
    '<li style="padding:8px 0;color:#aaa;"><span style="color:#c9a227;margin-right:8px;">&#10003;</span> Your favorite barbers have fresh availability</li>' +
    '<li style="padding:8px 0;color:#aaa;"><span style="color:#c9a227;margin-right:8px;">&#10003;</span> Loyalty points waiting to be earned</li>' +
    '</ul></div>' +
    '<div style="margin:32px 0;text-align:center;">' +
    '<a href="https://bcutz.com/barbers" style="display:inline-block;background:#c9a227;color:#0a0a0a;text-decoration:none;padding:14px 32px;font-weight:600;letter-spacing:1px;font-size:14px;">BOOK NOW & SAVE 20%</a>' +
    '</div></td></tr>' +
    '<tr><td style="padding:24px 0;text-align:center;">' +
    '<p style="color:#444;font-size:11px;margin:0;">&copy; ' + year + ' BCUTZ. All rights reserved.</p>' +
    '<p style="margin:12px 0 0 0;"><a href="https://bcutz.com" style="color:#c9a227;font-size:11px;text-decoration:none;">bcutz.com</a></p>' +
    '</td></tr></table></td></tr></table></body></html>';
}

serve(async (req) => {
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
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Starting re-engagement email campaign");

    const body = await req.json().catch(() => ({}));
    const { test_mode, test_email } = body;

    // Handle test mode - send sample email without real user data
    if (test_mode && test_email) {
      logStep("Test mode activated", { test_email });
      
      const emailHtml = generateReengagementEmail('BCUTZ Team', 45);
      await sendEmail({ to: test_email, subject: "We Miss You! Here's 20% OFF Your Next Booking - BCUTZ", html: emailHtml });
      
      logStep("Test re-engagement email sent", { to: test_email });
      return new Response(JSON.stringify({ success: true, emailsSent: 1, test: true, sentTo: test_email }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: profiles, error: profilesError } = await supabaseClient
      .from('profiles')
      .select('id, email, full_name')
      .not('email', 'is', null);

    if (profilesError) {
      throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
    }

    logStep("Found profiles to check", { count: profiles?.length || 0 });

    let emailsSent = 0;
    const errors: string[] = [];

    for (const profile of profiles || []) {
      try {
        const { data: roles } = await supabaseClient
          .from('user_roles')
          .select('role')
          .eq('user_id', profile.id);

        const isCustomer = roles?.some(r => r.role === 'customer') || !roles?.length;
        if (!isCustomer) continue;

        const { data: lastBooking } = await supabaseClient
          .from('bookings')
          .select('booking_date')
          .eq('customer_id', profile.id)
          .eq('status', 'completed')
          .order('booking_date', { ascending: false })
          .limit(1)
          .single();

        if (!lastBooking) continue;

        const lastBookingDate = new Date(lastBooking.booking_date);
        const daysSinceLastBooking = Math.floor(
          (Date.now() - lastBookingDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysSinceLastBooking >= 30 && daysSinceLastBooking <= 60) {
          const { data: recentNotification } = await supabaseClient
            .from('notifications')
            .select('id')
            .eq('user_id', profile.id)
            .eq('type', 'reengagement')
            .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
            .single();

          if (recentNotification) {
            logStep("Skipping user - already sent recently", { userId: profile.id });
            continue;
          }

          const emailHtml = generateReengagementEmail(profile.full_name || 'there', daysSinceLastBooking);

          await sendEmail({ to: profile.email, subject: "We Miss You! Here's 20% OFF Your Next Booking - BCUTZ", html: emailHtml });

          await supabaseClient.from('notifications').insert({
            user_id: profile.id,
            type: 'reengagement',
            title: 'Re-engagement Email Sent',
            message: `Re-engagement email sent after ${daysSinceLastBooking} days of inactivity`,
            is_read: true
          });

          emailsSent++;
          logStep("Sent re-engagement email", { email: profile.email, daysSinceLastBooking });
        }
      } catch (userError: any) {
        errors.push(`${profile.email}: ${userError.message}`);
        logStep("Error processing user", { email: profile.email, error: userError.message });
      }
    }

    logStep("Re-engagement campaign completed", { emailsSent, errors: errors.length });

    return new Response(
      JSON.stringify({ success: true, emailsSent, errors: errors.length > 0 ? errors : undefined }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    logStep("Error in re-engagement campaign", { error: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
