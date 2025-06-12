import { database, databaseHelpers } from '@/services/database';
import { SyncQueue } from '@/services/database/models';
import { store } from '@/store';
import { apiSlice } from '@/store/api/apiSlice';
import NetInfo from '@react-native-community/netinfo';
import { Q } from '@nozbe/watermelondb';

export interface SyncOperation {
  id: string;
  operationType: 'create' | 'update' | 'delete';
  resourceType: string;
  resourceId: string;
  payload: any;
  retryCount: number;
  lastAttemptAt: Date | null;
  error: string | null;
}

export interface SyncConflict {
  localData: any;
  serverData: any;
  resolution: 'local' | 'server' | 'merged';
  mergedData?: any;
}

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingOperations: number;
  lastSyncAt: Date | null;
  errors: string[];
}

export class SyncEngine {
  private static instance: SyncEngine;
  private isOnline: boolean = true;
  private isSyncing: boolean = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private retryTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private unsubscribeNetInfo: (() => void) | null = null;
  
  private constructor() {
    this.setupNetworkListener();
  }
  
  static getInstance(): SyncEngine {
    if (!SyncEngine.instance) {
      SyncEngine.instance = new SyncEngine();
    }
    return SyncEngine.instance;
  }
  
  private setupNetworkListener(): void {
    this.unsubscribeNetInfo = NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected ?? false;
      
      if (wasOffline && this.isOnline) {
        // Network came back online, trigger sync
        this.sync();
      }
    });
  }
  
  async start(): Promise<void> {
    // Start periodic sync
    this.syncInterval = setInterval(() => {
      if (this.isOnline && !this.isSyncing) {
        this.sync();
      }
    }, 30000); // Sync every 30 seconds
    
    // Initial sync
    await this.sync();
  }
  
  stop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    
    // Clear all retry timeouts
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
    this.retryTimeouts.clear();
    
    // Unsubscribe from network events
    if (this.unsubscribeNetInfo) {
      this.unsubscribeNetInfo();
      this.unsubscribeNetInfo = null;
    }
  }
  
  async sync(): Promise<void> {
    if (!this.isOnline || this.isSyncing) {
      return;
    }
    
    this.isSyncing = true;
    
    try {
      // Process sync queue
      await this.processSyncQueue();
      
      // Pull latest data from server
      await this.pullChanges();
      
      // Update last sync timestamp
      await databaseHelpers.setCachedData('lastSyncAt', new Date());
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      this.isSyncing = false;
    }
  }
  
  private async processSyncQueue(): Promise<void> {
    const queueItems = await databaseHelpers.getSyncQueue();
    
    for (const item of queueItems) {
      try {
        await this.processSyncItem(item);
      } catch (error) {
        await this.handleSyncError(item, error);
      }
    }
  }
  
  private async processSyncItem(item: SyncQueue): Promise<void> {
    const { operationType, resourceType, resourceId, payload } = item;
    
    let result;
    
    switch (operationType) {
      case 'create':
        result = await this.createResource(resourceType, payload);
        break;
      case 'update':
        result = await this.updateResource(resourceType, resourceId, payload);
        break;
      case 'delete':
        result = await this.deleteResource(resourceType, resourceId);
        break;
      default:
        throw new Error(`Unknown operation type: ${operationType}`);
    }
    
    // If successful, remove from queue and update local entity
    await database.write(async () => {
      if (result.serverId && resourceType !== 'sync_queue') {
        // Update local entity with server ID
        const model = database.get(resourceType);
        const localEntity = await model.find(resourceId);
        if (localEntity) {
          await localEntity.update((record: any) => {
            record.serverId = result.serverId;
            record.syncStatus = 'synced';
          });
        }
      }
      
      // Remove from sync queue
      await item.destroyPermanently();
    });
  }
  
  private async createResource(resourceType: string, payload: any): Promise<any> {
    const endpoint = this.getEndpoint(resourceType, 'create');
    const mutation = store.dispatch(endpoint.initiate(payload));
    const result = await mutation;
    
    if ('error' in result) {
      throw result.error;
    }
    
    return result.data;
  }
  
  private async updateResource(resourceType: string, resourceId: string, payload: any): Promise<any> {
    const endpoint = this.getEndpoint(resourceType, 'update');
    const mutation = store.dispatch(endpoint.initiate({ id: resourceId, ...payload }));
    const result = await mutation;
    
    if ('error' in result) {
      throw result.error;
    }
    
    return result.data;
  }
  
  private async deleteResource(resourceType: string, resourceId: string): Promise<any> {
    const endpoint = this.getEndpoint(resourceType, 'delete');
    const mutation = store.dispatch(endpoint.initiate(resourceId));
    const result = await mutation;
    
    if ('error' in result) {
      throw result.error;
    }
    
    return result.data || { success: true };
  }
  
  private getEndpoint(resourceType: string, operation: string): any {
    const endpointMap: { [key: string]: any } = {
      'habits.create': apiSlice.endpoints.createHabit,
      'habits.update': apiSlice.endpoints.updateHabit,
      'habits.delete': apiSlice.endpoints.deleteHabit,
      'habit_completions.create': apiSlice.endpoints.createCompletion,
      'habit_completions.update': apiSlice.endpoints.updateCompletion,
      'habit_completions.delete': apiSlice.endpoints.deleteCompletion,
      'challenges.create': apiSlice.endpoints.createChallenge,
      'challenges.update': apiSlice.endpoints.updateChallenge,
      'challenges.delete': apiSlice.endpoints.deleteChallenge,
    };
    
    const key = `${resourceType}.${operation}`;
    const endpoint = endpointMap[key];
    
    if (!endpoint) {
      throw new Error(`No endpoint found for ${key}`);
    }
    
    return endpoint;
  }
  
  private async handleSyncError(item: SyncQueue, error: any): Promise<void> {
    const maxRetries = 3;
    const retryCount = item.retryCount || 0;
    
    if (retryCount >= maxRetries) {
      // Max retries reached, mark as failed
      await database.write(async () => {
        await item.update(syncItem => {
          syncItem.error = this.formatError(error);
          syncItem.lastAttemptAt = new Date();
        });
      });
      return;
    }
    
    // Schedule retry with exponential backoff
    const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
    
    await database.write(async () => {
      await item.update(syncItem => {
        syncItem.retryCount = retryCount + 1;
        syncItem.lastAttemptAt = new Date();
        syncItem.error = this.formatError(error);
      });
    });
    
    // Schedule retry
    const timeoutId = setTimeout(() => {
      this.retryTimeouts.delete(item.id);
      this.processSyncItem(item).catch(err => 
        this.handleSyncError(item, err)
      );
    }, delay);
    
    this.retryTimeouts.set(item.id, timeoutId);
  }
  
  private async pullChanges(): Promise<void> {
    // Get last sync timestamp
    const lastSyncAt = await databaseHelpers.getCachedData('lastSyncAt');
    
    // Fetch changes from server
    const changes = await this.fetchServerChanges(lastSyncAt);
    
    // Apply changes to local database
    await this.applyServerChanges(changes);
  }
  
  private async fetchServerChanges(since: Date | null): Promise<any> {
    const query = store.dispatch(
      apiSlice.endpoints.getChanges.initiate({ 
        since: since?.toISOString() 
      })
    );
    
    const result = await query;
    
    if ('error' in result) {
      throw result.error;
    }
    
    return result.data;
  }
  
  private async applyServerChanges(changes: any): Promise<void> {
    await database.write(async () => {
      // Apply habit changes
      for (const habit of changes.habits || []) {
        await this.applyHabitChange(habit);
      }
      
      // Apply completion changes
      for (const completion of changes.completions || []) {
        await this.applyCompletionChange(completion);
      }
      
      // Apply challenge changes
      for (const challenge of changes.challenges || []) {
        await this.applyChallengeChange(challenge);
      }
    });
  }
  
  private async applyHabitChange(serverHabit: any): Promise<void> {
    const localHabit = await databaseHelpers.getHabitByServerId(serverHabit.id);
    
    if (!localHabit) {
      // Create new habit
      await database.get('habits').create(habit => {
        Object.assign(habit, {
          serverId: serverHabit.id,
          name: serverHabit.name,
          description: serverHabit.description,
          frequency: serverHabit.frequency,
          reminderTime: serverHabit.reminder_time ? new Date(serverHabit.reminder_time) : null,
          color: serverHabit.color,
          icon: serverHabit.icon,
          streak: serverHabit.streak,
          bestStreak: serverHabit.best_streak,
          isArchived: serverHabit.is_archived,
          syncStatus: 'synced'
        });
      });
    } else {
      // Check for conflicts
      const hasLocalChanges = localHabit.syncStatus !== 'synced';
      
      if (hasLocalChanges) {
        // Resolve conflict
        const resolution = await this.resolveConflict(localHabit, serverHabit);
        await this.applyConflictResolution(localHabit, resolution);
      } else {
        // No conflict, apply server changes
        await localHabit.update(habit => {
          Object.assign(habit, {
            name: serverHabit.name,
            description: serverHabit.description,
            frequency: serverHabit.frequency,
            reminderTime: serverHabit.reminder_time ? new Date(serverHabit.reminder_time) : null,
            color: serverHabit.color,
            icon: serverHabit.icon,
            streak: serverHabit.streak,
            bestStreak: serverHabit.best_streak,
            isArchived: serverHabit.is_archived,
            syncStatus: 'synced'
          });
        });
      }
    }
  }
  
  private async applyCompletionChange(serverCompletion: any): Promise<void> {
    // Similar logic for completions
    const collection = database.get('habit_completions');
    const existing = await collection
      .query(Q.where('server_id', serverCompletion.id))
      .fetch();
    
    if (existing.length === 0) {
      await collection.create(completion => {
        Object.assign(completion, {
          serverId: serverCompletion.id,
          habitId: serverCompletion.habit_id,
          completedAt: new Date(serverCompletion.completed_at),
          note: serverCompletion.note,
          mood: serverCompletion.mood,
          syncStatus: 'synced'
        });
      });
    }
  }
  
  private async applyChallengeChange(serverChallenge: any): Promise<void> {
    // Similar logic for challenges
    const collection = database.get('challenges');
    const existing = await collection
      .query(Q.where('server_id', serverChallenge.id))
      .fetch();
    
    if (existing.length === 0) {
      await collection.create(challenge => {
        Object.assign(challenge, {
          serverId: serverChallenge.id,
          name: serverChallenge.name,
          description: serverChallenge.description,
          habitId: serverChallenge.habit_id,
          startDate: new Date(serverChallenge.start_date),
          endDate: new Date(serverChallenge.end_date),
          participants: serverChallenge.participants,
          creatorId: serverChallenge.creator_id,
          type: serverChallenge.type,
          status: serverChallenge.status,
          syncStatus: 'synced'
        });
      });
    }
  }
  
  private async resolveConflict(localData: any, serverData: any): Promise<SyncConflict> {
    // Simple last-write-wins strategy
    // In a real app, you might want more sophisticated conflict resolution
    const localUpdated = localData.updatedAt?.getTime() || 0;
    const serverUpdated = new Date(serverData.updated_at).getTime();
    
    if (localUpdated > serverUpdated) {
      return {
        localData,
        serverData,
        resolution: 'local'
      };
    } else {
      return {
        localData,
        serverData,
        resolution: 'server'
      };
    }
  }
  
  private async applyConflictResolution(localEntity: any, conflict: SyncConflict): Promise<void> {
    if (conflict.resolution === 'server') {
      // Apply server data
      await localEntity.update((record: any) => {
        // Copy server data to local record
        Object.assign(record, conflict.serverData);
        record.syncStatus = 'synced';
      });
    } else if (conflict.resolution === 'local') {
      // Keep local data, mark for sync
      await localEntity.update((record: any) => {
        record.syncStatus = 'pending';
      });
      
      // Add to sync queue
      await databaseHelpers.addToSyncQueue(
        'update',
        localEntity.constructor.table,
        localEntity.id,
        localEntity._raw
      );
    }
  }
  
  async getStatus(): Promise<SyncStatus> {
    const pendingOperations = await database
      .get<SyncQueue>('sync_queue')
      .query()
      .fetchCount();
    
    const lastSyncAt = await databaseHelpers.getCachedData('lastSyncAt');
    
    const failedOperations = await database
      .get<SyncQueue>('sync_queue')
      .query(Q.where('error', Q.notEq(null)))
      .fetch();
    
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      pendingOperations,
      lastSyncAt,
      errors: failedOperations.map(op => op.error || '')
    };
  }
  
  async clearSyncQueue(): Promise<void> {
    await database.write(async () => {
      const allItems = await database.get<SyncQueue>('sync_queue').query().fetch();
      await Promise.all(allItems.map(item => item.destroyPermanently()));
    });
  }
  
  private formatError(error: any): string {
    if (error?.message) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    return 'Unknown sync error';
  }
}

export const syncEngine = SyncEngine.getInstance();