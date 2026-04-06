import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { z } from "https://esm.sh/zod@3.22.4";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

// UUID validation regex
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Supported currencies
const SUPPORTED_CURRENCIES = ['CHF', 'EUR', 'USD', 'GBP', 'PLN', 'CZK', 'SEK', 'DKK', 'NOK'];

// Input validation schema
const CheckoutRequestSchema = z.object({
  bookingId: z.string().regex(uuidRegex, "Invalid booking ID format"),
  serviceId: z.string().regex(uuidRegex, "Invalid service ID format"),
  barberId: z.string().regex(uuidRegex, "Invalid barber ID format"),
  voucherCode: z.string().optional(),
  currency: z.string().optional().default('CHF'),
});

// Sanitize sensitive data from logs
const sanitizeForLog = (data: any): any => {
  if (!data || typeof data !== 'object') return data;
  
  const sensitiveKeys = ['email', 'userId', 'user_id', 'customerId', 'customer_id', 'voucherCode', 'sessionId', 'url'];
  const result = { ...data };
  
  for (const key of sensitiveKeys) {
    if (key in result) {
      if (typeof result[key] === 'string') {
        if (result[key].includes('@')) {
          result[key] = '[REDACTED_EMAIL]';
        } else if (key === 'sessionId' || key === 'url') {
          result[key] = '[REDACTED]';
        } else if (key === 'voucherCode') {
          result[key] = result[key] ? '[VOUCHER_PRESENT]' : 'none';
        } else {
          result[key] = '[REDACTED_ID]';
        }
      }
    }
  }
  
  return result;
};

const logStep = (step: string, details?: any) => {
  const sanitized = details ? sanitizeForLog(details) : undefined;
  const detailsStr = sanitized ? ` - ${JSON.stringify(sanitized)}` : '';
  console.log(`[CREATE-BOOKING-CHECKOUT] ${step}${detailsStr}`);
};

/**
 * Multi-Currency Fee Configuration
 * 
 * Each currency has:
 * - fixedFee: Stripe's fixed transaction fee
 * - minPlatformFee: Minimum BCUTZ net (~CHF 2.00 equivalent)
 * - roundingUnit: Currency-specific rounding
 */
interface CurrencyConfig {
  fixedFee: number;
  minPlatformFee: number;
  roundingUnit: number;
}

const CURRENCY_CONFIGS: Record<string, CurrencyConfig> = {
  CHF: { fixedFee: 0.35, minPlatformFee: 2.00, roundingUnit: 0.05 },
  EUR: { fixedFee: 0.30, minPlatformFee: 1.90, roundingUnit: 0.01 },
  USD: { fixedFee: 0.35, minPlatformFee: 1.75, roundingUnit: 0.01 },
  GBP: { fixedFee: 0.25, minPlatformFee: 1.60, roundingUnit: 0.01 },
  PLN: { fixedFee: 1.50, minPlatformFee: 9.00, roundingUnit: 0.01 },
  CZK: { fixedFee: 8.00, minPlatformFee: 52.00, roundingUnit: 1.00 },
  SEK: { fixedFee: 3.50, minPlatformFee: 24.00, roundingUnit: 0.01 },
  DKK: { fixedFee: 2.50, minPlatformFee: 14.40, roundingUnit: 0.01 },
  NOK: { fixedFee: 3.50, minPlatformFee: 25.00, roundingUnit: 0.01 },
};

// Fee rate constants (worst-case for PayPal/Klarna + international)
const FEE_RATES = {
  BASE_PERCENTAGE: 0.0349, // 3.49% (PayPal/Klarna worst case)
  INTERNATIONAL_SURCHARGE: 0.015, // 1.5% for cross-border
};

/**
 * Calculate the booking fee that ensures BCUTZ nets at least the minimum platform fee
 * after Stripe takes their processing fees.
 */
const calculateBookingFee = (servicePrice: number, currency: string): number => {
  const config = CURRENCY_CONFIGS[currency.toUpperCase()] || CURRENCY_CONFIGS.CHF;
  const feeRate = FEE_RATES.BASE_PERCENTAGE + FEE_RATES.INTERNATIONAL_SURCHARGE;
  
  const bookingFee = (config.minPlatformFee + config.fixedFee + servicePrice * feeRate) / (1 - feeRate);
  
  // Round up to currency's rounding unit
  return Math.ceil(bookingFee / config.roundingUnit) * config.roundingUnit;
};

/**
 * Calculate the discount amount based on voucher type
 */
const calculateDiscount = (
  discountType: string, 
  discountValue: number, 
  servicePrice: number
): number => {
  if (discountType === 'percentage') {
    const discount = servicePrice * (discountValue / 100);
    return Math.min(discount, servicePrice);
  } else if (discountType === 'fixed') {
    return Math.min(discountValue, servicePrice);
  }
  return 0;
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

    // Parse and validate request body
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      throw new Error("Invalid JSON in request body");
    }

    const parseResult = CheckoutRequestSchema.safeParse(rawBody);
    if (!parseResult.success) {
      const errorMessage = parseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new Error(`Validation failed: ${errorMessage}`);
    }

    const { bookingId, serviceId, barberId, voucherCode } = parseResult.data;
    let currency = parseResult.data.currency?.toUpperCase() || 'CHF';
    
    // Validate currency is supported
    if (!SUPPORTED_CURRENCIES.includes(currency)) {
      logStep("Unsupported currency, defaulting to CHF", { requested: currency });
      currency = 'CHF';
    }
    
    logStep("Request parsed and validated", { 
      bookingId, 
      serviceId, 
      barberId, 
      voucherCode: voucherCode || 'none',
      currency 
    });

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Validate voucher if provided
    let voucher: { 
      id: string; 
      discount_type: string; 
      discount_value: number; 
    } | null = null;
    
    if (voucherCode) {
      const { data: voucherData, error: voucherError } = await supabaseClient
        .from("vouchers")
        .select("id, user_id, discount_type, discount_value, is_used, expires_at")
        .eq("code", voucherCode.toUpperCase())
        .single();

      if (voucherError || !voucherData) {
        throw new Error("Invalid voucher code");
      }

      if (voucherData.user_id !== user.id) {
        throw new Error("This voucher does not belong to you");
      }

      if (voucherData.is_used) {
        throw new Error("This voucher has already been used");
      }

      if (new Date(voucherData.expires_at) < new Date()) {
        throw new Error("This voucher has expired");
      }

      voucher = {
        id: voucherData.id,
        discount_type: voucherData.discount_type,
        discount_value: Number(voucherData.discount_value),
      };
      logStep("Voucher validated", voucher);
    }

    // Get service details
    const { data: service, error: serviceError } = await supabaseClient
      .from("services")
      .select("id, name, price, currency, barber_id")
      .eq("id", serviceId)
      .eq("is_active", true)
      .single();

    if (serviceError || !service) {
      throw new Error("Service not found or inactive");
    }
    logStep("Service found", { serviceName: service.name, price: service.price, serviceCurrency: service.currency });

    // Use the requested currency for checkout, but keep track of original service currency
    // Stripe will handle the conversion with Adaptive Pricing if enabled
    const checkoutCurrency = currency.toLowerCase();

    // Verify service belongs to barber
    if (service.barber_id !== barberId) {
      throw new Error("Service does not belong to specified barber");
    }

    // Get barber's Stripe Connect account
    const { data: barberProfile, error: barberError } = await supabaseClient
      .from("barber_profiles")
      .select("id, shop_name, stripe_account_id, stripe_onboarding_complete")
      .eq("id", barberId)
      .single();

    if (barberError || !barberProfile) {
      throw new Error("Barber profile not found");
    }

    if (!barberProfile.stripe_account_id || !barberProfile.stripe_onboarding_complete) {
      throw new Error("Barber has not completed payment setup. Please contact the barber.");
    }
    logStep("Barber profile found", { 
      shopName: barberProfile.shop_name, 
      stripeAccountId: barberProfile.stripe_account_id 
    });

    // Get booking details
    const { data: booking, error: bookingError } = await supabaseClient
      .from("bookings")
      .select("id, booking_date, start_time, status")
      .eq("id", bookingId)
      .eq("customer_id", user.id)
      .single();

    if (bookingError || !booking) {
      throw new Error("Booking not found or does not belong to user");
    }
    logStep("Booking found", { bookingId: booking.id, status: booking.status });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const origin = req.headers.get("origin") || "https://lovable.dev";

    // Check if customer exists in Stripe
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing Stripe customer found", { customerId });
    }

    // Calculate amounts using multi-currency fee calculator
    const servicePrice = Number(service.price);
    const servicePriceCents = Math.round(servicePrice * 100);
    
    // Calculate discount if voucher is present
    let discountAmount = 0;
    let discountCents = 0;
    if (voucher) {
      discountAmount = calculateDiscount(voucher.discount_type, voucher.discount_value, servicePrice);
      discountCents = Math.round(discountAmount * 100);
      logStep("Discount calculated", { 
        discountType: voucher.discount_type,
        discountValue: voucher.discount_value,
        discountAmount,
        discountCents
      });
    }

    // Customer pays: (service price - discount) + booking fee
    const customerServicePriceCents = servicePriceCents - discountCents;
    const customerServicePrice = customerServicePriceCents / 100;
    
    // Calculate booking fee using multi-currency calculator
    const bookingFee = calculateBookingFee(customerServicePrice, currency);
    const bookingFeeCents = Math.round(bookingFee * 100);
    
    const totalAmountCents = customerServicePriceCents + bookingFeeCents;
    
    // Calculate expected fees for logging
    const config = CURRENCY_CONFIGS[currency] || CURRENCY_CONFIGS.CHF;
    const feeRate = FEE_RATES.BASE_PERCENTAGE + FEE_RATES.INTERNATIONAL_SURCHARGE;
    const expectedStripeFee = (totalAmountCents / 100) * feeRate + config.fixedFee;
    const expectedPlatformNet = bookingFee - expectedStripeFee - discountAmount;
    
    logStep("Calculated amounts (multi-currency)", { 
      currency,
      servicePrice,
      servicePriceCents, 
      discountAmount,
      discountCents,
      customerServicePrice,
      bookingFee,
      bookingFeeCents,
      totalAmountCents,
      barberReceives: servicePriceCents,
      platformAbsorbs: discountCents,
      expectedStripeFee: expectedStripeFee.toFixed(2),
      expectedPlatformNet: expectedPlatformNet.toFixed(2),
      minPlatformFee: config.minPlatformFee,
    });

    // Build line items with proper currency
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

    // Service line item (with discount applied for customer view)
    if (discountAmount > 0) {
      lineItems.push({
        price_data: {
          currency: checkoutCurrency,
          product_data: {
            name: service.name,
            description: `Booking at ${barberProfile.shop_name} on ${booking.booking_date} at ${booking.start_time}`,
          },
          unit_amount: customerServicePriceCents,
        },
        quantity: 1,
      });
      lineItems.push({
        price_data: {
          currency: checkoutCurrency,
          product_data: {
            name: `Loyalty Discount Applied`,
            description: voucher?.discount_type === 'percentage' 
              ? `${voucher.discount_value}% off` 
              : `${currency} ${discountAmount.toFixed(2)} off`,
          },
          unit_amount: 0,
        },
        quantity: 1,
      });
    } else {
      lineItems.push({
        price_data: {
          currency: checkoutCurrency,
          product_data: {
            name: service.name,
            description: `Booking at ${barberProfile.shop_name} on ${booking.booking_date} at ${booking.start_time}`,
          },
          unit_amount: servicePriceCents,
        },
        quantity: 1,
      });
    }

    // Booking fee line item
    lineItems.push({
      price_data: {
        currency: checkoutCurrency,
        product_data: {
          name: "BCUTZ Booking Fee",
          description: "Platform service fee (incl. payment processing)",
        },
        unit_amount: bookingFeeCents,
      },
      quantity: 1,
    });

    // Create Checkout Session with Stripe Connect
    const createSession = async (paymentMethodTypes?: string[]) => {
      return await stripe.checkout.sessions.create({
        customer: customerId,
        customer_email: customerId ? undefined : user.email,
        ...(paymentMethodTypes ? { payment_method_types: paymentMethodTypes } : {}),
        line_items: lineItems,
        mode: "payment",
        payment_intent_data: {
          // Transfer the FULL service amount to the barber's Connect account
          transfer_data: {
            destination: barberProfile.stripe_account_id,
            amount: servicePriceCents, // FULL service price in original currency
          },
          metadata: {
            booking_id: bookingId,
            barber_id: barberId,
            service_id: serviceId,
            customer_id: user.id,
            voucher_id: voucher?.id || '',
            discount_amount_cents: discountCents.toString(),
            checkout_currency: currency,
            original_currency: service.currency || 'CHF',
          },
        },
        success_url: `${origin}/payment-success?booking=${bookingId}`,
        cancel_url: `${origin}/barber/${barberId}?payment=cancelled`,
        metadata: {
          booking_id: bookingId,
          barber_id: barberId,
          service_id: serviceId,
          voucher_id: voucher?.id || '',
          currency: currency,
        },
      });
    };

    // Payment methods (some may not be available in all currencies)
    const preferredMethods = ["card", "twint", "paypal", "klarna"];

    let session: Stripe.Checkout.Session;
    try {
      session = await createSession(preferredMethods);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logStep("Checkout session create failed, retrying with reduced payment methods", { message: msg });

      // Remove payment methods that caused errors
      const reduced = preferredMethods.filter((m) => {
        if (m === "paypal" && msg.toLowerCase().includes("paypal")) return false;
        if (m === "klarna" && msg.toLowerCase().includes("klarna")) return false;
        if (m === "twint" && currency !== 'CHF') return false; // TWINT only for CHF
        return true;
      });

      const fallback = reduced.length ? reduced : ["card"];
      session = await createSession(fallback);
    }

    logStep("Checkout session created", { 
      sessionId: session.id, 
      url: session.url,
      currency: currency,
    });

    // Reserve voucher on booking (but don't mark as fully used yet — that
    // happens in the stripe-webhook when payment actually succeeds).
    // This prevents double-use during the checkout window.
    if (voucher) {
      await supabaseClient
        .from("vouchers")
        .update({ 
          used_on_booking_id: bookingId,
          // Note: is_used stays false until webhook confirms payment
        })
        .eq("id", voucher.id)
        .eq("is_used", false); // Atomic guard against race conditions

      await supabaseClient
        .from("bookings")
        .update({
          voucher_id: voucher.id,
          voucher_discount: discountAmount,
          customer_paid: (customerServicePriceCents + bookingFeeCents) / 100,
          currency: currency,
        })
        .eq("id", bookingId);

      logStep("Voucher reserved on booking (finalized on payment)", { 
        voucherId: voucher.id, 
        bookingId 
      });
    } else {
      // Update booking with currency even without voucher
      await supabaseClient
        .from("bookings")
        .update({
          currency: currency,
        })
        .eq("id", bookingId);
    }

    return new Response(JSON.stringify({ 
      url: session.url,
      sessionId: session.id,
      currency: currency,
      discount: discountAmount > 0 ? {
        amount: discountAmount,
        type: voucher?.discount_type,
        value: voucher?.discount_value,
      } : null,
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
