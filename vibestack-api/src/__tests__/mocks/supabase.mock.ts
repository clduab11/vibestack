import { vi } from 'vitest';
import type {
  User,
  Session,
  Profile,
  Habit,
  HabitProgress,
  Friend,
  Challenge,
  ChallengeParticipant,
  UserAchievement,
  Avatar,
  Subscription,
  Notification,
} from '../../types';

// Mock Supabase Auth
export const mockSupabaseAuth = {
  getUser: vi.fn(),
  getSession: vi.fn(),
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  signInWithOAuth: vi.fn(),
  signOut: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
  onAuthStateChange: vi.fn(),
  setSession: vi.fn(),
  refreshSession: vi.fn(),
};

// Mock Supabase Storage
export const mockSupabaseStorage = {
  from: vi.fn((bucket: string) => ({
    upload: vi.fn(),
    download: vi.fn(),
    remove: vi.fn(),
    list: vi.fn(),
    getPublicUrl: vi.fn(),
    createSignedUrl: vi.fn(),
    move: vi.fn(),
    copy: vi.fn(),
  })),
};

// Mock query builder
export class MockQueryBuilder<T> {
  private _data: T[] = [];
  private _error: any = null;
  private _count: number | null = null;
  private _filters: any[] = [];
  private _orderBy: { column: string; ascending: boolean }[] = [];
  private _limit: number | null = null;
  private _offset: number | null = null;
  private _single: boolean = false;

  constructor(initialData: T[] = []) {
    this._data = [...initialData];
  }

  select(columns?: string) {
    return this;
  }

  insert(data: Partial<T> | Partial<T>[]) {
    const items = Array.isArray(data) ? data : [data];
    this._data.push(...(items as T[]));
    return this;
  }

  update(data: Partial<T>) {
    // In a real implementation, this would update matching records
    return this;
  }

  upsert(data: Partial<T> | Partial<T>[]) {
    const items = Array.isArray(data) ? data : [data];
    // In a real implementation, this would insert or update
    return this;
  }

  delete() {
    // In a real implementation, this would delete matching records
    return this;
  }

  eq(column: string, value: any) {
    this._filters.push({ type: 'eq', column, value });
    return this;
  }

  neq(column: string, value: any) {
    this._filters.push({ type: 'neq', column, value });
    return this;
  }

  gt(column: string, value: any) {
    this._filters.push({ type: 'gt', column, value });
    return this;
  }

  gte(column: string, value: any) {
    this._filters.push({ type: 'gte', column, value });
    return this;
  }

  lt(column: string, value: any) {
    this._filters.push({ type: 'lt', column, value });
    return this;
  }

  lte(column: string, value: any) {
    this._filters.push({ type: 'lte', column, value });
    return this;
  }

  like(column: string, pattern: string) {
    this._filters.push({ type: 'like', column, pattern });
    return this;
  }

  ilike(column: string, pattern: string) {
    this._filters.push({ type: 'ilike', column, pattern });
    return this;
  }

  in(column: string, values: any[]) {
    this._filters.push({ type: 'in', column, values });
    return this;
  }

  contains(column: string, value: any) {
    this._filters.push({ type: 'contains', column, value });
    return this;
  }

  containedBy(column: string, value: any) {
    this._filters.push({ type: 'containedBy', column, value });
    return this;
  }

  is(column: string, value: any) {
    this._filters.push({ type: 'is', column, value });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this._orderBy.push({ column, ascending: options?.ascending ?? true });
    return this;
  }

  limit(count: number) {
    this._limit = count;
    return this;
  }

  range(from: number, to: number) {
    this._offset = from;
    this._limit = to - from + 1;
    return this;
  }

  single() {
    this._single = true;
    return this;
  }

  maybeSingle() {
    this._single = true;
    return this;
  }

  count(options?: { count?: 'exact' | 'planned' | 'estimated' }) {
    this._count = this._data.length;
    return this;
  }

  // Execute the query
  async then(resolve: (value: any) => void, reject?: (reason?: any) => void) {
    try {
      let result = [...this._data];

      // Apply filters
      for (const filter of this._filters) {
        result = result.filter((item) => {
          const value = (item as any)[filter.column];
          switch (filter.type) {
            case 'eq':
              return value === filter.value;
            case 'neq':
              return value !== filter.value;
            case 'gt':
              return value > filter.value;
            case 'gte':
              return value >= filter.value;
            case 'lt':
              return value < filter.value;
            case 'lte':
              return value <= filter.value;
            case 'like':
            case 'ilike':
              return String(value).includes(filter.pattern);
            case 'in':
              return filter.values.includes(value);
            case 'is':
              return value === filter.value;
            default:
              return true;
          }
        });
      }

      // Apply ordering
      if (this._orderBy.length > 0) {
        result.sort((a, b) => {
          for (const order of this._orderBy) {
            const aVal = (a as any)[order.column];
            const bVal = (b as any)[order.column];
            if (aVal !== bVal) {
              const comparison = aVal < bVal ? -1 : 1;
              return order.ascending ? comparison : -comparison;
            }
          }
          return 0;
        });
      }

      // Apply limit and offset
      if (this._offset !== null || this._limit !== null) {
        const start = this._offset || 0;
        const end = this._limit ? start + this._limit : undefined;
        result = result.slice(start, end);
      }

      // Return single or array
      const data = this._single ? result[0] || null : result;

      const response = {
        data,
        error: this._error,
        count: this._count,
        status: this._error ? 400 : 200,
        statusText: this._error ? 'Bad Request' : 'OK',
      };

      resolve(response);
    } catch (error) {
      if (reject) {
        reject(error);
      }
    }
  }

  // Allow setting mock data
  setMockData(data: T[]) {
    this._data = [...data];
    return this;
  }

  // Allow setting mock error
  setMockError(error: any) {
    this._error = error;
    return this;
  }
}

// Create table mocks
export const createTableMock = <T>(initialData: T[] = []) => {
  const data = [...initialData];

  return {
    select: vi.fn(() => new MockQueryBuilder(data)),
    insert: vi.fn((items: T | T[]) => new MockQueryBuilder(data).insert(items)),
    update: vi.fn((item: Partial<T>) => new MockQueryBuilder(data).update(item)),
    upsert: vi.fn((items: T | T[]) => new MockQueryBuilder(data).upsert(items)),
    delete: vi.fn(() => new MockQueryBuilder(data).delete()),

    // Helper to set mock data
    setMockData: (newData: T[]) => {
      data.length = 0;
      data.push(...newData);
    },
  };
};

// Mock Supabase client
export const createSupabaseMock = () => {
  const tables = {
    profiles: createTableMock<Profile>(),
    habits: createTableMock<Habit>(),
    habit_progress: createTableMock<HabitProgress>(),
    friends: createTableMock<Friend>(),
    challenges: createTableMock<Challenge>(),
    challenge_participants: createTableMock<ChallengeParticipant>(),
    user_achievements: createTableMock<UserAchievement>(),
    avatars: createTableMock<Avatar>(),
    subscriptions: createTableMock<Subscription>(),
    notifications: createTableMock<Notification>(),
  };

  const from = vi.fn((table: keyof typeof tables) => {
    return tables[table] || createTableMock();
  });

  const rpc = vi.fn();

  const channel = vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
    unsubscribe: vi.fn().mockReturnThis(),
  }));

  return {
    auth: mockSupabaseAuth,
    storage: mockSupabaseStorage,
    from,
    rpc,
    channel,
    tables,

    // Helper methods for testing
    setAuthUser: (user: User | null) => {
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user },
        error: null,
      });
    },

    setAuthSession: (session: Session | null) => {
      mockSupabaseAuth.getSession.mockResolvedValue({
        data: { session },
        error: null,
      });
    },

    setAuthError: (error: any) => {
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: null },
        error,
      });
      mockSupabaseAuth.getSession.mockResolvedValue({
        data: { session: null },
        error,
      });
    },

    reset: () => {
      vi.clearAllMocks();
      Object.values(tables).forEach((table) => {
        table.setMockData([]);
      });
    },
  };
};

// Default mock instance
export const supabaseMock = createSupabaseMock();

// Mock Supabase createClient
export const createClient = vi.fn(() => supabaseMock);

// Export types for use in tests
export type SupabaseMock = ReturnType<typeof createSupabaseMock>;
export type TableMock<T> = ReturnType<typeof createTableMock<T>>;
