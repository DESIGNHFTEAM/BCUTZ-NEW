/**
 * Shared email sender using denomailer SMTP.
 */
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  plainText?: string;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  const smtpHost = Deno.env.get("SMTP_HOST") ?? "";
  const smtpPort = Deno.env.get("SMTP_PORT") || "465";
  const smtpUser = Deno.env.get("SMTP_USER") ?? "";
  const smtpPass = Deno.env.get("SMTP_PASS") ?? "";

  if (!smtpHost || !smtpUser || !smtpPass) {
    throw new Error("SMTP credentials not configured");
  }

  const port = parseInt(smtpPort);
  const useTLS = port === 465;

  const client = new SMTPClient({
    connection: {
      hostname: smtpHost,
      port: port,
      tls: useTLS,
      auth: {
        username: smtpUser,
        password: smtpPass,
      },
    },
  });

  try {
    await client.send({
      from: smtpUser,
      to: options.to,
      subject: options.subject,
      content: options.plainText || "Please view this email in an HTML-compatible email client.",
      html: options.html,
    });
    console.log("[EMAIL] Sent via SMTP", { to: options.to });
  } finally {
    await client.close();
  }
}
