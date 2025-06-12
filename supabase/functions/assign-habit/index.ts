import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface HabitAssignment {
  habitId: string
  habitName: string
  confidence: number
  reasoning: string
}

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userId, analysisId, habitRecommendation } = await req.json()
    
    if (!userId || !habitRecommendation?.habitId) {
      throw new Error('User ID and habit recommendation are required')
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

    // Check if user already has this habit
    const { data: existingAssignment, error: checkError } = await supabase
      .from('user_habits')
      .select('id')
      .eq('user_id', userId)
      .eq('habit_id', habitRecommendation.habitId)
      .single()

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows
      throw checkError
    }

    if (existingAssignment) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'User already has this habit assigned'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      )
    }

    // Deactivate any current active habits if needed (user can only have one active)
    const { error: deactivateError } = await supabase
      .from('user_habits')
      .update({ status: 'paused' })
      .eq('user_id', userId)
      .eq('status', 'active')

    if (deactivateError) throw deactivateError

    // Assign the new habit
    const { data: assignment, error: assignError } = await supabase
      .from('user_habits')
      .insert({
        user_id: userId,
        habit_id: habitRecommendation.habitId,
        ai_confidence: habitRecommendation.confidence,
        assignment_reason: {
          reasoning: habitRecommendation.reasoning,
          analysis_id: analysisId,
          assigned_at: new Date().toISOString()
        },
        status: 'active'
      })
      .select(`
        *,
        habits (
          id,
          name,
          description,
          category,
          difficulty,
          icon,
          color
        )
      `)
      .single()

    if (assignError) throw assignError

    // Create initial avatar message about the new habit
    const { error: messageError } = await supabase
      .from('conversations')
      .insert({
        user_id: userId,
        messages: [{
          role: 'assistant',
          content: generateWelcomeMessage(assignment.habits),
          timestamp: new Date().toISOString(),
          metadata: {
            type: 'habit_assignment',
            habit_id: habitRecommendation.habitId
          }
        }],
        context: {
          event: 'habit_assigned',
          habit_id: habitRecommendation.habitId
        }
      })

    if (messageError) {
      console.error('Failed to create welcome message:', messageError)
      // Don't fail the whole operation if message creation fails
    }

    // Create initial achievement record
    const { error: achievementError } = await supabase
      .from('user_achievements')
      .insert({
        user_id: userId,
        achievement_type: 'first_habit',
        achievement_data: {
          habit_id: habitRecommendation.habitId,
          habit_name: assignment.habits.name
        },
        points: 100
      })

    if (achievementError) {
      console.error('Failed to create achievement:', achievementError)
      // Don't fail the whole operation
    }

    return new Response(
      JSON.stringify({
        success: true,
        assignment: {
          id: assignment.id,
          habit: assignment.habits,
          confidence: assignment.ai_confidence,
          reason: assignment.assignment_reason
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    console.error('Error in assign-habit function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})

function generateWelcomeMessage(habit: any): string {
  const messages = {
    sleep: [
      `I'm excited to help you improve your sleep! 🌙 Your new habit "${habit.name}" is perfectly suited to help you establish better rest patterns. Let's work together to make quality sleep a natural part of your routine.`,
      `Sleep is the foundation of wellbeing, and I'm here to support you with "${habit.name}". Together, we'll build a routine that helps you wake up refreshed and energized every day.`
    ],
    exercise: [
      `Ready to get moving? 💪 Your new habit "${habit.name}" is a great way to boost your energy and overall health. I'll be here to cheer you on every step of the way!`,
      `Let's make movement a joyful part of your day! "${habit.name}" is designed to fit perfectly into your lifestyle. I'm here to keep you motivated and celebrate every achievement.`
    ],
    mindfulness: [
      `Welcome to your mindfulness journey! 🧘 "${habit.name}" will help you find moments of calm in your busy day. I'm here to guide you toward greater peace and clarity.`,
      `I'm honored to support your mindfulness practice with "${habit.name}". Together, we'll cultivate awareness and inner peace, one day at a time.`
    ],
    digital_wellness: [
      `Let's create a healthier relationship with technology! 📱 "${habit.name}" will help you find the perfect balance. I'm here to support you in reclaiming your time and attention.`,
      `Time to take control of your digital life! With "${habit.name}", we'll work together to ensure technology serves you, not the other way around.`
    ],
    productivity: [
      `Ready to unlock your potential? 🚀 "${habit.name}" is designed to help you achieve more while feeling less stressed. I'm excited to be part of your productivity journey!`,
      `Let's make every day count! "${habit.name}" will help you focus on what truly matters. I'm here to help you work smarter, not harder.`
    ],
    nutrition: [
      `Nourishing your body is an act of self-love! 🥗 "${habit.name}" will help you build a positive relationship with food. I'm here to support your journey to better health.`,
      `Let's fuel your body for success! With "${habit.name}", we'll create sustainable eating habits that make you feel amazing. I'm excited to be your nutrition companion!`
    ]
  }

  const categoryMessages = messages[habit.category] || [
    `I'm thrilled to help you with "${habit.name}"! This habit is perfectly chosen to support your personal growth. Let's make positive change together, one day at a time.`
  ]

  // Select a random message from the category
  return categoryMessages[Math.floor(Math.random() * categoryMessages.length)]
}