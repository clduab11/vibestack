import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AuthService } from '../../../services/auth.service';
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
  createProfile,
  createSession,
  createAvatar,
  testScenarios,
} from '../../fixtures/test-data';
import type { User, Session, ApiResponse } from '../../../types';

describe('AuthService', () => {
  let authService: AuthService;
  let supabase: SupabaseMock;

  beforeEach(() => {
    const test = setupTest();
    supabase = test.supabase;
    authService = new AuthService(supabase as any);
  });

  afterEach(() => {
    teardownTest();
  });

  describe('signUp', () => {
    it('should create a new user with email and password', async () => {
      const email = 'newuser@example.com';
      const password = 'SecureP@ssw0rd!';
      const user = createUser({ email });
      const session = createSession({ user });

      supabase.auth.signUp.mockResolvedValue({
        data: { user, session },
        error: null,
      });

      const result = await authService.signUp(email, password);

      expectApiSuccess(result);
      expect(result.data).toEqual({ user, session });
      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email,
        password,
      });
    });

    it('should validate email format', async () => {
      const invalidEmail = 'not-an-email';
      const password = 'SecureP@ssw0rd!';

      const result = await authService.signUp(invalidEmail, password);

      expectApiError(result, {
        code: 'INVALID_EMAIL',
        message: 'Invalid email format',
      });
      expect(supabase.auth.signUp).not.toHaveBeenCalled();
    });

    it('should validate password strength', async () => {
      const email = 'user@example.com';
      const weakPassword = 'weak';

      const result = await authService.signUp(email, weakPassword);

      expectApiError(result, {
        code: 'WEAK_PASSWORD',
        message: 'Password must be at least 8 characters',
      });
      expect(supabase.auth.signUp).not.toHaveBeenCalled();
    });

    it('should create user profile and avatar after signup', async () => {
      const email = 'newuser@example.com';
      const password = 'SecureP@ssw0rd!';
      const username = 'newuser';
      const user = createUser({ email });
      const session = createSession({ user });
      const profile = createProfile({ user_id: user.id, username });
      const avatar = createAvatar({ user_id: user.id });

      supabase.auth.signUp.mockResolvedValue({
        data: { user, session },
        error: null,
      });

      supabase.tables.profiles.insert().setMockData([profile]);
      supabase.tables.avatars.insert().setMockData([avatar]);

      const result = await authService.signUp(email, password, { username });

      expectApiSuccess(result);
      expect(supabase.from).toHaveBeenCalledWith('profiles');
      expect(supabase.from).toHaveBeenCalledWith('avatars');
    });

    it('should handle duplicate email error', async () => {
      const email = 'existing@example.com';
      const password = 'SecureP@ssw0rd!';

      supabase.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: createSupabaseError('User already registered', '23505'),
      });

      const result = await authService.signUp(email, password);

      expectApiError(result, {
        code: 'EMAIL_EXISTS',
        message: 'Email already registered',
      });
    });

    it('should rollback profile creation if avatar creation fails', async () => {
      const email = 'newuser@example.com';
      const password = 'SecureP@ssw0rd!';
      const user = createUser({ email });
      const session = createSession({ user });

      supabase.auth.signUp.mockResolvedValue({
        data: { user, session },
        error: null,
      });

      // Mock from() to return different values for profiles and avatars
      let fromCallCount = 0;
      supabase.from.mockImplementation((table: string) => {
        fromCallCount++;
        
        if (table === 'profiles' && fromCallCount === 1) {
          // First call for profile insert - success
          return {
            insert: vi.fn().mockResolvedValue({
              data: [createProfile({ user_id: user.id })],
              error: null,
            }),
          };
        } else if (table === 'avatars' && fromCallCount === 2) {
          // Second call for avatar insert - failure
          return {
            insert: vi.fn().mockResolvedValue({
              data: null,
              error: createSupabaseError('Avatar creation failed'),
            }),
          };
        } else if (table === 'profiles' && fromCallCount === 3) {
          // Third call for profile deletion (rollback)
          return {
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          };
        }
        
        return supabase.tables[table as keyof typeof supabase.tables];
      });

      const result = await authService.signUp(email, password, { username: 'newuser' });

      expectApiError(result, {
        code: 'SIGNUP_FAILED',
        message: 'Failed to complete signup',
      });

      // Verify cleanup was attempted - profiles table was called 2 times (insert and delete)
      expect(supabase.from).toHaveBeenCalledWith('profiles');
      expect(supabase.from).toHaveBeenCalledWith('avatars');
      expect(fromCallCount).toBe(3); // profiles insert, avatars insert, profiles delete
    });
  });

  describe('signIn', () => {
    it('should sign in with email and password', async () => {
      const email = 'user@example.com';
      const password = 'SecureP@ssw0rd!';
      const user = createUser({ email });
      const session = createSession({ user });

      supabase.auth.signInWithPassword.mockResolvedValue({
        data: { user, session },
        error: null,
      });

      const result = await authService.signIn(email, password);

      expectApiSuccess(result);
      expect(result.data).toEqual({ user, session });
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email,
        password,
      });
    });

    it('should handle invalid credentials', async () => {
      const email = 'user@example.com';
      const password = 'WrongPassword';

      supabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: createSupabaseError('Invalid login credentials', 'invalid_credentials'),
      });

      const result = await authService.signIn(email, password);

      expectApiError(result, {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
    });

    it('should handle rate limiting', async () => {
      const email = 'user@example.com';
      const password = 'SecureP@ssw0rd!';

      supabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: createSupabaseError('Too many requests', '429'),
      });

      const result = await authService.signIn(email, password);

      expectApiError(result, {
        code: 'RATE_LIMITED',
        message: 'Too many login attempts',
      });
    });

    it('should track failed login attempts', async () => {
      const email = 'user@example.com';
      const password = 'WrongPassword';

      supabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: createSupabaseError('Invalid login credentials'),
      });

      // Multiple failed attempts
      for (let i = 0; i < 3; i++) {
        await authService.signIn(email, password);
      }

      const attempts = authService.getFailedAttempts(email);
      expect(attempts).toBe(3);
    });
  });

  describe('signOut', () => {
    it('should sign out the current user', async () => {
      supabase.auth.signOut.mockResolvedValue({
        error: null,
      });

      const result = await authService.signOut();

      expectApiSuccess(result);
      expect(supabase.auth.signOut).toHaveBeenCalled();
    });

    it('should handle signout errors gracefully', async () => {
      supabase.auth.signOut.mockResolvedValue({
        error: createSupabaseError('Network error'),
      });

      const result = await authService.signOut();

      // Should still succeed to clear local state
      expectApiSuccess(result);
      expect(supabase.auth.signOut).toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should send password reset email', async () => {
      const email = 'user@example.com';

      supabase.auth.resetPasswordForEmail.mockResolvedValue({
        data: {},
        error: null,
      });

      const result = await authService.resetPassword(email);

      expectApiSuccess(result);
      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(email, {
        redirectTo: expect.stringContaining('/reset-password'),
      });
    });

    it('should validate email before sending reset', async () => {
      const invalidEmail = 'not-an-email';

      const result = await authService.resetPassword(invalidEmail);

      expectApiError(result, {
        code: 'INVALID_EMAIL',
        message: 'Invalid email format',
      });
      expect(supabase.auth.resetPasswordForEmail).not.toHaveBeenCalled();
    });

    it('should rate limit password reset requests', async () => {
      const email = 'user@example.com';

      supabase.auth.resetPasswordForEmail.mockResolvedValue({
        data: {},
        error: null,
      });

      // First request should succeed
      const result1 = await authService.resetPassword(email);
      expectApiSuccess(result1);

      // Immediate second request should be rate limited
      const result2 = await authService.resetPassword(email);
      expectApiError(result2, {
        code: 'RATE_LIMITED',
        message: 'Please wait before requesting another reset',
      });
    });
  });

  describe('updatePassword', () => {
    it('should update user password', async () => {
      const newPassword = 'NewSecureP@ssw0rd!';
      const user = createUser();

      mockAuthState(supabase, user, createSession({ user }));

      supabase.auth.updateUser.mockResolvedValue({
        data: { user },
        error: null,
      });

      const result = await authService.updatePassword(newPassword);

      expectApiSuccess(result);
      expect(supabase.auth.updateUser).toHaveBeenCalledWith({
        password: newPassword,
      });
    });

    it('should require authenticated user', async () => {
      mockAuthState(supabase, null, null);

      const result = await authService.updatePassword('NewPassword');

      expectApiError(result, {
        code: 'UNAUTHORIZED',
        message: 'Must be authenticated',
      });
    });

    it('should validate new password strength', async () => {
      const user = createUser();
      mockAuthState(supabase, user, createSession({ user }));

      const result = await authService.updatePassword('weak');

      expectApiError(result, {
        code: 'WEAK_PASSWORD',
        message: 'Password must be at least 8 characters',
      });
    });
  });

  describe('getCurrentUser', () => {
    it('should return current authenticated user', async () => {
      const user = createUser();
      const session = createSession({ user });

      mockAuthState(supabase, user, session);

      const result = await authService.getCurrentUser();

      expectApiSuccess(result);
      expect(result.data).toEqual({ user, session });
    });

    it('should return null when not authenticated', async () => {
      mockAuthState(supabase, null, null);

      const result = await authService.getCurrentUser();

      expectApiSuccess(result);
      expect(result.data).toEqual({ user: null, session: null });
    });
  });

  describe('refreshSession', () => {
    it('should refresh the current session', async () => {
      const user = createUser();
      const oldSession = createSession({ user });
      const newSession = createSession({
        user,
        access_token: 'new_token',
        expires_at: Math.floor(Date.now() / 1000) + 7200,
      });

      mockAuthState(supabase, user, oldSession);

      supabase.auth.refreshSession.mockResolvedValue({
        data: { session: newSession },
        error: null,
      });

      const result = await authService.refreshSession();

      expectApiSuccess(result);
      expect(result.data).toEqual({ session: newSession });
      expect(supabase.auth.refreshSession).toHaveBeenCalled();
    });

    it('should handle refresh token expiry', async () => {
      const user = createUser();
      const session = createSession({ user });

      mockAuthState(supabase, user, session);

      supabase.auth.refreshSession.mockResolvedValue({
        data: { session: null },
        error: createSupabaseError('Refresh token expired', 'invalid_grant'),
      });

      const result = await authService.refreshSession();

      expectApiError(result, {
        code: 'SESSION_EXPIRED',
        message: 'Session expired, please sign in again',
      });
    });
  });

  describe('OAuth providers', () => {
    it('should sign in with Google', async () => {
      supabase.auth.signInWithOAuth.mockResolvedValue({
        data: {
          provider: 'google',
          url: 'https://accounts.google.com/oauth/authorize?...',
        },
        error: null,
      });

      const result = await authService.signInWithOAuth('google');

      expectApiSuccess(result);
      expect(result.data?.provider).toBe('google');
      expect(result.data?.url).toContain('google.com');
      expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: expect.stringContaining('/auth/callback'),
        },
      });
    });

    it('should sign in with Apple', async () => {
      supabase.auth.signInWithOAuth.mockResolvedValue({
        data: {
          provider: 'apple',
          url: 'https://appleid.apple.com/auth/authorize?...',
        },
        error: null,
      });

      const result = await authService.signInWithOAuth('apple');

      expectApiSuccess(result);
      expect(result.data?.provider).toBe('apple');
      expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'apple',
        options: {
          redirectTo: expect.stringContaining('/auth/callback'),
        },
      });
    });

    it('should handle OAuth errors', async () => {
      supabase.auth.signInWithOAuth.mockResolvedValue({
        data: null,
        error: createSupabaseError('OAuth provider error'),
      });

      const result = await authService.signInWithOAuth('google');

      expectApiError(result, {
        code: 'OAUTH_ERROR',
        message: 'Failed to authenticate with Google',
      });
    });
  });

  describe('session management', () => {
    it('should subscribe to auth state changes', async () => {
      const callback = vi.fn();
      const unsubscribe = vi.fn();

      supabase.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe } },
        error: null,
      });

      authService.onAuthStateChange(callback);

      expect(supabase.auth.onAuthStateChange).toHaveBeenCalledWith(expect.any(Function));

      // Simulate auth state change
      const mockStateChange = supabase.auth.onAuthStateChange.mock.calls[0][0];
      const user = createUser();
      const session = createSession({ user });

      mockStateChange('SIGNED_IN', session);
      expect(callback).toHaveBeenCalledWith('SIGNED_IN', session);
    });

    it('should validate session token', async () => {
      const user = createUser();
      const validSession = createSession({
        user,
        expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      });

      mockAuthState(supabase, user, validSession);

      const result = await authService.validateSession();

      expectApiSuccess(result);
      expect(result.data?.valid).toBe(true);
    });

    it('should detect expired session', async () => {
      const user = createUser();
      const expiredSession = createSession({
        user,
        expires_at: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
      });

      mockAuthState(supabase, user, expiredSession);

      const result = await authService.validateSession();

      expectApiSuccess(result);
      expect(result.data?.valid).toBe(false);
      expect(result.data?.reason).toBe('expired');
    });
  });

  describe('multi-factor authentication', () => {
    it('should enroll TOTP MFA', async () => {
      const user = createUser();
      mockAuthState(supabase, user, createSession({ user }));

      supabase.auth.mfa = {
        enroll: vi.fn().mockResolvedValue({
          data: {
            id: 'mfa_factor_id',
            type: 'totp',
            secret: 'JBSWY3DPEHPK3PXP',
            uri: 'otpauth://totp/VibeStack:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=VibeStack',
            qr_code: 'data:image/png;base64,...',
          },
          error: null,
        }),
      };

      const result = await authService.enrollMFA('totp');

      expectApiSuccess(result);
      expect(result.data?.type).toBe('totp');
      expect(result.data?.secret).toBeDefined();
      expect(result.data?.qr_code).toBeDefined();
    });

    it('should verify MFA code', async () => {
      const user = createUser();
      mockAuthState(supabase, user, createSession({ user }));

      supabase.auth.mfa = {
        verify: vi.fn().mockResolvedValue({
          data: { verified: true },
          error: null,
        }),
      };

      const result = await authService.verifyMFA('123456');

      expectApiSuccess(result);
      expect(result.data?.verified).toBe(true);
    });

    it('should handle invalid MFA code', async () => {
      const user = createUser();
      mockAuthState(supabase, user, createSession({ user }));

      supabase.auth.mfa = {
        verify: vi.fn().mockResolvedValue({
          data: null,
          error: createSupabaseError('Invalid code', 'invalid_code'),
        }),
      };

      const result = await authService.verifyMFA('000000');

      expectApiError(result, {
        code: 'INVALID_MFA_CODE',
        message: 'Invalid verification code',
      });
    });
  });

  describe('performance', () => {
    it('should complete sign up within performance threshold', async () => {
      const user = createUser();
      const session = createSession({ user });

      supabase.auth.signUp.mockResolvedValue({
        data: { user, session },
        error: null,
      });

      await measurePerformance(
        'AuthService.signUp',
        async () => {
          await authService.signUp('test@example.com', 'SecureP@ssw0rd!');
        },
        100, // 100ms threshold
      );
    });

    it('should complete sign in within performance threshold', async () => {
      const user = createUser();
      const session = createSession({ user });

      supabase.auth.signInWithPassword.mockResolvedValue({
        data: { user, session },
        error: null,
      });

      await measurePerformance(
        'AuthService.signIn',
        async () => {
          await authService.signIn('test@example.com', 'SecureP@ssw0rd!');
        },
        50, // 50ms threshold
      );
    });
  });
});

