import { vi, expect } from 'vitest';
import type { MockedFunction } from 'vitest';
import { supabaseMock, type SupabaseMock } from '../mocks/supabase.mock';
import { resetIdCounter } from '../fixtures/test-data';
import type { User, Session, ApiResponse, ApiError } from '../../types';

// Custom matchers for API responses
export const expectApiSuccess = <T>(response: ApiResponse<T>) => {
  expect(response.success).toBe(true);
  expect(response.error).toBeUndefined();
  return response.data as T;
};

export const expectApiError = (response: ApiResponse<any>, expectedError?: Partial<ApiError>) => {
  expect(response.success).toBe(false);
  expect(response.data).toBeUndefined();

  if (expectedError) {
    if (expectedError.code) {
      expect(response.error?.code).toBe(expectedError.code);
    }
    if (expectedError.message) {
      expect(response.error?.message).toContain(expectedError.message);
    }
  }

  return response.error;
};

// Helper to wait for async operations
export const waitFor = async (
  condition: () => boolean | Promise<boolean>,
  options: { timeout?: number; interval?: number } = {},
): Promise<void> => {
  const { timeout = 5000, interval = 50 } = options;
  const startTime = Date.now();

  while (!(await condition())) {
    if (Date.now() - startTime > timeout) {
      throw new Error('Timeout waiting for condition');
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
};

// Mock authentication state
export const mockAuthState = (
  supabase: SupabaseMock,
  user: User | null,
  session: Session | null = null,
) => {
  supabase.setAuthUser(user);
  supabase.setAuthSession(session);

  // Also mock the auth state change listener
  const mockCallback = vi.fn();
  supabase.auth.onAuthStateChange.mockImplementation((callback) => {
    mockCallback.mockImplementation(callback);
    // Immediately call with current state
    callback('SIGNED_IN', session);

    return {
      data: { subscription: { unsubscribe: vi.fn() } },
      error: null,
    };
  });

  return mockCallback;
};

// Mock database queries
export const mockDatabaseQuery = <T>(
  tableMock: any,
  method: 'select' | 'insert' | 'update' | 'delete',
  data: T[],
  error: any = null,
) => {
  const queryBuilder = tableMock[method]();
  queryBuilder.setMockData(data);

  if (error) {
    queryBuilder.setMockError(error);
  }

  return queryBuilder;
};

// Test transaction helper
export const withTransaction = async (fn: () => Promise<void>, rollback: boolean = true) => {
  const begin = vi.fn();
  const commit = vi.fn();
  const rollbackFn = vi.fn();

  try {
    begin();
    await fn();

    if (!rollback) {
      commit();
    } else {
      rollbackFn();
    }
  } catch (error) {
    rollbackFn();
    throw error;
  }

  return { begin, commit, rollback: rollbackFn };
};

// Mock timers helper
export const withMockTimers = async (fn: () => Promise<void>) => {
  vi.useFakeTimers();

  try {
    const promise = fn();
    await vi.runAllTimersAsync();
    await promise;
  } finally {
    vi.useRealTimers();
  }
};

// Request context builder
export interface MockRequestContext {
  user?: User | null;
  session?: Session | null;
  headers?: Record<string, string>;
  params?: Record<string, string>;
  query?: Record<string, string>;
  body?: any;
}

export const createMockRequest = (context: MockRequestContext = {}) => {
  const { user = null, session = null, headers = {}, params = {}, query = {}, body = {} } = context;

  return {
    user,
    session,
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
    params,
    query,
    body,
    get: (key: string) => headers[key.toLowerCase()],
  };
};

// Response mock builder
export const createMockResponse = () => {
  const response = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    cookie: vi.fn().mockReturnThis(),
    clearCookie: vi.fn().mockReturnThis(),
    redirect: vi.fn().mockReturnThis(),
    _status: 200,
    _json: null as any,
    _headers: {} as Record<string, string>,
  };

  response.status.mockImplementation((code: number) => {
    response._status = code;
    return response;
  });

  response.json.mockImplementation((data: any) => {
    response._json = data;
    return response;
  });

  response.set.mockImplementation((key: string, value: string) => {
    response._headers[key] = value;
    return response;
  });

  return response;
};

// Supabase error builder
export const createSupabaseError = (
  message: string,
  code: string = 'PGRST001',
  status: number = 400,
) => ({
  message,
  code,
  details: null,
  hint: null,
  status,
});

// Test setup and teardown
export const setupTest = () => {
  // Reset all mocks
  vi.clearAllMocks();

  // Reset ID counter
  resetIdCounter();

  // Reset Supabase mock
  supabaseMock.reset();

  // Set up default console mocks
  const consoleMocks = {
    log: vi.spyOn(console, 'log').mockImplementation(() => {}),
    error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
  };

  return {
    supabase: supabaseMock,
    console: consoleMocks,
  };
};

export const teardownTest = () => {
  vi.restoreAllMocks();
};

// Performance testing helpers
export const measurePerformance = async (
  name: string,
  fn: () => Promise<void>,
  threshold?: number,
) => {
  const start = performance.now();
  await fn();
  const duration = performance.now() - start;

  console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);

  if (threshold && duration > threshold) {
    throw new Error(`Performance threshold exceeded: ${duration.toFixed(2)}ms > ${threshold}ms`);
  }

  return duration;
};

// Rate limiting test helper
export const testRateLimit = async (
  endpoint: () => Promise<any>,
  limit: number,
  window: number = 60000, // 1 minute default
) => {
  const results = [];

  // Make requests up to the limit
  for (let i = 0; i < limit; i++) {
    results.push(await endpoint());
  }

  // All should succeed
  expect(results.every((r) => r.success)).toBe(true);

  // Next request should fail
  const rateLimited = await endpoint();
  expectApiError(rateLimited, { code: 'RATE_LIMIT_EXCEEDED' });

  // Wait for window to reset
  await new Promise((resolve) => setTimeout(resolve, window));

  // Should work again
  const afterReset = await endpoint();
  expectApiSuccess(afterReset);
};

// Batch operation helpers
export const batchTest = async <T>(
  items: T[],
  operation: (item: T) => Promise<void>,
  options: { concurrency?: number } = {},
) => {
  const { concurrency = 5 } = options;
  const results = [];

  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(batch.map((item) => operation(item)));
    results.push(...batchResults);
  }

  const failures = results.filter((r) => r.status === 'rejected');
  if (failures.length > 0) {
    throw new Error(`Batch operation failed: ${failures.length} / ${results.length} failed`);
  }
};

// Mock external services
export const mockExternalServices = () => {
  const services = {
    email: {
      send: vi.fn().mockResolvedValue({ success: true }),
      sendBatch: vi.fn().mockResolvedValue({ success: true }),
    },
    push: {
      send: vi.fn().mockResolvedValue({ success: true }),
      sendBatch: vi.fn().mockResolvedValue({ success: true }),
    },
    analytics: {
      track: vi.fn().mockResolvedValue({ success: true }),
      identify: vi.fn().mockResolvedValue({ success: true }),
    },
    storage: {
      upload: vi.fn().mockResolvedValue({ url: 'https://example.com/file' }),
      delete: vi.fn().mockResolvedValue({ success: true }),
    },
  };

  return services;
};

// Assert helpers for common patterns
export const assertValidUUID = (value: string) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  expect(value).toMatch(uuidRegex);
};

export const assertValidEmail = (value: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  expect(value).toMatch(emailRegex);
};

export const assertValidDate = (value: string) => {
  const date = new Date(value);
  expect(date.toISOString()).toBe(value);
};

export const assertPagination = (
  response: any,
  expectedProps: {
    page?: number;
    per_page?: number;
    total?: number;
  },
) => {
  expect(response).toHaveProperty('items');
  expect(Array.isArray(response.items)).toBe(true);

  if (expectedProps.page !== undefined) {
    expect(response.page).toBe(expectedProps.page);
  }

  if (expectedProps.per_page !== undefined) {
    expect(response.per_page).toBe(expectedProps.per_page);
  }

  if (expectedProps.total !== undefined) {
    expect(response.total).toBe(expectedProps.total);
  }

  expect(response.has_more).toBe(typeof response.has_more === 'boolean');
};

// Export all helpers
export const testHelpers = {
  expectApiSuccess,
  expectApiError,
  waitFor,
  mockAuthState,
  mockDatabaseQuery,
  withTransaction,
  withMockTimers,
  createMockRequest,
  createMockResponse,
  createSupabaseError,
  setupTest,
  teardownTest,
  measurePerformance,
  testRateLimit,
  batchTest,
  mockExternalServices,
  assertValidUUID,
  assertValidEmail,
  assertValidDate,
  assertPagination,
};
