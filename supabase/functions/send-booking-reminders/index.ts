import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { sendEmail } from "../_shared/smtp.ts";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[BOOKING-REMINDERS] ${step}${detailsStr}`);
};

const reminderTranslations = {
  en: {
    subject24h: "Your appointment is tomorrow - BCUTZ",
    subject1h: "Your appointment is in 1 hour - BCUTZ",
    title24h: "Appointment Tomorrow",
    title1h: "Appointment in 1 Hour",
    greeting: "Hey",
    reminder24h: "Just a friendly reminder that you have an appointment tomorrow.",
    reminder1h: "Your appointment is coming up in just 1 hour!",
    service: "Service",
    barbershop: "Barbershop",
    date: "Date",
    time: "Time",
    location: "Location",
    seeYouSoon: "See you soon!",
    needToReschedule: "Need to reschedule? Please contact us as soon as possible.",
    allRightsReserved: "All rights reserved.",
  },
  de: {
    subject24h: "Dein Termin ist morgen - BCUTZ",
    subject1h: "Dein Termin ist in 1 Stunde - BCUTZ",
    title24h: "Termin Morgen",
    title1h: "Termin in 1 Stunde",
    greeting: "Hey",
    reminder24h: "Nur eine freundliche Erinnerung, dass du morgen einen Termin hast.",
    reminder1h: "Dein Termin steht in nur 1 Stunde an!",
    service: "Service",
    barbershop: "Barbershop",
    date: "Datum",
    time: "Zeit",
    location: "Standort",
    seeYouSoon: "Bis bald!",
    needToReschedule: "Termin verschieben? Bitte kontaktiere uns so schnell wie möglich.",
    allRightsReserved: "Alle Rechte vorbehalten.",
  },
  fr: {
    subject24h: "Ton rendez-vous est demain - BCUTZ",
    subject1h: "Ton rendez-vous est dans 1 heure - BCUTZ",
    title24h: "Rendez-vous Demain",
    title1h: "Rendez-vous dans 1 Heure",
    greeting: "Salut",
    reminder24h: "Juste un petit rappel que tu as un rendez-vous demain.",
    reminder1h: "Ton rendez-vous arrive dans seulement 1 heure!",
    service: "Service",
    barbershop: "Salon",
    date: "Date",
    time: "Heure",
    location: "Adresse",
    seeYouSoon: "À bientôt!",
    needToReschedule: "Besoin de reporter? Contacte-nous dès que possible.",
    allRightsReserved: "Tous droits réservés.",
  },
};

type Language = keyof typeof reminderTranslations;

function getLanguage(preferredLanguage: string | null): Language {
  if (preferredLanguage && preferredLanguage in reminderTranslations) {
    return preferredLanguage as Language;
  }
  if (preferredLanguage) {
    const langCode = preferredLanguage.split('-')[0];
    if (langCode in reminderTranslations) {
      return langCode as Language;
    }
  }
  return 'en';
}

function formatDateForLanguage(date: string, lang: Language): string {
  const localeMap = { en: 'en-GB', de: 'de-CH', fr: 'fr-CH' };
  return new Date(date).toLocaleDateString(localeMap[lang], {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
}

function generateReminderEmail(t: typeof reminderTranslations['en'], is24h: boolean, customerName: string, booking: any, barber: any, formattedDate: string): string {
  const badgeBg = is24h ? 'rgba(59,130,246,0.15)' : 'rgba(234,179,8,0.15)';
  const badgeBorder = is24h ? '#3b82f6' : '#eab308';
  const badgeText = is24h ? '#3b82f6' : '#eab308';
  const year = new Date().getFullYear();

  return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>' + (is24h ? t.title24h : t.title1h) + '</title></head>' +
    '<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif;">' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0a0a0a;">' +
    '<tr><td align="center" style="padding:40px 20px;">' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;">' +
    '<tr><td align="center" style="padding-bottom:32px;"><h1 style="margin:0;font-size:48px;font-weight:700;color:#c9a227;font-family:Georgia,serif;letter-spacing:2px;">BCUTZ</h1></td></tr>' +
    '<tr><td style="background-color:#111;border:1px solid #222;padding:32px;">' +
    '<div style="display:inline-block;background:' + badgeBg + ';color:' + badgeText + ';border:1px solid ' + badgeBorder + ';padding:6px 14px;border-radius:4px;font-size:12px;font-weight:600;letter-spacing:0.5px;margin-bottom:16px;">REMINDER</div>' +
    '<h2 style="color:#fff;font-size:22px;font-weight:600;margin:0 0 16px 0;line-height:1.3;">' + (is24h ? t.title24h : t.title1h) + '</h2>' +
    '<p style="color:#888;font-size:14px;margin:0 0 20px 0;">' + t.greeting + ' ' + customerName + ',</p>' +
    '<div style="color:#aaa;font-size:14px;line-height:1.7;">' +
    '<p style="margin:0 0 16px 0;">' + (is24h ? t.reminder24h : t.reminder1h) + '</p>' +
    '<div style="background:#0a0a0a;border:1px solid #222;padding:4px 16px;margin:20px 0;">' +
    '<div style="padding:12px 0;border-bottom:1px solid #222;"><span style="color:#666;font-size:13px;">' + t.service + '</span><span style="float:right;color:#fff;font-size:13px;font-weight:500;">' + booking.service_name + '</span><div style="clear:both;"></div></div>' +
    '<div style="padding:12px 0;border-bottom:1px solid #222;"><span style="color:#666;font-size:13px;">' + t.barbershop + '</span><span style="float:right;color:#fff;font-size:13px;font-weight:500;">' + (barber?.shop_name || 'Your Barber') + '</span><div style="clear:both;"></div></div>' +
    '<div style="padding:12px 0;border-bottom:1px solid #222;"><span style="color:#666;font-size:13px;">' + t.date + '</span><span style="float:right;color:#fff;font-size:13px;font-weight:500;">' + formattedDate + '</span><div style="clear:both;"></div></div>' +
    '<div style="padding:12px 0;border-bottom:1px solid #222;"><span style="color:#666;font-size:13px;">' + t.time + '</span><span style="float:right;color:#c9a227;font-size:13px;font-weight:600;">' + booking.start_time.slice(0, 5) + '</span><div style="clear:both;"></div></div>' +
    '<div style="padding:12px 0;"><span style="color:#666;font-size:13px;">' + t.location + '</span><span style="float:right;color:#fff;font-size:13px;font-weight:500;">' + (barber?.address || '') + ', ' + (barber?.city || '') + '</span><div style="clear:both;"></div></div>' +
    '</div>' +
    '<p style="color:#22c55e;font-weight:600;margin:16px 0 0 0;">' + t.seeYouSoon + '</p>' +
    '<p style="color:#666;font-size:12px;margin:8px 0 0 0;">' + t.needToReschedule + '</p>' +
    '</div></td></tr>' +
    '<tr><td style="padding:24px 0;text-align:center;">' +
    '<p style="color:#444;font-size:11px;margin:0;">&copy; ' + year + ' BCUTZ. ' + t.allRightsReserved + '</p>' +
    '<p style="margin:12px 0 0 0;"><a href="https://bcutz.com" style="color:#c9a227;font-size:11px;text-decoration:none;">bcutz.com</a></p>' +
    '</td></tr></table></td></tr></table></body></html>';
}

serve(async (req) => {
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
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Starting booking reminder check");

    const body = await req.json().catch(() => ({}));
    const { test_mode, test_email } = body;

    // Handle test mode - send sample emails without real booking data
    if (test_mode && test_email) {
      logStep("Test mode activated", { test_email });
      
      const testBooking = {
        service_name: 'Classic Haircut + Beard Trim',
        booking_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        start_time: '14:30:00'
      };
      const testBarber = {
        shop_name: 'Premium Barbershop',
        address: 'Bahnhofstrasse 10',
        city: 'Zürich'
      };
      
      const t = reminderTranslations.en;
      const formattedDate = formatDateForLanguage(testBooking.booking_date, 'en');
      
      // Send 24h reminder test
      await sendEmail({ to: test_email, subject: t.subject24h, html: generateReminderEmail(t, true, 'BCUTZ Team', testBooking, testBarber, formattedDate) });
      
      // Send 1h reminder test
      await sendEmail({ to: test_email, subject: t.subject1h, html: generateReminderEmail(t, false, 'BCUTZ Team', testBooking, testBarber, formattedDate) });
      
      logStep("Test reminder emails sent", { to: test_email });
      return new Response(JSON.stringify({ success: true, sent24h: 1, sent1h: 1, test: true, sentTo: test_email }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    const now = new Date();
    const hours24From = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const hours24To = new Date(now.getTime() + 25 * 60 * 60 * 1000);
    const hours1From = new Date(now.getTime() + 55 * 60 * 1000);
    const hours1To = new Date(now.getTime() + 65 * 60 * 1000);

    const { data: bookings24h, error: error24h } = await supabase
      .from("bookings")
      .select(`id, booking_date, start_time, service_name, customer_id, barber_id`)
      .eq("status", "confirmed")
      .gte("booking_date", hours24From.toISOString().split('T')[0])
      .lte("booking_date", hours24To.toISOString().split('T')[0]);

    const { data: bookings1h, error: error1h } = await supabase
      .from("bookings")
      .select(`id, booking_date, start_time, service_name, customer_id, barber_id`)
      .eq("status", "confirmed")
      .eq("booking_date", now.toISOString().split('T')[0]);

    if (error24h || error1h) {
      throw new Error(`Database error: ${error24h?.message || error1h?.message}`);
    }

    logStep("Found bookings", { count24h: bookings24h?.length || 0, count1h: bookings1h?.length || 0 });

    const results = { sent24h: 0, sent1h: 0, errors: [] as string[] };

    for (const booking of bookings24h || []) {
      try {
        const bookingDateTime = new Date(`${booking.booking_date}T${booking.start_time}`);
        if (bookingDateTime < hours24From || bookingDateTime > hours24To) continue;

        const [customerResult, barberResult] = await Promise.all([
          supabase.from("profiles").select("full_name, email, preferred_language").eq("id", booking.customer_id).single(),
          supabase.from("barber_profiles").select("shop_name, address, city").eq("id", booking.barber_id).single()
        ]);

        if (!customerResult.data?.email) continue;

        const customer = customerResult.data;
        const barber = barberResult.data;
        const lang = getLanguage(customer.preferred_language);
        const t = reminderTranslations[lang];
        const formattedDate = formatDateForLanguage(booking.booking_date, lang);

        await sendEmail({ to: customer.email, subject: t.subject24h, html: generateReminderEmail(t, true, customer.full_name || 'there', booking, barber, formattedDate) });

        await supabase.from("notifications").insert({
          user_id: booking.customer_id,
          title: t.title24h,
          message: `${booking.service_name} - ${formattedDate} @ ${booking.start_time.slice(0, 5)}`,
          type: "reminder",
          action_url: "/bookings",
        });

        results.sent24h++;
        logStep("Sent 24h reminder", { bookingId: booking.id, email: customer.email });
      } catch (err: any) {
        results.errors.push(`24h ${booking.id}: ${err.message}`);
      }
    }

    for (const booking of bookings1h || []) {
      try {
        const bookingDateTime = new Date(`${booking.booking_date}T${booking.start_time}`);
        if (bookingDateTime < hours1From || bookingDateTime > hours1To) continue;

        const [customerResult, barberResult] = await Promise.all([
          supabase.from("profiles").select("full_name, email, preferred_language").eq("id", booking.customer_id).single(),
          supabase.from("barber_profiles").select("shop_name, address, city").eq("id", booking.barber_id).single()
        ]);

        if (!customerResult.data?.email) continue;

        const customer = customerResult.data;
        const barber = barberResult.data;
        const lang = getLanguage(customer.preferred_language);
        const t = reminderTranslations[lang];
        const formattedDate = formatDateForLanguage(booking.booking_date, lang);

        await sendEmail({ to: customer.email, subject: t.subject1h, html: generateReminderEmail(t, false, customer.full_name || 'there', booking, barber, formattedDate) });

        await supabase.from("notifications").insert({
          user_id: booking.customer_id,
          title: t.title1h,
          message: `${booking.service_name} @ ${booking.start_time.slice(0, 5)} - ${t.seeYouSoon}`,
          type: "reminder",
          action_url: "/bookings",
        });

        results.sent1h++;
        logStep("Sent 1h reminder", { bookingId: booking.id, email: customer.email });
      } catch (err: any) {
        results.errors.push(`1h ${booking.id}: ${err.message}`);
      }
    }

    logStep("Reminder check complete", results);

    return new Response(JSON.stringify({ success: true, ...results }), {
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
