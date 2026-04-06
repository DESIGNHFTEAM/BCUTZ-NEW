import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

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

    // Determine recipient (if sender is customer, notify barber; vice versa)
    let recipientUserId: string;
    if (user.id === conv.customer_id) {
      // Customer sent message → notify barber
      const { data: bp } = await supabase
        .from("barber_profiles")
        .select("user_id")
        .eq("id", conv.barber_id)
        .single();
      if (!bp) throw new Error("Barber not found");
      recipientUserId = bp.user_id;
    } else {
      // Barber sent message → notify customer
      recipientUserId = conv.customer_id;
    }

    // Get sender name
    const { data: senderProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    const senderName = senderProfile?.full_name || "Someone";
    const truncatedMsg = message.length > 100 ? message.substring(0, 100) + "…" : message;

    // Create in-app notification
    await supabase.from("notifications").insert({
      user_id: recipientUserId,
      title: "New Message",
      message: `${senderName}: ${truncatedMsg}`,
      type: "message",
      action_url: user.id === conv.customer_id ? "/dashboard/messages" : "/bookings",
    });

    // Send push notification via existing function
    await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
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

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[SEND-CHAT-NOTIFICATION]", error);
    return new Response(JSON.stringify({ success: false, error: String(error) }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
