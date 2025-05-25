// src/models/coreModels.js

/**
 * Core Models for VibeStack - Minimal, production-ready, test-driven implementation.
 * All models use dependency injection for validation, encryption, and timestamp services.
 * Follows London School TDD and business rules as defined in the comprehensive test suite.
 */

const { v4: uuidv4 } = require('uuid'); // Use uuid for RFC4122-compliant IDs

// --- Error Class ---
class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

// --- Base Model ---
class BaseModel {
  /**
   * @param {Object} deps - { validationService, encryptionService, timestampService }
   */
  constructor(deps = {}) {
    const { validationService, encryptionService, timestampService } = deps;
    if (!validationService || !encryptionService || !timestampService) {
      throw new Error('Required dependencies missing for BaseModel');
    }
    this.validationService = validationService;
    this.encryptionService = encryptionService;
    this.timestampService = timestampService;

    this.id = uuidv4();
    const now = this.timestampService.now();
    this.createdAt = now;
    this.updatedAt = now;
    this.requiredFields = [];
  }

  touch() {
    this.updatedAt = this.timestampService.now();
  }

  validate() {
    if (this.requiredFields && Array.isArray(this.requiredFields)) {
      for (const field of this.requiredFields) {
        if (this[field] === undefined || this[field] === null || this[field] === '') {
          throw new ValidationError(`Required field missing: ${field}`);
        }
      }
    }
  }

  toJSON(opts = {}) {
    // Default: exclude sensitive fields
    const exclude = opts.includePrivate ? [] : (this._privateFields || []);
    const obj = {};
    for (const key of Object.keys(this)) {
      if (typeof this[key] === 'function' || key.startsWith('_')) continue;
      if (exclude.includes(key)) continue;
      if (this[key] instanceof Date) {
        obj[key] = this[key].toISOString();
      } else {
        obj[key] = this[key];
      }
    }
    return obj;
  }
}

// --- User Model ---
const USER_TIERS = ['free', 'premium', 'pro', 'enterprise'];
const CONSENT_LEVELS = ['bronze', 'silver', 'gold'];
const ACCOUNT_STATUSES = ['active', 'suspended', 'deleted'];

class User extends BaseModel {
  /**
   * @param {Object} data - User fields
   * @param {Object} deps - DI
   */
  constructor(data, deps) {
    super(deps);
    if (!data) throw new ValidationError('User data cannot be null or undefined');
    const {
      email, username, displayName, profileImageUrl, accountStatus = 'active',
      subscriptionTier = 'free', dataConsentLevel = 'bronze', preferredLanguage, timezone,
      privacySettings, lastActive
    } = data;

    if (typeof email !== 'string') throw new ValidationError('Email must be a string');
    const emailValidation = this.validationService.validateEmail(email);
    if (!emailValidation.isValid) throw new ValidationError(emailValidation.error || 'Invalid email format');
    this.email = this.encryptionService.encrypt(email);

    const usernameValidation = this.validationService.validateUsername(username);
    if (!usernameValidation.isValid) throw new ValidationError(usernameValidation.error || 'Invalid username');
    this.username = username;

    this.displayName = displayName;
    this.profileImageUrl = profileImageUrl;
    this.accountStatus = accountStatus;
    if (!ACCOUNT_STATUSES.includes(accountStatus)) throw new ValidationError('Invalid account status');

    this.subscriptionTier = subscriptionTier;
    if (!USER_TIERS.includes(subscriptionTier)) throw new ValidationError('Invalid subscription tier');

    this.dataConsentLevel = dataConsentLevel;
    if (!CONSENT_LEVELS.includes(dataConsentLevel)) throw new ValidationError('Invalid data consent level');

    this.preferredLanguage = preferredLanguage;
    this.timezone = timezone;
    this.privacySettings = privacySettings || {};
    this.lastActive = lastActive || this.createdAt;

    // --- MFA fields ---
    /**
     * Multi-Factor Authentication (MFA) properties for admin account protection.
     * - mfaEnabled: Is MFA required for this user?
     * - mfaSecret: Encrypted TOTP secret (never exposed in plain text)
     * - mfaBackupCodes: Encrypted array of single-use backup codes
     * - mfaDevices: Array of registered MFA device metadata
     * - mfaEnrolledAt: Timestamp of MFA enrollment
     * - mfaLastVerifiedAt: Last successful MFA verification
     * - mfaResetRequestedAt: Timestamp of last MFA reset request
     */
    this.mfaEnabled = !!data.mfaEnabled;
    this.mfaSecret = data.mfaSecret
      ? this.encryptionService.encrypt(data.mfaSecret)
      : null;
    this.mfaBackupCodes = Array.isArray(data.mfaBackupCodes)
      ? this.encryptionService.encrypt(JSON.stringify(data.mfaBackupCodes))
      : null;
    this.mfaDevices = Array.isArray(data.mfaDevices) ? data.mfaDevices : [];
    this.mfaEnrolledAt = data.mfaEnrolledAt || null;
    this.mfaLastVerifiedAt = data.mfaLastVerifiedAt || null;
    this.mfaResetRequestedAt = data.mfaResetRequestedAt || null;

    this.requiredFields = ['email', 'username'];
    // Add MFA fields to private fields to prevent accidental exposure
    this._privateFields = ['email', 'mfaSecret', 'mfaBackupCodes', 'mfaDevices'];
  }

  updateLastActive() {
    this.lastActive = this.timestampService.now();
    this.touch();
  }

  toJSON(opts = {}) {
    // Exclude email unless includePrivate is true
    return super.toJSON(opts);
  }
}

// --- Content Model ---
const CONTENT_TYPES = ['text', 'image', 'video', 'audio', 'link'];
const VISIBILITY = ['public', 'friends', 'private'];
const MAX_CONTENT_LENGTH = 5000;
const MAX_METADATA_SIZE = 5000;

function normalizeTag(tag) {
  return tag
    .toLowerCase()
    .replace(/\s+/g, '-')           // Convert spaces to hyphens first
    .replace(/[^a-z0-9\-]/g, '')    // Remove non-alphanumeric except hyphens
    .replace(/--+/g, '-')           // Remove multiple consecutive hyphens
    .replace(/^-+|-+$/g, '');       // Remove leading/trailing hyphens
}

class Content extends BaseModel {
  constructor(data, deps) {
    super(deps);
    if (!data) throw new ValidationError('Content data cannot be null or undefined');
    const {
      userId, contentType, content, visibility = 'public', tags = [],
      metadata = {}, moderationStatus = 'pending'
    } = data;

    this.userId = userId;
    this.contentType = contentType;
    if (!CONTENT_TYPES.includes(contentType)) throw new ValidationError('Invalid content type');

    if (typeof content !== 'string') throw new ValidationError('Content must be a string');
    if (content.length > MAX_CONTENT_LENGTH) throw new ValidationError('Content exceeds maximum length');
    this.content = this.validationService.sanitizeInput(content);

    this.visibility = visibility;
    if (!VISIBILITY.includes(visibility)) throw new ValidationError('Invalid visibility setting');

    // Tag normalization
    this.tags = Array.isArray(tags) ? tags.map(normalizeTag) : [];
    this.metadata = metadata;
    if (metadata && Object.keys(metadata).length > MAX_METADATA_SIZE) {
      throw new ValidationError('Metadata size exceeds maximum limit');
    }

    this.moderationStatus = moderationStatus;
    this.likeCount = 0;
    this.shareCount = 0;
    this.commentCount = 0;

    this.requiredFields = ['userId', 'contentType', 'content'];
    this._privateFields = [];
  }

  setModerationStatus(status) {
    this.moderationStatus = status;
  }

  incrementLikes() { this.likeCount++; }
  incrementShares() { this.shareCount++; }
  incrementComments() { this.commentCount++; }

  getEffectiveVisibility(user) {
    // Downgrade visibility if user's consent is bronze
    if (user && user.dataConsentLevel === 'bronze') return 'friends';
    return this.visibility;
  }
}

// --- Relationship Model ---
const REL_TYPES = ['friend', 'follow', 'block'];
const REL_STATUSES = ['pending', 'active', 'rejected', 'blocked'];
const _relationshipRegistry = new Set();

// Function to clear relationship registry for testing
function clearRelationshipRegistry() {
  _relationshipRegistry.clear();
}

class Relationship extends BaseModel {
  constructor(data, deps) {
    super(deps);
    if (!data) throw new ValidationError('Relationship data cannot be null or undefined');
    const { userId1, userId2, relationshipType, status = 'pending' } = data;

    if (userId1 === userId2) throw new ValidationError('Cannot create relationship with self');
    if (!REL_TYPES.includes(relationshipType)) throw new ValidationError('Invalid relationship type');
    if (!REL_STATUSES.includes(status)) throw new ValidationError('Invalid relationship status');

    // Prevent duplicate relationships (unordered for bidirectional)
    const relKey = relationshipType === 'friend'
      ? [userId1, userId2].sort().join(':') + ':' + relationshipType
      : `${userId1}:${userId2}:${relationshipType}`;
    if (_relationshipRegistry.has(relKey)) throw new ValidationError('Relationship already exists');
    _relationshipRegistry.add(relKey);

    this.userId1 = userId1;
    this.userId2 = userId2;
    this.relationshipType = relationshipType;
    this.status = status;
    this.interactionCount = 0;

    this.requiredFields = ['userId1', 'userId2', 'relationshipType'];
    this._privateFields = [];
  }

  isBidirectional() {
    return this.relationshipType === 'friend';
  }

  incrementInteractions() {
    this.interactionCount++;
  }

  updateStatus(newStatus) {
    if (!REL_STATUSES.includes(newStatus)) throw new ValidationError('Invalid relationship status');
    this.status = newStatus;
    this.touch();
  }
}
// --- Activity Model ---
const ACTIVITY_TYPES = ['like', 'share', 'comment', 'follow', 'view'];
const TARGET_TYPES = ['content', 'user', 'challenge', 'habit'];
const ACTIVITY_SCORES = { like: 1, share: 3, comment: 2, follow: 1, view: 0.5 };

class Activity extends BaseModel {
  constructor(data, deps) {
    super(deps);
    if (!data) throw new ValidationError('Activity data cannot be null or undefined');
    const {
      userId, activityType, targetType, targetId, metadata = {}, timestamp
    } = data;

    this.userId = userId;
    this.activityType = activityType;
    if (!ACTIVITY_TYPES.includes(activityType)) throw new ValidationError('Invalid activity type');

    this.targetType = targetType;
    if (!TARGET_TYPES.includes(targetType)) throw new ValidationError('Invalid target type');

    this.targetId = targetId;
    this.metadata = metadata;

    // Timestamp validation
    if (timestamp) {
      if (!this.timestampService.isValidTimestamp(timestamp)) {
        throw new ValidationError('Invalid timestamp: cannot be in the future');
      }
      this.createdAt = timestamp;
      this.updatedAt = timestamp;
    }

    this.engagementScore = ACTIVITY_SCORES[activityType] || 1;
    this.requiredFields = ['userId', 'activityType', 'targetType', 'targetId'];
    this._privateFields = [];
  }

  getDecayedEngagementScore() {
    // Simple time decay: halve score every hour since createdAt
    const now = this.timestampService.now();
    const hours = Math.max(0, (now - this.createdAt) / (1000 * 60 * 60));
    return this.engagementScore * Math.pow(0.5, hours);
  }
}

// --- Configuration Model ---
const CONFIG_CATEGORIES = ['privacy', 'notifications', 'appearance', 'security'];
const DEFAULT_SETTINGS = {
  privacy: { profileVisibility: 'friends', showOnlineStatus: true, allowDirectMessages: true },
  notifications: { email: true, push: true },
  appearance: { theme: 'light' },
  security: {}
};

class Configuration extends BaseModel {
  constructor(data, deps) {
    super(deps);
    if (!data) throw new ValidationError('Configuration data cannot be null or undefined');
    const { userId, category, settings = {} } = data;

    this.userId = userId;
    this.category = category;
    if (!CONFIG_CATEGORIES.includes(category)) throw new ValidationError('Invalid configuration category');

    // Merge with defaults
    this.settings = { ...DEFAULT_SETTINGS[category], ...settings };

    // Validate privacy settings if applicable
    if (category === 'privacy' && this.settings.profileVisibility) {
      const result = this.validationService.validatePrivacyLevel(this.settings.profileVisibility);
      if (!result.isValid) throw new ValidationError(result.error || 'Invalid privacy level');
    }

    // Encrypt sensitive data for security category
    if (category === 'security') {
      for (const key of Object.keys(this.settings)) {
        if (typeof this.settings[key] === 'string') {
          this.settings[key] = this.encryptionService.encrypt(this.settings[key]);
        }
        if (Array.isArray(this.settings[key])) {
          this.settings[key] = this.settings[key].map(val =>
            typeof val === 'string' ? this.encryptionService.encrypt(val) : val
          );
        }
      }
    }

    this.requiredFields = ['userId', 'category'];
    this._privateFields = [];
  }
}

// --- Model Factory Service ---
class ModelFactoryService {
  constructor(deps) {
    if (!deps || !deps.validationService || !deps.encryptionService || !deps.timestampService) {
      throw new Error('Required dependencies missing for ModelFactoryService');
    }
    this.validationService = deps.validationService;
    this.encryptionService = deps.encryptionService;
    this.timestampService = deps.timestampService;
  }

  createUser(data) {
    return new User(data, this._deps());
  }
  createContent(data) {
    return new Content(data, this._deps());
  }
  createRelationship(data) {
    return new Relationship(data, this._deps());
  }
  createActivity(data) {
    return new Activity(data, this._deps());
  }
  createConfiguration(data) {
    return new Configuration(data, this._deps());
  }

  createUsers(arr) {
    return arr.map(data => this.createUser(data));
  }
  createContents(arr) {
    return arr.map(data => this.createContent(data));
  }
  createRelationships(arr) {
    return arr.map(data => this.createRelationship(data));
  }
  createActivities(arr) {
    return arr.map(data => this.createActivity(data));
  }
  createConfigurations(arr) {
    return arr.map(data => this.createConfiguration(data));
  }

  _deps() {
    return {
      validationService: this.validationService,
      encryptionService: this.encryptionService,
      timestampService: this.timestampService
    };
  }
}

// --- Exports ---
module.exports = {
  BaseModel,
  User,
  Content,
  Relationship,
  Activity,
  Configuration,
  ValidationError,
  ModelFactoryService,
  clearRelationshipRegistry
};