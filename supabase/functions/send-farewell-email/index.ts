import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { sendEmail } from "../_shared/smtp.ts";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[FAREWELL-EMAIL] ${step}${detailsStr}`);
};

interface FarewellEmailRequest {
  email: string;
  name?: string;
}

function generateFarewellEmail(name: string): string {
  const displayName = name || "there";
  const year = new Date().getFullYear();

  return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Goodbye from BCUTZ</title></head>' +
    '<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif;">' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0a0a0a;">' +
    '<tr><td align="center" style="padding:40px 20px;">' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;">' +
    '<tr><td align="center" style="padding-bottom:32px;"><h1 style="margin:0;font-size:48px;font-weight:700;color:#c9a227;font-family:Georgia,serif;letter-spacing:2px;">BCUTZ</h1></td></tr>' +
    '<tr><td style="background-color:#111;border:1px solid #222;padding:32px;">' +
    '<div style="display:inline-block;background:rgba(239,68,68,0.15);color:#ef4444;border:1px solid #ef4444;padding:6px 14px;border-radius:4px;font-size:12px;font-weight:600;letter-spacing:0.5px;margin-bottom:16px;">ACCOUNT DELETED</div>' +
    '<h2 style="color:#fff;font-size:22px;font-weight:600;margin:0 0 16px 0;line-height:1.3;">We Are Sad to See You Go</h2>' +
    '<p style="color:#888;font-size:14px;margin:0 0 20px 0;">Hey ' + displayName + ',</p>' +
    '<div style="color:#aaa;font-size:14px;line-height:1.7;">' +
    '<p style="margin:0 0 16px 0;">Your BCUTZ account has been successfully deleted. We truly appreciate the time you spent with us.</p>' +
    '<div style="background:rgba(201,162,39,0.1);border:1px solid #c9a227;padding:20px;margin:24px 0;text-align:center;">' +
    '<p style="color:#c9a227;font-weight:600;margin:0 0 8px 0;">COMEBACK OFFER</p>' +
    '<p style="color:#fff;font-size:20px;font-weight:700;margin:0 0 8px 0;">50% OFF Your Next Booking</p>' +
    '<p style="color:#888;font-size:12px;margin:0;">Valid for 7 days if you create a new account</p>' +
    '</div>' +
    '<p style="margin:0 0 16px 0;">We would love to know what we could have done better. If you have any feedback, just reply to this email.</p>' +
    '<p style="margin:0 0 16px 0;">Thank you for being part of the BCUTZ family. The door is always open.</p>' +
    '<p style="color:#c9a227;margin:0;">Wishing you the best,<br>The BCUTZ Team</p>' +
    '</div>' +
    '<div style="margin:32px 0;text-align:center;">' +
    '<a href="https://bcutz.lovable.app/auth" style="display:inline-block;background:#c9a227;color:#0a0a0a;text-decoration:none;padding:14px 32px;font-weight:600;letter-spacing:1px;font-size:14px;">COME BACK TO BCUTZ</a>' +
    '</div></td></tr>' +
    '<tr><td style="padding:24px 0;text-align:center;">' +
    '<p style="color:#444;font-size:11px;margin:0;">&#169; ' + year + ' BCUTZ. All rights reserved.</p>' +
    '<p style="margin:12px 0 0 0;"><a href="https://bcutz.lovable.app" style="color:#c9a227;font-size:11px;text-decoration:none;">bcutz.com</a></p>' +
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

    const { email, name }: FarewellEmailRequest = await req.json();
    logStep("Processing farewell email request", { email, name });

    if (!email) {
      throw new Error("Email is required");
    }

    const htmlContent = generateFarewellEmail(name || "there");

    await sendEmail({
      to: email,
      subject: "Goodbye from BCUTZ - We Will Miss You",
      html: htmlContent,
    });

    logStep("Farewell email sent successfully", { email });

    return new Response(
      JSON.stringify({ success: true, message: "Farewell email sent" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    logStep("Error sending farewell email", { error: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
