import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, action, json } from '@nozbe/watermelondb/decorators';

const sanitizeData = (raw: any) => {
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return raw || null;
};

export default class Notification extends Model {
  static table = 'notifications';

  @field('server_id') serverId!: string | null;
  @field('type') type!: string;
  @field('title') title!: string;
  @field('message') message!: string;
  @json('data', sanitizeData) data!: any;
  @readonly @date('created_at') createdAt!: Date;
  @date('read_at') readAt!: Date | null;
  @field('sync_status') syncStatus!: string;
  
  get isRead(): boolean {
    return this.readAt !== null;
  }
  
  get isUnread(): boolean {
    return this.readAt === null;
  }
  
  @action async markAsRead() {
    await this.update(notification => {
      notification.readAt = new Date();
      notification.syncStatus = 'pending';
    });
  }
  
  @action async markAsUnread() {
    await this.update(notification => {
      notification.readAt = null;
      notification.syncStatus = 'pending';
    });
  }
}