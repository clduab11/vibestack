import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, action, json } from '@nozbe/watermelondb/decorators';

const sanitizeValue = (raw: any) => {
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
  return raw || null;
};

export default class CachedData extends Model {
  static table = 'cached_data';

  @field('key') key!: string;
  @json('value', sanitizeValue) value!: any;
  @date('expires_at') expiresAt!: Date;
  @readonly @date('created_at') createdAt!: Date;
  
  get isExpired(): boolean {
    return new Date() > this.expiresAt;
  }
  
  @action async updateValue(value: any, ttl?: number) {
    const expiresAt = new Date();
    expiresAt.setMilliseconds(expiresAt.getMilliseconds() + (ttl || 3600000)); // 1 hour default
    
    await this.update(cache => {
      cache.value = value;
      cache.expiresAt = expiresAt;
    });
  }
}