import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import {
  createUser,
  createHabit,
  createHabitProgress,
  createAnalytics,
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
const mockHabitService = {
  getHabits: vi.fn(),
  getHabit: vi.fn(),
  createHabit: vi.fn(),
  updateHabit: vi.fn(),
  deleteHabit: vi.fn(),
  recordProgress: vi.fn(),
  getProgress: vi.fn(),
  getStreak: vi.fn(),
  updateReminder: vi.fn(),
  getAnalytics: vi.fn(),
  pauseHabit: vi.fn(),
  resumeHabit: vi.fn(),
};

vi.mock('../../../services', () => ({
  HabitService: vi.fn().mockImplementation(() => mockHabitService),
}));

// Now import the routes after mocking
const { habitRoutes } = await import('../../../api/routes/habitRoutes');
const { resetRateLimits } = await import('../../../middleware/rateLimitingMiddleware');

describe('Habit Management Routes', () => {
  let app: express.Application;
  let habitService: typeof mockHabitService;
  let authenticatedUser: any;

  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimits();
    app = express();
    app.use(express.json());
    habitService = mockHabitService;
    app.use('/habits', habitRoutes);
    
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

  describe('GET /habits', () => {
    it('should get all user habits', async () => {
      const habits = [
        createHabit({ user_id: authenticatedUser.id }),
        createHabit({ user_id: authenticatedUser.id }),
      ];

      habitService.getHabits.mockResolvedValue({
        success: true,
        data: habits,
      });

      const response = await request(app)
        .get('/habits')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(habitService.getHabits).toHaveBeenCalledWith(authenticatedUser.id, {});
    });

    it('should filter habits by status', async () => {
      habitService.getHabits.mockResolvedValue({
        success: true,
        data: [createHabit({ is_active: true })],
      });

      const response = await request(app)
        .get('/habits?status=active')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(habitService.getHabits).toHaveBeenCalledWith(authenticatedUser.id, {
        status: 'active',
      });
    });

    it('should filter habits by category', async () => {
      habitService.getHabits.mockResolvedValue({
        success: true,
        data: [createHabit({ category: 'health' })],
      });

      const response = await request(app)
        .get('/habits?category=health')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(habitService.getHabits).toHaveBeenCalledWith(authenticatedUser.id, {
        category: 'health',
      });
    });

    it('should require authentication', async () => {
      const response = await request(app).get('/habits');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('GET /habits/:habitId', () => {
    it('should get a specific habit', async () => {
      const habit = createHabit({ user_id: authenticatedUser.id });
      
      habitService.getHabit.mockResolvedValue({
        success: true,
        data: habit,
      });

      const response = await request(app)
        .get(`/habits/${habit.id}`)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(habit);
      expect(habitService.getHabit).toHaveBeenCalledWith(
        habit.id,
        authenticatedUser.id
      );
    });

    it('should handle habit not found', async () => {
      habitService.getHabit.mockResolvedValue({
        success: false,
        error: {
          code: 'HABIT_NOT_FOUND',
          message: 'Habit not found',
        },
      });

      const response = await request(app)
        .get('/habits/non-existent')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('HABIT_NOT_FOUND');
    });
  });

  describe('POST /habits', () => {
    it('should create a new habit', async () => {
      const newHabitData = {
        name: 'Morning Exercise',
        description: 'Exercise for 30 minutes',
        category: 'health',
        target_type: 'count',
        target_value: 1,
        frequency: 'daily',
        reminder_time: '07:00',
      };

      const createdHabit = createHabit({
        ...newHabitData,
        user_id: authenticatedUser.id,
      });

      habitService.createHabit.mockResolvedValue({
        success: true,
        data: createdHabit,
      });

      const response = await request(app)
        .post('/habits')
        .set('Authorization', 'Bearer valid-token')
        .send(newHabitData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(newHabitData.name);
      expect(habitService.createHabit).toHaveBeenCalledWith(
        authenticatedUser.id,
        newHabitData
      );
    });

    it('should validate required fields', async () => {
      const invalidData = {
        // Missing required fields
        category: 'health',
      };

      const response = await request(app)
        .post('/habits')
        .set('Authorization', 'Bearer valid-token')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should validate frequency values', async () => {
      const invalidData = {
        name: 'Test Habit',
        category: 'health',
        target_type: 'count',
        target_value: 1,
        frequency: 'invalid',
      };

      const response = await request(app)
        .post('/habits')
        .set('Authorization', 'Bearer valid-token')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PUT /habits/:habitId', () => {
    it('should update a habit', async () => {
      const habitId = 'habit-123';
      const updateData = {
        name: 'Updated Exercise',
        target_value: 2,
      };

      const updatedHabit = createHabit({
        id: habitId,
        ...updateData,
      });

      habitService.updateHabit.mockResolvedValue({
        success: true,
        data: updatedHabit,
      });

      const response = await request(app)
        .put(`/habits/${habitId}`)
        .set('Authorization', 'Bearer valid-token')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateData.name);
      expect(habitService.updateHabit).toHaveBeenCalledWith(
        habitId,
        authenticatedUser.id,
        updateData
      );
    });

    it('should handle forbidden updates', async () => {
      const habitId = 'habit-123';

      habitService.updateHabit.mockResolvedValue({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Cannot update habit owned by another user',
        },
      });

      const response = await request(app)
        .put(`/habits/${habitId}`)
        .set('Authorization', 'Bearer valid-token')
        .send({ name: 'Updated' });

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('DELETE /habits/:habitId', () => {
    it('should delete a habit', async () => {
      const habitId = 'habit-123';

      habitService.deleteHabit.mockResolvedValue({
        success: true,
      });

      const response = await request(app)
        .delete(`/habits/${habitId}`)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(habitService.deleteHabit).toHaveBeenCalledWith(
        habitId,
        authenticatedUser.id
      );
    });
  });

  describe('POST /habits/:habitId/progress', () => {
    it('should record habit progress', async () => {
      const habitId = 'habit-123';
      const progressData = {
        value: 1,
        date: '2025-01-06',
        notes: 'Completed morning run',
      };

      const progress = createHabitProgress({
        habit_id: habitId,
        ...progressData,
      });

      habitService.recordProgress.mockResolvedValue({
        success: true,
        data: progress,
      });

      const response = await request(app)
        .post(`/habits/${habitId}/progress`)
        .set('Authorization', 'Bearer valid-token')
        .send(progressData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.value).toBe(progressData.value);
      expect(habitService.recordProgress).toHaveBeenCalledWith(
        habitId,
        authenticatedUser.id,
        progressData
      );
    });

    it('should validate progress value', async () => {
      const habitId = 'habit-123';
      const invalidData = {
        value: -1, // Negative value
        date: '2025-01-06',
      };

      const response = await request(app)
        .post(`/habits/${habitId}/progress`)
        .set('Authorization', 'Bearer valid-token')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should validate date format', async () => {
      const habitId = 'habit-123';
      const invalidData = {
        value: 1,
        date: 'invalid-date',
      };

      const response = await request(app)
        .post(`/habits/${habitId}/progress`)
        .set('Authorization', 'Bearer valid-token')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /habits/:habitId/progress', () => {
    it('should get habit progress', async () => {
      const habitId = 'habit-123';
      const progress = [
        createHabitProgress({ habit_id: habitId }),
        createHabitProgress({ habit_id: habitId }),
      ];

      habitService.getProgress.mockResolvedValue({
        success: true,
        data: progress,
      });

      const response = await request(app)
        .get(`/habits/${habitId}/progress`)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(habitService.getProgress).toHaveBeenCalledWith(
        habitId,
        authenticatedUser.id,
        {}
      );
    });

    it('should filter by date range', async () => {
      const habitId = 'habit-123';

      habitService.getProgress.mockResolvedValue({
        success: true,
        data: [],
      });

      const response = await request(app)
        .get(`/habits/${habitId}/progress?startDate=2025-01-01&endDate=2025-01-31`)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(habitService.getProgress).toHaveBeenCalledWith(
        habitId,
        authenticatedUser.id,
        {
          startDate: '2025-01-01',
          endDate: '2025-01-31',
        }
      );
    });
  });

  describe('GET /habits/:habitId/streak', () => {
    it('should get habit streak', async () => {
      const habitId = 'habit-123';
      const streakData = {
        current_streak: 15,
        longest_streak: 30,
        last_completed: '2025-01-06',
      };

      habitService.getStreak.mockResolvedValue({
        success: true,
        data: streakData,
      });

      const response = await request(app)
        .get(`/habits/${habitId}/streak`)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(streakData);
      expect(habitService.getStreak).toHaveBeenCalledWith(
        habitId,
        authenticatedUser.id
      );
    });
  });

  describe('PUT /habits/:habitId/reminder', () => {
    it('should update habit reminder', async () => {
      const habitId = 'habit-123';
      const reminderData = {
        time: '08:00',
        enabled: true,
        days: ['monday', 'wednesday', 'friday'],
      };

      habitService.updateReminder.mockResolvedValue({
        success: true,
        data: reminderData,
      });

      const response = await request(app)
        .put(`/habits/${habitId}/reminder`)
        .set('Authorization', 'Bearer valid-token')
        .send(reminderData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(reminderData);
      expect(habitService.updateReminder).toHaveBeenCalledWith(
        habitId,
        authenticatedUser.id,
        reminderData
      );
    });

    it('should validate time format', async () => {
      const habitId = 'habit-123';
      const invalidData = {
        time: '25:00', // Invalid time
        enabled: true,
      };

      const response = await request(app)
        .put(`/habits/${habitId}/reminder`)
        .set('Authorization', 'Bearer valid-token')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /habits/:habitId/analytics', () => {
    it('should get habit analytics', async () => {
      const habitId = 'habit-123';
      const analytics = createAnalytics({
        habit_id: habitId,
        completion_rate: 0.85,
      });

      habitService.getAnalytics.mockResolvedValue({
        success: true,
        data: analytics,
      });

      const response = await request(app)
        .get(`/habits/${habitId}/analytics`)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.completion_rate).toBe(0.85);
      expect(habitService.getAnalytics).toHaveBeenCalledWith(
        habitId,
        authenticatedUser.id,
        {}
      );
    });

    it('should support time period filter', async () => {
      const habitId = 'habit-123';

      habitService.getAnalytics.mockResolvedValue({
        success: true,
        data: createAnalytics(),
      });

      const response = await request(app)
        .get(`/habits/${habitId}/analytics?period=30d`)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(habitService.getAnalytics).toHaveBeenCalledWith(
        habitId,
        authenticatedUser.id,
        { period: '30d' }
      );
    });
  });

  describe('POST /habits/:habitId/pause', () => {
    it('should pause a habit', async () => {
      const habitId = 'habit-123';

      habitService.pauseHabit.mockResolvedValue({
        success: true,
        data: { is_active: false },
      });

      const response = await request(app)
        .post(`/habits/${habitId}/pause`)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(habitService.pauseHabit).toHaveBeenCalledWith(
        habitId,
        authenticatedUser.id
      );
    });
  });

  describe('POST /habits/:habitId/resume', () => {
    it('should resume a habit', async () => {
      const habitId = 'habit-123';

      habitService.resumeHabit.mockResolvedValue({
        success: true,
        data: { is_active: true },
      });

      const response = await request(app)
        .post(`/habits/${habitId}/resume`)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(habitService.resumeHabit).toHaveBeenCalledWith(
        habitId,
        authenticatedUser.id
      );
    });
  });

  describe('Rate limiting', () => {
    it('should rate limit habit creation', async () => {
      const habitData = {
        name: 'Test Habit',
        category: 'health',
        target_type: 'count',
        target_value: 1,
        frequency: 'daily',
      };

      habitService.createHabit.mockResolvedValue({
        success: true,
        data: createHabit(),
      });

      // Make multiple requests
      for (let i = 0; i < 11; i++) {
        await request(app)
          .post('/habits')
          .set('Authorization', 'Bearer valid-token')
          .send(habitData);
      }

      // Next request should be rate limited
      const response = await request(app)
        .post('/habits')
        .set('Authorization', 'Bearer valid-token')
        .send(habitData);

      expect(response.status).toBe(429);
      expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    });

    it('should rate limit progress recording', async () => {
      const habitId = 'habit-123';
      const progressData = {
        value: 1,
        date: '2025-01-06',
      };

      habitService.recordProgress.mockResolvedValue({
        success: true,
        data: createHabitProgress(),
      });

      // Make multiple requests
      for (let i = 0; i < 51; i++) {
        await request(app)
          .post(`/habits/${habitId}/progress`)
          .set('Authorization', 'Bearer valid-token')
          .send(progressData);
      }

      // Next request should be rate limited
      const response = await request(app)
        .post(`/habits/${habitId}/progress`)
        .set('Authorization', 'Bearer valid-token')
        .send(progressData);

      expect(response.status).toBe(429);
      expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    });
  });
});