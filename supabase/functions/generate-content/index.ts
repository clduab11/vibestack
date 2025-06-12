import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface ContentGenerationRequest {
  achievementId?: string
  habitId?: string
  challengeId?: string
  contentType: 'twitter' | 'instagram' | 'facebook' | 'linkedin'
  tone?: 'motivational' | 'celebratory' | 'reflective' | 'challenging'
  includeStats?: boolean
}

interface GeneratedContent {
  success: boolean
  content?: {
    text: string
    hashtags: string[]
    mediaUrl?: string
    platform: string
    tone: string
    stats?: {
      streak?: number
      totalPoints?: number
      rank?: string
      completionRate?: number
    }
  }
  error?: string
}

const CONTENT_TEMPLATES = {
  achievement: {
    motivational: [
      "Just unlocked {achievement}! 🎯 Every step counts on this journey. {stats}",
      "New milestone reached: {achievement}! 💪 Progress over perfection. {stats}",
      "Achievement unlocked: {achievement}! 🌟 Keep pushing forward. {stats}"
    ],
    celebratory: [
      "🎉 HUGE WIN! Just earned {achievement}! {stats} Let's gooo!",
      "🏆 Achievement unlocked: {achievement}! {stats} Feeling unstoppable!",
      "✨ YES! {achievement} is mine! {stats} Who's celebrating with me?"
    ],
    reflective: [
      "Earned {achievement} today. {stats} It's not about being perfect, it's about being consistent.",
      "New achievement: {achievement}. {stats} Every small win adds up to something bigger.",
      "{achievement} unlocked. {stats} Grateful for the journey and the growth."
    ]
  },
  habit: {
    motivational: [
      "Day {streak} of {habit}! 🔥 Building habits, building character. {stats}",
      "{streak} days strong with {habit}! 💪 One day at a time. {stats}",
      "Consistency is key! {streak} days of {habit} and counting. {stats}"
    ],
    celebratory: [
      "🎊 {streak} DAY STREAK on {habit}! {stats} Nothing can stop me now!",
      "🔥 ON FIRE! {streak} days of {habit}! {stats} Let's keep this momentum!",
      "💯 {streak} days of crushing {habit}! {stats} Who else is on a streak?"
    ],
    reflective: [
      "{streak} days of {habit}. {stats} Small actions, big changes over time.",
      "Reflecting on {streak} days of {habit}. {stats} Progress feels good.",
      "{habit} streak: {streak} days. {stats} Proud of the commitment."
    ]
  },
  challenge: {
    motivational: [
      "Taking on the {challenge} challenge! 🎯 {participants} warriors strong. {stats}",
      "Day {day} of {challenge}! 💪 Together we're stronger. {stats}",
      "Pushing limits with {challenge}! 🚀 {participants} people on this journey. {stats}"
    ],
    celebratory: [
      "🏆 CRUSHED the {challenge} challenge! {stats} We did it together!",
      "✅ {challenge} COMPLETE! {stats} Shoutout to all {participants} participants!",
      "🎉 Challenge conquered: {challenge}! {stats} What an incredible journey!"
    ],
    challenging: [
      "Who's ready for {challenge}? 🔥 {participants} already in. Don't miss out! {stats}",
      "Challenge accepted: {challenge}! 💪 Can you keep up? {stats}",
      "Calling all warriors! {challenge} starts now. {participants} brave souls already in. You next? {stats}"
    ]
  }
}

const PLATFORM_HASHTAGS = {
  twitter: ['#personalgrowth', '#motivation', '#dailyhabits', '#mindset', '#growth'],
  instagram: ['#personaldevelopment', '#selfimprovement', '#motivationalquotes', '#habittracker', '#growthmindset', '#dailymotivation'],
  facebook: ['#motivation', '#personalgrowth', '#habits', '#mindfulness'],
  linkedin: ['#personaldevelopment', '#professionalgrowth', '#habits', '#leadership', '#mindset']
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
      achievementId, 
      habitId, 
      challengeId, 
      contentType, 
      tone = 'motivational',
      includeStats = true 
    }: ContentGenerationRequest = await req.json()

    // Validate required fields
    if (!contentType) {
      return new Response(
        JSON.stringify({ success: false, error: 'contentType is required' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    let content: GeneratedContent['content']

    if (achievementId) {
      content = await generateAchievementContent(
        supabaseClient, 
        user.id, 
        achievementId, 
        contentType, 
        tone, 
        includeStats
      )
    } else if (habitId) {
      content = await generateHabitContent(
        supabaseClient, 
        user.id, 
        habitId, 
        contentType, 
        tone, 
        includeStats
      )
    } else if (challengeId) {
      content = await generateChallengeContent(
        supabaseClient, 
        user.id, 
        challengeId, 
        contentType, 
        tone, 
        includeStats
      )
    } else {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'One of achievementId, habitId, or challengeId is required' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    // Log content generation
    await supabaseClient
      .from('content_generations')
      .insert({
        user_id: user.id,
        content_type: contentType,
        achievement_id: achievementId,
        habit_id: habitId,
        challenge_id: challengeId,
        generated_text: content.text,
        hashtags: content.hashtags,
        platform: content.platform,
        tone: content.tone,
        created_at: new Date().toISOString()
      })

    return new Response(
      JSON.stringify({ success: true, content }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('Error generating content:', error)
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

async function generateAchievementContent(
  supabaseClient: any,
  userId: string,
  achievementId: string,
  platform: string,
  tone: string,
  includeStats: boolean
): Promise<GeneratedContent['content']> {
  // Get achievement details
  const { data: achievement, error } = await supabaseClient
    .from('user_achievements')
    .select(`
      *,
      achievements (
        name,
        description,
        icon_url
      )
    `)
    .eq('id', achievementId)
    .eq('user_id', userId)
    .single()

  if (error || !achievement) {
    throw new Error('Achievement not found')
  }

  // Get user stats if requested
  let stats = {}
  if (includeStats) {
    const { data: profile } = await supabaseClient
      .from('user_profiles')
      .select('total_points, level, rank')
      .eq('user_id', userId)
      .single()

    if (profile) {
      stats = {
        totalPoints: profile.total_points,
        rank: profile.rank
      }
    }
  }

  // Generate content
  const templates = CONTENT_TEMPLATES.achievement[tone as keyof typeof CONTENT_TEMPLATES.achievement] || CONTENT_TEMPLATES.achievement.motivational
  const template = templates[Math.floor(Math.random() * templates.length)]
  
  let text = template
    .replace('{achievement}', achievement.achievements.name)
    .replace('{stats}', includeStats ? formatStats(stats) : '')
    .trim()

  const hashtags = [
    ...PLATFORM_HASHTAGS[platform as keyof typeof PLATFORM_HASHTAGS],
    '#achievement',
    '#vibestack'
  ]

  return {
    text,
    hashtags,
    mediaUrl: achievement.achievements.icon_url,
    platform,
    tone,
    stats: includeStats ? stats : undefined
  }
}

async function generateHabitContent(
  supabaseClient: any,
  userId: string,
  habitId: string,
  platform: string,
  tone: string,
  includeStats: boolean
): Promise<GeneratedContent['content']> {
  // Get habit details and statistics
  const { data: habit, error } = await supabaseClient
    .from('habits')
    .select(`
      *,
      habit_statistics (
        current_streak,
        longest_streak,
        total_completions
      )
    `)
    .eq('id', habitId)
    .eq('user_id', userId)
    .single()

  if (error || !habit) {
    throw new Error('Habit not found')
  }

  const currentStreak = habit.habit_statistics?.[0]?.current_streak || 0
  const totalCompletions = habit.habit_statistics?.[0]?.total_completions || 0

  // Get user stats if requested
  let stats = {}
  if (includeStats) {
    const completionRate = totalCompletions > 0 ? 
      Math.round((totalCompletions / (totalCompletions + 10)) * 100) : 0

    stats = {
      streak: currentStreak,
      completionRate
    }
  }

  // Generate content
  const templates = CONTENT_TEMPLATES.habit[tone as keyof typeof CONTENT_TEMPLATES.habit] || CONTENT_TEMPLATES.habit.motivational
  const template = templates[Math.floor(Math.random() * templates.length)]
  
  let text = template
    .replace('{habit}', habit.name)
    .replace('{streak}', currentStreak.toString())
    .replace('{stats}', includeStats ? formatStats(stats) : '')
    .trim()

  const hashtags = [
    ...PLATFORM_HASHTAGS[platform as keyof typeof PLATFORM_HASHTAGS],
    '#habitstreak',
    '#consistency',
    '#vibestack'
  ]

  return {
    text,
    hashtags,
    platform,
    tone,
    stats: includeStats ? stats : undefined
  }
}

async function generateChallengeContent(
  supabaseClient: any,
  userId: string,
  challengeId: string,
  platform: string,
  tone: string,
  includeStats: boolean
): Promise<GeneratedContent['content']> {
  // Get challenge details
  const { data: challenge, error } = await supabaseClient
    .from('challenges')
    .select(`
      *,
      challenge_participants (
        id
      )
    `)
    .eq('id', challengeId)
    .single()

  if (error || !challenge) {
    throw new Error('Challenge not found')
  }

  const participantCount = challenge.challenge_participants?.length || 0
  
  // Check user's participation
  const { data: participation } = await supabaseClient
    .from('challenge_participants')
    .select('*')
    .eq('challenge_id', challengeId)
    .eq('user_id', userId)
    .single()

  const dayNumber = participation ? 
    Math.ceil((new Date().getTime() - new Date(participation.joined_at).getTime()) / (1000 * 60 * 60 * 24)) : 1

  // Get user stats if requested
  let stats = {}
  if (includeStats && participation) {
    stats = {
      streak: participation.current_streak || 0
    }
  }

  // Generate content
  const templates = CONTENT_TEMPLATES.challenge[tone as keyof typeof CONTENT_TEMPLATES.challenge] || CONTENT_TEMPLATES.challenge.motivational
  const template = templates[Math.floor(Math.random() * templates.length)]
  
  let text = template
    .replace('{challenge}', challenge.name)
    .replace('{participants}', participantCount.toString())
    .replace('{day}', dayNumber.toString())
    .replace('{stats}', includeStats ? formatStats(stats) : '')
    .trim()

  const hashtags = [
    ...PLATFORM_HASHTAGS[platform as keyof typeof PLATFORM_HASHTAGS],
    '#challenge',
    '#community',
    '#vibestack'
  ]

  return {
    text,
    hashtags,
    mediaUrl: challenge.image_url,
    platform,
    tone,
    stats: includeStats ? stats : undefined
  }
}

function formatStats(stats: any): string {
  const parts = []
  
  if (stats.streak !== undefined) {
    parts.push(`🔥 ${stats.streak} day streak`)
  }
  if (stats.totalPoints !== undefined) {
    parts.push(`💎 ${stats.totalPoints} points`)
  }
  if (stats.rank !== undefined) {
    parts.push(`🏅 ${stats.rank} rank`)
  }
  if (stats.completionRate !== undefined) {
    parts.push(`📊 ${stats.completionRate}% completion rate`)
  }
  
  return parts.length > 0 ? `[${parts.join(' | ')}]` : ''
}