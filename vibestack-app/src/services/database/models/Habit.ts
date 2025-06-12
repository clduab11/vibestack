import { Model } from '@nozbe/watermelondb';
import { field, date, json, readonly, action, lazy } from '@nozbe/watermelondb/decorators';
import { Q } from '@nozbe/watermelondb';
import HabitCompletion from './HabitCompletion';

const sanitizeFrequencyDays = (raw: any) => {
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }
  return raw || [];
};

export default class Habit extends Model {
  static table = 'habits';
  
  static associations = {
    habit_completions: { type: 'has_many', foreignKey: 'habit_id' },
  };

  @field('server_id') serverId!: string | null;
  @field('name') name!: string;
  @field('description') description!: string | null;
  @field('icon') icon!: string;
  @field('color') color!: string;
  @field('frequency_type') frequencyType!: string;
  @json('frequency_days', sanitizeFrequencyDays) frequencyDays!: number[];
  @field('reminder_time') reminderTime!: number | null;
  @field('streak_current') streakCurrent!: number;
  @field('streak_best') streakBest!: number;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
  @date('last_completed_at') lastCompletedAt!: Date | null;
  @field('is_archived') isArchived!: boolean;
  @field('sync_status') syncStatus!: string;
  @field('version') version!: number;
  
  @lazy completions = this.collections
    .get<HabitCompletion>('habit_completions')
    .query(Q.where('habit_id', this.id));
  
  @action async complete(note?: string, mood?: string, durationMinutes?: number) {
    const completionsCollection = this.collections.get<HabitCompletion>('habit_completions');
    
    await this.batch(
      this.prepareUpdate(habit => {
        habit.lastCompletedAt = new Date();
        habit.streakCurrent = this.calculateNewStreak();
        if (habit.streakCurrent > habit.streakBest) {
          habit.streakBest = habit.streakCurrent;
        }
        habit.syncStatus = 'pending';
      }),
      completionsCollection.prepareCreate(completion => {
        completion.habitId = this.id;
        completion.completedAt = new Date();
        completion.note = note || null;
        completion.mood = mood || null;
        completion.durationMinutes = durationMinutes || null;
        completion.syncStatus = 'pending';
      })
    );
  }
  
  @action async archive() {
    await this.update(habit => {
      habit.isArchived = true;
      habit.syncStatus = 'pending';
      habit.version = habit.version + 1;
    });
  }
  
  @action async unarchive() {
    await this.update(habit => {
      habit.isArchived = false;
      habit.syncStatus = 'pending';
      habit.version = habit.version + 1;
    });
  }
  
  @action async updateDetails(updates: Partial<{
    name: string;
    description: string;
    icon: string;
    color: string;
    frequencyType: string;
    frequencyDays: number[];
    reminderTime: number | null;
  }>) {
    await this.update(habit => {
      Object.assign(habit, updates);
      habit.syncStatus = 'pending';
      habit.version = habit.version + 1;
    });
  }
  
  @action async markSynced(serverId: string) {
    await this.update(habit => {
      habit.serverId = serverId;
      habit.syncStatus = 'synced';
    });
  }
  
  @action async markSyncError() {
    await this.update(habit => {
      habit.syncStatus = 'error';
    });
  }
  
  private calculateNewStreak(): number {
    if (!this.lastCompletedAt) return 1;
    
    const lastDate = new Date(this.lastCompletedAt);
    const today = new Date();
    
    // Reset time to midnight for date comparison
    lastDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    const diffTime = Math.abs(today.getTime() - lastDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // If last completion was yesterday, continue streak
    if (diffDays === 1) {
      return this.streakCurrent + 1;
    }
    
    // If last completion was today, maintain streak
    if (diffDays === 0) {
      return this.streakCurrent;
    }
    
    // Otherwise, reset streak
    return 1;
  }
  
  get isCompletedToday(): boolean {
    if (!this.lastCompletedAt) return false;
    
    const lastDate = new Date(this.lastCompletedAt);
    const today = new Date();
    
    return (
      lastDate.getFullYear() === today.getFullYear() &&
      lastDate.getMonth() === today.getMonth() &&
      lastDate.getDate() === today.getDate()
    );
  }
  
  get nextReminderTime(): Date | null {
    if (!this.reminderTime) return null;
    
    const now = new Date();
    const reminder = new Date();
    
    // Set reminder time
    const hours = Math.floor(this.reminderTime / 60);
    const minutes = this.reminderTime % 60;
    reminder.setHours(hours, minutes, 0, 0);
    
    // If reminder time has passed today, set for tomorrow
    if (reminder <= now) {
      reminder.setDate(reminder.getDate() + 1);
    }
    
    return reminder;
  }
}