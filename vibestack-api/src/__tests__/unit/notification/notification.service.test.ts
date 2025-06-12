import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NotificationService } from '../../../services/notification.service';
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
  createSession,
  createNotification,
  createNotificationPreference,
  createDevice,
  testScenarios,
} from '../../fixtures/test-data';

describe('NotificationService', () => {
  let notificationService: NotificationService;
  let supabase: SupabaseMock;

  beforeEach(() => {
    const test = setupTest();
    supabase = test.supabase;
    notificationService = new NotificationService(supabase as any);
  });

  afterEach(() => {
    teardownTest();
  });

  describe('getNotifications', () => {
    it('should get user notifications', async () => {
      const user = createUser();
      const notifications = [
        createNotification({ user_id: user.id }),
        createNotification({ user_id: user.id, read: true }),
      ];

      mockAuthState(supabase, user, createSession({ user }));

      supabase.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: notifications,
              error: null,
            }),
          }),
        }),
      }));

      const result = await notificationService.getNotifications();

      expectApiSuccess(result);
      expect(result.data).toHaveLength(2);
    });

    it('should filter by read status', async () => {
      const user = createUser();
      const unreadNotifications = [
        createNotification({ user_id: user.id, read: false }),
      ];

      mockAuthState(supabase, user, createSession({ user }));

      supabase.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: unreadNotifications,
                error: null,
              }),
            }),
          }),
        }),
      }));

      const result = await notificationService.getNotifications({ unread: true });

      expectApiSuccess(result);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].read).toBe(false);
    });

    it('should filter by type', async () => {
      const user = createUser();
      const friendRequests = [
        createNotification({ user_id: user.id, type: 'friend_request' }),
      ];

      mockAuthState(supabase, user, createSession({ user }));

      supabase.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: friendRequests,
                error: null,
              }),
            }),
          }),
        }),
      }));

      const result = await notificationService.getNotifications({ 
        type: 'friend_request' 
      });

      expectApiSuccess(result);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].type).toBe('friend_request');
    });

    it('should paginate results', async () => {
      const user = createUser();
      const notifications = Array.from({ length: 10 }, () => 
        createNotification({ user_id: user.id })
      );

      mockAuthState(supabase, user, createSession({ user }));

      supabase.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({
                data: notifications.slice(0, 5),
                error: null,
              }),
            }),
          }),
        }),
      }));

      const result = await notificationService.getNotifications({ 
        limit: 5,
        offset: 0 
      });

      expectApiSuccess(result);
      expect(result.data).toHaveLength(5);
    });

    it('should require authentication', async () => {
      mockAuthState(supabase, null, null);

      const result = await notificationService.getNotifications();

      expectApiError(result, {
        code: 'UNAUTHORIZED',
        message: 'Must be authenticated',
      });
    });
  });

  describe('markAsRead', () => {
    it('should mark single notification as read', async () => {
      const user = createUser();
      const notification = createNotification({ 
        user_id: user.id, 
        read: false 
      });

      mockAuthState(supabase, user, createSession({ user }));

      // Mock get notification
      supabase.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: notification,
              error: null,
            }),
          }),
        }),
      }));

      // Mock update
      supabase.from.mockImplementationOnce(() => ({
        update: vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      }));

      const result = await notificationService.markAsRead(notification.id);

      expectApiSuccess(result);
    });

    it('should mark multiple notifications as read', async () => {
      const user = createUser();
      const notificationIds = ['notif-1', 'notif-2', 'notif-3'];

      mockAuthState(supabase, user, createSession({ user }));

      // Mock update multiple
      supabase.from.mockImplementationOnce(() => ({
        update: vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      }));

      const result = await notificationService.markAsRead(notificationIds);

      expectApiSuccess(result);
    });

    it('should prevent marking other user notifications', async () => {
      const user = createUser();
      const otherUser = createUser();
      const notification = createNotification({ 
        user_id: otherUser.id 
      });

      mockAuthState(supabase, user, createSession({ user }));

      // Mock get notification
      supabase.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: notification,
              error: null,
            }),
          }),
        }),
      }));

      const result = await notificationService.markAsRead(notification.id);

      expectApiError(result, {
        code: 'FORBIDDEN',
        message: 'Cannot mark notifications for another user',
      });
    });
  });

  describe('deleteNotification', () => {
    it('should delete a notification', async () => {
      const user = createUser();
      const notification = createNotification({ user_id: user.id });

      mockAuthState(supabase, user, createSession({ user }));

      // Mock get notification
      supabase.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: notification,
              error: null,
            }),
          }),
        }),
      }));

      // Mock delete
      supabase.from.mockImplementationOnce(() => ({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      }));

      const result = await notificationService.deleteNotification(notification.id);

      expectApiSuccess(result);
    });

    it('should prevent deleting other user notifications', async () => {
      const user = createUser();
      const otherUser = createUser();
      const notification = createNotification({ user_id: otherUser.id });

      mockAuthState(supabase, user, createSession({ user }));

      // Mock get notification
      supabase.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: notification,
              error: null,
            }),
          }),
        }),
      }));

      const result = await notificationService.deleteNotification(notification.id);

      expectApiError(result, {
        code: 'FORBIDDEN',
        message: 'Cannot delete notifications for another user',
      });
    });
  });

  describe('getPreferences', () => {
    it('should get user notification preferences', async () => {
      const user = createUser();
      const preferences = createNotificationPreference({ user_id: user.id });

      mockAuthState(supabase, user, createSession({ user }));

      supabase.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: preferences,
              error: null,
            }),
          }),
        }),
      }));

      const result = await notificationService.getPreferences();

      expectApiSuccess(result);
      expect(result.data?.user_id).toBe(user.id);
    });

    it('should create default preferences if none exist', async () => {
      const user = createUser();

      mockAuthState(supabase, user, createSession({ user }));

      // Mock no existing preferences
      supabase.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      }));

      // Mock create default preferences
      const defaultPrefs = createNotificationPreference({ user_id: user.id });
      supabase.from.mockImplementationOnce(() => ({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: defaultPrefs,
              error: null,
            }),
          }),
        }),
      }));

      const result = await notificationService.getPreferences();

      expectApiSuccess(result);
      expect(result.data).toBeDefined();
    });
  });

  describe('updatePreferences', () => {
    it('should update notification preferences', async () => {
      const user = createUser();
      const updates = {
        push_enabled: false,
        email_enabled: true,
        habit_reminders: false,
      };

      mockAuthState(supabase, user, createSession({ user }));

      // Mock update
      const updatedPrefs = createNotificationPreference({ 
        user_id: user.id,
        ...updates 
      });
      supabase.from.mockImplementationOnce(() => ({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: updatedPrefs,
                error: null,
              }),
            }),
          }),
        }),
      }));

      const result = await notificationService.updatePreferences(updates);

      expectApiSuccess(result);
      expect(result.data?.push_enabled).toBe(false);
      expect(result.data?.email_enabled).toBe(true);
    });

    it('should validate quiet hours format', async () => {
      const user = createUser();
      const invalidUpdates = {
        quiet_hours_start: '25:00', // Invalid hour
        quiet_hours_end: '09:00',
      };

      mockAuthState(supabase, user, createSession({ user }));

      const result = await notificationService.updatePreferences(invalidUpdates);

      expectApiError(result, {
        code: 'INVALID_TIME_FORMAT',
        message: 'Invalid time format. Use HH:MM',
      });
    });
  });

  describe('registerDevice', () => {
    it('should register a new device', async () => {
      const user = createUser();
      const deviceData = {
        token: 'fcm-token-123',
        platform: 'ios' as const,
        device_name: 'iPhone 15',
      };

      mockAuthState(supabase, user, createSession({ user }));

      // Mock check existing device
      supabase.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null, // No existing device
                error: null,
              }),
            }),
          }),
        }),
      }));

      // Mock create device
      const device = createDevice({ 
        ...deviceData, 
        user_id: user.id 
      });

      supabase.from.mockImplementationOnce(() => ({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: device,
              error: null,
            }),
          }),
        }),
      }));

      const result = await notificationService.registerDevice(deviceData);

      expectApiSuccess(result);
      expect(result.data?.token).toBe(deviceData.token);
    });

    it('should update existing device token', async () => {
      const user = createUser();
      const existingDevice = createDevice({ 
        user_id: user.id,
        token: 'old-token' 
      });

      mockAuthState(supabase, user, createSession({ user }));

      // Mock find existing device
      supabase.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: existingDevice,
                error: null,
              }),
            }),
          }),
        }),
      }));

      // Mock update device
      supabase.from.mockImplementationOnce(() => ({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { ...existingDevice, token: 'new-token' },
                error: null,
              }),
            }),
          }),
        }),
      }));

      const result = await notificationService.registerDevice({
        token: 'new-token',
        platform: existingDevice.platform,
        device_name: existingDevice.device_name,
      });

      expectApiSuccess(result);
      expect(result.data?.token).toBe('new-token');
    });
  });

  describe('unregisterDevice', () => {
    it('should unregister a device', async () => {
      const user = createUser();
      const deviceToken = 'fcm-token-123';

      mockAuthState(supabase, user, createSession({ user }));

      // Mock delete device
      supabase.from.mockImplementationOnce(() => ({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      }));

      const result = await notificationService.unregisterDevice(deviceToken);

      expectApiSuccess(result);
    });
  });

  describe('sendNotification', () => {
    it('should send a notification', async () => {
      const user = createUser();
      const targetUser = createUser();
      const notificationData = {
        user_id: targetUser.id,
        type: 'friend_request' as const,
        title: 'New Friend Request',
        message: 'You have a new friend request',
        data: { from_user_id: user.id },
      };

      mockAuthState(supabase, user, createSession({ user }));

      // Mock check preferences
      const preferences = createNotificationPreference({ 
        user_id: targetUser.id,
        push_enabled: true,
        friend_requests: true,
      });

      supabase.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: preferences,
              error: null,
            }),
          }),
        }),
      }));

      // Mock create notification
      const notification = createNotification(notificationData);
      supabase.from.mockImplementationOnce(() => ({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: notification,
              error: null,
            }),
          }),
        }),
      }));

      // Mock get devices
      const devices = [createDevice({ user_id: targetUser.id })];
      supabase.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: devices,
              error: null,
            }),
          }),
        }),
      }));

      // Mock send push notification
      supabase.rpc.mockResolvedValue({
        data: { success: true },
        error: null,
      });

      const result = await notificationService.sendNotification(notificationData);

      expectApiSuccess(result);
      expect(result.data).toBeDefined();
    });

    it('should respect user preferences', async () => {
      const user = createUser();
      const targetUser = createUser();
      const notificationData = {
        user_id: targetUser.id,
        type: 'friend_request' as const,
        title: 'New Friend Request',
        message: 'You have a new friend request',
      };

      mockAuthState(supabase, user, createSession({ user }));

      // Mock preferences with friend_requests disabled
      const preferences = createNotificationPreference({ 
        user_id: targetUser.id,
        friend_requests: false,
      });

      supabase.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: preferences,
              error: null,
            }),
          }),
        }),
      }));

      const result = await notificationService.sendNotification(notificationData);

      expectApiError(result, {
        code: 'NOTIFICATIONS_DISABLED',
        message: 'User has disabled notifications for this type',
      });
    });

    it('should respect quiet hours', async () => {
      const user = createUser();
      const targetUser = createUser();
      
      // Set current time in quiet hours
      const now = new Date();
      const quietStart = '22:00';
      const quietEnd = '08:00';
      
      const preferences = createNotificationPreference({ 
        user_id: targetUser.id,
        quiet_hours_start: quietStart,
        quiet_hours_end: quietEnd,
        push_enabled: true,
        friend_requests: true,
      });

      mockAuthState(supabase, user, createSession({ user }));

      // Mock preferences
      supabase.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: preferences,
              error: null,
            }),
          }),
        }),
      }));

      // Mock time check - assume we're in quiet hours
      vi.spyOn(Date.prototype, 'getHours').mockReturnValue(23); // 11 PM

      // Mock create notification (stored but not pushed)
      supabase.from.mockImplementationOnce(() => ({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: createNotification(),
              error: null,
            }),
          }),
        }),
      }));

      const result = await notificationService.sendNotification({
        user_id: targetUser.id,
        type: 'friend_request',
        title: 'Test',
        message: 'Test message',
      });

      expectApiSuccess(result);
      // Should not call push notification during quiet hours
      expect(supabase.rpc).not.toHaveBeenCalled();
    });
  });

  describe('getUnreadCount', () => {
    it('should get unread notification count', async () => {
      const user = createUser();

      mockAuthState(supabase, user, createSession({ user }));

      supabase.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              count: 5,
              error: null,
            }),
          }),
        }),
      }));

      const result = await notificationService.getUnreadCount();

      expectApiSuccess(result);
      expect(result.data).toBe(5);
    });
  });

  describe('performance', () => {
    it('should get notifications within performance threshold', async () => {
      const user = createUser();
      const notifications = Array.from({ length: 50 }, () => 
        createNotification({ user_id: user.id })
      );

      mockAuthState(supabase, user, createSession({ user }));

      supabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: notifications,
              error: null,
            }),
          }),
        }),
      }));

      await measurePerformance(
        'NotificationService.getNotifications',
        async () => {
          await notificationService.getNotifications();
        },
        100 // 100ms threshold
      );
    });

    it('should send notification within performance threshold', async () => {
      const user = createUser();
      mockAuthState(supabase, user, createSession({ user }));

      // Mock all required calls
      supabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: createNotificationPreference(),
              error: null,
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: createNotification(),
              error: null,
            }),
          }),
        }),
      }));

      supabase.rpc.mockResolvedValue({
        data: { success: true },
        error: null,
      });

      await measurePerformance(
        'NotificationService.sendNotification',
        async () => {
          await notificationService.sendNotification({
            user_id: 'user-id',
            type: 'system',
            title: 'Test',
            message: 'Test message',
          });
        },
        150 // 150ms threshold for sending
      );
    });
  });
});