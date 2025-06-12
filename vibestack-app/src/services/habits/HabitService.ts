import { database, databaseHelpers } from '@/services/database';
import { Habit, HabitCompletion } from '@/services/database/models';
import { store } from '@/store';
import { apiSlice } from '@/store/api/apiSlice';
import { 
  addHabit, 
  updateHabit as updateHabitInStore, 
  removeHabit,
  completeHabit as completeHabitInStore,
  setHabits
} from '@/store/slices/habitsSlice';
import { syncEngine } from '@/services/sync';
import * as Notifications from 'expo-notifications';
import { Q } from '@nozbe/watermelondb';

export interface CreateHabitData {
  name: string;
  description?: string;
  icon: string;
  color: string;
  frequency: 'daily' | 'weekly' | 'custom';
  frequencyDays?: number[];
  reminderTime?: Date;
}

export interface UpdateHabitData {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  frequency?: 'daily' | 'weekly' | 'custom';
  frequencyDays?: number[];
  reminderTime?: Date | null;
  isArchived?: boolean;
}

export interface HabitStats {
  totalCompletions: number;
  completionRate: number;
  currentStreak: number;
  bestStreak: number;
  lastCompletedAt?: Date;
  weeklyPattern: number[];
  monthlyProgress: { date: string; completed: boolean }[];
}

export class HabitService {
  private static instance: HabitService;

  private constructor() {}

  static getInstance(): HabitService {
    if (!HabitService.instance) {
      HabitService.instance = new HabitService();
    }
    return HabitService.instance;
  }

  async createHabit(data: CreateHabitData): Promise<Habit> {
    try {
      // Create habit in local database
      const habit = await database.write(async () => {
        return await database.get<Habit>('habits').create(habit => {
          habit.name = data.name;
          habit.description = data.description || '';
          habit.icon = data.icon;
          habit.color = data.color;
          habit.frequency = data.frequency;
          habit.frequencyDays = data.frequencyDays || [];
          habit.reminderTime = data.reminderTime || null;
          habit.streak = 0;
          habit.bestStreak = 0;
          habit.isArchived = false;
          habit.syncStatus = 'pending';
        });
      });

      // Add to Redux store
      store.dispatch(addHabit(this.habitToSerializable(habit)));

      // Add to sync queue
      await databaseHelpers.addToSyncQueue(
        'create',
        'habits',
        habit.id,
        this.habitToPayload(habit)
      );

      // Schedule notification if reminder time is set
      if (data.reminderTime) {
        await this.scheduleHabitReminder(habit);
      }

      // Trigger sync
      syncEngine.sync();

      return habit;
    } catch (error) {
      console.error('Error creating habit:', error);
      throw error;
    }
  }

  async updateHabit(habitId: string, data: UpdateHabitData): Promise<Habit> {
    try {
      const habit = await database.get<Habit>('habits').find(habitId);
      
      await database.write(async () => {
        await habit.update(h => {
          if (data.name !== undefined) h.name = data.name;
          if (data.description !== undefined) h.description = data.description;
          if (data.icon !== undefined) h.icon = data.icon;
          if (data.color !== undefined) h.color = data.color;
          if (data.frequency !== undefined) h.frequency = data.frequency;
          if (data.frequencyDays !== undefined) h.frequencyDays = data.frequencyDays;
          if (data.reminderTime !== undefined) h.reminderTime = data.reminderTime;
          if (data.isArchived !== undefined) h.isArchived = data.isArchived;
          h.syncStatus = 'pending';
        });
      });

      // Update in Redux store
      store.dispatch(updateHabitInStore({
        id: habitId,
        changes: this.habitToSerializable(habit)
      }));

      // Add to sync queue
      await databaseHelpers.addToSyncQueue(
        'update',
        'habits',
        habit.id,
        this.habitToPayload(habit)
      );

      // Update notification if reminder time changed
      if (data.reminderTime !== undefined) {
        await this.cancelHabitReminder(habitId);
        if (data.reminderTime) {
          await this.scheduleHabitReminder(habit);
        }
      }

      // Trigger sync
      syncEngine.sync();

      return habit;
    } catch (error) {
      console.error('Error updating habit:', error);
      throw error;
    }
  }

  async deleteHabit(habitId: string): Promise<void> {
    try {
      const habit = await database.get<Habit>('habits').find(habitId);
      
      await database.write(async () => {
        // Delete all completions for this habit
        const completions = await database
          .get<HabitCompletion>('habit_completions')
          .query(Q.where('habit_id', habitId))
          .fetch();
        
        await Promise.all(completions.map(c => c.destroyPermanently()));
        
        // Delete the habit
        await habit.destroyPermanently();
      });

      // Remove from Redux store
      store.dispatch(removeHabit(habitId));

      // Add to sync queue
      await databaseHelpers.addToSyncQueue(
        'delete',
        'habits',
        habitId,
        { id: habit.serverId }
      );

      // Cancel notifications
      await this.cancelHabitReminder(habitId);

      // Trigger sync
      syncEngine.sync();
    } catch (error) {
      console.error('Error deleting habit:', error);
      throw error;
    }
  }

  async completeHabit(habitId: string, note?: string, mood?: string): Promise<HabitCompletion> {
    try {
      const habit = await database.get<Habit>('habits').find(habitId);
      
      // Check if already completed today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const existingCompletion = await database
        .get<HabitCompletion>('habit_completions')
        .query(
          Q.and(
            Q.where('habit_id', habitId),
            Q.where('completed_at', Q.gte(today.getTime()))
          )
        )
        .fetch();
      
      if (existingCompletion.length > 0) {
        throw new Error('Habit already completed today');
      }

      // Create completion record
      const completion = await database.write(async () => {
        // Update habit streak
        await habit.updateStreak();
        
        // Create completion
        return await database.get<HabitCompletion>('habit_completions').create(c => {
          c.habitId = habitId;
          c.completedAt = new Date();
          c.note = note || null;
          c.mood = mood || null;
          c.syncStatus = 'pending';
        });
      });

      // Update Redux store
      store.dispatch(completeHabitInStore({
        habitId,
        completionId: completion.id,
        completedAt: completion.completedAt.toISOString()
      }));

      // Add to sync queue
      await databaseHelpers.addToSyncQueue(
        'create',
        'habit_completions',
        completion.id,
        {
          habit_id: habitId,
          completed_at: completion.completedAt.toISOString(),
          note: completion.note,
          mood: completion.mood
        }
      );

      // Trigger sync
      syncEngine.sync();

      return completion;
    } catch (error) {
      console.error('Error completing habit:', error);
      throw error;
    }
  }

  async getHabits(includeArchived = false): Promise<Habit[]> {
    try {
      if (includeArchived) {
        return await database.get<Habit>('habits').query().fetch();
      } else {
        return await databaseHelpers.getActiveHabits();
      }
    } catch (error) {
      console.error('Error getting habits:', error);
      throw error;
    }
  }

  async getHabitById(habitId: string): Promise<Habit | null> {
    try {
      return await database.get<Habit>('habits').find(habitId);
    } catch (error) {
      console.error('Error getting habit:', error);
      return null;
    }
  }

  async getHabitStats(habitId: string): Promise<HabitStats> {
    try {
      const habit = await this.getHabitById(habitId);
      if (!habit) {
        throw new Error('Habit not found');
      }

      const completions = await databaseHelpers.getCompletionsForHabit(habitId);
      
      // Calculate stats
      const totalCompletions = completions.length;
      
      // Calculate completion rate for last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentCompletions = completions.filter(
        c => c.completedAt > thirtyDaysAgo
      );
      
      const expectedCompletions = this.calculateExpectedCompletions(
        habit,
        thirtyDaysAgo,
        new Date()
      );
      
      const completionRate = expectedCompletions > 0
        ? (recentCompletions.length / expectedCompletions) * 100
        : 0;

      // Get weekly pattern (last 7 days)
      const weeklyPattern = this.calculateWeeklyPattern(completions);
      
      // Get monthly progress (last 30 days)
      const monthlyProgress = this.calculateMonthlyProgress(completions);
      
      const lastCompletion = completions
        .sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime())[0];

      return {
        totalCompletions,
        completionRate: Math.round(completionRate),
        currentStreak: habit.streak,
        bestStreak: habit.bestStreak,
        lastCompletedAt: lastCompletion?.completedAt,
        weeklyPattern,
        monthlyProgress
      };
    } catch (error) {
      console.error('Error getting habit stats:', error);
      throw error;
    }
  }

  async syncHabits(): Promise<void> {
    try {
      // Load habits from local database
      const habits = await this.getHabits(true);
      
      // Update Redux store
      store.dispatch(setHabits(
        habits.map(h => this.habitToSerializable(h))
      ));
    } catch (error) {
      console.error('Error syncing habits:', error);
      throw error;
    }
  }

  // Private helper methods
  private habitToSerializable(habit: Habit): any {
    return {
      id: habit.id,
      serverId: habit.serverId,
      name: habit.name,
      description: habit.description,
      icon: habit.icon,
      color: habit.color,
      frequency: habit.frequency,
      frequencyDays: habit.frequencyDays,
      reminderTime: habit.reminderTime?.toISOString() || null,
      streak: habit.streak,
      bestStreak: habit.bestStreak,
      isArchived: habit.isArchived,
      createdAt: habit.createdAt.toISOString(),
      updatedAt: habit.updatedAt.toISOString(),
      syncStatus: habit.syncStatus
    };
  }

  private habitToPayload(habit: Habit): any {
    return {
      name: habit.name,
      description: habit.description,
      icon: habit.icon,
      color: habit.color,
      frequency: habit.frequency,
      frequency_days: habit.frequencyDays,
      reminder_time: habit.reminderTime?.toISOString() || null,
      is_archived: habit.isArchived
    };
  }

  private async scheduleHabitReminder(habit: Habit): Promise<void> {
    if (!habit.reminderTime) return;
    
    const trigger = {
      hour: habit.reminderTime.getHours(),
      minute: habit.reminderTime.getMinutes(),
      repeats: true
    };
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Time for your habit!',
        body: `Don't forget to ${habit.name}`,
        data: { habitId: habit.id }
      },
      trigger,
      identifier: `habit-${habit.id}`
    });
  }

  private async cancelHabitReminder(habitId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(`habit-${habitId}`);
  }

  private calculateExpectedCompletions(
    habit: Habit,
    startDate: Date,
    endDate: Date
  ): number {
    const daysDiff = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    switch (habit.frequency) {
      case 'daily':
        return daysDiff;
      case 'weekly':
        return Math.floor(daysDiff / 7);
      case 'custom':
        // Calculate based on frequency days
        return Math.floor(daysDiff * (habit.frequencyDays.length / 7));
      default:
        return 0;
    }
  }

  private calculateWeeklyPattern(completions: HabitCompletion[]): number[] {
    const pattern = [0, 0, 0, 0, 0, 0, 0]; // Sun-Sat
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    completions
      .filter(c => c.completedAt > sevenDaysAgo)
      .forEach(c => {
        const dayOfWeek = c.completedAt.getDay();
        pattern[dayOfWeek]++;
      });
    
    return pattern;
  }

  private calculateMonthlyProgress(
    completions: HabitCompletion[]
  ): { date: string; completed: boolean }[] {
    const progress: { date: string; completed: boolean }[] = [];
    const today = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(today.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const dateStr = date.toISOString().split('T')[0];
      const completed = completions.some(c => {
        const cDate = new Date(c.completedAt);
        cDate.setHours(0, 0, 0, 0);
        return cDate.getTime() === date.getTime();
      });
      
      progress.push({ date: dateStr, completed });
    }
    
    return progress;
  }
}

export const habitService = HabitService.getInstance();