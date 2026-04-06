import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { sendEmail } from "../_shared/smtp.ts";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-PAYMENT-NOTIFICATION] ${step}${detailsStr}`);
};

interface NotificationRequest {
  bookingId: string;
  customerId: string;
  barberId: string;
}

const emailTranslations = {
  en: {
    customerSubject: "Booking Confirmed - BCUTZ",
    barberSubject: "New Paid Booking - BCUTZ",
    paymentSuccessful: "PAYMENT SUCCESSFUL",
    bookingConfirmed: "Your booking is confirmed",
    thankYou: "Thank you for booking with BCUTZ",
    service: "Service",
    barbershop: "Barbershop",
    date: "Date",
    time: "Time",
    location: "Location",
    totalPaid: "Total Paid",
    reschedule: "Need to reschedule? Visit your bookings page.",
    allRightsReserved: "All rights reserved.",
    paymentReceived: "PAYMENT RECEIVED",
    newConfirmedBooking: "You have a new confirmed booking",
    customerPaid: "A customer has just paid for their appointment.",
    customer: "Customer",
    yourEarnings: "Your Earnings",
    transferInfo: "This amount will be transferred to your bank account via Stripe.",
    valuedCustomer: "valued customer",
  },
  de: {
    customerSubject: "Buchung bestätigt - BCUTZ",
    barberSubject: "Neue bezahlte Buchung - BCUTZ",
    paymentSuccessful: "ZAHLUNG ERFOLGREICH",
    bookingConfirmed: "Deine Buchung ist bestätigt",
    thankYou: "Danke, dass du mit BCUTZ buchst",
    service: "Service",
    barbershop: "Barbershop",
    date: "Datum",
    time: "Zeit",
    location: "Standort",
    totalPaid: "Bezahlt",
    reschedule: "Termin verschieben? Besuche deine Buchungen.",
    allRightsReserved: "Alle Rechte vorbehalten.",
    paymentReceived: "ZAHLUNG ERHALTEN",
    newConfirmedBooking: "Du hast eine neue bestätigte Buchung",
    customerPaid: "Ein Kunde hat gerade für seinen Termin bezahlt.",
    customer: "Kunde",
    yourEarnings: "Dein Verdienst",
    transferInfo: "Dieser Betrag wird per Stripe auf dein Konto überwiesen.",
    valuedCustomer: "geschätzter Kunde",
  },
  fr: {
    customerSubject: "Réservation confirmée - BCUTZ",
    barberSubject: "Nouvelle réservation payée - BCUTZ",
    paymentSuccessful: "PAIEMENT RÉUSSI",
    bookingConfirmed: "Ta réservation est confirmée",
    thankYou: "Merci d'avoir réservé avec BCUTZ",
    service: "Service",
    barbershop: "Salon",
    date: "Date",
    time: "Heure",
    location: "Adresse",
    totalPaid: "Total payé",
    reschedule: "Besoin de reporter? Visite ta page de réservations.",
    allRightsReserved: "Tous droits réservés.",
    paymentReceived: "PAIEMENT REÇU",
    newConfirmedBooking: "Tu as une nouvelle réservation confirmée",
    customerPaid: "Un client vient de payer pour son rendez-vous.",
    customer: "Client",
    yourEarnings: "Tes gains",
    transferInfo: "Ce montant sera transféré sur ton compte via Stripe.",
    valuedCustomer: "cher client",
  },
};

type Language = keyof typeof emailTranslations;

function getLanguage(preferredLanguage: string | null): Language {
  if (preferredLanguage && preferredLanguage in emailTranslations) {
    return preferredLanguage as Language;
  }
  if (preferredLanguage) {
    const langCode = preferredLanguage.split('-')[0];
    if (langCode in emailTranslations) {
      return langCode as Language;
    }
  }
  return 'en';
}

function formatDateForLanguage(date: string, lang: Language): string {
  const localeMap = { en: 'en-GB', de: 'de-CH', fr: 'fr-CH' };
  return new Date(date).toLocaleDateString(localeMap[lang], {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function generateCustomerEmail(
  t: typeof emailTranslations['en'],
  customerName: string,
  booking: any,
  barber: any,
  formattedDate: string
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t.bookingConfirmed}</title>
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
              <div style="display: inline-block; background: rgba(34, 197, 94, 0.15); color: #22c55e; border: 1px solid #22c55e; padding: 6px 14px; border-radius: 4px; font-size: 12px; font-weight: 600; letter-spacing: 0.5px; margin-bottom: 16px;">${t.paymentSuccessful}</div>
              <h2 style="color: #fff; font-size: 22px; font-weight: 600; margin: 0 0 16px 0; line-height: 1.3;">${t.bookingConfirmed}</h2>
              <p style="color: #888; font-size: 14px; margin: 0 0 20px 0;">${t.thankYou}, ${customerName}.</p>
              <div style="color: #aaa; font-size: 14px; line-height: 1.7;">
                <div style="background: #0a0a0a; border: 1px solid #222; padding: 4px 16px; margin: 20px 0;">
                  <div style="padding: 12px 0; border-bottom: 1px solid #222;">
                    <span style="color: #666; font-size: 13px;">${t.service}</span>
                    <span style="float: right; color: #fff; font-size: 13px; font-weight: 500;">${booking.service_name}</span>
                    <div style="clear: both;"></div>
                  </div>
                  <div style="padding: 12px 0; border-bottom: 1px solid #222;">
                    <span style="color: #666; font-size: 13px;">${t.barbershop}</span>
                    <span style="float: right; color: #fff; font-size: 13px; font-weight: 500;">${barber?.shop_name || 'Your Barber'}</span>
                    <div style="clear: both;"></div>
                  </div>
                  <div style="padding: 12px 0; border-bottom: 1px solid #222;">
                    <span style="color: #666; font-size: 13px;">${t.date}</span>
                    <span style="float: right; color: #fff; font-size: 13px; font-weight: 500;">${formattedDate}</span>
                    <div style="clear: both;"></div>
                  </div>
                  <div style="padding: 12px 0; border-bottom: 1px solid #222;">
                    <span style="color: #666; font-size: 13px;">${t.time}</span>
                    <span style="float: right; color: #c9a227; font-size: 13px; font-weight: 600;">${booking.start_time.slice(0, 5)}</span>
                    <div style="clear: both;"></div>
                  </div>
                  <div style="padding: 12px 0; border-bottom: 1px solid #222;">
                    <span style="color: #666; font-size: 13px;">${t.location}</span>
                    <span style="float: right; color: #fff; font-size: 13px; font-weight: 500;">${barber?.address || ''}, ${barber?.city || ''}</span>
                    <div style="clear: both;"></div>
                  </div>
                  <div style="padding: 12px 0;">
                    <span style="color: #666; font-size: 13px;">${t.totalPaid}</span>
                    <span style="float: right; color: #c9a227; font-size: 16px; font-weight: 700;">${booking.currency} ${Number(booking.total_amount).toFixed(2)}</span>
                    <div style="clear: both;"></div>
                  </div>
                </div>
                
                <p style="color: #666; font-size: 12px; text-align: center;">${t.reschedule}</p>
              </div>
              <div style="margin: 32px 0; text-align: center;">
                <a href="https://bcutz.lovable.app/bookings" style="display: inline-block; background: #c9a227; color: #0a0a0a; text-decoration: none; padding: 14px 32px; font-weight: 600; letter-spacing: 1px; font-size: 14px;">
                  VIEW BOOKINGS
                </a>
              </div>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 24px 0; text-align: center;">
              <p style="color: #444; font-size: 11px; margin: 0;">
                © ${new Date().getFullYear()} BCUTZ. ${t.allRightsReserved}
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

function generateBarberEmail(
  t: typeof emailTranslations['en'],
  customerName: string,
  booking: any,
  formattedDate: string
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t.newConfirmedBooking}</title>
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
              <div style="display: inline-block; background: rgba(201, 162, 39, 0.15); color: #c9a227; border: 1px solid #c9a227; padding: 6px 14px; border-radius: 4px; font-size: 12px; font-weight: 600; letter-spacing: 0.5px; margin-bottom: 16px;">${t.paymentReceived}</div>
              <h2 style="color: #fff; font-size: 22px; font-weight: 600; margin: 0 0 16px 0; line-height: 1.3;">${t.newConfirmedBooking}</h2>
              <p style="color: #888; font-size: 14px; margin: 0 0 20px 0;">${t.customerPaid}</p>
              <div style="color: #aaa; font-size: 14px; line-height: 1.7;">
                <div style="background: #0a0a0a; border: 1px solid #222; padding: 4px 16px; margin: 20px 0;">
                  <div style="padding: 12px 0; border-bottom: 1px solid #222;">
                    <span style="color: #666; font-size: 13px;">${t.customer}</span>
                    <span style="float: right; color: #fff; font-size: 13px; font-weight: 500;">${customerName}</span>
                    <div style="clear: both;"></div>
                  </div>
                  <div style="padding: 12px 0; border-bottom: 1px solid #222;">
                    <span style="color: #666; font-size: 13px;">${t.service}</span>
                    <span style="float: right; color: #fff; font-size: 13px; font-weight: 500;">${booking.service_name}</span>
                    <div style="clear: both;"></div>
                  </div>
                  <div style="padding: 12px 0; border-bottom: 1px solid #222;">
                    <span style="color: #666; font-size: 13px;">${t.date}</span>
                    <span style="float: right; color: #fff; font-size: 13px; font-weight: 500;">${formattedDate}</span>
                    <div style="clear: both;"></div>
                  </div>
                  <div style="padding: 12px 0; border-bottom: 1px solid #222;">
                    <span style="color: #666; font-size: 13px;">${t.time}</span>
                    <span style="float: right; color: #c9a227; font-size: 13px; font-weight: 600;">${booking.start_time.slice(0, 5)}</span>
                    <div style="clear: both;"></div>
                  </div>
                  <div style="padding: 12px 0;">
                    <span style="color: #666; font-size: 13px;">${t.yourEarnings}</span>
                    <span style="float: right; color: #22c55e; font-size: 18px; font-weight: 700;">+${booking.currency} ${Number(booking.service_price).toFixed(2)}</span>
                    <div style="clear: both;"></div>
                  </div>
                </div>
                
                <p style="color: #666; font-size: 12px; text-align: center;">${t.transferInfo}</p>
              </div>
              <div style="margin: 32px 0; text-align: center;">
                <a href="https://bcutz.lovable.app/dashboard/calendar" style="display: inline-block; background: #c9a227; color: #0a0a0a; text-decoration: none; padding: 14px 32px; font-weight: 600; letter-spacing: 1px; font-size: 14px;">
                  VIEW CALENDAR
                </a>
              </div>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 24px 0; text-align: center;">
              <p style="color: #444; font-size: 11px; margin: 0;">
                © ${new Date().getFullYear()} BCUTZ. ${t.allRightsReserved}
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
    logStep("Function started");

    // SECURITY: Require service-role authentication
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!serviceRoleKey || token !== serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Service role authentication required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    
    const supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
    });

    const { bookingId, customerId, barberId }: NotificationRequest = await req.json();
    logStep("Request parsed", { bookingId, customerId, barberId });

    const { data: booking, error: bookingError } = await supabaseClient
      .from("bookings")
      .select(`id, booking_date, start_time, service_name, service_price, total_amount, currency`)
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      throw new Error("Booking not found");
    }
    logStep("Booking found", { serviceName: booking.service_name });

    const { data: customer } = await supabaseClient
      .from("profiles")
      .select("full_name, email, preferred_language")
      .eq("id", customerId)
      .single();

    const { data: barber } = await supabaseClient
      .from("barber_profiles")
      .select("shop_name, address, city, user_id")
      .eq("id", barberId)
      .single();

    let barberEmail = null;
    let barberLanguage: Language = 'en';
    if (barber?.user_id) {
      const { data: barberProfile } = await supabaseClient
        .from("profiles")
        .select("email, preferred_language")
        .eq("id", barber.user_id)
        .single();
      barberEmail = barberProfile?.email;
      barberLanguage = getLanguage(barberProfile?.preferred_language);
    }

    const customerLanguage = getLanguage(customer?.preferred_language);
    logStep("Languages determined", { customerLanguage, barberLanguage });

    const emailResults = [];

    if (customer?.email) {
      try {
        const t = emailTranslations[customerLanguage];
        const formattedDate = formatDateForLanguage(booking.booking_date, customerLanguage);
        const customerEmailHtml = generateCustomerEmail(
          t,
          customer?.full_name || t.valuedCustomer,
          booking,
          barber,
          formattedDate
        );

        await sendEmail({ to: customer.email, subject: t.customerSubject, html: customerEmailHtml });
        emailResults.push({ customer: "sent", language: customerLanguage });
        logStep("Customer email sent", { email: customer.email, language: customerLanguage });
      } catch (emailError: any) {
        logStep("Customer email error", { error: emailError.message });
        emailResults.push({ customer: "error", error: emailError.message });
      }
    }

    if (barberEmail) {
      try {
        const t = emailTranslations[barberLanguage];
        const formattedDate = formatDateForLanguage(booking.booking_date, barberLanguage);
        const barberEmailHtml = generateBarberEmail(
          t,
          customer?.full_name || t.customer,
          booking,
          formattedDate
        );

        await sendEmail({ to: barberEmail, subject: t.barberSubject, html: barberEmailHtml });
        emailResults.push({ barber: "sent", language: barberLanguage });
        logStep("Barber email sent", { email: barberEmail, language: barberLanguage });
      } catch (emailError: any) {
        logStep("Barber email error", { error: emailError.message });
        emailResults.push({ barber: "error", error: emailError.message });
      }
    }

    if (customerId) {
      const t = emailTranslations[customerLanguage];
      const formattedDate = formatDateForLanguage(booking.booking_date, customerLanguage);
      await supabaseClient.from("notifications").insert({
        user_id: customerId,
        title: t.bookingConfirmed,
        message: `${booking.service_name} - ${formattedDate} @ ${booking.start_time.slice(0, 5)}`,
        type: "booking",
        action_url: "/bookings",
      });
    }

    if (barber?.user_id) {
      const t = emailTranslations[barberLanguage];
      const formattedDate = formatDateForLanguage(booking.booking_date, barberLanguage);
      await supabaseClient.from("notifications").insert({
        user_id: barber.user_id,
        title: t.paymentReceived,
        message: `${customer?.full_name || t.customer}: ${booking.service_name} - ${formattedDate} @ ${booking.start_time.slice(0, 5)}. ${t.yourEarnings}: ${booking.currency} ${Number(booking.service_price).toFixed(2)}`,
        type: "booking",
        action_url: "/dashboard/calendar",
      });
    }

    logStep("Notifications complete", { emailResults });

    return new Response(JSON.stringify({ success: true, emails: emailResults }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
