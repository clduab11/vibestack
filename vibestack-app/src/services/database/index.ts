import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schema } from './schema';
import { models } from './models';
import { 
  Habit, 
  HabitCompletion, 
  SyncQueue, 
  AIConversation, 
  CachedData,
  Challenge,
  Friend,
  Notification 
} from './models';
import { Q } from '@nozbe/watermelondb';

// Create the adapter
const adapter = new SQLiteAdapter({
  schema,
  migrations: [], // We'll add migrations later as needed
  jsi: true, // Enable JSI for better performance on iOS
  onSetUpError: error => {
    console.error('Database setup error:', error);
  }
});

// Create the database
export const database = new Database({
  adapter,
  modelClasses: models,
});

// Database helper functions
export const databaseHelpers = {
  // Habit helpers
  async getUnsyncedHabits(): Promise<Habit[]> {
    return await database
      .get<Habit>('habits')
      .query(Q.where('sync_status', Q.notEq('synced')))
      .fetch();
  },
  
  async getActiveHabits(): Promise<Habit[]> {
    return await database
      .get<Habit>('habits')
      .query(Q.where('is_archived', false))
      .fetch();
  },
  
  async getHabitByServerId(serverId: string): Promise<Habit | null> {
    const habits = await database
      .get<Habit>('habits')
      .query(Q.where('server_id', serverId))
      .fetch();
    return habits[0] || null;
  },
  
  // Completion helpers
  async getUnsyncedCompletions(): Promise<HabitCompletion[]> {
    return await database
      .get<HabitCompletion>('habit_completions')
      .query(Q.where('sync_status', Q.notEq('synced')))
      .fetch();
  },
  
  async getCompletionsForHabit(habitId: string): Promise<HabitCompletion[]> {
    return await database
      .get<HabitCompletion>('habit_completions')
      .query(Q.where('habit_id', habitId))
      .fetch();
  },
  
  async getTodayCompletions(): Promise<HabitCompletion[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return await database
      .get<HabitCompletion>('habit_completions')
      .query(
        Q.and(
          Q.where('completed_at', Q.gte(today.getTime())),
          Q.where('completed_at', Q.lt(tomorrow.getTime()))
        )
      )
      .fetch();
  },
  
  // Sync queue helpers
  async getSyncQueue(): Promise<SyncQueue[]> {
    return await database
      .get<SyncQueue>('sync_queue')
      .query(Q.sortBy('created_at', Q.asc))
      .fetch();
  },
  
  async addToSyncQueue(
    operationType: string,
    resourceType: string,
    resourceId: string,
    payload: any
  ): Promise<SyncQueue> {
    return await database.write(async () => {
      return await database
        .get<SyncQueue>('sync_queue')
        .create(syncItem => {
          syncItem.operationType = operationType;
          syncItem.resourceType = resourceType;
          syncItem.resourceId = resourceId;
          syncItem.payload = payload;
          syncItem.retryCount = 0;
          syncItem.lastAttemptAt = null;
          syncItem.error = null;
        });
    });
  },
  
  // Cache helpers
  async getCachedData(key: string): Promise<any | null> {
    const cached = await database
      .get<CachedData>('cached_data')
      .query(Q.where('key', key))
      .fetch();
    
    if (cached[0] && !cached[0].isExpired) {
      return cached[0].value;
    }
    
    // Clean up expired cache
    if (cached[0] && cached[0].isExpired) {
      await database.write(async () => {
        await cached[0].destroyPermanently();
      });
    }
    
    return null;
  },
  
  async setCachedData(key: string, value: any, ttl?: number): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setMilliseconds(expiresAt.getMilliseconds() + (ttl || 3600000)); // 1 hour default
    
    await database.write(async () => {
      const existing = await database
        .get<CachedData>('cached_data')
        .query(Q.where('key', key))
        .fetch();
      
      if (existing[0]) {
        await existing[0].update(cache => {
          cache.value = value;
          cache.expiresAt = expiresAt;
        });
      } else {
        await database
          .get<CachedData>('cached_data')
          .create(cache => {
            cache.key = key;
            cache.value = value;
            cache.expiresAt = expiresAt;
          });
      }
    });
  },
  
  // AI conversation helpers
  async saveConversation(
    personalityType: string,
    message: string,
    response: string,
    userMood?: string,
    context?: any
  ): Promise<void> {
    await database.write(async () => {
      await database
        .get<AIConversation>('ai_conversations')
        .create(conversation => {
          conversation.personalityType = personalityType;
          conversation.message = message;
          conversation.response = response;
          conversation.userMood = userMood || null;
          conversation.context = context || {};
        });
    });
  },
  
  async getRecentConversations(personalityType: string, limit = 10): Promise<AIConversation[]> {
    return await database
      .get<AIConversation>('ai_conversations')
      .query(
        Q.where('personality_type', personalityType),
        Q.sortBy('created_at', Q.desc),
        Q.take(limit)
      )
      .fetch();
  },
  
  // Challenge helpers
  async getActiveChallenges(): Promise<Challenge[]> {
    const now = new Date();
    return await database
      .get<Challenge>('challenges')
      .query(
        Q.and(
          Q.where('status', 'active'),
          Q.where('start_date', Q.lte(now.getTime())),
          Q.where('end_date', Q.gte(now.getTime()))
        )
      )
      .fetch();
  },
  
  async getUserChallenges(userId: string): Promise<Challenge[]> {
    const allChallenges = await database
      .get<Challenge>('challenges')
      .query()
      .fetch();
    
    return allChallenges.filter(challenge => 
      challenge.participants.includes(userId)
    );
  },
  
  // Friend helpers
  async getAcceptedFriends(): Promise<Friend[]> {
    return await database
      .get<Friend>('friends')
      .query(Q.where('friendship_status', 'accepted'))
      .fetch();
  },
  
  async getPendingFriendRequests(): Promise<Friend[]> {
    return await database
      .get<Friend>('friends')
      .query(Q.where('friendship_status', 'pending'))
      .fetch();
  },
  
  // Notification helpers
  async getUnreadNotifications(): Promise<Notification[]> {
    return await database
      .get<Notification>('notifications')
      .query(
        Q.where('read_at', null),
        Q.sortBy('created_at', Q.desc)
      )
      .fetch();
  },
  
  async markAllNotificationsAsRead(): Promise<void> {
    const unreadNotifications = await databaseHelpers.getUnreadNotifications();
    
    await database.write(async () => {
      await Promise.all(
        unreadNotifications.map(notification => 
          notification.markAsRead()
        )
      );
    });
  },
  
  // Cleanup helpers
  async cleanupOldData(): Promise<void> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    await database.write(async () => {
      // Clean old AI conversations
      const oldConversations = await database
        .get<AIConversation>('ai_conversations')
        .query(Q.where('created_at', Q.lt(thirtyDaysAgo.getTime())))
        .fetch();
      
      await Promise.all(
        oldConversations.map(conv => conv.destroyPermanently())
      );
      
      // Clean old notifications
      const oldNotifications = await database
        .get<Notification>('notifications')
        .query(
          Q.and(
            Q.where('created_at', Q.lt(thirtyDaysAgo.getTime())),
            Q.where('read_at', Q.notEq(null))
          )
        )
        .fetch();
      
      await Promise.all(
        oldNotifications.map(notif => notif.destroyPermanently())
      );
    });
  }
};

// Export types
export type {
  Habit,
  HabitCompletion,
  SyncQueue,
  AIConversation,
  CachedData,
  Challenge,
  Friend,
  Notification
};