import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { apiSlice } from '../api/apiSlice';
import * as SecureStore from 'expo-secure-store';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  biometricEnabled: boolean;
}

interface User {
  id: string;
  email: string;
  profile: {
    name: string;
    avatar: string;
    bio?: string;
    timezone: string;
    language: string;
  };
  subscription: {
    plan: 'free' | 'premium' | 'pro';
    expiresAt?: number;
  };
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  biometricEnabled: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<{ user: User; accessToken: string; refreshToken: string }>) => {
      state.user = action.payload.user;
      state.isAuthenticated = true;
      state.isLoading = false;
    },
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.biometricEnabled = false;
    },
    setBiometricEnabled: (state, action: PayloadAction<boolean>) => {
      state.biometricEnabled = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Handle login success
    builder.addMatcher(
      apiSlice.endpoints.login.matchFulfilled,
      async (state, { payload }) => {
        state.user = payload.user;
        state.isAuthenticated = true;
        state.isLoading = false;
        
        // Store tokens securely
        await SecureStore.setItemAsync('accessToken', payload.accessToken);
        await SecureStore.setItemAsync('refreshToken', payload.refreshToken);
        await SecureStore.setItemAsync('tokenExpiry', payload.expiresAt.toString());
      }
    );
    
    // Handle logout
    builder.addMatcher(
      apiSlice.endpoints.logout.matchFulfilled,
      async (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.biometricEnabled = false;
        
        // Clear stored tokens
        await SecureStore.deleteItemAsync('accessToken');
        await SecureStore.deleteItemAsync('refreshToken');
        await SecureStore.deleteItemAsync('tokenExpiry');
        await SecureStore.deleteItemAsync('biometricToken');
      }
    );
    
    // Handle get current user
    builder.addMatcher(
      apiSlice.endpoints.getCurrentUser.matchFulfilled,
      (state, { payload }) => {
        state.user = payload;
        state.isAuthenticated = true;
        state.isLoading = false;
      }
    );
    
    // Handle get current user error
    builder.addMatcher(
      apiSlice.endpoints.getCurrentUser.matchRejected,
      (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.isLoading = false;
      }
    );
  },
});

export const { setCredentials, logout, setBiometricEnabled, setLoading } = authSlice.actions;
export default authSlice.reducer;

// Selectors
export const selectCurrentUser = (state: { auth: AuthState }) => state.auth.user;
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated;
export const selectIsAuthLoading = (state: { auth: AuthState }) => state.auth.isLoading;
export const selectBiometricEnabled = (state: { auth: AuthState }) => state.auth.biometricEnabled;