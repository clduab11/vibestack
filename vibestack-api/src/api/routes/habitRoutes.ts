import { Router, Request, Response, NextFunction } from 'express';
import { HabitService } from '../../services';
import { authenticationMiddleware, AuthRequest } from '../../middleware/authenticationMiddleware';
import { rateLimitingMiddleware } from '../../middleware/rateLimitingMiddleware';
import { inputValidationMiddleware } from '../../middleware/inputValidationMiddleware';
import { supabase } from '../../config/supabase';
import { z } from 'zod';

const router = Router();
const habitService = new HabitService(supabase);

// Validation schemas
const createHabitSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  category: z.enum(['health', 'productivity', 'finance', 'learning', 'social', 'other']),
  target_type: z.enum(['count', 'duration', 'boolean']),
  target_value: z.number().positive(),
  frequency: z.enum(['daily', 'weekly', 'monthly']),
  reminder_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  reminder_days: z.array(z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])).optional(),
});

const updateHabitSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  category: z.enum(['health', 'productivity', 'finance', 'learning', 'social', 'other']).optional(),
  target_type: z.enum(['count', 'duration', 'boolean']).optional(),
  target_value: z.number().positive().optional(),
  frequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
  reminder_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  reminder_days: z.array(z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])).optional(),
});

const recordProgressSchema = z.object({
  value: z.number().min(0),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().max(500).optional(),
});

const updateReminderSchema = z.object({
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  enabled: z.boolean(),
  days: z.array(z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])).optional(),
});

const getHabitsSchema = z.object({
  status: z.enum(['active', 'paused', 'all']).optional(),
  category: z.enum(['health', 'productivity', 'finance', 'learning', 'social', 'other']).optional(),
});

const getProgressSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const getAnalyticsSchema = z.object({
  period: z.enum(['7d', '30d', '90d', 'all']).optional(),
});

// Helper to map error codes to HTTP status codes
const getStatusCodeForError = (code: string): number => {
  const statusMap: Record<string, number> = {
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    HABIT_NOT_FOUND: 404,
    VALIDATION_ERROR: 400,
    RATE_LIMIT_EXCEEDED: 429,
  };
  return statusMap[code] || 500;
};

// Get all user habits
router.get(
  '/',
  authenticationMiddleware,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      // Validate query parameters
      const validation = getHabitsSchema.safeParse(req.query);
      
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: validation.error.errors,
          },
        });
      }

      const result = await habitService.getHabits(req.user!.id, validation.data);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        const status = getStatusCodeForError(result.error!.code);
        res.status(status).json(result);
      }
    } catch (error) {
      next(error);
    }
  }
);

// Get specific habit
router.get(
  '/:habitId',
  authenticationMiddleware,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await habitService.getHabit(req.params.habitId, req.user!.id);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        const status = getStatusCodeForError(result.error!.code);
        res.status(status).json(result);
      }
    } catch (error) {
      next(error);
    }
  }
);

// Create habit
router.post(
  '/',
  authenticationMiddleware,
  rateLimitingMiddleware({ maxRequests: 10, windowMs: 60 * 60 * 1000 }), // 10 habits per hour
  inputValidationMiddleware(createHabitSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await habitService.createHabit(req.user!.id, req.body);
      
      if (result.success) {
        res.status(201).json(result);
      } else {
        const status = getStatusCodeForError(result.error!.code);
        res.status(status).json(result);
      }
    } catch (error) {
      next(error);
    }
  }
);

// Update habit
router.put(
  '/:habitId',
  authenticationMiddleware,
  inputValidationMiddleware(updateHabitSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await habitService.updateHabit(
        req.params.habitId,
        req.user!.id,
        req.body
      );
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        const status = getStatusCodeForError(result.error!.code);
        res.status(status).json(result);
      }
    } catch (error) {
      next(error);
    }
  }
);

// Delete habit
router.delete(
  '/:habitId',
  authenticationMiddleware,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await habitService.deleteHabit(req.params.habitId, req.user!.id);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        const status = getStatusCodeForError(result.error!.code);
        res.status(status).json(result);
      }
    } catch (error) {
      next(error);
    }
  }
);

// Record progress
router.post(
  '/:habitId/progress',
  authenticationMiddleware,
  rateLimitingMiddleware({ maxRequests: 50, windowMs: 60 * 60 * 1000 }), // 50 progress updates per hour
  inputValidationMiddleware(recordProgressSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await habitService.recordProgress(
        req.params.habitId,
        req.user!.id,
        req.body
      );
      
      if (result.success) {
        res.status(201).json(result);
      } else {
        const status = getStatusCodeForError(result.error!.code);
        res.status(status).json(result);
      }
    } catch (error) {
      next(error);
    }
  }
);

// Get progress
router.get(
  '/:habitId/progress',
  authenticationMiddleware,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      // Validate query parameters
      const validation = getProgressSchema.safeParse(req.query);
      
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: validation.error.errors,
          },
        });
      }

      const result = await habitService.getProgress(
        req.params.habitId,
        req.user!.id,
        validation.data
      );
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        const status = getStatusCodeForError(result.error!.code);
        res.status(status).json(result);
      }
    } catch (error) {
      next(error);
    }
  }
);

// Get streak
router.get(
  '/:habitId/streak',
  authenticationMiddleware,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await habitService.getStreak(req.params.habitId, req.user!.id);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        const status = getStatusCodeForError(result.error!.code);
        res.status(status).json(result);
      }
    } catch (error) {
      next(error);
    }
  }
);

// Update reminder
router.put(
  '/:habitId/reminder',
  authenticationMiddleware,
  inputValidationMiddleware(updateReminderSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await habitService.updateReminder(
        req.params.habitId,
        req.user!.id,
        req.body
      );
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        const status = getStatusCodeForError(result.error!.code);
        res.status(status).json(result);
      }
    } catch (error) {
      next(error);
    }
  }
);

// Get analytics
router.get(
  '/:habitId/analytics',
  authenticationMiddleware,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      // Validate query parameters
      const validation = getAnalyticsSchema.safeParse(req.query);
      
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: validation.error.errors,
          },
        });
      }

      const result = await habitService.getAnalytics(
        req.params.habitId,
        req.user!.id,
        validation.data
      );
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        const status = getStatusCodeForError(result.error!.code);
        res.status(status).json(result);
      }
    } catch (error) {
      next(error);
    }
  }
);

// Pause habit
router.post(
  '/:habitId/pause',
  authenticationMiddleware,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await habitService.pauseHabit(req.params.habitId, req.user!.id);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        const status = getStatusCodeForError(result.error!.code);
        res.status(status).json(result);
      }
    } catch (error) {
      next(error);
    }
  }
);

// Resume habit
router.post(
  '/:habitId/resume',
  authenticationMiddleware,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await habitService.resumeHabit(req.params.habitId, req.user!.id);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        const status = getStatusCodeForError(result.error!.code);
        res.status(status).json(result);
      }
    } catch (error) {
      next(error);
    }
  }
);

export const habitRoutes = router;