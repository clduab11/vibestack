import { Middleware } from '@reduxjs/toolkit';
import { RootState } from '../index';
import { 
  addToSyncQueue, 
  removeFromSyncQueue, 
  incrementRetryCount,
  updateSyncStatus 
} from '../slices/habitsSlice';
import { setSyncingStatus } from '../slices/uiSlice';
import { apiSlice } from '../api/apiSlice';

const SYNC_ACTIONS = [
  'habits/optimisticComplete',
  'habits/createHabitOffline',
  'habits/updateHabitOffline',
  'habits/deleteHabitOffline',
];

const MAX_RETRY_COUNT = 3;
const RETRY_DELAY_BASE = 1000; // 1 second

export const syncMiddleware: Middleware<{}, RootState> = (store) => (next) => async (action) => {
  const result = next(action);
  
  // Check if this action needs to be synced
  if (SYNC_ACTIONS.includes(action.type)) {
    const state = store.getState();
    
    // Add to sync queue if offline
    if (!state.ui.isOnline) {
      store.dispatch(addToSyncQueue({
        type: getOperationType(action.type),
        habitId: action.payload.habitId || action.payload,
        data: action.payload,
      }));
    } else {
      // Try to sync immediately if online
      await processSyncOperation(store, {
        type: getOperationType(action.type),
        habitId: action.payload.habitId || action.payload,
        data: action.payload,
      });
    }
  }
  
  // Process sync queue when coming back online
  if (action.type === 'ui/setOnlineStatus' && action.payload === true) {
    processSyncQueue(store);
  }
  
  return result;
};

function getOperationType(actionType: string): 'create' | 'update' | 'delete' | 'complete' {
  if (actionType.includes('Complete')) return 'complete';
  if (actionType.includes('create')) return 'create';
  if (actionType.includes('update')) return 'update';
  if (actionType.includes('delete')) return 'delete';
  return 'complete';
}

async function processSyncQueue(store: any) {
  const state = store.getState();
  const syncQueue = state.habits.syncQueue;
  
  if (syncQueue.length === 0 || !state.ui.isOnline || state.ui.isSyncing) {
    return;
  }
  
  store.dispatch(setSyncingStatus(true));
  
  for (const operation of syncQueue) {
    if (operation.retryCount >= MAX_RETRY_COUNT) {
      // Mark as permanently failed
      store.dispatch(updateSyncStatus({ 
        habitId: operation.habitId, 
        status: 'error' 
      }));
      store.dispatch(removeFromSyncQueue(operation.id));
      continue;
    }
    
    const success = await processSyncOperation(store, operation);
    
    if (success) {
      store.dispatch(removeFromSyncQueue(operation.id));
      store.dispatch(updateSyncStatus({ 
        habitId: operation.habitId, 
        status: 'synced' 
      }));
    } else {
      store.dispatch(incrementRetryCount(operation.id));
      
      // Exponential backoff
      const delay = RETRY_DELAY_BASE * Math.pow(2, operation.retryCount);
      setTimeout(() => processSyncQueue(store), delay);
      break; // Stop processing queue on failure
    }
  }
  
  store.dispatch(setSyncingStatus(false));
}

async function processSyncOperation(
  store: any, 
  operation: { type: string; habitId: string; data: any }
): Promise<boolean> {
  try {
    switch (operation.type) {
      case 'complete':
        await store.dispatch(
          apiSlice.endpoints.completeHabit.initiate({
            habitId: operation.habitId,
            ...operation.data,
          })
        ).unwrap();
        return true;
        
      case 'create':
        await store.dispatch(
          apiSlice.endpoints.createHabit.initiate(operation.data)
        ).unwrap();
        return true;
        
      case 'update':
        await store.dispatch(
          apiSlice.endpoints.updateHabit.initiate({
            id: operation.habitId,
            ...operation.data,
          })
        ).unwrap();
        return true;
        
      case 'delete':
        await store.dispatch(
          apiSlice.endpoints.deleteHabit.initiate(operation.habitId)
        ).unwrap();
        return true;
        
      default:
        console.warn('Unknown sync operation type:', operation.type);
        return false;
    }
  } catch (error) {
    console.error('Sync operation failed:', error);
    return false;
  }
}