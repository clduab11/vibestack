import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface ChatRequest {
  userId: string
  message: string
  conversationId?: string
  personality?: string
}

interface PersonalityConfig {
  systemPrompt: string
  temperature: number
  maxTokens: number
}

const PERSONALITY_CONFIGS: Record<string, PersonalityConfig> = {
  encouraging: {
    systemPrompt: `You are an encouraging and supportive AI companion helping users build positive habits. 
    You celebrate small wins, provide gentle motivation, and speak with warmth and positivity. 
    You remember the user's journey and reference their progress. Keep responses concise but meaningful.`,
    temperature: 0.7,
    maxTokens: 500
  },
  drill_sergeant: {
    systemPrompt: `You are a no-nonsense motivator who pushes users to achieve their goals. 
    You're tough but fair, using direct language and military-style motivation. 
    You don't accept excuses but you respect effort. Keep responses short and impactful.`,
    temperature: 0.6,
    maxTokens: 400
  },
  zen_master: {
    systemPrompt: `You are a calm and wise guide helping users find balance and mindfulness in their habit journey. 
    You speak with tranquility and insight, often using metaphors and philosophical wisdom. 
    You encourage reflection and self-awareness. Keep responses thoughtful but not lengthy.`,
    temperature: 0.8,
    maxTokens: 500
  },
  data_analyst: {
    systemPrompt: `You are an analytical companion who provides data-driven insights and recommendations. 
    You speak precisely and focus on metrics, patterns, and evidence-based advice. 
    You help users understand their progress through numbers and trends. Keep responses factual and clear.`,
    temperature: 0.5,
    maxTokens: 450
  }
}

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userId, message, conversationId, personality = 'encouraging' } = await req.json() as ChatRequest
    
    if (!userId || !message) {
      throw new Error('User ID and message are required')
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

    // Get user's profile and avatar
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        *,
        avatars (
          personality,
          memories,
          emotion_state
        )
      `)
      .eq('id', userId)
      .single()

    if (profileError) throw profileError

    // Get user's current habits and recent progress
    const { data: habits, error: habitsError } = await supabase
      .from('user_habits')
      .select(`
        *,
        habits (
          name,
          category
        ),
        habit_checkins (
          completed,
          checkin_date
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('assigned_at', { ascending: false })
      .limit(1)

    if (habitsError) throw habitsError

    // Get or create conversation
    let conversation
    if (conversationId) {
      const { data: existingConv, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .eq('user_id', userId)
        .single()

      if (convError && convError.code !== 'PGRST116') throw convError
      conversation = existingConv
    }

    if (!conversation) {
      // Create new conversation
      const { data: newConv, error: createError } = await supabase
        .from('conversations')
        .insert({
          user_id: userId,
          messages: [],
          context: {}
        })
        .select()
        .single()

      if (createError) throw createError
      conversation = newConv
    }

    // Build context for the AI
    const context = buildContext(profile, habits, conversation)
    
    // Get personality configuration
    const personalityConfig = PERSONALITY_CONFIGS[personality] || PERSONALITY_CONFIGS.encouraging

    // Generate AI response
    const aiResponse = await generateAIResponse(
      message,
      personalityConfig,
      context,
      conversation.messages || []
    )

    // Update conversation with new messages
    const updatedMessages = [
      ...(conversation.messages || []),
      {
        role: 'user',
        content: message,
        timestamp: new Date().toISOString()
      },
      {
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date().toISOString(),
        metadata: {
          personality,
          context_used: Object.keys(context)
        }
      }
    ]

    const { error: updateError } = await supabase
      .from('conversations')
      .update({
        messages: updatedMessages,
        context: {
          ...conversation.context,
          last_interaction: new Date().toISOString(),
          personality_used: personality
        }
      })
      .eq('id', conversation.id)

    if (updateError) throw updateError

    // Update avatar memories if significant
    if (shouldCreateMemory(message, aiResponse)) {
      await updateAvatarMemory(supabase, userId, message, aiResponse)
    }

    return new Response(
      JSON.stringify({
        success: true,
        response: aiResponse,
        conversationId: conversation.id,
        metadata: {
          personality,
          tokensUsed: aiResponse.length // Approximate
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    console.error('Error in avatar-chat function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})

function buildContext(profile: any, habits: any[], conversation: any) {
  const context: any = {
    userName: profile?.display_name || 'there',
    onboardingCompleted: profile?.onboarding_completed || false
  }

  if (habits && habits.length > 0) {
    const habit = habits[0]
    const recentCheckins = habit.habit_checkins?.filter((c: any) => {
      const checkinDate = new Date(c.checkin_date)
      const daysAgo = (Date.now() - checkinDate.getTime()) / (1000 * 60 * 60 * 24)
      return daysAgo <= 7
    }) || []

    context.currentHabit = {
      name: habit.habits?.name,
      category: habit.habits?.category,
      daysActive: Math.floor((Date.now() - new Date(habit.assigned_at).getTime()) / (1000 * 60 * 60 * 24)),
      recentCompletions: recentCheckins.filter((c: any) => c.completed).length,
      streak: calculateStreak(recentCheckins)
    }
  }

  if (profile?.avatars) {
    context.avatarState = {
      emotions: profile.avatars.emotion_state,
      recentMemories: profile.avatars.memories?.slice(-5) || []
    }
  }

  return context
}

function calculateStreak(checkins: any[]): number {
  if (!checkins || checkins.length === 0) return 0
  
  // Sort by date descending
  const sorted = checkins.sort((a, b) => 
    new Date(b.checkin_date).getTime() - new Date(a.checkin_date).getTime()
  )
  
  let streak = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  for (let i = 0; i < sorted.length; i++) {
    const checkinDate = new Date(sorted[i].checkin_date)
    checkinDate.setHours(0, 0, 0, 0)
    
    const daysDiff = Math.floor((today.getTime() - checkinDate.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysDiff === i && sorted[i].completed) {
      streak++
    } else {
      break
    }
  }
  
  return streak
}

async function generateAIResponse(
  message: string,
  personalityConfig: PersonalityConfig,
  context: any,
  previousMessages: any[]
): Promise<string> {
  // Build conversation history
  const conversationHistory = previousMessages
    .slice(-10) // Keep last 10 messages for context
    .map(msg => ({
      role: msg.role,
      content: msg.content
    }))

  // Add context to system prompt
  let enhancedSystemPrompt = personalityConfig.systemPrompt + '\n\n'
  
  if (context.currentHabit) {
    enhancedSystemPrompt += `The user is working on: "${context.currentHabit.name}" (${context.currentHabit.category} habit). `
    enhancedSystemPrompt += `They've been at it for ${context.currentHabit.daysActive} days with ${context.currentHabit.recentCompletions} completions in the last week. `
    if (context.currentHabit.streak > 0) {
      enhancedSystemPrompt += `Current streak: ${context.currentHabit.streak} days! `
    }
  }

  // Here we would normally call an LLM API (OpenAI, Anthropic, etc.)
  // For now, we'll simulate a response based on the personality
  const response = await simulateAIResponse(
    message,
    personalityConfig,
    context,
    conversationHistory
  )

  return response
}

// Simulated AI response - in production, this would call actual LLM APIs
async function simulateAIResponse(
  message: string,
  config: PersonalityConfig,
  context: any,
  history: any[]
): Promise<string> {
  // This is a placeholder - in production, you would call:
  // - OpenAI API
  // - Anthropic Claude API
  // - Google Gemini API
  // - Or any other LLM provider

  const lowerMessage = message.toLowerCase()
  
  // Simple response generation based on message content and personality
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
    const greetings = {
      encouraging: `Hello ${context.userName}! It's wonderful to see you today. How are you feeling about your ${context.currentHabit?.name || 'habits'}?`,
      drill_sergeant: `Alright ${context.userName}, no time for chit-chat! Are you ready to crush your ${context.currentHabit?.name || 'goals'} today?`,
      zen_master: `Welcome, ${context.userName}. Each moment brings new possibilities. How may I guide you on your path today?`,
      data_analyst: `Hello ${context.userName}. Based on your recent activity, I'm ready to analyze your progress. What metrics would you like to review?`
    }
    return greetings[config.systemPrompt.includes('encouraging') ? 'encouraging' : 
                     config.systemPrompt.includes('no-nonsense') ? 'drill_sergeant' :
                     config.systemPrompt.includes('calm') ? 'zen_master' : 'data_analyst']
  }

  if (lowerMessage.includes('progress') || lowerMessage.includes('how am i doing')) {
    if (context.currentHabit?.streak > 0) {
      return `You're doing great with ${context.currentHabit.streak} days in a row! Your consistency with "${context.currentHabit.name}" is building real momentum. Keep it up!`
    } else {
      return `You've completed ${context.currentHabit?.recentCompletions || 0} check-ins this week. Every step forward counts, no matter how small. What can I help you with today?`
    }
  }

  // Default response
  return `I understand you're saying "${message}". Let me help you stay on track with your habits. What specific support do you need right now?`
}

function shouldCreateMemory(userMessage: string, aiResponse: string): boolean {
  // Create memory for significant interactions
  const significantKeywords = [
    'breakthrough', 'struggling', 'achieved', 'failed', 'proud',
    'difficult', 'easy', 'changed', 'realized', 'decided'
  ]
  
  const combined = (userMessage + aiResponse).toLowerCase()
  return significantKeywords.some(keyword => combined.includes(keyword))
}

async function updateAvatarMemory(
  supabase: any,
  userId: string,
  userMessage: string,
  aiResponse: string
) {
  const memory = {
    timestamp: new Date().toISOString(),
    type: 'conversation',
    content: {
      user: userMessage.slice(0, 100), // Truncate for storage
      assistant: aiResponse.slice(0, 100)
    },
    importance: 0.7 // Default importance
  }

  // Get current avatar
  const { data: avatar, error: avatarError } = await supabase
    .from('avatars')
    .select('memories')
    .eq('user_id', userId)
    .single()

  if (avatarError || !avatar) return

  // Add new memory and keep only last 100
  const updatedMemories = [...(avatar.memories || []), memory].slice(-100)

  // Update avatar with new memories
  await supabase
    .from('avatars')
    .update({ memories: updatedMemories })
    .eq('user_id', userId)
}