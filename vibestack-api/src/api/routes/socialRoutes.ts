import { Router, Request, Response, NextFunction } from 'express';
import { SocialService } from '../../services';
import { authenticationMiddleware, AuthRequest } from '../../middleware/authenticationMiddleware';
import { rateLimitingMiddleware } from '../../middleware/rateLimitingMiddleware';
import { inputValidationMiddleware } from '../../middleware/inputValidationMiddleware';
import { supabase } from '../../config/supabase';
import { z } from 'zod';

const router = Router();
const socialService = new SocialService(supabase);

// Validation schemas
const sendFriendRequestSchema = z.object({
  targetUserId: z.string().min(1),
  message: z.string().max(500).optional(),
});

const createChallengeSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  type: z.enum(['habit_streak', 'total_completions', 'points_earned', 'custom']),
  target_value: z.number().positive(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  habit_id: z.string().optional(),
  is_public: z.boolean().optional(),
  max_participants: z.number().positive().optional(),
  rules: z.record(z.any()).optional(),
});

const paginationSchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional(),
  offset: z.coerce.number().min(0).optional(),
});

const getFriendsSchema = paginationSchema;

const getFriendRequestsSchema = paginationSchema.extend({
  type: z.enum(['received', 'sent']).optional(),
});

const getChallengesSchema = paginationSchema.extend({
  status: z.enum(['active', 'upcoming', 'completed', 'all']).optional(),
  participation: z.enum(['joined', 'created', 'invited', 'all']).optional(),
});

const activitySchema = paginationSchema.extend({
  type: z.enum([
    'habit_completed',
    'achievement_unlocked',
    'challenge_joined',
    'challenge_completed',
    'friend_added',
    'all'
  ]).optional(),
});

const commentSchema = z.object({
  content: z.string().min(1).max(500),
});

const updateProgressSchema = z.object({
  progress: z.number().min(0),
});

const inviteToChallengeSchema = z.object({
  userIds: z.array(z.string()).min(1).max(20),
  message: z.string().max(500).optional(),
});

const respondToInviteSchema = z.object({
  accept: z.boolean(),
});

const shareAchievementSchema = z.object({
  achievementId: z.string().min(1),
  message: z.string().max(500).optional(),
});

// Helper to map error codes to HTTP status codes
const getStatusCodeForError = (code: string): number => {
  const statusMap: Record<string, number> = {
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    USER_NOT_FOUND: 404,
    FRIEND_NOT_FOUND: 404,
    CHALLENGE_NOT_FOUND: 404,
    ACTIVITY_NOT_FOUND: 404,
    REQUEST_NOT_FOUND: 404,
    REQUEST_EXISTS: 409,
    ALREADY_FRIENDS: 409,
    ALREADY_JOINED: 409,
    CHALLENGE_FULL: 409,
    VALIDATION_ERROR: 400,
    RATE_LIMIT_EXCEEDED: 429,
  };
  return statusMap[code] || 500;
};

// Friend endpoints
router.post(
  '/friends/request',
  authenticationMiddleware,
  rateLimitingMiddleware({ maxRequests: 20, windowMs: 60 * 60 * 1000 }), // 20 requests per hour
  inputValidationMiddleware(sendFriendRequestSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { targetUserId, message } = req.body;
      const result = await socialService.sendFriendRequest(
        req.user!.id,
        targetUserId,
        message
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

router.put(
  '/friends/request/:requestId/accept',
  authenticationMiddleware,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await socialService.acceptFriendRequest(
        req.params.requestId,
        req.user!.id
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

router.put(
  '/friends/request/:requestId/decline',
  authenticationMiddleware,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await socialService.declineFriendRequest(
        req.params.requestId,
        req.user!.id
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

router.get(
  '/friends',
  authenticationMiddleware,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const validation = getFriendsSchema.safeParse(req.query);
      
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

      const result = await socialService.getFriends(req.user!.id, validation.data);
      
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

router.get(
  '/friends/requests',
  authenticationMiddleware,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const validation = getFriendRequestsSchema.safeParse(req.query);
      
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

      const result = await socialService.getFriendRequests(
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

router.delete(
  '/friends/:friendId',
  authenticationMiddleware,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await socialService.removeFriend(
        req.params.friendId,
        req.user!.id
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

router.post(
  '/block',
  authenticationMiddleware,
  inputValidationMiddleware(z.object({ userId: z.string().min(1) })),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await socialService.blockUser(req.user!.id, req.body.userId);
      
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

router.delete(
  '/block/:userId',
  authenticationMiddleware,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await socialService.unblockUser(
        req.user!.id,
        req.params.userId
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

router.get(
  '/blocked',
  authenticationMiddleware,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await socialService.getBlockedUsers(req.user!.id);
      
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

// Challenge endpoints
router.post(
  '/challenges',
  authenticationMiddleware,
  rateLimitingMiddleware({ maxRequests: 10, windowMs: 60 * 60 * 1000 }), // 10 challenges per hour
  inputValidationMiddleware(createChallengeSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await socialService.createChallenge(req.user!.id, req.body);
      
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

router.get(
  '/challenges',
  authenticationMiddleware,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const validation = getChallengesSchema.safeParse(req.query);
      
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

      const result = await socialService.getChallenges(
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

router.get(
  '/challenges/:challengeId',
  authenticationMiddleware,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await socialService.getChallenge(
        req.params.challengeId,
        req.user!.id
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

router.post(
  '/challenges/:challengeId/join',
  authenticationMiddleware,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await socialService.joinChallenge(
        req.params.challengeId,
        req.user!.id
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

router.post(
  '/challenges/:challengeId/leave',
  authenticationMiddleware,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await socialService.leaveChallenge(
        req.params.challengeId,
        req.user!.id
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

router.put(
  '/challenges/:challengeId/progress',
  authenticationMiddleware,
  inputValidationMiddleware(updateProgressSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await socialService.updateChallengeProgress(
        req.params.challengeId,
        req.user!.id,
        req.body.progress
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

router.get(
  '/challenges/:challengeId/leaderboard',
  authenticationMiddleware,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const validation = paginationSchema.safeParse(req.query);
      
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

      const result = await socialService.getChallengeLeaderboard(
        req.params.challengeId,
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

router.post(
  '/challenges/:challengeId/invite',
  authenticationMiddleware,
  inputValidationMiddleware(inviteToChallengeSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { userIds, message } = req.body;
      const result = await socialService.inviteToChallenge(
        req.params.challengeId,
        req.user!.id,
        userIds,
        message
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

router.put(
  '/challenges/invite/:inviteId',
  authenticationMiddleware,
  inputValidationMiddleware(respondToInviteSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await socialService.respondToInvite(
        req.params.inviteId,
        req.user!.id,
        req.body.accept
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

// Activity endpoints
router.get(
  '/activity',
  authenticationMiddleware,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const validation = activitySchema.safeParse(req.query);
      
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

      const result = await socialService.getActivity(
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

router.get(
  '/activity/friends',
  authenticationMiddleware,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const validation = activitySchema.safeParse(req.query);
      
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

      const result = await socialService.getFriendsActivity(
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

router.post(
  '/activity/share',
  authenticationMiddleware,
  rateLimitingMiddleware({ maxRequests: 30, windowMs: 60 * 60 * 1000 }), // 30 shares per hour
  inputValidationMiddleware(shareAchievementSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { achievementId, message } = req.body;
      const result = await socialService.shareAchievement(
        req.user!.id,
        achievementId,
        message
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

router.post(
  '/activity/:activityId/like',
  authenticationMiddleware,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await socialService.likeActivity(
        req.params.activityId,
        req.user!.id
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

router.post(
  '/activity/:activityId/comment',
  authenticationMiddleware,
  inputValidationMiddleware(commentSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await socialService.commentOnActivity(
        req.params.activityId,
        req.user!.id,
        req.body.content
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

export const socialRoutes = router;