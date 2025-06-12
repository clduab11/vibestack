import { Router, Request, Response, NextFunction } from 'express';
import { NotificationService } from '../../services';
import { authenticationMiddleware, AuthRequest } from '../../middleware/authenticationMiddleware';
import { rateLimitingMiddleware } from '../../middleware/rateLimitingMiddleware';
import { inputValidationMiddleware } from '../../middleware/inputValidationMiddleware';
import { supabase } from '../../config/supabase';
import { z } from 'zod';

const router = Router();
const notificationService = new NotificationService(supabase);

// Validation schemas
// Custom boolean transformer for query parameters
const stringToBoolean = z
  .string()
  .transform((val) => val === 'true')
  .or(z.boolean());

const getNotificationsSchema = z.object({
  type: z.enum([
    'habit_reminder',
    'achievement_unlocked',
    'friend_request',
    'challenge_invite',
    'social_interaction',
    'system',
  ]).optional(),
  read: stringToBoolean.optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  offset: z.coerce.number().min(0).optional(),
});

const markAsReadSchema = z.object({
  notificationIds: z.array(z.string()).min(1).max(100),
});

const updatePreferencesSchema = z.object({
  push_enabled: z.boolean().optional(),
  email_enabled: z.boolean().optional(),
  habit_reminders: z.boolean().optional(),
  achievement_alerts: z.boolean().optional(),
  social_updates: z.boolean().optional(),
  challenge_updates: z.boolean().optional(),
  quiet_hours_enabled: z.boolean().optional(),
  quiet_hours_start: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  quiet_hours_end: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
});

const registerDeviceSchema = z.object({
  token: z.string().min(1),
  platform: z.enum(['ios', 'android', 'web']),
  device_name: z.string().max(100).optional(),
});

const sendNotificationSchema = z.object({
  recipientId: z.string().min(1),
  type: z.enum([
    'habit_reminder',
    'achievement_unlocked',
    'friend_request',
    'challenge_invite',
    'social_interaction',
    'system',
  ]),
  title: z.string().min(1).max(100),
  body: z.string().min(1).max(500),
  data: z.record(z.any()).optional(),
  priority: z.enum(['high', 'normal', 'low']).optional(),
});

const sendBulkNotificationsSchema = z.object({
  recipientIds: z.array(z.string()).min(1).max(1000),
  type: z.enum([
    'habit_reminder',
    'achievement_unlocked',
    'friend_request',
    'challenge_invite',
    'social_interaction',
    'system',
  ]),
  title: z.string().min(1).max(100),
  body: z.string().min(1).max(500),
  data: z.record(z.any()).optional(),
});

const testPushSchema = z.object({
  deviceId: z.string().min(1),
});

// Helper to map error codes to HTTP status codes
const getStatusCodeForError = (code: string): number => {
  const statusMap: Record<string, number> = {
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    NOTIFICATION_NOT_FOUND: 404,
    DEVICE_NOT_FOUND: 404,
    USER_NOT_FOUND: 404,
    VALIDATION_ERROR: 400,
    DEVICE_EXISTS: 409,
    RATE_LIMIT_EXCEEDED: 429,
  };
  return statusMap[code] || 500;
};

// Get notifications
router.get(
  '/',
  authenticationMiddleware,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      // Validate query parameters
      const validation = getNotificationsSchema.safeParse(req.query);
      
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

      const result = await notificationService.getNotifications(validation.data);
      
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

// Mark notifications as read
router.put(
  '/read',
  authenticationMiddleware,
  inputValidationMiddleware(markAsReadSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await notificationService.markAsRead(req.body.notificationIds);
      
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

// Delete specific notification
router.delete(
  '/:notificationId',
  authenticationMiddleware,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await notificationService.deleteNotification(req.params.notificationId);
      
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

// Delete all notifications
router.delete(
  '/',
  authenticationMiddleware,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await notificationService.deleteAllNotifications();
      
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

// Get notification preferences
router.get(
  '/preferences',
  authenticationMiddleware,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await notificationService.getPreferences();
      
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
  '/preferences',
  authenticationMiddleware,
  inputValidationMiddleware(updatePreferencesSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await notificationService.updatePreferences(req.body);
      
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

// Register device for push notifications
router.post(
  '/devices',
  authenticationMiddleware,
  rateLimitingMiddleware({ maxRequests: 10, windowMs: 60 * 60 * 1000 }), // 10 devices per hour
  inputValidationMiddleware(registerDeviceSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await notificationService.registerDevice(req.body);
      
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

// Unregister device
router.delete(
  '/devices/:deviceId',
  authenticationMiddleware,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await notificationService.unregisterDevice(req.params.deviceId);
      
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

// Get registered devices
router.get(
  '/devices',
  authenticationMiddleware,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await notificationService.getDevices();
      
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

// Send notification (admin/system use)
router.post(
  '/send',
  authenticationMiddleware,
  rateLimitingMiddleware({ maxRequests: 50, windowMs: 60 * 60 * 1000 }), // 50 notifications per hour
  inputValidationMiddleware(sendNotificationSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await notificationService.sendNotification(req.body);
      
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

// Send bulk notifications (admin/system use)
router.post(
  '/send-bulk',
  authenticationMiddleware,
  rateLimitingMiddleware({ maxRequests: 10, windowMs: 60 * 60 * 1000 }), // 10 bulk sends per hour
  inputValidationMiddleware(sendBulkNotificationsSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await notificationService.sendBulkNotifications(
        req.body.recipientIds,
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

// Get unread notification count
router.get(
  '/unread-count',
  authenticationMiddleware,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await notificationService.getUnreadCount();
      
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

// Test push notification
router.post(
  '/test-push',
  authenticationMiddleware,
  rateLimitingMiddleware({ maxRequests: 5, windowMs: 60 * 60 * 1000 }), // 5 tests per hour
  inputValidationMiddleware(testPushSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await notificationService.testPushNotification(req.body.deviceId);
      
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

export const notificationRoutes = router;