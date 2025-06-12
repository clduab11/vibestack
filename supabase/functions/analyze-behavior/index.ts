import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface BehaviorAnalysis {
  sleepPattern: number
  activityLevel: number
  screenTime: number
  stressLevel: number
  optimalHabitDifficulty: number
  recommendedCategories: string[]
}

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userId } = await req.json()
    
    if (!userId) {
      throw new Error('User ID is required')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get user's behavioral data from the last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: events, error: eventsError } = await supabase
      .from('behavior_events')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false })

    if (eventsError) throw eventsError

    // Analyze behavioral patterns
    const analysis = analyzeBehaviorPatterns(events || [])

    // Get user's current habits to avoid duplicates
    const { data: currentHabits, error: habitsError } = await supabase
      .from('user_habits')
      .select('habit_id, habits(id, category)')
      .eq('user_id', userId)
      .eq('status', 'active')

    if (habitsError) throw habitsError

    // Determine optimal habit based on analysis
    const habitRecommendation = await selectOptimalHabit(
      analysis,
      currentHabits || [],
      supabase
    )

    // Record the analysis
    const { error: analysisError } = await supabase
      .from('behavior_events')
      .insert({
        user_id: userId,
        event_type: 'behavior_analysis_completed',
        event_data: {
          analysis,
          recommendation: habitRecommendation
        },
        processed: true
      })

    if (analysisError) throw analysisError

    return new Response(
      JSON.stringify({
        success: true,
        analysis,
        recommendation: habitRecommendation
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    console.error('Error in analyze-behavior function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})

function analyzeBehaviorPatterns(events: any[]): BehaviorAnalysis {
  // Initialize counters
  const patterns = {
    morningAppOpens: 0,
    eveningAppOpens: 0,
    totalScreenTime: 0,
    activeHours: new Set<number>(),
    stressIndicators: 0,
    productivityScore: 0
  }

  // Process events
  events.forEach(event => {
    const eventHour = new Date(event.created_at).getHours()
    patterns.activeHours.add(eventHour)

    switch (event.event_type) {
      case 'app_open':
        if (eventHour >= 5 && eventHour < 9) patterns.morningAppOpens++
        if (eventHour >= 21 || eventHour < 1) patterns.eveningAppOpens++
        break
      
      case 'screen_time_report':
        patterns.totalScreenTime += event.event_data.duration || 0
        break
      
      case 'app_usage':
        if (event.event_data.category === 'productivity') {
          patterns.productivityScore += event.event_data.duration || 0
        }
        if (event.event_data.category === 'social_media') {
          patterns.stressIndicators += event.event_data.duration || 0
        }
        break
    }
  })

  // Calculate analysis scores (0-1 scale)
  const sleepPattern = calculateSleepScore(patterns)
  const activityLevel = patterns.activeHours.size / 24
  const screenTime = Math.min(patterns.totalScreenTime / (30 * 8 * 60), 1) // 8 hours/day baseline
  const stressLevel = Math.min(patterns.stressIndicators / (30 * 4 * 60), 1) // 4 hours/day baseline
  
  // Determine optimal habit difficulty based on current state
  const optimalHabitDifficulty = calculateOptimalDifficulty({
    sleepPattern,
    activityLevel,
    screenTime,
    stressLevel
  })

  // Recommend categories based on patterns
  const recommendedCategories = determineCategories({
    sleepPattern,
    activityLevel,
    screenTime,
    stressLevel
  })

  return {
    sleepPattern,
    activityLevel,
    screenTime,
    stressLevel,
    optimalHabitDifficulty,
    recommendedCategories
  }
}

function calculateSleepScore(patterns: any): number {
  // Good sleep indicated by low evening app usage and consistent morning usage
  const eveningScore = 1 - Math.min(patterns.eveningAppOpens / 30, 1)
  const morningConsistency = Math.min(patterns.morningAppOpens / 30, 1)
  return (eveningScore + morningConsistency) / 2
}

function calculateOptimalDifficulty(analysis: any): number {
  // Start with easier habits if stress is high or sleep is poor
  const baseScore = 5
  let difficulty = baseScore

  if (analysis.stressLevel > 0.7) difficulty -= 2
  if (analysis.sleepPattern < 0.3) difficulty -= 1
  if (analysis.activityLevel > 0.8) difficulty += 1
  if (analysis.screenTime > 0.8) difficulty -= 1

  return Math.max(1, Math.min(10, difficulty))
}

function determineCategories(analysis: any): string[] {
  const categories: string[] = []

  if (analysis.sleepPattern < 0.5) categories.push('sleep')
  if (analysis.screenTime > 0.7) categories.push('digital_wellness')
  if (analysis.activityLevel < 0.5) categories.push('exercise')
  if (analysis.stressLevel > 0.6) categories.push('mindfulness')
  
  // Always include at least one category
  if (categories.length === 0) {
    categories.push('productivity')
  }

  return categories
}

async function selectOptimalHabit(
  analysis: BehaviorAnalysis,
  currentHabits: any[],
  supabase: any
) {
  // Get habits that match our criteria
  const { data: availableHabits, error } = await supabase
    .from('habits')
    .select('*')
    .in('category', analysis.recommendedCategories)
    .gte('difficulty', analysis.optimalHabitDifficulty - 2)
    .lte('difficulty', analysis.optimalHabitDifficulty + 2)
    .order('difficulty', { ascending: true })

  if (error) throw error

  // Filter out habits the user already has
  const currentHabitIds = currentHabits.map(h => h.habits?.id).filter(Boolean)
  const newHabits = availableHabits?.filter(h => !currentHabitIds.includes(h.id)) || []

  if (newHabits.length === 0) {
    throw new Error('No suitable habits found for user')
  }

  // Select the best matching habit
  const selectedHabit = newHabits[0]

  return {
    habitId: selectedHabit.id,
    habitName: selectedHabit.name,
    confidence: 0.85,
    reasoning: generateReasoning(analysis, selectedHabit)
  }
}

function generateReasoning(analysis: BehaviorAnalysis, habit: any): string {
  const reasons = []

  if (analysis.sleepPattern < 0.5 && habit.category === 'sleep') {
    reasons.push('Your sleep patterns indicate irregular rest')
  }
  if (analysis.screenTime > 0.7 && habit.category === 'digital_wellness') {
    reasons.push('High screen time suggests need for digital balance')
  }
  if (analysis.stressLevel > 0.6 && habit.category === 'mindfulness') {
    reasons.push('Stress indicators show benefit from mindfulness practices')
  }
  if (analysis.activityLevel < 0.5 && habit.category === 'exercise') {
    reasons.push('Low activity levels indicate need for movement')
  }

  return reasons.join('. ') + '.'
}