import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, json } from '@nozbe/watermelondb/decorators';

const sanitizeContext = (raw: any) => {
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return raw || {};
};

export default class AIConversation extends Model {
  static table = 'ai_conversations';

  @field('personality_type') personalityType!: string;
  @field('message') message!: string;
  @field('response') response!: string;
  @readonly @date('created_at') createdAt!: Date;
  @field('user_mood') userMood!: string | null;
  @json('context', sanitizeContext) context!: any;
}