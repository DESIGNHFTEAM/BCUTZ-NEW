import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { sendEmail } from "../_shared/smtp.ts";

interface NotificationRequest {
  target_user_id: string;
  action: "grant" | "revoke";
  actor_name?: string;
}

function generateAdminGrantEmail(targetName: string, actorDisplayName: string): string {
  const year = new Date().getFullYear();
  return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Welcome to the Admin Team</title></head>' +
    '<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif;">' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0a0a0a;">' +
    '<tr><td align="center" style="padding:40px 20px;">' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;">' +
    '<tr><td align="center" style="padding-bottom:32px;"><h1 style="margin:0;font-size:48px;font-weight:700;color:#c9a227;font-family:Georgia,serif;letter-spacing:2px;">BCUTZ</h1></td></tr>' +
    '<tr><td style="background-color:#111;border:1px solid #222;padding:32px;">' +
    '<div style="display:inline-block;background:rgba(34,197,94,0.15);color:#22c55e;border:1px solid #22c55e;padding:6px 14px;border-radius:4px;font-size:12px;font-weight:600;letter-spacing:0.5px;margin-bottom:16px;">ADMIN ACCESS GRANTED</div>' +
    '<h2 style="color:#fff;font-size:22px;font-weight:600;margin:0 0 16px 0;line-height:1.3;">Welcome to the Admin Team</h2>' +
    '<p style="color:#888;font-size:14px;margin:0 0 20px 0;">Hey ' + targetName + ',</p>' +
    '<div style="color:#aaa;font-size:14px;line-height:1.7;">' +
    '<p style="margin:0 0 16px 0;">You have been granted <strong style="color:#c9a227;">Admin access</strong> to the BCUTZ platform by ' + actorDisplayName + '.</p>' +
    '<p style="color:#c9a227;font-weight:600;margin:24px 0 12px 0;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Your Admin Powers</p>' +
    '<ul style="list-style:none;padding:0;margin:0;">' +
    '<li style="padding:8px 0;color:#aaa;"><span style="color:#c9a227;margin-right:8px;">&#10003;</span> Verify and approve new barber registrations</li>' +
    '<li style="padding:8px 0;color:#aaa;"><span style="color:#c9a227;margin-right:8px;">&#10003;</span> Review and resolve user reports</li>' +
    '<li style="padding:8px 0;color:#aaa;"><span style="color:#c9a227;margin-right:8px;">&#10003;</span> Access admin dashboard and analytics</li>' +
    '<li style="padding:8px 0;color:#aaa;"><span style="color:#c9a227;margin-right:8px;">&#10003;</span> Manage platform content and users</li>' +
    '</ul>' +
    '<p style="color:#666;font-size:12px;margin:16px 0 0 0;">With great power comes great responsibility. Please use your admin access responsibly.</p>' +
    '</div>' +
    '<div style="margin:32px 0;text-align:center;">' +
    '<a href="https://bcutz.lovable.app/admin/barber-verification" style="display:inline-block;background:#c9a227;color:#0a0a0a;text-decoration:none;padding:14px 32px;font-weight:600;letter-spacing:1px;font-size:14px;">ACCESS ADMIN PANEL</a>' +
    '</div></td></tr>' +
    '<tr><td style="padding:24px 0;text-align:center;">' +
    '<p style="color:#444;font-size:11px;margin:0;">&copy; ' + year + ' BCUTZ. All rights reserved.</p>' +
    '<p style="margin:12px 0 0 0;"><a href="https://bcutz.lovable.app" style="color:#c9a227;font-size:11px;text-decoration:none;">bcutz.lovable.app</a></p>' +
    '</td></tr></table></td></tr></table></body></html>';
}

function generateAdminRevokeEmail(targetName: string, actorDisplayName: string): string {
  const year = new Date().getFullYear();
  return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Admin Access Update</title></head>' +
    '<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif;">' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0a0a0a;">' +
    '<tr><td align="center" style="padding:40px 20px;">' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;">' +
    '<tr><td align="center" style="padding-bottom:32px;"><h1 style="margin:0;font-size:48px;font-weight:700;color:#c9a227;font-family:Georgia,serif;letter-spacing:2px;">BCUTZ</h1></td></tr>' +
    '<tr><td style="background-color:#111;border:1px solid #222;padding:32px;">' +
    '<div style="display:inline-block;background:rgba(239,68,68,0.15);color:#ef4444;border:1px solid #ef4444;padding:6px 14px;border-radius:4px;font-size:12px;font-weight:600;letter-spacing:0.5px;margin-bottom:16px;">ACCESS REVOKED</div>' +
    '<h2 style="color:#fff;font-size:22px;font-weight:600;margin:0 0 16px 0;line-height:1.3;">Admin Access Update</h2>' +
    '<p style="color:#888;font-size:14px;margin:0 0 20px 0;">Hello ' + targetName + ',</p>' +
    '<div style="color:#aaa;font-size:14px;line-height:1.7;">' +
    '<p style="margin:0 0 16px 0;">Your admin access to the BCUTZ platform has been revoked by ' + actorDisplayName + '.</p>' +
    '<p style="margin:0 0 16px 0;">If you believe this was done in error, please contact the BCUTZ team directly.</p>' +
    '<p style="margin:0;">You can still use BCUTZ as a regular user to book appointments and explore barbers.</p>' +
    '</div>' +
    '<div style="margin:32px 0;text-align:center;">' +
    '<a href="https://bcutz.lovable.app/barbers" style="display:inline-block;background:#c9a227;color:#0a0a0a;text-decoration:none;padding:14px 32px;font-weight:600;letter-spacing:1px;font-size:14px;">BROWSE BARBERS</a>' +
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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !caller) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { data: isFounder } = await supabase.rpc("is_founder", { _user_id: caller.id });
    if (!isFounder) {
      return new Response(
        JSON.stringify({ error: "Only founders can send admin role notifications" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    let requestBody: NotificationRequest;
    try {
      requestBody = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { target_user_id, action, actor_name } = requestBody;

    if (!target_user_id || !action) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!["grant", "revoke"].includes(action)) {
      return new Response(
        JSON.stringify({ error: "Invalid action" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { data: targetProfile, error: profileError } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", target_user_id)
      .single();

    if (profileError || !targetProfile?.email) {
      return new Response(
        JSON.stringify({ error: "Target user not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", caller.id)
      .single();

    const actorDisplayName = actor_name || callerProfile?.full_name || "A BCUTZ Founder";
    const targetName = targetProfile.full_name || "Team Member";

    const subject = action === "grant"
      ? "Welcome to the BCUTZ Admin Team"
      : "BCUTZ Admin Access Update";

    const htmlContent = action === "grant"
      ? generateAdminGrantEmail(targetName, actorDisplayName)
      : generateAdminRevokeEmail(targetName, actorDisplayName);

    // Create in-app notification
    const notificationTitle = action === "grant" ? "Welcome to the Admin Team!" : "Admin Access Update";
    const notificationMessage = action === "grant" 
      ? `You have been granted admin access by ${actorDisplayName}. You can now access the admin panel.`
      : `Your admin access has been revoked by ${actorDisplayName}.`;

    await supabase.from("notifications").insert({
      user_id: target_user_id,
      title: notificationTitle,
      message: notificationMessage,
      type: action === "grant" ? "success" : "info",
      action_url: action === "grant" ? "/admin/barber-verification" : null,
    });

    // Send push notification for mobile users
    try {
      const pushResponse = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          user_ids: [target_user_id],
          title: notificationTitle,
          body: notificationMessage,
          data: {
            type: "admin_role_change",
            action: action,
            url: action === "grant" ? "/admin/barber-verification" : "/",
          },
        }),
      });
      
      if (!pushResponse.ok) {
        console.log("[ADMIN-ROLE-NOTIFICATION] Push notification not sent (user may not have push enabled)");
      } else {
        console.log("[ADMIN-ROLE-NOTIFICATION] Push notification sent successfully");
      }
    } catch (pushError) {
      console.log("[ADMIN-ROLE-NOTIFICATION] Push notification error (non-critical):", pushError);
    }

    // Log the activity
    await supabase.rpc("log_admin_activity", {
      p_action_type: action === "grant" ? "admin_role_granted" : "admin_role_revoked",
      p_target_user_id: target_user_id,
      p_details: { target_email: targetProfile.email, target_name: targetName },
    });

    // Send email
    await sendEmail({ to: targetProfile.email, subject: subject, html: htmlContent });

    console.log("Admin role notification sent successfully");

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    console.error("Error in send-admin-role-notification:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
