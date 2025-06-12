import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { UserHabit, HabitCheckin } from '../services/supabase'

interface HabitState {
  // State
  activeHabit: UserHabit | null
  allHabits: UserHabit[]
  todayCheckin: HabitCheckin | null
  recentCheckins: HabitCheckin[]
  streak: number
  longestStreak: number
  
  // Actions
  setActiveHabit: (habit: UserHabit | null) => void
  setAllHabits: (habits: UserHabit[]) => void
  setTodayCheckin: (checkin: HabitCheckin | null) => void
  setRecentCheckins: (checkins: HabitCheckin[]) => void
  updateStreak: (current: number, longest: number) => void
  completeCheckin: (checkin: HabitCheckin) => void
  clearHabits: () => void
}

export const useHabitStore = create<HabitState>()(
  persist(
    (set, get) => ({
      // Initial state
      activeHabit: null,
      allHabits: [],
      todayCheckin: null,
      recentCheckins: [],
      streak: 0,
      longestStreak: 0,
      
      // Actions
      setActiveHabit: (habit) => 
        set({ activeHabit: habit }),
      
      setAllHabits: (habits) => 
        set({ 
          allHabits: habits,
          activeHabit: habits.find(h => h.status === 'active') || null
        }),
      
      setTodayCheckin: (checkin) => 
        set({ todayCheckin: checkin }),
      
      setRecentCheckins: (checkins) => {
        const streak = calculateStreak(checkins)
        const longestStreak = Math.max(get().longestStreak, streak)
        set({ 
          recentCheckins: checkins,
          streak,
          longestStreak
        })
      },
      
      updateStreak: (current, longest) => 
        set({ 
          streak: current, 
          longestStreak: longest 
        }),
      
      completeCheckin: (checkin) => 
        set((state) => ({
          todayCheckin: checkin,
          recentCheckins: [checkin, ...state.recentCheckins].slice(0, 30),
          streak: state.streak + 1,
          longestStreak: Math.max(state.longestStreak, state.streak + 1)
        })),
      
      clearHabits: () => 
        set({
          activeHabit: null,
          allHabits: [],
          todayCheckin: null,
          recentCheckins: [],
          streak: 0,
        }),
    }),
    {
      name: 'habit-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ 
        streak: state.streak,
        longestStreak: state.longestStreak,
      }),
    }
  )
)

// Helper function to calculate streak
function calculateStreak(checkins: HabitCheckin[]): number {
  if (!checkins || checkins.length === 0) return 0
  
  // Sort by date descending
  const sorted = [...checkins].sort((a, b) => 
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