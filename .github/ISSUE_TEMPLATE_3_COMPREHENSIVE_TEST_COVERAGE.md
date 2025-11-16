# [TESTING] Establish Comprehensive Test Coverage - Backend, Mobile, & Edge Functions

## 🎯 Issue Overview

**Priority:** 🟡 HIGH
**Type:** Testing / Quality Assurance
**Component:** All (Backend API, Mobile App, Edge Functions, Database)
**Milestone:** Core Functionality
**Depends On:** Issue #1 (Backend Blockers), Issue #2 (AI Integration)
**Estimated Copilot Sessions:** 10-12

### Problem Statement
The repository claims "278 comprehensive tests with 88.76% function coverage" in the README, but reality check shows:
- ❌ Only 13 test files found in backend
- ❌ Only 2 test files found in mobile app
- ❌ No test files for edge functions
- ❌ No coverage reports generated
- ❌ Claimed metrics appear aspirational, not actual

### Current State
```bash
# Backend (vibestack-api)
├── __tests__/ (13 test files)
│   ├── services/ (6 service test files)
│   ├── middleware/ (1 middleware test)
│   └── routes/ (6 route test files)
└── coverage/ (empty directory)

# Mobile App (vibestack-app)
├── __tests__/ (2 test files)
│   └── services/AuthService.test.ts
└── No coverage directory

# Edge Functions (supabase/functions)
└── No test files at all ❌
```

### Desired State
- ✅ Backend coverage ≥80%
- ✅ Mobile app coverage ≥70%
- ✅ Edge functions coverage ≥75%
- ✅ 100% critical path coverage
- ✅ All tests passing in CI/CD
- ✅ Coverage reports generated
- ✅ Coverage badges in README

### Impact
- 🎯 Prevents production bugs
- 🎯 Enables confident refactoring
- 🎯 Improves code quality
- 🎯 Required for production readiness
- 🎯 Documentation through tests

---

## 🎓 Copilot Instructions

### Prerequisites
- ✅ Issue #1 (Backend Blockers) completed
- ✅ Issue #2 (AI Integration) completed
- ✅ Test frameworks installed (Vitest, Jest, React Native Testing Library)
- ✅ Understanding of testing best practices

### Context Setup for Copilot
```bash
# Open these files for Copilot context:
code vibestack-api/vitest.config.ts
code vibestack-api/src/__tests__/services/AuthService.test.ts
code vibestack-app/jest.config.js
code vibestack-app/src/__tests__/services/AuthService.test.ts
code vibestack-api/src/services/HabitService.ts
code vibestack-app/src/components/atoms/Button.tsx
```

### Copilot-Friendly Branch Name
```bash
git checkout -b test/comprehensive-coverage-all-components
```

---

## 📋 Task Breakdown

### Phase 1: Backend API Testing (vibestack-api)

#### Test Category 1: Service Layer Tests

**Services to Test:**
1. AuthService (`src/services/AuthService.ts`)
2. UserService (`src/services/UserService.ts`)
3. HabitService (`src/services/HabitService.ts`)
4. AnalyticsService (`src/services/AnalyticsService.ts`)
5. SocialService (`src/services/SocialService.ts`)
6. NotificationService (`src/services/NotificationService.ts`)

**Template Copilot Prompt (for HabitService):**
```typescript
// GitHub Copilot: Create comprehensive tests for HabitService
//
// File: vibestack-api/src/__tests__/services/HabitService.test.ts
//
// Service to test: ../src/services/HabitService.ts
//
// Test structure requirements:
// 1. Use Vitest (describe, it, expect, vi.mock)
// 2. Mock Supabase client using vi.mock('@supabase/supabase-js')
// 3. Follow London School TDD (mock all dependencies)
// 4. Reference test pattern from __tests__/services/AuthService.test.ts
//
// Test suites to create:
//
// describe('HabitService', () => {
//   describe('createHabit', () => {
//     // Test cases:
//     - Creates habit successfully with valid data
//     - Returns created habit with all fields
//     - Validates required fields (throws ValidationError)
//     - Checks user ownership/authorization
//     - Handles database errors gracefully
//     - Sanitizes user input
//     - Sets default values correctly
//     - Enforces habit limits per user
//   })
//
//   describe('getHabitById', () => {
//     - Returns habit when exists
//     - Returns null when not found
//     - Checks user ownership
//     - Throws AuthError for unauthorized access
//     - Handles database errors
//   })
//
//   describe('getUserHabits', () => {
//     - Returns all habits for user
//     - Returns empty array when no habits
//     - Filters by status (active/archived)
//     - Sorts by creation date
//     - Paginates results correctly
//     - Handles database errors
//   })
//
//   describe('updateHabit', () => {
//     - Updates habit successfully
//     - Returns updated habit
//     - Validates input data
//     - Checks ownership before update
//     - Handles partial updates
//     - Prevents updating immutable fields
//     - Handles database errors
//   })
//
//   describe('deleteHabit', () => {
//     - Deletes habit successfully (soft delete)
//     - Checks ownership before delete
//     - Returns success confirmation
//     - Handles non-existent habits
//     - Handles database errors
//   })
//
//   describe('recordHabitCompletion', () => {
//     - Records completion successfully
//     - Updates streak correctly
//     - Handles multiple completions same day
//     - Calculates statistics
//     - Triggers notifications if needed
//     - Handles database errors
//   })
//
//   describe('getHabitProgress', () => {
//     - Calculates progress correctly
//     - Returns completion rate
//     - Calculates current streak
//     - Calculates longest streak
//     - Handles habits with no completions
//     - Handles database errors
//   })
// })
//
// Testing best practices:
// - Each test should be independent (no shared state)
// - Use beforeEach for setup, afterEach for cleanup
// - Mock Supabase responses (both success and error)
// - Test both happy path and error paths
// - Use descriptive test names (should/when/given format)
// - Aim for 90%+ coverage of HabitService.ts
// - Use expect assertions liberally
// - Test edge cases (empty strings, null, undefined, etc.)
//
// Example mock setup:
// const mockSupabaseClient = {
//   from: vi.fn(() => ({
//     select: vi.fn().mockReturnThis(),
//     insert: vi.fn().mockReturnThis(),
//     update: vi.fn().mockReturnThis(),
//     delete: vi.fn().mockReturnThis(),
//     eq: vi.fn().mockReturnThis(),
//     single: vi.fn().mockResolvedValue({ data: mockHabit, error: null })
//   }))
// };

// @copilot-start
```

**Acceptance Criteria for Service Tests:**
- [ ] HabitService: 90%+ coverage, 40+ test cases
- [ ] AnalyticsService: 85%+ coverage, 30+ test cases
- [ ] SocialService: 85%+ coverage, 35+ test cases
- [ ] NotificationService: 85%+ coverage, 25+ test cases
- [ ] UserService: 90%+ coverage, 30+ test cases
- [ ] AuthService: Expand existing tests to 90%+ coverage
- [ ] All service tests pass
- [ ] All mocks properly configured
- [ ] No flaky tests

---

#### Test Category 2: Middleware Tests

**Middleware to Test:**
1. errorHandlingMiddleware (from Issue #1)
2. securityHeadersMiddleware (from Issue #1)
3. csrfProtectionMiddleware (from Issue #1)
4. authMiddleware (existing, expand coverage)
5. rateLimitMiddleware (if exists, or create and test)

**Note:** Issue #1 includes test creation for new middleware. This phase ensures 100% coverage.

**Copilot Prompt:**
```typescript
// GitHub Copilot: Expand middleware test coverage to 100%
//
// Review and enhance existing middleware tests
// Ensure every line, branch, and edge case is covered
// Add integration tests for middleware chain
//
// @copilot-enhance-coverage
```

**Acceptance Criteria:**
- [ ] All middleware tests at 100% coverage
- [ ] Integration tests for middleware chain
- [ ] All tests pass
- [ ] No gaps in error handling tests

---

#### Test Category 3: API Route/Controller Tests

**Routes to Test:**
1. `/api/auth/*` - Authentication routes
2. `/api/users/*` - User management routes
3. `/api/habits/*` - Habit CRUD routes
4. `/api/analytics/*` - Analytics routes
5. `/api/social/*` - Social feature routes
6. `/api/notifications/*` - Notification routes

**Template Copilot Prompt (for Habit Routes):**
```typescript
// GitHub Copilot: Create integration tests for habit API routes
//
// File: vibestack-api/src/__tests__/routes/habits.test.ts
//
// Test actual HTTP requests using Supertest
// Mock database but test full request/response cycle
//
// describe('POST /api/habits', () => {
//   - Returns 201 with created habit
//   - Returns 400 for invalid data
//   - Returns 401 without authentication
//   - Returns 422 for validation errors
//   - Returns 500 for database errors
//   - Sets correct response headers
//   - Returns proper JSON structure
// })
//
// describe('GET /api/habits', () => {
//   - Returns 200 with array of habits
//   - Returns 401 without authentication
//   - Filters by query parameters
//   - Paginates correctly
//   - Sorts correctly
// })
//
// describe('GET /api/habits/:id', () => {
//   - Returns 200 with habit
//   - Returns 404 for non-existent habit
//   - Returns 403 for unauthorized access
//   - Returns 401 without authentication
// })
//
// describe('PUT /api/habits/:id', () => {
//   - Returns 200 with updated habit
//   - Returns 400 for invalid data
//   - Returns 404 for non-existent habit
//   - Returns 403 for unauthorized access
// })
//
// describe('DELETE /api/habits/:id', () => {
//   - Returns 204 on successful delete
//   - Returns 404 for non-existent habit
//   - Returns 403 for unauthorized access
// })
//
// Use supertest to make actual HTTP requests
// Mock Supabase database calls
// Test authentication middleware integration
// Test error handling middleware integration

// @copilot-start
```

**Acceptance Criteria:**
- [ ] All auth routes tested (20+ test cases)
- [ ] All user routes tested (15+ test cases)
- [ ] All habit routes tested (30+ test cases)
- [ ] All analytics routes tested (15+ test cases)
- [ ] All social routes tested (25+ test cases)
- [ ] All notification routes tested (15+ test cases)
- [ ] All HTTP status codes tested
- [ ] All error responses tested
- [ ] Request validation tested
- [ ] Authentication/authorization tested
- [ ] Coverage ≥85% for route handlers

---

#### Test Category 4: Utility/Helper Tests

**Utilities to Test:**
- `src/utils/tokenCounter.ts` (from Issue #2)
- `src/utils/rateLimiter.ts` (from Issue #2)
- `src/utils/validation.ts` (if exists)
- `src/utils/logger.ts` (if exists)
- Any other helper functions

**Copilot Prompt:**
```typescript
// GitHub Copilot: Create tests for all utility functions
//
// For each utility:
// - Test all public functions
// - Test edge cases
// - Test error conditions
// - Aim for 100% coverage
//
// Example for logger.ts:
// - Test different log levels
// - Test log formatting
// - Test log transport (file, console)
// - Test error logging with stack traces

// @copilot-start
```

**Acceptance Criteria:**
- [ ] All utility functions tested
- [ ] 100% coverage for utilities
- [ ] Edge cases covered
- [ ] Performance tests for critical utils

---

### Phase 2: Mobile App Testing (vibestack-app)

#### Test Category 1: Service Layer Tests

**Services to Test:**
1. AuthService (`src/services/AuthService.ts`) - Expand existing
2. HabitService (`src/services/HabitService.ts`)
3. SyncEngine (`src/services/SyncEngine.ts`)
4. OfflineQueue (`src/services/OfflineQueue.ts`)
5. API client services

**Template Copilot Prompt:**
```typescript
// GitHub Copilot: Create comprehensive tests for mobile HabitService
//
// File: vibestack-app/src/__tests__/services/HabitService.test.ts
//
// Service to test: ../../src/services/HabitService.ts
//
// This is a React Native service with offline-first architecture
//
// Test requirements:
// 1. Use Jest (React Native default)
// 2. Mock WatermelonDB database
// 3. Mock AsyncStorage
// 4. Mock Supabase client
// 5. Mock NetInfo for offline/online detection
//
// Test suites:
//
// describe('HabitService', () => {
//   describe('createHabit (online)', () => {
//     - Creates habit in local DB
//     - Syncs to Supabase immediately
//     - Returns created habit
//     - Handles sync errors
//   })
//
//   describe('createHabit (offline)', () => {
//     - Creates habit in local DB
//     - Adds to sync queue
//     - Marks as pending sync
//     - Syncs when online
//   })
//
//   describe('updateHabit (online)', () => {
//     - Updates local DB
//     - Syncs to Supabase
//     - Handles conflicts
//   })
//
//   describe('updateHabit (offline)', () => {
//     - Updates local DB
//     - Queues sync operation
//     - Syncs when connection restored
//   })
//
//   describe('syncHabits', () => {
//     - Pulls server changes
//     - Pushes local changes
//     - Resolves conflicts (server wins)
//     - Updates last sync timestamp
//     - Handles sync failures
//   })
//
//   describe('getHabits', () => {
//     - Fetches from local DB (fast)
//     - Returns cached data immediately
//     - Syncs in background
//   })
//
//   describe('observeHabits', () => {
//     - Returns observable collection
//     - Updates reactively to DB changes
//     - Unsubscribes correctly
//   })
// })
//
// Mock WatermelonDB:
// jest.mock('@nozbe/watermelondb', () => ({
//   database: {
//     collections: {
//       get: jest.fn(() => ({
//         query: jest.fn(() => ({
//           fetch: jest.fn(),
//           observe: jest.fn()
//         })),
//         create: jest.fn(),
//         find: jest.fn()
//       }))
//     }
//   }
// }));

// @copilot-start
```

**Acceptance Criteria:**
- [ ] HabitService: 85%+ coverage, 40+ test cases
- [ ] SyncEngine: 80%+ coverage, 30+ test cases
- [ ] OfflineQueue: 85%+ coverage, 20+ test cases
- [ ] AuthService: Expand to 90%+ coverage
- [ ] All online/offline scenarios tested
- [ ] Conflict resolution tested
- [ ] All tests pass
- [ ] No flaky tests (async issues resolved)

---

#### Test Category 2: Component Tests

**Components to Test:**

**Atoms:**
- Button
- Input
- Card
- Text
- Icon
- Avatar
- Badge

**Molecules:**
- HabitCard
- StreakIndicator
- ProgressBar
- NotificationCard
- UserAvatar

**Organisms:**
- HabitList
- FriendsList
- ChallengeCard
- ChatInterface

**Template Copilot Prompt:**
```typescript
// GitHub Copilot: Create component tests using React Native Testing Library
//
// File: vibestack-app/src/__tests__/components/atoms/Button.test.tsx
//
// Component to test: ../../../src/components/atoms/Button.tsx
//
// Use React Native Testing Library (@testing-library/react-native)
//
// Test suites:
//
// describe('Button', () => {
//   describe('Rendering', () => {
//     - Renders with text prop
//     - Renders with children
//     - Applies correct variant styles (primary, secondary, outline)
//     - Applies size styles (small, medium, large)
//     - Shows loading state correctly
//     - Shows disabled state correctly
//   })
//
//   describe('Interactions', () => {
//     - Calls onPress when tapped
//     - Does not call onPress when disabled
//     - Does not call onPress when loading
//     - Handles long press
//     - Provides haptic feedback
//   })
//
//   describe('Accessibility', () => {
//     - Has accessible label
//     - Has correct accessibility role
//     - Has accessibility state (disabled, busy)
//     - Supports screen readers
//   })
//
//   describe('Visual States', () => {
//     - Shows loading spinner when loading
//     - Hides text when loading (optional)
//     - Changes opacity when pressed
//     - Applies disabled opacity
//   })
// })
//
// Testing patterns:
// import { render, fireEvent, screen } from '@testing-library/react-native';
//
// test('renders with text', () => {
//   render(<Button>Click me</Button>);
//   expect(screen.getByText('Click me')).toBeTruthy();
// });
//
// test('calls onPress when tapped', () => {
//   const onPress = jest.fn();
//   render(<Button onPress={onPress}>Click</Button>);
//   fireEvent.press(screen.getByText('Click'));
//   expect(onPress).toHaveBeenCalledTimes(1);
// });

// @copilot-start
```

**Acceptance Criteria:**
- [ ] All atom components tested (7 components, 10+ tests each)
- [ ] All molecule components tested (5 components, 15+ tests each)
- [ ] All organism components tested (4 components, 20+ tests each)
- [ ] Rendering tests for all components
- [ ] Interaction tests (press, swipe, scroll)
- [ ] Accessibility tests for all components
- [ ] Props validation tests
- [ ] Coverage ≥75% for components
- [ ] All tests pass
- [ ] Snapshots for visual regression

---

#### Test Category 3: Screen/Integration Tests

**Screens to Test:**
1. LoginScreen
2. SignUpScreen
3. HomeScreen
4. HabitsScreen
5. SocialScreen
6. ProfileScreen
7. AvatarChatScreen

**Template Copilot Prompt:**
```typescript
// GitHub Copilot: Create integration tests for HabitsScreen
//
// File: vibestack-app/src/__tests__/screens/HabitsScreen.test.tsx
//
// Screen to test: ../../src/screens/HabitsScreen.tsx
//
// Integration test requirements:
// 1. Mock navigation (React Navigation)
// 2. Mock Redux store
// 3. Mock HabitService
// 4. Render full screen with providers
//
// Test suites:
//
// describe('HabitsScreen', () => {
//   describe('Initial Render', () => {
//     - Shows loading state initially
//     - Fetches habits on mount
//     - Displays list of habits
//     - Shows empty state when no habits
//   })
//
//   describe('User Interactions', () => {
//     - Navigates to create habit on FAB press
//     - Navigates to habit detail on habit press
//     - Marks habit complete on check press
//     - Shows completion animation
//     - Updates streak on completion
//   })
//
//   describe('Filtering & Sorting', () => {
//     - Filters by active/archived
//     - Sorts by name/date/streak
//     - Search filters habits
//   })
//
//   describe('Offline Behavior', () => {
//     - Shows offline indicator
//     - Allows creating habits offline
//     - Queues sync operations
//     - Shows sync status
//   })
//
//   describe('Error Handling', () => {
//     - Shows error message on fetch failure
//     - Allows retry on error
//     - Falls back to cached data
//   })
// })
//
// Test setup:
// const mockStore = configureStore({
//   reducer: { habits: habitsReducer },
//   preloadedState: { habits: mockHabitsState }
// });
//
// const renderWithProviders = (component) => {
//   return render(
//     <Provider store={mockStore}>
//       <NavigationContainer>
//         {component}
//       </NavigationContainer>
//     </Provider>
//   );
// };

// @copilot-start
```

**Acceptance Criteria:**
- [ ] All 7 screens tested
- [ ] Navigation flows tested
- [ ] Redux integration tested
- [ ] Service integration tested
- [ ] User interactions tested
- [ ] Error states tested
- [ ] Loading states tested
- [ ] Empty states tested
- [ ] Coverage ≥70% for screens
- [ ] All tests pass

---

### Phase 3: Edge Functions Testing (supabase/functions)

**Edge Functions to Test:**
1. avatar-chat
2. analyze-behavior
3. assign-habit
4. challenge-operations
5. generate-content
6. habit-checkin

**Note:** Deno uses different testing framework

**Setup Copilot Prompt:**
```typescript
// GitHub Copilot: Set up Deno testing infrastructure for Supabase Edge Functions
//
// Create: supabase/functions/deno.json
//
// Configure Deno test settings:
// {
//   "tasks": {
//     "test": "deno test --allow-all",
//     "test:coverage": "deno test --allow-all --coverage=coverage"
//   },
//   "imports": {
//     "@supabase/supabase-js": "npm:@supabase/supabase-js@^2.50.0",
//     "@std/testing": "jsr:@std/testing@^0.220.0"
//   }
// }

// @copilot-create-deno-config
```

**Template Copilot Prompt (for avatar-chat tests):**
```typescript
// GitHub Copilot: Create Deno tests for avatar-chat edge function
//
// File: supabase/functions/__tests__/avatar-chat.test.ts
//
// Function to test: ../avatar-chat/index.ts
//
// Use Deno testing:
// import { assertEquals, assertExists } from "@std/testing/asserts";
//
// Test suites:
//
// Deno.test("avatar-chat - successful conversation", async () => {
//   // Mock Supabase client
//   // Mock OpenAI/Anthropic client
//   // Call function with valid input
//   // Assert response format
//   // Assert personality used correctly
//   // Assert conversation saved to DB
// });
//
// Deno.test("avatar-chat - handles authentication error", async () => {
//   // Test without auth header
//   // Assert 401 response
// });
//
// Deno.test("avatar-chat - validates input", async () => {
//   // Test with missing required fields
//   // Assert 400 response with error message
// });
//
// Deno.test("avatar-chat - handles LLM API errors", async () => {
//   // Mock LLM API failure
//   // Assert graceful error handling
//   // Assert fallback message returned
// });
//
// Deno.test("avatar-chat - content moderation", async () => {
//   // Send inappropriate message
//   // Assert message blocked
//   // Assert violation logged
// });
//
// Deno.test("avatar-chat - rate limiting", async () => {
//   // Make multiple rapid requests
//   // Assert rate limit enforced
//   // Assert 429 response
// });
//
// Deno.test("avatar-chat - cost tracking", async () => {
//   // Make request
//   // Assert cost recorded in database
//   // Assert token count accurate
// });
//
// Deno.test("avatar-chat - context management", async () => {
//   // Send multiple messages
//   // Assert conversation context included
//   // Assert context limited to last 5 messages
// });

// @copilot-start
```

**Acceptance Criteria:**
- [ ] All 6 edge functions have test files
- [ ] Each function has 10+ test cases
- [ ] Authentication tested
- [ ] Input validation tested
- [ ] LLM integration tested (mocked)
- [ ] Database operations tested (mocked)
- [ ] Error handling tested
- [ ] Rate limiting tested
- [ ] Cost tracking tested
- [ ] Coverage ≥75% for each function
- [ ] All tests pass with Deno test runner

---

### Phase 4: Database/Migration Testing

**Create:** `supabase/tests/database.test.sql`

**Copilot Prompt:**
```sql
-- GitHub Copilot: Create database tests using pgTAP
--
-- File: supabase/tests/database.test.sql
--
-- Test requirements:
-- 1. Test all migrations apply successfully
-- 2. Test all tables exist with correct schemas
-- 3. Test all RLS policies work correctly
-- 4. Test all indexes exist
-- 5. Test all triggers function correctly
-- 6. Test all foreign key constraints
-- 7. Test data integrity rules
--
-- Example tests:
--
-- BEGIN;
-- SELECT plan(50); -- Number of tests
--
-- -- Test table existence
-- SELECT has_table('public', 'users', 'Users table exists');
-- SELECT has_table('public', 'habits', 'Habits table exists');
--
-- -- Test columns
-- SELECT has_column('public', 'habits', 'id', 'Habits has id column');
-- SELECT col_type_is('public', 'habits', 'id', 'uuid', 'Habit id is uuid');
--
-- -- Test RLS policies
-- SELECT policies_are('public', 'habits', ARRAY[
--   'Users can view own habits',
--   'Users can create own habits',
--   'Users can update own habits',
--   'Users can delete own habits'
-- ]);
--
-- -- Test RLS enforcement
-- SELECT rls_enabled('public', 'habits', 'RLS enabled on habits');
--
-- -- Test indexes
-- SELECT has_index('public', 'habits', 'habits_user_id_idx', 'Index on user_id');
--
-- -- Test functions
-- SELECT has_function('public', 'check_ai_budget', 'Budget check function exists');
--
-- SELECT * FROM finish();
-- ROLLBACK;

-- @copilot-start
```

**Acceptance Criteria:**
- [ ] All migrations tested
- [ ] All tables tested
- [ ] All RLS policies tested
- [ ] All indexes verified
- [ ] All triggers tested
- [ ] All functions tested
- [ ] Tests run in CI/CD
- [ ] All database tests pass

---

### Phase 5: Coverage Configuration & Reporting

#### Backend Coverage
**File:** `vibestack-api/vitest.config.ts` (UPDATE)

**Copilot Prompt:**
```typescript
// GitHub Copilot: Configure Vitest coverage with strict thresholds
//
// Update vitest.config.ts to add coverage configuration:
//
// export default defineConfig({
//   test: {
//     // existing config...
//     coverage: {
//       provider: 'v8', // or 'istanbul'
//       reporter: ['text', 'json', 'html', 'lcov'],
//       reportsDirectory: './coverage',
//       exclude: [
//         'node_modules/',
//         'dist/',
//         '**/*.test.ts',
//         '**/*.spec.ts',
//         '**/types/',
//         '**/__tests__/'
//       ],
//       thresholds: {
//         global: {
//           statements: 80,
//           branches: 80,
//           functions: 80,
//           lines: 80
//         },
//         // Stricter for critical files
//         './src/middleware/': {
//           statements: 90,
//           branches: 90,
//           functions: 90,
//           lines: 90
//         },
//         './src/services/': {
//           statements: 85,
//           branches: 80,
//           functions: 85,
//           lines: 85
//         }
//       }
//     }
//   }
// });

// @copilot-configure-coverage
```

#### Mobile Coverage
**File:** `vibestack-app/jest.config.js` (UPDATE)

**Copilot Prompt:**
```javascript
// GitHub Copilot: Configure Jest coverage for React Native
//
// Update jest.config.js to add coverage configuration:
//
// module.exports = {
//   // existing config...
//   collectCoverage: true,
//   coverageDirectory: './coverage',
//   coverageReporters: ['text', 'json', 'html', 'lcov'],
//   collectCoverageFrom: [
//     'src/**/*.{ts,tsx}',
//     '!src/**/*.test.{ts,tsx}',
//     '!src/**/*.spec.{ts,tsx}',
//     '!src/**/__tests__/**',
//     '!src/types/**'
//   ],
//   coverageThresholds: {
//     global: {
//       statements: 70,
//       branches: 70,
//       functions: 70,
//       lines: 70
//     },
//     './src/services/': {
//       statements: 80,
//       branches: 75,
//       functions: 80,
//       lines: 80
//     }
//   }
// };

// @copilot-configure-jest-coverage
```

**Acceptance Criteria:**
- [ ] Coverage thresholds configured
- [ ] HTML reports generated
- [ ] LCOV reports for CI/CD
- [ ] Coverage badges configured
- [ ] Thresholds enforce quality gates

---

### Phase 6: CI/CD Test Integration

**File:** `.github/workflows/test.yml` (NEW FILE)

**Copilot Prompt:**
```yaml
# GitHub Copilot: Create comprehensive CI/CD test workflow
#
# File: .github/workflows/test.yml
#
# Workflow requirements:
# 1. Run on every PR and push to main
# 2. Test backend API (Vitest)
# 3. Test mobile app (Jest)
# 4. Test edge functions (Deno)
# 5. Test database migrations
# 6. Generate and upload coverage reports
# 7. Fail if coverage below thresholds
# 8. Comment coverage report on PR
# 9. Upload coverage to Codecov
#
# Jobs:
# - backend-tests
# - mobile-tests
# - edge-function-tests
# - database-tests
# - coverage-report
#
# @copilot-create-test-workflow
```

**Acceptance Criteria:**
- [ ] GitHub Actions workflow created
- [ ] All test suites run in CI/CD
- [ ] Coverage reports uploaded
- [ ] PR comments with coverage
- [ ] Badges in README
- [ ] Workflow passes on main branch

---

## ✅ Overall Acceptance Criteria

### Coverage Targets
- [ ] Backend API: ≥80% overall, ≥90% for middleware
- [ ] Mobile App: ≥70% overall, ≥80% for services
- [ ] Edge Functions: ≥75% overall
- [ ] Database: All migrations and policies tested

### Test Count (Actual vs Claimed)
- [ ] Backend: 200+ tests (vs claimed 278)
- [ ] Mobile: 150+ tests (vs claimed 0)
- [ ] Edge Functions: 60+ tests (vs claimed 0)
- [ ] **Total: 410+ tests** (vs claimed 278)

### Code Quality
- [ ] No failing tests
- [ ] No skipped tests
- [ ] No flaky tests (run 10 times, all pass)
- [ ] All tests have clear descriptions
- [ ] All mocks properly cleaned up
- [ ] No memory leaks in tests

### CI/CD
- [ ] All tests run on every PR
- [ ] Coverage reports generated
- [ ] Coverage thresholds enforced
- [ ] PR comments with coverage delta
- [ ] Badges show accurate coverage

### Documentation
- [ ] Testing guide created
- [ ] Coverage badges in README
- [ ] Instructions for running tests locally
- [ ] Instructions for debugging failing tests

---

## 🔍 Validation Commands

```bash
# Backend Tests
cd vibestack-api
npm run test
npm run test:coverage
# Check coverage/index.html - should show ≥80%

# Mobile Tests
cd ../vibestack-app
npm run test
npm run test:coverage
# Check coverage/index.html - should show ≥70%

# Edge Function Tests
cd ../supabase/functions
deno task test
deno task test:coverage

# Database Tests
cd ../supabase
npx supabase test db

# Run all tests (from root)
npm run test:all

# Check coverage thresholds
npm run test:coverage:check
# Should pass with all thresholds met

# CI/CD simulation (local)
act -j backend-tests
act -j mobile-tests
```

---

## 📊 Success Metrics

**Issue is complete when:**
- ✅ Backend coverage ≥80% (currently ~40%)
- ✅ Mobile coverage ≥70% (currently ~5%)
- ✅ Edge functions coverage ≥75% (currently 0%)
- ✅ 410+ total tests (vs claimed 278)
- ✅ All tests passing in CI/CD
- ✅ Coverage reports accurate and public
- ✅ README updated with accurate metrics
- ✅ No flaky tests
- ✅ 100% critical path coverage

**Expected Timeline:** 10-12 Copilot-assisted development sessions

---

## 🚀 Next Steps After Completion

Once this issue is resolved:
1. ✅ Codebase has reliable test coverage
2. ✅ Can refactor with confidence
3. ✅ Can catch regressions early
4. ✅ Ready for production deployment
5. ✅ Can implement TDD for new features
6. ✅ Can onboard new developers safely

---

## 📚 Reference Documentation

- Vitest: https://vitest.dev/
- React Native Testing Library: https://callstack.github.io/react-native-testing-library/
- Deno Testing: https://deno.land/manual/testing
- pgTAP: https://pgtap.org/
- Jest: https://jestjs.io/
- Supertest: https://github.com/visionmedia/supertest

---

## 🐛 Troubleshooting

### If tests fail:
1. **Read error message carefully**
2. **Check mocks** - Ensure mocks match actual interfaces
3. **Check async handling** - Use await properly
4. **Check cleanup** - afterEach should reset mocks
5. **Run single test** - Isolate the issue

### If coverage is low:
1. **Identify uncovered files** - Check coverage report
2. **Add missing tests** - Focus on critical paths first
3. **Remove dead code** - Delete unused functions
4. **Check thresholds** - May need to adjust initially

### If tests are flaky:
1. **Check for timing issues** - Add proper waits
2. **Check for shared state** - Tests should be independent
3. **Check for random data** - Use deterministic test data
4. **Run multiple times** - Identify pattern

---

**Issue Labels:** `testing`, `high-priority`, `backend`, `mobile`, `edge-functions`, `quality`, `milestone: core functionality`

**Assignees:** (Assign to yourself or team member)

**Projects:** VibeStack Production Readiness

**Milestone:** Core Functionality

**Depends On:** #1 (Backend Blockers), #2 (AI Integration)

---

**Created:** 2025-11-16
**Last Updated:** 2025-11-16
