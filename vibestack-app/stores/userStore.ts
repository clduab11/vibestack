import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Profile } from '../services/supabase'

interface UserState {
  // State
  user: {
    id: string
    email: string
  } | null
  profile: Profile | null
  isLoading: boolean
  isAuthenticated: boolean
  
  // Actions
  setUser: (user: UserState['user']) => void
  setProfile: (profile: Profile) => void
  updateProfile: (updates: Partial<Profile>) => void
  setLoading: (loading: boolean) => void
  logout: () => void
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      // Initial state
      user: null,
      profile: null,
      isLoading: true,
      isAuthenticated: false,
      
      // Actions
      setUser: (user) => 
        set({ 
          user, 
          isAuthenticated: !!user 
        }),
      
      setProfile: (profile) => 
        set({ profile }),
      
      updateProfile: (updates) =>
        set((state) => ({
          profile: state.profile 
            ? { ...state.profile, ...updates }
            : null
        })),
      
      setLoading: (isLoading) => 
        set({ isLoading }),
      
      logout: () => 
        set({ 
          user: null, 
          profile: null, 
          isAuthenticated: false 
        }),
    }),
    {
      name: 'user-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ 
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)