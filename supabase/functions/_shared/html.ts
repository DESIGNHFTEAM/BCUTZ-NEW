// Shared HTML-escaping helper for email edge functions.
// Use on ANY user- or admin-supplied value before interpolating it into an
// HTML email body/subject, to prevent HTML/link injection (phishing) inside
// legitimately-branded BCUTZ emails.
//
// Security note: escape at the boundary where untrusted data enters the HTML.
// Do NOT run this over whole pre-built HTML fragments (it would double-escape
// intentional markup) — only over individual dynamic values (names, reasons,
// free-text messages, shop names, etc.).

export function escapeHtml(input: unknown): string {
  return String(input ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
