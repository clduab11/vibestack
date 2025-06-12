import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type PersonalityType = 'cheerleader' | 'coach' | 'zen_master';
export type AvatarMood = 'happy' | 'neutral' | 'thinking' | 'celebrating';

interface Avatar {
  id: string;
  personality: PersonalityType;
  name: string;
  appearance: AvatarCustomization;
  evolutionLevel: number;
  currentMood: AvatarMood;
  experiencePoints: number;
}

interface AvatarCustomization {
  skinTone: string;
  hairStyle: string;
  hairColor: string;
  eyeColor: string;
  outfit: string;
  accessories: string[];
}

interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  mood?: AvatarMood;
}

interface AvatarState {
  currentAvatar: Avatar | null;
  selectedPersonality: PersonalityType;
  conversationHistory: ConversationMessage[];
  isTyping: boolean;
  suggestedResponses: string[];
  lastInteractionTime: number | null;
}

const initialState: AvatarState = {
  currentAvatar: null,
  selectedPersonality: 'cheerleader',
  conversationHistory: [],
  isTyping: false,
  suggestedResponses: [],
  lastInteractionTime: null,
};

const avatarSlice = createSlice({
  name: 'avatar',
  initialState,
  reducers: {
    setAvatar: (state, action: PayloadAction<Avatar>) => {
      state.currentAvatar = action.payload;
      state.selectedPersonality = action.payload.personality;
    },
    switchPersonality: (state, action: PayloadAction<PersonalityType>) => {
      state.selectedPersonality = action.payload;
      if (state.currentAvatar) {
        state.currentAvatar.personality = action.payload;
      }
    },
    updateMood: (state, action: PayloadAction<AvatarMood>) => {
      if (state.currentAvatar) {
        state.currentAvatar.currentMood = action.payload;
      }
    },
    addMessage: (state, action: PayloadAction<Omit<ConversationMessage, 'id' | 'timestamp'>>) => {
      state.conversationHistory.push({
        ...action.payload,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
      });
      state.lastInteractionTime = Date.now();
    },
    setTyping: (state, action: PayloadAction<boolean>) => {
      state.isTyping = action.payload;
    },
    setSuggestedResponses: (state, action: PayloadAction<string[]>) => {
      state.suggestedResponses = action.payload;
    },
    updateAppearance: (state, action: PayloadAction<Partial<AvatarCustomization>>) => {
      if (state.currentAvatar) {
        state.currentAvatar.appearance = {
          ...state.currentAvatar.appearance,
          ...action.payload,
        };
      }
    },
    addExperience: (state, action: PayloadAction<number>) => {
      if (state.currentAvatar) {
        state.currentAvatar.experiencePoints += action.payload;
        
        // Calculate evolution level based on experience
        const newLevel = Math.floor(state.currentAvatar.experiencePoints / 1000) + 1;
        if (newLevel > state.currentAvatar.evolutionLevel) {
          state.currentAvatar.evolutionLevel = newLevel;
          state.currentAvatar.currentMood = 'celebrating';
        }
      }
    },
    clearConversation: (state) => {
      state.conversationHistory = [];
      state.suggestedResponses = [];
    },
  },
});

export const {
  setAvatar,
  switchPersonality,
  updateMood,
  addMessage,
  setTyping,
  setSuggestedResponses,
  updateAppearance,
  addExperience,
  clearConversation,
} = avatarSlice.actions;

export default avatarSlice.reducer;

// Selectors
export const selectCurrentAvatar = (state: { avatar: AvatarState }) => state.avatar.currentAvatar;
export const selectPersonality = (state: { avatar: AvatarState }) => state.avatar.selectedPersonality;
export const selectConversationHistory = (state: { avatar: AvatarState }) => state.avatar.conversationHistory;
export const selectIsTyping = (state: { avatar: AvatarState }) => state.avatar.isTyping;
export const selectSuggestedResponses = (state: { avatar: AvatarState }) => state.avatar.suggestedResponses;
export const selectAvatarMood = (state: { avatar: AvatarState }) => state.avatar.currentAvatar?.currentMood || 'neutral';
export const selectEvolutionLevel = (state: { avatar: AvatarState }) => state.avatar.currentAvatar?.evolutionLevel || 1;
export const selectLastInteractionTime = (state: { avatar: AvatarState }) => state.avatar.lastInteractionTime;