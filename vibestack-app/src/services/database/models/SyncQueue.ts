import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, action, json } from '@nozbe/watermelondb/decorators';

const sanitizePayload = (raw: any) => {
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return raw || {};
};

export default class SyncQueue extends Model {
  static table = 'sync_queue';

  @field('operation_type') operationType!: string;
  @field('resource_type') resourceType!: string;
  @field('resource_id') resourceId!: string;
  @json('payload', sanitizePayload) payload!: any;
  @field('retry_count') retryCount!: number;
  @readonly @date('created_at') createdAt!: Date;
  @date('last_attempt_at') lastAttemptAt!: Date | null;
  @field('error') error!: string | null;
  
  @action async incrementRetry(error?: string) {
    await this.update(syncItem => {
      syncItem.retryCount = syncItem.retryCount + 1;
      syncItem.lastAttemptAt = new Date();
      syncItem.error = error || null;
    });
  }
  
  @action async markCompleted() {
    await this.destroyPermanently();
  }
}