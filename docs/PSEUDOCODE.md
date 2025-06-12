# VibeStack™ Pseudocode & Architecture Design
## Phase 2: High-Level System Design

### Executive Summary
This document outlines the high-level architecture, algorithms, and design patterns for the VibeStack™ mobile application. Building on the completed backend infrastructure and specification requirements, we define the technical approach for implementing an offline-first, AI-powered social habit platform.

---

## 1. SYSTEM ARCHITECTURE

### 1.1 High-Level Architecture Overview
```
┌─────────────────────────────────────────────────────────────┐
│                    VibeStack Mobile App                      │
├─────────────────────────────────────────────────────────────┤
│  Presentation Layer (React Native + Expo)                    │
│  ├── Screens (Expo Router - File-based)                     │
│  ├── Components (Atomic Design)                             │
│  └── Animations (Reanimated 3)                             │
├─────────────────────────────────────────────────────────────┤
│  State Management Layer                                      │
│  ├── Redux Toolkit (Global State)                          │
│  ├── RTK Query (API Cache)                                 │
│  └── React Context (Local UI State)                        │
├─────────────────────────────────────────────────────────────┤
│  Business Logic Layer                                        │
│  ├── Services (API, Auth, Sync, AI)                        │
│  ├── Hooks (Custom Business Logic)                         │
│  └── Utils (Helpers, Formatters)                           │
├─────────────────────────────────────────────────────────────┤
│  Data Persistence Layer                                      │
│  ├── WatermelonDB (Local Storage)                          │
│  ├── Sync Engine (Queue Management)                        │
│  └── Cache Manager (TTL-based)                             │
├─────────────────────────────────────────────────────────────┤
│  Integration Layer                                           │
│  ├── REST API Client (Axios)                               │
│  ├── WebSocket (Supabase Realtime)                         │
│  ├── Push Notifications (FCM/APNs)                         │
│  └── AI Providers (OpenAI, Claude, Gemini)                 │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Component Hierarchy (Atomic Design)
```
atoms/
  Button, Input, Icon, Text, Avatar, Badge
  
molecules/
  HabitCard, ProgressRing, AvatarBubble, NotificationItem
  
organisms/
  HabitList, AvatarConversation, Leaderboard, ChallengeCard
  
templates/
  DashboardLayout, HabitDetailLayout, SocialLayout
  
pages/
  Dashboard, HabitDetail, Social, Profile, Onboarding
```

---

## 2. CORE ALGORITHMS

### 2.1 Offline Sync Algorithm
```typescript
// PSEUDOCODE: Bi-directional sync with conflict resolution
class SyncEngine {
  syncQueue: SyncOperation[] = []
  
  function queueOperation(operation: Operation) {
    // Add to local queue with timestamp
    syncQueue.push({
      id: uuid(),
      operation,
      timestamp: Date.now(),
      retryCount: 0
    })
    
    // Persist to WatermelonDB
    await database.write(async () => {
      await database.collections.get('sync_queue').create(operation)
    })
    
    // Try immediate sync if online
    if (isOnline()) {
      processQueue()
    }
  }
  
  async function processQueue() {
    while (syncQueue.length > 0) {
      const operation = syncQueue[0]
      
      try {
        // Send to backend
        const result = await api.sync(operation)
        
        // Handle conflicts
        if (result.conflict) {
          const resolved = await resolveConflict(operation, result.serverData)
          await api.sync(resolved)
        }
        
        // Remove from queue on success
        syncQueue.shift()
        await removeSyncOperation(operation.id)
        
      } catch (error) {
        // Exponential backoff
        operation.retryCount++
        const delay = Math.min(1000 * Math.pow(2, operation.retryCount), 30000)
        
        setTimeout(() => processQueue(), delay)
        break
      }
    }
  }
  
  function resolveConflict(local: Data, server: Data): Data {
    // Last-write-wins with version checking
    if (local.version > server.version) {
      return local
    } else if (local.version < server.version) {
      return server
    } else {
      // Same version - use timestamp
      return local.timestamp > server.timestamp ? local : server
    }
  }
}
```

### 2.2 Smart Notification Timing Algorithm
```typescript
// PSEUDOCODE: ML-based optimal notification timing
class NotificationOptimizer {
  userPatterns: UsagePattern[] = []
  
  async function analyzeUsagePatterns(userId: string) {
    // Collect phone usage data
    const usageData = await getPhoneUsageData(userId)
    
    // Identify active periods
    const activePeriods = usageData
      .groupBy(hour)
      .map(period => ({
        hour: period.hour,
        avgUnlocks: period.unlocks.average(),
        avgDuration: period.duration.average()
      }))
      .filter(period => period.avgUnlocks > 3)
    
    // Find optimal windows
    const optimalWindows = activePeriods
      .sort((a, b) => b.avgUnlocks - a.avgUnlocks)
      .slice(0, 3)
      .map(window => ({
        startHour: window.hour,
        endHour: (window.hour + 1) % 24,
        confidence: window.avgUnlocks / maxUnlocks
      }))
    
    return optimalWindows
  }
  
  async function scheduleSmartReminder(habit: Habit, user: User) {
    const optimalWindows = await analyzeUsagePatterns(user.id)
    const habitTime = habit.preferredTime || 'morning'
    
    // Match habit time with usage patterns
    const bestWindow = optimalWindows.find(window => 
      matchesTimePreference(window, habitTime)
    ) || optimalWindows[0]
    
    // Add randomization to prevent notification fatigue
    const randomMinute = Math.floor(Math.random() * 60)
    const scheduledTime = new Date()
    scheduledTime.setHours(bestWindow.startHour, randomMinute)
    
    // Schedule notification
    await scheduleNotification({
      habitId: habit.id,
      userId: user.id,
      scheduledFor: scheduledTime,
      message: generatePersonalizedMessage(habit, user)
    })
  }
}
```

### 2.3 AI Personality Engine
```typescript
// PSEUDOCODE: Multi-LLM personality system
class AIPersonalityEngine {
  personalities = {
    cheerleader: {
      traits: ['enthusiastic', 'supportive', 'celebratory'],
      promptTemplate: 'You are an enthusiastic cheerleader...',
      preferredModel: 'gpt-4'
    },
    coach: {
      traits: ['direct', 'strategic', 'accountability-focused'],
      promptTemplate: 'You are a no-nonsense coach...',
      preferredModel: 'claude-3-opus'
    },
    zen_master: {
      traits: ['calm', 'philosophical', 'mindful'],
      promptTemplate: 'You are a wise zen master...',
      preferredModel: 'gemini-pro'
    }
  }
  
  async function generateResponse(
    personality: PersonalityType,
    context: ConversationContext,
    userMood: Mood
  ): Promise<AIResponse> {
    // Select personality configuration
    const config = personalities[personality]
    
    // Build context-aware prompt
    const prompt = buildPrompt({
      template: config.promptTemplate,
      userContext: context.recentHabits,
      currentMood: userMood,
      conversationHistory: context.history.slice(-5)
    })
    
    // Multi-LLM fallback strategy
    const providers = [
      { model: config.preferredModel, priority: 1 },
      { model: 'gpt-3.5-turbo', priority: 2 },
      { model: 'claude-instant', priority: 3 }
    ]
    
    for (const provider of providers) {
      try {
        const response = await callLLM(provider.model, prompt)
        
        // Validate response matches personality
        if (validatePersonality(response, config.traits)) {
          return {
            text: response,
            emotion: detectEmotion(response),
            suggestions: extractActionableSuggestions(response)
          }
        }
      } catch (error) {
        console.log(`Fallback from ${provider.model}`)
        continue
      }
    }
    
    // Offline fallback
    return generateOfflineResponse(personality, context)
  }
}
```

### 2.4 Gamification & Viral Mechanics
```typescript
// PSEUDOCODE: Achievement and viral content system
class GamificationEngine {
  achievements = loadAchievementDefinitions()
  
  async function checkAchievements(user: User, trigger: TriggerEvent) {
    const userStats = await calculateUserStats(user)
    const unlockedAchievements = []
    
    for (const achievement of achievements) {
      if (achievement.isUnlocked(userStats, trigger)) {
        unlockedAchievements.push(achievement)
        
        // Create shareable content
        const shareableContent = await generateShareableContent({
          achievement,
          user,
          stats: userStats
        })
        
        // Trigger celebration animation
        await triggerCelebration(achievement.rarity)
        
        // Update leaderboards
        await updateLeaderboards(user, achievement.points)
      }
    }
    
    return unlockedAchievements
  }
  
  async function generateShareableContent(data: AchievementData) {
    // Create visually appealing share card
    const template = selectTemplate(data.achievement.type)
    
    const shareCard = {
      background: generateGradient(data.user.favoriteColor),
      avatar: data.user.avatar.imageUrl,
      achievement: {
        icon: data.achievement.icon,
        name: data.achievement.name,
        description: personalizeDescription(data)
      },
      stats: formatStats(data.stats),
      watermark: 'vibestack.ai'
    }
    
    // Generate platform-specific formats
    return {
      instagram: await renderForInstagram(shareCard),
      tiktok: await renderForTikTok(shareCard),
      twitter: await renderForTwitter(shareCard)
    }
  }
}
```

---

## 3. DATA FLOW ARCHITECTURE

### 3.1 State Management Pattern
```typescript
// Redux Toolkit store structure
const store = configureStore({
  reducer: {
    // Feature slices
    auth: authSlice.reducer,
    habits: habitsSlice.reducer,
    social: socialSlice.reducer,
    avatar: avatarSlice.reducer,
    
    // RTK Query API slices
    api: apiSlice.reducer,
    
    // UI state
    ui: uiSlice.reducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST']
      }
    })
    .concat(apiSlice.middleware)
    .concat(syncMiddleware)
    .concat(offlineMiddleware)
})

// Offline-first data flow
async function habitCompletionFlow(habitId: string) {
  // 1. Optimistic update
  dispatch(habitSlice.actions.markComplete({ habitId, timestamp: now() }))
  
  // 2. Persist locally
  await database.write(async () => {
    const habit = await database.get('habits').find(habitId)
    await habit.update(h => {
      h.lastCompleted = new Date()
      h.streak = h.streak + 1
    })
  })
  
  // 3. Queue sync operation
  syncEngine.queueOperation({
    type: 'HABIT_COMPLETE',
    payload: { habitId, timestamp: now() }
  })
  
  // 4. Update UI optimistically
  dispatch(uiSlice.actions.showSuccess('Habit completed! 🎉'))
  
  // 5. Check achievements
  const achievements = await gamificationEngine.checkAchievements(user, {
    type: 'HABIT_COMPLETE',
    habitId
  })
  
  // 6. Handle sync response
  try {
    const result = await syncEngine.processQueue()
    dispatch(habitSlice.actions.syncSuccess(result))
  } catch (error) {
    // Rollback on failure
    dispatch(habitSlice.actions.rollback({ habitId }))
  }
}
```

### 3.2 Real-time Subscription Management
```typescript
// PSEUDOCODE: Supabase real-time integration
class RealtimeManager {
  private channels: Map<string, RealtimeChannel> = new Map()
  
  async function subscribeToHabitUpdates(userId: string) {
    const channel = supabase
      .channel(`habits:${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'habits',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        handleHabitChange(payload)
      })
      .on('presence', { event: 'sync' }, () => {
        handlePresenceSync()
      })
      .subscribe()
    
    channels.set(`habits:${userId}`, channel)
  }
  
  function handleHabitChange(payload: RealtimePayload) {
    switch (payload.eventType) {
      case 'INSERT':
        dispatch(habitSlice.actions.addHabit(payload.new))
        break
      case 'UPDATE':
        dispatch(habitSlice.actions.updateHabit(payload.new))
        break
      case 'DELETE':
        dispatch(habitSlice.actions.removeHabit(payload.old.id))
        break
    }
  }
  
  async function subscribeToChallenges(challengeIds: string[]) {
    for (const challengeId of challengeIds) {
      const channel = supabase
        .channel(`challenge:${challengeId}`)
        .on('broadcast', { event: 'progress_update' }, (payload) => {
          updateLeaderboard(challengeId, payload)
        })
        .subscribe()
      
      channels.set(`challenge:${challengeId}`, channel)
    }
  }
}
```

---

## 4. TEST STRATEGY (TDD LONDON SCHOOL)

### 4.1 Test Architecture
```typescript
// Test structure following London School TDD
describe('HabitService', () => {
  let habitService: HabitService
  let mockApi: jest.Mocked<ApiClient>
  let mockDatabase: jest.Mocked<Database>
  let mockSyncEngine: jest.Mocked<SyncEngine>
  
  beforeEach(() => {
    // Create test doubles (mocks)
    mockApi = createMockApi()
    mockDatabase = createMockDatabase()
    mockSyncEngine = createMockSyncEngine()
    
    // Inject dependencies
    habitService = new HabitService({
      api: mockApi,
      database: mockDatabase,
      syncEngine: mockSyncEngine
    })
  })
  
  describe('createHabit', () => {
    it('should create habit locally when offline', async () => {
      // Arrange
      mockApi.isOnline.mockReturnValue(false)
      const habitData = createTestHabit()
      
      // Act
      const result = await habitService.createHabit(habitData)
      
      // Assert - verify interactions
      expect(mockDatabase.write).toHaveBeenCalledWith(
        expect.any(Function)
      )
      expect(mockSyncEngine.queueOperation).toHaveBeenCalledWith({
        type: 'CREATE_HABIT',
        payload: habitData
      })
      expect(result.id).toBeDefined()
      expect(result.syncStatus).toBe('pending')
    })
    
    it('should sync immediately when online', async () => {
      // Arrange
      mockApi.isOnline.mockReturnValue(true)
      mockApi.createHabit.mockResolvedValue({ id: 'server-id' })
      
      // Act
      const result = await habitService.createHabit(habitData)
      
      // Assert
      expect(mockApi.createHabit).toHaveBeenCalledWith(habitData)
      expect(result.syncStatus).toBe('synced')
    })
  })
})
```

### 4.2 Component Testing Strategy
```typescript
// Component tests with React Native Testing Library
describe('HabitCard', () => {
  it('should show completion animation on tap', async () => {
    // Arrange
    const onComplete = jest.fn()
    const { getByTestId } = render(
      <HabitCard 
        habit={mockHabit}
        onComplete={onComplete}
      />
    )
    
    // Act
    const card = getByTestId('habit-card')
    fireEvent.press(card)
    
    // Wait for animation
    await waitFor(() => {
      expect(getByTestId('completion-animation')).toBeVisible()
    })
    
    // Assert
    expect(onComplete).toHaveBeenCalledWith(mockHabit.id)
  })
})
```

### 4.3 Integration Test Patterns
```typescript
// Integration tests for critical paths
describe('Habit Completion Flow', () => {
  it('should handle full completion flow offline to online', async () => {
    // Start offline
    setNetworkStatus('offline')
    
    // Complete habit
    await completeHabit(testHabit.id)
    
    // Verify local state
    expect(getLocalHabit(testHabit.id).streak).toBe(1)
    expect(getSyncQueue()).toHaveLength(1)
    
    // Go online
    setNetworkStatus('online')
    await waitForSync()
    
    // Verify synced state
    expect(getSyncQueue()).toHaveLength(0)
    expect(getServerHabit(testHabit.id).streak).toBe(1)
  })
})
```

---

## 5. ERROR HANDLING & RECOVERY

### 5.1 Global Error Boundary
```typescript
// PSEUDOCODE: Graceful error handling
class ErrorBoundary extends Component {
  state = { hasError: false, error: null }
  
  static getDerivedStateFromError(error: Error) {
    // Log to Sentry
    Sentry.captureException(error)
    
    return {
      hasError: true,
      error: {
        message: getUserFriendlyMessage(error),
        canRetry: isRetryableError(error)
      }
    }
  }
  
  handleRetry = async () => {
    // Clear error state
    this.setState({ hasError: false, error: null })
    
    // Attempt recovery
    if (isNetworkError(this.state.error)) {
      await syncEngine.retryFailedOperations()
    }
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <ErrorScreen
          message={this.state.error.message}
          onRetry={this.state.error.canRetry ? this.handleRetry : null}
        />
      )
    }
    
    return this.props.children
  }
}
```

### 5.2 Network Resilience
```typescript
// PSEUDOCODE: Network-aware operations
class NetworkAwareService {
  private retryQueue: RetryableOperation[] = []
  
  async function executeWithRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const {
      maxRetries = 3,
      backoffMultiplier = 2,
      initialDelay = 1000
    } = options
    
    let lastError: Error
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Check network before attempting
        if (!isOnline() && !options.allowOffline) {
          throw new OfflineError('Operation requires network')
        }
        
        // Execute operation
        return await operation()
        
      } catch (error) {
        lastError = error
        
        // Don't retry non-retryable errors
        if (!isRetryableError(error)) {
          throw error
        }
        
        // Calculate delay
        const delay = initialDelay * Math.pow(backoffMultiplier, attempt)
        
        // Add to retry queue if going offline
        if (!isOnline()) {
          this.retryQueue.push({ operation, options })
          throw new QueuedForRetryError()
        }
        
        // Wait before retry
        await sleep(delay)
      }
    }
    
    throw lastError
  }
}
```

---

## 6. PERFORMANCE OPTIMIZATION

### 6.1 Lazy Loading Strategy
```typescript
// PSEUDOCODE: Component code splitting
const LazyHabitDetail = lazy(() => 
  import('./screens/HabitDetail')
)

const LazyAvatarCustomization = lazy(() =>
  import('./screens/AvatarCustomization')
)

// Preload critical screens
function preloadCriticalScreens() {
  // Preload after splash screen
  setTimeout(() => {
    import('./screens/Dashboard')
    import('./screens/HabitList')
  }, 100)
}
```

### 6.2 Memory Management
```typescript
// PSEUDOCODE: Image and data caching
class CacheManager {
  private memoryCache = new LRUCache<string, any>({
    max: 50,
    ttl: 1000 * 60 * 5 // 5 minutes
  })
  
  async function getCachedImage(url: string): Promise<ImageSource> {
    // Check memory cache
    const cached = memoryCache.get(url)
    if (cached) return cached
    
    // Check disk cache
    const diskCached = await AsyncStorage.getItem(`img_${url}`)
    if (diskCached) {
      memoryCache.set(url, diskCached)
      return diskCached
    }
    
    // Fetch and cache
    const image = await fetchImage(url)
    memoryCache.set(url, image)
    await AsyncStorage.setItem(`img_${url}`, image)
    
    return image
  }
  
  function clearOldCache() {
    // Run periodically
    const keys = await AsyncStorage.getAllKeys()
    const imageKeys = keys.filter(k => k.startsWith('img_'))
    
    for (const key of imageKeys) {
      const data = await AsyncStorage.getItem(key)
      if (isExpired(data)) {
        await AsyncStorage.removeItem(key)
      }
    }
  }
}
```

---

## 7. IMPLEMENTATION PRIORITIES

### Phase 1: Core Foundation (Weeks 1-4)
1. Project setup with Expo and TypeScript
2. Redux Toolkit and RTK Query configuration
3. WatermelonDB integration
4. Basic navigation structure
5. Authentication flow

### Phase 2: Offline-First Features (Weeks 5-8)
1. Sync engine implementation
2. Queue management system
3. Conflict resolution
4. Local data persistence
5. Offline indicators

### Phase 3: Core Features (Weeks 9-12)
1. Habit CRUD operations
2. Progress tracking
3. Basic avatar system
4. Dashboard implementation
5. Push notifications

### Phase 4: AI & Social (Weeks 13-16)
1. Multi-LLM integration
2. Avatar personalities
3. Friend system
4. Challenges
5. Leaderboards

### Phase 5: Polish & Launch (Weeks 17-20)
1. Animations and transitions
2. Performance optimization
3. Error handling
4. Analytics integration
5. App store preparation

---

## APPENDICES

### A. Technology Decisions
- **State Management**: Redux Toolkit for predictable state
- **Data Persistence**: WatermelonDB for performance
- **Navigation**: Expo Router for file-based routing
- **UI Components**: Native Base for consistency
- **Animations**: Reanimated 3 for 60fps
- **Testing**: Jest + RNTL for reliability

### B. Code Organization
```
src/
  app/                 # Expo Router pages
  components/          # Reusable components
  services/           # Business logic
  store/              # Redux setup
  hooks/              # Custom hooks
  utils/              # Helpers
  types/              # TypeScript types
  __tests__/          # Test files
```

---

*Document Version: 1.0*
*Last Updated: $(date)*
*Status: Ready for Architecture Phase*
*Target Test Coverage: 80%+*