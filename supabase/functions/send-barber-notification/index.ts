import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { z } from "https://esm.sh/zod@3.22.4";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { sendEmail } from "../_shared/smtp.ts";

// UUID validation regex
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Input validation schema
const NotificationRequestSchema = z.object({
  barber_id: z.string().regex(uuidRegex, "Invalid barber ID format"),
  action: z.enum(["approved", "rejected"], { errorMap: () => ({ message: "Action must be 'approved' or 'rejected'" }) }),
  reason: z.string().max(500, "Reason must be 500 characters or less").optional(),
});

type NotificationRequest = z.infer<typeof NotificationRequestSchema>;

// Localized email content
const emailTranslations = {
  en: {
    approvedSubject: (shopName: string) => `Congratulations - ${shopName} has been approved on BCUTZ`,
    rejectedSubject: (shopName: string) => `Update on your BCUTZ application for ${shopName}`,
    hi: "Hi",
    greatNews: "Great news! Your barber shop",
    hasBeenVerified: "has been verified and approved on BCUTZ.",
    youCanNow: "You can now:",
    receiveBookings: "Receive bookings from customers",
    accessDashboard: "Access your dashboard and analytics",
    startEarning: "Start earning with every appointment",
    buildReputation: "Build your reputation with reviews",
    goToDashboard: "GO TO DASHBOARD",
    questions: "If you have any questions, feel free to reach out to our support team.",
    thankYouInterest: "Thank you for your interest in joining BCUTZ with",
    unableToApprove: "After reviewing your application, we were unable to approve it at this time.",
    reason: "Reason",
    tryAgainTips: "This doesn't mean you can't try again! Here are some tips:",
    tip1: "Ensure your profile information is complete and accurate",
    tip2: "Add high-quality photos of your work",
    tip3: "Provide a detailed description of your services",
    tip4: "Verify your contact information",
    contactSupport: "If you believe this was a mistake or have questions, please contact our support team.",
    allRightsReserved: "All rights reserved.",
    shopApproved: "Your shop has been approved!",
    applicationUpdate: "Application Update",
    congratsMessage: (shopName: string) => `Congratulations! ${shopName} is now live on BCUTZ. You can start accepting bookings.`,
    notApprovedMessage: (shopName: string, reason?: string) => `Your application for ${shopName} was not approved at this time.${reason ? ` Reason: ${reason}` : ''} Please review your profile and try again.`,
  },
  de: {
    approvedSubject: (shopName: string) => `Herzlichen Glueckwunsch - ${shopName} wurde auf BCUTZ genehmigt`,
    rejectedSubject: (shopName: string) => `Update zu deiner BCUTZ-Bewerbung fuer ${shopName}`,
    hi: "Hi",
    greatNews: "Gute Nachrichten! Dein Barbershop",
    hasBeenVerified: "wurde auf BCUTZ verifiziert und genehmigt.",
    youCanNow: "Du kannst jetzt:",
    receiveBookings: "Buchungen von Kunden empfangen",
    accessDashboard: "Auf dein Dashboard und Analysen zugreifen",
    startEarning: "Mit jedem Termin verdienen",
    buildReputation: "Deine Reputation mit Bewertungen aufbauen",
    goToDashboard: "ZUM DASHBOARD",
    questions: "Bei Fragen kannst du dich jederzeit an unser Support-Team wenden.",
    thankYouInterest: "Danke fuer dein Interesse, BCUTZ mit beizutreten:",
    unableToApprove: "Nach Pruefung deiner Bewerbung konnten wir sie derzeit nicht genehmigen.",
    reason: "Grund",
    tryAgainTips: "Das heisst nicht, dass du es nicht nochmal versuchen kannst! Hier einige Tipps:",
    tip1: "Stelle sicher, dass deine Profilinformationen vollstaendig und korrekt sind",
    tip2: "Fuege hochwertige Fotos deiner Arbeit hinzu",
    tip3: "Gib eine detaillierte Beschreibung deiner Dienstleistungen",
    tip4: "Verifiziere deine Kontaktdaten",
    contactSupport: "Wenn du glaubst, dass dies ein Fehler war oder Fragen hast, kontaktiere bitte unser Support-Team.",
    allRightsReserved: "Alle Rechte vorbehalten.",
    shopApproved: "Dein Shop wurde genehmigt!",
    applicationUpdate: "Bewerbungs-Update",
    congratsMessage: (shopName: string) => `Herzlichen Glueckwunsch! ${shopName} ist jetzt auf BCUTZ live. Du kannst Buchungen annehmen.`,
    notApprovedMessage: (shopName: string, reason?: string) => `Deine Bewerbung fuer ${shopName} wurde derzeit nicht genehmigt.${reason ? ` Grund: ${reason}` : ''} Bitte ueberpruefe dein Profil und versuch es erneut.`,
  },
  fr: {
    approvedSubject: (shopName: string) => `Felicitations - ${shopName} a ete approuve sur BCUTZ`,
    rejectedSubject: (shopName: string) => `Mise a jour sur ta candidature BCUTZ pour ${shopName}`,
    hi: "Salut",
    greatNews: "Bonne nouvelle ! Ton salon",
    hasBeenVerified: "a ete verifie et approuve sur BCUTZ.",
    youCanNow: "Tu peux maintenant :",
    receiveBookings: "Recevoir des reservations de clients",
    accessDashboard: "Acceder a ton tableau de bord et analyses",
    startEarning: "Gagner de l'argent a chaque rendez-vous",
    buildReputation: "Construire ta reputation avec des avis",
    goToDashboard: "ALLER AU DASHBOARD",
    questions: "Si tu as des questions, contacte notre equipe support.",
    thankYouInterest: "Merci pour ton interet a rejoindre BCUTZ avec",
    unableToApprove: "Apres examen de ta candidature, nous n'avons pas pu l'approuver pour le moment.",
    reason: "Raison",
    tryAgainTips: "Ca ne veut pas dire que tu ne peux pas reessayer ! Voici quelques conseils :",
    tip1: "Assure-toi que tes informations de profil sont completes et exactes",
    tip2: "Ajoute des photos de qualite de ton travail",
    tip3: "Fournis une description detaillee de tes services",
    tip4: "Verifie tes coordonnees",
    contactSupport: "Si tu penses qu'il s'agit d'une erreur ou si tu as des questions, contacte notre equipe support.",
    allRightsReserved: "Tous droits reserves.",
    shopApproved: "Ton salon a ete approuve !",
    applicationUpdate: "Mise a jour de candidature",
    congratsMessage: (shopName: string) => `Felicitations ! ${shopName} est maintenant en ligne sur BCUTZ. Tu peux accepter des reservations.`,
    notApprovedMessage: (shopName: string, reason?: string) => `Ta candidature pour ${shopName} n'a pas ete approuvee pour le moment.${reason ? ` Raison : ${reason}` : ''} Verifie ton profil et reessaie.`,
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

function generateApprovedEmail(t: typeof emailTranslations['en'], userName: string, shopName: string): string {
  const year = new Date().getFullYear();
  return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Shop Approved</title></head>' +
    '<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif;">' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0a0a0a;">' +
    '<tr><td align="center" style="padding:40px 20px;">' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;">' +
    '<tr><td align="center" style="padding-bottom:32px;"><h1 style="margin:0;font-size:48px;font-weight:700;color:#c9a227;font-family:Georgia,serif;letter-spacing:2px;">BCUTZ</h1></td></tr>' +
    '<tr><td style="background-color:#111;border:1px solid #222;padding:32px;">' +
    '<div style="display:inline-block;background:rgba(34,197,94,0.15);color:#22c55e;border:1px solid #22c55e;padding:6px 14px;border-radius:4px;font-size:12px;font-weight:600;letter-spacing:0.5px;margin-bottom:16px;">APPROVED</div>' +
    '<h2 style="color:#fff;font-size:22px;font-weight:600;margin:0 0 16px 0;line-height:1.3;">Welcome to the BCUTZ Family</h2>' +
    '<p style="color:#888;font-size:14px;margin:0 0 20px 0;">' + t.hi + ' ' + userName + ',</p>' +
    '<div style="color:#aaa;font-size:14px;line-height:1.7;">' +
    '<p style="margin:0 0 16px 0;">' + t.greatNews + ' <strong style="color:#c9a227;">' + shopName + '</strong> ' + t.hasBeenVerified + '</p>' +
    '<p style="color:#c9a227;font-weight:600;margin:24px 0 12px 0;font-size:12px;text-transform:uppercase;letter-spacing:1px;">' + t.youCanNow + '</p>' +
    '<ul style="list-style:none;padding:0;margin:0;">' +
    '<li style="padding:8px 0;color:#aaa;"><span style="color:#c9a227;margin-right:8px;">&#10003;</span> ' + t.receiveBookings + '</li>' +
    '<li style="padding:8px 0;color:#aaa;"><span style="color:#c9a227;margin-right:8px;">&#10003;</span> ' + t.accessDashboard + '</li>' +
    '<li style="padding:8px 0;color:#aaa;"><span style="color:#c9a227;margin-right:8px;">&#10003;</span> ' + t.startEarning + '</li>' +
    '<li style="padding:8px 0;color:#aaa;"><span style="color:#c9a227;margin-right:8px;">&#10003;</span> ' + t.buildReputation + '</li>' +
    '</ul>' +
    '<p style="color:#666;font-size:12px;margin:16px 0 0 0;">' + t.questions + '</p>' +
    '</div>' +
    '<div style="margin:32px 0;text-align:center;">' +
    '<a href="https://bcutz.lovable.app/dashboard" style="display:inline-block;background:#c9a227;color:#0a0a0a;text-decoration:none;padding:14px 32px;font-weight:600;letter-spacing:1px;font-size:14px;">' + t.goToDashboard + '</a>' +
    '</div></td></tr>' +
    '<tr><td style="padding:24px 0;text-align:center;">' +
    '<p style="color:#444;font-size:11px;margin:0;">&copy; ' + year + ' BCUTZ. ' + t.allRightsReserved + '</p>' +
    '<p style="margin:12px 0 0 0;"><a href="https://bcutz.lovable.app" style="color:#c9a227;font-size:11px;text-decoration:none;">bcutz.lovable.app</a></p>' +
    '</td></tr></table></td></tr></table></body></html>';
}

function generateRejectedEmail(t: typeof emailTranslations['en'], userName: string, shopName: string, reason?: string): string {
  const year = new Date().getFullYear();
  const reasonBlock = reason
    ? '<div style="background:rgba(239,68,68,0.1);border-left:3px solid #ef4444;padding:12px 16px;margin:20px 0;"><p style="color:#ef4444;font-size:13px;margin:0;"><strong>' + t.reason + ':</strong> ' + reason + '</p></div>'
    : '';

  return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Application Update</title></head>' +
    '<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif;">' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0a0a0a;">' +
    '<tr><td align="center" style="padding:40px 20px;">' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;">' +
    '<tr><td align="center" style="padding-bottom:32px;"><h1 style="margin:0;font-size:48px;font-weight:700;color:#c9a227;font-family:Georgia,serif;letter-spacing:2px;">BCUTZ</h1></td></tr>' +
    '<tr><td style="background-color:#111;border:1px solid #222;padding:32px;">' +
    '<div style="display:inline-block;background:rgba(234,179,8,0.15);color:#eab308;border:1px solid #eab308;padding:6px 14px;border-radius:4px;font-size:12px;font-weight:600;letter-spacing:0.5px;margin-bottom:16px;">REVIEW UPDATE</div>' +
    '<h2 style="color:#fff;font-size:22px;font-weight:600;margin:0 0 16px 0;line-height:1.3;">Application Update</h2>' +
    '<p style="color:#888;font-size:14px;margin:0 0 20px 0;">' + t.hi + ' ' + userName + ',</p>' +
    '<div style="color:#aaa;font-size:14px;line-height:1.7;">' +
    '<p style="margin:0 0 16px 0;">' + t.thankYouInterest + ' <strong style="color:#c9a227;">' + shopName + '</strong>.</p>' +
    '<p style="margin:0 0 16px 0;">' + t.unableToApprove + '</p>' +
    reasonBlock +
    '<p style="color:#c9a227;font-weight:600;margin:24px 0 12px 0;font-size:12px;text-transform:uppercase;letter-spacing:1px;">' + t.tryAgainTips + '</p>' +
    '<ul style="list-style:none;padding:0;margin:0;">' +
    '<li style="padding:8px 0;color:#aaa;"><span style="color:#c9a227;margin-right:8px;">&#10003;</span> ' + t.tip1 + '</li>' +
    '<li style="padding:8px 0;color:#aaa;"><span style="color:#c9a227;margin-right:8px;">&#10003;</span> ' + t.tip2 + '</li>' +
    '<li style="padding:8px 0;color:#aaa;"><span style="color:#c9a227;margin-right:8px;">&#10003;</span> ' + t.tip3 + '</li>' +
    '<li style="padding:8px 0;color:#aaa;"><span style="color:#c9a227;margin-right:8px;">&#10003;</span> ' + t.tip4 + '</li>' +
    '</ul>' +
    '<p style="color:#666;font-size:12px;margin:16px 0 0 0;">' + t.contactSupport + '</p>' +
    '</div>' +
    '<div style="margin:32px 0;text-align:center;">' +
    '<a href="https://bcutz.lovable.app/dashboard/profile" style="display:inline-block;background:#c9a227;color:#0a0a0a;text-decoration:none;padding:14px 32px;font-weight:600;letter-spacing:1px;font-size:14px;">UPDATE PROFILE</a>' +
    '</div></td></tr>' +
    '<tr><td style="padding:24px 0;text-align:center;">' +
    '<p style="color:#444;font-size:11px;margin:0;">&copy; ' + year + ' BCUTZ. ' + t.allRightsReserved + '</p>' +
    '<p style="margin:12px 0 0 0;"><a href="https://bcutz.lovable.app" style="color:#c9a227;font-size:11px;text-decoration:none;">bcutz.lovable.app</a></p>' +
    '</td></tr></table></td></tr></table></body></html>';
}

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  try {
    console.log("Received barber notification request");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { data: roles, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin");

    if (roleError || !roles || roles.length === 0) {
      return new Response(
        JSON.stringify({ error: "Forbidden - Admin access required" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const parseResult = NotificationRequestSchema.safeParse(rawBody);
    if (!parseResult.success) {
      const errorMessage = parseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return new Response(
        JSON.stringify({ error: `Validation failed: ${errorMessage}` }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { barber_id, action, reason } = parseResult.data;

    console.log(`Processing ${action} notification for barber: ${barber_id}`);

    const { data: barberProfile, error: barberError } = await supabase
      .from("barber_profiles")
      .select("shop_name, user_id")
      .eq("id", barber_id)
      .single();

    if (barberError || !barberProfile) {
      return new Response(
        JSON.stringify({ error: "Barber not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { data: userProfile, error: profileError } = await supabase
      .from("profiles")
      .select("email, full_name, preferred_language")
      .eq("id", barberProfile.user_id)
      .single();

    if (profileError || !userProfile?.email) {
      return new Response(
        JSON.stringify({ error: "User email not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const shopName = barberProfile.shop_name;
    const userName = userProfile.full_name || "Barber";
    const userEmail = userProfile.email;
    const userLanguage = getLanguage(userProfile.preferred_language);
    const t = emailTranslations[userLanguage];

    console.log(`Sending ${action} email to: ${userEmail} in language: ${userLanguage}`);

    const subject = action === "approved" 
      ? t.approvedSubject(shopName)
      : t.rejectedSubject(shopName);

    const htmlContent = action === "approved"
      ? generateApprovedEmail(t, userName, shopName)
      : generateRejectedEmail(t, userName, shopName, reason);

    // Create in-app notification
    const notificationData = {
      user_id: barberProfile.user_id,
      title: action === "approved" ? t.shopApproved : t.applicationUpdate,
      message: action === "approved"
        ? t.congratsMessage(shopName)
        : t.notApprovedMessage(shopName, reason),
      type: action === "approved" ? "success" : "warning",
      action_url: action === "approved" ? "/dashboard" : "/dashboard/profile",
    };

    const { error: notifError } = await supabase
      .from("notifications")
      .insert(notificationData);

    if (notifError) {
      console.error("Failed to create notification:", notifError);
    } else {
      console.log("In-app notification created successfully");
    }

    // Send email
    await sendEmail({ to: userEmail, subject: subject, html: htmlContent });

    console.log("Email sent successfully");

    return new Response(
      JSON.stringify({ success: true, message: `${action} notification sent`, language: userLanguage }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: unknown) {
    console.error("Error in send-barber-notification:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
