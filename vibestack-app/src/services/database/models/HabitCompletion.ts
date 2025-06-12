import { Model } from '@nozbe/watermelondb';
import { field, date, relation, readonly } from '@nozbe/watermelondb/decorators';
import Habit from './Habit';

export default class HabitCompletion extends Model {
  static table = 'habit_completions';
  
  static associations = {
    habits: { type: 'belongs_to', key: 'habit_id' },
  };

  @field('habit_id') habitId!: string;
  @readonly @date('completed_at') completedAt!: Date;
  @field('note') note!: string | null;
  @field('mood') mood!: string | null;
  @field('duration_minutes') durationMinutes!: number | null;
  @field('sync_status') syncStatus!: string;
  
  @relation('habits', 'habit_id') habit!: Habit;
}