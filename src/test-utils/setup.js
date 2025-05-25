// Test utilities and setup for VibeStack integration testing
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Mock database for testing
class MockDatabase {
  constructor() {
    this.users = new Map();
    this.sessions = new Map();
    this.relationships = new Map();
    this.activities = new Map();
    this.clear();
  }

  clear() {
    this.users.clear();
    this.sessions.clear();
    this.relationships.clear();
    this.activities.clear();
    this.idCounter = 1;
  }

  // User operations
  async createUser(userData) {
    const user = {
      id: this.idCounter++,
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.users.set(user.id, user);
    return user;
  }

  async findUserById(id) {
    return this.users.get(id) || null;
  }

  async findUserByEmail(email) {
    for (const user of this.users.values()) {
      if (user.email === email) return user;
    }
    return null;
  }

  async updateUser(id, updates) {
    const user = this.users.get(id);
    if (!user) return null;
    
    const updatedUser = {
      ...user,
      ...updates,
      updatedAt: new Date()
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Session operations
  async createSession(sessionData) {
    const session = {
      id: `session_${this.idCounter++}`,
      ...sessionData,
      createdAt: new Date()
    };
    this.sessions.set(session.id, session);
    return session;
  }

  async findSession(sessionId) {
    return this.sessions.get(sessionId) || null;
  }

  async deleteSession(sessionId) {
    return this.sessions.delete(sessionId);
  }

  // Relationship operations
  async createRelationship(userId1, userId2, type = 'friend') {
    const relationshipId = `rel_${this.idCounter++}`;
    const relationship = {
      id: relationshipId,
      userId1,
      userId2,
      type,
      status: 'pending',
      createdAt: new Date()
    };
    this.relationships.set(relationshipId, relationship);
    return relationship;
  }

  async findRelationships(userId) {
    const relationships = [];
    for (const rel of this.relationships.values()) {
      if (rel.userId1 === userId || rel.userId2 === userId) {
        relationships.push(rel);
      }
    }
    return relationships;
  }
}

// Test fixtures and helpers
const testFixtures = {
  validUser: {
    email: 'test@example.com',
    password: 'Test123!@#',
    username: 'testuser',
    displayName: 'Test User',
    dateOfBirth: '1990-01-01',
    interests: ['gaming', 'music']
  },
  
  anotherUser: {
    email: 'another@example.com',
    password: 'Another123!@#',
    username: 'anotheruser',
    displayName: 'Another User',
    dateOfBirth: '1992-05-15',
    interests: ['sports', 'movies']
  },
  
  invalidUser: {
    email: 'invalid-email',
    password: '123',
    username: 'a',
    displayName: '',
    dateOfBirth: '2020-01-01'
  }
};

// Test helpers
const testHelpers = {
  // Create authenticated user with token
  async createAuthenticatedUser(db, userData = testFixtures.validUser) {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const user = await db.createUser({
      ...userData,
      password: hashedPassword
    });
    
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
    
    const session = await db.createSession({
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 3600000)
    });
    
    return { user, token, session };
  },
  
  // Create mock request object
  createMockRequest: (overrides = {}) => ({
    headers: {},
    body: {},
    params: {},
    query: {},
    user: null,
    session: null,
    ...overrides
  }),
  
  // Create mock response object with Express-like interface
  createMockResponse: () => {
    const res = {
      statusCode: 200,
      headers: {},
      data: null,
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      json: function(data) {
        this.data = data;
        return this;
      },
      setHeader: function(name, value) {
        this.headers[name] = value;
        return this;
      },
      // Add Express-like header method (alias for setHeader)
      header: function(name, value) {
        this.headers[name] = value;
        return this;
      }
    };
    return res;
  },
  
  // Create mock next function
  createMockNext: () => jest.fn(),
  
  // Wait for async operations
  waitFor: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Extract validation errors
  extractValidationErrors: (error) => {
    if (error.details && Array.isArray(error.details)) {
      return error.details.map(detail => ({
        field: detail.context?.key,
        message: detail.message
      }));
    }
    return [];
  }
};

// Environment setup
const setupTestEnvironment = () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-secret';
  process.env.RATE_LIMIT_WINDOW_MS = '60000';
  process.env.RATE_LIMIT_MAX_REQUESTS = '100';
  
  // Mock console methods in test
  const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn
  };
  
  beforeAll(() => {
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
  });
  
  afterAll(() => {
    console.log = originalConsole.log;
    console.error = originalConsole.error;
    console.warn = originalConsole.warn;
  });
};

// Integration test utilities
const integrationHelpers = {
  // Test complete authentication flow
  async testAuthenticationFlow(authService, userService, db) {
    const userData = { ...testFixtures.validUser };
    
    // Register
    const registerResult = await authService.register(userData);
    expect(registerResult.user).toBeDefined();
    expect(registerResult.token).toBeDefined();
    
    // Login
    const loginResult = await authService.login(userData.email, userData.password);
    expect(loginResult.user.email).toBe(userData.email);
    expect(loginResult.token).toBeDefined();
    
    // Verify token
    const decoded = await authService.verifyToken(loginResult.token);
    expect(decoded.userId).toBe(loginResult.user.id);
    
    // Get user profile
    const profile = await userService.getUserProfile(loginResult.user.id);
    expect(profile.email).toBe(userData.email);
    
    return { user: loginResult.user, token: loginResult.token };
  },
  
  // Test API request flow
  async testAPIRequestFlow(apiRoutes, method, path, authToken, body = null) {
    const req = testHelpers.createMockRequest({
      method,
      path,
      headers: authToken ? { authorization: `Bearer ${authToken}` } : {},
      body
    });
    
    const res = testHelpers.createMockResponse();
    const next = testHelpers.createMockNext();
    
    // Process through middleware chain
    await apiRoutes.processRequest(req, res, next);
    
    return { req, res, next };
  },
  
  // Test security middleware chain
  async testSecurityChain(securityMiddleware, req, res, next) {
    const middlewares = [
      securityMiddleware.helmet(),
      securityMiddleware.validateInput(),
      securityMiddleware.authenticate(),
      securityMiddleware.rateLimit()
    ];
    
    for (const middleware of middlewares) {
      await middleware(req, res, next);
      if (res.statusCode !== 200 || next.mock?.calls.length === 0) {
        break;
      }
    }
    
    return { req, res, next };
  }
};

// Export all utilities
module.exports = {
  MockDatabase,
  testFixtures,
  testHelpers,
  setupTestEnvironment,
  integrationHelpers
};