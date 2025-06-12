import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { apiSlice } from '../api/apiSlice';

interface Friend {
  id: string;
  userId: string;
  profile: {
    name: string;
    avatar: string;
    bio?: string;
  };
  friendshipStatus: 'pending' | 'accepted';
  connectedAt: string;
}

interface Challenge {
  id: string;
  name: string;
  description: string;
  habitId: string;
  startDate: string;
  endDate: string;
  participants: string[];
  creatorId: string;
  type: 'individual' | 'team';
  status: 'upcoming' | 'active' | 'completed';
  leaderboard?: LeaderboardEntry[];
}

interface LeaderboardEntry {
  userId: string;
  userName: string;
  userAvatar: string;
  score: number;
  rank: number;
  completions: number;
}

interface SocialState {
  friends: Friend[];
  challenges: Challenge[];
  activeChallengeId: string | null;
  friendRequests: Friend[];
  isLoading: boolean;
  error: string | null;
}

const initialState: SocialState = {
  friends: [],
  challenges: [],
  activeChallengeId: null,
  friendRequests: [],
  isLoading: false,
  error: null,
};

const socialSlice = createSlice({
  name: 'social',
  initialState,
  reducers: {
    setActiveChallenge: (state, action: PayloadAction<string | null>) => {
      state.activeChallengeId = action.payload;
    },
    updateLeaderboard: (state, action: PayloadAction<{ challengeId: string; leaderboard: LeaderboardEntry[] }>) => {
      const challenge = state.challenges.find(c => c.id === action.payload.challengeId);
      if (challenge) {
        challenge.leaderboard = action.payload.leaderboard;
      }
    },
    addFriendRequest: (state, action: PayloadAction<Friend>) => {
      if (action.payload.friendshipStatus === 'pending') {
        state.friendRequests.push(action.payload);
      }
    },
    removeFriendRequest: (state, action: PayloadAction<string>) => {
      state.friendRequests = state.friendRequests.filter(fr => fr.id !== action.payload);
    },
  },
  extraReducers: (builder) => {
    // Handle get friends
    builder.addMatcher(
      apiSlice.endpoints.getFriends.matchPending,
      (state) => {
        state.isLoading = true;
        state.error = null;
      }
    );
    
    builder.addMatcher(
      apiSlice.endpoints.getFriends.matchFulfilled,
      (state, { payload }) => {
        state.friends = payload.filter(f => f.friendshipStatus === 'accepted');
        state.friendRequests = payload.filter(f => f.friendshipStatus === 'pending');
        state.isLoading = false;
      }
    );
    
    builder.addMatcher(
      apiSlice.endpoints.getFriends.matchRejected,
      (state, { error }) => {
        state.isLoading = false;
        state.error = error.message || 'Failed to fetch friends';
      }
    );
    
    // Handle get challenges
    builder.addMatcher(
      apiSlice.endpoints.getChallenges.matchFulfilled,
      (state, { payload }) => {
        state.challenges = payload;
      }
    );
    
    // Handle join challenge
    builder.addMatcher(
      apiSlice.endpoints.joinChallenge.matchFulfilled,
      (state, { meta }) => {
        const challengeId = meta.arg.originalArgs;
        const challenge = state.challenges.find(c => c.id === challengeId);
        if (challenge) {
          // This would be updated with actual user ID from auth state
          challenge.participants.push('currentUserId');
        }
      }
    );
  },
});

export const {
  setActiveChallenge,
  updateLeaderboard,
  addFriendRequest,
  removeFriendRequest,
} = socialSlice.actions;

export default socialSlice.reducer;

// Selectors
export const selectFriends = (state: { social: SocialState }) => state.social.friends;
export const selectFriendRequests = (state: { social: SocialState }) => state.social.friendRequests;
export const selectChallenges = (state: { social: SocialState }) => state.social.challenges;
export const selectActiveChallenges = (state: { social: SocialState }) => 
  state.social.challenges.filter(c => c.status === 'active');
export const selectUpcomingChallenges = (state: { social: SocialState }) => 
  state.social.challenges.filter(c => c.status === 'upcoming');
export const selectActiveChallenge = (state: { social: SocialState }) => 
  state.social.challenges.find(c => c.id === state.social.activeChallengeId);
export const selectSocialLoading = (state: { social: SocialState }) => state.social.isLoading;
export const selectSocialError = (state: { social: SocialState }) => state.social.error;