import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts'

// Tier-based birthday bonus amounts
function getBirthdayBonus(lifetimePoints: number): number {
  if (lifetimePoints >= 3000) return 500; // Platinum
  if (lifetimePoints >= 1500) return 200; // Gold
  if (lifetimePoints >= 500) return 100;  // Silver
  return 50; // Bronze
}

function getTierName(lifetimePoints: number): string {
  if (lifetimePoints >= 3000) return 'Platinum';
  if (lifetimePoints >= 1500) return 'Gold';
  if (lifetimePoints >= 500) return 'Silver';
  return 'Bronze';
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req)
  }

  try {
    // Get auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('No authorization header provided')
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client with user's auth context
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    // Client for auth validation
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    // Validate JWT and get claims
    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token)
    
    if (claimsError || !claimsData?.claims) {
      console.log('Token validation failed:', claimsError)
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = claimsData.claims.sub as string
    
    // Service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log(`Checking birthday bonus for user: ${userId}`)

    // Get user's profile to check birthday
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('birthday')
      .eq('id', userId)
      .single()

    if (profileError || !profile?.birthday) {
      console.log('No birthday set for user:', profileError || 'No birthday')
      return new Response(
        JSON.stringify({ 
          eligible: false, 
          message: 'No birthday set in profile',
          needsBirthday: true 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if today is user's birthday
    const today = new Date()
    const birthday = new Date(profile.birthday)
    const isBirthday = today.getMonth() === birthday.getMonth() && 
                       today.getDate() === birthday.getDate()

    if (!isBirthday) {
      console.log('Today is not user\'s birthday')
      return new Response(
        JSON.stringify({ 
          eligible: false, 
          message: 'Today is not your birthday' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const currentYear = today.getFullYear()

    // Check if bonus was already awarded this year
    const { data: existingBonus, error: bonusCheckError } = await supabase
      .from('birthday_bonus_log')
      .select('id')
      .eq('user_id', userId)
      .eq('year', currentYear)
      .maybeSingle()

    if (bonusCheckError) {
      console.error('Error checking existing bonus:', bonusCheckError)
    }

    if (existingBonus) {
      console.log('Birthday bonus already claimed this year')
      return new Response(
        JSON.stringify({ 
          eligible: false, 
          message: 'Birthday bonus already claimed this year',
          alreadyClaimed: true
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user's current loyalty points to determine tier
    const { data: loyaltyData } = await supabase
      .from('loyalty_points')
      .select('points, lifetime_points')
      .eq('user_id', userId)
      .maybeSingle()

    const lifetimePoints = loyaltyData?.lifetime_points || 0
    const currentPoints = loyaltyData?.points || 0
    const bonusPoints = getBirthdayBonus(lifetimePoints)
    const tierName = getTierName(lifetimePoints)

    console.log(`Awarding ${bonusPoints} birthday bonus points to ${tierName} member`)

    // Update or insert loyalty points
    if (loyaltyData) {
      const { error: updateError } = await supabase
        .from('loyalty_points')
        .update({ 
          points: currentPoints + bonusPoints,
          lifetime_points: lifetimePoints + bonusPoints,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)

      if (updateError) {
        console.error('Error updating points:', updateError)
        throw updateError
      }
    } else {
      const { error: insertError } = await supabase
        .from('loyalty_points')
        .insert({ 
          user_id: userId,
          points: bonusPoints,
          lifetime_points: bonusPoints
        })

      if (insertError) {
        console.error('Error inserting points:', insertError)
        throw insertError
      }
    }

    // Log the transaction
    const { error: transactionError } = await supabase
      .from('loyalty_transactions')
      .insert({
        user_id: userId,
        points: bonusPoints,
        transaction_type: 'bonus',
        description: `🎂 Birthday bonus (${tierName} tier)`
      })

    if (transactionError) {
      console.error('Error logging transaction:', transactionError)
    }

    // Log the birthday bonus to prevent duplicate claims
    const { error: logError } = await supabase
      .from('birthday_bonus_log')
      .insert({
        user_id: userId,
        year: currentYear,
        points_awarded: bonusPoints
      })

    if (logError) {
      console.error('Error logging birthday bonus:', logError)
    }

    // Create a notification
    await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title: '🎂 Happy Birthday!',
        message: `You've received ${bonusPoints} bonus points as a ${tierName} member! Enjoy your special day!`,
        type: 'bonus'
      })

    console.log(`Successfully awarded ${bonusPoints} birthday bonus points`)

    return new Response(
      JSON.stringify({ 
        success: true,
        eligible: true,
        pointsAwarded: bonusPoints,
        tier: tierName,
        message: `Happy Birthday! You've received ${bonusPoints} bonus points!`
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in check-birthday-bonus:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})