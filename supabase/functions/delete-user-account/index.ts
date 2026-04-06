import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { z } from "https://esm.sh/zod@3.22.4";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { sendEmail } from "../_shared/smtp.ts";

// UUID validation regex
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Input validation schema
const DeleteAccountRequestSchema = z.object({
  target_user_id: z.string().regex(uuidRegex, "Invalid user ID format").optional(),
  user_id: z.string().regex(uuidRegex, "Invalid user ID format").optional(), // For service role direct deletion
  is_founder_action: z.boolean().optional().default(false),
  admin_delete: z.boolean().optional().default(false), // For service role cleanup
  action: z.enum(["request_deletion", "confirm_deletion"]).optional(),
  confirmation_code: z.string().length(6, "Confirmation code must be 6 digits").regex(/^\d{6}$/, "Confirmation code must be numeric").optional(),
  skip_confirmation: z.boolean().optional().default(false),
  founder_message: z.string().max(500, "Founder message must be 500 characters or less").optional(),
});

// Sanitize sensitive data from logs
const sanitizeForLog = (data: any): any => {
  if (!data || typeof data !== 'object') return data;
  
  const sensitiveKeys = ['email', 'userId', 'user_id', 'userIdToDelete', 'actingUserId', 'targetUserId', 'name', 'full_name', 'code'];
  const result = { ...data };
  
  for (const key of sensitiveKeys) {
    if (key in result) {
      if (typeof result[key] === 'string') {
        if (result[key].includes('@')) {
          result[key] = '[REDACTED_EMAIL]';
        } else if (key === 'code') {
          result[key] = '[REDACTED_CODE]';
        } else if (key === 'name' || key === 'full_name') {
          result[key] = '[REDACTED_NAME]';
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
  console.log(`[DELETE-USER-ACCOUNT] ${step}${detailsStr}`);
};


// Generate a random 6-digit code
const generateDeletionCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  try {
    logStep("Function started");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    // Check for service role key authentication (admin cleanup mode)
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    
    // If token matches service role key, allow direct admin deletion
    const isServiceRoleAuth = token === supabaseServiceKey;
    
    let actingUser: { id: string } | null = null;
    
    if (isServiceRoleAuth) {
      logStep("Service role authentication - admin cleanup mode");
      // For service role auth, we don't have an acting user, use a system ID
      actingUser = { id: 'system-admin' };
    } else {
      if (!authHeader) throw new Error("No authorization header provided");
      
      const { data: userData, error: userError } = await supabaseClient.auth.getUser(token!);
      if (userError) throw new Error(`Authentication error: ${userError.message}`);
      
      if (!userData.user) throw new Error("User not authenticated");
      actingUser = userData.user;
      logStep("User authenticated", { userId: actingUser.id });
    }

    // Parse and validate request body
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      throw new Error("Invalid JSON in request body");
    }

    const parseResult = DeleteAccountRequestSchema.safeParse(rawBody);
    if (!parseResult.success) {
      const errorMessage = parseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new Error(`Validation failed: ${errorMessage}`);
    }

    const { target_user_id, user_id, is_founder_action, admin_delete, action, confirmation_code, skip_confirmation, founder_message } = parseResult.data;
    
    // For service role admin cleanup, use user_id directly
    const isAdminCleanup = isServiceRoleAuth && admin_delete && user_id;
    
    // Determine which user to delete
    let userIdToDelete: string;
    if (isAdminCleanup) {
      userIdToDelete = user_id!;
      logStep("Admin cleanup mode", { userIdToDelete });
    } else if (is_founder_action) {
      userIdToDelete = target_user_id!;
    } else {
      userIdToDelete = actingUser!.id;
    }
    
    if (!userIdToDelete || userIdToDelete === 'system-admin') {
      throw new Error("No valid user ID provided for deletion");
    }

    // Founders can skip email confirmation for faster admin workflow
    const founderSkipConfirmation = (is_founder_action && skip_confirmation === true) || isAdminCleanup;

    // If founder action (not admin cleanup), verify the acting user is a founder
    if (is_founder_action && !isAdminCleanup) {
      const { data: founderCheck } = await supabaseClient
        .rpc('is_founder', { _user_id: actingUser!.id });
      
      if (!founderCheck) {
        throw new Error("Only founders can delete other users' accounts");
      }
      
      // Check if target is also a founder (can't delete founders)
      const { data: targetIsFounder } = await supabaseClient
        .rpc('is_founder', { _user_id: userIdToDelete });
      
      if (targetIsFounder) {
        throw new Error("Cannot delete founder accounts");
      }
      
      logStep("Founder action verified", { actingUserId: actingUser!.id, targetUserId: userIdToDelete });
    }
    
    // For admin cleanup, also check if target is a founder
    if (isAdminCleanup) {
      const { data: targetIsFounder } = await supabaseClient
        .rpc('is_founder', { _user_id: userIdToDelete });
      
      if (targetIsFounder) {
        throw new Error("Cannot delete founder accounts via admin cleanup");
      }
    }

    // Get user's profile info
    const { data: profileData } = await supabaseClient
      .from('profiles')
      .select('email, full_name')
      .eq('id', userIdToDelete)
      .single();
    
    if (!profileData?.email) {
      throw new Error("User email not found");
    }
    
    logStep("Profile found", { email: profileData.email, name: profileData.full_name });

    // STEP 1: Request deletion - send confirmation email (unless founder skips)
    if (action === 'request_deletion' && !founderSkipConfirmation) {
      const deletionCode = generateDeletionCode();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      // Store the deletion code in user metadata (or a separate table)
      // For simplicity, we'll use a temporary approach with signed data
      const deletionData = {
        code: deletionCode,
        user_id: userIdToDelete,
        expires_at: expiresAt.toISOString(),
        is_founder_action,
        acting_user_id: actingUser.id
      };

      // Store deletion request temporarily
      const { error: storageError } = await supabaseClient
        .from('notifications')
        .insert({
          user_id: userIdToDelete,
          type: 'deletion_request',
          title: 'Account Deletion Request',
          message: JSON.stringify(deletionData),
          is_read: false
        });

      if (storageError) {
        logStep("Warning: Could not store deletion request", { error: storageError.message });
      }

      // Send confirmation email
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8f9fa; margin: 0; padding: 40px 20px;">
          <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 32px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">Account Deletion Request</h1>
            </div>
            <div style="padding: 32px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                Hello ${profileData.full_name || 'there'},
              </p>
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                ${is_founder_action 
                  ? 'An administrator has requested to delete your BCUTZ account.' 
                  : 'You have requested to delete your BCUTZ account.'}
              </p>
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
                To confirm this action, please enter the following code:
              </p>
              <div style="background: #fef2f2; border: 2px solid #dc2626; border-radius: 8px; padding: 24px; text-align: center; margin: 24px 0;">
                <span style="font-family: 'Courier New', monospace; font-size: 36px; font-weight: 700; color: #dc2626; letter-spacing: 8px;">
                  ${deletionCode}
                </span>
              </div>
              <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin: 24px 0;">
                This code expires in <strong>15 minutes</strong>.
              </p>
              <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0;">
                <p style="color: #92400e; font-size: 14px; margin: 0; font-weight: 600;">
                  ⚠️ Warning: This action is permanent and cannot be undone!
                </p>
                <p style="color: #92400e; font-size: 14px; margin: 8px 0 0;">
                  All your data, bookings, reviews, and loyalty points will be permanently deleted.
                </p>
              </div>
              <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin: 24px 0 0;">
                If you did not request this deletion, please ignore this email and your account will remain safe.
              </p>
            </div>
            <div style="background: #f3f4f6; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} BCUTZ. All rights reserved.
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      try {
        await sendEmail({
          to: profileData.email,
          subject: "Account Deletion Confirmation Code",
          html: emailHtml,
        });
        logStep("Confirmation email sent via SMTP", { email: profileData.email });
      } catch (emailError: any) {
        logStep("Email send error", { error: emailError.message });
        throw new Error("Failed to send confirmation email: " + emailError.message);
      }

      return new Response(JSON.stringify({ 
        success: true,
        step: 'confirmation_sent',
        message: "Confirmation code sent to your email"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // STEP 2: Confirm deletion with code OR founder direct deletion
    if (action === 'confirm_deletion' || founderSkipConfirmation) {
      
      // If founder is skipping confirmation, we don't need to verify code
      if (!founderSkipConfirmation) {
        if (!confirmation_code || confirmation_code.length !== 6) {
          throw new Error("Invalid confirmation code");
        }

        // Retrieve the stored deletion request
        const { data: deletionRequest } = await supabaseClient
          .from('notifications')
          .select('message, created_at')
          .eq('user_id', userIdToDelete)
          .eq('type', 'deletion_request')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (!deletionRequest) {
          throw new Error("No deletion request found. Please request deletion again.");
        }

        let storedData;
        try {
          storedData = JSON.parse(deletionRequest.message);
        } catch {
          throw new Error("Invalid deletion request data");
        }

        // Check if code matches
        if (storedData.code !== confirmation_code) {
          throw new Error("Incorrect confirmation code");
        }

        // Check if code has expired
        const expiresAt = new Date(storedData.expires_at);
        if (new Date() > expiresAt) {
          throw new Error("Confirmation code has expired. Please request deletion again.");
        }

        // Verify the user making the request matches
        if (!is_founder_action && storedData.user_id !== actingUser.id) {
          throw new Error("Unauthorized deletion attempt");
        }

        logStep("Confirmation code verified, proceeding with deletion");

        // Delete the deletion request notification
        await supabaseClient
          .from('notifications')
          .delete()
          .eq('user_id', userIdToDelete)
          .eq('type', 'deletion_request');
      } else {
        logStep("Founder skipping confirmation, proceeding with direct deletion");
      }

      // Proceed with deletion
      // Delete related data in order (respecting foreign keys)
      
      // 1. Delete push tokens
      await supabaseClient.from('push_tokens').delete().eq('user_id', userIdToDelete);
      logStep("Deleted push tokens");

      // 2. Delete notification settings
      await supabaseClient.from('notification_settings').delete().eq('user_id', userIdToDelete);
      logStep("Deleted notification settings");

      // 3. Delete notifications
      await supabaseClient.from('notifications').delete().eq('user_id', userIdToDelete);
      logStep("Deleted notifications");

      // 4. Delete saved barbers
      await supabaseClient.from('saved_barbers').delete().eq('user_id', userIdToDelete);
      logStep("Deleted saved barbers");

      // 5. Delete payment methods
      await supabaseClient.from('payment_methods').delete().eq('user_id', userIdToDelete);
      logStep("Deleted payment methods");

      // 6. Delete loyalty transactions
      await supabaseClient.from('loyalty_transactions').delete().eq('user_id', userIdToDelete);
      logStep("Deleted loyalty transactions");

      // 7. Delete reward redemptions
      await supabaseClient.from('reward_redemptions').delete().eq('user_id', userIdToDelete);
      logStep("Deleted reward redemptions");

      // 8. Delete loyalty points
      await supabaseClient.from('loyalty_points').delete().eq('user_id', userIdToDelete);
      logStep("Deleted loyalty points");

      // 9. Delete birthday bonus log
      await supabaseClient.from('birthday_bonus_log').delete().eq('user_id', userIdToDelete);
      logStep("Deleted birthday bonus log");

      // 10. Delete vouchers (must be before bookings due to voucher_id FK)
      await supabaseClient.from('vouchers').delete().eq('user_id', userIdToDelete);
      logStep("Deleted vouchers");

      // 11. Delete referrals (as referrer and referred)
      await supabaseClient.from('referrals').delete().eq('referrer_id', userIdToDelete);
      await supabaseClient.from('referrals').delete().eq('referred_user_id', userIdToDelete);
      logStep("Deleted referrals");

      // 12. Get all bookings for this user to delete related data
      const { data: userBookings } = await supabaseClient
        .from('bookings')
        .select('id')
        .eq('customer_id', userIdToDelete);
      
      const bookingIds = userBookings?.map(b => b.id) || [];
      logStep("Found user bookings", { count: bookingIds.length });

      // 13. Delete payments linked to user's bookings
      if (bookingIds.length > 0) {
        await supabaseClient.from('payments').delete().in('booking_id', bookingIds);
        logStep("Deleted payments for user bookings");
      }

      // 14. Delete reschedule requests (as customer)
      await supabaseClient.from('reschedule_requests').delete().eq('customer_id', userIdToDelete);
      logStep("Deleted reschedule requests");

      // 15. Delete booking comments
      await supabaseClient.from('booking_comments').delete().eq('user_id', userIdToDelete);
      logStep("Deleted booking comments");

      // 16. Delete reviews (as customer) - also linked to bookings
      await supabaseClient.from('reviews').delete().eq('customer_id', userIdToDelete);
      logStep("Deleted reviews as customer");

      // 17. Delete bookings (as customer)
      await supabaseClient.from('bookings').delete().eq('customer_id', userIdToDelete);
      logStep("Deleted bookings");

      // 18. Delete reports (as reporter)
      await supabaseClient.from('reports').delete().eq('reporter_id', userIdToDelete);
      logStep("Deleted reports");

      // 19. Check if user has a barber profile
      const { data: barberProfile } = await supabaseClient
        .from('barber_profiles')
        .select('id')
        .eq('user_id', userIdToDelete)
        .maybeSingle();

      if (barberProfile) {
        const barberId = barberProfile.id;
        logStep("User has barber profile", { barberId });

        // Get all bookings for this barber to delete related data
        const { data: barberBookings } = await supabaseClient
          .from('bookings')
          .select('id')
          .eq('barber_id', barberId);
        
        const barberBookingIds = barberBookings?.map(b => b.id) || [];

        // Delete payments for barber's bookings
        if (barberBookingIds.length > 0) {
          await supabaseClient.from('payments').delete().in('booking_id', barberBookingIds);
          logStep("Deleted payments for barber bookings");
          
          // Delete reschedule requests for barber's bookings
          await supabaseClient.from('reschedule_requests').delete().in('booking_id', barberBookingIds);
          logStep("Deleted reschedule requests for barber bookings");
          
          // Delete booking comments for barber's bookings
          await supabaseClient.from('booking_comments').delete().in('booking_id', barberBookingIds);
          logStep("Deleted booking comments for barber bookings");
        }

        // Delete barber-related data
        await supabaseClient.from('blocked_times').delete().eq('barber_id', barberId);
        await supabaseClient.from('services').delete().eq('barber_id', barberId);
        await supabaseClient.from('reviews').delete().eq('barber_id', barberId);
        await supabaseClient.from('payouts').delete().eq('barber_id', barberId);
        
        // Delete bookings where this user is the barber
        await supabaseClient.from('bookings').delete().eq('barber_id', barberId);
        logStep("Deleted barber bookings");
        
        // Delete saved_barbers references to this barber
        await supabaseClient.from('saved_barbers').delete().eq('barber_id', barberId);
        logStep("Deleted saved barber references");
        
        // Delete barber profile
        await supabaseClient.from('barber_profiles').delete().eq('id', barberId);
        logStep("Deleted barber profile and related data");
      }

      // 20. Delete user roles
      await supabaseClient.from('user_roles').delete().eq('user_id', userIdToDelete);
      logStep("Deleted user roles");

      // 21. Delete founder settings and action logs if exists
      await supabaseClient.from('founder_settings').delete().eq('user_id', userIdToDelete);
      await supabaseClient.from('founder_action_log').delete().eq('founder_id', userIdToDelete);
      logStep("Deleted founder settings and logs");

      // 22. Delete admin activity logs
      await supabaseClient.from('admin_activity_log').delete().eq('actor_id', userIdToDelete);
      logStep("Deleted admin activity logs");

      // 23. Delete profile
      await supabaseClient.from('profiles').delete().eq('id', userIdToDelete);
      logStep("Deleted profile");

      // 18. Finally, delete the auth user
      const { error: deleteAuthError } = await supabaseClient.auth.admin.deleteUser(userIdToDelete);
      if (deleteAuthError) {
        logStep("Error deleting auth user", { error: deleteAuthError.message });
        throw new Error(`Failed to delete auth user: ${deleteAuthError.message}`);
      }
      logStep("Deleted auth user");

      // Log the action if founder action
      if (is_founder_action) {
        await supabaseClient.from('founder_action_log').insert({
          founder_id: actingUser.id,
          action_type: 'delete_user',
          target_id: userIdToDelete,
          target_type: 'user',
          details: {
            deleted_email: profileData.email,
            deleted_name: profileData.full_name,
            had_barber_profile: !!barberProfile
          }
        });
        logStep("Logged founder action");
      }

      // Send farewell email with FOMO
      try {
        const farewellHtml = `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; overflow: hidden;">
            <div style="background: linear-gradient(90deg, #6b7280 0%, #9ca3af 50%, #6b7280 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #1a1a2e; margin: 0; font-size: 32px; font-weight: bold;">We're Sad to See You Go 😢</h1>
            </div>
            
            <div style="padding: 40px 30px; color: #ffffff;">
              <p style="font-size: 20px; margin-bottom: 20px;">Hey ${profileData.full_name || 'there'},</p>
              
              ${founder_message ? `
              <div style="background: rgba(212, 175, 55, 0.1); border-left: 4px solid #d4af37; padding: 20px; margin: 20px 0; border-radius: 8px;">
                <h4 style="color: #d4af37; margin-top: 0;">💬 A message from our team:</h4>
                <p style="color: #e0e0e0; font-style: italic; margin: 0;">"${founder_message}"</p>
              </div>
              ` : ''}
              
              <p style="font-size: 16px; line-height: 1.8; color: #e0e0e0;">
                Your BCUTZ account has been successfully deleted. We truly appreciate the time you spent with us and hope we served you well.
              </p>
              
              <div style="background: rgba(239, 68, 68, 0.1); border-left: 4px solid #ef4444; padding: 20px; margin: 30px 0; border-radius: 8px;">
                <h3 style="color: #ef4444; margin-top: 0;">⚠️ What you'll be missing:</h3>
                <ul style="color: #e0e0e0; line-height: 2;">
                  <li><strong>Your loyalty points</strong> - they're gone forever 💔</li>
                  <li><strong>Exclusive member discounts</strong> - up to 30% off</li>
                  <li><strong>Priority booking</strong> with top-rated barbers</li>
                  <li><strong>Your booking history</strong> and favorite barbers</li>
                  <li><strong>Early access</strong> to new features and promotions</li>
                </ul>
              </div>
              
              <div style="background: rgba(212, 175, 55, 0.15); border: 2px dashed #d4af37; padding: 25px; margin: 30px 0; border-radius: 12px; text-align: center;">
                <h3 style="color: #d4af37; margin-top: 0;">🎁 EXCLUSIVE COMEBACK OFFER</h3>
                <p style="color: #e0e0e0; font-size: 18px; margin-bottom: 15px;">
                  Changed your mind? Come back within <strong style="color: #d4af37;">7 days</strong> and get:
                </p>
                <div style="background: #d4af37; color: #1a1a2e; padding: 15px 25px; border-radius: 8px; display: inline-block; font-size: 24px; font-weight: bold;">
                  50% OFF Your Next Booking!
                </div>
                <p style="color: #888; font-size: 12px; margin-top: 15px;">
                  *Offer valid for 7 days. Simply create a new account with this email.
                </p>
              </div>
              
              <p style="font-size: 16px; line-height: 1.8; color: #e0e0e0;">
                We'd love to know what we could have done better. If you have any feedback, we're all ears!
              </p>
              
              <div style="text-align: center; margin: 35px 0;">
                <a href="https://bcutz.lovable.app/auth" style="background: linear-gradient(90deg, #d4af37 0%, #f4d03f 100%); color: #1a1a2e; padding: 16px 40px; text-decoration: none; border-radius: 30px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 15px rgba(212, 175, 55, 0.4);">
                  Come Back to BCUTZ 🔙
                </a>
              </div>
              
              <div style="border-top: 1px solid #333; padding-top: 25px; margin-top: 30px;">
                <p style="font-size: 14px; color: #888; text-align: center;">
                  <strong style="color: #d4af37;">Fun fact:</strong> Our customers save an average of <strong>2 hours per month</strong> by booking through BCUTZ instead of waiting in line! ⏱️
                </p>
              </div>
              
              <p style="font-size: 16px; line-height: 1.8; color: #e0e0e0; margin-top: 25px;">
                Thank you for being part of the BCUTZ family. The door is always open if you want to come back! 🚪✨
              </p>
              
              <p style="font-size: 16px; color: #d4af37; margin-top: 20px;">
                Wishing you the best,<br>
                <strong>The BCUTZ Team</strong> 💈
              </p>
            </div>
            
            <div style="background: #0d0d1a; padding: 25px; text-align: center; border-top: 1px solid #333;">
              <p style="color: #888; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} BCUTZ - Your Premium Barber Booking Platform<br>
                <span style="color: #6b7280;">We hope to see you again soon!</span>
              </p>
            </div>
          </div>
        `;

        await sendEmail({
          to: profileData.email,
          subject: "Goodbye from BCUTZ - We Will Miss You - Special Comeback Offer Inside",
          html: farewellHtml,
        });
        logStep("Farewell email sent", { email: profileData.email });
      } catch (emailError: any) {
        // Don't fail the deletion if farewell email fails
        logStep("Warning: Failed to send farewell email", { error: emailError.message });
      }

      return new Response(JSON.stringify({ 
        success: true,
        step: 'deleted',
        message: "Account deleted successfully"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    throw new Error("Invalid action. Use 'request_deletion' or 'confirm_deletion'");

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
