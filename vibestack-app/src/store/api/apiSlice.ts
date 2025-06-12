import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { RootState } from '../index';

const baseQuery = fetchBaseQuery({
  baseUrl: Constants.manifest?.extra?.apiUrl || 'https://api.vibestack.ai',
  prepareHeaders: async (headers, { getState }) => {
    // Get token from secure storage
    const token = await SecureStore.getItemAsync('accessToken');
    
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    
    // Add security headers
    headers.set('x-app-version', Constants.manifest?.version || '1.0.0');
    headers.set('x-platform', 'mobile');
    headers.set('x-request-id', `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    
    return headers;
  },
});

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery,
  tagTypes: [
    'User',
    'Habit',
    'HabitCompletion',
    'Challenge',
    'Friend',
    'Notification',
    'Avatar',
    'Analytics'
  ],
  endpoints: (builder) => ({
    // Auth endpoints
    login: builder.mutation<AuthResponse, LoginRequest>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['User'],
    }),
    
    logout: builder.mutation<void, void>({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
      invalidatesTags: ['User', 'Habit', 'Challenge', 'Friend'],
    }),
    
    refreshToken: builder.mutation<RefreshTokenResponse, { refreshToken: string }>({
      query: (body) => ({
        url: '/auth/refresh',
        method: 'POST',
        body,
      }),
    }),
    
    // User endpoints
    getCurrentUser: builder.query<User, void>({
      query: () => '/users/me',
      providesTags: ['User'],
    }),
    
    updateProfile: builder.mutation<User, UpdateProfileRequest>({
      query: (profile) => ({
        url: '/users/me',
        method: 'PATCH',
        body: profile,
      }),
      invalidatesTags: ['User'],
    }),
    
    // Habit endpoints
    getHabits: builder.query<Habit[], HabitFilters>({
      query: (filters) => ({
        url: '/habits',
        params: filters,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Habit' as const, id })),
              { type: 'Habit', id: 'LIST' },
            ]
          : [{ type: 'Habit', id: 'LIST' }],
    }),
    
    getHabitById: builder.query<Habit, string>({
      query: (id) => `/habits/${id}`,
      providesTags: (result, error, id) => [{ type: 'Habit', id }],
    }),
    
    createHabit: builder.mutation<Habit, CreateHabitRequest>({
      query: (habit) => ({
        url: '/habits',
        method: 'POST',
        body: habit,
      }),
      invalidatesTags: [{ type: 'Habit', id: 'LIST' }],
    }),
    
    updateHabit: builder.mutation<Habit, UpdateHabitRequest>({
      query: ({ id, ...patch }) => ({
        url: `/habits/${id}`,
        method: 'PATCH',
        body: patch,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Habit', id }],
    }),
    
    deleteHabit: builder.mutation<void, string>({
      query: (id) => ({
        url: `/habits/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Habit', id },
        { type: 'Habit', id: 'LIST' },
      ],
    }),
    
    completeHabit: builder.mutation<HabitCompletion, CompleteHabitRequest>({
      query: ({ habitId, ...data }) => ({
        url: `/habits/${habitId}/complete`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (result, error, { habitId }) => [
        { type: 'Habit', id: habitId },
        { type: 'HabitCompletion', id: 'LIST' },
        'Analytics',
      ],
    }),
    
    // Analytics endpoints
    getHabitStats: builder.query<HabitStats, string>({
      query: (habitId) => `/analytics/habits/${habitId}/stats`,
      providesTags: ['Analytics'],
    }),
    
    getUserStats: builder.query<UserStats, void>({
      query: () => '/analytics/user/stats',
      providesTags: ['Analytics'],
    }),
    
    // Social endpoints
    getFriends: builder.query<Friend[], void>({
      query: () => '/social/friends',
      providesTags: ['Friend'],
    }),
    
    getChallenges: builder.query<Challenge[], ChallengeFilters>({
      query: (filters) => ({
        url: '/social/challenges',
        params: filters,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Challenge' as const, id })),
              { type: 'Challenge', id: 'LIST' },
            ]
          : [{ type: 'Challenge', id: 'LIST' }],
    }),
    
    joinChallenge: builder.mutation<void, string>({
      query: (challengeId) => ({
        url: `/social/challenges/${challengeId}/join`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, id) => [{ type: 'Challenge', id }],
    }),
    
    createChallenge: builder.mutation<Challenge, CreateChallengeRequest>({
      query: (data) => ({
        url: '/social/challenges',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Challenge'],
    }),
    
    updateChallenge: builder.mutation<Challenge, UpdateChallengeRequest>({
      query: ({ id, ...data }) => ({
        url: `/social/challenges/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Challenge', id }],
    }),
    
    deleteChallenge: builder.mutation<void, string>({
      query: (id) => ({
        url: `/social/challenges/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Challenge'],
    }),
    
    // Notification endpoints
    getNotifications: builder.query<Notification[], void>({
      query: () => '/notifications',
      providesTags: ['Notification'],
    }),
    
    markNotificationRead: builder.mutation<void, string>({
      query: (id) => ({
        url: `/notifications/${id}/read`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, id) => [{ type: 'Notification', id }],
    }),
    
    // Sync endpoints
    getChanges: builder.query<SyncChanges, { since?: string }>({
      query: ({ since }) => ({
        url: '/sync/changes',
        params: { since }
      }),
    }),
    
    // Completion endpoints
    createCompletion: builder.mutation<HabitCompletion, CreateCompletionRequest>({
      query: (data) => ({
        url: '/completions',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['HabitCompletion', 'Habit'],
    }),
    
    updateCompletion: builder.mutation<HabitCompletion, UpdateCompletionRequest>({
      query: ({ id, ...data }) => ({
        url: `/completions/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['HabitCompletion'],
    }),
    
    deleteCompletion: builder.mutation<void, string>({
      query: (id) => ({
        url: `/completions/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['HabitCompletion', 'Habit'],
    }),
  }),
});

// Export hooks for usage in functional components
export const {
  useLoginMutation,
  useLogoutMutation,
  useRefreshTokenMutation,
  useGetCurrentUserQuery,
  useUpdateProfileMutation,
  useGetHabitsQuery,
  useGetHabitByIdQuery,
  useCreateHabitMutation,
  useUpdateHabitMutation,
  useDeleteHabitMutation,
  useCompleteHabitMutation,
  useGetHabitStatsQuery,
  useGetUserStatsQuery,
  useGetFriendsQuery,
  useGetChallengesQuery,
  useJoinChallengeMutation,
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
  useGetChangesQuery,
  useCreateCompletionMutation,
  useUpdateCompletionMutation,
  useDeleteCompletionMutation,
  useCreateChallengeMutation,
  useUpdateChallengeMutation,
  useDeleteChallengeMutation,
} = apiSlice;

// Type definitions
interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

interface LoginRequest {
  email: string;
  password: string;
  enableBiometric?: boolean;
}

interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

interface User {
  id: string;
  email: string;
  profile: UserProfile;
  subscription: SubscriptionTier;
}

interface UserProfile {
  name: string;
  avatar: string;
  bio?: string;
  timezone: string;
  language: string;
}

interface SubscriptionTier {
  plan: 'free' | 'premium' | 'pro';
  expiresAt?: number;
}

interface Habit {
  id: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
  frequencyType: 'daily' | 'weekly' | 'custom';
  frequencyDays: number[];
  reminderTime?: number;
  streakCurrent: number;
  streakBest: number;
  createdAt: string;
  updatedAt: string;
  lastCompletedAt?: string;
  isArchived: boolean;
}

interface CreateHabitRequest {
  name: string;
  description?: string;
  icon: string;
  color: string;
  frequencyType: 'daily' | 'weekly' | 'custom';
  frequencyDays: number[];
  reminderTime?: number;
}

interface UpdateHabitRequest {
  id: string;
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  frequencyType?: 'daily' | 'weekly' | 'custom';
  frequencyDays?: number[];
  reminderTime?: number | null;
  isArchived?: boolean;
}

interface HabitFilters {
  isArchived?: boolean;
  frequencyType?: 'daily' | 'weekly' | 'custom';
  search?: string;
}

interface HabitCompletion {
  id: string;
  habitId: string;
  completedAt: string;
  note?: string;
  mood?: 'great' | 'good' | 'okay' | 'bad';
  durationMinutes?: number;
}

interface CompleteHabitRequest {
  habitId: string;
  note?: string;
  mood?: 'great' | 'good' | 'okay' | 'bad';
  durationMinutes?: number;
}

interface HabitStats {
  habitId: string;
  totalCompletions: number;
  completionRate: number;
  averageStreak: number;
  longestStreak: number;
  weeklyPattern: number[];
  monthlyTrend: Array<{ month: string; completions: number }>;
}

interface UserStats {
  totalHabits: number;
  activeHabits: number;
  totalCompletions: number;
  currentStreaks: Array<{ habitId: string; streak: number }>;
  overallCompletionRate: number;
}

interface Friend {
  id: string;
  userId: string;
  profile: UserProfile;
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
}

interface ChallengeFilters {
  status?: 'upcoming' | 'active' | 'completed';
  habitId?: string;
  participating?: boolean;
}

interface Notification {
  id: string;
  type: 'habit_reminder' | 'challenge_invite' | 'friend_request' | 'achievement';
  title: string;
  message: string;
  data?: any;
  createdAt: string;
  readAt?: string;
}

interface UpdateProfileRequest {
  name?: string;
  bio?: string;
  timezone?: string;
  language?: string;
}

interface SyncChanges {
  habits: any[];
  completions: any[];
  challenges: any[];
  lastSyncAt: string;
}

interface CreateCompletionRequest {
  habitId: string;
  completedAt?: string;
  note?: string;
  mood?: 'great' | 'good' | 'okay' | 'bad';
  durationMinutes?: number;
}

interface UpdateCompletionRequest {
  id: string;
  note?: string;
  mood?: 'great' | 'good' | 'okay' | 'bad';
  durationMinutes?: number;
}

interface CreateChallengeRequest {
  name: string;
  description: string;
  habitId: string;
  startDate: string;
  endDate: string;
  type: 'individual' | 'team';
}

interface UpdateChallengeRequest {
  id: string;
  name?: string;
  description?: string;
  endDate?: string;
  status?: 'upcoming' | 'active' | 'completed';
}