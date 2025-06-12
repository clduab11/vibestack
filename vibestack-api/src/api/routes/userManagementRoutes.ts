import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { UserService } from '../../services';
import { authenticationMiddleware, AuthRequest } from '../../middleware/authenticationMiddleware';
import { rateLimitingMiddleware } from '../../middleware/rateLimitingMiddleware';
import { inputValidationMiddleware } from '../../middleware/inputValidationMiddleware';
import { supabase } from '../../config/supabase';
import { z } from 'zod';

const router = Router();
const userService = new UserService(supabase);

// Configure multer for avatar uploads
const upload = multer({
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      cb(new Error('INVALID_FILE_TYPE') as any);
    } else {
      cb(null, true);
    }
  },
});

// Multer error handler
const handleMulterError = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'FILE_TOO_LARGE',
          message: 'File size must be less than 5MB',
        },
      });
    }
  } else if (err) {
    if (err.message === 'INVALID_FILE_TYPE') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_FILE_TYPE',
          message: 'Invalid file type. Only JPEG, PNG, and WebP are allowed',
        },
      });
    }
  }
  next(err);
};

// Validation schemas
const updateProfileSchema = z.object({
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/).optional(),
  display_name: z.string().min(1).max(50).optional(),
  bio: z.string().max(500).optional(),
  avatar_url: z.string().url().optional(),
});

const privacySettingsSchema = z.object({
  profile_visibility: z.enum(['public', 'friends', 'private']).optional(),
  show_activity: z.boolean().optional(),
  allow_friend_requests: z.boolean().optional(),
  show_stats: z.boolean().optional(),
});

const notificationPreferencesSchema = z.object({
  email_notifications: z.boolean().optional(),
  push_notifications: z.boolean().optional(),
  friend_requests: z.boolean().optional(),
  habit_reminders: z.boolean().optional(),
  achievement_alerts: z.boolean().optional(),
  social_interactions: z.boolean().optional(),
});

const searchSchema = z.object({
  q: z.string().min(2).max(50),
  limit: z.coerce.number().min(1).max(50).default(20),
  offset: z.coerce.number().min(0).default(0),
});

const deleteAccountSchema = z.object({
  password: z.string().min(1),
  confirmation: z.literal('DELETE MY ACCOUNT'),
});

// Helper to map error codes to HTTP status codes
const getStatusCodeForError = (code: string): number => {
  const statusMap: Record<string, number> = {
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    USER_NOT_FOUND: 404,
    PROFILE_NOT_FOUND: 404,
    USERNAME_TAKEN: 409,
    INVALID_PASSWORD: 401,
    VALIDATION_ERROR: 400,
    INVALID_FILE_TYPE: 400,
    FILE_TOO_LARGE: 400,
    PROFILE_PRIVATE: 403,
    RATE_LIMIT_EXCEEDED: 429,
  };
  return statusMap[code] || 500;
};

// Get current user profile
router.get(
  '/profile',
  authenticationMiddleware,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await userService.getProfile(req.user!.id);
      
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

// Update profile
router.put(
  '/profile',
  authenticationMiddleware,
  rateLimitingMiddleware({ maxRequests: 10, windowMs: 15 * 60 * 1000 }), // 10 requests per 15 minutes
  inputValidationMiddleware(updateProfileSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await userService.updateProfile(req.user!.id, req.body);
      
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

// Upload avatar
router.post(
  '/avatar',
  authenticationMiddleware,
  rateLimitingMiddleware({ maxRequests: 5, windowMs: 60 * 60 * 1000 }), // 5 uploads per hour
  upload.single('avatar'),
  handleMulterError,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NO_FILE',
            message: 'No file uploaded',
          },
        });
      }

      // Additional file type validation
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_FILE_TYPE',
            message: 'Invalid file type. Only JPEG, PNG, and WebP are allowed',
          },
        });
      }

      // File size validation (multer should handle this, but double-check)
      if (req.file.size > 5 * 1024 * 1024) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'FILE_TOO_LARGE',
            message: 'File size must be less than 5MB',
          },
        });
      }

      const result = await userService.uploadAvatar(req.user!.id, req.file);
      
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

// Delete avatar
router.delete(
  '/avatar',
  authenticationMiddleware,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await userService.deleteAvatar(req.user!.id);
      
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

// Update privacy settings
router.put(
  '/privacy',
  authenticationMiddleware,
  inputValidationMiddleware(privacySettingsSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await userService.updatePrivacySettings(req.user!.id, req.body);
      
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

// Update notification preferences
router.put(
  '/notifications',
  authenticationMiddleware,
  inputValidationMiddleware(notificationPreferencesSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await userService.updateNotificationPreferences(req.user!.id, req.body);
      
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

// Search users
router.get(
  '/search',
  authenticationMiddleware,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      // Validate query parameters
      const validation = searchSchema.safeParse(req.query);
      
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid search parameters',
            details: validation.error.errors,
          },
        });
      }

      const { q, limit, offset } = validation.data;
      const result = await userService.searchUsers(q, { limit, offset });
      
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

// Get public profile
router.get(
  '/:userId',
  authenticationMiddleware,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await userService.getPublicProfile(req.params.userId);
      
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

// Delete account
router.delete(
  '/account',
  authenticationMiddleware,
  rateLimitingMiddleware({ maxRequests: 3, windowMs: 60 * 60 * 1000 }), // 3 attempts per hour
  inputValidationMiddleware(deleteAccountSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await userService.deleteAccount(req.user!.id, req.body.password);
      
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

export const userRoutes = router;