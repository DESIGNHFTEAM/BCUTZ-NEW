import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { sendEmail } from "../_shared/smtp.ts";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-PAYMENT-RECEIPT] ${step}${detailsStr}`);
};

interface ReceiptRequest {
  bookingId?: string;
  test_mode?: boolean;
  test_email?: string;
}

function generateReceiptEmail(customer: any, booking: any, barber: any, payment: any): string {
  const year = new Date().getFullYear();
  const bookingDate = new Date(booking.booking_date).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  const startTime = booking.start_time.substring(0, 5);
  const endTime = booking.end_time.substring(0, 5);
  
  const paymentMethodLabel = payment?.payment_method === 'twint' ? 'TWINT' :
                             payment?.payment_method === 'paypal' ? 'PayPal' :
                             payment?.payment_method === 'klarna' ? 'Klarna' : 'Card';
  
  const paidAt = payment?.paid_at ? 
    new Date(payment.paid_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : 
    new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });

  const invoiceNumber = 'INV-' + booking.id.substring(0, 8).toUpperCase();
  const transactionId = (payment?.provider_transaction_id?.substring(0, 20) || booking.id.substring(0, 12));
  const barberName = barber?.shop_name || 'Your Barber';
  const barberAddress = barber ? (barber.address + ', ' + barber.postal_code + ' ' + barber.city) : 'Address not available';
  const customerName = customer.full_name || '';

  const pointsSection = booking.points_earned ? 
    '<div style="background:rgba(201,162,39,0.1);border:1px solid #c9a227;padding:12px 16px;margin:20px 0;text-align:center;"><p style="color:#c9a227;margin:0;font-size:13px;">You earned <strong>' + booking.points_earned + ' loyalty points</strong> with this booking!</p></div>' : '';

  return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Payment Receipt - BCUTZ</title></head>' +
    '<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif;">' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0a0a0a;">' +
    '<tr><td align="center" style="padding:40px 20px;">' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;">' +
    '<tr><td align="center" style="padding-bottom:32px;"><h1 style="margin:0;font-size:48px;font-weight:700;color:#c9a227;font-family:Georgia,serif;letter-spacing:2px;">BCUTZ</h1></td></tr>' +
    '<tr><td style="background-color:#111;border:1px solid #222;padding:32px;">' +
    '<div style="display:inline-block;background:rgba(34,197,94,0.15);color:#22c55e;border:1px solid #22c55e;padding:6px 14px;border-radius:4px;font-size:12px;font-weight:600;letter-spacing:0.5px;margin-bottom:16px;">PAYMENT RECEIPT</div>' +
    '<h2 style="color:#fff;font-size:22px;font-weight:600;margin:0 0 16px 0;line-height:1.3;">Thank you for your booking' + (customerName ? ', ' + customerName : '') + '</h2>' +
    '<p style="color:#888;font-size:14px;margin:0 0 20px 0;">Your appointment has been confirmed and paid.</p>' +
    '<div style="color:#aaa;font-size:14px;line-height:1.7;">' +
    '<div style="background:#0a0a0a;border:1px solid #222;padding:4px 16px;margin:20px 0;">' +
    '<div style="padding:12px 0;border-bottom:1px solid #222;"><span style="color:#666;font-size:12px;text-transform:uppercase;">Invoice Number</span><span style="float:right;color:#fff;font-size:13px;font-weight:500;">' + invoiceNumber + '</span><div style="clear:both;"></div></div>' +
    '<div style="padding:12px 0;border-bottom:1px solid #222;"><span style="color:#666;font-size:12px;text-transform:uppercase;">Transaction ID</span><span style="float:right;color:#fff;font-size:12px;font-family:monospace;">' + transactionId + '</span><div style="clear:both;"></div></div>' +
    '<div style="padding:12px 0;border-bottom:1px solid #222;"><span style="color:#666;font-size:12px;text-transform:uppercase;">Payment Date</span><span style="float:right;color:#fff;font-size:13px;font-weight:500;">' + paidAt + '</span><div style="clear:both;"></div></div>' +
    '<div style="padding:12px 0;"><span style="color:#666;font-size:12px;text-transform:uppercase;">Payment Method</span><span style="float:right;color:#fff;font-size:13px;font-weight:500;">' + paymentMethodLabel + '</span><div style="clear:both;"></div></div>' +
    '</div>' +
    '<p style="color:#c9a227;font-weight:600;margin:24px 0 12px 0;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Appointment Details</p>' +
    '<div style="background:#0a0a0a;border:1px solid #222;padding:4px 16px;margin:0 0 20px 0;">' +
    '<div style="padding:12px 0;border-bottom:1px solid #222;"><span style="color:#666;font-size:13px;">Shop</span><span style="float:right;color:#fff;font-size:13px;font-weight:500;">' + barberName + '</span><div style="clear:both;"></div></div>' +
    '<div style="padding:12px 0;border-bottom:1px solid #222;"><span style="color:#666;font-size:13px;">Address</span><span style="float:right;color:#fff;font-size:13px;font-weight:500;">' + barberAddress + '</span><div style="clear:both;"></div></div>' +
    '<div style="padding:12px 0;border-bottom:1px solid #222;"><span style="color:#666;font-size:13px;">Date</span><span style="float:right;color:#fff;font-size:13px;font-weight:500;">' + bookingDate + '</span><div style="clear:both;"></div></div>' +
    '<div style="padding:12px 0;border-bottom:1px solid #222;"><span style="color:#666;font-size:13px;">Time</span><span style="float:right;color:#c9a227;font-size:13px;font-weight:600;">' + startTime + ' - ' + endTime + '</span><div style="clear:both;"></div></div>' +
    '<div style="padding:12px 0;"><span style="color:#666;font-size:13px;">Service</span><span style="float:right;color:#fff;font-size:13px;font-weight:500;">' + booking.service_name + '</span><div style="clear:both;"></div></div>' +
    '</div>' +
    '<p style="color:#c9a227;font-weight:600;margin:24px 0 12px 0;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Payment Summary</p>' +
    '<div style="background:#0a0a0a;border:1px solid #222;padding:4px 16px;margin:0 0 20px 0;">' +
    '<div style="padding:12px 0;border-bottom:1px solid #222;"><span style="color:#aaa;font-size:13px;">' + booking.service_name + '</span><span style="float:right;color:#fff;font-size:13px;">' + booking.currency + ' ' + Number(booking.service_price).toFixed(2) + '</span><div style="clear:both;"></div></div>' +
    '<div style="padding:12px 0;border-bottom:1px solid #222;"><span style="color:#aaa;font-size:13px;">Booking Fee</span><span style="float:right;color:#fff;font-size:13px;">' + booking.currency + ' ' + Number(booking.platform_fee).toFixed(2) + '</span><div style="clear:both;"></div></div>' +
    '<div style="padding:16px 0;background:#0f0f0f;margin:0 -16px;padding-left:16px;padding-right:16px;"><span style="color:#fff;font-size:14px;font-weight:600;">Total Paid</span><span style="float:right;color:#c9a227;font-size:18px;font-weight:700;">' + booking.currency + ' ' + Number(booking.total_amount).toFixed(2) + '</span><div style="clear:both;"></div></div>' +
    '</div>' +
    pointsSection +
    '</div>' +
    '<div style="margin:32px 0;text-align:center;">' +
    '<a href="https://bcutz.com/bookings" style="display:inline-block;background:#c9a227;color:#0a0a0a;text-decoration:none;padding:14px 32px;font-weight:600;letter-spacing:1px;font-size:14px;">VIEW MY BOOKINGS</a>' +
    '</div></td></tr>' +
    '<tr><td style="padding:24px 0;text-align:center;">' +
    '<p style="color:#666;font-size:12px;margin:0 0 8px 0;">This is your official payment receipt.</p>' +
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
    logStep("Function started");

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

    const { bookingId, test_mode, test_email }: ReceiptRequest = await req.json();
    
    // Handle test mode - send sample email without real booking data
    if (test_mode && test_email) {
      logStep("Test mode activated", { test_email });
      
      const testCustomer = { full_name: 'BCUTZ Team', email: test_email };
      const testBooking = {
        id: 'TEST-0001-ABCD',
        booking_date: new Date().toISOString().split('T')[0],
        start_time: '14:00:00',
        end_time: '14:45:00',
        service_name: 'Classic Haircut',
        service_price: 45.00,
        platform_fee: 2.25,
        total_amount: 47.25,
        currency: 'CHF',
        points_earned: 47
      };
      const testBarber = {
        shop_name: 'Premium Barbershop',
        address: 'Bahnhofstrasse 10',
        city: 'Zürich',
        postal_code: '8001',
        phone: '+41 44 123 45 67'
      };
      const testPayment = {
        payment_method: 'credit_card',
        paid_at: new Date().toISOString(),
        provider_transaction_id: 'pi_TEST123456789'
      };
      
      const emailHtml = generateReceiptEmail(testCustomer, testBooking, testBarber, testPayment);
      await sendEmail({ to: test_email, subject: 'Payment Receipt - Classic Haircut at Premium Barbershop', html: emailHtml });
      
      logStep("Test receipt email sent", { to: test_email });
      return new Response(JSON.stringify({ success: true, sentTo: test_email, test: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!bookingId) {
      throw new Error("Booking ID is required");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    logStep("Processing receipt", { bookingId });

    const { data: booking, error: bookingError } = await supabaseClient
      .from("bookings")
      .select(`id, booking_date, start_time, end_time, service_name, service_price, platform_fee, total_amount, currency, customer_id, barber_id, points_earned, status, created_at`)
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      throw new Error(`Booking not found: ${bookingError?.message}`);
    }

    logStep("Booking fetched", { serviceName: booking.service_name, customerId: booking.customer_id });

    const { data: customer, error: customerError } = await supabaseClient
      .from("profiles")
      .select("full_name, email")
      .eq("id", booking.customer_id)
      .single();

    if (customerError || !customer?.email) {
      logStep("Customer email not found, skipping receipt", { error: customerError?.message, customerId: booking.customer_id });
      return new Response(JSON.stringify({ success: false, message: "Customer email not found" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Customer found", { email: customer.email, name: customer.full_name });

    const { data: barber } = await supabaseClient
      .from("barber_profiles")
      .select("shop_name, address, city, postal_code, phone")
      .eq("id", booking.barber_id)
      .single();

    const { data: payment } = await supabaseClient
      .from("payments")
      .select("payment_method, paid_at, provider_transaction_id")
      .eq("booking_id", bookingId)
      .single();

    const emailHtml = generateReceiptEmail(customer, booking, barber, payment);

    await sendEmail({
      to: customer.email,
      subject: `Payment Receipt - ${booking.service_name} at ${barber?.shop_name || 'Your Barber'}`,
      html: emailHtml,
    });

    logStep("Receipt email sent successfully", { to: customer.email });

    return new Response(JSON.stringify({ success: true, sentTo: customer.email }), {
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
