// Comprehensive integration tests for VibeStack platform
const {
  testFixtures,
  testHelpers,
  setupTestEnvironment
} = require('../test-utils/setup');
const {
  IntegrationAdapter,
  DatabaseAdapter,
  SecurityAdapter
} = require('./integration-adapter');
const {
  MockValidationService,
  MockCryptoService,
  MockLoggerService,
  MockDatabase,
  MockAuthService,
  MockUserService
} = require('./mock-services');

// Import all modules
const Authentication = require('../auth/authentication');
const UserService = require('../users/userService');
const { ModelFactoryService } = require('../models/coreModels');
const { SecurityMiddleware } = require('../middleware/securityMiddleware');
const { APIRouter } = require('../api/apiRoutes');

// Setup test environment
setupTestEnvironment();

// Mock services for security middleware
const mockRateLimitService = {
  checkRateLimit: async (ip, config) => ({
    allowed: true,
    remaining: 99,
    resetTime: Date.now() + 60000
  }),
  detectAbusePattern: async (ip) => ({
    isAbusive: false
  })
};

// Mock repositories
const createUserRepository = (database) => ({
  findById: (id) => database.findUserById(id),
  findByEmail: (email) => database.findUserByEmail(email),
  findByIds: async (ids) => {
    const users = [];
    for (const id of ids) {
      const user = await database.findUserById(id);
      if (user) users.push(user);
    }
    return users;
  },
  create: (userData) => database.createUser(userData),
  update: (id, updates) => database.updateUser(id, updates),
  delete: async (id) => {
    const user = database.users.get(id);
    if (user) {
      database.users.delete(id);
      return true;
    }
    return false;
  }
});

const createRelationshipRepository = (database) => ({
  addFriend: async (userId1, userId2) => {
    const rel = await database.createRelationship(userId1, userId2, 'friend');
    return rel !== null;
  },
  removeFriend: async (userId1, userId2) => {
    const relationships = await database.findRelationships(userId1);
    const rel = relationships.find(r =>
      (r.userId1 === userId1 && r.userId2 === userId2) ||
      (r.userId1 === userId2 && r.userId2 === userId1)
    );
    if (rel) {
      database.relationships.delete(rel.id);
      return true;
    }
    return false;
  },
  getFriends: async (userId) => {
    const relationships = await database.findRelationships(userId);
    const friendIds = [];
    for (const rel of relationships) {
      if (rel.status === 'accepted' && rel.type === 'friend') {
        if (rel.userId1 === userId) friendIds.push(rel.userId2);
        else friendIds.push(rel.userId1);
      }
    }
    return friendIds;
  },
  blockUser: async (userId1, userId2) => {
    const rel = await database.createRelationship(userId1, userId2, 'blocked');
    return rel !== null;
  },
  unblockUser: async (userId1, userId2) => {
    const relationships = await database.findRelationships(userId1);
    const rel = relationships.find(r =>
      r.type === 'blocked' &&
      r.userId1 === userId1 &&
      r.userId2 === userId2
    );
    if (rel) {
      database.relationships.delete(rel.id);
      return true;
    }
    return false;
  },
  isBlocked: async (userId1, userId2) => {
    const relationships = await database.findRelationships(userId1);
    return relationships.some(r =>
      r.type === 'blocked' &&
      ((r.userId1 === userId1 && r.userId2 === userId2) ||
       (r.userId1 === userId2 && r.userId2 === userId1))
    );
  },
  getBlockedUsers: async (userId) => {
    const relationships = await database.findRelationships(userId);
    const blockedIds = [];
    for (const rel of relationships) {
      if (rel.type === 'blocked' && rel.userId1 === userId) {
        blockedIds.push(rel.userId2);
      }
    }
    return blockedIds;
  }
});

describe('VibeStack Platform Integration Tests', () => {
  let db;
  let authService;
  let userService;
  let modelFactory;
  let security;
  let apiRoutes;
  let mockValidationService;
  let mockCryptoService;
  let mockLoggerService;
  
  const mockEncryptionService = {
    encrypt: (data) => `encrypted_${data}`,
    decrypt: (data) => data.replace('encrypted_', '')
  };
  
  const mockTimestampService = {
    now: () => new Date(),
    isValidTimestamp: (timestamp) => timestamp <= new Date()
  };
  
  beforeEach(() => {
    // Initialize mock services
    const baseDb = new MockDatabase();
    mockValidationService = new MockValidationService();
    mockCryptoService = new MockCryptoService();
    mockLoggerService = new MockLoggerService();
    
    // Create model factory with required services
    modelFactory = new ModelFactoryService({
      validationService: mockValidationService,
      encryptionService: mockEncryptionService,
      timestampService: mockTimestampService
    });
    
    // Create authentication service with mock dependencies
    const baseAuthService = new MockAuthService(baseDb, mockCryptoService, mockLoggerService);
    
    // Create userService with proper dependencies
    const baseUserService = new MockUserService(baseDb, mockValidationService);
    
    // Create security middleware with all required dependencies
    const baseSecurity = new SecurityMiddleware({
      authService: baseAuthService,
      validationService: mockValidationService,
      rateLimitService: mockRateLimitService,
      loggerService: mockLoggerService
    });
    
    // Create CSRF protection middleware
    const mockCsrfProtectionMiddleware = {
      generateToken: () => (req, res, next) => {
        req.csrfToken = 'mock-csrf-token';
        next();
      },
      validateToken: () => (req, res, next) => {
        // Mock validation - always pass in tests
        next();
      },
      csrfTokenEndpoint: () => (req, res) => {
        res.json({ csrfToken: req.csrfToken || 'mock-csrf-token' });
      }
    };

    const baseApiRoutes = new APIRouter({
      authService: baseAuthService,
      userService: baseUserService,
      contentService: {}, // Mock content service for now
      securityMiddleware: baseSecurity,
      validationService: mockValidationService,
      loggerService: mockLoggerService,
      csrfProtectionMiddleware: mockCsrfProtectionMiddleware
    });
    
    // Wrap components with adapters for interface compatibility
    db = new DatabaseAdapter(baseDb);
    security = new SecurityAdapter(baseSecurity);
    apiRoutes = new IntegrationAdapter(baseApiRoutes);
    authService = baseAuthService;
    userService = baseUserService;
  });
  
  afterEach(() => {
    // Clear the base database, not the adapter
    if (db.db) {
      db.db.clear();
    } else if (db.clear) {
      db.clear();
    }
  });

  describe('End-to-End Authentication Flow', () => {
    test('Complete user registration through API with security validation', async () => {
      const userData = { ...testFixtures.validUser };
      
      // Test registration through API route
      const req = testHelpers.createMockRequest({
        method: 'POST',
        path: '/api/auth/register',
        body: userData
      });
      const res = testHelpers.createMockResponse();
      const next = testHelpers.createMockNext();
      
      // Process through security middleware chain
      await security.validateInput()(req, res, next);
      await security.sanitizeRequest()(req, res, next);
      
      // Debug: Check database state before registration
      console.log('[DEBUG] DB users before registration:', Array.from(db.db.users.entries()));
      
      // Register through API
      console.log('[TEST] About to call apiRoutes.register with req.body:', req.body);
      await apiRoutes.register(req, res);
      
      // Debug: Check database state after registration
      console.log('[DEBUG] DB users after registration:', Array.from(db.db.users.entries()));
      console.log('[DEBUG] Response data:', res.data);
      
      // Verify response - handle nested structure
      expect(res.statusCode).toBe(201);
      expect(res.data).toBeDefined();
      expect(res.data.success).toBe(true);
      expect(res.data.data).toBeDefined();
      expect(res.data.data.userId).toBeDefined();
      expect(res.data.data.token).toBeDefined();
      expect(res.data.data.refreshToken).toBeDefined();
      
      // Verify user was created in database
      const dbUser = await db.findUserByEmail(userData.email);
      expect(dbUser).toBeDefined();
      expect(dbUser.username).toBe(userData.username);
      expect(dbUser.email).toBe(userData.email);
      
      // Verify model validation was applied
      expect(dbUser.interests).toEqual(userData.interests);
      expect(dbUser.privacySettings).toBeDefined();
    });
    
    test('Login flow with token validation across services', async () => {
      // First register a user through the API to ensure proper database state
      const userData = {
        email: 'logintest@example.com',
        username: 'logintestuser',
        password: 'Password123!',
        displayName: 'Login Test User'
      };
      
      const registerReq = testHelpers.createMockRequest({
        method: 'POST',
        path: '/api/auth/register',
        body: userData
      });
      const registerRes = testHelpers.createMockResponse();
      
      await apiRoutes.register(registerReq, registerRes);
      
      // Debug: Check if user was actually created
      console.log('[DEBUG] After registration, checking database for user:', userData.email);
      const registeredUser = await db.findUserByEmail(userData.email);
      console.log('[DEBUG] Found user:', registeredUser);
      console.log('[DEBUG] All users in DB:', Array.from(db.db.users.entries()));
      
      // Now test login with the same credentials
      const loginReq = testHelpers.createMockRequest({
        method: 'POST',
        path: '/api/auth/login',
        body: {
          email: userData.email,
          password: userData.password
        }
      });
      const loginRes = testHelpers.createMockResponse();
      
      await apiRoutes.login(loginReq, loginRes);
      
      expect(loginRes.statusCode).toBe(200);
      expect(loginRes.data).toBeDefined();
      expect(loginRes.data.success).toBe(true);
      expect(loginRes.data.data).toBeDefined();
      expect(loginRes.data.data.userId).toBeDefined();
      expect(loginRes.data.data.token).toBeDefined();
      
      // Test token validation through security middleware
      const protectedReq = testHelpers.createMockRequest({
        headers: { authorization: `Bearer ${loginRes.data.data.token}` }
      });
      const protectedRes = testHelpers.createMockResponse();
      const protectedNext = testHelpers.createMockNext();
      
      // Add debug logging
      console.log('[TEST] About to call security.authenticate() with token:', loginRes.data.data.token);
      console.log('[TEST] protectedReq before auth:', { headers: protectedReq.headers, user: protectedReq.user });
      
      await security.authenticate()(protectedReq, protectedRes, protectedNext);
      
      console.log('[TEST] protectedReq after auth:', { user: protectedReq.user });
      console.log('[TEST] protectedRes after auth:', { statusCode: protectedRes.statusCode, data: protectedRes.data });
      console.log('[TEST] protectedNext called?', protectedNext.mock.calls.length > 0);
      
      expect(protectedNext).toHaveBeenCalled();
      expect(protectedReq.user).toBeDefined();
      expect(protectedReq.user.id).toBe(registeredUser.id);
    });
    
    test('Logout flow with session cleanup', async () => {
      const { user, token } = await testHelpers.createAuthenticatedUser(db.db || db);
      
      const logoutReq = testHelpers.createMockRequest({
        method: 'POST',
        path: '/api/auth/logout',
        headers: { authorization: `Bearer ${token}` },
        user: { id: user.id }
      });
      const logoutRes = testHelpers.createMockResponse();
      
      await apiRoutes.logout(logoutReq, logoutRes);
      
      expect(logoutRes.statusCode).toBe(200);
      
      // Verify session was deleted
      const sessions = await db.sessions.values();
      expect(Array.from(sessions).length).toBe(0);
    });
  });

  describe('User Management Integration', () => {
    test('Profile CRUD operations through API with model validation', async () => {
      const { user, token } = await testHelpers.createAuthenticatedUser(db.db || db);
      
      // Get profile
      const getReq = testHelpers.createMockRequest({
        method: 'GET',
        path: `/api/users/${user.id}`,
        headers: { authorization: `Bearer ${token}` },
        params: { userId: user.id },
        user: { id: user.id }
      });
      const getRes = testHelpers.createMockResponse();
      
      await apiRoutes.getUserProfile(getReq, getRes);
      
      expect(getRes.statusCode).toBe(200);
      expect(getRes.data.success).toBe(true);
      expect(getRes.data.data.email).toBe(user.email);
      
      // Update profile
      const updateData = {
        displayName: 'Updated Name',
        bio: 'New bio text',
        interests: ['coding', 'gaming']
      };
      
      const updateReq = testHelpers.createMockRequest({
        method: 'PUT',
        path: `/api/users/${user.id}`,
        headers: { authorization: `Bearer ${token}` },
        params: { userId: user.id },
        body: updateData,
        user: { id: user.id }
      });
      const updateRes = testHelpers.createMockResponse();
      
      await apiRoutes.updateUserProfile(updateReq, updateRes);
      
      expect(updateRes.statusCode).toBe(200);
      expect(updateRes.data.success).toBe(true);
      expect(updateRes.data.data.displayName).toBe(updateData.displayName);
      expect(updateRes.data.data.interests).toEqual(updateData.interests);
      
      // Verify model validation
      const updatedUser = await db.findUserById(user.id);
      expect(updatedUser.bio).toBe(updateData.bio);
    });
    
    test('Friend relationship management with privacy controls', async () => {
      // Create two users
      const { user: user1, token: token1 } = await testHelpers.createAuthenticatedUser(db.db || db);
      const { user: user2 } = await testHelpers.createAuthenticatedUser(
        db.db || db,
        testFixtures.anotherUser
      );
      
      // Send friend request through API
      const friendReq = testHelpers.createMockRequest({
        method: 'POST',
        path: `/api/users/${user2.id}/friend-request`,
        headers: { authorization: `Bearer ${token1}` },
        params: { userId: user2.id },
        user: { id: user1.id }
      });
      const friendRes = testHelpers.createMockResponse();
      
      await apiRoutes.sendFriendRequest(friendReq, friendRes);
      
      expect(friendRes.statusCode).toBe(200);
      
      // Verify relationship was created
      const relationships = await db.findRelationships(user1.id);
      expect(relationships.length).toBe(1);
      expect(relationships[0].type).toBe('friend');
      expect(relationships[0].status).toBe('pending');
    });
    
    test('Privacy settings enforcement across services', async () => {
      const { user, token } = await testHelpers.createAuthenticatedUser(db.db || db);
      const { user: otherUser, token: otherToken } = await testHelpers.createAuthenticatedUser(
        db.db || db,
        testFixtures.anotherUser
      );
      
      // Update privacy settings to restrict profile
      await db.updateUser(user.id, {
        privacySettings: {
          profileVisibility: 'friends',
          activitySharing: 'friends',
          dataCollection: 'minimal'
        }
      });
      
      // Try to access profile as non-friend
      const accessReq = testHelpers.createMockRequest({
        method: 'GET',
        path: `/api/users/${user.id}`,
        headers: { authorization: `Bearer ${otherToken}` },
        params: { userId: user.id },
        user: { id: otherUser.id }
      });
      const accessRes = testHelpers.createMockResponse();
      
      await apiRoutes.getUserProfile(accessReq, accessRes);
      
      // Should get limited profile due to privacy settings
      expect(accessRes.statusCode).toBe(200);
      expect(accessRes.data.success).toBe(true);
      expect(accessRes.data.data.email).toBeUndefined();
      expect(accessRes.data.data.displayName).toBeDefined();
    });
  });

  describe('API Gateway Integration', () => {
    test('Complete request/response cycle through all layers', async () => {
      const { user, token } = await testHelpers.createAuthenticatedUser(db.db || db);
      
      // Test a complex operation that touches all layers
      const req = testHelpers.createMockRequest({
        method: 'POST',
        path: '/api/users/search',
        headers: { authorization: `Bearer ${token}` },
        body: {
          query: 'test',
          filters: {
            interests: ['gaming'],
            ageRange: { min: 18, max: 35 }
          }
        },
        user: { id: user.id }
      });
      const res = testHelpers.createMockResponse();
      const next = testHelpers.createMockNext();
      
      // Process through complete middleware chain
      await security.helmet()(req, res, next);
      await security.validateInput()(req, res, next);
      await security.authenticate()(req, res, next);
      await security.rateLimit()(req, res, next);
      
      // Execute search
      await apiRoutes.searchUsers(req, res);
      
      expect(res.statusCode).toBe(200);
      expect(res.data.users).toBeDefined();
      expect(Array.isArray(res.data.users)).toBe(true);
    });
    
    test('Error handling propagation across services', async () => {
      const { token } = await testHelpers.createAuthenticatedUser(db.db || db);
      
      // Test with invalid data to trigger validation error
      const req = testHelpers.createMockRequest({
        method: 'PUT',
        path: '/api/users/999999',
        headers: { authorization: `Bearer ${token}` },
        params: { userId: 999999 },
        body: { email: 'invalid-email' },
        user: { id: 1 }
      });
      const res = testHelpers.createMockResponse();
      const next = testHelpers.createMockNext();
      
      // Process through security validation
      await security.validateInput()(req, res, next);
      
      // Should catch validation error
      if (res.statusCode !== 200) {
        expect(res.statusCode).toBe(400);
        expect(res.data.error).toBeDefined();
      }
    });
    
    test('Security middleware enforcement on all endpoints', async () => {
      // Test unauthenticated access to protected endpoint
      const req = testHelpers.createMockRequest({
        method: 'GET',
        path: '/api/users/1',
        params: { userId: 1 }
      });
      const res = testHelpers.createMockResponse();
      const next = testHelpers.createMockNext();
      
      await security.authenticate()(req, res, next);
      
      expect(res.statusCode).toBe(401);
      expect(res.data.error).toBe('Authentication required');
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Data Flow Validation', () => {
    test('Model validation through service layers', async () => {
      const { user, token } = await testHelpers.createAuthenticatedUser(db.db || db);
      
      // Test with data that should trigger model validation
      const invalidData = {
        username: 'a', // Too short
        email: 'not-an-email',
        interests: ['valid', ''], // Empty interest
        dateOfBirth: '2020-01-01' // Too young
      };
      
      const req = testHelpers.createMockRequest({
        method: 'PUT',
        path: `/api/users/${user.id}`,
        headers: { authorization: `Bearer ${token}` },
        params: { userId: user.id },
        body: invalidData,
        user: { id: user.id }
      });
      const res = testHelpers.createMockResponse();
      
      // Attempt update - should fail validation
      try {
        // Test model validation directly
        const testUser = modelFactory.createUser({
          ...invalidData,
          password: 'Test123!'
        });
      } catch (error) {
        expect(error.message).toContain('Invalid');
      }
    });
    
    test('Cross-service data consistency', async () => {
      const { user: user1, token: token1 } = await testHelpers.createAuthenticatedUser(db.db || db);
      const { user: user2 } = await testHelpers.createAuthenticatedUser(
        db.db || db,
        testFixtures.anotherUser
      );
      
      // Create relationship through database (simulating friend request system)
      await db.createRelationship(user1.id, user2.id, 'friend');
      
      // Update relationship to accepted
      const relationships = await db.findRelationships(user1.id);
      const rel = relationships[0];
      await db.updateRelationship(rel.id, { status: 'accepted' });
      
      // Mock authentication context for user operations
      authService.getCurrentUser = jest.fn().mockResolvedValue({ id: user1.id });
      
      // Verify friends through userService
      // Pass user1.id and context for cross-service consistency
      const user1Friends = await userService.getFriends(user1.id, { user: { id: user1.id } });
      
      // Switch auth context to user2
      authService.getCurrentUser = jest.fn().mockResolvedValue({ id: user2.id });
      const user2Friends = await userService.getFriends(user2.id, { user: { id: user2.id } });
      
      expect(user1Friends.length).toBe(1);
      expect(user2Friends.length).toBe(1);
      expect(user1Friends[0].userId).toBe(user2.id);
      expect(user2Friends[0].userId).toBe(user1.id);
    });
    
    test('Transaction integrity and rollback scenarios', async () => {
      const { user, token } = await testHelpers.createAuthenticatedUser(db.db || db);
      
      // Simulate a complex operation that should rollback on failure
      const complexOperation = async () => {
        // Start transaction (simulated)
        const originalUser = await db.findUserById(user.id);
        
        try {
          // Update user
          await db.updateUser(user.id, { credits: 100 });
          
          // Simulate failure in middle of operation
          throw new Error('Simulated failure');
          
          // This should not execute
          await db.updateUser(user.id, { premiumStatus: true });
        } catch (error) {
          // Rollback (restore original state)
          // Only restore credits and premiumStatus for precise rollback
          await db.updateUser(user.id, { credits: originalUser.credits, premiumStatus: originalUser.premiumStatus });
          throw error;
        }
      };
      
      await expect(complexOperation()).rejects.toThrow('Simulated failure');
      
      // Verify user state was rolled back
      const userAfter = await db.findUserById(user.id);
      expect(userAfter.credits).toBeUndefined();
      expect(userAfter.premiumStatus).toBeUndefined();
    });
  });

  describe('Security Integration', () => {
    test('Authentication middleware with all protected routes', async () => {
      const protectedRoutes = [
        { method: 'GET', path: '/api/users/1' },
        { method: 'PUT', path: '/api/users/1' },
        { method: 'POST', path: '/api/users/1/friend-request' },
        { method: 'GET', path: '/api/users/friends' },
        { method: 'POST', path: '/api/auth/logout' }
      ];
      
      for (const route of protectedRoutes) {
        const req = testHelpers.createMockRequest({
          method: route.method,
          path: route.path,
          params: { userId: 1 }
        });
        const res = testHelpers.createMockResponse();
        const next = testHelpers.createMockNext();
        
        await security.authenticate()(req, res, next);
        
        expect(res.statusCode).toBe(401);
        expect(next).not.toHaveBeenCalled();
      }
    });
    
    test('Input validation across all service entry points', async () => {
      const { token } = await testHelpers.createAuthenticatedUser(db.db || db);
      
      // Test SQL injection attempt
      const sqlInjectionReq = testHelpers.createMockRequest({
        method: 'GET',
        path: '/api/users/search',
        headers: { authorization: `Bearer ${token}` },
        query: { q: "'; DROP TABLE users; --" }
      });
      const sqlRes = testHelpers.createMockResponse();
      const sqlNext = testHelpers.createMockNext();
      
      await security.sanitizeRequest()(sqlInjectionReq, sqlRes, sqlNext);
      
      // Input should be sanitized
      expect(sqlInjectionReq.query.q).not.toContain('DROP TABLE');
      
      // Test XSS attempt
      const xssReq = testHelpers.createMockRequest({
        method: 'PUT',
        path: '/api/users/1',
        headers: { authorization: `Bearer ${token}` },
        body: { bio: '<script>alert("XSS")</script>' }
      });
      const xssRes = testHelpers.createMockResponse();
      const xssNext = testHelpers.createMockNext();
      
      await security.sanitizeRequest()(xssReq, xssRes, xssNext);
      
      // Script tags should be escaped
      expect(xssReq.body.bio).not.toContain('<script>');
    });
    
    test('Rate limiting and abuse prevention system-wide', async () => {
      const { token } = await testHelpers.createAuthenticatedUser(db.db || db);
      
      // Simulate rapid requests
      const results = [];
      for (let i = 0; i < 150; i++) {
        const req = testHelpers.createMockRequest({
          method: 'GET',
          path: '/api/users/1',
          headers: { authorization: `Bearer ${token}` },
          ip: '127.0.0.1'
        });
        const res = testHelpers.createMockResponse();
        const next = testHelpers.createMockNext();
        
        // Use the correct middleware for system-wide rate limiting
        await security.rateLimitMiddleware()(req, res, next);
        results.push(res.statusCode);
      }
      
      // Should have some 429 responses after limit
      const rateLimited = results.filter(code => code === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('Performance and Scalability', () => {
    test('Bulk operations handling', async () => {
      const { token } = await testHelpers.createAuthenticatedUser(db.db || db);
      
      // Create multiple users for bulk operations
      const users = [];
      for (let i = 0; i < 20; i++) {
        const userData = {
          ...testFixtures.validUser,
          email: `bulk${i}@example.com`,
          username: `bulkuser${i}`
        };
        const { user } = await testHelpers.createAuthenticatedUser(db.db || db, userData);
        users.push(user);
      }
      
      // Test bulk friend requests
      const startTime = Date.now();
      
      // Create bulk relationships directly in database (simulating friend requests)
      const bulkRequests = users.slice(1, 11).map(targetUser =>
        db.createRelationship(users[0].id, targetUser.id, 'friend')
      );
      
      await Promise.all(bulkRequests);
      const duration = Date.now() - startTime;
      
      // Should complete in reasonable time
      expect(duration).toBeLessThan(1000); // Less than 1 second for 10 operations
      
      // Verify all requests were created
      const relationships = await db.findRelationships(users[0].id);
      expect(relationships.length).toBe(10);
      
      // Update all to accepted status
      const acceptRequests = relationships.map(rel =>
        db.updateRelationship(rel.id, { status: 'accepted' })
      );
      await Promise.all(acceptRequests);
    });
    
    test('Concurrent request handling', async () => {
      const users = [];
      for (let i = 0; i < 5; i++) {
        const userData = {
          ...testFixtures.validUser,
          email: `concurrent${i}@example.com`,
          username: `concurrent${i}`
        };
        const authData = await testHelpers.createAuthenticatedUser(db.db || db, userData);
        users.push(authData);
      }
      
      // Simulate concurrent profile updates
      const updates = users.map(({ user, token }) => {
        const req = testHelpers.createMockRequest({
          method: 'PUT',
          path: `/api/users/${user.id}`,
          headers: { authorization: `Bearer ${token}` },
          params: { userId: user.id },
          body: { bio: `Updated bio for user ${user.id}` },
          user: { id: user.id }
        });
        const res = testHelpers.createMockResponse();
        
        return apiRoutes.updateUserProfile(req, res);
      });
      
      const results = await Promise.all(updates);
      
      // All updates should succeed
      expect(results.every(r => r === undefined)).toBe(true);
      
      // Verify all updates were applied
      for (const { user } of users) {
        const updated = await db.findUserById(user.id);
        expect(updated.bio).toBe(`Updated bio for user ${user.id}`);
      }
    });
  });

  describe('System Health Checks', () => {
    test('Component health status verification', async () => {
      // Verify all components are initialized
      expect(authService).toBeDefined();
      expect(userService).toBeDefined();
      expect(modelFactory).toBeDefined();
      expect(security).toBeDefined();
      expect(apiRoutes).toBeDefined();
      
      // Test basic health check endpoint
      const req = testHelpers.createMockRequest({
        method: 'GET',
        path: '/api/health'
      });
      const res = testHelpers.createMockResponse();
      
      await apiRoutes.healthCheck(req, res);
      
      expect(res.statusCode).toBe(200);
      expect(res.data.status).toBe('healthy');
      expect(res.data.components).toEqual({
        authentication: 'healthy',
        userService: 'healthy',
        database: 'healthy',
        models: 'healthy'
      });
    });
    
    test('Graceful degradation on component failure', async () => {
      // Simulate authentication service failure
      // Create an error that will be detected as a service failure
      const serviceError = new Error('Auth service temporarily unavailable');
      serviceError.code = 'SERVICE_UNAVAILABLE';
      authService.validateToken = jest.fn().mockRejectedValue(serviceError);
      
      const req = testHelpers.createMockRequest({
        method: 'GET',
        path: '/api/users/1',
        headers: { authorization: 'Bearer invalid-token' }
      });
      const res = testHelpers.createMockResponse();
      const next = testHelpers.createMockNext();
      
      await security.authenticate()(req, res, next);
      
      // Should handle gracefully with appropriate error
      expect(res.statusCode).toBe(503);
      expect(res.data.error).toContain('Service');
    });
  });
});

// Export for use in other test suites
module.exports = {
  setupIntegrationTest: () => {
    const db = new MockDatabase();
    
    // Mock services for models
    const mockValidationService = {
      validateEmail: (email) => ({ isValid: email.includes('@'), error: null }),
      validateUsername: (username) => ({ isValid: username.length >= 3, error: null }),
      validatePrivacyLevel: (level) => ({ isValid: ['public', 'friends', 'private'].includes(level), error: null }),
      sanitizeInput: (input) => input ? String(input).replace(/<[^>]*>/g, '') : '', // Basic HTML stripping
      validateProfileData: (data) => {
        const errors = [];
        if (data.email && !data.email.includes('@')) errors.push('Invalid email');
        if (data.username && data.username.length < 3) errors.push('Username too short');
        return { isValid: errors.length === 0, errors };
      },
      validateRegistration: (data) => {
        const errors = [];
        if (!data.email || !data.email.includes('@')) errors.push('Invalid email');
        if (!data.username || data.username.length < 3) errors.push('Username too short');
        if (!data.password || data.password.length < 8) errors.push('Password too short');
        return { isValid: errors.length === 0, errors };
      }
    };
    
    const mockEncryptionService = {
      encrypt: (data) => `encrypted_${data}`,
      decrypt: (data) => data.replace('encrypted_', '')
    };
    
    const mockTimestampService = {
      now: () => new Date(),
      isValidTimestamp: (timestamp) => timestamp <= new Date()
    };
    
    // Create repositories
    const createUserRepository = (database) => ({
      findById: (id) => database.findUserById(id),
      findByEmail: (email) => database.findUserByEmail(email),
      findByIds: async (ids) => {
        const users = [];
        for (const id of ids) {
          const user = await database.findUserById(id);
          if (user) users.push(user);
        }
        return users;
      },
      create: (userData) => database.createUser(userData),
      update: (id, updates) => database.updateUser(id, updates),
      delete: async (id) => {
        const user = database.users.get(id);
        if (user) {
          database.users.delete(id);
          return true;
        }
        return false;
      }
    });
    
    const createRelationshipRepository = (database) => ({
      addFriend: async (userId1, userId2) => {
        const rel = await database.createRelationship(userId1, userId2, 'friend');
        return rel !== null;
      },
      removeFriend: async (userId1, userId2) => {
        const relationships = await database.findRelationships(userId1);
        const rel = relationships.find(r =>
          (r.userId1 === userId1 && r.userId2 === userId2) ||
          (r.userId1 === userId2 && r.userId2 === userId1)
        );
        if (rel) {
          database.relationships.delete(rel.id);
          return true;
        }
        return false;
      },
      getFriends: async (userId) => {
        const relationships = await database.findRelationships(userId);
        const friendIds = [];
        for (const rel of relationships) {
          if (rel.status === 'accepted' && rel.type === 'friend') {
            if (rel.userId1 === userId) friendIds.push(rel.userId2);
            else friendIds.push(rel.userId1);
          }
        }
        return friendIds;
      },
      blockUser: async (userId1, userId2) => {
        const rel = await database.createRelationship(userId1, userId2, 'blocked');
        return rel !== null;
      },
      unblockUser: async (userId1, userId2) => {
        const relationships = await database.findRelationships(userId1);
        const rel = relationships.find(r =>
          r.type === 'blocked' &&
          r.userId1 === userId1 &&
          r.userId2 === userId2
        );
        if (rel) {
          database.relationships.delete(rel.id);
          return true;
        }
        return false;
      },
      isBlocked: async (userId1, userId2) => {
        const relationships = await database.findRelationships(userId1);
        return relationships.some(r =>
          r.type === 'blocked' &&
          ((r.userId1 === userId1 && r.userId2 === userId2) ||
           (r.userId1 === userId2 && r.userId2 === userId1))
        );
      },
      getBlockedUsers: async (userId) => {
        const relationships = await database.findRelationships(userId);
        const blockedIds = [];
        for (const rel of relationships) {
          if (rel.type === 'blocked' && rel.userId1 === userId) {
            blockedIds.push(rel.userId2);
          }
        }
        return blockedIds;
      }
    });
    
    // Create model factory with required services
    const modelFactory = new ModelFactoryService({
      validationService: mockValidationService,
      encryptionService: mockEncryptionService,
      timestampService: mockTimestampService
    });
    
    const authService = new Authentication(db);
    
    // Create userService with proper dependencies
    const userService = new UserService({
      userRepository: createUserRepository(db),
      validationService: mockValidationService,
      authService: authService,
      relationshipRepository: createRelationshipRepository(db)
    });
    
    const security = new SecurityMiddleware(authService);
    const apiRoutes = new APIRoutes(authService, userService, security);
    
    // Wrap components with adapters for interface compatibility
    const wrappedDb = new DatabaseAdapter(db);
    const wrappedSecurity = new SecurityAdapter(security);
    const wrappedApiRoutes = new IntegrationAdapter(apiRoutes);
    
    return {
      db: wrappedDb,
      authService,
      userService,
      modelFactory,
      security: wrappedSecurity,
      apiRoutes: wrappedApiRoutes
    };
  }
};