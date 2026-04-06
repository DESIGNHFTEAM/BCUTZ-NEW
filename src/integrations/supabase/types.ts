export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_activity_log: {
        Row: {
          action_type: string
          actor_id: string
          created_at: string
          details: Json | null
          id: string
          target_barber_id: string | null
          target_user_id: string | null
        }
        Insert: {
          action_type: string
          actor_id: string
          created_at?: string
          details?: Json | null
          id?: string
          target_barber_id?: string | null
          target_user_id?: string | null
        }
        Update: {
          action_type?: string
          actor_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_barber_id?: string | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      barber_profiles: {
        Row: {
          address: string
          avg_rating: number | null
          bank_account_holder: string | null
          bank_iban: string | null
          business_type: string
          city: string
          country: string
          created_at: string
          description: string | null
          gallery_images: string[] | null
          id: string
          is_active: boolean | null
          is_verified: boolean | null
          latitude: number | null
          longitude: number | null
          opening_hours: Json | null
          phone: string | null
          postal_code: string
          profile_image_url: string | null
          shop_name: string
          stripe_account_id: string | null
          stripe_onboarding_complete: boolean | null
          total_reviews: number | null
          updated_at: string
          user_id: string
          videos: string[] | null
        }
        Insert: {
          address: string
          avg_rating?: number | null
          bank_account_holder?: string | null
          bank_iban?: string | null
          business_type?: string
          city: string
          country?: string
          created_at?: string
          description?: string | null
          gallery_images?: string[] | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          latitude?: number | null
          longitude?: number | null
          opening_hours?: Json | null
          phone?: string | null
          postal_code: string
          profile_image_url?: string | null
          shop_name: string
          stripe_account_id?: string | null
          stripe_onboarding_complete?: boolean | null
          total_reviews?: number | null
          updated_at?: string
          user_id: string
          videos?: string[] | null
        }
        Update: {
          address?: string
          avg_rating?: number | null
          bank_account_holder?: string | null
          bank_iban?: string | null
          business_type?: string
          city?: string
          country?: string
          created_at?: string
          description?: string | null
          gallery_images?: string[] | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          latitude?: number | null
          longitude?: number | null
          opening_hours?: Json | null
          phone?: string | null
          postal_code?: string
          profile_image_url?: string | null
          shop_name?: string
          stripe_account_id?: string | null
          stripe_onboarding_complete?: boolean | null
          total_reviews?: number | null
          updated_at?: string
          user_id?: string
          videos?: string[] | null
        }
        Relationships: []
      }
      birthday_bonus_log: {
        Row: {
          awarded_at: string
          id: string
          points_awarded: number
          user_id: string
          year: number
        }
        Insert: {
          awarded_at?: string
          id?: string
          points_awarded: number
          user_id: string
          year: number
        }
        Update: {
          awarded_at?: string
          id?: string
          points_awarded?: number
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      blocked_times: {
        Row: {
          barber_id: string
          blocked_date: string
          created_at: string
          end_time: string
          id: string
          reason: string | null
          start_time: string
        }
        Insert: {
          barber_id: string
          blocked_date: string
          created_at?: string
          end_time: string
          id?: string
          reason?: string | null
          start_time: string
        }
        Update: {
          barber_id?: string
          blocked_date?: string
          created_at?: string
          end_time?: string
          id?: string
          reason?: string | null
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocked_times_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barber_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocked_times_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barber_profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocked_times_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barber_profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_comments: {
        Row: {
          booking_id: string
          comment: string
          created_at: string | null
          id: string
          is_visible: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          booking_id: string
          comment: string
          created_at?: string | null
          id?: string
          is_visible?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          booking_id?: string
          comment?: string
          created_at?: string | null
          id?: string
          is_visible?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_comments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          barber_id: string
          booking_date: string
          cancellation_reason: string | null
          cancelled_at: string | null
          created_at: string
          currency: string
          customer_id: string | null
          customer_paid: number | null
          end_time: string
          id: string
          klarna_fee: number | null
          notes: string | null
          platform_fee: number
          points_earned: number | null
          service_id: string | null
          service_name: string
          service_price: number
          start_time: string
          status: Database["public"]["Enums"]["booking_status"]
          total_amount: number
          updated_at: string
          voucher_discount: number | null
          voucher_id: string | null
        }
        Insert: {
          barber_id: string
          booking_date: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          currency?: string
          customer_id?: string | null
          customer_paid?: number | null
          end_time: string
          id?: string
          klarna_fee?: number | null
          notes?: string | null
          platform_fee?: number
          points_earned?: number | null
          service_id?: string | null
          service_name: string
          service_price: number
          start_time: string
          status?: Database["public"]["Enums"]["booking_status"]
          total_amount: number
          updated_at?: string
          voucher_discount?: number | null
          voucher_id?: string | null
        }
        Update: {
          barber_id?: string
          booking_date?: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          currency?: string
          customer_id?: string | null
          customer_paid?: number | null
          end_time?: string
          id?: string
          klarna_fee?: number | null
          notes?: string | null
          platform_fee?: number
          points_earned?: number | null
          service_id?: string | null
          service_name?: string
          service_price?: number
          start_time?: string
          status?: Database["public"]["Enums"]["booking_status"]
          total_amount?: number
          updated_at?: string
          voucher_discount?: number | null
          voucher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barber_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barber_profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barber_profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_read: boolean
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          barber_id: string
          created_at: string
          customer_id: string
          id: string
          updated_at: string
        }
        Insert: {
          barber_id: string
          created_at?: string
          customer_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          barber_id?: string
          created_at?: string
          customer_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barber_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barber_profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barber_profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      founder_action_log: {
        Row: {
          action_type: string
          created_at: string | null
          details: Json | null
          founder_id: string
          id: string
          is_reversible: boolean | null
          reversed_at: string | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action_type: string
          created_at?: string | null
          details?: Json | null
          founder_id: string
          id?: string
          is_reversible?: boolean | null
          reversed_at?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string | null
          details?: Json | null
          founder_id?: string
          id?: string
          is_reversible?: boolean | null
          reversed_at?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      founder_settings: {
        Row: {
          created_at: string | null
          id: string
          is_super_founder: boolean | null
          override_powers: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_super_founder?: boolean | null
          override_powers?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_super_founder?: boolean | null
          override_powers?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      loyalty_points: {
        Row: {
          created_at: string
          id: string
          lifetime_points: number
          points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lifetime_points?: number
          points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lifetime_points?: number
          points?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      loyalty_rewards: {
        Row: {
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean | null
          min_tier: string | null
          name: string
          points_required: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          discount_type: string
          discount_value: number
          id?: string
          is_active?: boolean | null
          min_tier?: string | null
          name: string
          points_required: number
        }
        Update: {
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean | null
          min_tier?: string | null
          name?: string
          points_required?: number
        }
        Relationships: []
      }
      loyalty_transactions: {
        Row: {
          booking_id: string | null
          created_at: string
          description: string | null
          id: string
          points: number
          transaction_type: string
          user_id: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          points: number
          transaction_type: string
          user_id: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          points?: number
          transaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_transactions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          created_at: string
          email_bookings: boolean
          email_promotions: boolean
          email_reminders: boolean
          email_reviews: boolean
          id: string
          push_bookings: boolean
          push_promotions: boolean
          push_reminders: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_bookings?: boolean
          email_promotions?: boolean
          email_reminders?: boolean
          email_reviews?: boolean
          id?: string
          push_bookings?: boolean
          push_promotions?: boolean
          push_reminders?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_bookings?: boolean
          email_promotions?: boolean
          email_reminders?: boolean
          email_reviews?: boolean
          id?: string
          push_bookings?: boolean
          push_promotions?: boolean
          push_reminders?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          billing_name: string | null
          card_brand: string | null
          card_exp_month: number | null
          card_exp_year: number | null
          card_last_four: string | null
          created_at: string
          id: string
          is_default: boolean
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_name?: string | null
          card_brand?: string | null
          card_exp_month?: number | null
          card_exp_year?: number | null
          card_last_four?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_name?: string | null
          card_brand?: string | null
          card_exp_month?: number | null
          card_exp_year?: number | null
          card_last_four?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          booking_id: string
          created_at: string
          currency: string
          id: string
          klarna_fee: number | null
          paid_at: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          platform_fee: number
          provider_metadata: Json | null
          provider_transaction_id: string | null
          refund_amount: number | null
          refunded_at: string | null
          service_amount: number
          status: Database["public"]["Enums"]["payment_status"]
          total_amount: number
          updated_at: string
          vat_amount: number | null
          vat_rate: number | null
        }
        Insert: {
          booking_id: string
          created_at?: string
          currency?: string
          id?: string
          klarna_fee?: number | null
          paid_at?: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          platform_fee?: number
          provider_metadata?: Json | null
          provider_transaction_id?: string | null
          refund_amount?: number | null
          refunded_at?: string | null
          service_amount: number
          status?: Database["public"]["Enums"]["payment_status"]
          total_amount: number
          updated_at?: string
          vat_amount?: number | null
          vat_rate?: number | null
        }
        Update: {
          booking_id?: string
          created_at?: string
          currency?: string
          id?: string
          klarna_fee?: number | null
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          platform_fee?: number
          provider_metadata?: Json | null
          provider_transaction_id?: string | null
          refund_amount?: number | null
          refunded_at?: string | null
          service_amount?: number
          status?: Database["public"]["Enums"]["payment_status"]
          total_amount?: number
          updated_at?: string
          vat_amount?: number | null
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          amount: number
          bank_reference: string | null
          barber_id: string
          created_at: string
          currency: string
          id: string
          period_end: string
          period_start: string
          processed_at: string | null
          status: Database["public"]["Enums"]["payout_status"]
        }
        Insert: {
          amount: number
          bank_reference?: string | null
          barber_id: string
          created_at?: string
          currency?: string
          id?: string
          period_end: string
          period_start: string
          processed_at?: string | null
          status?: Database["public"]["Enums"]["payout_status"]
        }
        Update: {
          amount?: number
          bank_reference?: string | null
          barber_id?: string
          created_at?: string
          currency?: string
          id?: string
          period_end?: string
          period_start?: string
          processed_at?: string | null
          status?: Database["public"]["Enums"]["payout_status"]
        }
        Relationships: [
          {
            foreignKeyName: "payouts_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barber_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payouts_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barber_profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payouts_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barber_profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          birthday: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          preferred_currency: string | null
          preferred_language: string | null
          region: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          birthday?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          preferred_currency?: string | null
          preferred_language?: string | null
          region?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          birthday?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          preferred_currency?: string | null
          preferred_language?: string | null
          region?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          created_at: string | null
          device_id: string | null
          id: string
          platform: string
          token: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_id?: string | null
          id?: string
          platform: string
          token: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_id?: string | null
          id?: string
          platform?: string
          token?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          points_awarded: number | null
          referral_code: string
          referred_email: string | null
          referred_user_id: string | null
          referrer_id: string
          rewarded_at: string | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          points_awarded?: number | null
          referral_code: string
          referred_email?: string | null
          referred_user_id?: string | null
          referrer_id: string
          rewarded_at?: string | null
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          points_awarded?: number | null
          referral_code?: string
          referred_email?: string | null
          referred_user_id?: string | null
          referrer_id?: string
          rewarded_at?: string | null
          status?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          admin_notes: string | null
          category: string
          created_at: string
          description: string
          id: string
          reported_barber_id: string | null
          reported_user_id: string | null
          reporter_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          category: string
          created_at?: string
          description: string
          id?: string
          reported_barber_id?: string | null
          reported_user_id?: string | null
          reporter_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          category?: string
          created_at?: string
          description?: string
          id?: string
          reported_barber_id?: string | null
          reported_user_id?: string | null
          reporter_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      reschedule_requests: {
        Row: {
          barber_response: string | null
          booking_id: string
          created_at: string | null
          customer_id: string
          id: string
          requested_date: string
          requested_time: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          barber_response?: string | null
          booking_id: string
          created_at?: string | null
          customer_id: string
          id?: string
          requested_date: string
          requested_time: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          barber_response?: string | null
          booking_id?: string
          created_at?: string | null
          customer_id?: string
          id?: string
          requested_date?: string
          requested_time?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reschedule_requests_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          barber_id: string
          barber_replied_at: string | null
          barber_reply: string | null
          booking_id: string
          comment: string | null
          created_at: string
          customer_id: string | null
          id: string
          rating: number
        }
        Insert: {
          barber_id: string
          barber_replied_at?: string | null
          barber_reply?: string | null
          booking_id: string
          comment?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          rating: number
        }
        Update: {
          barber_id?: string
          barber_replied_at?: string | null
          barber_reply?: string | null
          booking_id?: string
          comment?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "reviews_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barber_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barber_profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barber_profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_redemptions: {
        Row: {
          id: string
          redeemed_at: string
          reward_id: string
          user_id: string
          year: number
        }
        Insert: {
          id?: string
          redeemed_at?: string
          reward_id: string
          user_id: string
          year?: number
        }
        Update: {
          id?: string
          redeemed_at?: string
          reward_id?: string
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "reward_redemptions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "loyalty_rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_barbers: {
        Row: {
          barber_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          barber_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          barber_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_barbers_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barber_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_barbers_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barber_profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_barbers_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barber_profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          barber_id: string
          created_at: string
          currency: string
          description: string | null
          duration_minutes: number
          id: string
          is_active: boolean | null
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          barber_id: string
          created_at?: string
          currency?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean | null
          name: string
          price: number
          updated_at?: string
        }
        Update: {
          barber_id?: string
          created_at?: string
          currency?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barber_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barber_profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barber_profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vouchers: {
        Row: {
          code: string
          created_at: string
          discount_type: string
          discount_value: number
          expires_at: string
          id: string
          is_used: boolean
          max_discount: number | null
          reward_id: string | null
          used_at: string | null
          used_on_booking_id: string | null
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          discount_type: string
          discount_value: number
          expires_at?: string
          id?: string
          is_used?: boolean
          max_discount?: number | null
          reward_id?: string | null
          used_at?: string | null
          used_on_booking_id?: string | null
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          expires_at?: string
          id?: string
          is_used?: boolean
          max_discount?: number | null
          reward_id?: string | null
          used_at?: string | null
          used_on_booking_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vouchers_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "loyalty_rewards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_used_on_booking_id_fkey"
            columns: ["used_on_booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      barber_profiles_public: {
        Row: {
          avg_rating: number | null
          business_type: string | null
          city: string | null
          country: string | null
          created_at: string | null
          description: string | null
          gallery_images: string[] | null
          id: string | null
          is_active: boolean | null
          is_verified: boolean | null
          latitude: number | null
          longitude: number | null
          opening_hours: Json | null
          profile_image_url: string | null
          shop_name: string | null
          total_reviews: number | null
          updated_at: string | null
          user_id: string | null
          videos: string[] | null
        }
        Insert: {
          avg_rating?: number | null
          business_type?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          gallery_images?: string[] | null
          id?: string | null
          is_active?: boolean | null
          is_verified?: boolean | null
          latitude?: number | null
          longitude?: number | null
          opening_hours?: Json | null
          profile_image_url?: string | null
          shop_name?: string | null
          total_reviews?: number | null
          updated_at?: string | null
          user_id?: string | null
          videos?: string[] | null
        }
        Update: {
          avg_rating?: number | null
          business_type?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          gallery_images?: string[] | null
          id?: string | null
          is_active?: boolean | null
          is_verified?: boolean | null
          latitude?: number | null
          longitude?: number | null
          opening_hours?: Json | null
          profile_image_url?: string | null
          shop_name?: string | null
          total_reviews?: number | null
          updated_at?: string | null
          user_id?: string | null
          videos?: string[] | null
        }
        Relationships: []
      }
      barber_profiles_safe: {
        Row: {
          address: string | null
          avg_rating: number | null
          business_type: string | null
          city: string | null
          country: string | null
          created_at: string | null
          description: string | null
          gallery_images: string[] | null
          id: string | null
          is_active: boolean | null
          is_verified: boolean | null
          latitude: number | null
          longitude: number | null
          opening_hours: Json | null
          phone: string | null
          postal_code: string | null
          profile_image_url: string | null
          shop_name: string | null
          total_reviews: number | null
          updated_at: string | null
          user_id: string | null
          videos: string[] | null
        }
        Insert: {
          address?: string | null
          avg_rating?: number | null
          business_type?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          gallery_images?: string[] | null
          id?: string | null
          is_active?: boolean | null
          is_verified?: boolean | null
          latitude?: number | null
          longitude?: number | null
          opening_hours?: Json | null
          phone?: string | null
          postal_code?: string | null
          profile_image_url?: string | null
          shop_name?: string | null
          total_reviews?: number | null
          updated_at?: string | null
          user_id?: string | null
          videos?: string[] | null
        }
        Update: {
          address?: string | null
          avg_rating?: number | null
          business_type?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          gallery_images?: string[] | null
          id?: string | null
          is_active?: boolean | null
          is_verified?: boolean | null
          latitude?: number | null
          longitude?: number | null
          opening_hours?: Json | null
          phone?: string | null
          postal_code?: string | null
          profile_image_url?: string | null
          shop_name?: string | null
          total_reviews?: number | null
          updated_at?: string | null
          user_id?: string | null
          videos?: string[] | null
        }
        Relationships: []
      }
      profiles_public: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string | null
          preferred_language: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          preferred_language?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          preferred_language?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      current_user_has_role: {
        Args: { _role: Database["public"]["Enums"]["app_role"] }
        Returns: boolean
      }
      current_user_is_founder: { Args: never; Returns: boolean }
      generate_referral_code: { Args: never; Returns: string }
      generate_voucher_code: { Args: never; Returns: string }
      get_barber_contact_for_booking: {
        Args: { p_barber_id: string }
        Returns: {
          address: string
          city: string
          country: string
          phone: string
          postal_code: string
        }[]
      }
      get_barber_profile_public: {
        Args: { p_barber_id: string }
        Returns: {
          address: string
          avg_rating: number
          business_type: string
          city: string
          country: string
          created_at: string
          description: string
          gallery_images: string[]
          id: string
          is_active: boolean
          is_verified: boolean
          latitude: number
          longitude: number
          opening_hours: Json
          phone: string
          postal_code: string
          profile_image_url: string
          shop_name: string
          total_reviews: number
          updated_at: string
          user_id: string
          videos: string[]
        }[]
      }
      get_or_create_referral_code: { Args: never; Returns: string }
      get_public_barber_profile: {
        Args: { p_barber_id: string }
        Returns: {
          address: string
          avg_rating: number
          business_type: string
          city: string
          country: string
          created_at: string
          description: string
          gallery_images: string[]
          id: string
          is_active: boolean
          is_verified: boolean
          latitude: number
          longitude: number
          opening_hours: Json
          postal_code: string
          profile_image_url: string
          shop_name: string
          total_reviews: number
          updated_at: string
          user_id: string
          videos: string[]
        }[]
      }
      get_public_barber_profiles: {
        Args: never
        Returns: {
          address: string
          avg_rating: number
          business_type: string
          city: string
          country: string
          created_at: string
          description: string
          gallery_images: string[]
          id: string
          is_active: boolean
          is_verified: boolean
          latitude: number
          longitude: number
          opening_hours: Json
          postal_code: string
          profile_image_url: string
          shop_name: string
          total_reviews: number
          updated_at: string
          user_id: string
          videos: string[]
        }[]
      }
      get_public_stats: {
        Args: never
        Returns: {
          avg_rating: number
          barber_count: number
          user_count: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_founder: { Args: { _user_id: string }; Returns: boolean }
      is_super_founder: { Args: { _user_id: string }; Returns: boolean }
      list_public_barber_profiles: {
        Args: never
        Returns: {
          address: string
          avg_rating: number
          business_type: string
          city: string
          country: string
          created_at: string
          description: string
          gallery_images: string[]
          id: string
          is_active: boolean
          is_verified: boolean
          latitude: number
          longitude: number
          opening_hours: Json
          phone: string
          postal_code: string
          profile_image_url: string
          shop_name: string
          total_reviews: number
          updated_at: string
          user_id: string
          videos: string[]
        }[]
      }
      log_admin_activity: {
        Args: {
          p_action_type: string
          p_details?: Json
          p_target_barber_id?: string
          p_target_user_id?: string
        }
        Returns: undefined
      }
      manage_admin_role: {
        Args: { action: string; target_user_id: string }
        Returns: boolean
      }
      process_referral_signup: {
        Args: { p_referral_code: string }
        Returns: Json
      }
      redeem_loyalty_reward: { Args: { p_reward_id: string }; Returns: Json }
      request_barber_role: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "customer" | "barber" | "admin" | "founder"
      booking_status:
        | "pending"
        | "confirmed"
        | "completed"
        | "cancelled"
        | "no_show"
      payment_method:
        | "debit_card"
        | "credit_card"
        | "twint"
        | "paypal"
        | "klarna"
      payment_status:
        | "initiated"
        | "pending"
        | "paid"
        | "failed"
        | "refunded"
        | "partially_refunded"
      payout_status: "pending" | "processing" | "completed" | "failed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["customer", "barber", "admin", "founder"],
      booking_status: [
        "pending",
        "confirmed",
        "completed",
        "cancelled",
        "no_show",
      ],
      payment_method: [
        "debit_card",
        "credit_card",
        "twint",
        "paypal",
        "klarna",
      ],
      payment_status: [
        "initiated",
        "pending",
        "paid",
        "failed",
        "refunded",
        "partially_refunded",
      ],
      payout_status: ["pending", "processing", "completed", "failed"],
    },
  },
} as const
