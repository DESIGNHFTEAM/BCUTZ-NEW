// Unified BCUTZ Email Template - Dark theme with logo
// This template is used by all email edge functions for consistency

export const BCUTZ_LOGO_URL = 'https://bcutz.lovable.app/cutz-logo.png';
export const BCUTZ_SITE_URL = 'https://bcutz.lovable.app';

export interface EmailTemplateOptions {
  recipientName?: string;
  title: string;
  preheader?: string;
  content: string;
  ctaText?: string;
  ctaUrl?: string;
  footerText?: string;
  badge?: {
    text: string;
    color: 'gold' | 'green' | 'red' | 'blue';
  };
}

const getBadgeStyles = (color: 'gold' | 'green' | 'red' | 'blue') => {
  const colors = {
    gold: { bg: 'rgba(201, 162, 39, 0.15)', text: '#c9a227', border: '#c9a227' },
    green: { bg: 'rgba(34, 197, 94, 0.15)', text: '#22c55e', border: '#22c55e' },
    red: { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444', border: '#ef4444' },
    blue: { bg: 'rgba(59, 130, 246, 0.15)', text: '#3b82f6', border: '#3b82f6' },
  };
  return colors[color];
};

export function generateEmailTemplate(options: EmailTemplateOptions): string {
  const {
    recipientName,
    title,
    preheader = '',
    content,
    ctaText,
    ctaUrl,
    footerText,
    badge,
  } = options;

  const badgeHtml = badge
    ? `<div style="display: inline-block; background: ${getBadgeStyles(badge.color).bg}; color: ${getBadgeStyles(badge.color).text}; border: 1px solid ${getBadgeStyles(badge.color).border}; padding: 6px 14px; border-radius: 4px; font-size: 12px; font-weight: 600; letter-spacing: 0.5px; margin-bottom: 16px;">${badge.text}</div>`
    : '';

  const ctaHtml = ctaText && ctaUrl
    ? `<div style="margin: 32px 0; text-align: center;">
        <a href="${ctaUrl}" style="display: inline-block; background: #c9a227; color: #0a0a0a; text-decoration: none; padding: 14px 32px; font-weight: 600; letter-spacing: 1px; font-size: 14px;">
          ${ctaText}
        </a>
      </div>`
    : '';

  const greetingHtml = recipientName
    ? `<p style="color: #888; font-size: 14px; margin: 0 0 20px 0;">Hey ${recipientName},</p>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title}</title>
  ${preheader ? `<span style="display:none;font-size:1px;color:#0a0a0a;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${preheader}</span>` : ''}
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0a0a0a;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 520px;">
          
          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <h1 style="margin:0;font-size:48px;font-weight:700;color:#c9a227;font-family:Georgia,serif;letter-spacing:2px;">BCUTZ</h1>
            </td>
          </tr>
          
          <!-- Main Card -->
          <tr>
            <td style="background-color: #111; border: 1px solid #222; padding: 32px;">
              ${badgeHtml}
              <h2 style="color: #fff; font-size: 22px; font-weight: 600; margin: 0 0 16px 0; line-height: 1.3;">${title}</h2>
              ${greetingHtml}
              <div style="color: #aaa; font-size: 14px; line-height: 1.7;">
                ${content}
              </div>
              ${ctaHtml}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 0; text-align: center;">
              ${footerText ? `<p style="color: #666; font-size: 12px; margin: 0 0 12px 0;">${footerText}</p>` : ''}
              <p style="color: #444; font-size: 11px; margin: 0;">
                © ${new Date().getFullYear()} BCUTZ. All rights reserved.
              </p>
              <p style="margin: 12px 0 0 0;">
                <a href="${BCUTZ_SITE_URL}" style="color: #c9a227; font-size: 11px; text-decoration: none;">bcutz.lovable.app</a>
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

// Helper function for detail rows (common in booking/payment emails)
export function createDetailRow(label: string, value: string, isLast = false): string {
  return `<div style="padding: 12px 0; border-bottom: ${isLast ? 'none' : '1px solid #222'};">
    <span style="color: #666; font-size: 13px;">${label}</span>
    <span style="float: right; color: #fff; font-size: 13px; font-weight: 500;">${value}</span>
    <div style="clear: both;"></div>
  </div>`;
}

// Helper function for detail cards (groups of detail rows)
export function createDetailCard(rows: string[]): string {
  return `<div style="background: #0a0a0a; border: 1px solid #222; padding: 4px 16px; margin: 20px 0;">
    ${rows.join('')}
  </div>`;
}

// Helper for highlighted amount/price
export function createHighlightedAmount(label: string, amount: string, color: 'gold' | 'green' = 'gold'): string {
  const textColor = color === 'gold' ? '#c9a227' : '#22c55e';
  return `<div style="padding: 16px 0; text-align: center;">
    <span style="color: #666; font-size: 12px; display: block; margin-bottom: 4px;">${label}</span>
    <span style="color: ${textColor}; font-size: 28px; font-weight: 700;">${amount}</span>
  </div>`;
}

// Helper for feature/benefit lists
export function createFeatureList(items: string[]): string {
  return `<ul style="list-style: none; padding: 0; margin: 20px 0;">
    ${items.map(item => `<li style="padding: 8px 0; color: #aaa; font-size: 14px;">
      <span style="color: #c9a227; margin-right: 8px;">✓</span>${item}
    </li>`).join('')}
  </ul>`;
}

// Helper for warning/info boxes
export function createInfoBox(text: string, type: 'warning' | 'info' | 'success' = 'info'): string {
  const colors = {
    warning: { bg: 'rgba(234, 179, 8, 0.1)', border: '#eab308', text: '#eab308' },
    info: { bg: 'rgba(59, 130, 246, 0.1)', border: '#3b82f6', text: '#3b82f6' },
    success: { bg: 'rgba(34, 197, 94, 0.1)', border: '#22c55e', text: '#22c55e' },
  };
  const c = colors[type];
  return `<div style="background: ${c.bg}; border-left: 3px solid ${c.border}; padding: 12px 16px; margin: 20px 0;">
    <p style="color: ${c.text}; font-size: 13px; margin: 0;">${text}</p>
  </div>`;
}
