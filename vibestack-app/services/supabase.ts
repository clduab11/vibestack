import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import Constants from 'expo-constants'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

// Types for our database
export interface Profile {
  id: string
  username?: string
  display_name?: string
  avatar_url?: string
  bio?: string
  preferences?: Record<string, any>
  onboarding_completed: boolean
  created_at: string
  updated_at: string
}

export interface Habit {
  id: string
  name: string
  description: string
  category: string
  difficulty: number
  icon: string
  color: string
  metadata?: Record<string, any>
  created_at: string
}

export interface UserHabit {
  id: string
  user_id: string
  habit_id: string
  assigned_at: string
  status: 'active' | 'paused' | 'completed'
  ai_confidence?: number
  assignment_reason?: Record<string, any>
  habits?: Habit
}

export interface HabitCheckin {
  id: string
  user_id: string
  habit_id: string
  completed: boolean
  checkin_date: string
  checkin_time: string
  mood?: string
  notes?: string
  metadata?: Record<string, any>
}

export interface Avatar {
  id: string
  user_id: string
  appearance: Record<string, any>
  personality: 'encouraging' | 'drill_sergeant' | 'zen_master' | 'data_analyst'
  memories: Array<Record<string, any>>
  emotion_state: Record<string, any>
  created_at: string
  updated_at: string
}

export interface Challenge {
  id: string
  creator_id: string
  habit_id?: string
  name: string
  description?: string
  start_date: string
  end_date: string
  type: '1v1' | 'group' | 'public'
  settings?: Record<string, any>
  created_at: string
}

// Helper functions for common operations
export const auth = {
  signUp: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })
    return { data, error }
  },

  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  getSession: async () => {
    const { data, error } = await supabase.auth.getSession()
    return { data, error }
  },

  getUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser()
    return { user, error }
  },
}

export const db = {
  // Profile operations
  getProfile: async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    return { data, error }
  },

  updateProfile: async (userId: string, updates: Partial<Profile>) => {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()
    return { data, error }
  },

  // Habit operations
  getUserHabits: async (userId: string) => {
    const { data, error } = await supabase
      .from('user_habits')
      .select(`
        *,
        habits (*)
      `)
      .eq('user_id', userId)
      .order('assigned_at', { ascending: false })
    return { data, error }
  },

  getActiveHabit: async (userId: string) => {
    const { data, error } = await supabase
      .from('user_habits')
      .select(`
        *,
        habits (*)
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()
    return { data, error }
  },

  // Check-in operations
  createCheckin: async (checkin: Omit<HabitCheckin, 'id' | 'checkin_time'>) => {
    const { data, error } = await supabase
      .from('habit_checkins')
      .insert(checkin)
      .select()
      .single()
    return { data, error }
  },

  getTodayCheckin: async (userId: string, habitId: string) => {
    const today = new Date().toISOString().split('T')[0]
    const { data, error } = await supabase
      .from('habit_checkins')
      .select('*')
      .eq('user_id', userId)
      .eq('habit_id', habitId)
      .eq('checkin_date', today)
      .single()
    return { data, error }
  },

  // Avatar operations
  getAvatar: async (userId: string) => {
    const { data, error } = await supabase
      .from('avatars')
      .select('*')
      .eq('user_id', userId)
      .single()
    return { data, error }
  },

  updateAvatar: async (userId: string, updates: Partial<Avatar>) => {
    const { data, error } = await supabase
      .from('avatars')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single()
    return { data, error }
  },
}

// Real-time subscriptions
export const realtime = {
  subscribeToHabitCheckins: (userId: string, callback: (payload: any) => void) => {
    return supabase
      .channel(`habit-checkins:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'habit_checkins',
          filter: `user_id=eq.${userId}`,
        },
        callback
      )
      .subscribe()
  },

  subscribeToChallenge: (challengeId: string, callback: (payload: any) => void) => {
    return supabase
      .channel(`challenge:${challengeId}`)
      .on('broadcast', { event: '*' }, callback)
      .subscribe()
  },
}