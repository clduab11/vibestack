import { Middleware } from '@reduxjs/toolkit';
import NetInfo from '@react-native-community/netinfo';
import { RootState } from '../index';
import { setOnlineStatus, showToast } from '../slices/uiSlice';
import { database } from '@/services/database';

let isInitialized = false;

export const offlineMiddleware: Middleware<{}, RootState> = (store) => (next) => (action) => {
  // Initialize network listener on first action
  if (!isInitialized) {
    isInitialized = true;
    initializeNetworkListener(store);
  }
  
  // Handle API errors that might indicate offline status
  if (action.type.endsWith('/rejected')) {
    const error = action.error;
    if (isNetworkError(error)) {
      store.dispatch(setOnlineStatus(false));
      store.dispatch(showToast({
        type: 'warning',
        message: 'You are offline. Changes will sync when connection is restored.',
        duration: 5000,
      }));
    }
  }
  
  return next(action);
};

function initializeNetworkListener(store: any) {
  // Subscribe to network state updates
  NetInfo.addEventListener(state => {
    const wasOffline = !store.getState().ui.isOnline;
    const isNowOnline = state.isConnected && state.isInternetReachable;
    
    if (wasOffline && isNowOnline) {
      // Coming back online
      store.dispatch(setOnlineStatus(true));
      store.dispatch(showToast({
        type: 'success',
        message: 'Back online! Syncing your data...',
        duration: 3000,
      }));
      
      // Trigger sync
      syncOfflineData(store);
    } else if (!wasOffline && !isNowOnline) {
      // Going offline
      store.dispatch(setOnlineStatus(false));
      store.dispatch(showToast({
        type: 'info',
        message: 'You are offline. Your changes will be saved locally.',
        duration: 4000,
      }));
    }
  });
  
  // Check initial network state
  NetInfo.fetch().then(state => {
    store.dispatch(setOnlineStatus(state.isConnected && state.isInternetReachable));
  });
}

function isNetworkError(error: any): boolean {
  if (!error) return false;
  
  // Common network error indicators
  const networkErrorMessages = [
    'Network request failed',
    'Failed to fetch',
    'NetworkError',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'ENETUNREACH',
  ];
  
  const errorMessage = error.message || error.toString();
  return networkErrorMessages.some(msg => errorMessage.includes(msg));
}

async function syncOfflineData(store: any) {
  try {
    // Sync habits from local database
    const localHabits = await database.getUnsyncedHabits();
    
    for (const habit of localHabits) {
      // This will be handled by the sync middleware
      store.dispatch({
        type: 'habits/syncLocalHabit',
        payload: habit,
      });
    }
    
    // Sync completions
    const localCompletions = await database.getUnsyncedCompletions();
    
    for (const completion of localCompletions) {
      store.dispatch({
        type: 'habits/syncLocalCompletion',
        payload: completion,
      });
    }
  } catch (error) {
    console.error('Error syncing offline data:', error);
    store.dispatch(showToast({
      type: 'error',
      message: 'Failed to sync some offline changes. Will retry later.',
      duration: 5000,
    }));
  }
}