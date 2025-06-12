import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import {
  createUser,
  createNotification,
  createNotificationPreference,
  createDevice,
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
const mockNotificationService = {
  getNotifications: vi.fn(),
  markAsRead: vi.fn(),
  deleteNotification: vi.fn(),
  deleteAllNotifications: vi.fn(),
  getPreferences: vi.fn(),
  updatePreferences: vi.fn(),
  registerDevice: vi.fn(),
  unregisterDevice: vi.fn(),
  getDevices: vi.fn(),
  sendNotification: vi.fn(),
  sendBulkNotifications: vi.fn(),
  getUnreadCount: vi.fn(),
  testPushNotification: vi.fn(),
};

vi.mock('../../../services', () => ({
  NotificationService: vi.fn().mockImplementation(() => mockNotificationService),
}));

// Now import the routes after mocking
const { notificationRoutes } = await import('../../../api/routes/notificationRoutes');
const { resetRateLimits } = await import('../../../middleware/rateLimitingMiddleware');

describe('Notification Routes', () => {
  let app: express.Application;
  let notificationService: typeof mockNotificationService;
  let authenticatedUser: any;

  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimits();
    app = express();
    app.use(express.json());
    notificationService = mockNotificationService;
    app.use('/notifications', notificationRoutes);
    
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

  describe('GET /notifications', () => {
    it('should get user notifications', async () => {
      const notifications = [
        createNotification({ user_id: authenticatedUser.id }),
        createNotification({ user_id: authenticatedUser.id }),
      ];

      notificationService.getNotifications.mockResolvedValue({
        success: true,
        data: notifications,
      });

      const response = await request(app)
        .get('/notifications')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(notificationService.getNotifications).toHaveBeenCalledWith({});
    });

    it('should filter by type', async () => {
      notificationService.getNotifications.mockResolvedValue({
        success: true,
        data: [],
      });

      const response = await request(app)
        .get('/notifications?type=habit_reminder')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(notificationService.getNotifications).toHaveBeenCalledWith({
        type: 'habit_reminder',
      });
    });

    it('should filter by read status', async () => {
      notificationService.getNotifications.mockResolvedValue({
        success: true,
        data: [],
      });

      const response = await request(app)
        .get('/notifications?read=false')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(notificationService.getNotifications).toHaveBeenCalledWith({
        read: false,
      });
    });

    it('should support pagination', async () => {
      notificationService.getNotifications.mockResolvedValue({
        success: true,
        data: [],
      });

      const response = await request(app)
        .get('/notifications?limit=10&offset=20')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(notificationService.getNotifications).toHaveBeenCalledWith({
        limit: 10,
        offset: 20,
      });
    });

    it('should require authentication', async () => {
      const response = await request(app).get('/notifications');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('PUT /notifications/read', () => {
    it('should mark notifications as read', async () => {
      const notificationIds = ['notif-1', 'notif-2'];

      notificationService.markAsRead.mockResolvedValue({
        success: true,
      });

      const response = await request(app)
        .put('/notifications/read')
        .set('Authorization', 'Bearer valid-token')
        .send({ notificationIds });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(notificationService.markAsRead).toHaveBeenCalledWith(notificationIds);
    });

    it('should mark single notification as read', async () => {
      const notificationIds = ['notif-1'];

      notificationService.markAsRead.mockResolvedValue({
        success: true,
      });

      const response = await request(app)
        .put('/notifications/read')
        .set('Authorization', 'Bearer valid-token')
        .send({ notificationIds });

      expect(response.status).toBe(200);
      expect(notificationService.markAsRead).toHaveBeenCalledWith(notificationIds);
    });

    it('should validate notificationIds', async () => {
      const response = await request(app)
        .put('/notifications/read')
        .set('Authorization', 'Bearer valid-token')
        .send({ notificationIds: [] }); // Empty array

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('DELETE /notifications/:notificationId', () => {
    it('should delete a notification', async () => {
      const notificationId = 'notif-123';

      notificationService.deleteNotification.mockResolvedValue({
        success: true,
      });

      const response = await request(app)
        .delete(`/notifications/${notificationId}`)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(notificationService.deleteNotification).toHaveBeenCalledWith(
        notificationId
      );
    });
  });

  describe('DELETE /notifications', () => {
    it('should delete all notifications', async () => {
      notificationService.deleteAllNotifications.mockResolvedValue({
        success: true,
      });

      const response = await request(app)
        .delete('/notifications')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(notificationService.deleteAllNotifications).toHaveBeenCalled();
    });
  });

  describe('GET /notifications/preferences', () => {
    it('should get notification preferences', async () => {
      const preferences = createNotificationPreference({
        user_id: authenticatedUser.id,
      });

      notificationService.getPreferences.mockResolvedValue({
        success: true,
        data: preferences,
      });

      const response = await request(app)
        .get('/notifications/preferences')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(preferences);
      expect(notificationService.getPreferences).toHaveBeenCalled();
    });
  });

  describe('PUT /notifications/preferences', () => {
    it('should update notification preferences', async () => {
      const updates = {
        push_enabled: false,
        email_enabled: true,
        habit_reminders: false,
        quiet_hours_start: '22:00',
        quiet_hours_end: '08:00',
      };

      const updatedPreferences = createNotificationPreference({
        ...updates,
        user_id: authenticatedUser.id,
      });

      notificationService.updatePreferences.mockResolvedValue({
        success: true,
        data: updatedPreferences,
      });

      const response = await request(app)
        .put('/notifications/preferences')
        .set('Authorization', 'Bearer valid-token')
        .send(updates);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.push_enabled).toBe(false);
      expect(notificationService.updatePreferences).toHaveBeenCalledWith(updates);
    });

    it('should validate time format', async () => {
      const invalidUpdates = {
        quiet_hours_start: '25:00', // Invalid time
      };

      const response = await request(app)
        .put('/notifications/preferences')
        .set('Authorization', 'Bearer valid-token')
        .send(invalidUpdates);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /notifications/devices', () => {
    it('should register a device', async () => {
      const deviceData = {
        token: 'device-token-123',
        platform: 'ios',
        device_name: 'iPhone 15',
      };

      const registeredDevice = createDevice({
        ...deviceData,
        user_id: authenticatedUser.id,
      });

      notificationService.registerDevice.mockResolvedValue({
        success: true,
        data: registeredDevice,
      });

      const response = await request(app)
        .post('/notifications/devices')
        .set('Authorization', 'Bearer valid-token')
        .send(deviceData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBe(deviceData.token);
      expect(notificationService.registerDevice).toHaveBeenCalledWith(deviceData);
    });

    it('should validate platform', async () => {
      const invalidData = {
        token: 'device-token-123',
        platform: 'invalid', // Should be ios/android/web
      };

      const response = await request(app)
        .post('/notifications/devices')
        .set('Authorization', 'Bearer valid-token')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('DELETE /notifications/devices/:deviceId', () => {
    it('should unregister a device', async () => {
      const deviceId = 'device-123';

      notificationService.unregisterDevice.mockResolvedValue({
        success: true,
      });

      const response = await request(app)
        .delete(`/notifications/devices/${deviceId}`)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(notificationService.unregisterDevice).toHaveBeenCalledWith(deviceId);
    });
  });

  describe('GET /notifications/devices', () => {
    it('should get registered devices', async () => {
      const devices = [
        createDevice({ user_id: authenticatedUser.id }),
        createDevice({ user_id: authenticatedUser.id, platform: 'android' }),
      ];

      notificationService.getDevices.mockResolvedValue({
        success: true,
        data: devices,
      });

      const response = await request(app)
        .get('/notifications/devices')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(notificationService.getDevices).toHaveBeenCalled();
    });
  });

  describe('POST /notifications/send', () => {
    it('should send a notification', async () => {
      const notificationData = {
        recipientId: 'user-456',
        type: 'friend_request',
        title: 'New Friend Request',
        body: 'John Doe wants to be your friend',
        data: { requestId: 'request-123' },
      };

      const sentNotification = createNotification({
        user_id: notificationData.recipientId,
        type: notificationData.type,
        title: notificationData.title,
        message: notificationData.body,
      });

      notificationService.sendNotification.mockResolvedValue({
        success: true,
        data: sentNotification,
      });

      const response = await request(app)
        .post('/notifications/send')
        .set('Authorization', 'Bearer valid-token')
        .send(notificationData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(notificationService.sendNotification).toHaveBeenCalledWith(notificationData);
    });

    it('should validate required fields', async () => {
      const invalidData = {
        recipientId: 'user-456',
        // Missing type, title, body
      };

      const response = await request(app)
        .post('/notifications/send')
        .set('Authorization', 'Bearer valid-token')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /notifications/unread-count', () => {
    it('should get unread notification count', async () => {
      notificationService.getUnreadCount.mockResolvedValue({
        success: true,
        data: { count: 5 },
      });

      const response = await request(app)
        .get('/notifications/unread-count')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.count).toBe(5);
      expect(notificationService.getUnreadCount).toHaveBeenCalled();
    });
  });

  describe('POST /notifications/test-push', () => {
    it('should send test push notification', async () => {
      const testData = {
        deviceId: 'device-123',
      };

      notificationService.testPushNotification.mockResolvedValue({
        success: true,
      });

      const response = await request(app)
        .post('/notifications/test-push')
        .set('Authorization', 'Bearer valid-token')
        .send(testData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(notificationService.testPushNotification).toHaveBeenCalledWith(
        testData.deviceId
      );
    });
  });

  describe('Rate limiting', () => {
    it('should rate limit notification sending', async () => {
      const notificationData = {
        recipientId: 'user-456',
        type: 'friend_request',
        title: 'Test',
        body: 'Test notification',
      };

      notificationService.sendNotification.mockResolvedValue({
        success: true,
        data: createNotification(),
      });

      // Make multiple requests
      for (let i = 0; i < 51; i++) {
        await request(app)
          .post('/notifications/send')
          .set('Authorization', 'Bearer valid-token')
          .send(notificationData);
      }

      // Next request should be rate limited
      const response = await request(app)
        .post('/notifications/send')
        .set('Authorization', 'Bearer valid-token')
        .send(notificationData);

      expect(response.status).toBe(429);
      expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    });
  });
});