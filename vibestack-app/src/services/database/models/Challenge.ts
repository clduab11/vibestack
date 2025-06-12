import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, action, json } from '@nozbe/watermelondb/decorators';

const sanitizeParticipants = (raw: any) => {
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }
  return raw || [];
};

export default class Challenge extends Model {
  static table = 'challenges';

  @field('server_id') serverId!: string | null;
  @field('name') name!: string;
  @field('description') description!: string;
  @field('habit_id') habitId!: string;
  @date('start_date') startDate!: Date;
  @date('end_date') endDate!: Date;
  @json('participants', sanitizeParticipants) participants!: string[];
  @field('creator_id') creatorId!: string;
  @field('type') type!: string;
  @field('status') status!: string;
  @field('sync_status') syncStatus!: string;
  
  get isActive(): boolean {
    const now = new Date();
    return this.status === 'active' && now >= this.startDate && now <= this.endDate;
  }
  
  get isUpcoming(): boolean {
    return this.status === 'upcoming' && new Date() < this.startDate;
  }
  
  get isCompleted(): boolean {
    return this.status === 'completed' || new Date() > this.endDate;
  }
  
  @action async join(userId: string) {
    await this.update(challenge => {
      if (!challenge.participants.includes(userId)) {
        challenge.participants = [...challenge.participants, userId];
        challenge.syncStatus = 'pending';
      }
    });
  }
  
  @action async leave(userId: string) {
    await this.update(challenge => {
      challenge.participants = challenge.participants.filter(p => p !== userId);
      challenge.syncStatus = 'pending';
    });
  }
  
  @action async updateStatus(status: 'upcoming' | 'active' | 'completed') {
    await this.update(challenge => {
      challenge.status = status;
      challenge.syncStatus = 'pending';
    });
  }
}