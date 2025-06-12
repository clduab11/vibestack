# VibeStack™ Detailed Architecture Document
## Phase 3: Component, Data, and Infrastructure Design

### Executive Summary
This document provides the detailed technical architecture for the VibeStack™ mobile application. It defines component specifications, interface contracts, data schemas, deployment architecture, and security implementation details required for building a production-ready, offline-first social habit platform.

---

## 1. COMPONENT ARCHITECTURE

### 1.1 Component Specifications

#### Core Components Structure
```typescript
// Component Interface Definitions
interface BaseComponent {
  testID?: string;
  accessible?: boolean;
  accessibilityLabel?: string;
  onLayout?: (event: LayoutChangeEvent) => void;
}

// Atom Components
interface ButtonProps extends BaseComponent {
  variant: 'primary' | 'secondary' | 'ghost' | 'danger';
  size: 'sm' | 'md' | 'lg';
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName;
  haptic?: boolean;
}

interface AvatarProps extends BaseComponent {
  size: number;
  source: ImageSourcePropType;
  mood?: 'happy' | 'neutral' | 'thinking' | 'celebrating';
  evolutionLevel: number;
  animated?: boolean;
}

// Molecule Components
interface HabitCardProps extends BaseComponent {
  habit: Habit;
  onPress: () => void;
  onComplete: () => void;
  onLongPress?: () => void;
  showProgress?: boolean;
  disabled?: boolean;
}

interface ProgressRingProps extends BaseComponent {
  progress: number; // 0-1
  size: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  animated?: boolean;
  duration?: number;
}

// Organism Components
interface AvatarConversationProps extends BaseComponent {
  avatar: Avatar;
  messages: Message[];
  onSendMessage: (text: string) => void;
  isTyping?: boolean;
  suggestedResponses?: string[];
}

interface LeaderboardProps extends BaseComponent {
  entries: LeaderboardEntry[];
  currentUserId: string;
  onUserPress?: (userId: string) => void;
  refreshing?: boolean;
  onRefresh?: () => void;
  timeFrame: 'daily' | 'weekly' | 'monthly' | 'all-time';
}
```

### 1.2 Dependency Injection Architecture
```typescript
// Service Container Pattern
class ServiceContainer {
  private static instance: ServiceContainer;
  private services: Map<string, any> = new Map();
  
  static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer();
    }
    return ServiceContainer.instance;
  }
  
  register<T>(name: string, factory: () => T): void {
    this.services.set(name, factory);
  }
  
  resolve<T>(name: string): T {
    const factory = this.services.get(name);
    if (!factory) {
      throw new Error(`Service ${name} not registered`);
    }
    return factory();
  }
}

// Service Registration
const container = ServiceContainer.getInstance();

container.register('AuthService', () => new AuthService({
  apiClient: container.resolve('ApiClient'),
  storage: container.resolve('SecureStorage'),
  analytics: container.resolve('Analytics')
}));

container.register('HabitService', () => new HabitService({
  api: container.resolve('ApiClient'),
  database: container.resolve('Database'),
  syncEngine: container.resolve('SyncEngine'),
  notificationService: container.resolve('NotificationService')
}));

container.register('AIService', () => new AIService({
  providers: {
    openai: container.resolve('OpenAIProvider'),
    anthropic: container.resolve('AnthropicProvider'),
    gemini: container.resolve('GeminiProvider')
  },
  cache: container.resolve('AIResponseCache'),
  fallbackStrategy: container.resolve('AIFallbackStrategy')
}));
```

### 1.3 Configuration Management
```typescript
// Environment-based configuration
interface AppConfig {
  api: {
    baseUrl: string;
    timeout: number;
    retryAttempts: number;
  };
  features: {
    offlineMode: boolean;
    aiCompanions: boolean;
    socialFeatures: boolean;
    debugMode: boolean;
  };
  ai: {
    providers: {
      openai: { apiKey: string; model: string };
      anthropic: { apiKey: string; model: string };
      gemini: { apiKey: string; model: string };
    };
    cacheTimeout: number;
    maxRetries: number;
  };
  analytics: {
    mixpanelToken: string;
    sentryDsn: string;
    enableCrashReporting: boolean;
  };
}

class ConfigManager {
  private config: AppConfig;
  
  constructor() {
    this.config = this.loadConfig();
  }
  
  private loadConfig(): AppConfig {
    const env = process.env.NODE_ENV || 'development';
    
    const baseConfig: AppConfig = {
      api: {
        baseUrl: process.env.EXPO_PUBLIC_API_URL!,
        timeout: 30000,
        retryAttempts: 3
      },
      features: {
        offlineMode: true,
        aiCompanions: true,
        socialFeatures: true,
        debugMode: __DEV__
      },
      ai: {
        providers: {
          openai: {
            apiKey: process.env.EXPO_PUBLIC_OPENAI_KEY!,
            model: 'gpt-4-turbo-preview'
          },
          anthropic: {
            apiKey: process.env.EXPO_PUBLIC_ANTHROPIC_KEY!,
            model: 'claude-3-opus-20240229'
          },
          gemini: {
            apiKey: process.env.EXPO_PUBLIC_GEMINI_KEY!,
            model: 'gemini-pro'
          }
        },
        cacheTimeout: 3600000, // 1 hour
        maxRetries: 2
      },
      analytics: {
        mixpanelToken: process.env.EXPO_PUBLIC_MIXPANEL_TOKEN!,
        sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN!,
        enableCrashReporting: env === 'production'
      }
    };
    
    // Environment-specific overrides
    if (env === 'development') {
      baseConfig.api.baseUrl = 'http://localhost:3000';
      baseConfig.analytics.enableCrashReporting = false;
    }
    
    return baseConfig;
  }
  
  get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.config[key];
  }
  
  isFeatureEnabled(feature: keyof AppConfig['features']): boolean {
    return this.config.features[feature];
  }
}
```

---

## 2. INTERFACE CONTRACTS

### 2.1 Service Interface Definitions
```typescript
// Core Service Interfaces
interface IAuthService {
  login(credentials: LoginCredentials): Promise<AuthResult>;
  logout(): Promise<void>;
  refreshToken(): Promise<string>;
  getCurrentUser(): User | null;
  isAuthenticated(): boolean;
  onAuthStateChange(callback: (user: User | null) => void): () => void;
}

interface IHabitService {
  createHabit(data: CreateHabitDTO): Promise<Habit>;
  updateHabit(id: string, data: UpdateHabitDTO): Promise<Habit>;
  deleteHabit(id: string): Promise<void>;
  getHabits(filters?: HabitFilters): Promise<Habit[]>;
  getHabitById(id: string): Promise<Habit>;
  completeHabit(id: string): Promise<HabitCompletion>;
  getHabitStats(id: string): Promise<HabitStats>;
  syncHabits(): Promise<SyncResult>;
}

interface ISyncEngine {
  queueOperation(operation: SyncOperation): void;
  processQueue(): Promise<void>;
  getQueueStatus(): QueueStatus;
  clearQueue(): Promise<void>;
  onSyncStateChange(callback: (state: SyncState) => void): () => void;
  resolveConflict(local: any, remote: any): any;
}

interface IAIService {
  chat(personality: PersonalityType, message: string): Promise<AIResponse>;
  generateMotivation(context: UserContext): Promise<string>;
  analyzeMode(interactions: Interaction[]): Promise<UserMood>;
  getPersonalizedTips(habits: Habit[]): Promise<Tip[]>;
  switchPersonality(type: PersonalityType): void;
}

interface INotificationService {
  scheduleHabitReminder(habit: Habit): Promise<void>;
  cancelHabitReminder(habitId: string): Promise<void>;
  sendLocalNotification(notification: LocalNotification): Promise<void>;
  requestPermissions(): Promise<NotificationPermissions>;
  getOptimalTiming(userId: string): Promise<TimeWindow[]>;
}
```

### 2.2 API Client Interface
```typescript
// RESTful API Client Interface
interface IApiClient {
  // Base methods
  get<T>(path: string, config?: RequestConfig): Promise<ApiResponse<T>>;
  post<T>(path: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>>;
  put<T>(path: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>>;
  patch<T>(path: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>>;
  delete<T>(path: string, config?: RequestConfig): Promise<ApiResponse<T>>;
  
  // Auth methods
  setAuthToken(token: string): void;
  clearAuthToken(): void;
  
  // Interceptors
  addRequestInterceptor(interceptor: RequestInterceptor): void;
  addResponseInterceptor(interceptor: ResponseInterceptor): void;
}

// Request/Response Types
interface RequestConfig {
  headers?: Record<string, string>;
  params?: Record<string, any>;
  timeout?: number;
  retryable?: boolean;
  offline?: boolean;
}

interface ApiResponse<T> {
  data: T;
  status: number;
  headers: Record<string, string>;
  request: RequestInfo;
}

interface ApiError {
  message: string;
  code: string;
  status: number;
  details?: any;
}
```

### 2.3 WebSocket Interface
```typescript
// Real-time Communication Interface
interface IRealtimeClient {
  connect(): Promise<void>;
  disconnect(): void;
  
  // Channel management
  channel(name: string): IRealtimeChannel;
  removeChannel(name: string): void;
  
  // Connection state
  isConnected(): boolean;
  onConnectionChange(callback: (connected: boolean) => void): () => void;
}

interface IRealtimeChannel {
  // Subscriptions
  on(event: string, callback: (payload: any) => void): this;
  subscribe(): Promise<void>;
  unsubscribe(): void;
  
  // Broadcasting
  send(event: string, payload: any): Promise<void>;
  
  // Presence
  track(data: any): Promise<void>;
  untrack(): Promise<void>;
  onPresenceChange(callback: (state: PresenceState) => void): () => void;
}
```

---

## 3. DATA ARCHITECTURE

### 3.1 WatermelonDB Schema
```typescript
// Database Schema Definition
import { appSchema, tableSchema } from '@nozbe/watermelondb';

const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'habits',
      columns: [
        { name: 'server_id', type: 'string', isOptional: true },
        { name: 'name', type: 'string' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'icon', type: 'string' },
        { name: 'color', type: 'string' },
        { name: 'frequency_type', type: 'string' }, // daily, weekly, custom
        { name: 'frequency_days', type: 'string' }, // JSON array
        { name: 'reminder_time', type: 'number', isOptional: true },
        { name: 'streak_current', type: 'number' },
        { name: 'streak_best', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'last_completed_at', type: 'number', isOptional: true },
        { name: 'is_archived', type: 'boolean' },
        { name: 'sync_status', type: 'string' }, // pending, synced, error
        { name: 'version', type: 'number' }
      ]
    }),
    
    tableSchema({
      name: 'habit_completions',
      columns: [
        { name: 'habit_id', type: 'string', isIndexed: true },
        { name: 'completed_at', type: 'number' },
        { name: 'note', type: 'string', isOptional: true },
        { name: 'mood', type: 'string', isOptional: true },
        { name: 'duration_minutes', type: 'number', isOptional: true },
        { name: 'sync_status', type: 'string' }
      ]
    }),
    
    tableSchema({
      name: 'sync_queue',
      columns: [
        { name: 'operation_type', type: 'string' }, // create, update, delete
        { name: 'resource_type', type: 'string' }, // habit, completion, etc
        { name: 'resource_id', type: 'string' },
        { name: 'payload', type: 'string' }, // JSON
        { name: 'retry_count', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'last_attempt_at', type: 'number', isOptional: true },
        { name: 'error', type: 'string', isOptional: true }
      ]
    }),
    
    tableSchema({
      name: 'ai_conversations',
      columns: [
        { name: 'personality_type', type: 'string' },
        { name: 'message', type: 'string' },
        { name: 'response', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'user_mood', type: 'string', isOptional: true },
        { name: 'context', type: 'string', isOptional: true } // JSON
      ]
    }),
    
    tableSchema({
      name: 'cached_data',
      columns: [
        { name: 'key', type: 'string', isIndexed: true },
        { name: 'value', type: 'string' }, // JSON
        { name: 'expires_at', type: 'number' },
        { name: 'created_at', type: 'number' }
      ]
    })
  ]
});

// Model Definitions
class Habit extends Model {
  static table = 'habits';
  
  @field('server_id') serverId!: string | null;
  @field('name') name!: string;
  @field('description') description!: string | null;
  @field('icon') icon!: string;
  @field('color') color!: string;
  @field('frequency_type') frequencyType!: string;
  @json('frequency_days', sanitizeFrequencyDays) frequencyDays!: number[];
  @field('reminder_time') reminderTime!: number | null;
  @field('streak_current') streakCurrent!: number;
  @field('streak_best') streakBest!: number;
  @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  @date('last_completed_at') lastCompletedAt!: Date | null;
  @field('is_archived') isArchived!: boolean;
  @field('sync_status') syncStatus!: string;
  @field('version') version!: number;
  
  @lazy completions = this.collections
    .get<HabitCompletion>('habit_completions')
    .query(Q.where('habit_id', this.id));
  
  @action async complete() {
    await this.collections.get<HabitCompletion>('habit_completions').create(completion => {
      completion.habitId = this.id;
      completion.completedAt = new Date();
    });
    
    await this.update(habit => {
      habit.lastCompletedAt = new Date();
      habit.streakCurrent = this.calculateNewStreak();
      if (habit.streakCurrent > habit.streakBest) {
        habit.streakBest = habit.streakCurrent;
      }
    });
  }
}
```

### 3.2 Data Access Patterns
```typescript
// Repository Pattern Implementation
class HabitRepository {
  constructor(
    private database: Database,
    private syncEngine: ISyncEngine
  ) {}
  
  async create(data: CreateHabitDTO): Promise<Habit> {
    const habit = await this.database.write(async () => {
      return await this.database.collections.get<Habit>('habits').create(habit => {
        habit.name = data.name;
        habit.description = data.description;
        habit.icon = data.icon;
        habit.color = data.color;
        habit.frequencyType = data.frequencyType;
        habit.frequencyDays = data.frequencyDays;
        habit.reminderTime = data.reminderTime;
        habit.streakCurrent = 0;
        habit.streakBest = 0;
        habit.isArchived = false;
        habit.syncStatus = 'pending';
        habit.version = 1;
      });
    });
    
    // Queue for sync
    this.syncEngine.queueOperation({
      type: 'CREATE',
      resource: 'habit',
      id: habit.id,
      data: habit.toJSON()
    });
    
    return habit;
  }
  
  async findById(id: string): Promise<Habit | null> {
    try {
      return await this.database.collections
        .get<Habit>('habits')
        .find(id);
    } catch {
      return null;
    }
  }
  
  async findAll(filters?: HabitFilters): Promise<Habit[]> {
    let query = this.database.collections
      .get<Habit>('habits')
      .query();
    
    if (filters?.isArchived !== undefined) {
      query = query.extend(Q.where('is_archived', filters.isArchived));
    }
    
    if (filters?.frequencyType) {
      query = query.extend(Q.where('frequency_type', filters.frequencyType));
    }
    
    return await query.fetch();
  }
  
  async update(id: string, data: UpdateHabitDTO): Promise<Habit> {
    const habit = await this.findById(id);
    if (!habit) throw new Error('Habit not found');
    
    await this.database.write(async () => {
      await habit.update(h => {
        Object.assign(h, data);
        h.version = h.version + 1;
        h.syncStatus = 'pending';
      });
    });
    
    this.syncEngine.queueOperation({
      type: 'UPDATE',
      resource: 'habit',
      id: habit.id,
      data: habit.toJSON()
    });
    
    return habit;
  }
}
```

### 3.3 Caching Strategy
```typescript
// Multi-layer caching implementation
class CacheManager {
  private memoryCache: LRUCache<string, CacheEntry>;
  private diskCache: DiskCache;
  
  constructor() {
    this.memoryCache = new LRUCache({
      max: 100,
      ttl: 1000 * 60 * 5, // 5 minutes
      updateAgeOnGet: true
    });
    
    this.diskCache = new DiskCache({
      directory: 'cache',
      maxSize: 50 * 1024 * 1024 // 50MB
    });
  }
  
  async get<T>(key: string): Promise<T | null> {
    // Check memory cache
    const memoryCached = this.memoryCache.get(key);
    if (memoryCached && !this.isExpired(memoryCached)) {
      return memoryCached.data as T;
    }
    
    // Check disk cache
    const diskCached = await this.diskCache.get(key);
    if (diskCached && !this.isExpired(diskCached)) {
      // Promote to memory cache
      this.memoryCache.set(key, diskCached);
      return diskCached.data as T;
    }
    
    return null;
  }
  
  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      ttl: ttl || 3600000 // 1 hour default
    };
    
    // Set in both caches
    this.memoryCache.set(key, entry);
    await this.diskCache.set(key, entry);
  }
  
  async invalidate(pattern?: string): Promise<void> {
    if (pattern) {
      // Invalidate by pattern
      const regex = new RegExp(pattern);
      
      for (const key of this.memoryCache.keys()) {
        if (regex.test(key)) {
          this.memoryCache.delete(key);
        }
      }
      
      await this.diskCache.invalidatePattern(pattern);
    } else {
      // Clear all
      this.memoryCache.clear();
      await this.diskCache.clear();
    }
  }
  
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }
}

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}
```

---

## 4. DEPLOYMENT ARCHITECTURE

### 4.1 CI/CD Pipeline
```yaml
# .github/workflows/mobile-deployment.yml
name: Mobile App CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '18.x'
  EXPO_VERSION: 'latest'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linting
        run: npm run lint
      
      - name: Run type checking
        run: npm run typecheck
      
      - name: Run tests
        run: npm test -- --coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
          fail_ci_if_error: true

  build-preview:
    needs: test
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Expo
        uses: expo/expo-github-action@v8
        with:
          expo-version: ${{ env.EXPO_VERSION }}
          token: ${{ secrets.EXPO_TOKEN }}
      
      - name: Install dependencies
        run: npm ci
      
      - name: Create preview build
        run: |
          expo build:android --type apk --no-publish
          expo build:ios --type simulator --no-publish
      
      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: preview-builds
          path: |
            *.apk
            *.tar.gz

  deploy-staging:
    needs: test
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Expo
        uses: expo/expo-github-action@v8
        with:
          expo-version: ${{ env.EXPO_VERSION }}
          token: ${{ secrets.EXPO_TOKEN }}
      
      - name: Install dependencies
        run: npm ci
      
      - name: Publish to Expo
        run: expo publish --release-channel staging
      
      - name: Submit to TestFlight
        run: |
          expo build:ios --release-channel staging
          expo upload:ios --apple-id ${{ secrets.APPLE_ID }}

  deploy-production:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Expo
        uses: expo/expo-github-action@v8
        with:
          expo-version: ${{ env.EXPO_VERSION }}
          token: ${{ secrets.EXPO_TOKEN }}
      
      - name: Build production apps
        run: |
          expo build:android --release-channel production
          expo build:ios --release-channel production
      
      - name: Submit to stores
        run: |
          expo upload:android --track production
          expo upload:ios --apple-id ${{ secrets.APPLE_ID }}
```

### 4.2 Environment Configuration
```typescript
// Environment management with EAS
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "env": {
        "EXPO_PUBLIC_API_URL": "http://localhost:3000",
        "EXPO_PUBLIC_ENVIRONMENT": "development"
      }
    },
    "preview": {
      "distribution": "internal",
      "env": {
        "EXPO_PUBLIC_API_URL": "https://staging-api.vibestack.ai",
        "EXPO_PUBLIC_ENVIRONMENT": "staging"
      }
    },
    "production": {
      "env": {
        "EXPO_PUBLIC_API_URL": "https://api.vibestack.ai",
        "EXPO_PUBLIC_ENVIRONMENT": "production"
      }
    }
  },
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "production"
      },
      "ios": {
        "appleId": "vibestack@parallaxanalytics.com",
        "ascAppId": "1234567890"
      }
    }
  }
}
```

### 4.3 Monitoring Architecture
```typescript
// Comprehensive monitoring setup
class MonitoringService {
  private sentry: Sentry;
  private mixpanel: Mixpanel;
  private customLogger: Logger;
  
  constructor(config: MonitoringConfig) {
    // Initialize Sentry for error tracking
    this.sentry = Sentry.init({
      dsn: config.sentryDsn,
      environment: config.environment,
      beforeSend: (event) => this.sanitizeSentryEvent(event),
      integrations: [
        new Sentry.ReactNativeTracing({
          tracingOrigins: ['api.vibestack.ai'],
          routingInstrumentation: Sentry.reactNavigationIntegration()
        })
      ],
      tracesSampleRate: config.environment === 'production' ? 0.1 : 1.0
    });
    
    // Initialize Mixpanel for analytics
    this.mixpanel = new Mixpanel(config.mixpanelToken);
    
    // Custom logger for debugging
    this.customLogger = new Logger({
      level: config.logLevel,
      transport: config.environment === 'development' 
        ? [consoleTransport, fileTransport]
        : [remoteTransport]
    });
  }
  
  // Error tracking
  captureException(error: Error, context?: Record<string, any>): void {
    // Log locally
    this.customLogger.error('Exception captured', { error, context });
    
    // Send to Sentry
    Sentry.captureException(error, {
      extra: context,
      fingerprint: [error.name, error.message]
    });
  }
  
  // Performance monitoring
  startTransaction(name: string, op: string): Transaction {
    return Sentry.startTransaction({
      name,
      op,
      data: {
        startTime: Date.now()
      }
    });
  }
  
  // User behavior analytics
  trackEvent(event: string, properties?: Record<string, any>): void {
    // Track in Mixpanel
    this.mixpanel.track(event, {
      ...properties,
      timestamp: new Date().toISOString(),
      sessionId: this.getSessionId()
    });
    
    // Log for debugging
    this.customLogger.info('Event tracked', { event, properties });
  }
  
  // Performance metrics
  trackMetric(metric: string, value: number, tags?: Record<string, string>): void {
    // Custom metrics tracking
    this.customLogger.metric(metric, value, tags);
    
    // Send to monitoring service
    if (this.shouldSendMetrics()) {
      this.sendMetricToBackend(metric, value, tags);
    }
  }
  
  // User identification
  identify(userId: string, traits?: Record<string, any>): void {
    // Set user context in Sentry
    Sentry.setUser({
      id: userId,
      ...traits
    });
    
    // Identify in Mixpanel
    this.mixpanel.identify(userId);
    if (traits) {
      this.mixpanel.people.set(traits);
    }
  }
}
```

---

## 5. SECURITY ARCHITECTURE

### 5.1 Authentication & Authorization
```typescript
// Secure authentication implementation
class AuthenticationService implements IAuthService {
  private tokenManager: TokenManager;
  private biometricAuth: BiometricAuth;
  
  constructor(
    private api: IApiClient,
    private storage: SecureStorage,
    private crypto: CryptoService
  ) {
    this.tokenManager = new TokenManager(storage, crypto);
    this.biometricAuth = new BiometricAuth();
  }
  
  async login(credentials: LoginCredentials): Promise<AuthResult> {
    try {
      // Validate credentials locally
      this.validateCredentials(credentials);
      
      // Hash password before sending
      const hashedPassword = await this.crypto.hashPassword(
        credentials.password,
        credentials.email // salt
      );
      
      // API call with timeout
      const response = await this.api.post<AuthResponse>('/auth/login', {
        email: credentials.email,
        password: hashedPassword
      }, {
        timeout: 30000
      });
      
      // Store tokens securely
      await this.tokenManager.storeTokens({
        accessToken: response.data.accessToken,
        refreshToken: response.data.refreshToken,
        expiresAt: response.data.expiresAt
      });
      
      // Enable biometric auth if requested
      if (credentials.enableBiometric) {
        await this.enableBiometricAuth(response.data.user.id);
      }
      
      return {
        success: true,
        user: response.data.user
      };
    } catch (error) {
      // Log security events
      this.logSecurityEvent('login_failed', {
        email: credentials.email,
        error: error.message
      });
      
      throw this.handleAuthError(error);
    }
  }
  
  async enableBiometricAuth(userId: string): Promise<void> {
    const isAvailable = await this.biometricAuth.isAvailable();
    if (!isAvailable) {
      throw new Error('Biometric authentication not available');
    }
    
    // Authenticate with biometric
    const result = await this.biometricAuth.authenticate({
      promptMessage: 'Enable quick login with biometrics',
      fallbackLabel: 'Use password'
    });
    
    if (result.success) {
      // Generate and store biometric token
      const biometricToken = await this.crypto.generateSecureToken();
      await this.storage.setSecure(`biometric_${userId}`, biometricToken);
    }
  }
  
  async refreshToken(): Promise<string> {
    const tokens = await this.tokenManager.getTokens();
    if (!tokens?.refreshToken) {
      throw new Error('No refresh token available');
    }
    
    // Check if token is still valid
    if (Date.now() < tokens.expiresAt - 60000) { // 1 minute buffer
      return tokens.accessToken;
    }
    
    // Refresh the token
    const response = await this.api.post<RefreshResponse>('/auth/refresh', {
      refreshToken: tokens.refreshToken
    });
    
    // Update stored tokens
    await this.tokenManager.storeTokens({
      accessToken: response.data.accessToken,
      refreshToken: response.data.refreshToken,
      expiresAt: response.data.expiresAt
    });
    
    return response.data.accessToken;
  }
}
```

### 5.2 Data Encryption
```typescript
// Encryption service for sensitive data
class EncryptionService {
  private key: CryptoKey;
  
  async initialize(): Promise<void> {
    // Generate or retrieve encryption key
    const storedKey = await this.getStoredKey();
    
    if (storedKey) {
      this.key = await this.importKey(storedKey);
    } else {
      this.key = await this.generateKey();
      await this.storeKey(this.key);
    }
  }
  
  async encrypt(data: string): Promise<EncryptedData> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    
    // Generate IV for each encryption
    const iv = crypto.getRandomValues(new Uint8Array(16));
    
    // Encrypt the data
    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      this.key,
      dataBuffer
    );
    
    return {
      data: this.bufferToBase64(encryptedBuffer),
      iv: this.bufferToBase64(iv)
    };
  }
  
  async decrypt(encryptedData: EncryptedData): Promise<string> {
    const dataBuffer = this.base64ToBuffer(encryptedData.data);
    const iv = this.base64ToBuffer(encryptedData.iv);
    
    // Decrypt the data
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      this.key,
      dataBuffer
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  }
  
  private async generateKey(): Promise<CryptoKey> {
    return await crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256
      },
      true,
      ['encrypt', 'decrypt']
    );
  }
  
  private async getStoredKey(): Promise<string | null> {
    // Use device secure storage
    return await SecureStore.getItemAsync('encryption_key');
  }
  
  private async storeKey(key: CryptoKey): Promise<void> {
    const exported = await crypto.subtle.exportKey('raw', key);
    const keyString = this.bufferToBase64(exported);
    await SecureStore.setItemAsync('encryption_key', keyString);
  }
}
```

### 5.3 API Security
```typescript
// API security middleware
class ApiSecurityMiddleware {
  constructor(
    private tokenManager: TokenManager,
    private deviceInfo: DeviceInfo
  ) {}
  
  async onRequest(config: RequestConfig): Promise<RequestConfig> {
    // Add authentication header
    const token = await this.tokenManager.getAccessToken();
    if (token) {
      config.headers = {
        ...config.headers,
        'Authorization': `Bearer ${token}`
      };
    }
    
    // Add security headers
    config.headers = {
      ...config.headers,
      'X-Device-Id': await this.deviceInfo.getDeviceId(),
      'X-App-Version': Constants.manifest.version,
      'X-Platform': Platform.OS,
      'X-Request-Id': this.generateRequestId()
    };
    
    // Certificate pinning for production
    if (!__DEV__) {
      config.certificatePins = [{
        host: 'api.vibestack.ai',
        pin: 'sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='
      }];
    }
    
    return config;
  }
  
  async onResponse(response: ApiResponse<any>): Promise<ApiResponse<any>> {
    // Verify response signatures
    const signature = response.headers['x-response-signature'];
    if (signature && !this.verifySignature(response, signature)) {
      throw new SecurityError('Invalid response signature');
    }
    
    // Check for security headers
    const securityHeaders = [
      'x-content-type-options',
      'x-frame-options',
      'strict-transport-security'
    ];
    
    for (const header of securityHeaders) {
      if (!response.headers[header]) {
        console.warn(`Missing security header: ${header}`);
      }
    }
    
    return response;
  }
  
  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private verifySignature(response: ApiResponse<any>, signature: string): boolean {
    // Implement HMAC verification
    const payload = JSON.stringify(response.data);
    const computedSignature = this.computeHmac(payload);
    return signature === computedSignature;
  }
}
```

---

## 6. PERFORMANCE OPTIMIZATION

### 6.1 Code Splitting Strategy
```typescript
// Dynamic imports for code splitting
const screenImports = {
  // Core screens loaded immediately
  Dashboard: () => import('./screens/Dashboard'),
  HabitList: () => import('./screens/HabitList'),
  
  // Secondary screens loaded on demand
  HabitDetail: () => import('./screens/HabitDetail'),
  AvatarChat: () => import('./screens/AvatarChat'),
  Profile: () => import('./screens/Profile'),
  
  // Feature screens loaded when accessed
  Social: () => import('./screens/Social'),
  Challenges: () => import('./screens/Challenges'),
  Leaderboard: () => import('./screens/Leaderboard'),
  Settings: () => import('./screens/Settings'),
  
  // Admin screens loaded conditionally
  Analytics: () => import('./screens/Analytics'),
  AdminPanel: () => import('./screens/AdminPanel')
};

// Preload strategies
class ScreenPreloader {
  private preloadedScreens = new Set<string>();
  
  async preloadCriticalScreens(): Promise<void> {
    const criticalScreens = ['Dashboard', 'HabitList'];
    
    await Promise.all(
      criticalScreens.map(screen => this.preloadScreen(screen))
    );
  }
  
  async preloadScreen(screenName: string): Promise<void> {
    if (this.preloadedScreens.has(screenName)) return;
    
    const importFn = screenImports[screenName];
    if (importFn) {
      await importFn();
      this.preloadedScreens.add(screenName);
    }
  }
  
  async preloadBasedOnUsage(usage: UsagePattern): Promise<void> {
    // Preload screens based on user behavior
    const probableNextScreens = this.predictNextScreens(usage);
    
    for (const screen of probableNextScreens) {
      // Preload in background
      setTimeout(() => this.preloadScreen(screen), 100);
    }
  }
  
  private predictNextScreens(usage: UsagePattern): string[] {
    // Simple prediction based on frequency
    return usage.frequentScreens
      .filter(s => !this.preloadedScreens.has(s))
      .slice(0, 3);
  }
}
```

### 6.2 Render Optimization
```typescript
// Performance-optimized components
const OptimizedHabitCard = memo<HabitCardProps>(({
  habit,
  onPress,
  onComplete,
  showProgress = true
}) => {
  // Memoize expensive calculations
  const progress = useMemo(() => {
    if (!showProgress) return 0;
    return calculateHabitProgress(habit);
  }, [habit.completions, habit.frequencyType, showProgress]);
  
  // Optimize re-renders with callback memoization
  const handlePress = useCallback(() => {
    onPress(habit.id);
  }, [habit.id, onPress]);
  
  const handleComplete = useCallback(() => {
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onComplete(habit.id);
  }, [habit.id, onComplete]);
  
  // Use InteractionManager for non-critical updates
  useEffect(() => {
    InteractionManager.runAfterInteractions(() => {
      // Update analytics
      trackHabitView(habit.id);
    });
  }, [habit.id]);
  
  return (
    <Pressable
      onPress={handlePress}
      style={styles.container}
      testID={`habit-card-${habit.id}`}
    >
      <View style={styles.content}>
        <HabitIcon icon={habit.icon} color={habit.color} />
        <Text style={styles.name}>{habit.name}</Text>
        {showProgress && (
          <ProgressRing
            progress={progress}
            size={60}
            color={habit.color}
          />
        )}
      </View>
      <CompleteButton
        onPress={handleComplete}
        completed={isCompletedToday(habit)}
      />
    </Pressable>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for better performance
  return (
    prevProps.habit.id === nextProps.habit.id &&
    prevProps.habit.lastCompletedAt === nextProps.habit.lastCompletedAt &&
    prevProps.showProgress === nextProps.showProgress
  );
});

// List optimization with FlashList
const OptimizedHabitList: React.FC<HabitListProps> = ({ habits }) => {
  const renderItem = useCallback(({ item }: { item: Habit }) => (
    <OptimizedHabitCard
      habit={item}
      onPress={navigateToDetail}
      onComplete={completeHabit}
    />
  ), []);
  
  const keyExtractor = useCallback((item: Habit) => item.id, []);
  
  const getItemType = useCallback((item: Habit) => {
    // Help FlashList optimize by providing item types
    return item.isArchived ? 'archived' : 'active';
  }, []);
  
  return (
    <FlashList
      data={habits}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      getItemType={getItemType}
      estimatedItemSize={80}
      removeClippedSubviews
      maxToRenderPerBatch={10}
      windowSize={10}
      maintainVisibleContentPosition={{
        minIndexForVisible: 0
      }}
    />
  );
};
```

---

## APPENDICES

### A. Error Codes and Handling
```typescript
enum ErrorCode {
  // Network errors (1xxx)
  NETWORK_OFFLINE = 1000,
  NETWORK_TIMEOUT = 1001,
  NETWORK_SERVER_ERROR = 1002,
  
  // Auth errors (2xxx)
  AUTH_INVALID_CREDENTIALS = 2000,
  AUTH_TOKEN_EXPIRED = 2001,
  AUTH_UNAUTHORIZED = 2002,
  
  // Sync errors (3xxx)
  SYNC_CONFLICT = 3000,
  SYNC_QUEUE_FULL = 3001,
  SYNC_INVALID_DATA = 3002,
  
  // Storage errors (4xxx)
  STORAGE_FULL = 4000,
  STORAGE_CORRUPTED = 4001,
  STORAGE_PERMISSION_DENIED = 4002
}
```

### B. Performance Benchmarks
```typescript
const PERFORMANCE_TARGETS = {
  appLaunch: {
    cold: 2000, // ms
    warm: 500   // ms
  },
  screenTransition: 200, // ms
  apiResponse: {
    cached: 50,   // ms
    network: 500  // ms
  },
  listScroll: {
    fps: 60,
    jsFrames: 60
  },
  memory: {
    baseline: 150, // MB
    peak: 300      // MB
  }
};
```

### C. Security Checklist
- [ ] All API calls use HTTPS
- [ ] Certificate pinning enabled for production
- [ ] Sensitive data encrypted at rest
- [ ] Biometric authentication implemented
- [ ] JWT tokens expire after 15 minutes
- [ ] Refresh tokens rotated on use
- [ ] Input validation on all forms
- [ ] SQL injection prevention in queries
- [ ] XSS protection in rendered content
- [ ] Audit logs for sensitive operations

---

*Document Version: 1.0*
*Last Updated: $(date)*
*Status: Architecture Complete*
*Next Phase: Implementation (TDD Approach)*