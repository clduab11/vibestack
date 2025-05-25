// src/models/coreModels.test.js

/**
 * Core Models TDD Test Suite - London School Outside-In Approach
 * 
 * Defines the Core Models interfaces and behavior through comprehensive tests.
 * Tests cover data validation, serialization, business rules, and model relationships.
 * All dependencies are mocked to ensure unit test isolation.
 */

const {
  User,
  Content,
  Relationship,
  Activity,
  Configuration,
  BaseModel,
  ValidationError,
  ModelFactoryService,
  clearRelationshipRegistry
} = require('./coreModels');

describe('Core Models', () => {
  let mockValidationService;
  let mockEncryptionService;
  let mockTimestampService;

  beforeEach(() => {
    // Clear relationship registry to prevent test interference
    clearRelationshipRegistry();
    
    // Mock dependencies using London School approach
    mockValidationService = {
      validateEmail: jest.fn().mockReturnValue({ isValid: true }),
      validateUsername: jest.fn().mockReturnValue({ isValid: true }),
      validatePhoneNumber: jest.fn().mockReturnValue({ isValid: true }),
      validateUrl: jest.fn().mockReturnValue({ isValid: true }),
      sanitizeInput: jest.fn().mockImplementation(input => input),
      isValidDate: jest.fn().mockReturnValue(true),
      validatePrivacyLevel: jest.fn().mockReturnValue({ isValid: true })
    };

    mockEncryptionService = {
      encrypt: jest.fn().mockImplementation(data => `encrypted_${data}`),
      decrypt: jest.fn().mockImplementation(data => data.replace('encrypted_', '')),
      hash: jest.fn().mockImplementation(data => `hashed_${data}`),
      generateSalt: jest.fn().mockReturnValue('mock_salt')
    };

    mockTimestampService = {
      now: jest.fn().mockReturnValue(new Date('2024-01-01T00:00:00Z')),
      toISOString: jest.fn().mockReturnValue('2024-01-01T00:00:00.000Z'),
      isValidTimestamp: jest.fn().mockReturnValue(true)
    };
  });

  describe('BaseModel', () => {
    let baseModel;

    beforeEach(() => {
      baseModel = new BaseModel({
        validationService: mockValidationService,
        encryptionService: mockEncryptionService,
        timestampService: mockTimestampService
      });
    });

    it('should initialize with required dependencies', () => {
      expect(baseModel.validationService).toBe(mockValidationService);
      expect(baseModel.encryptionService).toBe(mockEncryptionService);
      expect(baseModel.timestampService).toBe(mockTimestampService);
    });

    it('should throw error when dependencies are missing', () => {
      expect(() => new BaseModel({})).toThrow('Required dependencies missing for BaseModel');
    });

    it('should generate unique UUID for new models', () => {
      const model1 = new BaseModel({ validationService: mockValidationService, encryptionService: mockEncryptionService, timestampService: mockTimestampService });
      const model2 = new BaseModel({ validationService: mockValidationService, encryptionService: mockEncryptionService, timestampService: mockTimestampService });
      
      expect(model1.id).toBeDefined();
      expect(model2.id).toBeDefined();
      expect(model1.id).not.toBe(model2.id);
      expect(model1.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('should set creation timestamp on initialization', () => {
      const mockDate = new Date('2024-01-01T00:00:00Z');
      mockTimestampService.now.mockReturnValue(mockDate);
      
      const model = new BaseModel({ validationService: mockValidationService, encryptionService: mockEncryptionService, timestampService: mockTimestampService });
      
      expect(model.createdAt).toBe(mockDate);
      expect(model.updatedAt).toBe(mockDate);
    });

    it('should update timestamp when modified', () => {
      const initialDate = new Date('2024-01-01T00:00:00Z');
      const updateDate = new Date('2024-01-02T00:00:00Z');
      
      mockTimestampService.now.mockReturnValueOnce(initialDate).mockReturnValueOnce(updateDate);
      
      const model = new BaseModel({ validationService: mockValidationService, encryptionService: mockEncryptionService, timestampService: mockTimestampService });
      model.touch();
      
      expect(model.createdAt).toBe(initialDate);
      expect(model.updatedAt).toBe(updateDate);
    });

    it('should serialize to JSON correctly', () => {
      mockTimestampService.now.mockReturnValue(new Date('2024-01-01T00:00:00Z'));
      
      const model = new BaseModel({ validationService: mockValidationService, encryptionService: mockEncryptionService, timestampService: mockTimestampService });
      const serialized = model.toJSON();
      
      expect(serialized).toHaveProperty('id');
      expect(serialized).toHaveProperty('createdAt');
      expect(serialized).toHaveProperty('updatedAt');
      expect(typeof serialized.id).toBe('string');
    });

    it('should validate required fields before serialization', () => {
      const model = new BaseModel({ validationService: mockValidationService, encryptionService: mockEncryptionService, timestampService: mockTimestampService });
      model.requiredFields = ['name', 'email'];
      model.name = 'John';
      // Missing email
      
      expect(() => model.validate()).toThrow('Required field missing: email');
    });
  });

  describe('User Model', () => {
    let user;
    const validUserData = {
      email: 'john@example.com',
      username: 'johndoe',
      displayName: 'John Doe',
      profileImageUrl: 'https://example.com/avatar.jpg',
      accountStatus: 'active',
      subscriptionTier: 'premium',
      dataConsentLevel: 'gold',
      preferredLanguage: 'en',
      timezone: 'America/New_York'
    };

    beforeEach(() => {
      mockValidationService.validateEmail.mockReturnValue({ isValid: true });
      mockValidationService.validateUsername.mockReturnValue({ isValid: true });
      mockValidationService.validateUrl.mockReturnValue({ isValid: true });
      mockValidationService.validatePrivacyLevel.mockReturnValue({ isValid: true });
      mockValidationService.sanitizeInput.mockImplementation(input => input);
      mockEncryptionService.encrypt.mockImplementation(data => `encrypted_${data}`);
      mockTimestampService.now.mockReturnValue(new Date('2024-01-01T00:00:00Z'));

      user = new User(validUserData, {
        validationService: mockValidationService,
        encryptionService: mockEncryptionService,
        timestampService: mockTimestampService
      });
    });

    it('should create user with valid data', () => {
      expect(user.email).toBe('encrypted_john@example.com');
      expect(user.username).toBe('johndoe');
      expect(user.displayName).toBe('John Doe');
      expect(user.accountStatus).toBe('active');
      expect(user.subscriptionTier).toBe('premium');
    });

    it('should validate email format during creation', () => {
      mockValidationService.validateEmail.mockReturnValue({ isValid: false, error: 'Invalid email format' });
      
      expect(() => new User({ ...validUserData, email: 'invalid-email' }, {
        validationService: mockValidationService,
        encryptionService: mockEncryptionService,
        timestampService: mockTimestampService
      })).toThrow('Invalid email format');
    });

    it('should validate username uniqueness and format', () => {
      mockValidationService.validateUsername.mockReturnValue({ isValid: false, error: 'Username already exists' });
      
      expect(() => new User({ ...validUserData, username: 'taken_username' }, {
        validationService: mockValidationService,
        encryptionService: mockEncryptionService,
        timestampService: mockTimestampService
      })).toThrow('Username already exists');
    });

    it('should encrypt sensitive data', () => {
      expect(mockEncryptionService.encrypt).toHaveBeenCalledWith('john@example.com');
      expect(user.email).toBe('encrypted_john@example.com');
    });

    it('should validate subscription tier values', () => {
      const invalidTiers = ['invalid', 'super-premium', ''];
      
      invalidTiers.forEach(tier => {
        expect(() => new User({ ...validUserData, subscriptionTier: tier }, {
          validationService: mockValidationService,
          encryptionService: mockEncryptionService,
          timestampService: mockTimestampService
        })).toThrow('Invalid subscription tier');
      });
    });

    it('should validate data consent levels', () => {
      const validLevels = ['bronze', 'silver', 'gold'];
      const invalidLevel = 'platinum';
      
      validLevels.forEach(level => {
        expect(() => new User({ ...validUserData, dataConsentLevel: level }, {
          validationService: mockValidationService,
          encryptionService: mockEncryptionService,
          timestampService: mockTimestampService
        })).not.toThrow();
      });
      
      expect(() => new User({ ...validUserData, dataConsentLevel: invalidLevel }, {
        validationService: mockValidationService,
        encryptionService: mockEncryptionService,
        timestampService: mockTimestampService
      })).toThrow('Invalid data consent level');
    });

    it('should validate account status values', () => {
      const validStatuses = ['active', 'suspended', 'deleted'];
      const invalidStatus = 'banned';
      
      expect(() => new User({ ...validUserData, accountStatus: invalidStatus }, {
        validationService: mockValidationService,
        encryptionService: mockEncryptionService,
        timestampService: mockTimestampService
      })).toThrow('Invalid account status');
    });

    it('should update last active timestamp', () => {
      const lastActiveDate = new Date('2024-01-02T00:00:00Z');
      mockTimestampService.now.mockReturnValue(lastActiveDate);
      
      user.updateLastActive();
      
      expect(user.lastActive).toBe(lastActiveDate);
      expect(user.updatedAt).toBe(lastActiveDate);
    });

    it('should serialize user data excluding sensitive fields', () => {
      const serialized = user.toJSON();
      
      expect(serialized).toHaveProperty('id');
      expect(serialized).toHaveProperty('username');
      expect(serialized).toHaveProperty('displayName');
      expect(serialized).not.toHaveProperty('email'); // Should be excluded from public serialization
      expect(serialized.subscriptionTier).toBe('premium');
    });

    it('should include sensitive data in admin serialization', () => {
      const adminSerialized = user.toJSON({ includePrivate: true });
      
      expect(adminSerialized).toHaveProperty('email');
      expect(adminSerialized.email).toBe('encrypted_john@example.com');
    });
  });

  describe('Content Model', () => {
    let content;
    const validContentData = {
      userId: 'user-123',
      contentType: 'text',
      content: 'This is a test post',
      visibility: 'public',
      tags: ['test', 'post'],
      metadata: {
        platform: 'vibestack',
        mood: 'happy'
      }
    };

    beforeEach(() => {
      mockValidationService.sanitizeInput.mockImplementation(input => input);
      mockTimestampService.now.mockReturnValue(new Date('2024-01-01T00:00:00Z'));

      content = new Content(validContentData, {
        validationService: mockValidationService,
        encryptionService: mockEncryptionService,
        timestampService: mockTimestampService
      });
    });

    it('should create content with valid data', () => {
      expect(content.userId).toBe('user-123');
      expect(content.contentType).toBe('text');
      expect(content.content).toBe('This is a test post');
      expect(content.visibility).toBe('public');
      expect(content.tags).toEqual(['test', 'post']);
    });

    it('should validate content type', () => {
      const validTypes = ['text', 'image', 'video', 'audio', 'link'];
      const invalidType = 'unknown';
      
      expect(() => new Content({ ...validContentData, contentType: invalidType }, {
        validationService: mockValidationService,
        encryptionService: mockEncryptionService,
        timestampService: mockTimestampService
      })).toThrow('Invalid content type');
    });

    it('should validate content length constraints', () => {
      const longContent = 'a'.repeat(5001); // Assuming 5000 char limit
      
      expect(() => new Content({ ...validContentData, content: longContent }, {
        validationService: mockValidationService,
        encryptionService: mockEncryptionService,
        timestampService: mockTimestampService
      })).toThrow('Content exceeds maximum length');
    });

    it('should validate visibility settings', () => {
      const validVisibilities = ['public', 'friends', 'private'];
      const invalidVisibility = 'custom';
      
      validVisibilities.forEach(visibility => {
        expect(() => new Content({ ...validContentData, visibility }, {
          validationService: mockValidationService,
          encryptionService: mockEncryptionService,
          timestampService: mockTimestampService
        })).not.toThrow();
      });
      
      expect(() => new Content({ ...validContentData, visibility: invalidVisibility }, {
        validationService: mockValidationService,
        encryptionService: mockEncryptionService,
        timestampService: mockTimestampService
      })).toThrow('Invalid visibility setting');
    });

    it('should sanitize content to prevent XSS', () => {
      const maliciousContent = '<script>alert("xss")</script>Safe content';
      const sanitizedContent = 'Safe content';
      
      mockValidationService.sanitizeInput.mockReturnValue(sanitizedContent);
      
      const safeContent = new Content({ ...validContentData, content: maliciousContent }, {
        validationService: mockValidationService,
        encryptionService: mockEncryptionService,
        timestampService: mockTimestampService
      });
      
      expect(mockValidationService.sanitizeInput).toHaveBeenCalledWith(maliciousContent);
      expect(safeContent.content).toBe(sanitizedContent);
    });

    it('should validate and normalize tags', () => {
      const tagsWithSpaces = ['test tag', 'UPPERCASE', 'special!@#'];
      const normalizedTags = ['test-tag', 'uppercase', 'special'];
      
      const contentWithTags = new Content({ ...validContentData, tags: tagsWithSpaces }, {
        validationService: mockValidationService,
        encryptionService: mockEncryptionService,
        timestampService: mockTimestampService
      });
      
      expect(contentWithTags.tags).toEqual(normalizedTags);
    });

    it('should track moderation status', () => {
      expect(content.moderationStatus).toBe('pending');
      
      content.setModerationStatus('approved');
      expect(content.moderationStatus).toBe('approved');
      
      content.setModerationStatus('flagged');
      expect(content.moderationStatus).toBe('flagged');
    });

    it('should increment engagement metrics', () => {
      expect(content.likeCount).toBe(0);
      expect(content.shareCount).toBe(0);
      expect(content.commentCount).toBe(0);
      
      content.incrementLikes();
      content.incrementShares();
      content.incrementComments();
      
      expect(content.likeCount).toBe(1);
      expect(content.shareCount).toBe(1);
      expect(content.commentCount).toBe(1);
    });
  });

  describe('Relationship Model', () => {
    let relationship;
    const validRelationshipData = {
      userId1: 'user-123',
      userId2: 'user-456',
      relationshipType: 'friend',
      status: 'active'
    };

    beforeEach(() => {
      mockTimestampService.now.mockReturnValue(new Date('2024-01-01T00:00:00Z'));

      relationship = new Relationship(validRelationshipData, {
        validationService: mockValidationService,
        encryptionService: mockEncryptionService,
        timestampService: mockTimestampService
      });
    });

    it('should create relationship with valid data', () => {
      expect(relationship.userId1).toBe('user-123');
      expect(relationship.userId2).toBe('user-456');
      expect(relationship.relationshipType).toBe('friend');
      expect(relationship.status).toBe('active');
    });

    it('should validate relationship types', () => {
      const validTypes = ['friend', 'follow', 'block'];
      const invalidType = 'enemy';
      
      validTypes.forEach((type, index) => {
        // Use different user IDs for each iteration to avoid registry collision
        const testData = {
          ...validRelationshipData,
          userId1: `user-${100 + index}`,
          userId2: `user-${200 + index}`,
          relationshipType: type
        };
        expect(() => new Relationship(testData, {
          validationService: mockValidationService,
          encryptionService: mockEncryptionService,
          timestampService: mockTimestampService
        })).not.toThrow();
      });
      
      expect(() => new Relationship({
        ...validRelationshipData,
        userId1: 'user-999',
        userId2: 'user-998',
        relationshipType: invalidType
      }, {
        validationService: mockValidationService,
        encryptionService: mockEncryptionService,
        timestampService: mockTimestampService
      })).toThrow('Invalid relationship type');
    });

    it('should validate relationship status', () => {
      const validStatuses = ['pending', 'active', 'rejected', 'blocked'];
      const invalidStatus = 'unknown';
      
      expect(() => new Relationship({ ...validRelationshipData, status: invalidStatus }, {
        validationService: mockValidationService,
        encryptionService: mockEncryptionService,
        timestampService: mockTimestampService
      })).toThrow('Invalid relationship status');
    });

    it('should prevent self-relationships', () => {
      expect(() => new Relationship({ ...validRelationshipData, userId2: 'user-123' }, {
        validationService: mockValidationService,
        encryptionService: mockEncryptionService,
        timestampService: mockTimestampService
      })).toThrow('Cannot create relationship with self');
    });

    it('should handle bidirectional relationships', () => {
      expect(relationship.isBidirectional()).toBe(true); // Friend relationships are bidirectional
      
      const followRelationship = new Relationship({ ...validRelationshipData, relationshipType: 'follow' }, {
        validationService: mockValidationService,
        encryptionService: mockEncryptionService,
        timestampService: mockTimestampService
      });
      
      expect(followRelationship.isBidirectional()).toBe(false); // Follow relationships are unidirectional
    });

    it('should track interaction count', () => {
      expect(relationship.interactionCount).toBe(0);
      
      relationship.incrementInteractions();
      relationship.incrementInteractions();
      
      expect(relationship.interactionCount).toBe(2);
    });

    it('should update status with timestamp', () => {
      const updateDate = new Date('2024-01-02T00:00:00Z');
      mockTimestampService.now.mockReturnValue(updateDate);
      
      relationship.updateStatus('blocked');
      
      expect(relationship.status).toBe('blocked');
      expect(relationship.updatedAt).toBe(updateDate);
    });
  });

  describe('Activity Model', () => {
    let activity;
    const validActivityData = {
      userId: 'user-123',
      activityType: 'like',
      targetType: 'content',
      targetId: 'content-456',
      metadata: {
        platform: 'vibestack',
        source: 'mobile'
      }
    };

    beforeEach(() => {
      mockTimestampService.now.mockReturnValue(new Date('2024-01-01T00:00:00Z'));

      activity = new Activity(validActivityData, {
        validationService: mockValidationService,
        encryptionService: mockEncryptionService,
        timestampService: mockTimestampService
      });
    });

    it('should create activity with valid data', () => {
      expect(activity.userId).toBe('user-123');
      expect(activity.activityType).toBe('like');
      expect(activity.targetType).toBe('content');
      expect(activity.targetId).toBe('content-456');
    });

    it('should validate activity types', () => {
      const validTypes = ['like', 'share', 'comment', 'follow', 'view'];
      const invalidType = 'unknown';
      
      validTypes.forEach(type => {
        expect(() => new Activity({ ...validActivityData, activityType: type }, {
          validationService: mockValidationService,
          encryptionService: mockEncryptionService,
          timestampService: mockTimestampService
        })).not.toThrow();
      });
      
      expect(() => new Activity({ ...validActivityData, activityType: invalidType }, {
        validationService: mockValidationService,
        encryptionService: mockEncryptionService,
        timestampService: mockTimestampService
      })).toThrow('Invalid activity type');
    });

    it('should validate target types', () => {
      const validTargetTypes = ['content', 'user', 'challenge', 'habit'];
      const invalidTargetType = 'unknown';
      
      expect(() => new Activity({ ...validActivityData, targetType: invalidTargetType }, {
        validationService: mockValidationService,
        encryptionService: mockEncryptionService,
        timestampService: mockTimestampService
      })).toThrow('Invalid target type');
    });

    it('should track engagement score', () => {
      expect(activity.engagementScore).toBe(1); // Default score for 'like'
      
      const shareActivity = new Activity({ ...validActivityData, activityType: 'share' }, {
        validationService: mockValidationService,
        encryptionService: mockEncryptionService,
        timestampService: mockTimestampService
      });
      
      expect(shareActivity.engagementScore).toBe(3); // Higher score for shares
    });

    it('should calculate time-based engagement decay', () => {
      const oldDate = new Date('2024-01-01T00:00:00Z');
      const recentDate = new Date('2024-01-01T01:00:00Z');
      
      mockTimestampService.now.mockReturnValueOnce(oldDate);
      const oldActivity = new Activity(validActivityData, {
        validationService: mockValidationService,
        encryptionService: mockEncryptionService,
        timestampService: mockTimestampService
      });
      
      mockTimestampService.now.mockReturnValueOnce(recentDate);
      const recentActivity = new Activity(validActivityData, {
        validationService: mockValidationService,
        encryptionService: mockEncryptionService,
        timestampService: mockTimestampService
      });
      
      mockTimestampService.now.mockReturnValue(new Date('2024-01-01T02:00:00Z'));
      
      expect(oldActivity.getDecayedEngagementScore()).toBeLessThan(recentActivity.getDecayedEngagementScore());
    });
  });

  describe('Configuration Model', () => {
    let configuration;
    const validConfigData = {
      userId: 'user-123',
      category: 'privacy',
      settings: {
        profileVisibility: 'friends',
        showOnlineStatus: false,
        allowDirectMessages: true
      }
    };

    beforeEach(() => {
      mockValidationService.validatePrivacyLevel.mockReturnValue({ isValid: true });
      mockTimestampService.now.mockReturnValue(new Date('2024-01-01T00:00:00Z'));

      configuration = new Configuration(validConfigData, {
        validationService: mockValidationService,
        encryptionService: mockEncryptionService,
        timestampService: mockTimestampService
      });
    });

    it('should create configuration with valid data', () => {
      expect(configuration.userId).toBe('user-123');
      expect(configuration.category).toBe('privacy');
      expect(configuration.settings.profileVisibility).toBe('friends');
    });

    it('should validate configuration categories', () => {
      const validCategories = ['privacy', 'notifications', 'appearance', 'security'];
      const invalidCategory = 'unknown';
      
      expect(() => new Configuration({ ...validConfigData, category: invalidCategory }, {
        validationService: mockValidationService,
        encryptionService: mockEncryptionService,
        timestampService: mockTimestampService
      })).toThrow('Invalid configuration category');
    });

    it('should validate privacy settings', () => {
      mockValidationService.validatePrivacyLevel.mockReturnValue({ isValid: false, error: 'Invalid privacy level' });
      
      expect(() => new Configuration({
        ...validConfigData,
        settings: { profileVisibility: 'invalid' }
      }, {
        validationService: mockValidationService,
        encryptionService: mockEncryptionService,
        timestampService: mockTimestampService
      })).toThrow('Invalid privacy level');
    });

    it('should merge settings with defaults', () => {
      const partialSettings = { profileVisibility: 'public' };
      const configWithDefaults = new Configuration({
        ...validConfigData,
        settings: partialSettings
      }, {
        validationService: mockValidationService,
        encryptionService: mockEncryptionService,
        timestampService: mockTimestampService
      });
      
      expect(configWithDefaults.settings.profileVisibility).toBe('public');
      expect(configWithDefaults.settings.showOnlineStatus).toBeDefined(); // Should have default value
    });

    it('should encrypt sensitive configuration data', () => {
      const sensitiveConfig = new Configuration({
        userId: 'user-123',
        category: 'security',
        settings: {
          twoFactorSecret: 'secret123',
          backupCodes: ['code1', 'code2']
        }
      }, {
        validationService: mockValidationService,
        encryptionService: mockEncryptionService,
        timestampService: mockTimestampService
      });
      
      expect(mockEncryptionService.encrypt).toHaveBeenCalledWith('secret123');
    });
  });

  describe('ModelFactoryService', () => {
    let factoryService;

    beforeEach(() => {
      factoryService = new ModelFactoryService({
        validationService: mockValidationService,
        encryptionService: mockEncryptionService,
        timestampService: mockTimestampService
      });
    });

    it('should create models using factory pattern', () => {
      const userData = { email: 'test@example.com', username: 'test' };
      
      const user = factoryService.createUser(userData);
      
      expect(user).toBeInstanceOf(User);
      expect(user.email).toBeDefined();
    });

    it('should validate data before model creation', () => {
      const invalidData = { email: 'invalid-email' };
      
      mockValidationService.validateEmail.mockReturnValue({ isValid: false, error: 'Invalid email' });
      
      expect(() => factoryService.createUser(invalidData)).toThrow('Invalid email');
    });

    it('should create models with consistent dependencies', () => {
      const user = factoryService.createUser({ email: 'test@example.com', username: 'test' });
      const content = factoryService.createContent({ userId: user.id, contentType: 'text', content: 'test' });
      
      expect(user.validationService).toBe(mockValidationService);
      expect(content.validationService).toBe(mockValidationService);
    });

    it('should support batch model creation', () => {
      const usersData = [
        { email: 'user1@example.com', username: 'user1' },
        { email: 'user2@example.com', username: 'user2' }
      ];
      
      const users = factoryService.createUsers(usersData);
      
      expect(users).toHaveLength(2);
      expect(users[0]).toBeInstanceOf(User);
      expect(users[1]).toBeInstanceOf(User);
    });
  });

  describe('Cross-Model Relationships', () => {
    it('should maintain referential integrity between User and Content', () => {
      const user = new User({ email: 'test@example.com', username: 'test' }, {
        validationService: mockValidationService,
        encryptionService: mockEncryptionService,
        timestampService: mockTimestampService
      });
      
      const content = new Content({ userId: user.id, contentType: 'text', content: 'test' }, {
        validationService: mockValidationService,
        encryptionService: mockEncryptionService,
        timestampService: mockTimestampService
      });
      
      expect(content.userId).toBe(user.id);
    });

    it('should validate relationship constraints', () => {
      const user1Id = 'user-123';
      const user2Id = 'user-456';
      
      // Should not allow duplicate relationships
      const relationship1 = new Relationship({ userId1: user1Id, userId2: user2Id, relationshipType: 'friend' }, {
        validationService: mockValidationService,
        encryptionService: mockEncryptionService,
        timestampService: mockTimestampService
      });
      
      expect(() => new Relationship({ userId1: user1Id, userId2: user2Id, relationshipType: 'friend' }, {
        validationService: mockValidationService,
        encryptionService: mockEncryptionService,
        timestampService: mockTimestampService
      })).toThrow('Relationship already exists');
    });

    it('should cascade privacy settings across related models', () => {
      const user = new User({ 
        email: 'test@example.com', 
        username: 'test',
        dataConsentLevel: 'bronze'
      }, {
        validationService: mockValidationService,
        encryptionService: mockEncryptionService,
        timestampService: mockTimestampService
      });
      
      const content = new Content({ 
        userId: user.id, 
        contentType: 'text', 
        content: 'test',
        visibility: 'public'
      }, {
        validationService: mockValidationService,
        encryptionService: mockEncryptionService,
        timestampService: mockTimestampService
      });
      
      // Content should respect user's privacy settings
      expect(content.getEffectiveVisibility(user)).toBe('friends'); // Downgraded due to bronze consent
    });
  });

  describe('Data Validation Edge Cases', () => {
    it('should handle null and undefined values gracefully', () => {
      expect(() => new User(null, {
        validationService: mockValidationService,
        encryptionService: mockEncryptionService,
        timestampService: mockTimestampService
      })).toThrow('User data cannot be null or undefined');
      
      expect(() => new User(undefined, {
        validationService: mockValidationService,
        encryptionService: mockEncryptionService,
        timestampService: mockTimestampService
      })).toThrow('User data cannot be null or undefined');
    });

    it('should validate data type constraints', () => {
      expect(() => new User({ email: 123, username: 'test' }, {
        validationService: mockValidationService,
        encryptionService: mockEncryptionService,
        timestampService: mockTimestampService
      })).toThrow('Email must be a string');
    });

    it('should handle extremely large data sets', () => {
      const largeMetadata = {};
      for (let i = 0; i < 10000; i++) {
        largeMetadata[`key${i}`] = `value${i}`;
      }
      
      expect(() => new Content({ 
        userId: 'user-123',
        contentType: 'text',
        content: 'test',
        metadata: largeMetadata
      }, {
        validationService: mockValidationService,
        encryptionService: mockEncryptionService,
        timestampService: mockTimestampService
      })).toThrow('Metadata size exceeds maximum limit');
    });

    it('should validate timestamp constraints', () => {
      const futureDate = new Date('2030-01-01T00:00:00Z');
      
      mockTimestampService.isValidTimestamp.mockReturnValue(false);
      
      expect(() => new Activity({ 
        userId: 'user-123',
        activityType: 'like',
        targetType: 'content',
        targetId: 'content-456',
        timestamp: futureDate
      }, {
        validationService: mockValidationService,
        encryptionService: mockEncryptionService,
        timestampService: mockTimestampService
      })).toThrow('Invalid timestamp: cannot be in the future');
    });
  });
});