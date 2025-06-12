import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { apiSlice } from '../api/apiSlice';

interface Habit {
  id: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
  frequencyType: 'daily' | 'weekly' | 'custom';
  frequencyDays: number[];
  reminderTime?: number;
  streakCurrent: number;
  streakBest: number;
  createdAt: string;
  updatedAt: string;
  lastCompletedAt?: string;
  isArchived: boolean;
  syncStatus?: 'pending' | 'synced' | 'error';
}

interface HabitsState {
  habits: Habit[];
  activeHabitId: string | null;
  isLoading: boolean;
  error: string | null;
  syncQueue: SyncOperation[];
  lastSyncTime: number | null;
}

interface SyncOperation {
  id: string;
  type: 'create' | 'update' | 'delete' | 'complete';
  habitId: string;
  data: any;
  timestamp: number;
  retryCount: number;
}

const initialState: HabitsState = {
  habits: [],
  activeHabitId: null,
  isLoading: false,
  error: null,
  syncQueue: [],
  lastSyncTime: null,
};

const habitsSlice = createSlice({
  name: 'habits',
  initialState,
  reducers: {
    setActiveHabit: (state, action: PayloadAction<string | null>) => {
      state.activeHabitId = action.payload;
    },
    addToSyncQueue: (state, action: PayloadAction<Omit<SyncOperation, 'id' | 'timestamp' | 'retryCount'>>) => {
      state.syncQueue.push({
        ...action.payload,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        retryCount: 0,
      });
    },
    removeFromSyncQueue: (state, action: PayloadAction<string>) => {
      state.syncQueue = state.syncQueue.filter(op => op.id !== action.payload);
    },
    incrementRetryCount: (state, action: PayloadAction<string>) => {
      const operation = state.syncQueue.find(op => op.id === action.payload);
      if (operation) {
        operation.retryCount += 1;
      }
    },
    updateSyncStatus: (state, action: PayloadAction<{ habitId: string; status: 'pending' | 'synced' | 'error' }>) => {
      const habit = state.habits.find(h => h.id === action.payload.habitId);
      if (habit) {
        habit.syncStatus = action.payload.status;
      }
    },
    setLastSyncTime: (state, action: PayloadAction<number>) => {
      state.lastSyncTime = action.payload;
    },
    optimisticComplete: (state, action: PayloadAction<string>) => {
      const habit = state.habits.find(h => h.id === action.payload);
      if (habit) {
        habit.lastCompletedAt = new Date().toISOString();
        habit.streakCurrent += 1;
        if (habit.streakCurrent > habit.streakBest) {
          habit.streakBest = habit.streakCurrent;
        }
        habit.syncStatus = 'pending';
      }
    },
    rollbackComplete: (state, action: PayloadAction<string>) => {
      const habit = state.habits.find(h => h.id === action.payload);
      if (habit && habit.streakCurrent > 0) {
        habit.streakCurrent -= 1;
        habit.syncStatus = 'error';
      }
    },
  },
  extraReducers: (builder) => {
    // Handle get habits
    builder.addMatcher(
      apiSlice.endpoints.getHabits.matchPending,
      (state) => {
        state.isLoading = true;
        state.error = null;
      }
    );
    
    builder.addMatcher(
      apiSlice.endpoints.getHabits.matchFulfilled,
      (state, { payload }) => {
        state.habits = payload.map(habit => ({ ...habit, syncStatus: 'synced' }));
        state.isLoading = false;
        state.lastSyncTime = Date.now();
      }
    );
    
    builder.addMatcher(
      apiSlice.endpoints.getHabits.matchRejected,
      (state, { error }) => {
        state.isLoading = false;
        state.error = error.message || 'Failed to fetch habits';
      }
    );
    
    // Handle create habit
    builder.addMatcher(
      apiSlice.endpoints.createHabit.matchFulfilled,
      (state, { payload }) => {
        state.habits.push({ ...payload, syncStatus: 'synced' });
      }
    );
    
    // Handle update habit
    builder.addMatcher(
      apiSlice.endpoints.updateHabit.matchFulfilled,
      (state, { payload }) => {
        const index = state.habits.findIndex(h => h.id === payload.id);
        if (index !== -1) {
          state.habits[index] = { ...payload, syncStatus: 'synced' };
        }
      }
    );
    
    // Handle delete habit
    builder.addMatcher(
      apiSlice.endpoints.deleteHabit.matchFulfilled,
      (state, { meta }) => {
        const habitId = meta.arg.originalArgs;
        state.habits = state.habits.filter(h => h.id !== habitId);
        if (state.activeHabitId === habitId) {
          state.activeHabitId = null;
        }
      }
    );
    
    // Handle complete habit
    builder.addMatcher(
      apiSlice.endpoints.completeHabit.matchFulfilled,
      (state, { payload, meta }) => {
        const habit = state.habits.find(h => h.id === meta.arg.originalArgs.habitId);
        if (habit) {
          habit.syncStatus = 'synced';
        }
      }
    );
    
    builder.addMatcher(
      apiSlice.endpoints.completeHabit.matchRejected,
      (state, { meta }) => {
        const habit = state.habits.find(h => h.id === meta.arg.originalArgs.habitId);
        if (habit) {
          habit.syncStatus = 'error';
        }
      }
    );
  },
});

export const {
  setActiveHabit,
  addToSyncQueue,
  removeFromSyncQueue,
  incrementRetryCount,
  updateSyncStatus,
  setLastSyncTime,
  optimisticComplete,
  rollbackComplete,
} = habitsSlice.actions;

export default habitsSlice.reducer;

// Selectors
export const selectAllHabits = (state: { habits: HabitsState }) => state.habits.habits;
export const selectActiveHabits = (state: { habits: HabitsState }) => 
  state.habits.habits.filter(h => !h.isArchived);
export const selectArchivedHabits = (state: { habits: HabitsState }) => 
  state.habits.habits.filter(h => h.isArchived);
export const selectActiveHabit = (state: { habits: HabitsState }) => 
  state.habits.habits.find(h => h.id === state.habits.activeHabitId);
export const selectHabitById = (id: string) => (state: { habits: HabitsState }) => 
  state.habits.habits.find(h => h.id === id);
export const selectSyncQueue = (state: { habits: HabitsState }) => state.habits.syncQueue;
export const selectHabitsLoading = (state: { habits: HabitsState }) => state.habits.isLoading;
export const selectHabitsError = (state: { habits: HabitsState }) => state.habits.error;
export const selectLastSyncTime = (state: { habits: HabitsState }) => state.habits.lastSyncTime;