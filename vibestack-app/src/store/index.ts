import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import authReducer from './slices/authSlice';
import habitsReducer from './slices/habitsSlice';
import socialReducer from './slices/socialSlice';
import avatarReducer from './slices/avatarSlice';
import uiReducer from './slices/uiSlice';
import { apiSlice } from './api/apiSlice';
import { syncMiddleware } from './middleware/syncMiddleware';
import { offlineMiddleware } from './middleware/offlineMiddleware';

export const store = configureStore({
  reducer: {
    // Feature slices
    auth: authReducer,
    habits: habitsReducer,
    social: socialReducer,
    avatar: avatarReducer,
    ui: uiReducer,
    
    // RTK Query API slice
    [apiSlice.reducerPath]: apiSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
        ignoredActionPaths: ['meta.arg', 'payload.timestamp'],
        ignoredPaths: ['items.dates'],
      },
    })
      .concat(apiSlice.middleware)
      .concat(syncMiddleware)
      .concat(offlineMiddleware),
});

// Setup listeners for refetch behaviors
setupListeners(store.dispatch);

// Infer types from the store
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Export typed hooks
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;