import { Router, Request, Response, NextFunction } from 'express';
import { AnalyticsService } from '../../services';
import { authenticationMiddleware, AuthRequest } from '../../middleware/authenticationMiddleware';
import { rateLimitingMiddleware } from '../../middleware/rateLimitingMiddleware';
import { inputValidationMiddleware } from '../../middleware/inputValidationMiddleware';
import { supabase } from '../../config/supabase';
import { z } from 'zod';

const router = Router();
const analyticsService = new AnalyticsService(supabase);

// Validation schemas
const dashboardSchema = z.object({
  period: z.enum(['7d', '30d', '90d', 'all']).optional(),
});

const dateRangeSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const categorySchema = z.object({
  category: z.enum(['health', 'productivity', 'finance', 'learning', 'social', 'other']).optional(),
  period: z.enum(['7d', '30d', '90d', 'all']).optional(),
});

const timeBasedSchema = z.object({
  granularity: z.enum(['hourly', 'daily', 'weekly', 'monthly']).optional(),
  period: z.enum(['7d', '30d', '90d', 'all']).optional(),
});

const trendsSchema = z.object({
  period: z.enum(['7d', '30d', '90d', '180d', '365d']).optional(),
  granularity: z.enum(['daily', 'weekly', 'monthly']).optional(),
});

const exportSchema = z.object({
  format: z.enum(['json', 'csv', 'pdf']).optional(),
  period: z.enum(['7d', '30d', '90d', 'all']).optional(),
  includeInsights: z.coerce.boolean().optional(),
});

const insightsSchema = z.object({
  type: z.enum(['pattern', 'improvement', 'achievement', 'recommendation']).optional(),
  limit: z.coerce.number().min(1).max(50).optional(),
});

const comparisonSchema = z.object({
  anonymous: z.coerce.boolean().optional(),
  categories: z.array(z.enum(['health', 'productivity', 'finance', 'learning', 'social', 'other'])).optional(),
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

// Get dashboard statistics
router.get(
  '/dashboard',
  authenticationMiddleware,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      // Validate query parameters
      const validation = dashboardSchema.safeParse(req.query);
      
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

      const result = await analyticsService.getDashboardStats(
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

// Get specific habit analytics
router.get(
  '/habits/:habitId',
  authenticationMiddleware,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      // Validate query parameters
      const validation = dateRangeSchema.safeParse(req.query);
      
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

      const result = await analyticsService.getHabitAnalytics(
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

// Get category analytics
router.get(
  '/categories',
  authenticationMiddleware,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      // Validate query parameters
      const validation = categorySchema.safeParse(req.query);
      
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

      const result = await analyticsService.getCategoryAnalytics(
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

// Get time-based analytics
router.get(
  '/time-based',
  authenticationMiddleware,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      // Validate query parameters
      const validation = timeBasedSchema.safeParse(req.query);
      
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

      const result = await analyticsService.getTimeBasedAnalytics(
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

// Get streak analytics
router.get(
  '/streaks',
  authenticationMiddleware,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await analyticsService.getStreakAnalytics(req.user!.id);
      
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

// Get completion trends
router.get(
  '/trends',
  authenticationMiddleware,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      // Validate query parameters
      const validation = trendsSchema.safeParse(req.query);
      
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

      const result = await analyticsService.getCompletionTrends(
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

// Export analytics data
router.get(
  '/export',
  authenticationMiddleware,
  rateLimitingMiddleware({ maxRequests: 10, windowMs: 60 * 60 * 1000 }), // 10 exports per hour
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      // Validate query parameters
      const validation = exportSchema.safeParse(req.query);
      
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

      const result = await analyticsService.exportAnalytics(
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

// Get AI-generated insights
router.get(
  '/insights',
  authenticationMiddleware,
  rateLimitingMiddleware({ maxRequests: 20, windowMs: 60 * 60 * 1000 }), // 20 insights per hour
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      // Validate query parameters
      const validation = insightsSchema.safeParse(req.query);
      
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

      const result = await analyticsService.getInsights(
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

// Get comparison data
router.get(
  '/comparison',
  authenticationMiddleware,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      // Validate query parameters
      const validation = comparisonSchema.safeParse(req.query);
      
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

      const result = await analyticsService.getComparison(
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

export const analyticsRoutes = router;