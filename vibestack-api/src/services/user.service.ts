import type { SupabaseClient } from '@supabase/supabase-js';
import type { User, Profile, Avatar, ApiResponse, Database } from '../types';

interface ProfileUpdate {
  username?: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  privacy_settings?: Partial<Profile['privacy_settings']>;
  notification_preferences?: Partial<Profile['notification_preferences']>;
}

interface UserStats {
  totalHabits: number;
  activeHabits: number;
  totalAchievements: number;
  totalFriends: number;
  currentStreak: number;
}

interface UserActivity {
  id: string;
  type: string;
  user_id: string;
  data: Record<string, unknown>;
  created_at: string;
}

export class UserService {
  constructor(private supabase: SupabaseClient<Database>) {}

  async getUserProfile(userId: string): Promise<ApiResponse<{ profile: Profile; avatar: Avatar }>> {
    try {
      // Get profile
      const { data: profile, error: profileError } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError || !profile) {
        return {
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User profile not found',
          },
        };
      }

      // Get avatar
      const { data: avatar, error: avatarError } = await this.supabase
        .from('avatars')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (avatarError || !avatar) {
        // Create default avatar if none exists
        const defaultAvatar = await this.createDefaultAvatar(userId);
        return {
          success: true,
          data: {
            profile: profile as Profile,
            avatar: defaultAvatar,
          },
        };
      }

      return {
        success: true,
        data: {
          profile: profile as Profile,
          avatar: avatar as Avatar,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'PROFILE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get profile',
        },
      };
    }
  }

  async updateProfile(userId: string, updates: ProfileUpdate): Promise<ApiResponse<Profile>> {
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

      // Check authorization
      if (user.id !== userId) {
        return {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Can only update your own profile',
          },
        };
      }

      // Validate username uniqueness if updating
      if (updates.username) {
        const { data: existingProfile } = await this.supabase
          .from('profiles')
          .select('id')
          .eq('username', updates.username)
          .neq('user_id', userId)
          .single();

        if (existingProfile) {
          return {
            success: false,
            error: {
              code: 'USERNAME_TAKEN',
              message: 'Username is already taken',
            },
          };
        }
      }

      // Update profile
      const { data, error } = await this.supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return {
        success: true,
        data: data as Profile,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UPDATE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update profile',
        },
      };
    }
  }

  async searchUsers(query: string): Promise<ApiResponse<Profile[]>> {
    try {
      // First search without the complex privacy filter
      const { data, error } = await this.supabase
        .from('profiles')
        .select('*')
        .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
        .limit(20);

      if (error) {
        throw error;
      }

      // Filter by privacy settings in memory
      const publicProfiles = (data || []).filter(
        (profile) => profile.privacy_settings.profile_visibility === 'public'
      );

      return {
        success: true,
        data: publicProfiles as Profile[],
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SEARCH_ERROR',
          message: error instanceof Error ? error.message : 'Search failed',
        },
      };
    }
  }

  async getUserStats(userId: string): Promise<ApiResponse<UserStats>> {
    try {
      // Get habit count
      const { count: habitCount } = await this.supabase
        .from('habits')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_active', true);

      // Get achievement count
      const { count: achievementCount } = await this.supabase
        .from('user_achievements')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      // Get friend count
      const { count: friendCount } = await this.supabase
        .from('friends')
        .select('*', { count: 'exact', head: true })
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
        .eq('status', 'accepted');

      // Get current streak
      const { data: streakData, error: streakError } = await this.supabase.rpc(
        'calculate_max_streak',
        {
          user_id: userId,
        }
      );

      if (streakError) {
        // If RPC doesn't exist or fails, just use 0
        console.warn('Failed to calculate streak:', streakError);
      }

      return {
        success: true,
        data: {
          totalHabits: habitCount || 0,
          activeHabits: habitCount || 0,
          totalAchievements: achievementCount || 0,
          totalFriends: friendCount || 0,
          currentStreak: streakData?.max_streak || 0,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'STATS_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get stats',
        },
      };
    }
  }

  async deleteAccount(userId: string): Promise<ApiResponse<void>> {
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

      // Check authorization
      if (user.id !== userId) {
        return {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Can only delete your own account',
          },
        };
      }

      // Call stored procedure to handle cascading deletes
      const { error } = await this.supabase.rpc('delete_user_account', {
        user_id: userId,
      });

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DELETE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to delete account',
        },
      };
    }
  }

  async getUserActivities(userId: string): Promise<ApiResponse<UserActivity[]>> {
    try {
      // Check if activities are public
      const { data: profile } = await this.supabase
        .from('profiles')
        .select('privacy_settings')
        .eq('user_id', userId)
        .single();

      if (profile && !profile.privacy_settings.show_activity) {
        // Check if requesting user is the profile owner
        const {
          data: { user },
        } = await this.supabase.auth.getUser();

        if (!user || user.id !== userId) {
          return {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'User activities are private',
            },
          };
        }
      }

      // Get activities - table might be 'activities' instead
      const { data, error } = await this.supabase
        .from('activities')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        // If table doesn't exist, return empty array
        console.warn('Failed to get activities:', error);
        return {
          success: true,
          data: [],
        };
      }

      return {
        success: true,
        data: (data || []) as UserActivity[],
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'ACTIVITY_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get activities',
        },
      };
    }
  }

  private async createDefaultAvatar(userId: string): Promise<Avatar> {
    const defaultAvatar: Omit<Avatar, 'id' | 'created_at' | 'updated_at'> = {
      user_id: userId,
      name: 'My Avatar',
      personality_traits: {
        encouragement_style: 'cheerful',
        communication_frequency: 'medium',
        humor_level: 5,
        formality: 5,
      },
      appearance: {
        body_type: 'athletic',
        skin_tone: '#F5DEB3',
        hair_style: 'medium',
        hair_color: '#4B0082',
        outfit_id: 'default',
        accessories: [],
      },
      level: 1,
      experience: 0,
      mood: 80,
      energy: 100,
    };

    const { data, error } = await this.supabase
      .from('avatars')
      .insert(defaultAvatar)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data as Avatar;
  }
}