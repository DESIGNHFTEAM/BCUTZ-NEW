import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { z } from "https://esm.sh/zod@3.22.4";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PayoutRequestSchema = z.object({
  bookingId: z.string().regex(uuidRegex, "Invalid booking ID format"),
});

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PROCESS-BARBER-PAYOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    // SECURITY: Authenticate the user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Unauthorized: No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData?.user) {
      throw new Error("Unauthorized: Invalid or expired token");
    }

    const actingUser = userData.user;
    logStep("User authenticated", { userId: actingUser.id });

    // SECURITY: Verify user has admin or founder role to process payouts
    const { data: hasAdminRole } = await supabaseClient.rpc('has_role', { 
      _user_id: actingUser.id, 
      _role: 'admin' 
    });
    const { data: hasFounderRole } = await supabaseClient.rpc('is_founder', { 
      _user_id: actingUser.id 
    });

    if (!hasAdminRole && !hasFounderRole) {
      throw new Error("Forbidden: Only admins and founders can process payouts");
    }
    logStep("Authorization verified", { isAdmin: hasAdminRole, isFounder: hasFounderRole });

    // Parse and validate request body
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      throw new Error("Invalid JSON in request body");
    }

    const parseResult = PayoutRequestSchema.safeParse(rawBody);
    if (!parseResult.success) {
      const errorMessage = parseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return new Response(JSON.stringify({ error: `Validation failed: ${errorMessage}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const { bookingId } = parseResult.data;
    logStep("Request validated", { bookingId });

    // Get booking with payment status
    const { data: booking, error: bookingError } = await supabaseClient
      .from("bookings")
      .select(`
        id, 
        barber_id, 
        service_price, 
        platform_fee, 
        total_amount, 
        currency, 
        status,
        customer_id
      `)
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      throw new Error("Booking not found");
    }
    logStep("Booking found", { 
      bookingId: booking.id, 
      status: booking.status,
      servicePrice: booking.service_price 
    });

    // Check booking is completed
    if (booking.status !== "completed") {
      throw new Error("Booking must be completed before processing payout");
    }

    // Get payment record
    const { data: payment, error: paymentError } = await supabaseClient
      .from("payments")
      .select("id, status, provider_transaction_id")
      .eq("booking_id", bookingId)
      .single();

    if (paymentError || !payment) {
      throw new Error("Payment record not found for this booking");
    }

    if (payment.status !== "paid") {
      throw new Error("Payment has not been completed");
    }
    logStep("Payment verified", { paymentId: payment.id, status: payment.status });

    // Get barber's Stripe account
    const { data: barberProfile, error: barberError } = await supabaseClient
      .from("barber_profiles")
      .select("id, shop_name, stripe_account_id")
      .eq("id", booking.barber_id)
      .single();

    if (barberError || !barberProfile || !barberProfile.stripe_account_id) {
      throw new Error("Barber Stripe account not found");
    }
    logStep("Barber profile found", { 
      shopName: barberProfile.shop_name,
      stripeAccountId: barberProfile.stripe_account_id 
    });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Note: With Stripe Connect and transfer_data in the checkout session,
    // the transfer happens automatically when the payment succeeds.
    // This function is for tracking and manual payouts if needed.

    // Check if transfer was already made via the checkout session
    if (payment.provider_transaction_id) {
      const paymentIntent = await stripe.paymentIntents.retrieve(
        payment.provider_transaction_id,
        { expand: ["latest_charge.transfer"] }
      );

      logStep("Payment intent retrieved", { 
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status 
      });

      // The transfer was already created automatically via transfer_data
      // Create payout record
      const payoutAmount = Number(booking.service_price);
      
      const { data: existingPayout } = await supabaseClient
        .from("payouts")
        .select("id")
        .eq("barber_id", booking.barber_id)
        .gte("created_at", new Date(Date.now() - 60000).toISOString()) // Last minute
        .single();

      if (!existingPayout) {
        const today = new Date().toISOString().split('T')[0];
        
        await supabaseClient
          .from("payouts")
          .insert({
            barber_id: booking.barber_id,
            amount: payoutAmount,
            currency: booking.currency || "CHF",
            status: "completed",
            period_start: today,
            period_end: today,
            processed_at: new Date().toISOString(),
            bank_reference: payment.provider_transaction_id,
          });
        logStep("Payout record created", { amount: payoutAmount });
      }

      return new Response(JSON.stringify({ 
        success: true,
        message: "Payout was processed automatically via Stripe Connect",
        amount: payoutAmount,
        currency: booking.currency 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // If no automatic transfer, create manual transfer
    const transferAmount = Math.round(Number(booking.service_price) * 100); // Convert to cents

    const transfer = await stripe.transfers.create({
      amount: transferAmount,
      currency: "chf",
      destination: barberProfile.stripe_account_id,
      description: `Payout for booking ${bookingId}`,
      metadata: {
        booking_id: bookingId,
        barber_id: booking.barber_id,
      },
    });

    logStep("Manual transfer created", { 
      transferId: transfer.id, 
      amount: transfer.amount 
    });

    // Create payout record
    const today = new Date().toISOString().split('T')[0];
    
    await supabaseClient
      .from("payouts")
      .insert({
        barber_id: booking.barber_id,
        amount: Number(booking.service_price),
        currency: booking.currency || "CHF",
        status: "completed",
        period_start: today,
        period_end: today,
        processed_at: new Date().toISOString(),
        bank_reference: transfer.id,
      });

    return new Response(JSON.stringify({ 
      success: true,
      transferId: transfer.id,
      amount: transfer.amount / 100,
      currency: "CHF"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
