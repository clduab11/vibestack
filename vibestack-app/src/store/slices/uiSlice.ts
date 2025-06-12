import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

interface UIState {
  isOnline: boolean;
  isSyncing: boolean;
  activeModal: string | null;
  toasts: Toast[];
  isLoading: boolean;
  loadingMessage: string | null;
  theme: 'light' | 'dark' | 'system';
  hapticEnabled: boolean;
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  activeTab: string;
}

const initialState: UIState = {
  isOnline: true,
  isSyncing: false,
  activeModal: null,
  toasts: [],
  isLoading: false,
  loadingMessage: null,
  theme: 'system',
  hapticEnabled: true,
  soundEnabled: true,
  notificationsEnabled: true,
  activeTab: 'home',
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setOnlineStatus: (state, action: PayloadAction<boolean>) => {
      state.isOnline = action.payload;
    },
    setSyncingStatus: (state, action: PayloadAction<boolean>) => {
      state.isSyncing = action.payload;
    },
    showModal: (state, action: PayloadAction<string>) => {
      state.activeModal = action.payload;
    },
    hideModal: (state) => {
      state.activeModal = null;
    },
    showToast: (state, action: PayloadAction<Omit<Toast, 'id'>>) => {
      const toast: Toast = {
        ...action.payload,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        duration: action.payload.duration || 3000,
      };
      state.toasts.push(toast);
    },
    removeToast: (state, action: PayloadAction<string>) => {
      state.toasts = state.toasts.filter(t => t.id !== action.payload);
    },
    showSuccess: (state, action: PayloadAction<string>) => {
      const toast: Toast = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'success',
        message: action.payload,
        duration: 3000,
      };
      state.toasts.push(toast);
    },
    showError: (state, action: PayloadAction<string>) => {
      const toast: Toast = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'error',
        message: action.payload,
        duration: 5000,
      };
      state.toasts.push(toast);
    },
    setLoading: (state, action: PayloadAction<{ isLoading: boolean; message?: string | null }>) => {
      state.isLoading = action.payload.isLoading;
      state.loadingMessage = action.payload.message || null;
    },
    setTheme: (state, action: PayloadAction<'light' | 'dark' | 'system'>) => {
      state.theme = action.payload;
    },
    toggleHaptic: (state) => {
      state.hapticEnabled = !state.hapticEnabled;
    },
    toggleSound: (state) => {
      state.soundEnabled = !state.soundEnabled;
    },
    setNotificationsEnabled: (state, action: PayloadAction<boolean>) => {
      state.notificationsEnabled = action.payload;
    },
    setActiveTab: (state, action: PayloadAction<string>) => {
      state.activeTab = action.payload;
    },
  },
});

export const {
  setOnlineStatus,
  setSyncingStatus,
  showModal,
  hideModal,
  showToast,
  removeToast,
  showSuccess,
  showError,
  setLoading,
  setTheme,
  toggleHaptic,
  toggleSound,
  setNotificationsEnabled,
  setActiveTab,
} = uiSlice.actions;

export default uiSlice.reducer;

// Selectors
export const selectIsOnline = (state: { ui: UIState }) => state.ui.isOnline;
export const selectIsSyncing = (state: { ui: UIState }) => state.ui.isSyncing;
export const selectActiveModal = (state: { ui: UIState }) => state.ui.activeModal;
export const selectToasts = (state: { ui: UIState }) => state.ui.toasts;
export const selectIsLoading = (state: { ui: UIState }) => state.ui.isLoading;
export const selectLoadingMessage = (state: { ui: UIState }) => state.ui.loadingMessage;
export const selectTheme = (state: { ui: UIState }) => state.ui.theme;
export const selectHapticEnabled = (state: { ui: UIState }) => state.ui.hapticEnabled;
export const selectSoundEnabled = (state: { ui: UIState }) => state.ui.soundEnabled;
export const selectNotificationsEnabled = (state: { ui: UIState }) => state.ui.notificationsEnabled;
export const selectActiveTab = (state: { ui: UIState }) => state.ui.activeTab;