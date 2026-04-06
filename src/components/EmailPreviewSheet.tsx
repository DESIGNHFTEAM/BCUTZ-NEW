import { useState } from 'react';
import DOMPurify from 'dompurify';
import { Mail, UserPlus, UserMinus, Bell, CreditCard, Calendar, Gift, CheckCircle, XCircle, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/lib/auth';

type EmailTemplate = 
  | 'welcome-customer'
  | 'welcome-barber'
  | 'barber-approved'
  | 'barber-rejected'
  | 'farewell'
  | 'booking-reminder'
  | 'payment-receipt'
  | 'admin-role-granted'
  | 'admin-role-revoked'
  | 'deletion-confirmation'
  | 're-engagement'
  | 'voucher-expiry';

const emailTemplates: { id: EmailTemplate; name: string; icon: any; description: string }[] = [
  { id: 'welcome-customer', name: 'Welcome (Customer)', icon: UserPlus, description: 'Sent when customers create an account' },
  { id: 'welcome-barber', name: 'Welcome (Barber)', icon: UserPlus, description: 'Sent when barbers complete onboarding' },
  { id: 'barber-approved', name: 'Barber Approved', icon: CheckCircle, description: 'Sent when admin approves a barber' },
  { id: 'barber-rejected', name: 'Barber Rejected', icon: XCircle, description: 'Sent when admin rejects a barber' },
  { id: 'farewell', name: 'Farewell + FOMO', icon: UserMinus, description: 'Sent after account deletion with comeback offer' },
  { id: 'booking-reminder', name: 'Booking Reminder', icon: Calendar, description: 'Sent 24h before appointments' },
  { id: 'payment-receipt', name: 'Payment Receipt', icon: CreditCard, description: 'Sent after successful payments' },
  { id: 'admin-role-granted', name: 'Admin Role Granted', icon: Shield, description: 'Sent when user gets admin privileges' },
  { id: 'admin-role-revoked', name: 'Admin Role Revoked', icon: Bell, description: 'Sent when admin privileges removed' },
  { id: 'deletion-confirmation', name: 'Deletion Code', icon: UserMinus, description: 'Sent with deletion confirmation code' },
  { id: 're-engagement', name: 'Re-engagement', icon: Gift, description: 'Sent to inactive users (30+ days)' },
  { id: 'voucher-expiry', name: 'Voucher Expiry', icon: Gift, description: 'Sent when vouchers are about to expire' },
];

// BCUTZ unified template that matches the backend
const generateBCUTZEmail = (options: {
  title: string;
  badge?: { text: string; color: 'gold' | 'green' | 'red' | 'blue' };
  greeting?: string;
  content: string;
  ctaText?: string;
  ctaUrl?: string;
  footerText?: string;
}): string => {
  const { title, badge, greeting, content, ctaText, ctaUrl, footerText } = options;
  
  const getBadgeStyles = (color: 'gold' | 'green' | 'red' | 'blue') => {
    const colors = {
      gold: { bg: 'rgba(201, 162, 39, 0.15)', text: '#c9a227', border: '#c9a227' },
      green: { bg: 'rgba(34, 197, 94, 0.15)', text: '#22c55e', border: '#22c55e' },
      red: { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444', border: '#ef4444' },
      blue: { bg: 'rgba(59, 130, 246, 0.15)', text: '#3b82f6', border: '#3b82f6' },
    };
    return colors[color];
  };

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

  const greetingHtml = greeting
    ? `<p style="color: #888; font-size: 14px; margin: 0 0 20px 0;">Hey ${greeting},</p>`
    : '';

  return `
    <div style="background-color: #0a0a0a; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      <div style="max-width: 520px; margin: 0 auto;">
        
        <!-- Logo -->
        <div style="text-align: center; padding-bottom: 32px;">
          <h1 style="margin:0;font-size:48px;font-weight:700;color:#c9a227;font-family:Georgia,serif;letter-spacing:2px;">BCUTZ</h1>
        </div>
        
        <!-- Main Card -->
        <div style="background-color: #111; border: 1px solid #222; padding: 32px;">
          ${badgeHtml}
          <h2 style="color: #fff; font-size: 22px; font-weight: 600; margin: 0 0 16px 0; line-height: 1.3;">${title}</h2>
          ${greetingHtml}
          <div style="color: #aaa; font-size: 14px; line-height: 1.7;">
            ${content}
          </div>
          ${ctaHtml}
        </div>
        
        <!-- Footer -->
        <div style="padding: 24px 0; text-align: center;">
          ${footerText ? `<p style="color: #666; font-size: 12px; margin: 0 0 12px 0;">${footerText}</p>` : ''}
          <p style="color: #444; font-size: 11px; margin: 0;">
            © ${new Date().getFullYear()} BCUTZ. All rights reserved.
          </p>
          <p style="margin: 12px 0 0 0;">
            <a href="https://bcutz.lovable.app" style="color: #c9a227; font-size: 11px; text-decoration: none;">bcutz.lovable.app</a>
          </p>
        </div>
        
      </div>
    </div>
  `;
};

const getEmailPreview = (template: EmailTemplate, sampleData: { 
  name: string; 
  shopName: string;
  daysSinceLastBooking: number; 
  time: string; 
  service: string; 
  barber: string; 
  amount: string; 
  pointsEarned: number;
  voucherCode: string;
  expiryDays: number;
}): string => {
  switch (template) {
    case 'welcome-customer':
      return generateBCUTZEmail({
        title: 'Welcome to BCUTZ! ✨',
        badge: { text: 'NEW MEMBER', color: 'gold' },
        greeting: sampleData.name,
        content: `
          <p>Thank you for joining BCUTZ – your premium barber booking platform.</p>
          <div style="background: #0a0a0a; border: 1px solid #222; padding: 4px 16px; margin: 20px 0;">
            <div style="padding: 12px 0; border-bottom: 1px solid #222;">
              <span style="color: #666; font-size: 13px;">✂️ Access to premium barbers</span>
            </div>
            <div style="padding: 12px 0; border-bottom: 1px solid #222;">
              <span style="color: #666; font-size: 13px;">📱 Easy booking in seconds</span>
            </div>
            <div style="padding: 12px 0; border-bottom: 1px solid #222;">
              <span style="color: #666; font-size: 13px;">🎁 Earn loyalty points on every visit</span>
            </div>
            <div style="padding: 12px 0;">
              <span style="color: #666; font-size: 13px;">💎 Exclusive member deals</span>
            </div>
          </div>
        `,
        ctaText: 'FIND YOUR BARBER',
        ctaUrl: 'https://bcutz.lovable.app/barbers',
      });

    case 'welcome-barber':
      return generateBCUTZEmail({
        title: 'Welcome to BCUTZ Pro! 💈',
        badge: { text: 'BARBER REGISTRATION', color: 'gold' },
        greeting: sampleData.name,
        content: `
          <p>Thanks for registering your shop <strong style="color: #fff;">${sampleData.shopName}</strong> on BCUTZ!</p>
          <div style="background: rgba(201, 162, 39, 0.1); border: 1px solid #c9a227; padding: 20px; margin: 20px 0; text-align: center;">
            <p style="color: #c9a227; margin: 0 0 8px 0; font-size: 12px;">WHAT'S NEXT?</p>
            <p style="color: #fff; margin: 0; font-size: 16px;">Our team will review your application within <strong>1 hour</strong></p>
          </div>
          <p>You'll receive an email once your shop is approved. In the meantime, you can complete your profile and add services.</p>
        `,
        ctaText: 'VIEW DASHBOARD',
        ctaUrl: 'https://bcutz.lovable.app/dashboard',
        footerText: 'Your shop is pending verification',
      });

    case 'barber-approved':
      return generateBCUTZEmail({
        title: "You're Approved! 🎉",
        badge: { text: 'APPROVED', color: 'green' },
        greeting: sampleData.name,
        content: `
          <p>Great news! Your barber shop <strong style="color: #fff;">${sampleData.shopName}</strong> has been verified and approved on BCUTZ.</p>
          <div style="background: #0a0a0a; border: 1px solid #222; padding: 4px 16px; margin: 20px 0;">
            <div style="padding: 12px 0; border-bottom: 1px solid #222;">
              <span style="color: #22c55e;">✓</span>
              <span style="color: #aaa; font-size: 13px; margin-left: 8px;">Receive bookings from customers</span>
            </div>
            <div style="padding: 12px 0; border-bottom: 1px solid #222;">
              <span style="color: #22c55e;">✓</span>
              <span style="color: #aaa; font-size: 13px; margin-left: 8px;">Access your dashboard & analytics</span>
            </div>
            <div style="padding: 12px 0; border-bottom: 1px solid #222;">
              <span style="color: #22c55e;">✓</span>
              <span style="color: #aaa; font-size: 13px; margin-left: 8px;">Start earning with every appointment</span>
            </div>
            <div style="padding: 12px 0;">
              <span style="color: #22c55e;">✓</span>
              <span style="color: #aaa; font-size: 13px; margin-left: 8px;">Build your reputation with reviews</span>
            </div>
          </div>
        `,
        ctaText: 'GO TO DASHBOARD',
        ctaUrl: 'https://bcutz.lovable.app/dashboard',
      });

    case 'barber-rejected':
      return generateBCUTZEmail({
        title: 'Application Update',
        badge: { text: 'ACTION REQUIRED', color: 'red' },
        greeting: sampleData.name,
        content: `
          <p>Thank you for your interest in joining BCUTZ with <strong style="color: #fff;">${sampleData.shopName}</strong>.</p>
          <p>After reviewing your application, we were unable to approve it at this time.</p>
          <div style="background: rgba(239, 68, 68, 0.1); border-left: 3px solid #ef4444; padding: 12px 16px; margin: 20px 0;">
            <p style="color: #ef4444; font-size: 13px; margin: 0;"><strong>Reason:</strong> Profile information incomplete</p>
          </div>
          <p style="color: #888;">This doesn't mean you can't try again! Here's what you can do:</p>
          <ul style="color: #aaa; padding-left: 20px;">
            <li>Ensure your profile information is complete</li>
            <li>Add high-quality photos of your work</li>
            <li>Provide a detailed description of services</li>
          </ul>
        `,
        ctaText: 'UPDATE PROFILE',
        ctaUrl: 'https://bcutz.lovable.app/dashboard/profile',
        footerText: 'Contact support if you have questions',
      });

    case 'farewell':
      return generateBCUTZEmail({
        title: "We're Sad to See You Go 😢",
        greeting: sampleData.name,
        content: `
          <p>Your BCUTZ account has been successfully deleted.</p>
          <div style="background: rgba(201, 162, 39, 0.1); border: 1px dashed #c9a227; padding: 20px; margin: 20px 0; text-align: center;">
            <p style="color: #c9a227; margin: 0 0 8px 0; font-size: 12px;">EXCLUSIVE COMEBACK OFFER</p>
            <p style="color: #c9a227; font-size: 28px; font-weight: 700; margin: 0;">50% OFF</p>
            <p style="color: #888; margin: 8px 0 0 0; font-size: 12px;">Your next booking • Valid 7 days</p>
          </div>
          <p>We hope to see you again someday. Your fresh look is waiting!</p>
        `,
        ctaText: 'COME BACK',
        ctaUrl: 'https://bcutz.lovable.app',
      });

    case 'booking-reminder':
      return generateBCUTZEmail({
        title: 'Appointment Tomorrow 📅',
        badge: { text: 'REMINDER', color: 'blue' },
        greeting: sampleData.name,
        content: `
          <p>Just a friendly reminder about your upcoming appointment:</p>
          <div style="background: #0a0a0a; border: 1px solid #222; padding: 4px 16px; margin: 20px 0;">
            <div style="padding: 12px 0; border-bottom: 1px solid #222;">
              <span style="color: #666; font-size: 13px;">Service</span>
              <span style="float: right; color: #fff; font-size: 13px; font-weight: 500;">${sampleData.service}</span>
              <div style="clear: both;"></div>
            </div>
            <div style="padding: 12px 0; border-bottom: 1px solid #222;">
              <span style="color: #666; font-size: 13px;">Barber</span>
              <span style="float: right; color: #fff; font-size: 13px; font-weight: 500;">${sampleData.barber}</span>
              <div style="clear: both;"></div>
            </div>
            <div style="padding: 12px 0;">
              <span style="color: #666; font-size: 13px;">Time</span>
              <span style="float: right; color: #c9a227; font-size: 13px; font-weight: 600;">${sampleData.time}</span>
              <div style="clear: both;"></div>
            </div>
          </div>
          <div style="background: rgba(234, 179, 8, 0.1); border-left: 3px solid #eab308; padding: 12px 16px; margin: 20px 0;">
            <p style="color: #eab308; font-size: 13px; margin: 0;">Please arrive 5 minutes early for your appointment.</p>
          </div>
        `,
        ctaText: 'VIEW BOOKING',
        ctaUrl: 'https://bcutz.lovable.app/bookings',
      });

    case 'payment-receipt':
      return generateBCUTZEmail({
        title: 'Payment Successful ✓',
        badge: { text: 'RECEIPT', color: 'green' },
        greeting: sampleData.name,
        content: `
          <p>Thank you for your payment!</p>
          <div style="padding: 16px 0; text-align: center;">
            <span style="color: #666; font-size: 12px; display: block; margin-bottom: 4px;">AMOUNT PAID</span>
            <span style="color: #22c55e; font-size: 28px; font-weight: 700;">CHF ${sampleData.amount}</span>
          </div>
          <div style="background: #0a0a0a; border: 1px solid #222; padding: 4px 16px; margin: 20px 0;">
            <div style="padding: 12px 0; border-bottom: 1px solid #222;">
              <span style="color: #666; font-size: 13px;">Service</span>
              <span style="float: right; color: #fff; font-size: 13px; font-weight: 500;">${sampleData.service}</span>
              <div style="clear: both;"></div>
            </div>
            <div style="padding: 12px 0; border-bottom: 1px solid #222;">
              <span style="color: #666; font-size: 13px;">Barber</span>
              <span style="float: right; color: #fff; font-size: 13px; font-weight: 500;">${sampleData.barber}</span>
              <div style="clear: both;"></div>
            </div>
            <div style="padding: 12px 0;">
              <span style="color: #666; font-size: 13px;">Points Earned</span>
              <span style="float: right; color: #c9a227; font-size: 13px; font-weight: 600;">+${sampleData.pointsEarned} pts</span>
              <div style="clear: both;"></div>
            </div>
          </div>
        `,
        footerText: 'Keep this email as your receipt',
      });

    case 'admin-role-granted':
      return generateBCUTZEmail({
        title: 'Admin Access Granted 🔐',
        badge: { text: 'ADMIN', color: 'blue' },
        greeting: sampleData.name,
        content: `
          <p>You have been granted admin privileges on BCUTZ.</p>
          <div style="background: rgba(59, 130, 246, 0.1); border: 1px solid #3b82f6; padding: 20px; margin: 20px 0; text-align: center;">
            <p style="color: #3b82f6; font-size: 24px; font-weight: 700; margin: 0;">ADMIN ACCESS</p>
            <p style="color: #888; margin: 8px 0 0 0; font-size: 12px;">You can now manage barbers, reports & rewards</p>
          </div>
          <p>With great power comes great responsibility. Use your admin access wisely!</p>
        `,
        ctaText: 'ADMIN DASHBOARD',
        ctaUrl: 'https://bcutz.lovable.app/dashboard',
      });

    case 'admin-role-revoked':
      return generateBCUTZEmail({
        title: 'Admin Access Revoked',
        greeting: sampleData.name,
        content: `
          <p>Your admin privileges on BCUTZ have been revoked.</p>
          <p>You can continue to use BCUTZ as a regular customer. If you believe this was a mistake, please contact support.</p>
        `,
        footerText: 'Contact support if you have questions',
      });

    case 'deletion-confirmation':
      return generateBCUTZEmail({
        title: 'Account Deletion Request',
        badge: { text: 'ACTION REQUIRED', color: 'red' },
        greeting: sampleData.name,
        content: `
          <p>We received a request to delete your BCUTZ account.</p>
          <p>To confirm this action, please enter the following code:</p>
          <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; padding: 24px; margin: 20px 0; text-align: center;">
            <span style="font-family: monospace; font-size: 36px; font-weight: bold; color: #ef4444; letter-spacing: 8px;">123456</span>
          </div>
          <div style="background: rgba(234, 179, 8, 0.1); border-left: 3px solid #eab308; padding: 12px 16px; margin: 20px 0;">
            <p style="color: #eab308; font-size: 13px; margin: 0;">This code expires in 15 minutes. If you didn't request this, ignore this email.</p>
          </div>
        `,
      });

    case 're-engagement':
      return generateBCUTZEmail({
        title: 'We Miss You! 💔',
        badge: { text: 'SPECIAL OFFER', color: 'gold' },
        greeting: sampleData.name,
        content: `
          <p>It's been <strong style="color: #c9a227;">${sampleData.daysSinceLastBooking} days</strong> since your last visit. We hope everything is going well!</p>
          <div style="background: rgba(201, 162, 39, 0.1); border: 1px dashed #c9a227; padding: 20px; margin: 20px 0; text-align: center;">
            <p style="color: #c9a227; margin: 0 0 8px 0; font-size: 12px;">WELCOME BACK OFFER</p>
            <p style="color: #c9a227; font-size: 28px; font-weight: 700; margin: 0;">20% OFF + 2X POINTS</p>
            <p style="color: #888; margin: 8px 0 0 0; font-size: 12px;">On your next booking</p>
          </div>
          <p>Your fresh look is waiting. Book now and get back to looking your best!</p>
        `,
        ctaText: 'BOOK NOW & SAVE',
        ctaUrl: 'https://bcutz.lovable.app/barbers',
      });

    case 'voucher-expiry':
      return generateBCUTZEmail({
        title: 'Your Voucher Expires Soon! ⏰',
        badge: { text: 'EXPIRING', color: 'gold' },
        greeting: sampleData.name,
        content: `
          <p>Don't let your discount go to waste!</p>
          <div style="background: rgba(201, 162, 39, 0.1); border: 1px solid #c9a227; padding: 20px; margin: 20px 0; text-align: center;">
            <p style="color: #666; margin: 0 0 8px 0; font-size: 12px;">YOUR VOUCHER CODE</p>
            <p style="font-family: monospace; color: #c9a227; font-size: 24px; font-weight: 700; margin: 0; letter-spacing: 2px;">${sampleData.voucherCode}</p>
            <p style="color: #ef4444; margin: 12px 0 0 0; font-size: 12px;">Expires in ${sampleData.expiryDays} days!</p>
          </div>
          <p>Use it before it's gone!</p>
        `,
        ctaText: 'BOOK NOW',
        ctaUrl: 'https://bcutz.lovable.app/barbers',
      });

    default:
      return '<p>Template not found</p>';
  }
};

interface EmailPreviewSheetProps {
  trigger?: React.ReactNode;
}

export function EmailPreviewSheet({ trigger }: EmailPreviewSheetProps) {
  const { hasRole } = useAuth();
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate>('welcome-customer');
  const [isOpen, setIsOpen] = useState(false);

  const sampleData = {
    name: 'Max Mustermann',
    shopName: "Marco's Barbershop",
    daysSinceLastBooking: 45,
    time: '14:30',
    service: 'Classic Haircut',
    barber: "Marco's Barbershop",
    amount: '45.00',
    pointsEarned: 45,
    voucherCode: 'BCUTZ-SAVE20',
    expiryDays: 3,
  };

  // Show for both founder and admin roles
  if (!hasRole('founder') && !hasRole('admin')) {
    return null;
  }

  const currentTemplate = emailTemplates.find(t => t.id === selectedTemplate);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Mail className="w-4 h-4" />
            Email Preview
          </Button>
        )}
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0">
        <SheetHeader className="p-6 pb-4 border-b">
          <SheetTitle className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Mail className="w-5 h-5 text-primary" />
            </div>
            <div>
              <span className="block">Email Template Preview</span>
              <span className="text-sm font-normal text-muted-foreground">
                Preview how emails look before they're sent
              </span>
            </div>
          </SheetTitle>
        </SheetHeader>

        <div className="p-6 space-y-4">
          {/* Template Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Template</label>
            <Select value={selectedTemplate} onValueChange={(v) => setSelectedTemplate(v as EmailTemplate)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {emailTemplates.map((template) => {
                  const Icon = template.icon;
                  return (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                        <span>{template.name}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {currentTemplate && (
              <p className="text-xs text-muted-foreground">{currentTemplate.description}</p>
            )}
          </div>

          {/* Email Preview */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Preview</label>
            <ScrollArea className="h-[calc(100vh-280px)] border rounded-lg bg-muted/30">
              <div 
                className="p-4"
                dangerouslySetInnerHTML={{ 
                  __html: DOMPurify.sanitize(getEmailPreview(selectedTemplate, sampleData)) 
                }}
              />
            </ScrollArea>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
