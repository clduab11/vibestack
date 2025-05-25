// Comprehensive mock services for integration testing
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Mock Validation Service
class MockValidationService {
  validateEmail(email) {
    return { isValid: email && email.includes('@'), error: null };
  }

  validateUsername(username) {
    return { isValid: username && username.length >= 3, error: null };
  }

  validatePassword(password) {
    return { isValid: password && password.length >= 8, error: null };
  }

  validatePrivacyLevel(level) {
    return { isValid: ['public', 'friends', 'private'].includes(level), error: null };
  }

  sanitizeInput(input) {
    if (!input) return '';
    // Properly sanitize SQL injection attempts
    return String(input)
      .replace(/[<>]/g, '') // Remove HTML tags
      .replace(/\b(DROP|TABLE|DELETE|INSERT|UPDATE|SELECT|FROM|WHERE|UNION|EXEC|SCRIPT)\b/gi, '') // Remove SQL keywords
      .replace(/(['";\\])/g, '\\$1') // Escape quotes and backslashes
      .replace(/-{2,}/g, ''); // Remove SQL comments
  }

  validateProfileData(data) {
    const errors = [];
    if (data.email && !data.email.includes('@')) errors.push('Invalid email');
    if (data.username && data.username.length < 3) errors.push('Username too short');
    return { isValid: errors.length === 0, errors };
  }

  validateRegistration(data) {
    const errors = [];
    if (!data.email || !data.email.includes('@')) errors.push('Invalid email');
    if (!data.username || data.username.length < 3) errors.push('Username too short');
    if (!data.password || data.password.length < 8) errors.push('Password too short');
    
    // Sanitize the data similar to what API expects
    const sanitizedData = {
      email: this.sanitizeInput(data.email),
      username: this.sanitizeInput(data.username),
      password: data.password, // Don't sanitize passwords
      ...data // Include any additional fields
    };
    
    return { isValid: errors.length === 0, errors, sanitizedData };
  }

  validateLogin(data) {
    const errors = [];
    if (!data.email || !data.email.includes('@')) errors.push('Invalid email');
    if (!data.password) errors.push('Password required');
    
    const sanitizedData = {
      email: this.sanitizeInput(data.email),
      password: data.password // Don't sanitize passwords
    };
    
    return { isValid: errors.length === 0, errors, sanitizedData };
  }

  validateUserUpdate(data) {
    const errors = [];
    if (data.email && !data.email.includes('@')) errors.push('Invalid email');
    if (data.username && data.username.length < 3) errors.push('Username too short');
    if (data.displayName && data.displayName.length === 0) errors.push('Display name cannot be empty');
    
    const sanitizedData = {};
    // Only include fields that were provided
    if (data.email) sanitizedData.email = this.sanitizeInput(data.email);
    if (data.username) sanitizedData.username = this.sanitizeInput(data.username);
    if (data.displayName) sanitizedData.displayName = this.sanitizeInput(data.displayName);
    if (data.bio) sanitizedData.bio = this.sanitizeInput(data.bio);
    if (data.interests) sanitizedData.interests = data.interests;
    if (data.privacySettings) sanitizedData.privacySettings = data.privacySettings;
    
    return { isValid: errors.length === 0, errors, sanitizedData };
  }
}

// Mock Crypto Service
class MockCryptoService {
  async hashPassword(password) {
    return bcrypt.hash(password, 10);
  }

  async verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
  }

  generateToken(payload) {
    return jwt.sign(payload, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });
  }

  verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET || 'test-secret');
    } catch (error) {
      return null;
    }
  }
}

// Mock Logger Service
class MockLoggerService {
  logAPIRequest(req) {
    console.log(`API Request: ${req.method} ${req.path}`);
  }

  logSecurityEvent(event, details) {
    console.log(`Security Event: ${event}`, details);
  }

  // Add missing logAuthAttempt method required by SecurityMiddleware
  logAuthAttempt(ip, success, reason = null) {
    console.log(`Auth Attempt: IP=${ip}, Success=${success}, Reason=${reason}`);
  }

  error(message, error) {
    console.error(message, error);
  }

  info(message, data) {
    console.log(message, data);
  }
}

// Enhanced Mock Database
class MockDatabase {
  constructor() {
    this.users = new Map();
    this.sessions = new Map();
    this.relationships = new Map();
    this.activities = new Map();
    this.id = `db_${Math.random().toString(36).substr(2, 9)}`; // Unique ID for tracking
    this.transactions = new Map(); // Store transaction snapshots
    this.clear();
  }

  clear() {
    this.users.clear();
    this.sessions.clear();
    this.relationships.clear();
    this.activities.clear();
    this.transactions.clear();
    this.idCounter = 1;
  }

  // Transaction support for rollback scenarios
  beginTransaction(transactionId = null) {
    const txId = transactionId || `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create snapshot of current state
    const snapshot = {
      users: new Map(this.users),
      sessions: new Map(this.sessions),
      relationships: new Map(this.relationships),
      activities: new Map(this.activities),
      idCounter: this.idCounter
    };
    
    this.transactions.set(txId, snapshot);
    console.log(`[MockDatabase] Transaction ${txId} started`);
    return txId;
  }

  rollbackTransaction(transactionId) {
    const snapshot = this.transactions.get(transactionId);
    if (!snapshot) {
      console.warn(`[MockDatabase] Transaction ${transactionId} not found for rollback`);
      return false;
    }

    // Restore state from snapshot
    this.users = new Map(snapshot.users);
    this.sessions = new Map(snapshot.sessions);
    this.relationships = new Map(snapshot.relationships);
    this.activities = new Map(snapshot.activities);
    this.idCounter = snapshot.idCounter;

    // Clean up transaction
    this.transactions.delete(transactionId);
    console.log(`[MockDatabase] Transaction ${transactionId} rolled back`);
    return true;
  }

  commitTransaction(transactionId) {
    const snapshot = this.transactions.get(transactionId);
    if (!snapshot) {
      console.warn(`[MockDatabase] Transaction ${transactionId} not found for commit`);
      return false;
    }

    // Just clean up the transaction - current state is the committed state
    this.transactions.delete(transactionId);
    console.log(`[MockDatabase] Transaction ${transactionId} committed`);
    return true;
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
    return this.users.get(Number(id)) || null;
  }

  async findUserByEmail(email) {
    for (const user of this.users.values()) {
      if (user.email === email) return user;
    }
    return null;
  }

  async updateUser(id, updates) {
    const user = this.users.get(Number(id));
    if (!user) return null;
    
    const updatedUser = {
      ...user,
      ...updates,
      updatedAt: new Date()
    };
    this.users.set(Number(id), updatedUser);
    return updatedUser;
  }

  // Session operations
  async createSession(sessionData) {
    const session = {
      id: `session_${this.idCounter++}`,
      ...sessionData,
      createdAt: new Date()
    };
    this.sessions.set(session.token || session.id, session);
    return session;
  }

  async findSession(sessionIdOrToken) {
    // Try to find by token first, then by id
    for (const session of this.sessions.values()) {
      if (session.token === sessionIdOrToken || session.id === sessionIdOrToken) {
        return session;
      }
    }
    return null;
  }

  async deleteSession(sessionIdOrToken) {
    // Delete by token or id
    for (const [key, session] of this.sessions.entries()) {
      if (session.token === sessionIdOrToken || session.id === sessionIdOrToken) {
        return this.sessions.delete(key);
      }
    }
    return false;
  }

  // Relationship operations
  async createRelationship(userId1, userId2, type = 'friend') {
    const relationshipId = `rel_${this.idCounter++}`;
    const relationship = {
      id: relationshipId,
      userId1: Number(userId1),
      userId2: Number(userId2),
      type,
      status: 'pending',
      createdAt: new Date()
    };
    this.relationships.set(relationshipId, relationship);
    return relationship;
  }

  async findRelationships(userId) {
    const relationships = [];
    const id = Number(userId);
    for (const rel of this.relationships.values()) {
      if (rel.userId1 === id || rel.userId2 === id) {
        relationships.push(rel);
      }
    }
    return relationships;
  }

  async updateRelationship(relationshipId, updates) {
    const relationship = this.relationships.get(relationshipId);
    if (!relationship) return null;
    
    const updated = {
      ...relationship,
      ...updates,
      updatedAt: new Date()
    };
    this.relationships.set(relationshipId, updated);
    return updated;
  }
}

// Mock Auth Service with additional methods
class MockAuthService {
  constructor(db, cryptoService, loggerService) {
    this.db = db;
    this.cryptoService = cryptoService;
    this.loggerService = loggerService;
  }

  async register(userData) {
    // Add defensive check for undefined userData
    if (!userData) {
      console.error('[MockAuthService.register] userData is undefined');
      return { success: false, error: 'Registration data is required' };
    }
    console.log('[MockAuthService.register] Registering user:', { email: userData.email, username: userData.username });
    console.log('[MockAuthService.register] Database instance:', this.db.constructor.name);
    console.log('[MockAuthService.register] Database ID:', this.db.id);
    
    try {
      const existingUser = await this.db.findUserByEmail(userData.email);
      if (existingUser) {
        console.log('[MockAuthService.register] User already exists:', userData.email);
        return { success: false, error: 'User already exists' };
      }

      const hashedPassword = await this.cryptoService.hashPassword(userData.password);
      
      // Ensure default privacy settings are included
      const defaultPrivacySettings = {
        profileVisibility: 'public',
        activitySharing: 'friends',
        dataCollection: 'minimal'
      };
      
      const user = await this.db.createUser({
        ...userData,
        password: hashedPassword,
        privacySettings: userData.privacySettings || defaultPrivacySettings
      });

      console.log('[MockAuthService.register] User created in DB:', user);
      console.log('[MockAuthService.register] Users in DB after creation:', Array.from(this.db.users.entries()));

      const token = this.cryptoService.generateToken({
        userId: user.id,
        email: user.email
      });

      await this.db.createSession({
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 3600000)
      });

      const { password, ...userWithoutPassword } = user;
      console.log('[MockAuthService.register] Registration successful:', { userId: user.id });
      
      // Return in format expected by API routes
      return {
        success: true,
        user: {
          ...userWithoutPassword,
          userId: user.id // Ensure userId field exists
        },
        tokens: {
          token,
          refreshToken: token // Mock refresh token for now
        }
      };
    } catch (error) {
      console.error('[MockAuthService.register] Error:', error);
      return { success: false, error: error.message };
    }
  }

  async login(credentials) {
    // Extract email and password from credentials object to match production interface
    const { email, password } = credentials || {};
    
    console.log('[MockAuthService.login] Attempting login for:', email);
    console.log('[MockAuthService.login] Database instance:', this.db.constructor.name);
    console.log('[MockAuthService.login] Database ID:', this.db.id);
    console.log('[MockAuthService.login] Users in DB:', Array.from(this.db.users.entries()));
    
    if (!email || !password) {
      throw new Error('Invalid credentials - email and password required');
    }
    
    const user = await this.db.findUserByEmail(email);
    if (!user) {
      console.log('[MockAuthService.login] User not found for email:', email);
      // Include debug info in error message
      const userCount = this.db.users.size;
      const userEmails = Array.from(this.db.users.values()).map(u => u.email);
      throw new Error(`Invalid credentials - DB has ${userCount} users with emails: ${userEmails.join(', ')}, looking for: ${email}, DB ID: ${this.db.id}`);
    }

    console.log('[MockAuthService.login] Found user:', user);

    const isValid = await this.cryptoService.verifyPassword(password, user.password);
    if (!isValid) {
      console.log('[MockAuthService.login] Invalid password for user:', email);
      throw new Error('Invalid credentials');
    }

    const token = this.cryptoService.generateToken({
      userId: user.id,
      email: user.email
    });

    await this.db.createSession({
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 3600000)
    });

    const { password: _, ...userWithoutPassword } = user;
    console.log('[MockAuthService.login] Login successful for user:', email);
    
    // Return in format expected by API routes
    return {
      success: true,
      user: {
        ...userWithoutPassword,
        userId: user.id // Ensure userId field exists
      },
      tokens: {
        token,
        refreshToken: token // Mock refresh token for now
      }
    };
  }

  async logout(token) {
    const session = await this.db.findSession(token);
    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    await this.db.deleteSession(token);
    return { success: true };
  }

  async validateToken(token) {
    const decoded = this.cryptoService.verifyToken(token);
    if (!decoded) {
      return { isValid: false };
    }

    const session = await this.db.findSession(token);
    if (!session || session.expiresAt < new Date()) {
      return { isValid: false };
    }

    const user = await this.db.findUserById(decoded.userId);
    // BUGFIX: Return payload property to match SecurityMiddleware expectations
    // SecurityMiddleware.authenticate() expects result.payload, not result.user
    return { isValid: true, payload: user };
  }

  async verifyToken(token) {
    return this.cryptoService.verifyToken(token);
  }

  extractTokenFromHeader(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }
}

// Mock User Service with missing methods
class MockUserService {
  constructor(db, validationService) {
    this.db = db;
    this.validationService = validationService;
  }

  async getUserProfile(userId, requesterId = null) {
    const user = await this.db.findUserById(userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Check privacy settings and filter data accordingly
    if (requesterId && requesterId !== userId) {
      const privacyLevel = user.privacySettings?.profileVisibility || 'public';
      if (privacyLevel === 'private') {
        return { success: false, error: 'Access denied - private profile' };
      }
      if (privacyLevel === 'friends') {
        const relationships = await this.db.findRelationships(userId);
        const isFriend = relationships.some(rel =>
          (rel.userId1 === requesterId || rel.userId2 === requesterId) &&
          rel.status === 'accepted'
        );
        if (!isFriend) {
          // Return limited profile for non-friends when privacy is 'friends'
          // CRITICAL FIX: Remove email for privacy enforcement when profileVisibility is 'friends'
          const { password, email, ...limitedProfile } = user;
          return { success: true, user: limitedProfile };
        }
      }
    }

    // Apply privacy filtering based on user's privacy settings
    let userProfile = { ...user };
    delete userProfile.password; // Always remove password

    // CRITICAL FIX: Enhanced privacy filtering for profileVisibility 'friends' setting
    if (requesterId && requesterId !== userId) {
      const privacyLevel = user.privacySettings?.profileVisibility || 'public';
      
      // If profile visibility is 'friends', filter email regardless of emailVisibility setting
      if (privacyLevel === 'friends') {
        const relationships = await this.db.findRelationships(userId);
        const isFriend = relationships.some(rel =>
          (rel.userId1 === requesterId || rel.userId2 === requesterId) &&
          rel.status === 'accepted'
        );
        if (!isFriend) {
          // Non-friends should not see email when profileVisibility is 'friends'
          delete userProfile.email;
        }
      }
      
      // Additional email privacy filtering based on emailVisibility setting
      const emailPrivacy = user.privacySettings?.emailVisibility || 'private';
      if (emailPrivacy === 'private' || emailPrivacy === 'friends') {
        // Check if requester is a friend for 'friends' privacy level
        if (emailPrivacy === 'friends') {
          const relationships = await this.db.findRelationships(userId);
          const isFriend = relationships.some(rel =>
            (rel.userId1 === requesterId || rel.userId2 === requesterId) &&
            rel.status === 'accepted'
          );
          if (!isFriend) {
            delete userProfile.email;
          }
        } else {
          // Private - always hide email
          delete userProfile.email;
        }
      }
    }

    return { success: true, user: userProfile };
  }

  async getUserById(userId) {
    return this.getUserProfile(userId);
  }

  async updateProfile(userId, updates) {
    const validation = this.validationService.validateUserUpdate(updates);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }

    const updatedUser = await this.db.updateUser(userId, updates);
    if (!updatedUser) {
      return { success: false, error: 'User not found' };
    }

    const { password, ...userWithoutPassword } = updatedUser;
    return { success: true, user: userWithoutPassword };
  }

  async addFriend(userId, friendId) {
    if (userId === friendId) {
      return { success: false, error: 'Cannot add yourself as friend' };
    }

    const friend = await this.db.findUserById(friendId);
    if (!friend) {
      return { success: false, error: 'User not found' };
    }

    const relationship = await this.db.createRelationship(userId, friendId, 'friend');
    return { success: true, relationship };
  }

  // Add missing updateUserProfile method expected by APIRoutes
  async updateUserProfile(userId, updates) {
    console.log('[MockUserService.updateUserProfile] Updating profile:', { userId, updates });
    return this.updateProfile(userId, updates);
  }

  // Add missing getFriends method for integration tests
  async getFriends(userId = null, authContext = null) {
    console.log('[MockUserService.getFriends] Method called with userId:', userId, 'authContext:', authContext);
    
    // CRITICAL FIX: Enhanced authentication context handling
    // Priority 1: Use provided userId
    // Priority 2: Extract from authContext (req.user)
    // Priority 3: Try authService if available
    if (!userId) {
      if (authContext && authContext.user) {
        userId = authContext.user.id || authContext.user.userId;
        console.log('[MockUserService.getFriends] Using userId from authContext:', userId);
      } else if (this.authService && this.authService.getCurrentUser) {
        try {
          const currentUser = await this.authService.getCurrentUser();
          userId = currentUser?.id;
          console.log('[MockUserService.getFriends] Using userId from authService:', userId);
        } catch (error) {
          console.log('[MockUserService.getFriends] Could not get current user from auth service');
        }
      }
    }
    
    if (!userId) {
      console.log('[MockUserService.getFriends] No user ID available - returning empty array');
      return [];
    }
    
    // Ensure userId is a number for consistent comparison
    const numericUserId = Number(userId);
    console.log('[MockUserService.getFriends] Looking for relationships for userId:', numericUserId);
    
    // Get relationships for the user
    const relationships = await this.db.findRelationships(numericUserId);
    console.log('[MockUserService.getFriends] Found relationships:', relationships.length);
    
    const friends = [];
    
    for (const rel of relationships) {
      console.log('[MockUserService.getFriends] Processing relationship:', rel);
      if (rel.status === 'accepted' && rel.type === 'friend') {
        // Determine the friend's ID (the other user in the relationship)
        const friendId = rel.userId1 === numericUserId ? rel.userId2 : rel.userId1;
        console.log('[MockUserService.getFriends] Friend ID:', friendId);
        
        // Get the friend's user data
        const friendUser = await this.db.findUserById(friendId);
        if (friendUser) {
          const { password, ...friendWithoutPassword } = friendUser;
          friends.push({
            userId: friendId,
            ...friendWithoutPassword
          });
          console.log('[MockUserService.getFriends] Added friend:', friendId);
        } else {
          console.log('[MockUserService.getFriends] Friend user not found:', friendId);
        }
      } else {
        console.log('[MockUserService.getFriends] Skipping relationship - status:', rel.status, 'type:', rel.type);
      }
    }
    
    console.log('[MockUserService.getFriends] Returning friends:', friends.length);
    return friends;
  }

  // Add missing getFriendsList method expected by API routes
  async getFriendsList(userId) {
    console.log('[MockUserService.getFriendsList] Method called with userId:', userId);
    
    if (!userId) {
      return { success: false, error: 'User ID is required' };
    }
    
    try {
      // Check if user exists
      const user = await this.db.findUserById(userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }
      
      // Get friends using the existing getFriends method
      const friends = await this.getFriends(userId);
      
      return { 
        success: true, 
        friends: friends 
      };
    } catch (error) {
      console.error('[MockUserService.getFriendsList] Error:', error);
      return { success: false, error: 'Failed to retrieve friends list' };
    }
  }
}

module.exports = {
  MockValidationService,
  MockCryptoService,
  MockLoggerService,
  MockDatabase,
  MockAuthService,
  MockUserService
};