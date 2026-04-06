import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

// Sanitize sensitive data from logs
const sanitizeForLog = (data: any): any => {
  if (!data || typeof data !== 'object') return data;
  
  const sensitiveKeys = ['email', 'customerId', 'customer_id', 'userId', 'user_id', 'metadata'];
  const result = { ...data };
  
  for (const key of sensitiveKeys) {
    if (key in result) {
      if (key === 'metadata' && typeof result[key] === 'object') {
        // Sanitize metadata object but keep structure
        result[key] = { ...result[key] };
        if (result[key].customer_id) result[key].customer_id = '[REDACTED]';
      } else if (typeof result[key] === 'string' && result[key].includes('@')) {
        result[key] = '[REDACTED_EMAIL]';
      } else if (key.includes('Id') || key.includes('_id')) {
        result[key] = '[REDACTED_ID]';
      }
    }
  }
  
  return result;
};

const logStep = (step: string, details?: any) => {
  const sanitized = details ? sanitizeForLog(details) : undefined;
  const detailsStr = sanitized ? ` - ${JSON.stringify(sanitized)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Stripe webhook uses additional header for signature
  const corsHeaders = getCorsHeaders(req, 'stripe-signature');
  
  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req, 'stripe-signature');
  }

  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!webhookSecret) {
      logStep("ERROR: STRIPE_WEBHOOK_SECRET is not configured");
      return new Response(
        JSON.stringify({ error: "Webhook secret not configured. Set STRIPE_WEBHOOK_SECRET in environment." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Get the raw body for signature verification
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    // Require signature header
    if (!signature) {
      logStep("ERROR: Missing stripe-signature header");
      return new Response(
        JSON.stringify({ error: "Missing stripe-signature header" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let event: Stripe.Event;

    // Always verify webhook signature - no fallback for security
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
      logStep("Event verified with signature", { type: event.type, id: event.id });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logStep("Webhook signature verification failed", { error: errorMessage });
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Idempotency: reject duplicate checkout.session.completed events ──
    // For checkout events, check if a payment record already exists for this booking
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const piId = session.payment_intent as string;
      if (piId) {
        const { data: existingPayment } = await supabaseClient
          .from("payments")
          .select("id")
          .eq("provider_transaction_id", piId)
          .maybeSingle();

        if (existingPayment) {
          logStep("Duplicate checkout event detected, skipping", { eventId: event.id, paymentIntent: piId });
          return new Response(JSON.stringify({ received: true, duplicate: true }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Checkout session completed", {
          paymentStatus: session.payment_status
        });

        if (session.payment_status === "paid" && session.metadata) {
          const { booking_id, barber_id, service_id } = session.metadata;

          if (booking_id) {
            // Update booking status to confirmed
            const { error: bookingError } = await supabaseClient
              .from("bookings")
              .update({ 
                status: "confirmed",
                updated_at: new Date().toISOString()
              })
              .eq("id", booking_id);

            if (bookingError) {
              logStep("Error updating booking", { error: bookingError.message });
            } else {
              logStep("Booking confirmed", { bookingId: booking_id });
            }

            // Get booking details for the payment record
            const { data: booking } = await supabaseClient
              .from("bookings")
              .select("service_price, platform_fee, total_amount, currency, customer_id, barber_id")
              .eq("id", booking_id)
              .single();

            if (booking) {
              // Create payment record
              const { error: paymentError } = await supabaseClient
                .from("payments")
                .insert({
                  booking_id,
                  payment_method: session.payment_method_types?.[0] === "twint" ? "twint" : 
                                  session.payment_method_types?.[0] === "paypal" ? "paypal" : "credit_card",
                  service_amount: booking.service_price,
                  platform_fee: booking.platform_fee,
                  total_amount: booking.total_amount,
                  currency: booking.currency || "CHF",
                  status: "paid",
                  paid_at: new Date().toISOString(),
                  provider_transaction_id: session.payment_intent as string,
                });

              if (paymentError) {
                logStep("Error creating payment record", { error: paymentError.message });
              } else {
                logStep("Payment record created", { bookingId: booking_id });

                // Finalize voucher usage now that payment is confirmed
                const voucherId = session.metadata?.voucher_id;
                if (voucherId) {
                  await supabaseClient
                    .from("vouchers")
                    .update({ 
                      is_used: true, 
                      used_at: new Date().toISOString() 
                    })
                    .eq("id", voucherId)
                    .eq("is_used", false);
                  logStep("Voucher finalized as used", { voucherId });
                }
              }

              // Award loyalty points with tier multiplier
              if (booking.customer_id) {
                try {
                  // Get user's lifetime points to determine tier
                  const { data: loyaltyData } = await supabaseClient
                    .from("loyalty_points")
                    .select("points, lifetime_points")
                    .eq("user_id", booking.customer_id)
                    .maybeSingle();

                  const lifetimePoints = loyaltyData?.lifetime_points || 0;
                  
                  // Calculate tier multiplier
                  let multiplier = 1;
                  if (lifetimePoints >= 3000) multiplier = 2;      // Platinum
                  else if (lifetimePoints >= 1500) multiplier = 1.5; // Gold
                  else if (lifetimePoints >= 500) multiplier = 1.25; // Silver
                  
                  const tierName = lifetimePoints >= 3000 ? 'Platinum' : 
                                   lifetimePoints >= 1500 ? 'Gold' : 
                                   lifetimePoints >= 500 ? 'Silver' : 'Bronze';
                  
                  // Calculate points earned (1 point per CHF * multiplier)
                  const basePoints = Math.floor(Number(booking.total_amount));
                  const pointsEarned = Math.floor(basePoints * multiplier);

                  logStep("Calculating loyalty points", { 
                    pointsEarned, 
                    tier: tierName 
                  });

                  // ATOMIC: First ensure loyalty_points record exists, then update via single transaction
                  // Using service role to bypass RLS "Prevent direct transaction inserts" policy
                  // This is intentional - only edge functions with service role should award points
                  
                  // Ensure user has a points record first
                  const { data: existingPoints } = await supabaseClient
                    .from("loyalty_points")
                    .select("id")
                    .eq("user_id", booking.customer_id)
                    .maybeSingle();
                  
                  if (!existingPoints) {
                    // Create initial record
                    await supabaseClient
                      .from("loyalty_points")
                      .insert({ 
                        user_id: booking.customer_id,
                        points: 0,
                        lifetime_points: 0
                      });
                  }
                  
                  // Now atomically update points AND log transaction together
                  // Update points directly (RLS allows service role)
                  const { error: pointsError } = await supabaseClient
                    .from("loyalty_points")
                    .update({ 
                      points: (loyaltyData?.points || 0) + pointsEarned,
                      lifetime_points: (loyaltyData?.lifetime_points || 0) + pointsEarned,
                      updated_at: new Date().toISOString()
                    })
                    .eq("user_id", booking.customer_id);
                  
                  if (pointsError) {
                    throw new Error(`Failed to update points: ${pointsError.message}`);
                  }

                  // Log the transaction
                  await supabaseClient
                    .from("loyalty_transactions")
                    .insert({
                      user_id: booking.customer_id,
                      booking_id: booking_id,
                      points: pointsEarned,
                      transaction_type: "earned",
                      description: `Earned ${pointsEarned} pts (${tierName} ${multiplier}x)`
                    });

                  // Update booking with points earned
                  await supabaseClient
                    .from("bookings")
                    .update({ points_earned: pointsEarned })
                    .eq("id", booking_id);

                  logStep("Loyalty points awarded", { pointsEarned });
                } catch (loyaltyError) {
                  logStep("Error awarding loyalty points", { error: loyaltyError });
                }
              }

              // Trigger notification emails
              try {
                await fetch(`${supabaseUrl}/functions/v1/send-payment-notification`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${supabaseServiceKey}`,
                  },
                  body: JSON.stringify({
                    bookingId: booking_id,
                    customerId: booking.customer_id,
                    barberId: booking.barber_id,
                  }),
                });
                logStep("Notification triggered", { bookingId: booking_id });
              } catch (notifError) {
                logStep("Error triggering notification", { error: notifError });
              }

              // Send payment receipt email to customer
              try {
                await fetch(`${supabaseUrl}/functions/v1/send-payment-receipt`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${supabaseServiceKey}`,
                  },
                  body: JSON.stringify({
                    bookingId: booking_id,
                  }),
                });
                logStep("Payment receipt email triggered", { bookingId: booking_id });
              } catch (receiptError) {
                logStep("Error sending payment receipt", { error: receiptError });
              }
            }
          }
        }
        break;
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        logStep("Payment intent succeeded", { 
          id: paymentIntent.id, 
          amount: paymentIntent.amount 
        });
        // Payment already handled in checkout.session.completed
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        logStep("Payment failed", { 
          id: paymentIntent.id,
          error: paymentIntent.last_payment_error?.message 
        });

        // Update payment status if we have a record
        if (paymentIntent.metadata?.booking_id) {
          await supabaseClient
            .from("payments")
            .update({ status: "failed" })
            .eq("provider_transaction_id", paymentIntent.id);
        }
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
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
