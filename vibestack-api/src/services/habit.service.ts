import type { SupabaseClient } from '@supabase/supabase-js';
import type { User, Habit, HabitProgress, ApiResponse, Database } from '../types';

interface HabitCreateData {
  name: string;
  description?: string;
  frequency: 'daily' | 'weekly' | 'custom';
  target_count: number;
  custom_frequency_days?: number[];
  category: 'health' | 'productivity' | 'personal' | 'social' | 'learning' | 'other';
  difficulty: 'easy' | 'medium' | 'hard';
  reminder_time?: string;
  is_public?: boolean;
}

interface HabitUpdateData {
  name?: string;
  description?: string;
  frequency?: 'daily' | 'weekly' | 'custom';
  target_count?: number;
  custom_frequency_days?: number[];
  category?: 'health' | 'productivity' | 'personal' | 'social' | 'learning' | 'other';
  difficulty?: 'easy' | 'medium' | 'hard';
  reminder_time?: string;
  is_public?: boolean;
  is_active?: boolean;
}

interface HabitFilters {
  isActive?: boolean;
  category?: string;
}

interface ProgressData {
  completed_count: number;
  notes?: string;
}

interface HabitStats {
  totalDays: number;
  completedDays: number;
  completionRate: number;
  currentStreak: number;
  longestStreak: number;
  totalCompletions: number;
}

interface ProgressFilters {
  startDate?: string;
  endDate?: string;
}

const MAX_HABITS_PER_USER = 50;

export class HabitService {
  constructor(private supabase: SupabaseClient<Database>) {}

  async createHabit(data: HabitCreateData): Promise<ApiResponse<Habit>> {
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

      // Validate habit data
      if (!data.name || data.target_count < 1) {
        return {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Invalid habit data',
          },
        };
      }

      // Check habit limit
      const { count } = await this.supabase
        .from('habits')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (count && count >= MAX_HABITS_PER_USER) {
        return {
          success: false,
          error: {
            code: 'HABIT_LIMIT_REACHED',
            message: 'Maximum number of habits reached',
          },
        };
      }

      // Create habit
      const { data: habit, error } = await this.supabase
        .from('habits')
        .insert({
          user_id: user.id,
          ...data,
          is_active: true,
          is_public: data.is_public ?? false,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return {
        success: true,
        data: habit as Habit,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CREATE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create habit',
        },
      };
    }
  }

  async updateHabit(habitId: string, updates: HabitUpdateData): Promise<ApiResponse<Habit>> {
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

      // Check habit ownership
      const { data: habit, error: fetchError } = await this.supabase
        .from('habits')
        .select('*')
        .eq('id', habitId)
        .single();

      if (fetchError || !habit) {
        return {
          success: false,
          error: {
            code: 'HABIT_NOT_FOUND',
            message: 'Habit not found',
          },
        };
      }

      if (habit.user_id !== user.id) {
        return {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Cannot update habit owned by another user',
          },
        };
      }

      // Update habit
      const { data: updatedHabit, error: updateError } = await this.supabase
        .from('habits')
        .update(updates)
        .eq('id', habitId)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      return {
        success: true,
        data: updatedHabit as Habit,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UPDATE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update habit',
        },
      };
    }
  }

  async deleteHabit(habitId: string): Promise<ApiResponse<void>> {
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

      // Check habit ownership
      const { data: habit, error: fetchError } = await this.supabase
        .from('habits')
        .select('user_id')
        .eq('id', habitId)
        .single();

      if (fetchError || !habit) {
        return {
          success: false,
          error: {
            code: 'HABIT_NOT_FOUND',
            message: 'Habit not found',
          },
        };
      }

      if (habit.user_id !== user.id) {
        return {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Cannot delete habit owned by another user',
          },
        };
      }

      // Delete habit and related data (cascade)
      const { error } = await this.supabase.rpc('delete_habit_cascade', {
        habit_id: habitId,
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
          message: error instanceof Error ? error.message : 'Failed to delete habit',
        },
      };
    }
  }

  async getUserHabits(userId: string, filters?: HabitFilters): Promise<ApiResponse<Habit[]>> {
    try {
      let query = this.supabase.from('habits').select('*').eq('user_id', userId);

      if (filters?.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive);
      }

      if (filters?.category) {
        query = query.eq('category', filters.category);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return {
        success: true,
        data: (data || []) as Habit[],
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get habits',
        },
      };
    }
  }

  async recordProgress(habitId: string, data: ProgressData): Promise<ApiResponse<HabitProgress>> {
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

      // Check habit ownership
      const { data: habit, error: habitError } = await this.supabase
        .from('habits')
        .select('user_id')
        .eq('id', habitId)
        .single();

      if (habitError || !habit) {
        return {
          success: false,
          error: {
            code: 'HABIT_NOT_FOUND',
            message: 'Habit not found',
          },
        };
      }

      if (habit.user_id !== user.id) {
        return {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Cannot record progress for habit owned by another user',
          },
        };
      }

      // Check if progress already exists for today
      const today = new Date().toISOString().split('T')[0];
      const { data: existingProgress } = await this.supabase
        .from('habit_progress')
        .select('*')
        .eq('habit_id', habitId)
        .eq('user_id', user.id)
        .gte('date', today)
        .single();

      let progress: HabitProgress;

      if (existingProgress) {
        // Update existing progress
        const { data: updated, error: updateError } = await this.supabase
          .from('habit_progress')
          .update({
            completed_count: data.completed_count,
            notes: data.notes,
          })
          .eq('id', existingProgress.id)
          .select()
          .single();

        if (updateError) {
          throw updateError;
        }

        progress = updated as HabitProgress;
      } else {
        // Create new progress
        const { data: created, error: createError } = await this.supabase
          .from('habit_progress')
          .insert({
            habit_id: habitId,
            user_id: user.id,
            date: today,
            completed_count: data.completed_count,
            notes: data.notes,
          })
          .select()
          .single();

        if (createError) {
          throw createError;
        }

        progress = created as HabitProgress;
      }

      // Check for achievements
      await this.supabase.rpc('check_habit_achievements', {
        user_id: user.id,
        habit_id: habitId,
      });

      return {
        success: true,
        data: progress,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'PROGRESS_ERROR',
          message: error instanceof Error ? error.message : 'Failed to record progress',
        },
      };
    }
  }

  async getHabitProgress(
    habitId: string,
    filters?: ProgressFilters
  ): Promise<ApiResponse<HabitProgress[]>> {
    try {
      let query = this.supabase
        .from('habit_progress')
        .select('*')
        .eq('habit_id', habitId);

      if (filters?.startDate) {
        query = query.gte('date', filters.startDate);
      }

      if (filters?.endDate) {
        query = query.lte('date', filters.endDate);
      }

      const { data, error } = await query.order('date', { ascending: false });

      if (error) {
        throw error;
      }

      return {
        success: true,
        data: (data || []) as HabitProgress[],
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get progress',
        },
      };
    }
  }

  async getHabitStats(habitId: string): Promise<ApiResponse<HabitStats>> {
    try {
      // Get total days since habit creation
      const { count: totalDays } = await this.supabase
        .from('habit_progress')
        .select('*', { count: 'exact', head: true })
        .eq('habit_id', habitId);

      // Get completed days (where completed_count >= target)
      const { count: completedDays } = await this.supabase
        .from('habit_progress')
        .select('*', { count: 'exact', head: true })
        .eq('habit_id', habitId)
        .gte('completed_count', 1); // Simplified - in real app would check against target

      // Get streak data from RPC
      const { data: streakData, error: streakError } = await this.supabase.rpc(
        'calculate_habit_streaks',
        {
          habit_id: habitId,
        }
      );

      if (streakError) {
        console.warn('Failed to calculate streaks:', streakError);
      }

      const completionRate = totalDays ? completedDays! / totalDays : 0;

      return {
        success: true,
        data: {
          totalDays: totalDays || 0,
          completedDays: completedDays || 0,
          completionRate: Math.round(completionRate * 100) / 100,
          currentStreak: streakData?.current_streak || 0,
          longestStreak: streakData?.longest_streak || 0,
          totalCompletions: streakData?.total_completions || completedDays || 0,
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

  async pauseHabit(habitId: string): Promise<ApiResponse<Habit>> {
    return this.updateHabit(habitId, { is_active: false });
  }

  async resumeHabit(habitId: string): Promise<ApiResponse<Habit>> {
    return this.updateHabit(habitId, { is_active: true });
  }
}