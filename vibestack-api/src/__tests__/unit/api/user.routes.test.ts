import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import {
  createUser,
  createSession,
  createProfile,
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
const mockUserService = {
  getProfile: vi.fn(),
  updateProfile: vi.fn(),
  uploadAvatar: vi.fn(),
  deleteAvatar: vi.fn(),
  updatePrivacySettings: vi.fn(),
  updateNotificationPreferences: vi.fn(),
  searchUsers: vi.fn(),
  getPublicProfile: vi.fn(),
  deleteAccount: vi.fn(),
};

vi.mock('../../../services', () => ({
  UserService: vi.fn().mockImplementation(() => mockUserService),
}));

// Now import the routes after mocking
const { userRoutes } = await import('../../../api/routes/userManagementRoutes');
const { resetRateLimits } = await import('../../../middleware/rateLimitingMiddleware');

describe('User Management Routes', () => {
  let app: express.Application;
  let userService: typeof mockUserService;
  let authenticatedUser: any;

  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimits(); // Clear rate limits between tests
    app = express();
    app.use(express.json());
    userService = mockUserService;
    app.use('/users', userRoutes);
    
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

  describe('GET /users/profile', () => {
    it('should get current user profile', async () => {
      const profile = createProfile({ user_id: authenticatedUser.id });
      
      userService.getProfile.mockResolvedValue({
        success: true,
        data: profile,
      });

      const response = await request(app)
        .get('/users/profile')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(profile);
      expect(userService.getProfile).toHaveBeenCalledWith(authenticatedUser.id);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/users/profile');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should handle profile not found', async () => {
      userService.getProfile.mockResolvedValue({
        success: false,
        error: {
          code: 'PROFILE_NOT_FOUND',
          message: 'Profile not found',
        },
      });

      const response = await request(app)
        .get('/users/profile')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('PROFILE_NOT_FOUND');
    });
  });

  describe('PUT /users/profile', () => {
    it('should update user profile', async () => {
      const updates = {
        display_name: 'Updated Name',
        bio: 'Updated bio',
      };

      const updatedProfile = createProfile({ 
        user_id: authenticatedUser.id,
        ...updates 
      });

      userService.updateProfile.mockResolvedValue({
        success: true,
        data: updatedProfile,
      });

      const response = await request(app)
        .put('/users/profile')
        .set('Authorization', 'Bearer valid-token')
        .send(updates);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.display_name).toBe(updates.display_name);
      expect(userService.updateProfile).toHaveBeenCalledWith(
        authenticatedUser.id,
        updates
      );
    });

    it('should validate username format', async () => {
      const updates = {
        username: 'invalid username!', // Contains space and special char
      };

      const response = await request(app)
        .put('/users/profile')
        .set('Authorization', 'Bearer valid-token')
        .send(updates);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle username conflicts', async () => {
      const updates = {
        username: 'existinguser',
      };

      userService.updateProfile.mockResolvedValue({
        success: false,
        error: {
          code: 'USERNAME_TAKEN',
          message: 'Username is already taken',
        },
      });

      const response = await request(app)
        .put('/users/profile')
        .set('Authorization', 'Bearer valid-token')
        .send(updates);

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('USERNAME_TAKEN');
    });
  });

  describe('POST /users/avatar', () => {
    it('should upload avatar', async () => {
      const avatarUrl = 'https://example.com/avatar.jpg';
      
      userService.uploadAvatar.mockResolvedValue({
        success: true,
        data: { avatar_url: avatarUrl },
      });

      const response = await request(app)
        .post('/users/avatar')
        .set('Authorization', 'Bearer valid-token')
        .attach('avatar', Buffer.from('fake-image'), 'avatar.jpg');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.avatar_url).toBe(avatarUrl);
    });

    it('should validate file type', async () => {
      const response = await request(app)
        .post('/users/avatar')
        .set('Authorization', 'Bearer valid-token')
        .attach('avatar', Buffer.from('fake-file'), 'document.pdf');

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_FILE_TYPE');
    });

    it('should validate file size', async () => {
      // Create a large buffer (over 5MB)
      const largeBuffer = Buffer.alloc(6 * 1024 * 1024);
      
      const response = await request(app)
        .post('/users/avatar')
        .set('Authorization', 'Bearer valid-token')
        .attach('avatar', largeBuffer, 'large.jpg');

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('FILE_TOO_LARGE');
    });
  });

  describe('DELETE /users/avatar', () => {
    it('should delete avatar', async () => {
      userService.deleteAvatar.mockResolvedValue({
        success: true,
      });

      const response = await request(app)
        .delete('/users/avatar')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(userService.deleteAvatar).toHaveBeenCalled();
    });
  });

  describe('PUT /users/privacy', () => {
    it('should update privacy settings', async () => {
      const privacySettings = {
        profile_visibility: 'friends',
        show_activity: false,
        allow_friend_requests: true,
      };

      userService.updatePrivacySettings.mockResolvedValue({
        success: true,
        data: privacySettings,
      });

      const response = await request(app)
        .put('/users/privacy')
        .set('Authorization', 'Bearer valid-token')
        .send(privacySettings);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(privacySettings);
      expect(userService.updatePrivacySettings).toHaveBeenCalledWith(
        authenticatedUser.id,
        privacySettings
      );
    });

    it('should validate privacy settings', async () => {
      const invalidSettings = {
        profile_visibility: 'invalid', // Should be public/friends/private
      };

      const response = await request(app)
        .put('/users/privacy')
        .set('Authorization', 'Bearer valid-token')
        .send(invalidSettings);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PUT /users/notifications', () => {
    it('should update notification preferences', async () => {
      const notificationPrefs = {
        email_notifications: true,
        push_notifications: false,
        habit_reminders: true,
      };

      userService.updateNotificationPreferences.mockResolvedValue({
        success: true,
        data: notificationPrefs,
      });

      const response = await request(app)
        .put('/users/notifications')
        .set('Authorization', 'Bearer valid-token')
        .send(notificationPrefs);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(notificationPrefs);
    });
  });

  describe('GET /users/search', () => {
    it('should search users', async () => {
      const searchResults = [
        createProfile({ username: 'testuser1' }),
        createProfile({ username: 'testuser2' }),
      ];

      userService.searchUsers.mockResolvedValue({
        success: true,
        data: searchResults,
      });

      const response = await request(app)
        .get('/users/search?q=test')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(searchResults);
      expect(userService.searchUsers).toHaveBeenCalledWith('test', {
        limit: 20,
        offset: 0,
      });
    });

    it('should require search query', async () => {
      const response = await request(app)
        .get('/users/search')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should validate search query length', async () => {
      const response = await request(app)
        .get('/users/search?q=a') // Too short
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should support pagination', async () => {
      userService.searchUsers.mockResolvedValue({
        success: true,
        data: [],
      });

      const response = await request(app)
        .get('/users/search?q=test&limit=10&offset=20')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(userService.searchUsers).toHaveBeenCalledWith('test', {
        limit: 10,
        offset: 20,
      });
    });
  });

  describe('GET /users/:userId', () => {
    it('should get public profile', async () => {
      const userId = 'user-123';
      const publicProfile = createProfile({ user_id: userId });

      userService.getPublicProfile.mockResolvedValue({
        success: true,
        data: publicProfile,
      });

      const response = await request(app)
        .get(`/users/${userId}`)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(publicProfile);
      expect(userService.getPublicProfile).toHaveBeenCalledWith(userId);
    });

    it('should handle private profiles', async () => {
      const userId = 'private-user';

      userService.getPublicProfile.mockResolvedValue({
        success: false,
        error: {
          code: 'PROFILE_PRIVATE',
          message: 'This profile is private',
        },
      });

      const response = await request(app)
        .get(`/users/${userId}`)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('PROFILE_PRIVATE');
    });

    it('should handle non-existent users', async () => {
      const userId = 'non-existent';

      userService.getPublicProfile.mockResolvedValue({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });

      const response = await request(app)
        .get(`/users/${userId}`)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('USER_NOT_FOUND');
    });
  });

  describe('DELETE /users/account', () => {
    it('should delete account with confirmation', async () => {
      const deleteData = {
        password: 'currentpassword',
        confirmation: 'DELETE MY ACCOUNT',
      };

      userService.deleteAccount.mockResolvedValue({
        success: true,
      });

      const response = await request(app)
        .delete('/users/account')
        .set('Authorization', 'Bearer valid-token')
        .send(deleteData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(userService.deleteAccount).toHaveBeenCalledWith(
        authenticatedUser.id,
        deleteData.password
      );
    });

    it('should require correct confirmation text', async () => {
      const deleteData = {
        password: 'currentpassword',
        confirmation: 'delete my account', // Wrong case
      };

      const response = await request(app)
        .delete('/users/account')
        .set('Authorization', 'Bearer valid-token')
        .send(deleteData);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should require password', async () => {
      const deleteData = {
        confirmation: 'DELETE MY ACCOUNT',
      };

      const response = await request(app)
        .delete('/users/account')
        .set('Authorization', 'Bearer valid-token')
        .send(deleteData);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle incorrect password', async () => {
      const deleteData = {
        password: 'wrongpassword',
        confirmation: 'DELETE MY ACCOUNT',
      };

      userService.deleteAccount.mockResolvedValue({
        success: false,
        error: {
          code: 'INVALID_PASSWORD',
          message: 'Invalid password',
        },
      });

      const response = await request(app)
        .delete('/users/account')
        .set('Authorization', 'Bearer valid-token')
        .send(deleteData);

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('INVALID_PASSWORD');
    });
  });

  describe('Rate limiting', () => {
    it('should rate limit profile updates', async () => {
      const updates = {
        display_name: 'Test',
      };

      userService.updateProfile.mockResolvedValue({
        success: true,
        data: createProfile(),
      });

      // Make multiple requests
      for (let i = 0; i < 11; i++) {
        await request(app)
          .put('/users/profile')
          .set('Authorization', 'Bearer valid-token')
          .send(updates);
      }

      // Next request should be rate limited
      const response = await request(app)
        .put('/users/profile')
        .set('Authorization', 'Bearer valid-token')
        .send(updates);

      expect(response.status).toBe(429);
      expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    });
  });
});