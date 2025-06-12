import { Router, Request, Response, NextFunction } from 'express';
import { AuthService } from '../../services';
import { authenticationMiddleware } from '../../middleware/authenticationMiddleware';
import { rateLimitingMiddleware } from '../../middleware/rateLimitingMiddleware';
import { inputValidationMiddleware } from '../../middleware/inputValidationMiddleware';
import { supabase } from '../../config/supabase';
import { z } from 'zod';

const router = Router();
const authService = new AuthService(supabase);

// Validation schemas
const signUpSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  displayName: z.string().optional(),
});

const signInSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  type: z.enum(['signup', 'recovery']),
});

const resetPasswordSchema = z.object({
  email: z.string().email('Invalid email format'),
});

const confirmResetSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// Helper to map error codes to HTTP status codes
const getStatusCodeForError = (code: string): number => {
  const statusMap: Record<string, number> = {
    UNAUTHORIZED: 401,
    INVALID_CREDENTIALS: 401,
    NO_SESSION: 401,
    INVALID_TOKEN: 400,
    REFRESH_TOKEN_EXPIRED: 401,
    USER_EXISTS: 409,
    EMAIL_NOT_CONFIRMED: 403,
    USER_NOT_FOUND: 404,
    VALIDATION_ERROR: 400,
    RATE_LIMIT_EXCEEDED: 429,
  };
  return statusMap[code] || 500;
};

// Sign up
router.post(
  '/signup',
  rateLimitingMiddleware({ maxRequests: 5, windowMs: 15 * 60 * 1000 }), // 5 requests per 15 minutes
  inputValidationMiddleware(signUpSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.signUp(req.body);
      
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

// Sign in
router.post(
  '/signin',
  rateLimitingMiddleware({ maxRequests: 10, windowMs: 15 * 60 * 1000 }), // 10 requests per 15 minutes
  inputValidationMiddleware(signInSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;
      const result = await authService.signIn(email, password);
      
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

// Sign out
router.post(
  '/signout',
  authenticationMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.signOut();
      
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

// Verify email
router.post(
  '/verify-email',
  inputValidationMiddleware(verifyEmailSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token, type } = req.body;
      const result = await authService.verifyEmail(token, type);
      
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

// Resend verification email
router.post(
  '/resend-verification',
  rateLimitingMiddleware({ maxRequests: 3, windowMs: 60 * 60 * 1000 }), // 3 requests per hour
  inputValidationMiddleware(resetPasswordSchema), // Same schema as reset password
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body;
      const result = await authService.resendVerificationEmail(email);
      
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

// Reset password
router.post(
  '/reset-password',
  rateLimitingMiddleware({ maxRequests: 3, windowMs: 60 * 60 * 1000 }), // 3 requests per hour
  inputValidationMiddleware(resetPasswordSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body;
      const result = await authService.resetPassword(email);
      
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

// Confirm password reset
router.post(
  '/confirm-reset',
  inputValidationMiddleware(confirmResetSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token, newPassword } = req.body;
      const result = await authService.confirmPasswordReset(token, newPassword);
      
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

// Update password
router.put(
  '/update-password',
  authenticationMiddleware,
  inputValidationMiddleware(updatePasswordSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const result = await authService.updatePassword(currentPassword, newPassword);
      
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

// Get session
router.get(
  '/session',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.getSession();
      
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

// Refresh session
router.post(
  '/refresh',
  inputValidationMiddleware(refreshSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body;
      const result = await authService.refreshSession(refreshToken);
      
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

export const authRoutes = router;