import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { store } from '@/store';
import { apiSlice } from '@/store/api/apiSlice';
import { setCredentials, logout as logoutAction } from '@/store/slices/authSlice';
import { database } from '@/services/database';
import { LoginRequest, AuthResponse } from '@/types/auth';

interface BiometricAuthResult {
  success: boolean;
  error?: string;
}

export class AuthService {
  private static instance: AuthService;
  
  constructor() {
    if (AuthService.instance) {
      return AuthService.instance;
    }
    AuthService.instance = this;
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async login(credentials: LoginRequest): Promise<AuthResponse> {
    try {
      // Initiate login mutation
      const loginMutation = store.dispatch(
        apiSlice.endpoints.login.initiate(credentials)
      );
      
      const result = await loginMutation;
      
      if ('error' in result) {
        throw new Error(this.formatError(result.error));
      }
      
      const { data } = result;
      
      // Store tokens securely
      await Promise.all([
        SecureStore.setItemAsync('auth_token', data.access_token),
        SecureStore.setItemAsync('refresh_token', data.refresh_token)
      ]);
      
      // Update Redux state
      store.dispatch(setCredentials({
        user: data.user,
        token: data.access_token,
        refreshToken: data.refresh_token
      }));
      
      return data;
    } catch (error) {
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      // Clear secure storage
      await Promise.all([
        SecureStore.deleteItemAsync('auth_token').catch(() => {}),
        SecureStore.deleteItemAsync('refresh_token').catch(() => {})
      ]);
    } catch (error) {
      // Continue with logout even if secure store fails
      console.error('Error clearing secure store:', error);
    } finally {
      // Clear Redux state
      store.dispatch(logoutAction());
      store.dispatch(apiSlice.util.resetApiState());
    }
  }

  async isBiometricAvailable(): Promise<boolean> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) return false;
      
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      return isEnrolled;
    } catch {
      return false;
    }
  }

  async authenticateWithBiometric(): Promise<boolean> {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access Vibestack',
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use Password'
      });
      
      if (!result.success) {
        return false;
      }
      
      // Retrieve stored tokens
      const [authToken, refreshToken] = await Promise.all([
        SecureStore.getItemAsync('auth_token'),
        SecureStore.getItemAsync('refresh_token')
      ]);
      
      if (!authToken || !refreshToken) {
        return false;
      }
      
      // Get user data with stored token
      const getUserMutation = store.dispatch(
        apiSlice.endpoints.getUser.initiate()
      );
      
      const userResult = await getUserMutation;
      
      if ('error' in userResult) {
        return false;
      }
      
      // Update Redux state
      store.dispatch(setCredentials({
        user: userResult.data,
        token: authToken,
        refreshToken: refreshToken
      }));
      
      return true;
    } catch {
      return false;
    }
  }

  async refreshAccessToken(): Promise<string> {
    const refreshToken = await SecureStore.getItemAsync('refresh_token');
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    
    try {
      const refreshMutation = store.dispatch(
        apiSlice.endpoints.refreshToken.initiate({ 
          refresh_token: refreshToken 
        })
      );
      
      const result = await refreshMutation;
      
      if ('error' in result) {
        // If refresh fails with 401, logout user
        if ('status' in result.error && result.error.status === 401) {
          await this.logout();
        }
        throw new Error(this.formatError(result.error));
      }
      
      const { data } = result;
      
      // Store new tokens
      await Promise.all([
        SecureStore.setItemAsync('auth_token', data.access_token),
        SecureStore.setItemAsync('refresh_token', data.refresh_token)
      ]);
      
      return data.access_token;
    } catch (error) {
      throw error;
    }
  }

  async isAuthenticated(): Promise<boolean> {
    const state = store.getState();
    const { user, token } = state.auth;
    
    if (!user || !token) {
      return false;
    }
    
    // Verify token in secure storage matches state
    const storedToken = await SecureStore.getItemAsync('auth_token');
    return storedToken === token;
  }

  async restoreSession(): Promise<boolean> {
    try {
      const [authToken, refreshToken] = await Promise.all([
        SecureStore.getItemAsync('auth_token'),
        SecureStore.getItemAsync('refresh_token')
      ]);
      
      if (!authToken || !refreshToken) {
        return false;
      }
      
      // Get user data
      const getUserMutation = store.dispatch(
        apiSlice.endpoints.getUser.initiate()
      );
      
      const result = await getUserMutation;
      
      if ('error' in result) {
        return false;
      }
      
      // Restore session in Redux
      store.dispatch(setCredentials({
        user: result.data,
        token: authToken,
        refreshToken: refreshToken
      }));
      
      return true;
    } catch {
      return false;
    }
  }

  private formatError(error: any): string {
    if (error?.data?.message) {
      return error.data.message;
    }
    
    if (error?.message) {
      return error.message;
    }
    
    if (error instanceof Error) {
      return error.message;
    }
    
    return 'An unexpected error occurred';
  }
}

// Export singleton instance
export const authService = AuthService.getInstance();