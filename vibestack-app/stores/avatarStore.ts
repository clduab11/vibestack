import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Avatar } from '../services/supabase'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  metadata?: Record<string, any>
}

interface AvatarState {
  // State
  avatar: Avatar | null
  conversation: {
    messages: Message[]
    isTyping: boolean
    context: Record<string, any>
  }
  selectedPersonality: Avatar['personality']
  
  // Actions
  setAvatar: (avatar: Avatar) => void
  updateAppearance: (appearance: Partial<Avatar['appearance']>) => void
  setPersonality: (personality: Avatar['personality']) => void
  addMemory: (memory: Record<string, any>) => void
  updateEmotion: (emotion: Record<string, any>) => void
  addMessage: (message: Message) => void
  setTyping: (isTyping: boolean) => void
  clearConversation: () => void
}

export const useAvatarStore = create<AvatarState>()(
  persist(
    (set, get) => ({
      // Initial state
      avatar: null,
      conversation: {
        messages: [],
        isTyping: false,
        context: {}
      },
      selectedPersonality: 'encouraging',
      
      // Actions
      setAvatar: (avatar) => 
        set({ 
          avatar,
          selectedPersonality: avatar.personality 
        }),
      
      updateAppearance: (appearance) =>
        set((state) => ({
          avatar: state.avatar 
            ? {
                ...state.avatar,
                appearance: { ...state.avatar.appearance, ...appearance }
              }
            : null
        })),
      
      setPersonality: (personality) => {
        set((state) => ({
          selectedPersonality: personality,
          avatar: state.avatar 
            ? { ...state.avatar, personality }
            : null
        }))
      },
      
      addMemory: (memory) =>
        set((state) => ({
          avatar: state.avatar
            ? {
                ...state.avatar,
                memories: [...state.avatar.memories, memory].slice(-100) // Keep last 100
              }
            : null
        })),
      
      updateEmotion: (emotion) =>
        set((state) => ({
          avatar: state.avatar
            ? {
                ...state.avatar,
                emotion_state: calculateEmotions(state.avatar.emotion_state, emotion)
              }
            : null
        })),
      
      addMessage: (message) =>
        set((state) => ({
          conversation: {
            ...state.conversation,
            messages: [...state.conversation.messages, message].slice(-50), // Keep last 50
            isTyping: false
          }
        })),
      
      setTyping: (isTyping) =>
        set((state) => ({
          conversation: {
            ...state.conversation,
            isTyping
          }
        })),
      
      clearConversation: () =>
        set((state) => ({
          conversation: {
            messages: [],
            isTyping: false,
            context: {}
          }
        })),
    }),
    {
      name: 'avatar-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ 
        selectedPersonality: state.selectedPersonality,
        avatar: state.avatar ? {
          appearance: state.avatar.appearance,
          personality: state.avatar.personality,
        } : null
      }),
    }
  )
)

// Helper function to calculate emotion state
function calculateEmotions(
  currentState: Record<string, any>, 
  newEmotion: Record<string, any>
): Record<string, any> {
  // Simple emotion blending logic
  const blendFactor = 0.3
  const result: Record<string, any> = {}
  
  // Blend current and new emotions
  Object.keys(currentState).forEach(key => {
    if (typeof currentState[key] === 'number' && typeof newEmotion[key] === 'number') {
      result[key] = currentState[key] * (1 - blendFactor) + newEmotion[key] * blendFactor
    } else {
      result[key] = newEmotion[key] || currentState[key]
    }
  })
  
  // Add new emotion keys
  Object.keys(newEmotion).forEach(key => {
    if (!(key in result)) {
      result[key] = newEmotion[key]
    }
  })
  
  return result
}