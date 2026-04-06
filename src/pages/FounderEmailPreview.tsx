import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Mail, Eye, ChevronDown, ArrowLeft, Sparkles, UserPlus, UserMinus, Bell, CreditCard, Calendar, Gift } from 'lucide-react';
import DOMPurify from 'dompurify';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/lib/auth';

type EmailTemplate = 
  | 'welcome-customer'
  | 'welcome-barber'
  | 'farewell'
  | 'booking-reminder'
  | 'payment-receipt'
  | 'admin-role'
  | 'deletion-confirmation'
  | 're-engagement';

const emailTemplates: { id: EmailTemplate; name: string; icon: any; description: string }[] = [
  { id: 'welcome-customer', name: 'Welcome (Customer)', icon: UserPlus, description: 'Sent when customers create an account' },
  { id: 'welcome-barber', name: 'Welcome (Barber)', icon: Sparkles, description: 'Sent when barbers join the platform' },
  { id: 'farewell', name: 'Farewell + FOMO', icon: UserMinus, description: 'Sent after account deletion with comeback offer' },
  { id: 'booking-reminder', name: 'Booking Reminder', icon: Calendar, description: 'Sent 24h before appointments' },
  { id: 'payment-receipt', name: 'Payment Receipt', icon: CreditCard, description: 'Sent after successful payments' },
  { id: 'admin-role', name: 'Admin Role Notification', icon: Bell, description: 'Sent when admin status changes' },
  { id: 'deletion-confirmation', name: 'Deletion Confirmation', icon: UserMinus, description: 'Sent with deletion code' },
  { id: 're-engagement', name: 'Re-engagement', icon: Gift, description: 'Sent to inactive users (30+ days)' },
];

const getEmailPreview = (template: EmailTemplate, sampleData: any) => {
  switch (template) {
    case 'welcome-customer':
      return `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #0a0a0a;">
          <div style="padding: 40px 20px;">
            <div style="text-align: center; padding-bottom: 32px;">
              <h1 style="font-size: 28px; font-weight: 700; letter-spacing: 6px; margin: 0; color: #c9a227;">BCUTZ</h1>
            </div>
            <div style="background-color: #111; border: 1px solid #222; padding: 32px;">
              <div style="display: inline-block; background: rgba(34, 197, 94, 0.15); color: #22c55e; border: 1px solid #22c55e; padding: 6px 14px; border-radius: 4px; font-size: 12px; font-weight: 600; letter-spacing: 0.5px; margin-bottom: 16px;">WELCOME</div>
              <h2 style="color: #fff; font-size: 22px; font-weight: 600; margin: 0 0 16px 0; line-height: 1.3;">Welcome to BCUTZ!</h2>
              <p style="color: #888; font-size: 14px; margin: 0 0 20px 0;">Hey ${sampleData.name},</p>
              <div style="color: #aaa; font-size: 14px; line-height: 1.7;">
                <p style="margin: 0 0 16px 0;">Thank you for joining BCUTZ! We're excited to have you as part of our community.</p>
                <ul style="list-style: none; padding: 0; margin: 20px 0;">
                  <li style="padding: 8px 0; color: #aaa; font-size: 14px;"><span style="color: #c9a227; margin-right: 8px;">✓</span>Book premium barbers nearby</li>
                  <li style="padding: 8px 0; color: #aaa; font-size: 14px;"><span style="color: #c9a227; margin-right: 8px;">✓</span>Earn loyalty points</li>
                  <li style="padding: 8px 0; color: #aaa; font-size: 14px;"><span style="color: #c9a227; margin-right: 8px;">✓</span>Get exclusive member deals</li>
                </ul>
              </div>
              <div style="margin: 32px 0; text-align: center;">
                <a href="#" style="display: inline-block; background: #c9a227; color: #0a0a0a; text-decoration: none; padding: 14px 32px; font-weight: 600; letter-spacing: 1px; font-size: 14px;">FIND YOUR BARBER</a>
              </div>
            </div>
            <div style="padding: 24px 0; text-align: center;">
              <p style="color: #444; font-size: 11px; margin: 0;">© 2025 BCUTZ. All rights reserved.</p>
              <p style="margin: 12px 0 0 0;"><a href="#" style="color: #c9a227; font-size: 11px; text-decoration: none;">bcutz.lovable.app</a></p>
            </div>
          </div>
        </div>
      `;

    case 'welcome-barber':
      return `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #0a0a0a;">
          <div style="padding: 40px 20px;">
            <div style="text-align: center; padding-bottom: 32px;">
              <h1 style="font-size: 28px; font-weight: 700; letter-spacing: 6px; margin: 0; color: #c9a227;">BCUTZ</h1>
            </div>
            <div style="background-color: #111; border: 1px solid #222; padding: 32px;">
              <div style="display: inline-block; background: rgba(201, 162, 39, 0.15); color: #c9a227; border: 1px solid #c9a227; padding: 6px 14px; border-radius: 4px; font-size: 12px; font-weight: 600; letter-spacing: 0.5px; margin-bottom: 16px;">WELCOME PRO</div>
              <h2 style="color: #fff; font-size: 22px; font-weight: 600; margin: 0 0 16px 0; line-height: 1.3;">Welcome to BCUTZ Pro!</h2>
              <p style="color: #888; font-size: 14px; margin: 0 0 20px 0;">Hey ${sampleData.name},</p>
              <div style="color: #aaa; font-size: 14px; line-height: 1.7;">
                <p style="margin: 0 0 16px 0;">Welcome to the BCUTZ professional network! You've joined a community of talented barbers growing their businesses every day.</p>
                <div style="background: #0a0a0a; border: 1px solid #222; padding: 4px 16px; margin: 20px 0;">
                  <div style="padding: 12px 0; border-bottom: 1px solid #222;"><span style="color: #666; font-size: 13px;">Step 1</span><span style="float: right; color: #fff; font-size: 13px; font-weight: 500;">Complete your profile</span><div style="clear: both;"></div></div>
                  <div style="padding: 12px 0; border-bottom: 1px solid #222;"><span style="color: #666; font-size: 13px;">Step 2</span><span style="float: right; color: #fff; font-size: 13px; font-weight: 500;">Add your services</span><div style="clear: both;"></div></div>
                  <div style="padding: 12px 0; border-bottom: 1px solid #222;"><span style="color: #666; font-size: 13px;">Step 3</span><span style="float: right; color: #fff; font-size: 13px; font-weight: 500;">Set your availability</span><div style="clear: both;"></div></div>
                  <div style="padding: 12px 0;"><span style="color: #666; font-size: 13px;">Step 4</span><span style="float: right; color: #fff; font-size: 13px; font-weight: 500;">Connect Stripe</span><div style="clear: both;"></div></div>
                </div>
              </div>
              <div style="margin: 32px 0; text-align: center;">
                <a href="#" style="display: inline-block; background: #c9a227; color: #0a0a0a; text-decoration: none; padding: 14px 32px; font-weight: 600; letter-spacing: 1px; font-size: 14px;">COMPLETE YOUR PROFILE</a>
              </div>
            </div>
            <div style="padding: 24px 0; text-align: center;">
              <p style="color: #444; font-size: 11px; margin: 0;">© 2025 BCUTZ. All rights reserved.</p>
              <p style="margin: 12px 0 0 0;"><a href="#" style="color: #c9a227; font-size: 11px; text-decoration: none;">bcutz.lovable.app</a></p>
            </div>
          </div>
        </div>
      `;

    case 'farewell':
      return `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #0a0a0a;">
          <div style="padding: 40px 20px;">
            <div style="text-align: center; padding-bottom: 32px;">
              <h1 style="font-size: 28px; font-weight: 700; letter-spacing: 6px; margin: 0; color: #c9a227;">BCUTZ</h1>
            </div>
            <div style="background-color: #111; border: 1px solid #222; padding: 32px;">
              <h2 style="color: #fff; font-size: 22px; font-weight: 600; margin: 0 0 16px 0; line-height: 1.3;">We're Sad to See You Go</h2>
              <p style="color: #888; font-size: 14px; margin: 0 0 20px 0;">Hey ${sampleData.name},</p>
              <div style="color: #aaa; font-size: 14px; line-height: 1.7;">
                <p style="margin: 0 0 16px 0;">Your BCUTZ account has been successfully deleted. We're sorry to see you leave.</p>
                <div style="background: rgba(239, 68, 68, 0.1); border-left: 3px solid #ef4444; padding: 12px 16px; margin: 20px 0;">
                  <p style="color: #ef4444; font-size: 13px; margin: 0;">Your loyalty points and booking history have been permanently removed.</p>
                </div>
                <p style="margin: 16px 0 0 0;">If you ever want to come back, we'll be here.</p>
              </div>
              <div style="margin: 32px 0; text-align: center;">
                <a href="#" style="display: inline-block; background: #c9a227; color: #0a0a0a; text-decoration: none; padding: 14px 32px; font-weight: 600; letter-spacing: 1px; font-size: 14px;">REJOIN BCUTZ</a>
              </div>
            </div>
            <div style="padding: 24px 0; text-align: center;">
              <p style="color: #444; font-size: 11px; margin: 0;">© 2025 BCUTZ. All rights reserved.</p>
              <p style="margin: 12px 0 0 0;"><a href="#" style="color: #c9a227; font-size: 11px; text-decoration: none;">bcutz.lovable.app</a></p>
            </div>
          </div>
        </div>
      `;

    case 're-engagement':
      return `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #0a0a0a;">
          <div style="padding: 40px 20px;">
            <div style="text-align: center; padding-bottom: 32px;">
              <h1 style="font-size: 28px; font-weight: 700; letter-spacing: 6px; margin: 0; color: #c9a227;">BCUTZ</h1>
            </div>
            <div style="background-color: #111; border: 1px solid #222; padding: 32px;">
              <div style="display: inline-block; background: rgba(201, 162, 39, 0.15); color: #c9a227; border: 1px solid #c9a227; padding: 6px 14px; border-radius: 4px; font-size: 12px; font-weight: 600; letter-spacing: 0.5px; margin-bottom: 16px;">WE MISS YOU</div>
              <h2 style="color: #fff; font-size: 22px; font-weight: 600; margin: 0 0 16px 0; line-height: 1.3;">It's Been a While!</h2>
              <p style="color: #888; font-size: 14px; margin: 0 0 20px 0;">Hey ${sampleData.name},</p>
              <div style="color: #aaa; font-size: 14px; line-height: 1.7;">
                <p style="margin: 0 0 16px 0;">We noticed you haven't booked in ${sampleData.daysSinceLastBooking} days. Your favorite barbers miss you!</p>
                <div style="background: rgba(59, 130, 246, 0.1); border-left: 3px solid #3b82f6; padding: 12px 16px; margin: 20px 0;">
                  <p style="color: #3b82f6; font-size: 13px; margin: 0;">Book within 48 hours and get 20% off + 2X loyalty points!</p>
                </div>
              </div>
              <div style="margin: 32px 0; text-align: center;">
                <a href="#" style="display: inline-block; background: #c9a227; color: #0a0a0a; text-decoration: none; padding: 14px 32px; font-weight: 600; letter-spacing: 1px; font-size: 14px;">BOOK NOW</a>
              </div>
            </div>
            <div style="padding: 24px 0; text-align: center;">
              <p style="color: #444; font-size: 11px; margin: 0;">© 2025 BCUTZ. All rights reserved.</p>
              <p style="margin: 12px 0 0 0;"><a href="#" style="color: #c9a227; font-size: 11px; text-decoration: none;">bcutz.lovable.app</a></p>
            </div>
          </div>
        </div>
      `;

    case 'booking-reminder':
      return `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #0a0a0a;">
          <div style="padding: 40px 20px;">
            <div style="text-align: center; padding-bottom: 32px;">
              <h1 style="font-size: 28px; font-weight: 700; letter-spacing: 6px; margin: 0; color: #c9a227;">BCUTZ</h1>
            </div>
            <div style="background-color: #111; border: 1px solid #222; padding: 32px;">
              <div style="display: inline-block; background: rgba(59, 130, 246, 0.15); color: #3b82f6; border: 1px solid #3b82f6; padding: 6px 14px; border-radius: 4px; font-size: 12px; font-weight: 600; letter-spacing: 0.5px; margin-bottom: 16px;">REMINDER</div>
              <h2 style="color: #fff; font-size: 22px; font-weight: 600; margin: 0 0 16px 0; line-height: 1.3;">Your Appointment is Tomorrow</h2>
              <p style="color: #888; font-size: 14px; margin: 0 0 20px 0;">Hey ${sampleData.name},</p>
              <div style="color: #aaa; font-size: 14px; line-height: 1.7;">
                <div style="background: #0a0a0a; border: 1px solid #222; padding: 4px 16px; margin: 20px 0;">
                  <div style="padding: 12px 0; border-bottom: 1px solid #222;"><span style="color: #666; font-size: 13px;">Service</span><span style="float: right; color: #fff; font-size: 13px; font-weight: 500;">${sampleData.service}</span><div style="clear: both;"></div></div>
                  <div style="padding: 12px 0; border-bottom: 1px solid #222;"><span style="color: #666; font-size: 13px;">Barber</span><span style="float: right; color: #fff; font-size: 13px; font-weight: 500;">${sampleData.barber}</span><div style="clear: both;"></div></div>
                  <div style="padding: 12px 0;"><span style="color: #666; font-size: 13px;">Time</span><span style="float: right; color: #fff; font-size: 13px; font-weight: 500;">${sampleData.time}</span><div style="clear: both;"></div></div>
                </div>
              </div>
              <div style="margin: 32px 0; text-align: center;">
                <a href="#" style="display: inline-block; background: #c9a227; color: #0a0a0a; text-decoration: none; padding: 14px 32px; font-weight: 600; letter-spacing: 1px; font-size: 14px;">VIEW BOOKING</a>
              </div>
            </div>
            <div style="padding: 24px 0; text-align: center;">
              <p style="color: #444; font-size: 11px; margin: 0;">© 2025 BCUTZ. All rights reserved.</p>
              <p style="margin: 12px 0 0 0;"><a href="#" style="color: #c9a227; font-size: 11px; text-decoration: none;">bcutz.lovable.app</a></p>
            </div>
          </div>
        </div>
      `;

    case 'payment-receipt':
      return `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #0a0a0a;">
          <div style="padding: 40px 20px;">
            <div style="text-align: center; padding-bottom: 32px;">
              <h1 style="font-size: 28px; font-weight: 700; letter-spacing: 6px; margin: 0; color: #c9a227;">BCUTZ</h1>
            </div>
            <div style="background-color: #111; border: 1px solid #222; padding: 32px;">
              <div style="display: inline-block; background: rgba(34, 197, 94, 0.15); color: #22c55e; border: 1px solid #22c55e; padding: 6px 14px; border-radius: 4px; font-size: 12px; font-weight: 600; letter-spacing: 0.5px; margin-bottom: 16px;">PAYMENT CONFIRMED</div>
              <h2 style="color: #fff; font-size: 22px; font-weight: 600; margin: 0 0 16px 0; line-height: 1.3;">Payment Successful</h2>
              <p style="color: #888; font-size: 14px; margin: 0 0 20px 0;">Hey ${sampleData.name},</p>
              <div style="color: #aaa; font-size: 14px; line-height: 1.7;">
                <div style="padding: 16px 0; text-align: center;">
                  <span style="color: #666; font-size: 12px; display: block; margin-bottom: 4px;">Amount Paid</span>
                  <span style="color: #22c55e; font-size: 28px; font-weight: 700;">CHF ${sampleData.amount}</span>
                </div>
                <div style="background: #0a0a0a; border: 1px solid #222; padding: 4px 16px; margin: 20px 0;">
                  <div style="padding: 12px 0;"><span style="color: #666; font-size: 13px;">Points Earned</span><span style="float: right; color: #c9a227; font-size: 13px; font-weight: 500;">+${sampleData.pointsEarned} pts</span><div style="clear: both;"></div></div>
                </div>
              </div>
              <div style="margin: 32px 0; text-align: center;">
                <a href="#" style="display: inline-block; background: #c9a227; color: #0a0a0a; text-decoration: none; padding: 14px 32px; font-weight: 600; letter-spacing: 1px; font-size: 14px;">VIEW RECEIPT</a>
              </div>
            </div>
            <div style="padding: 24px 0; text-align: center;">
              <p style="color: #444; font-size: 11px; margin: 0;">© 2025 BCUTZ. All rights reserved.</p>
              <p style="margin: 12px 0 0 0;"><a href="#" style="color: #c9a227; font-size: 11px; text-decoration: none;">bcutz.lovable.app</a></p>
            </div>
          </div>
        </div>
      `;

    case 'admin-role':
      return `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #0a0a0a;">
          <div style="padding: 40px 20px;">
            <div style="text-align: center; padding-bottom: 32px;">
              <h1 style="font-size: 28px; font-weight: 700; letter-spacing: 6px; margin: 0; color: #c9a227;">BCUTZ</h1>
            </div>
            <div style="background-color: #111; border: 1px solid #222; padding: 32px;">
              <div style="display: inline-block; background: rgba(201, 162, 39, 0.15); color: #c9a227; border: 1px solid #c9a227; padding: 6px 14px; border-radius: 4px; font-size: 12px; font-weight: 600; letter-spacing: 0.5px; margin-bottom: 16px;">ADMIN</div>
              <h2 style="color: #fff; font-size: 22px; font-weight: 600; margin: 0 0 16px 0; line-height: 1.3;">Admin Status Update</h2>
              <p style="color: #888; font-size: 14px; margin: 0 0 20px 0;">Hey ${sampleData.name},</p>
              <div style="color: #aaa; font-size: 14px; line-height: 1.7;">
                <p style="margin: 0 0 16px 0;">Your admin privileges have been <strong style="color: #fff;">${sampleData.action}</strong>.</p>
                <div style="background: rgba(59, 130, 246, 0.1); border-left: 3px solid #3b82f6; padding: 12px 16px; margin: 20px 0;">
                  <p style="color: #3b82f6; font-size: 13px; margin: 0;">You now have access to the BCUTZ admin dashboard.</p>
                </div>
              </div>
              <div style="margin: 32px 0; text-align: center;">
                <a href="#" style="display: inline-block; background: #c9a227; color: #0a0a0a; text-decoration: none; padding: 14px 32px; font-weight: 600; letter-spacing: 1px; font-size: 14px;">GO TO DASHBOARD</a>
              </div>
            </div>
            <div style="padding: 24px 0; text-align: center;">
              <p style="color: #444; font-size: 11px; margin: 0;">© 2025 BCUTZ. All rights reserved.</p>
              <p style="margin: 12px 0 0 0;"><a href="#" style="color: #c9a227; font-size: 11px; text-decoration: none;">bcutz.lovable.app</a></p>
            </div>
          </div>
        </div>
      `;

    case 'deletion-confirmation':
      return `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #0a0a0a;">
          <div style="padding: 40px 20px;">
            <div style="text-align: center; padding-bottom: 32px;">
              <h1 style="font-size: 28px; font-weight: 700; letter-spacing: 6px; margin: 0; color: #c9a227;">BCUTZ</h1>
            </div>
            <div style="background-color: #111; border: 1px solid #222; padding: 32px;">
              <div style="display: inline-block; background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid #ef4444; padding: 6px 14px; border-radius: 4px; font-size: 12px; font-weight: 600; letter-spacing: 0.5px; margin-bottom: 16px;">SECURITY</div>
              <h2 style="color: #fff; font-size: 22px; font-weight: 600; margin: 0 0 16px 0; line-height: 1.3;">Account Deletion Request</h2>
              <p style="color: #888; font-size: 14px; margin: 0 0 20px 0;">Hey ${sampleData.name},</p>
              <div style="color: #aaa; font-size: 14px; line-height: 1.7;">
                <p style="margin: 0 0 16px 0;">To confirm account deletion, enter this code:</p>
                <div style="padding: 16px 0; text-align: center;">
                  <span style="color: #ef4444; font-size: 32px; font-weight: 700; letter-spacing: 8px; font-family: monospace;">123456</span>
                </div>
                <div style="background: rgba(234, 179, 8, 0.1); border-left: 3px solid #eab308; padding: 12px 16px; margin: 20px 0;">
                  <p style="color: #eab308; font-size: 13px; margin: 0;">This code expires in 15 minutes.</p>
                </div>
              </div>
            </div>
            <div style="padding: 24px 0; text-align: center;">
              <p style="color: #444; font-size: 11px; margin: 0;">© 2025 BCUTZ. All rights reserved.</p>
              <p style="margin: 12px 0 0 0;"><a href="#" style="color: #c9a227; font-size: 11px; text-decoration: none;">bcutz.lovable.app</a></p>
            </div>
          </div>
        </div>
      `;

    default:
      return '<p>Template not found</p>';
  }
};

export default function FounderEmailPreview() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate>('welcome-customer');

  const sampleData = {
    name: 'Max Mustermann',
    email: 'max@example.com',
    founderMessage: 'We appreciate your time with us. If there is anything we could have done better, please let us know.',
    daysSinceLastBooking: 45,
    time: '14:30',
    service: 'Classic Haircut',
    barber: 'Marco\'s Barbershop',
    amount: '45.00',
    pointsEarned: 45,
    action: 'granted',
  };

  if (!hasRole('founder')) {
    navigate('/');
    return null;
  }

  const currentTemplate = emailTemplates.find(t => t.id === selectedTemplate);

  return (
    <div className="min-h-screen bg-background">
<div className="container mx-auto px-4 py-8">
        <Breadcrumbs />

        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate('/founder')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Mail className="w-8 h-8 text-primary" />
              Email Template Preview
            </h1>
            <p className="text-muted-foreground mt-1">Preview all email templates before they're sent to customers</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-[300px_1fr] gap-6">
          {/* Template List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Templates</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {emailTemplates.map((template) => {
                  const Icon = template.icon;
                  return (
                    <button
                      key={template.id}
                      onClick={() => setSelectedTemplate(template.id)}
                      className={`w-full p-4 text-left transition-colors hover:bg-muted/50 ${
                        selectedTemplate === template.id ? 'bg-primary/10 border-l-4 border-primary' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-5 h-5 ${selectedTemplate === template.id ? 'text-primary' : 'text-muted-foreground'}`} />
                        <div>
                          <p className="font-medium text-sm">{template.name}</p>
                          <p className="text-xs text-muted-foreground">{template.description}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  {currentTemplate?.name}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">{currentTemplate?.description}</p>
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/30 rounded-lg p-6 overflow-auto max-h-[70vh]">
                <div 
                  dangerouslySetInnerHTML={{ 
                    __html: DOMPurify.sanitize(getEmailPreview(selectedTemplate, sampleData), {
                      ALLOWED_TAGS: ['div', 'p', 'h1', 'h2', 'h3', 'h4', 'a', 'ul', 'li', 'strong', 'span', 'table', 'tr', 'td'],
                      ALLOWED_ATTR: ['style', 'href'],
                    })
                  }}
                  className="mx-auto"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
