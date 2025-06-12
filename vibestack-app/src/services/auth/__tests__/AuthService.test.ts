import { AuthService } from '../AuthService';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { setCredentials, logout as logoutAction } from '@/store/slices/authSlice';

// Mock modules before they're imported
jest.mock('expo-secure-store');
jest.mock('expo-local-authentication');
jest.mock('@/services/database', () => ({
  database: {}
}));

// Mock store and api slice
const mockDispatch = jest.fn();
const mockGetState = jest.fn();

jest.mock('@/store', () => ({
  store: {
    dispatch: jest.fn(),
    getState: jest.fn()
  }
}));

jest.mock('@/store/api/apiSlice', () => ({
  apiSlice: {
    endpoints: {
      login: { initiate: jest.fn() },
      getUser: { initiate: jest.fn() },
      refreshToken: { initiate: jest.fn() }
    },
    util: {
      resetApiState: jest.fn().mockReturnValue({ type: 'api/resetApiState' })
    }
  }
}));

jest.mock('@/store/slices/authSlice', () => ({
  setCredentials: jest.fn((payload) => ({ type: 'auth/setCredentials', payload })),
  logout: jest.fn(() => ({ type: 'auth/logout' }))
}));

const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;
const mockLocalAuth = LocalAuthentication as jest.Mocked<typeof LocalAuthentication>;

// Import after mocks are set up
import { store } from '@/store';
import { apiSlice } from '@/store/api/apiSlice';

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    authService = new AuthService();
    
    // Setup default mocks
    (store.dispatch as jest.Mock) = mockDispatch;
    (store.getState as jest.Mock) = mockGetState;
    mockGetState.mockReturnValue({
      auth: { user: null, token: null, refreshToken: null }
    });
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const mockCredentials = {
        email: 'test@example.com',
        password: 'password123'
      };
      
      const mockResponse = {
        user: {
          id: '123',
          email: 'test@example.com',
          name: 'Test User'
        },
        access_token: 'access-token',
        refresh_token: 'refresh-token'
      };

      // Mock API response
      const mockLoginMutation = jest.fn().mockResolvedValue({
        data: mockResponse
      });
      
      (apiSlice.endpoints.login.initiate as jest.Mock).mockReturnValue(mockLoginMutation);
      mockDispatch.mockReturnValue(mockLoginMutation());

      const result = await authService.login(mockCredentials);

      expect(result).toEqual(mockResponse);
      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        'auth_token',
        mockResponse.access_token
      );
      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        'refresh_token',
        mockResponse.refresh_token
      );
      expect(mockDispatch).toHaveBeenCalledWith(
        setCredentials({
          user: mockResponse.user,
          token: mockResponse.access_token,
          refreshToken: mockResponse.refresh_token
        })
      );
    });

    it('should throw error on invalid credentials', async () => {
      const mockCredentials = {
        email: 'test@example.com',
        password: 'wrong-password'
      };

      const mockLoginMutation = jest.fn().mockRejectedValue({
        data: { message: 'Invalid credentials' }
      });
      
      (apiSlice.endpoints.login.initiate as jest.Mock).mockReturnValue(mockLoginMutation);
      mockDispatch.mockReturnValue(mockLoginMutation());

      await expect(authService.login(mockCredentials)).rejects.toThrow(
        'Invalid credentials'
      );
      
      expect(mockSecureStore.setItemAsync).not.toHaveBeenCalled();
      expect(mockDispatch).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: 'auth/setCredentials' })
      );
    });

    it('should handle network errors gracefully', async () => {
      const mockCredentials = {
        email: 'test@example.com',
        password: 'password123'
      };

      const mockLoginMutation = jest.fn().mockRejectedValue(
        new Error('Network error')
      );
      
      (apiSlice.endpoints.login.initiate as jest.Mock).mockReturnValue(mockLoginMutation);
      mockDispatch.mockReturnValue(mockLoginMutation());

      await expect(authService.login(mockCredentials)).rejects.toThrow(
        'Network error'
      );
    });
  });

  describe('logout', () => {
    it('should successfully logout and clear stored data', async () => {
      mockGetState.mockReturnValue({
        auth: {
          user: { id: '123' },
          token: 'token',
          refreshToken: 'refresh'
        }
      });

      await authService.logout();

      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('auth_token');
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('refresh_token');
      expect(mockDispatch).toHaveBeenCalledWith(logoutAction());
      expect(mockDispatch).toHaveBeenCalledWith(
        apiSlice.util.resetApiState()
      );
    });

    it('should logout even if secure store operations fail', async () => {
      mockSecureStore.deleteItemAsync.mockRejectedValue(
        new Error('Secure store error')
      );

      await authService.logout();

      expect(mockDispatch).toHaveBeenCalledWith(logoutAction());
      expect(mockDispatch).toHaveBeenCalledWith(
        apiSlice.util.resetApiState()
      );
    });
  });

  describe('biometric authentication', () => {
    it('should check if biometric authentication is available', async () => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(true);
      mockLocalAuth.isEnrolledAsync.mockResolvedValue(true);

      const result = await authService.isBiometricAvailable();

      expect(result).toBe(true);
      expect(mockLocalAuth.hasHardwareAsync).toHaveBeenCalled();
      expect(mockLocalAuth.isEnrolledAsync).toHaveBeenCalled();
    });

    it('should return false if no biometric hardware', async () => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(false);

      const result = await authService.isBiometricAvailable();

      expect(result).toBe(false);
      expect(mockLocalAuth.isEnrolledAsync).not.toHaveBeenCalled();
    });

    it('should return false if not enrolled', async () => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(true);
      mockLocalAuth.isEnrolledAsync.mockResolvedValue(false);

      const result = await authService.isBiometricAvailable();

      expect(result).toBe(false);
    });

    it('should authenticate with biometrics successfully', async () => {
      mockLocalAuth.authenticateAsync.mockResolvedValue({
        success: true
      });
      mockSecureStore.getItemAsync.mockImplementation((key) => {
        if (key === 'auth_token') return Promise.resolve('stored-token');
        if (key === 'refresh_token') return Promise.resolve('stored-refresh');
        return Promise.resolve(null);
      });

      const mockUserResponse = {
        id: '123',
        email: 'test@example.com',
        name: 'Test User'
      };

      const mockGetUserMutation = jest.fn().mockResolvedValue({
        data: mockUserResponse
      });
      
      (apiSlice.endpoints.getUser.initiate as jest.Mock).mockReturnValue(mockGetUserMutation);
      mockDispatch.mockReturnValue(mockGetUserMutation());

      const result = await authService.authenticateWithBiometric();

      expect(result).toBe(true);
      expect(mockLocalAuth.authenticateAsync).toHaveBeenCalledWith({
        promptMessage: 'Authenticate to access Vibestack',
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use Password'
      });
      expect(mockDispatch).toHaveBeenCalledWith(
        setCredentials({
          user: mockUserResponse,
          token: 'stored-token',
          refreshToken: 'stored-refresh'
        })
      );
    });

    it('should fail biometric authentication if user cancels', async () => {
      mockLocalAuth.authenticateAsync.mockResolvedValue({
        success: false,
        error: 'UserCancel'
      });

      const result = await authService.authenticateWithBiometric();

      expect(result).toBe(false);
      expect(mockSecureStore.getItemAsync).not.toHaveBeenCalled();
    });

    it('should fail if no stored tokens after biometric success', async () => {
      mockLocalAuth.authenticateAsync.mockResolvedValue({
        success: true
      });
      mockSecureStore.getItemAsync.mockResolvedValue(null);

      const result = await authService.authenticateWithBiometric();

      expect(result).toBe(false);
      expect(mockDispatch).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: 'auth/setCredentials' })
      );
    });
  });

  describe('token management', () => {
    it('should refresh access token successfully', async () => {
      mockSecureStore.getItemAsync.mockResolvedValue('old-refresh-token');
      
      const mockRefreshResponse = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token'
      };

      const mockRefreshMutation = jest.fn().mockResolvedValue({
        data: mockRefreshResponse
      });
      
      (apiSlice.endpoints.refreshToken.initiate as jest.Mock).mockReturnValue(mockRefreshMutation);
      mockDispatch.mockReturnValue(mockRefreshMutation());

      const result = await authService.refreshAccessToken();

      expect(result).toBe('new-access-token');
      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        'auth_token',
        'new-access-token'
      );
      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        'refresh_token',
        'new-refresh-token'
      );
    });

    it('should throw error if no refresh token available', async () => {
      mockSecureStore.getItemAsync.mockResolvedValue(null);

      await expect(authService.refreshAccessToken()).rejects.toThrow(
        'No refresh token available'
      );
    });

    it('should logout if refresh fails', async () => {
      mockSecureStore.getItemAsync.mockResolvedValue('old-refresh-token');
      
      const mockRefreshMutation = jest.fn().mockRejectedValue({
        status: 401
      });
      
      (apiSlice.endpoints.refreshToken.initiate as jest.Mock).mockReturnValue(mockRefreshMutation);
      mockDispatch.mockReturnValue(mockRefreshMutation());

      await expect(authService.refreshAccessToken()).rejects.toThrow();
      
      expect(mockDispatch).toHaveBeenCalledWith(logoutAction());
    });
  });

  describe('session management', () => {
    it('should check if user is authenticated', async () => {
      mockGetState.mockReturnValue({
        auth: {
          user: { id: '123' },
          token: 'valid-token'
        }
      });
      mockSecureStore.getItemAsync.mockResolvedValue('valid-token');

      const result = await authService.isAuthenticated();

      expect(result).toBe(true);
    });

    it('should return false if no user in state', async () => {
      mockGetState.mockReturnValue({
        auth: {
          user: null,
          token: null
        }
      });

      const result = await authService.isAuthenticated();

      expect(result).toBe(false);
    });

    it('should return false if tokens mismatch', async () => {
      mockGetState.mockReturnValue({
        auth: {
          user: { id: '123' },
          token: 'state-token'
        }
      });
      mockSecureStore.getItemAsync.mockResolvedValue('different-token');

      const result = await authService.isAuthenticated();

      expect(result).toBe(false);
    });

    it('should restore session on app launch', async () => {
      mockSecureStore.getItemAsync.mockImplementation((key) => {
        if (key === 'auth_token') return Promise.resolve('stored-token');
        if (key === 'refresh_token') return Promise.resolve('stored-refresh');
        return Promise.resolve(null);
      });

      const mockUserResponse = {
        id: '123',
        email: 'test@example.com',
        name: 'Test User'
      };

      const mockGetUserMutation = jest.fn().mockResolvedValue({
        data: mockUserResponse
      });
      
      (apiSlice.endpoints.getUser.initiate as jest.Mock).mockReturnValue(mockGetUserMutation);
      mockDispatch.mockReturnValue(mockGetUserMutation());

      const result = await authService.restoreSession();

      expect(result).toBe(true);
      expect(mockDispatch).toHaveBeenCalledWith(
        setCredentials({
          user: mockUserResponse,
          token: 'stored-token',
          refreshToken: 'stored-refresh'
        })
      );
    });

    it('should return false if no stored session', async () => {
      mockSecureStore.getItemAsync.mockResolvedValue(null);

      const result = await authService.restoreSession();

      expect(result).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle and format API errors', () => {
      const apiError = {
        data: {
          message: 'Invalid email format'
        }
      };

      const result = authService['formatError'](apiError);

      expect(result).toBe('Invalid email format');
    });

    it('should handle network errors', () => {
      const networkError = new Error('Network request failed');

      const result = authService['formatError'](networkError);

      expect(result).toBe('Network request failed');
    });

    it('should provide default error message', () => {
      const unknownError = {};

      const result = authService['formatError'](unknownError);

      expect(result).toBe('An unexpected error occurred');
    });
  });
});