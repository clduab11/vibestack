import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AnalyticsService } from '../../../services/analytics.service';
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
  createSession,
  createHabit,
  createHabitProgress,
  createAchievement,
  createUserAchievement,
  createChallenge,
  createFriend,
  testScenarios,
} from '../../fixtures/test-data';

describe('AnalyticsService', () => {
  let analyticsService: AnalyticsService;
  let supabase: SupabaseMock;

  beforeEach(() => {
    const test = setupTest();
    supabase = test.supabase;
    analyticsService = new AnalyticsService(supabase as any);
  });

  afterEach(() => {
    teardownTest();
  });

  describe('getUserAnalytics', () => {
    it('should get comprehensive user analytics', async () => {
      const user = createUser();
      const today = new Date();
      const lastWeek = new Date(today);
      lastWeek.setDate(today.getDate() - 7);

      mockAuthState(supabase, user, createSession({ user }));

      // Mock habit analytics
      supabase.rpc.mockImplementationOnce(() => Promise.resolve({
        data: {
          total_habits: 5,
          active_habits: 4,
          completion_rate: 0.75,
          average_streak: 12.5,
          best_streak: 30,
          total_completions: 150,
        },
        error: null,
      }));

      // Mock achievement analytics
      supabase.rpc.mockImplementationOnce(() => Promise.resolve({
        data: {
          total_achievements: 15,
          recent_achievements: 3,
          points_earned: 1500,
          achievement_rate: 0.6,
        },
        error: null,
      }));

      // Mock social analytics
      supabase.rpc.mockImplementationOnce(() => Promise.resolve({
        data: {
          total_friends: 10,
          active_friends: 8,
          challenges_participated: 5,
          challenges_won: 2,
          social_engagement_score: 85,
        },
        error: null,
      }));

      const result = await analyticsService.getUserAnalytics(user.id, {
        startDate: lastWeek.toISOString(),
        endDate: today.toISOString(),
      });

      expectApiSuccess(result);
      expect(result.data?.habits).toBeDefined();
      expect(result.data?.achievements).toBeDefined();
      expect(result.data?.social).toBeDefined();
      expect(result.data?.habits.completionRate).toBe(0.75);
    });

    it('should require authentication for own analytics', async () => {
      mockAuthState(supabase, null, null);

      const result = await analyticsService.getUserAnalytics('user-id');

      expectApiError(result, {
        code: 'UNAUTHORIZED',
        message: 'Must be authenticated',
      });
    });

    it('should prevent accessing other user analytics without permission', async () => {
      const currentUser = createUser();
      const otherUser = createUser();

      mockAuthState(supabase, currentUser, createSession({ user: currentUser }));

      const result = await analyticsService.getUserAnalytics(otherUser.id);

      expectApiError(result, {
        code: 'FORBIDDEN',
        message: 'Cannot access analytics for another user',
      });
    });
  });

  describe('getHabitAnalytics', () => {
    it('should get detailed habit analytics', async () => {
      const user = createUser();
      const habit = createHabit({ user_id: user.id });

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

      // Mock habit analytics RPC
      supabase.rpc.mockResolvedValue({
        data: {
          total_days: 30,
          completed_days: 22,
          completion_rate: 0.73,
          current_streak: 7,
          longest_streak: 15,
          average_daily_count: 1.2,
          weekly_pattern: {
            monday: 0.8,
            tuesday: 0.9,
            wednesday: 0.7,
            thursday: 0.85,
            friday: 0.6,
            saturday: 0.5,
            sunday: 0.7,
          },
          hourly_distribution: {
            morning: 0.6,
            afternoon: 0.3,
            evening: 0.1,
          },
        },
        error: null,
      });

      const result = await analyticsService.getHabitAnalytics(habit.id);

      expectApiSuccess(result);
      expect(result.data?.completionRate).toBe(0.73);
      expect(result.data?.weeklyPattern).toBeDefined();
      expect(result.data?.weeklyPattern.monday).toBe(0.8);
    });

    it('should include trend analysis', async () => {
      const user = createUser();
      const habit = createHabit({ user_id: user.id });

      mockAuthState(supabase, user, createSession({ user }));

      // Mock habit ownership
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

      // Mock analytics with trend data
      supabase.rpc.mockResolvedValue({
        data: {
          total_days: 60,
          completed_days: 45,
          completion_rate: 0.75,
          current_streak: 10,
          longest_streak: 20,
          trend: {
            direction: 'improving',
            change_percentage: 15,
            prediction_next_week: 0.82,
          },
        },
        error: null,
      });

      const result = await analyticsService.getHabitAnalytics(habit.id, {
        includeTrends: true,
      });

      expectApiSuccess(result);
      expect(result.data?.trend).toBeDefined();
      expect(result.data?.trend?.direction).toBe('improving');
      expect(result.data?.trend?.changePercentage).toBe(15);
    });
  });

  describe('getProgressTrends', () => {
    it('should calculate progress trends over time', async () => {
      const user = createUser();
      const habits = [
        createHabit({ user_id: user.id }),
        createHabit({ user_id: user.id }),
      ];

      mockAuthState(supabase, user, createSession({ user }));

      // Mock trend calculation
      supabase.rpc.mockResolvedValue({
        data: {
          daily_trends: [
            { date: '2024-01-01', completion_rate: 0.6 },
            { date: '2024-01-02', completion_rate: 0.8 },
            { date: '2024-01-03', completion_rate: 0.7 },
            { date: '2024-01-04', completion_rate: 0.9 },
            { date: '2024-01-05', completion_rate: 0.85 },
          ],
          weekly_average: 0.77,
          monthly_average: 0.72,
          improvement_rate: 0.12,
        },
        error: null,
      });

      const result = await analyticsService.getProgressTrends(user.id, {
        period: 'week',
        habitIds: habits.map(h => h.id),
      });

      expectApiSuccess(result);
      expect(result.data?.dailyTrends).toHaveLength(5);
      expect(result.data?.weeklyAverage).toBe(0.77);
      expect(result.data?.improvementRate).toBe(0.12);
    });

    it('should handle different time periods', async () => {
      const user = createUser();
      mockAuthState(supabase, user, createSession({ user }));

      // Mock monthly trends
      supabase.rpc.mockResolvedValue({
        data: {
          daily_trends: Array.from({ length: 30 }, (_, i) => ({
            date: new Date(2024, 0, i + 1).toISOString().split('T')[0],
            completion_rate: 0.5 + Math.random() * 0.5,
          })),
          weekly_average: 0.75,
          monthly_average: 0.73,
          improvement_rate: 0.08,
        },
        error: null,
      });

      const result = await analyticsService.getProgressTrends(user.id, {
        period: 'month',
      });

      expectApiSuccess(result);
      expect(result.data?.dailyTrends).toHaveLength(30);
    });
  });

  describe('getAchievementStats', () => {
    it('should get achievement statistics', async () => {
      const user = createUser();

      mockAuthState(supabase, user, createSession({ user }));

      // Mock achievement stats
      supabase.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            count: 20, // Total achievements
            data: null,
            error: null,
          }),
        }),
      }));

      supabase.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            count: 12, // Unlocked achievements
            data: null,
            error: null,
          }),
        }),
      }));

      // Mock category breakdown
      supabase.rpc.mockResolvedValue({
        data: [
          { category: 'streak', count: 5, total: 8 },
          { category: 'social', count: 3, total: 6 },
          { category: 'milestone', count: 4, total: 6 },
        ],
        error: null,
      });

      const result = await analyticsService.getAchievementStats(user.id);

      expectApiSuccess(result);
      expect(result.data?.totalAchievements).toBe(20);
      expect(result.data?.unlockedAchievements).toBe(12);
      expect(result.data?.completionRate).toBe(0.6);
      expect(result.data?.categoryBreakdown).toHaveLength(3);
    });

    it('should include recent achievements', async () => {
      const user = createUser();
      const recentAchievements = [
        createUserAchievement({ user_id: user.id, unlocked_at: new Date().toISOString() }),
        createUserAchievement({ user_id: user.id, unlocked_at: new Date().toISOString() }),
      ];

      mockAuthState(supabase, user, createSession({ user }));

      // Mock counts
      supabase.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            count: 20,
            data: null,
            error: null,
          }),
        }),
      }));

      supabase.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            count: vi.fn().mockResolvedValue({
              count: 12,
              data: null,
              error: null,
            }),
          }),
        }),
      }));

      // Mock recent achievements
      supabase.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: recentAchievements,
                error: null,
              }),
            }),
          }),
        }),
      }));

      // Mock category breakdown
      supabase.rpc.mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await analyticsService.getAchievementStats(user.id, {
        includeRecent: true,
      });

      expectApiSuccess(result);
      expect(result.data?.recentAchievements).toHaveLength(2);
    });
  });

  describe('getSocialStats', () => {
    it('should get social interaction statistics', async () => {
      const user = createUser();

      mockAuthState(supabase, user, createSession({ user }));

      // Mock social stats RPC
      supabase.rpc.mockResolvedValue({
        data: {
          total_friends: 15,
          active_friends_last_week: 10,
          challenges_created: 3,
          challenges_participated: 8,
          challenges_won: 4,
          win_rate: 0.5,
          social_score: 850,
          ranking: 42,
          interaction_frequency: {
            daily: 0.8,
            weekly: 0.95,
            monthly: 1.0,
          },
        },
        error: null,
      });

      const result = await analyticsService.getSocialStats(user.id);

      expectApiSuccess(result);
      expect(result.data?.totalFriends).toBe(15);
      expect(result.data?.challengeWinRate).toBe(0.5);
      expect(result.data?.socialScore).toBe(850);
      expect(result.data?.ranking).toBe(42);
    });

    it('should include friend activity stats', async () => {
      const user = createUser();

      mockAuthState(supabase, user, createSession({ user }));

      // Mock with friend activity
      supabase.rpc.mockResolvedValue({
        data: {
          total_friends: 10,
          active_friends_last_week: 7,
          friend_activity: [
            { friend_id: 'friend1', shared_habits: 3, interaction_score: 85 },
            { friend_id: 'friend2', shared_habits: 2, interaction_score: 65 },
            { friend_id: 'friend3', shared_habits: 4, interaction_score: 95 },
          ],
          average_friend_interaction: 81.67,
        },
        error: null,
      });

      const result = await analyticsService.getSocialStats(user.id, {
        includeFriendActivity: true,
      });

      expectApiSuccess(result);
      expect(result.data?.friendActivity).toHaveLength(3);
      expect(result.data?.averageFriendInteraction).toBeCloseTo(81.67);
    });
  });

  describe('generateInsights', () => {
    it('should generate AI-powered insights', async () => {
      const user = createUser();

      mockAuthState(supabase, user, createSession({ user }));

      // Mock data collection for insights
      supabase.rpc.mockImplementationOnce().mockResolvedValue({
        data: {
          habit_data: {
            total: 5,
            completion_rate: 0.72,
            improving_habits: ['Exercise', 'Reading'],
            struggling_habits: ['Meditation'],
          },
          achievement_data: {
            recent_unlocks: 3,
            next_achievable: ['30 Day Streak', 'Social Butterfly'],
          },
          social_data: {
            engagement_trend: 'increasing',
            top_interactions: ['friend1', 'friend2'],
          },
        },
        error: null,
      });

      // Mock AI insights generation
      supabase.rpc.mockImplementationOnce().mockResolvedValue({
        data: {
          insights: [
            {
              type: 'habit_improvement',
              title: 'Great progress on Exercise!',
              description: 'Your exercise habit has improved by 25% this month',
              recommendation: 'Consider increasing your daily target',
              priority: 'high',
            },
            {
              type: 'habit_struggle',
              title: 'Meditation needs attention',
              description: 'You\'ve missed 5 days in a row',
              recommendation: 'Try setting a reminder or reducing session length',
              priority: 'medium',
            },
            {
              type: 'social_opportunity',
              title: 'Challenge a friend!',
              description: 'You haven\'t created a challenge in 2 weeks',
              recommendation: 'Challenge friend1 to a 7-day streak',
              priority: 'low',
            },
          ],
          summary: 'Overall positive trend with room for improvement in consistency',
        },
        error: null,
      });

      const result = await analyticsService.generateInsights(user.id);

      expectApiSuccess(result);
      expect(result.data?.insights).toHaveLength(3);
      expect(result.data?.insights[0].type).toBe('habit_improvement');
      expect(result.data?.summary).toBeDefined();
    });

    it('should handle insight generation errors gracefully', async () => {
      const user = createUser();

      mockAuthState(supabase, user, createSession({ user }));

      // Mock data collection success
      supabase.rpc.mockImplementationOnce(() => Promise.resolve({
        data: { habit_data: {} },
        error: null,
      }));

      // Mock AI insights failure
      supabase.rpc.mockImplementationOnce(() => Promise.resolve({
        data: null,
        error: createSupabaseError('AI service unavailable'),
      }));

      const result = await analyticsService.generateInsights(user.id);

      // Should return default insights on AI failure
      expectApiSuccess(result);
      expect(result.data?.insights).toHaveLength(0);
      expect(result.data?.summary).toBe('Unable to generate insights at this time');
    });
  });

  describe('exportAnalytics', () => {
    it('should export analytics data in specified format', async () => {
      const user = createUser();

      mockAuthState(supabase, user, createSession({ user }));

      // Mock comprehensive data collection
      const mockData = {
        user_info: { id: user.id, created_at: user.created_at },
        habits: { total: 5, active: 4 },
        achievements: { total: 20, unlocked: 12 },
        social: { friends: 10, challenges: 5 },
      };

      supabase.rpc.mockResolvedValue({
        data: mockData,
        error: null,
      });

      const result = await analyticsService.exportAnalytics(user.id, {
        format: 'json',
        includeRawData: true,
      });

      expectApiSuccess(result);
      expect(result.data?.format).toBe('json');
      expect(result.data?.data).toEqual(mockData);
    });

    it('should support CSV export format', async () => {
      const user = createUser();

      mockAuthState(supabase, user, createSession({ user }));

      // Mock data
      supabase.rpc.mockResolvedValue({
        data: {
          habits: [
            { name: 'Exercise', completionRate: 0.8 },
            { name: 'Reading', completionRate: 0.6 },
          ],
        },
        error: null,
      });

      const result = await analyticsService.exportAnalytics(user.id, {
        format: 'csv',
        sections: ['habits'],
      });

      expectApiSuccess(result);
      expect(result.data?.format).toBe('csv');
      expect(result.data?.data).toContain('name,completionRate');
      expect(result.data?.data).toContain('Exercise,0.8');
    });
  });

  describe('performance', () => {
    it('should get user analytics within performance threshold', async () => {
      const user = createUser();
      mockAuthState(supabase, user, createSession({ user }));

      // Mock all RPC calls
      supabase.rpc.mockImplementation(() => Promise.resolve({
        data: { total: 10 },
        error: null,
      }));

      await measurePerformance(
        'AnalyticsService.getUserAnalytics',
        async () => {
          await analyticsService.getUserAnalytics(user.id);
        },
        200 // 200ms threshold for complex analytics
      );
    });

    it('should generate insights within performance threshold', async () => {
      const user = createUser();
      mockAuthState(supabase, user, createSession({ user }));

      supabase.rpc.mockImplementation(() => Promise.resolve({
        data: { insights: [] },
        error: null,
      }));

      await measurePerformance(
        'AnalyticsService.generateInsights',
        async () => {
          await analyticsService.generateInsights(user.id);
        },
        300 // 300ms threshold for AI insights
      );
    });
  });
});