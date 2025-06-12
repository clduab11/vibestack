import type { SupabaseClient } from '@supabase/supabase-js';
import type { ApiResponse, Database, Notification } from '../types';

interface NotificationFilters {
  unread?: boolean;
  type?: string;
  limit?: number;
  offset?: number;
}

interface NotificationPreferences {
  id: string;
  user_id: string;
  push_enabled: boolean;
  email_enabled: boolean;
  in_app_enabled: boolean;
  habit_reminders: boolean;
  social_updates: boolean;
  achievement_alerts: boolean;
  challenge_updates: boolean;
  friend_requests: boolean;
  system_notifications: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  created_at?: string;
  updated_at?: string;
}

interface DeviceData {
  token: string;
  platform: 'ios' | 'android' | 'web';
  device_name?: string;
}

interface Device {
  id: string;
  user_id: string;
  token: string;
  platform: string;
  device_name?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface SendNotificationData {
  user_id: string;
  type: 'system' | 'habit_reminder' | 'achievement' | 'social' | 'friend_request' | 'challenge';
  title: string;
  message: string;
  data?: Record<string, any>;
  action_url?: string;
}

export class NotificationService {
  constructor(private supabase: SupabaseClient<Database>) {}

  async getNotifications(filters?: NotificationFilters): Promise<ApiResponse<Notification[]>> {
    try {
      // Check authentication
      const {
        data: { user },
      } = await this.supabase.auth.getUser();

      if (!user) {
        return {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Must be authenticated',
          },
        };
      }

      let query = this.supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id);

      if (filters?.unread) {
        query = query.eq('read', false);
      }

      if (filters?.type) {
        query = query.eq('type', filters.type);
      }

      query = query.order('created_at', { ascending: false });

      if (filters?.limit && filters?.offset !== undefined) {
        query = query.range(filters.offset, filters.offset + filters.limit - 1);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return {
        success: true,
        data: (data || []) as Notification[],
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GET_NOTIFICATIONS_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get notifications',
        },
      };
    }
  }

  async markAsRead(notificationIds: string | string[]): Promise<ApiResponse<void>> {
    try {
      // Check authentication
      const {
        data: { user },
      } = await this.supabase.auth.getUser();

      if (!user) {
        return {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Must be authenticated',
          },
        };
      }

      const ids = Array.isArray(notificationIds) ? notificationIds : [notificationIds];

      // For single notification, verify ownership
      if (ids.length === 1) {
        const { data: notification, error: fetchError } = await this.supabase
          .from('notifications')
          .select('user_id')
          .eq('id', ids[0])
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
          throw fetchError;
        }

        if (notification && notification.user_id !== user.id) {
          return {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'Cannot mark notifications for another user',
            },
          };
        }
      }

      // Update notifications
      const { error } = await this.supabase
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .in('id', ids)
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'MARK_READ_ERROR',
          message: error instanceof Error ? error.message : 'Failed to mark as read',
        },
      };
    }
  }

  async deleteNotification(notificationId: string): Promise<ApiResponse<void>> {
    try {
      // Check authentication
      const {
        data: { user },
      } = await this.supabase.auth.getUser();

      if (!user) {
        return {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Must be authenticated',
          },
        };
      }

      // Check ownership
      const { data: notification } = await this.supabase
        .from('notifications')
        .select('user_id')
        .eq('id', notificationId)
        .single();

      if (!notification || notification.user_id !== user.id) {
        return {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Cannot delete notifications for another user',
          },
        };
      }

      // Delete notification
      const { error } = await this.supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DELETE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to delete notification',
        },
      };
    }
  }

  async getPreferences(): Promise<ApiResponse<NotificationPreferences>> {
    try {
      // Check authentication
      const {
        data: { user },
      } = await this.supabase.auth.getUser();

      if (!user) {
        return {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Must be authenticated',
          },
        };
      }

      // Get preferences
      const { data: preferences, error } = await this.supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      // Create default preferences if none exist
      if (!preferences) {
        const defaultPreferences = {
          user_id: user.id,
          push_enabled: true,
          email_enabled: true,
          in_app_enabled: true,
          habit_reminders: true,
          social_updates: true,
          achievement_alerts: true,
          challenge_updates: true,
          friend_requests: true,
          system_notifications: true,
        };

        const { data: newPreferences, error: createError } = await this.supabase
          .from('notification_preferences')
          .insert(defaultPreferences)
          .select()
          .single();

        if (createError) {
          throw createError;
        }

        return {
          success: true,
          data: newPreferences as NotificationPreferences,
        };
      }

      return {
        success: true,
        data: preferences as NotificationPreferences,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GET_PREFERENCES_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get preferences',
        },
      };
    }
  }

  async updatePreferences(
    updates: Partial<NotificationPreferences>
  ): Promise<ApiResponse<NotificationPreferences>> {
    try {
      // Check authentication
      const {
        data: { user },
      } = await this.supabase.auth.getUser();

      if (!user) {
        return {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Must be authenticated',
          },
        };
      }

      // Validate quiet hours format if provided
      if (updates.quiet_hours_start || updates.quiet_hours_end) {
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        
        if (updates.quiet_hours_start && !timeRegex.test(updates.quiet_hours_start)) {
          return {
            success: false,
            error: {
              code: 'INVALID_TIME_FORMAT',
              message: 'Invalid time format. Use HH:MM',
            },
          };
        }

        if (updates.quiet_hours_end && !timeRegex.test(updates.quiet_hours_end)) {
          return {
            success: false,
            error: {
              code: 'INVALID_TIME_FORMAT',
              message: 'Invalid time format. Use HH:MM',
            },
          };
        }
      }

      // Update preferences
      const { data, error } = await this.supabase
        .from('notification_preferences')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return {
        success: true,
        data: data as NotificationPreferences,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UPDATE_PREFERENCES_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update preferences',
        },
      };
    }
  }

  async registerDevice(deviceData: DeviceData): Promise<ApiResponse<Device>> {
    try {
      // Check authentication
      const {
        data: { user },
      } = await this.supabase.auth.getUser();

      if (!user) {
        return {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Must be authenticated',
          },
        };
      }

      // Check if device already exists
      const { data: existingDevice } = await this.supabase
        .from('devices')
        .select('*')
        .eq('user_id', user.id)
        .eq('platform', deviceData.platform)
        .single();

      if (existingDevice) {
        // Update existing device
        const { data: updated, error: updateError } = await this.supabase
          .from('devices')
          .update({
            token: deviceData.token,
            device_name: deviceData.device_name,
            is_active: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingDevice.id)
          .select()
          .single();

        if (updateError) {
          throw updateError;
        }

        return {
          success: true,
          data: updated as Device,
        };
      }

      // Create new device
      const { data: newDevice, error: createError } = await this.supabase
        .from('devices')
        .insert({
          user_id: user.id,
          token: deviceData.token,
          platform: deviceData.platform,
          device_name: deviceData.device_name,
          is_active: true,
        })
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      return {
        success: true,
        data: newDevice as Device,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'REGISTER_DEVICE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to register device',
        },
      };
    }
  }

  async unregisterDevice(token: string): Promise<ApiResponse<void>> {
    try {
      // Check authentication
      const {
        data: { user },
      } = await this.supabase.auth.getUser();

      if (!user) {
        return {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Must be authenticated',
          },
        };
      }

      // Delete device
      const { error } = await this.supabase
        .from('devices')
        .delete()
        .eq('user_id', user.id)
        .eq('token', token);

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UNREGISTER_DEVICE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to unregister device',
        },
      };
    }
  }

  async sendNotification(data: SendNotificationData): Promise<ApiResponse<Notification>> {
    try {
      // Check authentication
      const {
        data: { user },
      } = await this.supabase.auth.getUser();

      if (!user) {
        return {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Must be authenticated',
          },
        };
      }

      // Check user preferences
      const { data: preferences } = await this.supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', data.user_id)
        .single();

      if (preferences) {
        // Check if notification type is enabled
        const typeMap: Record<string, keyof NotificationPreferences> = {
          habit_reminder: 'habit_reminders',
          social: 'social_updates',
          achievement: 'achievement_alerts',
          challenge: 'challenge_updates',
          friend_request: 'friend_requests',
          system: 'system_notifications',
        };

        const preferenceKey = typeMap[data.type];
        if (preferenceKey && preferences[preferenceKey] === false) {
          return {
            success: false,
            error: {
              code: 'NOTIFICATIONS_DISABLED',
              message: 'User has disabled notifications for this type',
            },
          };
        }

        // Check quiet hours
        if (preferences.quiet_hours_start && preferences.quiet_hours_end) {
          const now = new Date();
          const currentHour = now.getHours();
          const currentMinute = now.getMinutes();
          const currentTime = currentHour * 60 + currentMinute;

          const [startHour, startMinute] = preferences.quiet_hours_start.split(':').map(Number);
          const [endHour, endMinute] = preferences.quiet_hours_end.split(':').map(Number);
          const startTime = startHour * 60 + startMinute;
          const endTime = endHour * 60 + endMinute;

          const inQuietHours = startTime <= endTime
            ? currentTime >= startTime && currentTime < endTime
            : currentTime >= startTime || currentTime < endTime;

          if (inQuietHours) {
            // Store notification but don't push
            const { data: notification, error: createError } = await this.supabase
              .from('notifications')
              .insert({
                user_id: data.user_id,
                type: data.type,
                title: data.title,
                message: data.message,
                data: data.data,
                action_url: data.action_url,
                read: false,
              })
              .select()
              .single();

            if (createError) {
              throw createError;
            }

            return {
              success: true,
              data: notification as Notification,
            };
          }
        }
      }

      // Create notification
      const { data: notification, error: createError } = await this.supabase
        .from('notifications')
        .insert({
          user_id: data.user_id,
          type: data.type,
          title: data.title,
          message: data.message,
          data: data.data,
          action_url: data.action_url,
          read: false,
        })
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      // Send push notification if enabled
      if (preferences?.push_enabled) {
        // Get user devices
        const { data: devices } = await this.supabase
          .from('devices')
          .select('*')
          .eq('user_id', data.user_id)
          .eq('is_active', true);

        if (devices && devices.length > 0) {
          // Send push notifications
          await this.supabase.rpc('send_push_notification', {
            notification_id: notification.id,
            tokens: devices.map(d => d.token),
            title: data.title,
            body: data.message,
            data: data.data,
          });
        }
      }

      return {
        success: true,
        data: notification as Notification,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SEND_NOTIFICATION_ERROR',
          message: error instanceof Error ? error.message : 'Failed to send notification',
        },
      };
    }
  }

  async getUnreadCount(): Promise<ApiResponse<number>> {
    try {
      // Check authentication
      const {
        data: { user },
      } = await this.supabase.auth.getUser();

      if (!user) {
        return {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Must be authenticated',
          },
        };
      }

      const { count, error } = await this.supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) {
        throw error;
      }

      return {
        success: true,
        data: count || 0,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'COUNT_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get unread count',
        },
      };
    }
  }
}