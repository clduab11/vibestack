// Integration test fixes

// 1. Fix MockAuthService to return consistent format
const authServiceFixes = {
  register: async function(userData) {
    // Clear any existing user first
    const existing = await this.db.findUserByEmail(userData.email);
    if (existing) {
      return {
        success: false,
        error: 'User already exists'
      };
    }
    
    const hashedPassword = await this.cryptoService.hash(userData.password);
    const user = await this.db.createUser({
      ...userData,
      password: hashedPassword
    });
    
    const tokens = await this.generateTokens(user);
    
    // Return format that matches both service and API expectations
    return {
      success: true,
      user: {
        id: user.id,
        userId: user.id, // Add userId for compatibility
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        dateOfBirth: user.dateOfBirth,
        interests: user.interests,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      tokens: {
        token: tokens.token,
        refreshToken: tokens.refreshToken
      }
    };
  }
};

// 2. Fix MockDatabase to properly implement all methods
const databaseFixes = {
  // Add proper updateUser method
  updateUser: async function(userId, updateData) {
    const userIndex = this.users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      throw new Error('User not found');
    }
    
    // Don't allow updating sensitive fields
    const { password, id, email, ...safeUpdates } = updateData;
    
    this.users[userIndex] = {
      ...this.users[userIndex],
      ...safeUpdates,
      updatedAt: new Date()
    };
    
    return this.users[userIndex];
  },
  
  // Add proper clear method
  clear: function() {
    this.users = [];
    this.sessions = [];
    this.relationships = [];
  }
};

// 3. Fix MockUserService to implement missing methods
const userServiceFixes = {
  updateUserProfile: async function(userId, profileData) {
    // Validate the update data
    const validationResult = this.validationService.validateUserUpdate(profileData);
    if (!validationResult.isValid) {
      return {
        success: false,
        error: 'Validation failed',
        details: validationResult.errors
      };
    }
    
    try {
      const updatedUser = await this.db.updateUser(userId, validationResult.sanitizedData);
      return {
        success: true,
        user: updatedUser
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
};

// 4. Fix MockLoggerService to implement missing methods
const loggerServiceFixes = {
  logAuthAttempt: function(email, success, reason) {
    this.logs.push({
      type: 'auth_attempt',
      timestamp: new Date(),
      data: { email, success, reason }
    });
  }
};

// 5. Fix integration test setup
const integrationTestFixes = {
  beforeEach: function() {
    // Clear all databases before each test
    this.db.clear();
    this.mockLoggerService.logs = [];
  },
  
  // Fix response format expectations
  expectRegistrationResponse: function(res) {
    expect(res.statusCode).toBe(201);
    expect(res.data).toBeDefined();
    expect(res.data.success).toBe(true);
    expect(res.data.data).toBeDefined();
    expect(res.data.data.userId).toBeDefined();
    expect(res.data.data.token).toBeDefined();
    expect(res.data.data.refreshToken).toBeDefined();
  },
  
  // Fix login response expectations
  expectLoginResponse: function(res) {
    expect(res.statusCode).toBe(200);
    expect(res.data).toBeDefined();
    expect(res.data.success).toBe(true);
    expect(res.data.data).toBeDefined();
    expect(res.data.data.userId).toBeDefined();
    expect(res.data.data.token).toBeDefined();
  }
};

// 6. Fix SQL injection sanitization
const sanitizationFixes = {
  sanitizeInput: function(input) {
    if (typeof input !== 'string') return input;
    
    // Remove SQL keywords and special characters
    return input
      .replace(/(['";\\])/g, '\\$1') // Escape quotes and backslashes
      .replace(/\b(DROP|DELETE|INSERT|UPDATE|SELECT|FROM|WHERE|TABLE|DATABASE|UNION|EXEC|SCRIPT)\b/gi, ''); // Remove SQL keywords
  }
};

module.exports = {
  authServiceFixes,
  databaseFixes,
  userServiceFixes,
  loggerServiceFixes,
  integrationTestFixes,
  sanitizationFixes
};