import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { sendEmail } from "../_shared/smtp.ts";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VOUCHER-EXPIRY] ${step}${detailsStr}`);
};

function generateVoucherExpiryEmail(name: string, voucherCode: string, discountText: string, expiryDate: string): string {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Voucher Expiring Soon - BCUTZ</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0a0a0a;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 520px;">
          
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <h1 style="margin:0;font-size:48px;font-weight:700;color:#c9a227;font-family:Georgia,serif;letter-spacing:2px;">BCUTZ</h1>
            </td>
          </tr>
          
          <tr>
            <td style="background-color: #111; border: 1px solid #222; padding: 32px;">
              <div style="display: inline-block; background: rgba(234, 179, 8, 0.15); color: #eab308; border: 1px solid #eab308; padding: 6px 14px; border-radius: 4px; font-size: 12px; font-weight: 600; letter-spacing: 0.5px; margin-bottom: 16px;">EXPIRING SOON</div>
              <h2 style="color: #fff; font-size: 22px; font-weight: 600; margin: 0 0 16px 0; line-height: 1.3;">Don't miss out!</h2>
              <p style="color: #888; font-size: 14px; margin: 0 0 20px 0;">Hey ${name},</p>
              <div style="color: #aaa; font-size: 14px; line-height: 1.7;">
                <p>Your <strong style="color: #c9a227;">${discountText}</strong> voucher is expiring soon. Use it before it's gone!</p>
                
                <div style="background: #0a0a0a; border: 2px solid #c9a227; padding: 20px; margin: 24px 0; text-align: center;">
                  <p style="color: #666; font-size: 11px; letter-spacing: 2px; margin: 0 0 8px 0;">YOUR VOUCHER CODE</p>
                  <p style="font-family: monospace; font-size: 24px; font-weight: 700; letter-spacing: 4px; color: #c9a227; margin: 0;">
                    ${voucherCode}
                  </p>
                </div>
                
                <div style="background: rgba(239, 68, 68, 0.1); border-left: 3px solid #ef4444; padding: 12px 16px; margin: 20px 0;">
                  <p style="color: #ef4444; font-size: 13px; margin: 0;">Expires: ${expiryDate}</p>
                </div>
              </div>
              <div style="margin: 32px 0; text-align: center;">
                <a href="https://bcutz.lovable.app/barbers" style="display: inline-block; background: #c9a227; color: #0a0a0a; text-decoration: none; padding: 14px 32px; font-weight: 600; letter-spacing: 1px; font-size: 14px;">
                  BOOK NOW & SAVE
                </a>
              </div>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 24px 0; text-align: center;">
              <p style="color: #666; font-size: 12px; margin: 0 0 8px 0;">You're receiving this because you have an unused voucher.</p>
              <p style="color: #444; font-size: 11px; margin: 0;">
                &copy; ${year} BCUTZ. All rights reserved.
              </p>
              <p style="margin: 12px 0 0 0;">
                <a href="https://bcutz.lovable.app" style="color: #c9a227; font-size: 11px; text-decoration: none;">bcutz.lovable.app</a>
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
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

    logStep("Starting voucher expiry reminder check");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    const threeDaysStart = new Date(threeDaysFromNow);
    threeDaysStart.setHours(0, 0, 0, 0);
    const threeDaysEnd = new Date(threeDaysFromNow);
    threeDaysEnd.setHours(23, 59, 59, 999);

    logStep("Looking for expiring vouchers", { start: threeDaysStart.toISOString(), end: threeDaysEnd.toISOString() });

    const { data: expiringVouchers, error: vouchersError } = await supabaseAdmin
      .from("vouchers")
      .select(`
        id,
        code,
        discount_type,
        discount_value,
        expires_at,
        user_id
      `)
      .eq("is_used", false)
      .gte("expires_at", threeDaysStart.toISOString())
      .lte("expires_at", threeDaysEnd.toISOString());

    if (vouchersError) {
      throw new Error(`Failed to fetch vouchers: ${vouchersError.message}`);
    }

    logStep("Found expiring vouchers", { count: expiringVouchers?.length || 0 });

    if (!expiringVouchers || expiringVouchers.length === 0) {
      return new Response(
        JSON.stringify({ message: "No expiring vouchers found", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userIds = [...new Set(expiringVouchers.map(v => v.user_id))];
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name")
      .in("id", userIds);

    if (profilesError) {
      throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
    }

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

    let sentCount = 0;
    const errors: string[] = [];

    for (const voucher of expiringVouchers) {
      const profile = profileMap.get(voucher.user_id);
      
      if (!profile?.email) {
        logStep("No email for user, skipping", { userId: voucher.user_id });
        continue;
      }

      const discountText = voucher.discount_type === "percentage"
        ? `${voucher.discount_value}% off`
        : `CHF ${voucher.discount_value} off`;

      const expiryDate = new Date(voucher.expires_at).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      try {
        const emailHtml = generateVoucherExpiryEmail(
          profile.full_name || "there",
          voucher.code,
          discountText,
          expiryDate
        );

        await sendEmail({
          to: profile.email,
          subject: "Your BCUTZ voucher expires in 3 days!",
          html: emailHtml,
        });

        sentCount++;
        logStep("Sent voucher expiry reminder", { email: profile.email, code: voucher.code });
      } catch (emailErr: any) {
        errors.push(`${profile.email}: ${emailErr.message}`);
        logStep("Failed to send email", { email: profile.email, error: emailErr.message });
      }
    }

    logStep("Voucher expiry check complete", { sent: sentCount, errors: errors.length });

    return new Response(
      JSON.stringify({
        message: "Voucher expiry reminders sent",
        sent: sentCount,
        total: expiringVouchers.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message });
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
