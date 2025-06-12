import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import {
  createUser,
  createSession,
  createProfile,
  createSubscriptionPlan,
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
const mockAuthService = {
  signUp: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  verifyEmail: vi.fn(),
  resendVerificationEmail: vi.fn(),
  resetPassword: vi.fn(),
  confirmPasswordReset: vi.fn(),
  updatePassword: vi.fn(),
  getSession: vi.fn(),
  refreshSession: vi.fn(),
};

vi.mock('../../../services', () => ({
  AuthService: vi.fn().mockImplementation(() => mockAuthService),
}));

// Now import the routes after mocking
const { authRoutes } = await import('../../../api/routes/authenticationRoutes');

describe('Authentication Routes', () => {
  let app: express.Application;
  let authService: typeof mockAuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    authService = mockAuthService;
    app.use('/auth', authRoutes);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /auth/signup', () => {
    it('should create a new user account', async () => {
      const signupData = {
        email: 'newuser@example.com',
        password: 'StrongPass123!',
        username: 'newuser',
        displayName: 'New User',
      };

      const mockResponse = {
        success: true,
        data: {
          user: createUser({ email: signupData.email }),
          session: createSession(),
        },
      };

      authService.signUp.mockResolvedValue(mockResponse);

      const response = await request(app)
        .post('/auth/signup')
        .send(signupData);

      expect(response.status).toBe(201);
      expect(response.body).toEqual(mockResponse);
      expect(authService.signUp).toHaveBeenCalledWith(signupData);
    });

    it('should validate required fields', async () => {
      const invalidData = {
        email: 'newuser@example.com',
        // missing password
      };

      const response = await request(app)
        .post('/auth/signup')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should validate email format', async () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'StrongPass123!',
        username: 'newuser',
      };

      const response = await request(app)
        .post('/auth/signup')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle service errors', async () => {
      const signupData = {
        email: 'existing@example.com',
        password: 'StrongPass123!',
        username: 'existing',
      };

      authService.signUp.mockResolvedValue({
        success: false,
        error: {
          code: 'USER_EXISTS',
          message: 'User already exists',
        },
      });

      const response = await request(app)
        .post('/auth/signup')
        .send(signupData);

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('USER_EXISTS');
    });
  });

  describe('POST /auth/signin', () => {
    it('should sign in a user', async () => {
      const signinData = {
        email: 'user@example.com',
        password: 'password123',
      };

      const mockResponse = {
        success: true,
        data: {
          user: createUser({ email: signinData.email }),
          session: createSession(),
        },
      };

      authService.signIn.mockResolvedValue(mockResponse);

      const response = await request(app)
        .post('/auth/signin')
        .send(signinData);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResponse);
      expect(authService.signIn).toHaveBeenCalledWith(
        signinData.email,
        signinData.password
      );
    });

    it('should handle invalid credentials', async () => {
      const signinData = {
        email: 'user@example.com',
        password: 'wrongpassword',
      };

      authService.signIn.mockResolvedValue({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        },
      });

      const response = await request(app)
        .post('/auth/signin')
        .send(signinData);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('POST /auth/signout', () => {
    it('should sign out a user', async () => {
      // Mock authenticated user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: createUser() },
        error: null,
      });

      authService.signOut.mockResolvedValue({
        success: true,
      });

      const response = await request(app)
        .post('/auth/signout')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(authService.signOut).toHaveBeenCalled();
    });
  });

  describe('POST /auth/verify-email', () => {
    it('should verify email with token', async () => {
      const verifyData = {
        token: 'verification-token',
        type: 'signup',
      };

      authService.verifyEmail.mockResolvedValue({
        success: true,
        data: {
          user: createUser(),
          session: createSession(),
        },
      });

      const response = await request(app)
        .post('/auth/verify-email')
        .send(verifyData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(authService.verifyEmail).toHaveBeenCalledWith(
        verifyData.token,
        verifyData.type
      );
    });

    it('should handle invalid token', async () => {
      const verifyData = {
        token: 'invalid-token',
        type: 'signup',
      };

      authService.verifyEmail.mockResolvedValue({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token',
        },
      });

      const response = await request(app)
        .post('/auth/verify-email')
        .send(verifyData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });
  });

  describe('POST /auth/resend-verification', () => {
    it('should resend verification email', async () => {
      const resendData = {
        email: 'user@example.com',
      };

      authService.resendVerificationEmail.mockResolvedValue({
        success: true,
      });

      const response = await request(app)
        .post('/auth/resend-verification')
        .send(resendData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(authService.resendVerificationEmail).toHaveBeenCalledWith(
        resendData.email
      );
    });
  });

  describe('POST /auth/reset-password', () => {
    it('should initiate password reset', async () => {
      const resetData = {
        email: 'user@example.com',
      };

      authService.resetPassword.mockResolvedValue({
        success: true,
      });

      const response = await request(app)
        .post('/auth/reset-password')
        .send(resetData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(authService.resetPassword).toHaveBeenCalledWith(resetData.email);
    });
  });

  describe('POST /auth/confirm-reset', () => {
    it('should confirm password reset', async () => {
      const confirmData = {
        token: 'reset-token',
        newPassword: 'NewStrongPass123!',
      };

      authService.confirmPasswordReset.mockResolvedValue({
        success: true,
        data: {
          user: createUser(),
          session: createSession(),
        },
      });

      const response = await request(app)
        .post('/auth/confirm-reset')
        .send(confirmData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(authService.confirmPasswordReset).toHaveBeenCalledWith(
        confirmData.token,
        confirmData.newPassword
      );
    });

    it('should validate password strength', async () => {
      const confirmData = {
        token: 'reset-token',
        newPassword: 'weak',
      };

      const response = await request(app)
        .post('/auth/confirm-reset')
        .send(confirmData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PUT /auth/update-password', () => {
    it('should update password for authenticated user', async () => {
      // Mock authenticated user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: createUser() },
        error: null,
      });

      const updateData = {
        currentPassword: 'CurrentPass123!',
        newPassword: 'NewStrongPass123!',
      };

      authService.updatePassword.mockResolvedValue({
        success: true,
      });

      const response = await request(app)
        .put('/auth/update-password')
        .set('Authorization', 'Bearer valid-token')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(authService.updatePassword).toHaveBeenCalledWith(
        updateData.currentPassword,
        updateData.newPassword
      );
    });

    it('should require authentication', async () => {
      const updateData = {
        currentPassword: 'CurrentPass123!',
        newPassword: 'NewStrongPass123!',
      };

      const response = await request(app)
        .put('/auth/update-password')
        .send(updateData);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('GET /auth/session', () => {
    it('should get current session', async () => {
      const mockSession = {
        user: createUser(),
        session: createSession(),
      };

      authService.getSession.mockResolvedValue({
        success: true,
        data: mockSession,
      });

      const response = await request(app)
        .get('/auth/session')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockSession);
    });

    it('should handle no session', async () => {
      authService.getSession.mockResolvedValue({
        success: false,
        error: {
          code: 'NO_SESSION',
          message: 'No active session',
        },
      });

      const response = await request(app).get('/auth/session');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NO_SESSION');
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh session', async () => {
      const refreshData = {
        refreshToken: 'refresh-token',
      };

      const mockResponse = {
        success: true,
        data: {
          user: createUser(),
          session: createSession(),
        },
      };

      authService.refreshSession.mockResolvedValue(mockResponse);

      const response = await request(app)
        .post('/auth/refresh')
        .send(refreshData);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResponse);
      expect(authService.refreshSession).toHaveBeenCalledWith(
        refreshData.refreshToken
      );
    });

    it('should handle expired refresh token', async () => {
      const refreshData = {
        refreshToken: 'expired-token',
      };

      authService.refreshSession.mockResolvedValue({
        success: false,
        error: {
          code: 'REFRESH_TOKEN_EXPIRED',
          message: 'Refresh token has expired',
        },
      });

      const response = await request(app)
        .post('/auth/refresh')
        .send(refreshData);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('REFRESH_TOKEN_EXPIRED');
    });
  });

  describe('Rate limiting', () => {
    it('should rate limit signup attempts', async () => {
      const signupData = {
        email: 'test@example.com',
        password: 'StrongPass123!',
        username: 'testuser',
      };

      authService.signUp.mockResolvedValue({
        success: false,
        error: { code: 'USER_EXISTS', message: 'User exists' },
      });

      // Make multiple requests
      for (let i = 0; i < 6; i++) {
        await request(app).post('/auth/signup').send(signupData);
      }

      // Next request should be rate limited
      const response = await request(app)
        .post('/auth/signup')
        .send(signupData);

      expect(response.status).toBe(429);
      expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    });

    it('should rate limit signin attempts', async () => {
      const signinData = {
        email: 'test@example.com',
        password: 'password',
      };

      authService.signIn.mockResolvedValue({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' },
      });

      // Make multiple requests
      for (let i = 0; i < 11; i++) {
        await request(app).post('/auth/signin').send(signinData);
      }

      // Next request should be rate limited
      const response = await request(app)
        .post('/auth/signin')
        .send(signinData);

      expect(response.status).toBe(429);
      expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    });
  });
});