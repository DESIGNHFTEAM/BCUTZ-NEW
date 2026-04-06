import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-CONNECT-STATUS] ${step}${detailsStr}`);
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

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // Get barber profile
    const { data: barberProfile, error: barberError } = await supabaseClient
      .from("barber_profiles")
      .select("id, stripe_account_id, stripe_onboarding_complete")
      .eq("user_id", user.id)
      .single();

    if (barberError || !barberProfile) {
      return new Response(JSON.stringify({ 
        hasAccount: false,
        isOnboarded: false,
        canReceivePayments: false 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (!barberProfile.stripe_account_id) {
      return new Response(JSON.stringify({ 
        hasAccount: false,
        isOnboarded: false,
        canReceivePayments: false 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    // Check account status - handle invalid/deleted accounts gracefully
    try {
      const account = await stripe.accounts.retrieve(barberProfile.stripe_account_id);
      logStep("Stripe account retrieved", { 
        accountId: account.id,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled 
      });

      const isOnboarded = account.details_submitted && account.charges_enabled;
      const canReceivePayments = account.charges_enabled && account.payouts_enabled;

      // Update onboarding status in database if changed
      if (isOnboarded !== barberProfile.stripe_onboarding_complete) {
        await supabaseClient
          .from("barber_profiles")
          .update({ stripe_onboarding_complete: isOnboarded })
          .eq("id", barberProfile.id);
        logStep("Updated onboarding status", { isOnboarded });
      }

      return new Response(JSON.stringify({ 
        hasAccount: true,
        isOnboarded,
        canReceivePayments,
        accountId: barberProfile.stripe_account_id
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } catch (stripeError: any) {
      // Account doesn't exist or is not connected - clear invalid data
      logStep("Stripe account invalid or not found, clearing data", { 
        error: stripeError.message,
        oldAccountId: barberProfile.stripe_account_id 
      });
      
      await supabaseClient
        .from("barber_profiles")
        .update({ stripe_account_id: null, stripe_onboarding_complete: false })
        .eq("id", barberProfile.id);
      
      return new Response(JSON.stringify({ 
        hasAccount: false,
        isOnboarded: false,
        canReceivePayments: false 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
