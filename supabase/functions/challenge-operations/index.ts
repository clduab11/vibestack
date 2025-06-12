import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface ChallengeOperationRequest {
  operation: 'create' | 'join' | 'leave' | 'update' | 'complete_day'
  challengeData?: {
    name: string
    description: string
    type: 'streak' | 'target' | 'collaborative'
    duration_days: number
    start_date: string
    end_date: string
    rules?: any
    rewards?: any
    max_participants?: number
    is_public?: boolean
    image_url?: string
    category?: string
  }
  challengeId?: string
  updateData?: Partial<ChallengeOperationRequest['challengeData']>
  dayCompleted?: boolean
  progressData?: any
}

interface ChallengeOperationResponse {
  success: boolean
  data?: {
    challenge?: any
    participation?: any
    message?: string
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
    const { 
      operation, 
      challengeData, 
      challengeId, 
      updateData, 
      dayCompleted,
      progressData 
    }: ChallengeOperationRequest = await req.json()

    let response: ChallengeOperationResponse

    switch (operation) {
      case 'create':
        response = await createChallenge(supabaseClient, user.id, challengeData!)
        break
      
      case 'join':
        if (!challengeId) {
          return new Response(
            JSON.stringify({ success: false, error: 'challengeId is required for join operation' }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400 
            }
          )
        }
        response = await joinChallenge(supabaseClient, user.id, challengeId)
        break
      
      case 'leave':
        if (!challengeId) {
          return new Response(
            JSON.stringify({ success: false, error: 'challengeId is required for leave operation' }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400 
            }
          )
        }
        response = await leaveChallenge(supabaseClient, user.id, challengeId)
        break
      
      case 'update':
        if (!challengeId || !updateData) {
          return new Response(
            JSON.stringify({ success: false, error: 'challengeId and updateData are required for update operation' }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400 
            }
          )
        }
        response = await updateChallenge(supabaseClient, user.id, challengeId, updateData)
        break
      
      case 'complete_day':
        if (!challengeId || dayCompleted === undefined) {
          return new Response(
            JSON.stringify({ success: false, error: 'challengeId and dayCompleted are required for complete_day operation' }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400 
            }
          )
        }
        response = await completeChallengeDay(supabaseClient, user.id, challengeId, dayCompleted, progressData)
        break
      
      default:
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid operation' }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400 
          }
        )
    }

    return new Response(
      JSON.stringify(response),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: response.success ? 200 : 400 
      }
    )
  } catch (error) {
    console.error('Error in challenge operations:', error)
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

async function createChallenge(
  supabaseClient: any,
  userId: string,
  challengeData: ChallengeOperationRequest['challengeData']
): Promise<ChallengeOperationResponse> {
  // Validate required fields
  if (!challengeData?.name || !challengeData?.description || !challengeData?.type || 
      !challengeData?.duration_days || !challengeData?.start_date || !challengeData?.end_date) {
    return {
      success: false,
      error: 'Missing required challenge data fields'
    }
  }

  // Create the challenge
  const { data: challenge, error: createError } = await supabaseClient
    .from('challenges')
    .insert({
      ...challengeData,
      created_by: userId,
      participant_count: 0,
      is_active: true,
      created_at: new Date().toISOString()
    })
    .select()
    .single()

  if (createError) {
    return {
      success: false,
      error: createError.message
    }
  }

  // Creator automatically joins the challenge
  const { data: participation, error: joinError } = await supabaseClient
    .from('challenge_participants')
    .insert({
      challenge_id: challenge.id,
      user_id: userId,
      joined_at: new Date().toISOString(),
      is_active: true,
      current_streak: 0,
      longest_streak: 0,
      days_completed: 0,
      last_completed_date: null
    })
    .select()
    .single()

  if (joinError) {
    // Rollback challenge creation if join fails
    await supabaseClient
      .from('challenges')
      .delete()
      .eq('id', challenge.id)
    
    return {
      success: false,
      error: 'Failed to join created challenge'
    }
  }

  // Update participant count
  await supabaseClient
    .from('challenges')
    .update({ 
      participant_count: 1,
      updated_at: new Date().toISOString()
    })
    .eq('id', challenge.id)

  return {
    success: true,
    data: {
      challenge,
      participation,
      message: 'Challenge created successfully'
    }
  }
}

async function joinChallenge(
  supabaseClient: any,
  userId: string,
  challengeId: string
): Promise<ChallengeOperationResponse> {
  // Check if challenge exists and is active
  const { data: challenge, error: challengeError } = await supabaseClient
    .from('challenges')
    .select('*')
    .eq('id', challengeId)
    .eq('is_active', true)
    .single()

  if (challengeError || !challenge) {
    return {
      success: false,
      error: 'Challenge not found or inactive'
    }
  }

  // Check if challenge has started
  if (new Date(challenge.start_date) > new Date()) {
    return {
      success: false,
      error: 'Challenge has not started yet'
    }
  }

  // Check if challenge has ended
  if (new Date(challenge.end_date) < new Date()) {
    return {
      success: false,
      error: 'Challenge has already ended'
    }
  }

  // Check if user is already participating
  const { data: existingParticipation } = await supabaseClient
    .from('challenge_participants')
    .select('*')
    .eq('challenge_id', challengeId)
    .eq('user_id', userId)
    .single()

  if (existingParticipation) {
    if (existingParticipation.is_active) {
      return {
        success: false,
        error: 'Already participating in this challenge'
      }
    } else {
      // Reactivate participation
      const { data: participation, error: updateError } = await supabaseClient
        .from('challenge_participants')
        .update({
          is_active: true,
          joined_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', existingParticipation.id)
        .select()
        .single()

      if (updateError) {
        return {
          success: false,
          error: updateError.message
        }
      }

      // Update participant count
      await updateParticipantCount(supabaseClient, challengeId)

      return {
        success: true,
        data: {
          challenge,
          participation,
          message: 'Rejoined challenge successfully'
        }
      }
    }
  }

  // Check max participants
  if (challenge.max_participants && challenge.participant_count >= challenge.max_participants) {
    return {
      success: false,
      error: 'Challenge is full'
    }
  }

  // Join the challenge
  const { data: participation, error: joinError } = await supabaseClient
    .from('challenge_participants')
    .insert({
      challenge_id: challengeId,
      user_id: userId,
      joined_at: new Date().toISOString(),
      is_active: true,
      current_streak: 0,
      longest_streak: 0,
      days_completed: 0,
      last_completed_date: null
    })
    .select()
    .single()

  if (joinError) {
    return {
      success: false,
      error: joinError.message
    }
  }

  // Update participant count
  await updateParticipantCount(supabaseClient, challengeId)

  // Send notification to challenge creator
  await sendChallengeNotification(
    supabaseClient,
    challenge.created_by,
    userId,
    challengeId,
    'user_joined_challenge'
  )

  return {
    success: true,
    data: {
      challenge,
      participation,
      message: 'Joined challenge successfully'
    }
  }
}

async function leaveChallenge(
  supabaseClient: any,
  userId: string,
  challengeId: string
): Promise<ChallengeOperationResponse> {
  // Check if user is participating
  const { data: participation, error: participationError } = await supabaseClient
    .from('challenge_participants')
    .select('*')
    .eq('challenge_id', challengeId)
    .eq('user_id', userId)
    .eq('is_active', true)
    .single()

  if (participationError || !participation) {
    return {
      success: false,
      error: 'Not participating in this challenge'
    }
  }

  // Mark participation as inactive
  const { error: updateError } = await supabaseClient
    .from('challenge_participants')
    .update({
      is_active: false,
      left_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', participation.id)

  if (updateError) {
    return {
      success: false,
      error: updateError.message
    }
  }

  // Update participant count
  await updateParticipantCount(supabaseClient, challengeId)

  return {
    success: true,
    data: {
      message: 'Left challenge successfully'
    }
  }
}

async function updateChallenge(
  supabaseClient: any,
  userId: string,
  challengeId: string,
  updateData: Partial<ChallengeOperationRequest['challengeData']>
): Promise<ChallengeOperationResponse> {
  // Check if user is the creator
  const { data: challenge, error: challengeError } = await supabaseClient
    .from('challenges')
    .select('*')
    .eq('id', challengeId)
    .eq('created_by', userId)
    .single()

  if (challengeError || !challenge) {
    return {
      success: false,
      error: 'Challenge not found or you are not the creator'
    }
  }

  // Don't allow updating certain fields after challenge starts
  if (new Date(challenge.start_date) <= new Date()) {
    const restrictedFields = ['type', 'duration_days', 'start_date', 'end_date']
    const hasRestrictedFields = restrictedFields.some(field => field in updateData)
    
    if (hasRestrictedFields) {
      return {
        success: false,
        error: 'Cannot update type, duration, or dates after challenge has started'
      }
    }
  }

  // Update the challenge
  const { data: updatedChallenge, error: updateError } = await supabaseClient
    .from('challenges')
    .update({
      ...updateData,
      updated_at: new Date().toISOString()
    })
    .eq('id', challengeId)
    .select()
    .single()

  if (updateError) {
    return {
      success: false,
      error: updateError.message
    }
  }

  return {
    success: true,
    data: {
      challenge: updatedChallenge,
      message: 'Challenge updated successfully'
    }
  }
}

async function completeChallengeDay(
  supabaseClient: any,
  userId: string,
  challengeId: string,
  completed: boolean,
  progressData?: any
): Promise<ChallengeOperationResponse> {
  // Check if user is participating
  const { data: participation, error: participationError } = await supabaseClient
    .from('challenge_participants')
    .select('*')
    .eq('challenge_id', challengeId)
    .eq('user_id', userId)
    .eq('is_active', true)
    .single()

  if (participationError || !participation) {
    return {
      success: false,
      error: 'Not participating in this challenge'
    }
  }

  // Get challenge details
  const { data: challenge, error: challengeError } = await supabaseClient
    .from('challenges')
    .select('*')
    .eq('id', challengeId)
    .single()

  if (challengeError || !challenge) {
    return {
      success: false,
      error: 'Challenge not found'
    }
  }

  // Check if already completed today
  const today = new Date().toISOString().split('T')[0]
  const { data: existingProgress } = await supabaseClient
    .from('challenge_progress')
    .select('*')
    .eq('challenge_id', challengeId)
    .eq('user_id', userId)
    .gte('completed_at', `${today}T00:00:00`)
    .lte('completed_at', `${today}T23:59:59`)
    .single()

  if (existingProgress) {
    // Update existing progress
    const { error: updateError } = await supabaseClient
      .from('challenge_progress')
      .update({
        completed,
        progress_data: progressData,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingProgress.id)

    if (updateError) {
      return {
        success: false,
        error: updateError.message
      }
    }
  } else {
    // Create new progress entry
    const { error: createError } = await supabaseClient
      .from('challenge_progress')
      .insert({
        challenge_id: challengeId,
        user_id: userId,
        completed,
        progress_data: progressData,
        completed_at: new Date().toISOString()
      })

    if (createError) {
      return {
        success: false,
        error: createError.message
      }
    }
  }

  // Update participant stats
  if (completed) {
    const currentStreak = await calculateChallengeStreak(supabaseClient, challengeId, userId)
    const longestStreak = Math.max(participation.longest_streak, currentStreak)
    const daysCompleted = participation.days_completed + (existingProgress ? 0 : 1)

    const { error: updateStatsError } = await supabaseClient
      .from('challenge_participants')
      .update({
        current_streak: currentStreak,
        longest_streak: longestStreak,
        days_completed: daysCompleted,
        last_completed_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', participation.id)

    if (updateStatsError) {
      return {
        success: false,
        error: updateStatsError.message
      }
    }

    // Award points
    const points = challenge.points_per_day || 10
    await awardChallengePoints(supabaseClient, userId, points, 'challenge_day_complete', challengeId)

    // Check for milestones
    await checkChallengeMilestones(supabaseClient, userId, challengeId, daysCompleted, currentStreak)
  }

  return {
    success: true,
    data: {
      message: completed ? 'Challenge day completed!' : 'Progress updated'
    }
  }
}

async function updateParticipantCount(supabaseClient: any, challengeId: string): Promise<void> {
  const { count } = await supabaseClient
    .from('challenge_participants')
    .select('*', { count: 'exact', head: true })
    .eq('challenge_id', challengeId)
    .eq('is_active', true)

  await supabaseClient
    .from('challenges')
    .update({ 
      participant_count: count || 0,
      updated_at: new Date().toISOString()
    })
    .eq('id', challengeId)
}

async function calculateChallengeStreak(
  supabaseClient: any, 
  challengeId: string, 
  userId: string
): Promise<number> {
  const { data: progress } = await supabaseClient
    .from('challenge_progress')
    .select('completed_at, completed')
    .eq('challenge_id', challengeId)
    .eq('user_id', userId)
    .eq('completed', true)
    .order('completed_at', { ascending: false })

  if (!progress || progress.length === 0) return 0

  let streak = 0
  let currentDate = new Date()
  currentDate.setHours(0, 0, 0, 0)

  for (const record of progress) {
    const recordDate = new Date(record.completed_at)
    recordDate.setHours(0, 0, 0, 0)

    const dayDiff = Math.floor((currentDate.getTime() - recordDate.getTime()) / (1000 * 60 * 60 * 24))

    if (dayDiff === streak) {
      streak++
    } else if (dayDiff > streak) {
      break
    }
  }

  return streak
}

async function awardChallengePoints(
  supabaseClient: any,
  userId: string,
  points: number,
  reason: string,
  challengeId: string
): Promise<void> {
  await supabaseClient
    .from('user_points')
    .insert({
      user_id: userId,
      points,
      reason,
      reference_id: challengeId,
      earned_at: new Date().toISOString()
    })

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

async function checkChallengeMilestones(
  supabaseClient: any,
  userId: string,
  challengeId: string,
  daysCompleted: number,
  currentStreak: number
): Promise<void> {
  const milestones = [
    { days: 7, achievement: 'week_warrior', points: 50 },
    { days: 30, achievement: 'monthly_master', points: 200 },
    { days: 100, achievement: 'century_champion', points: 1000 }
  ]

  for (const milestone of milestones) {
    if (daysCompleted === milestone.days) {
      // Award achievement
      await supabaseClient
        .from('user_achievements')
        .insert({
          user_id: userId,
          achievement_id: milestone.achievement,
          unlocked_at: new Date().toISOString(),
          progress: 100,
          metadata: { challenge_id: challengeId }
        })

      // Award bonus points
      await awardChallengePoints(
        supabaseClient, 
        userId, 
        milestone.points, 
        `challenge_milestone_${milestone.days}_days`, 
        challengeId
      )
    }
  }

  // Streak milestones
  const streakMilestones = [
    { streak: 7, points: 25 },
    { streak: 14, points: 50 },
    { streak: 30, points: 100 }
  ]

  for (const milestone of streakMilestones) {
    if (currentStreak === milestone.streak) {
      await awardChallengePoints(
        supabaseClient, 
        userId, 
        milestone.points, 
        `challenge_streak_${milestone.streak}_days`, 
        challengeId
      )
    }
  }
}

async function sendChallengeNotification(
  supabaseClient: any,
  recipientId: string,
  senderId: string,
  challengeId: string,
  type: string
): Promise<void> {
  await supabaseClient
    .from('notifications')
    .insert({
      user_id: recipientId,
      type,
      title: 'New participant in your challenge',
      message: 'Someone just joined your challenge!',
      data: {
        challenge_id: challengeId,
        sender_id: senderId
      },
      is_read: false,
      created_at: new Date().toISOString()
    })
}