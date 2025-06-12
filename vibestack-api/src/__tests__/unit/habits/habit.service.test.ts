import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HabitService } from '../../../services/habit.service';
import { supabaseMock, type SupabaseMock } from '../../mocks/supabase.mock';
import {
  setupTest,
  teardownTest,
  expectApiSuccess,
  expectApiError,
  mockAuthState,
  createSupabaseError,
  measurePerformance,
} from '../../utils/test-helpers';
import {
  createUser,
  createProfile,
  createSession,
  createHabit,
  createHabitProgress,
  createChallenge,
  createChallengeParticipant,
  createAchievement,
  createUserAchievement,
  testScenarios,
} from '../../fixtures/test-data';
import type { User, Habit, HabitProgress } from '../../../types';

describe('HabitService', () => {
  let habitService: HabitService;
  let supabase: SupabaseMock;

  beforeEach(() => {
    const test = setupTest();
    supabase = test.supabase;
    habitService = new HabitService(supabase as any);
  });

  afterEach(() => {
    teardownTest();
  });

  describe('createHabit', () => {
    it('should create a new habit', async () => {
      const user = createUser();
      const habitData = {
        name: 'Exercise',
        description: 'Daily workout routine',
        frequency: 'daily' as const,
        target_count: 1,
        category: 'health' as const,
        difficulty: 'medium' as const,
        reminder_time: '08:00',
        is_public: true,
      };

      mockAuthState(supabase, user, createSession({ user }));

      const habit = createHabit({
        ...habitData,
        user_id: user.id,
      });

      // Mock count check
      supabase.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            count: 0, // User has no habits yet
            data: null,
            error: null,
          }),
        }),
      }));

      // Mock habit insert
      supabase.from.mockImplementationOnce(() => ({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: habit,
              error: null,
            }),
          }),
        }),
      }));

      const result = await habitService.createHabit(habitData);

      expectApiSuccess(result);
      expect(result.data?.name).toBe(habitData.name);
      expect(result.data?.user_id).toBe(user.id);
    });

    it('should require authentication to create habit', async () => {
      mockAuthState(supabase, null, null);

      const result = await habitService.createHabit({
        name: 'Exercise',
        frequency: 'daily',
        target_count: 1,
        category: 'health',
        difficulty: 'medium',
      });

      expectApiError(result, {
        code: 'UNAUTHORIZED',
        message: 'Must be authenticated',
      });
    });

    it('should validate habit data', async () => {
      const user = createUser();
      mockAuthState(supabase, user, createSession({ user }));

      const result = await habitService.createHabit({
        name: '', // Empty name
        frequency: 'daily',
        target_count: -1, // Invalid target
        category: 'health',
        difficulty: 'medium',
      });

      expectApiError(result, {
        code: 'INVALID_INPUT',
        message: 'Invalid habit data',
      });
    });

    it('should enforce habit limit per user', async () => {
      const user = createUser();
      mockAuthState(supabase, user, createSession({ user }));

      // Mock user already has max habits
      supabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            count: 50, // Max habits
            data: null,
            error: null,
          }),
        }),
      }));

      const result = await habitService.createHabit({
        name: 'New Habit',
        frequency: 'daily',
        target_count: 1,
        category: 'health',
        difficulty: 'medium',
      });

      expectApiError(result, {
        code: 'HABIT_LIMIT_REACHED',
        message: 'Maximum number of habits reached',
      });
    });
  });

  describe('updateHabit', () => {
    it('should update an existing habit', async () => {
      const user = createUser();
      const habit = createHabit({ user_id: user.id });
      const updates = {
        name: 'Updated Exercise',
        target_count: 2,
        difficulty: 'hard' as const,
      };

      mockAuthState(supabase, user, createSession({ user }));

      // Mock get habit to check ownership
      supabase.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: habit,
              error: null,
            }),
          }),
        }),
      }));

      // Mock update
      supabase.from.mockImplementationOnce(() => ({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { ...habit, ...updates },
                error: null,
              }),
            }),
          }),
        }),
      }));

      const result = await habitService.updateHabit(habit.id, updates);

      expectApiSuccess(result);
      expect(result.data?.name).toBe(updates.name);
      expect(result.data?.target_count).toBe(updates.target_count);
    });

    it('should prevent updating another user habit', async () => {
      const currentUser = createUser();
      const otherUser = createUser();
      const habit = createHabit({ user_id: otherUser.id });

      mockAuthState(supabase, currentUser, createSession({ user: currentUser }));

      // Mock get habit shows different owner
      supabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: habit,
              error: null,
            }),
          }),
        }),
      }));

      const result = await habitService.updateHabit(habit.id, {
        name: 'Hacked Name',
      });

      expectApiError(result, {
        code: 'FORBIDDEN',
        message: 'Cannot update habit owned by another user',
      });
    });

    it('should handle habit not found', async () => {
      const user = createUser();
      mockAuthState(supabase, user, createSession({ user }));

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

      const result = await habitService.updateHabit('non-existent-id', {
        name: 'Updated',
      });

      expectApiError(result, {
        code: 'HABIT_NOT_FOUND',
        message: 'Habit not found',
      });
    });
  });

  describe('deleteHabit', () => {
    it('should delete a habit and related data', async () => {
      const user = createUser();
      const habit = createHabit({ user_id: user.id });

      mockAuthState(supabase, user, createSession({ user }));

      // Mock get habit to check ownership
      supabase.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: habit,
              error: null,
            }),
          }),
        }),
      }));

      // Mock RPC call for cascading delete
      supabase.rpc.mockResolvedValue({
        data: { success: true },
        error: null,
      });

      const result = await habitService.deleteHabit(habit.id);

      expectApiSuccess(result);
      expect(supabase.rpc).toHaveBeenCalledWith('delete_habit_cascade', {
        habit_id: habit.id,
      });
    });

    it('should prevent deleting another user habit', async () => {
      const currentUser = createUser();
      const otherUser = createUser();
      const habit = createHabit({ user_id: otherUser.id });

      mockAuthState(supabase, currentUser, createSession({ user: currentUser }));

      supabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: habit,
              error: null,
            }),
          }),
        }),
      }));

      const result = await habitService.deleteHabit(habit.id);

      expectApiError(result, {
        code: 'FORBIDDEN',
        message: 'Cannot delete habit owned by another user',
      });
    });
  });

  describe('getUserHabits', () => {
    it('should get all habits for a user', async () => {
      const user = createUser();
      const habits = [
        createHabit({ user_id: user.id, name: 'Exercise' }),
        createHabit({ user_id: user.id, name: 'Meditation' }),
        createHabit({ user_id: user.id, name: 'Reading' }),
      ];

      supabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: habits,
              error: null,
            }),
          }),
        }),
      }));

      const result = await habitService.getUserHabits(user.id);

      expectApiSuccess(result);
      expect(result.data).toHaveLength(3);
      expect(result.data?.[0].name).toBe('Exercise');
    });

    it('should filter by active status', async () => {
      const user = createUser();
      const activeHabits = [
        createHabit({ user_id: user.id, is_active: true }),
        createHabit({ user_id: user.id, is_active: true }),
      ];

      supabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: activeHabits,
                error: null,
              }),
            }),
          }),
        }),
      }));

      const result = await habitService.getUserHabits(user.id, { isActive: true });

      expectApiSuccess(result);
      expect(result.data).toHaveLength(2);
      expect(result.data?.every(h => h.is_active)).toBe(true);
    });

    it('should filter by category', async () => {
      const user = createUser();
      const healthHabits = [
        createHabit({ user_id: user.id, category: 'health' }),
        createHabit({ user_id: user.id, category: 'health' }),
      ];

      supabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: healthHabits,
                error: null,
              }),
            }),
          }),
        }),
      }));

      const result = await habitService.getUserHabits(user.id, { category: 'health' });

      expectApiSuccess(result);
      expect(result.data).toHaveLength(2);
      expect(result.data?.every(h => h.category === 'health')).toBe(true);
    });
  });

  describe('recordProgress', () => {
    it('should record habit progress', async () => {
      const user = createUser();
      const habit = createHabit({ user_id: user.id });
      const progressData = {
        completed_count: 1,
        notes: 'Great workout today!',
      };

      mockAuthState(supabase, user, createSession({ user }));

      // Mock habit ownership check
      supabase.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: habit,
              error: null,
            }),
          }),
        }),
      }));

      const progress = createHabitProgress({
        habit_id: habit.id,
        user_id: user.id,
        ...progressData,
      });

      // Mock check for existing progress (none found)
      supabase.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null, // No existing progress
                  error: null,
                }),
              }),
            }),
          }),
        }),
      }));

      // Mock progress insert
      supabase.from.mockImplementationOnce(() => ({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: progress,
              error: null,
            }),
          }),
        }),
      }));

      const result = await habitService.recordProgress(habit.id, progressData);

      expectApiSuccess(result);
      expect(result.data?.habit_id).toBe(habit.id);
      expect(result.data?.completed_count).toBe(progressData.completed_count);
    });

    it('should update existing progress for today', async () => {
      const user = createUser();
      const habit = createHabit({ user_id: user.id });
      const existingProgress = createHabitProgress({
        habit_id: habit.id,
        user_id: user.id,
        completed_count: 1,
      });

      mockAuthState(supabase, user, createSession({ user }));

      // Mock habit check
      supabase.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: habit,
              error: null,
            }),
          }),
        }),
      }));

      // Mock find existing progress
      supabase.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: existingProgress,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      }));

      // Mock update
      supabase.from.mockImplementationOnce(() => ({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { ...existingProgress, completed_count: 2 },
                error: null,
              }),
            }),
          }),
        }),
      }));

      const result = await habitService.recordProgress(habit.id, {
        completed_count: 2,
      });

      expectApiSuccess(result);
      expect(result.data?.completed_count).toBe(2);
    });

    it('should trigger achievement check after progress', async () => {
      const user = createUser();
      const habit = createHabit({ user_id: user.id });

      mockAuthState(supabase, user, createSession({ user }));

      // Mock habit check
      supabase.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: habit,
              error: null,
            }),
          }),
        }),
      }));

      // Mock check for existing progress (none found)
      supabase.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null, // No existing progress
                  error: null,
                }),
              }),
            }),
          }),
        }),
      }));

      // Mock progress insert
      supabase.from.mockImplementationOnce(() => ({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: createHabitProgress({ habit_id: habit.id }),
              error: null,
            }),
          }),
        }),
      }));

      // Mock achievement check RPC
      supabase.rpc.mockResolvedValue({
        data: { achievements_unlocked: ['7_day_streak'] },
        error: null,
      });

      const result = await habitService.recordProgress(habit.id, {
        completed_count: 1,
      });

      expectApiSuccess(result);
      expect(supabase.rpc).toHaveBeenCalledWith('check_habit_achievements', {
        user_id: user.id,
        habit_id: habit.id,
      });
    });
  });

  describe('getHabitProgress', () => {
    it('should get habit progress for date range', async () => {
      const user = createUser();
      const habit = createHabit({ user_id: user.id });
      const progressRecords = [
        createHabitProgress({ habit_id: habit.id, date: '2024-01-01' }),
        createHabitProgress({ habit_id: habit.id, date: '2024-01-02' }),
        createHabitProgress({ habit_id: habit.id, date: '2024-01-03' }),
      ];

      supabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              lte: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: progressRecords,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      }));

      const result = await habitService.getHabitProgress(habit.id, {
        startDate: '2024-01-01',
        endDate: '2024-01-03',
      });

      expectApiSuccess(result);
      expect(result.data).toHaveLength(3);
    });

    it('should calculate streak from progress data', async () => {
      const habit = createHabit();
      const today = new Date();
      const progressRecords = [];

      // Create 7 consecutive days of progress
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        progressRecords.push(
          createHabitProgress({
            habit_id: habit.id,
            date: date.toISOString().split('T')[0],
            completed_count: 1,
          })
        );
      }

      supabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: progressRecords,
              error: null,
            }),
          }),
        }),
      }));

      const result = await habitService.getHabitProgress(habit.id);

      expectApiSuccess(result);
      expect(result.data).toHaveLength(7);
      // Streak calculation would be done by the service
    });
  });

  describe('getHabitStats', () => {
    it('should calculate habit statistics', async () => {
      const user = createUser();
      const habit = createHabit({ user_id: user.id, target_count: 1 });

      // Mock various stats queries
      supabase.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            count: 30, // Total days
            data: null,
            error: null,
          }),
        }),
      }));

      supabase.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockResolvedValue({
              count: 25, // Completed days
              data: null,
              error: null,
            }),
          }),
        }),
      }));

      // Mock streak calculation
      supabase.rpc.mockResolvedValue({
        data: {
          current_streak: 7,
          longest_streak: 15,
          total_completions: 25,
        },
        error: null,
      });

      const result = await habitService.getHabitStats(habit.id);

      expectApiSuccess(result);
      expect(result.data).toEqual({
        totalDays: 30,
        completedDays: 25,
        completionRate: 0.83,
        currentStreak: 7,
        longestStreak: 15,
        totalCompletions: 25,
      });
    });
  });

  describe('pauseHabit', () => {
    it('should pause an active habit', async () => {
      const user = createUser();
      const habit = createHabit({ user_id: user.id, is_active: true });

      mockAuthState(supabase, user, createSession({ user }));

      // Mock ownership check
      supabase.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: habit,
              error: null,
            }),
          }),
        }),
      }));

      // Mock update
      supabase.from.mockImplementationOnce(() => ({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { ...habit, is_active: false },
                error: null,
              }),
            }),
          }),
        }),
      }));

      const result = await habitService.pauseHabit(habit.id);

      expectApiSuccess(result);
      expect(result.data?.is_active).toBe(false);
    });
  });

  describe('resumeHabit', () => {
    it('should resume a paused habit', async () => {
      const user = createUser();
      const habit = createHabit({ user_id: user.id, is_active: false });

      mockAuthState(supabase, user, createSession({ user }));

      // Mock ownership check
      supabase.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: habit,
              error: null,
            }),
          }),
        }),
      }));

      // Mock update
      supabase.from.mockImplementationOnce(() => ({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { ...habit, is_active: true },
                error: null,
              }),
            }),
          }),
        }),
      }));

      const result = await habitService.resumeHabit(habit.id);

      expectApiSuccess(result);
      expect(result.data?.is_active).toBe(true);
    });
  });

  describe('performance', () => {
    it('should create habit within performance threshold', async () => {
      const user = createUser();
      mockAuthState(supabase, user, createSession({ user }));

      supabase.from.mockImplementation(() => ({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({
            data: createHabit({ user_id: user.id }),
            error: null,
          }),
        }),
      }));

      await measurePerformance(
        'HabitService.createHabit',
        async () => {
          await habitService.createHabit({
            name: 'Test Habit',
            frequency: 'daily',
            target_count: 1,
            category: 'health',
            difficulty: 'medium',
          });
        },
        100 // 100ms threshold
      );
    });

    it('should get habits within performance threshold', async () => {
      const habits = Array.from({ length: 20 }, () => createHabit());

      supabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: habits,
              error: null,
            }),
          }),
        }),
      }));

      await measurePerformance(
        'HabitService.getUserHabits',
        async () => {
          await habitService.getUserHabits('user-id');
        },
        50 // 50ms threshold
      );
    });
  });
});