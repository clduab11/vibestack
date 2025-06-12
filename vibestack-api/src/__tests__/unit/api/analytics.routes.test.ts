import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import {
  createUser,
  createAnalytics,
  createHabit,
  createHabitProgress,
} from '../../fixtures/test-data';

// Mock supabase for auth middleware
const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
};

// First, mock the supabase config
vi.mock('../../../config/supabase', () => ({
  supabase: mockSupabase,
}));

// Mock the services module
const mockAnalyticsService = {
  getDashboardStats: vi.fn(),
  getHabitAnalytics: vi.fn(),
  getCategoryAnalytics: vi.fn(),
  getTimeBasedAnalytics: vi.fn(),
  getStreakAnalytics: vi.fn(),
  getCompletionTrends: vi.fn(),
  exportAnalytics: vi.fn(),
  getInsights: vi.fn(),
  getComparison: vi.fn(),
};

vi.mock('../../../services', () => ({
  AnalyticsService: vi.fn().mockImplementation(() => mockAnalyticsService),
}));

// Now import the routes after mocking
const { analyticsRoutes } = await import('../../../api/routes/analyticsRoutes');
const { resetRateLimits } = await import('../../../middleware/rateLimitingMiddleware');

describe('Analytics Routes', () => {
  let app: express.Application;
  let analyticsService: typeof mockAnalyticsService;
  let authenticatedUser: any;

  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimits();
    app = express();
    app.use(express.json());
    analyticsService = mockAnalyticsService;
    app.use('/analytics', analyticsRoutes);
    
    // Setup authenticated user
    authenticatedUser = createUser();
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: authenticatedUser },
      error: null,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    resetRateLimits();
  });

  describe('GET /analytics/dashboard', () => {
    it('should get dashboard statistics', async () => {
      const dashboardStats = {
        active_habits: 5,
        completed_today: 3,
        current_streak: 7,
        longest_streak: 30,
        total_completions: 150,
        completion_rate: 0.85,
        points_earned: 1200,
        achievements_unlocked: 8,
      };

      analyticsService.getDashboardStats.mockResolvedValue({
        success: true,
        data: dashboardStats,
      });

      const response = await request(app)
        .get('/analytics/dashboard')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(dashboardStats);
      expect(analyticsService.getDashboardStats).toHaveBeenCalledWith(
        authenticatedUser.id,
        {}
      );
    });

    it('should support period filter', async () => {
      analyticsService.getDashboardStats.mockResolvedValue({
        success: true,
        data: {},
      });

      const response = await request(app)
        .get('/analytics/dashboard?period=7d')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(analyticsService.getDashboardStats).toHaveBeenCalledWith(
        authenticatedUser.id,
        { period: '7d' }
      );
    });

    it('should require authentication', async () => {
      const response = await request(app).get('/analytics/dashboard');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('GET /analytics/habits/:habitId', () => {
    it('should get specific habit analytics', async () => {
      const habitId = 'habit-123';
      const habitAnalytics = createAnalytics({
        habit_id: habitId,
        completion_rate: 0.85,
        streak_current: 7,
      });

      analyticsService.getHabitAnalytics.mockResolvedValue({
        success: true,
        data: habitAnalytics,
      });

      const response = await request(app)
        .get(`/analytics/habits/${habitId}`)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.habit_id).toBe(habitId);
      expect(analyticsService.getHabitAnalytics).toHaveBeenCalledWith(
        habitId,
        authenticatedUser.id,
        {}
      );
    });

    it('should support date range filters', async () => {
      const habitId = 'habit-123';
      
      analyticsService.getHabitAnalytics.mockResolvedValue({
        success: true,
        data: createAnalytics(),
      });

      const response = await request(app)
        .get(`/analytics/habits/${habitId}?startDate=2025-01-01&endDate=2025-01-31`)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(analyticsService.getHabitAnalytics).toHaveBeenCalledWith(
        habitId,
        authenticatedUser.id,
        {
          startDate: '2025-01-01',
          endDate: '2025-01-31',
        }
      );
    });

    it('should handle habit not found', async () => {
      const habitId = 'non-existent';

      analyticsService.getHabitAnalytics.mockResolvedValue({
        success: false,
        error: {
          code: 'HABIT_NOT_FOUND',
          message: 'Habit not found',
        },
      });

      const response = await request(app)
        .get(`/analytics/habits/${habitId}`)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('HABIT_NOT_FOUND');
    });
  });

  describe('GET /analytics/categories', () => {
    it('should get category analytics', async () => {
      const categoryAnalytics = [
        {
          category: 'health',
          habit_count: 3,
          completion_rate: 0.8,
          total_completions: 45,
        },
        {
          category: 'productivity',
          habit_count: 2,
          completion_rate: 0.9,
          total_completions: 30,
        },
      ];

      analyticsService.getCategoryAnalytics.mockResolvedValue({
        success: true,
        data: categoryAnalytics,
      });

      const response = await request(app)
        .get('/analytics/categories')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(analyticsService.getCategoryAnalytics).toHaveBeenCalledWith(
        authenticatedUser.id,
        {}
      );
    });

    it('should filter by specific category', async () => {
      analyticsService.getCategoryAnalytics.mockResolvedValue({
        success: true,
        data: [],
      });

      const response = await request(app)
        .get('/analytics/categories?category=health')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(analyticsService.getCategoryAnalytics).toHaveBeenCalledWith(
        authenticatedUser.id,
        { category: 'health' }
      );
    });
  });

  describe('GET /analytics/time-based', () => {
    it('should get time-based analytics', async () => {
      const timeBasedData = {
        hourly_distribution: Array(24).fill(0).map((_, i) => ({
          hour: i,
          completions: Math.floor(Math.random() * 10),
        })),
        daily_distribution: [
          { day: 'Monday', completions: 15 },
          { day: 'Tuesday', completions: 12 },
        ],
        best_time: '09:00',
        best_day: 'Monday',
      };

      analyticsService.getTimeBasedAnalytics.mockResolvedValue({
        success: true,
        data: timeBasedData,
      });

      const response = await request(app)
        .get('/analytics/time-based')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.best_time).toBe('09:00');
      expect(analyticsService.getTimeBasedAnalytics).toHaveBeenCalledWith(
        authenticatedUser.id,
        {}
      );
    });

    it('should support granularity parameter', async () => {
      analyticsService.getTimeBasedAnalytics.mockResolvedValue({
        success: true,
        data: {},
      });

      const response = await request(app)
        .get('/analytics/time-based?granularity=weekly')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(analyticsService.getTimeBasedAnalytics).toHaveBeenCalledWith(
        authenticatedUser.id,
        { granularity: 'weekly' }
      );
    });
  });

  describe('GET /analytics/streaks', () => {
    it('should get streak analytics', async () => {
      const streakData = {
        current_streaks: [
          { habit_id: 'habit-1', streak: 7 },
          { habit_id: 'habit-2', streak: 14 },
        ],
        longest_streaks: [
          { habit_id: 'habit-1', streak: 30 },
          { habit_id: 'habit-2', streak: 45 },
        ],
        average_streak: 12.5,
        total_perfect_days: 25,
      };

      analyticsService.getStreakAnalytics.mockResolvedValue({
        success: true,
        data: streakData,
      });

      const response = await request(app)
        .get('/analytics/streaks')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.average_streak).toBe(12.5);
      expect(analyticsService.getStreakAnalytics).toHaveBeenCalledWith(
        authenticatedUser.id
      );
    });
  });

  describe('GET /analytics/trends', () => {
    it('should get completion trends', async () => {
      const trendData = {
        daily_trends: [
          { date: '2025-01-01', completion_rate: 0.8 },
          { date: '2025-01-02', completion_rate: 0.85 },
        ],
        weekly_average: 0.82,
        monthly_average: 0.78,
        trend_direction: 'improving',
        improvement_rate: 0.05,
      };

      analyticsService.getCompletionTrends.mockResolvedValue({
        success: true,
        data: trendData,
      });

      const response = await request(app)
        .get('/analytics/trends')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.trend_direction).toBe('improving');
      expect(analyticsService.getCompletionTrends).toHaveBeenCalledWith(
        authenticatedUser.id,
        {}
      );
    });

    it('should support period parameter', async () => {
      analyticsService.getCompletionTrends.mockResolvedValue({
        success: true,
        data: {},
      });

      const response = await request(app)
        .get('/analytics/trends?period=30d')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(analyticsService.getCompletionTrends).toHaveBeenCalledWith(
        authenticatedUser.id,
        { period: '30d' }
      );
    });
  });

  describe('GET /analytics/export', () => {
    it('should export analytics data', async () => {
      const exportData = {
        user_id: authenticatedUser.id,
        export_date: new Date().toISOString(),
        period: '30d',
        habits: [],
        analytics: {},
        insights: [],
      };

      analyticsService.exportAnalytics.mockResolvedValue({
        success: true,
        data: exportData,
      });

      const response = await request(app)
        .get('/analytics/export')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user_id).toBe(authenticatedUser.id);
      expect(analyticsService.exportAnalytics).toHaveBeenCalledWith(
        authenticatedUser.id,
        {}
      );
    });

    it('should support format parameter', async () => {
      analyticsService.exportAnalytics.mockResolvedValue({
        success: true,
        data: {},
      });

      const response = await request(app)
        .get('/analytics/export?format=csv')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(analyticsService.exportAnalytics).toHaveBeenCalledWith(
        authenticatedUser.id,
        { format: 'csv' }
      );
    });

    it('should validate format parameter', async () => {
      const response = await request(app)
        .get('/analytics/export?format=invalid')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /analytics/insights', () => {
    it('should get AI-generated insights', async () => {
      const insights = [
        {
          type: 'pattern',
          title: 'Morning Productivity Peak',
          description: 'You complete 80% of habits between 7-9 AM',
          recommendation: 'Schedule important habits during morning hours',
          confidence: 0.9,
        },
        {
          type: 'improvement',
          title: 'Weekend Consistency',
          description: 'Completion rate drops 30% on weekends',
          recommendation: 'Set reminders for weekend habits',
          confidence: 0.85,
        },
      ];

      analyticsService.getInsights.mockResolvedValue({
        success: true,
        data: insights,
      });

      const response = await request(app)
        .get('/analytics/insights')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(analyticsService.getInsights).toHaveBeenCalledWith(
        authenticatedUser.id,
        {}
      );
    });

    it('should filter by insight type', async () => {
      analyticsService.getInsights.mockResolvedValue({
        success: true,
        data: [],
      });

      const response = await request(app)
        .get('/analytics/insights?type=pattern')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(analyticsService.getInsights).toHaveBeenCalledWith(
        authenticatedUser.id,
        { type: 'pattern' }
      );
    });
  });

  describe('GET /analytics/comparison', () => {
    it('should get comparison data', async () => {
      const comparisonData = {
        user_percentile: 85,
        category_rankings: {
          health: { percentile: 90, avg_completion: 0.75 },
          productivity: { percentile: 75, avg_completion: 0.82 },
        },
        vs_average: {
          completion_rate: { user: 0.85, average: 0.65 },
          streak_length: { user: 14, average: 7 },
        },
      };

      analyticsService.getComparison.mockResolvedValue({
        success: true,
        data: comparisonData,
      });

      const response = await request(app)
        .get('/analytics/comparison')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user_percentile).toBe(85);
      expect(analyticsService.getComparison).toHaveBeenCalledWith(
        authenticatedUser.id,
        {}
      );
    });

    it('should support anonymous comparison', async () => {
      analyticsService.getComparison.mockResolvedValue({
        success: true,
        data: {},
      });

      const response = await request(app)
        .get('/analytics/comparison?anonymous=true')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(analyticsService.getComparison).toHaveBeenCalledWith(
        authenticatedUser.id,
        { anonymous: true }
      );
    });
  });

  describe('Rate limiting', () => {
    it('should rate limit export requests', async () => {
      analyticsService.exportAnalytics.mockResolvedValue({
        success: true,
        data: {},
      });

      // Make multiple requests
      for (let i = 0; i < 11; i++) {
        await request(app)
          .get('/analytics/export')
          .set('Authorization', 'Bearer valid-token');
      }

      // Next request should be rate limited
      const response = await request(app)
        .get('/analytics/export')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(429);
      expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    });

    it('should rate limit insights requests', async () => {
      analyticsService.getInsights.mockResolvedValue({
        success: true,
        data: [],
      });

      // Make multiple requests
      for (let i = 0; i < 21; i++) {
        await request(app)
          .get('/analytics/insights')
          .set('Authorization', 'Bearer valid-token');
      }

      // Next request should be rate limited
      const response = await request(app)
        .get('/analytics/insights')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(429);
      expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    });
  });
});