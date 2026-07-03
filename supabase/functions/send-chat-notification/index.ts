import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { logError, withRetry } from "../_shared/error-logger.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return handleCorsPreflightRequest(req);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    const { conversationId, message } = await req.json();
    if (!conversationId || !message) throw new Error("Missing conversationId or message");

    // Get conversation to find barber
    const { data: conv } = await supabase
      .from("conversations")
      .select("barber_id, customer_id")
      .eq("id", conversationId)
      .single();

    if (!conv) throw new Error("Conversation not found");

    // Resolve the conversation's barber → user_id (single lookup, reused for
    // both the participant check and recipient resolution).
    const { data: convBarber } = await supabase
      .from("barber_profiles")
      .select("user_id")
      .eq("id", conv.barber_id)
      .maybeSingle();

    // AUTHORIZATION (security review finding #1): the caller MUST be a
    // participant in this conversation. This function uses the service-role
    // client (RLS bypassed), so without this check any authenticated user who
    // knows a conversationId could push an attacker-controlled message to that
    // conversation's customer as an in-app + push notification (phishing/spam).
    const isCustomer = user.id === conv.customer_id;
    const isBarber = !!convBarber && convBarber.user_id === user.id;
    if (!isCustomer && !isBarber) {
      throw new Error("Forbidden: not a participant in this conversation");
    }

    // Notify the OTHER participant.
    const recipientUserId = isCustomer ? convBarber?.user_id : conv.customer_id;
    if (!recipientUserId) throw new Error("Recipient not found");

    // Get sender name
    const { data: senderProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    const senderName = senderProfile?.full_name || "Someone";
    const truncatedMsg = message.length > 100 ? message.substring(0, 100) + "…" : message;

    // Create in-app notification (best-effort; the chat message itself was
    // already persisted before this function ran).
    await supabase.from("notifications").insert({
      user_id: recipientUserId,
      title: "New Message",
      message: `${senderName}: ${truncatedMsg}`,
      type: "message",
      action_url: isCustomer ? "/dashboard/messages" : "/bookings",
    });

    // Send push notification via existing function. Best-effort with self-heal:
    // withRetry retries a transient network/5xx blip (exponential backoff, only
    // on transient errors so a delivered push is not duplicated). If it still
    // fails, we LOG and degrade gracefully — the in-app notification above is
    // the authoritative delivery, so a missing push must not fail the request.
    try {
      await withRetry(
        async () => {
          const res = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              userId: recipientUserId,
              title: `💬 ${senderName}`,
              body: truncatedMsg,
              data: { type: "chat", conversationId },
            }),
          });
          if (!res.ok) throw new Error(`send-push-notification responded ${res.status}`);
          return res;
        },
        { label: "send-push-notification", attempts: 3 },
      );
    } catch (pushError) {
      await logError({
        functionName: "send-chat-notification",
        error: pushError,
        severity: "warning",
        context: { stage: "push", recipientUserId, conversationId },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    // Structured, never-throwing error logging → error_logs table + console.
    await logError({ functionName: "send-chat-notification", error, severity: "error" });
    return new Response(JSON.stringify({ success: false, error: String(error) }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
