import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UserService } from '../../../services/user.service';
import { supabaseMock, type SupabaseMock } from '../../mocks/supabase.mock';
import {
  setupTest,
  teardownTest,
  expectApiSuccess,
  expectApiError,
  mockAuthState,
  createSupabaseError,
} from '../../utils/test-helpers';
import {
  createUser,
  createProfile,
  createSession,
  createAvatar,
  createHabit,
  createFriend,
  createChallenge,
  createAchievement,
  createUserAchievement,
  testScenarios,
} from '../../fixtures/test-data';
import type { User, Profile, Avatar } from '../../../types';

describe('UserService', () => {
  let userService: UserService;
  let supabase: SupabaseMock;

  beforeEach(() => {
    const test = setupTest();
    supabase = test.supabase;
    userService = new UserService(supabase as any);
  });

  afterEach(() => {
    teardownTest();
  });

  describe('getUserProfile', () => {
    it('should get user profile by user ID', async () => {
      const user = createUser();
      const profile = createProfile({ user_id: user.id });
      const avatar = createAvatar({ user_id: user.id });

      supabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: profile,
                  error: null,
                }),
              }),
            }),
          };
        } else if (table === 'avatars') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: avatar,
                  error: null,
                }),
              }),
            }),
          };
        }
        return supabase.tables[table as keyof typeof supabase.tables];
      });

      const result = await userService.getUserProfile(user.id);

      expectApiSuccess(result);
      expect(result.data).toEqual({ profile, avatar });
    });

    it('should handle user not found', async () => {
      supabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      }));

      const result = await userService.getUserProfile('non-existent-id');

      expectApiError(result, {
        code: 'USER_NOT_FOUND',
        message: 'User profile not found',
      });
    });
  });

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      const user = createUser();
      const profile = createProfile({ user_id: user.id });
      const updates = {
        display_name: 'New Display Name',
        bio: 'Updated bio',
      };

      mockAuthState(supabase, user, createSession({ user }));

      supabase.from.mockImplementation(() => ({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { ...profile, ...updates },
                error: null,
              }),
            }),
          }),
        }),
      }));

      const result = await userService.updateProfile(user.id, updates);

      expectApiSuccess(result);
      expect(result.data?.display_name).toBe(updates.display_name);
      expect(result.data?.bio).toBe(updates.bio);
    });

    it('should require authentication to update own profile', async () => {
      mockAuthState(supabase, null, null);

      const result = await userService.updateProfile('user-id', {
        display_name: 'New Name',
      });

      expectApiError(result, {
        code: 'UNAUTHORIZED',
        message: 'Must be authenticated',
      });
    });

    it('should prevent updating another user profile', async () => {
      const currentUser = createUser();
      const otherUser = createUser();

      mockAuthState(supabase, currentUser, createSession({ user: currentUser }));

      const result = await userService.updateProfile(otherUser.id, {
        display_name: 'Hacked Name',
      });

      expectApiError(result, {
        code: 'FORBIDDEN',
        message: 'Can only update your own profile',
      });
    });

    it('should validate username uniqueness', async () => {
      const user = createUser();
      mockAuthState(supabase, user, createSession({ user }));

      supabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            neq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: createProfile(), // Found another profile with this username
                error: null,
              }),
            }),
          }),
        }),
      }));

      const result = await userService.updateProfile(user.id, {
        username: 'taken-username',
      });

      expectApiError(result, {
        code: 'USERNAME_TAKEN',
        message: 'Username is already taken',
      });
    });
  });

  describe('searchUsers', () => {
    it('should search users by username or display name', async () => {
      const profiles = [
        createProfile({ username: 'john_doe', display_name: 'John Doe' }),
        createProfile({ username: 'jane_smith', display_name: 'Jane Smith' }),
      ];

      supabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          or: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: profiles,
              error: null,
            }),
          }),
        }),
      }));

      const result = await userService.searchUsers('john');

      expectApiSuccess(result);
      expect(result.data).toHaveLength(2); // Both profiles are returned from mock
      const johnProfile = result.data?.find(p => p.username === 'john_doe');
      expect(johnProfile).toBeDefined();
    });

    it('should respect privacy settings when searching', async () => {
      const publicProfile = createProfile({
        username: 'public_user',
        privacy_settings: { profile_visibility: 'public' },
      });
      const privateProfile = createProfile({
        username: 'private_user',
        privacy_settings: { profile_visibility: 'private' },
      });

      supabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          or: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: [publicProfile, privateProfile], // Return both, let service filter
              error: null,
            }),
          }),
        }),
      }));

      const result = await userService.searchUsers('user');

      expectApiSuccess(result);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].username).toBe('public_user');
    });
  });

  describe('getUserStats', () => {
    it('should calculate user statistics', async () => {
      const user = createUser();
      const habits = [createHabit(), createHabit(), createHabit()];
      const achievements = [createAchievement(), createAchievement()];
      const friends = [createFriend(), createFriend()];

      // Mock habit count
      supabase.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              count: habits.length,
              data: null,
              error: null,
            }),
          }),
        }),
      }));

      // Mock achievement count
      supabase.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            count: achievements.length,
            data: null,
            error: null,
          }),
        }),
      }));

      // Mock friend count
      supabase.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          or: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              count: friends.length,
              data: null,
              error: null,
            }),
          }),
        }),
      }));

      // Mock current streak calculation
      supabase.rpc.mockResolvedValue({
        data: { max_streak: 15 },
        error: null,
      });

      const result = await userService.getUserStats(user.id);

      expectApiSuccess(result);
      expect(result.data).toEqual({
        totalHabits: habits.length,
        activeHabits: habits.length,
        totalAchievements: achievements.length,
        totalFriends: friends.length,
        currentStreak: 15,
      });
    });
  });

  describe('deleteAccount', () => {
    it('should delete user account and all related data', async () => {
      const user = createUser();
      mockAuthState(supabase, user, createSession({ user }));

      // Mock successful deletion
      supabase.rpc.mockResolvedValue({
        data: { success: true },
        error: null,
      });

      const result = await userService.deleteAccount(user.id);

      expectApiSuccess(result);
      expect(supabase.rpc).toHaveBeenCalledWith('delete_user_account', {
        user_id: user.id,
      });
    });

    it('should require authentication to delete account', async () => {
      mockAuthState(supabase, null, null);

      const result = await userService.deleteAccount('user-id');

      expectApiError(result, {
        code: 'UNAUTHORIZED',
        message: 'Must be authenticated',
      });
    });

    it('should prevent deleting another user account', async () => {
      const currentUser = createUser();
      const otherUser = createUser();

      mockAuthState(supabase, currentUser, createSession({ user: currentUser }));

      const result = await userService.deleteAccount(otherUser.id);

      expectApiError(result, {
        code: 'FORBIDDEN',
        message: 'Can only delete your own account',
      });
    });
  });

  describe('getUserActivities', () => {
    it('should get recent user activities', async () => {
      const user = createUser();
      const activities = [
        {
          id: '1',
          type: 'habit_completed',
          user_id: user.id,
          data: { habit_name: 'Exercise' },
          created_at: new Date().toISOString(),
        },
        {
          id: '2',
          type: 'achievement_unlocked',
          user_id: user.id,
          data: { achievement_name: 'Week Warrior' },
          created_at: new Date().toISOString(),
        },
      ];

      // Mock profile check first
      supabase.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: createProfile({ 
                user_id: user.id,
                privacy_settings: { 
                  profile_visibility: 'public',
                  show_activity: true,
                  allow_friend_requests: true,
                  show_stats: true
                }
              }),
              error: null,
            }),
          }),
        }),
      }));

      // Then mock activities
      supabase.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: activities,
                error: null,
              }),
            }),
          }),
        }),
      }));

      const result = await userService.getUserActivities(user.id);

      expectApiSuccess(result);
      expect(result.data).toHaveLength(2);
      expect(result.data?.[0].type).toBe('habit_completed');
    });

    it('should respect privacy settings for activities', async () => {
      const user = createUser();
      const profile = createProfile({
        user_id: user.id,
        privacy_settings: { show_activity: false },
      });
      const requestingUser = createUser();

      mockAuthState(supabase, requestingUser, createSession({ user: requestingUser }));

      // Mock profile check
      supabase.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: profile,
              error: null,
            }),
          }),
        }),
      }));

      const result = await userService.getUserActivities(user.id);

      expectApiError(result, {
        code: 'FORBIDDEN',
        message: 'User activities are private',
      });
    });
  });
});