import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface HabitCheckInRequest {
  habitId: string
  userId: string
  completed: boolean
  notes?: string
  mood?: number
  energy?: number
}

interface HabitCheckInResponse {
  success: boolean
  checkIn?: {
    id: string
    habitId: string
    userId: string
    completed: boolean
    streak: number
    longestStreak: number
    checkInDate: string
    notes?: string
    mood?: number
    energy?: number
  }
  error?: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Verify user authentication
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 
        }
      )
    }

    // Parse request body
    const { habitId, completed, notes, mood, energy }: HabitCheckInRequest = await req.json()

    // Validate required fields
    if (!habitId) {
      return new Response(
        JSON.stringify({ success: false, error: 'habitId is required' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    // Get the habit to verify ownership
    const { data: habit, error: habitError } = await supabaseClient
      .from('habits')
      .select('*')
      .eq('id', habitId)
      .eq('user_id', user.id)
      .single()

    if (habitError || !habit) {
      return new Response(
        JSON.stringify({ success: false, error: 'Habit not found' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404 
        }
      )
    }

    // Check if there's already a check-in for today
    const today = new Date().toISOString().split('T')[0]
    const { data: existingCheckIn } = await supabaseClient
      .from('habit_check_ins')
      .select('*')
      .eq('habit_id', habitId)
      .eq('user_id', user.id)
      .gte('check_in_date', `${today}T00:00:00`)
      .lte('check_in_date', `${today}T23:59:59`)
      .single()

    if (existingCheckIn) {
      // Update existing check-in
      const { data: updatedCheckIn, error: updateError } = await supabaseClient
        .from('habit_check_ins')
        .update({
          completed,
          notes,
          mood,
          energy,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingCheckIn.id)
        .select()
        .single()

      if (updateError) {
        throw updateError
      }

      // Calculate streak
      const streak = await calculateStreak(supabaseClient, habitId, user.id)
      const longestStreak = await calculateLongestStreak(supabaseClient, habitId, user.id)

      return new Response(
        JSON.stringify({
          success: true,
          checkIn: {
            ...updatedCheckIn,
            streak,
            longestStreak
          }
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    } else {
      // Create new check-in
      const { data: newCheckIn, error: createError } = await supabaseClient
        .from('habit_check_ins')
        .insert({
          habit_id: habitId,
          user_id: user.id,
          completed,
          notes,
          mood,
          energy,
          check_in_date: new Date().toISOString()
        })
        .select()
        .single()

      if (createError) {
        throw createError
      }

      // Calculate streak
      const streak = await calculateStreak(supabaseClient, habitId, user.id)
      const longestStreak = await calculateLongestStreak(supabaseClient, habitId, user.id)

      // Update habit statistics
      await updateHabitStats(supabaseClient, habitId, user.id, streak, longestStreak)

      // Award points for completing habit
      if (completed) {
        await awardPoints(supabaseClient, user.id, habit.points_per_completion || 10, 'habit_completion', habitId)
      }

      return new Response(
        JSON.stringify({
          success: true,
          checkIn: {
            ...newCheckIn,
            streak,
            longestStreak
          }
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 201 
        }
      )
    }
  } catch (error) {
    console.error('Error in habit check-in:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

async function calculateStreak(supabaseClient: any, habitId: string, userId: string): Promise<number> {
  const { data: checkIns } = await supabaseClient
    .from('habit_check_ins')
    .select('check_in_date, completed')
    .eq('habit_id', habitId)
    .eq('user_id', userId)
    .eq('completed', true)
    .order('check_in_date', { ascending: false })

  if (!checkIns || checkIns.length === 0) return 0

  let streak = 0
  let currentDate = new Date()
  currentDate.setHours(0, 0, 0, 0)

  for (const checkIn of checkIns) {
    const checkInDate = new Date(checkIn.check_in_date)
    checkInDate.setHours(0, 0, 0, 0)

    const dayDiff = Math.floor((currentDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))

    if (dayDiff === streak) {
      streak++
    } else if (dayDiff > streak) {
      break
    }
  }

  return streak
}

async function calculateLongestStreak(supabaseClient: any, habitId: string, userId: string): Promise<number> {
  const { data: checkIns } = await supabaseClient
    .from('habit_check_ins')
    .select('check_in_date, completed')
    .eq('habit_id', habitId)
    .eq('user_id', userId)
    .eq('completed', true)
    .order('check_in_date', { ascending: true })

  if (!checkIns || checkIns.length === 0) return 0

  let longestStreak = 1
  let currentStreak = 1
  
  for (let i = 1; i < checkIns.length; i++) {
    const prevDate = new Date(checkIns[i - 1].check_in_date)
    const currDate = new Date(checkIns[i].check_in_date)
    
    prevDate.setHours(0, 0, 0, 0)
    currDate.setHours(0, 0, 0, 0)
    
    const dayDiff = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24))
    
    if (dayDiff === 1) {
      currentStreak++
      longestStreak = Math.max(longestStreak, currentStreak)
    } else {
      currentStreak = 1
    }
  }

  return longestStreak
}

async function updateHabitStats(
  supabaseClient: any, 
  habitId: string, 
  userId: string, 
  currentStreak: number, 
  longestStreak: number
): Promise<void> {
  const { data: stats } = await supabaseClient
    .from('habit_statistics')
    .select('*')
    .eq('habit_id', habitId)
    .eq('user_id', userId)
    .single()

  if (stats) {
    await supabaseClient
      .from('habit_statistics')
      .update({
        current_streak: currentStreak,
        longest_streak: Math.max(stats.longest_streak, longestStreak),
        total_completions: stats.total_completions + 1,
        last_completed: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', stats.id)
  } else {
    await supabaseClient
      .from('habit_statistics')
      .insert({
        habit_id: habitId,
        user_id: userId,
        current_streak: currentStreak,
        longest_streak: longestStreak,
        total_completions: 1,
        last_completed: new Date().toISOString()
      })
  }
}

async function awardPoints(
  supabaseClient: any,
  userId: string,
  points: number,
  reason: string,
  referenceId?: string
): Promise<void> {
  // Award points
  await supabaseClient
    .from('user_points')
    .insert({
      user_id: userId,
      points,
      reason,
      reference_id: referenceId,
      earned_at: new Date().toISOString()
    })

  // Update user's total points
  const { data: profile } = await supabaseClient
    .from('user_profiles')
    .select('total_points')
    .eq('user_id', userId)
    .single()

  if (profile) {
    await supabaseClient
      .from('user_profiles')
      .update({
        total_points: (profile.total_points || 0) + points,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
  }
}