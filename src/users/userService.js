// src/users/userService.js

/**
 * UserService - Minimal, production-ready, test-driven implementation.
 * Provides user profile and relationship management with privacy, validation, and security.
 * All dependencies are injected for testability and modularity.
 */

const {
  ValidationError,
} = require('../models/coreModels');

/**
 * UserService class for user profile and relationship management.
 */
class UserService {
  /**
   * @param {Object} deps
   * @param {Object} deps.userRepository
   * @param {Object} deps.validationService
   * @param {Object} deps.authService
   * @param {Object} deps.relationshipRepository
   */
  constructor(deps) {
    if (
      !deps ||
      !deps.userRepository ||
      !deps.validationService ||
      !deps.authService ||
      !deps.relationshipRepository
    ) {
      throw new Error('Required dependencies missing');
    }
    this.userRepository = deps.userRepository;
    this.validationService = deps.validationService;
    this.authService = deps.authService;
    this.relationshipRepository = deps.relationshipRepository;
  }

  /**
   * Create a new user profile after validation and sanitization.
   * @param {Object} userData
   * @returns {Promise<Object>}
   */
  async createProfile(userData) {
    // Validate input
    const validation = this.validationService.validateProfileData(userData);
    if (!validation.isValid) {
      throw new ValidationError(
        (validation.errors && validation.errors[0]) || 'Invalid profile data'
      );
    }
    // Sanitize input
    const sanitized = this.validationService.sanitizeInput(userData);
    // Check for existing profile
    const existing = await this.userRepository.findById(userData.userId);
    if (existing) {
      throw new ValidationError('User profile already exists');
    }
    // Create profile
    const saved = await this.userRepository.create(sanitized);
    return saved;
  }

  /**
   * Retrieve a user profile by ID, enforcing privacy settings.
   * @param {string} userId
   * @param {string} [requestingUserId]
   * @returns {Promise<Object>}
   */
  async getProfile(userId, requestingUserId) {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new ValidationError('Invalid user ID format');
    }
    const profile = await this.userRepository.findById(userId);
    if (!profile) {
      throw new ValidationError('Profile not found');
    }
    
    // If no requesting user provided, get current user from auth service
    if (!requestingUserId) {
      const currentUser = await this.authService.getCurrentUser();
      requestingUserId = currentUser ? currentUser.id : null;
    }
    
    // Privacy enforcement
    if (
      profile.preferences &&
      profile.preferences.privacy === 'friends' &&
      requestingUserId &&
      requestingUserId !== profile.userId
    ) {
      const friends = await this.relationshipRepository.getFriends(profile.userId);
      if (!friends.includes(requestingUserId)) {
        throw new ValidationError('Insufficient permissions to view profile');
      }
    }
    if (
      profile.preferences &&
      profile.preferences.privacy === 'private' &&
      requestingUserId !== profile.userId
    ) {
      throw new ValidationError('Insufficient permissions to view profile');
    }
    return profile;
  }

  /**
   * Retrieve a user profile by email.
   * @param {string} email
   * @returns {Promise<Object>}
   */
  async getProfileByEmail(email) {
    const profile = await this.userRepository.findByEmail(email);
    if (!profile) {
      throw new ValidationError('Profile not found');
    }
    return profile;
  }

  /**
   * Update a user profile with validation and sanitization.
   * @param {string} userId
   * @param {Object} updateData
   * @returns {Promise<Object>}
   */
  async updateProfile(userId, updateData) {
    const profile = await this.userRepository.findById(userId);
    if (!profile) {
      throw new ValidationError('Profile not found');
    }
    const validation = this.validationService.validateProfileData(updateData);
    if (!validation.isValid) {
      throw new ValidationError(
        (validation.errors && validation.errors[0]) || 'Invalid profile data'
      );
    }
    const sanitized = this.validationService.sanitizeInput(updateData);
    const updated = await this.userRepository.update(userId, sanitized);
    return updated;
  }

  /**
   * Delete a user profile (soft or hard delete).
   * @param {string} userId
   * @param {Object} [options]
   * @param {boolean} [options.hardDelete]
   * @returns {Promise<Object|boolean>}
   */
  async deleteProfile(userId, options = {}) {
    const profile = await this.userRepository.findById(userId);
    if (!profile) {
      throw new ValidationError('Profile not found');
    }
    if (options.hardDelete) {
      return await this.userRepository.delete(userId);
    }
    // Soft delete: mark as inactive and set deletedAt
    const update = {
      isActive: false,
      deletedAt: new Date(),
    };
    return await this.userRepository.update(userId, update);
  }

  /**
   * Add a friend relationship.
   * @param {string} targetUserId
   * @returns {Promise<boolean>}
   */
  async addFriend(targetUserId) {
    const currentUser = await this.authService.getCurrentUser();
    if (!currentUser || !currentUser.id) {
      throw new ValidationError('Authentication required');
    }
    if (currentUser.id === targetUserId) {
      throw new ValidationError('Cannot add yourself as friend');
    }
    const targetProfile = await this.userRepository.findById(targetUserId);
    if (!targetProfile) {
      throw new ValidationError('Profile not found');
    }
    const isBlocked = await this.relationshipRepository.isBlocked(
      currentUser.id,
      targetUserId
    );
    if (isBlocked) {
      throw new ValidationError('Cannot add blocked user as friend');
    }
    return await this.relationshipRepository.addFriend(currentUser.id, targetUserId);
  }

  /**
   * Remove a friend relationship.
   * @param {string} targetUserId
   * @returns {Promise<boolean>}
   */
  async removeFriend(targetUserId) {
    const currentUser = await this.authService.getCurrentUser();
    if (!currentUser || !currentUser.id) {
      throw new ValidationError('Authentication required');
    }
    return await this.relationshipRepository.removeFriend(
      currentUser.id,
      targetUserId
    );
  }

  /**
   * Get the current user's friends list.
   * @returns {Promise<Array>}
   */
  async getFriends() {
    const currentUser = await this.authService.getCurrentUser();
    if (!currentUser || !currentUser.id) {
      throw new ValidationError('Authentication required');
    }
    const friendIds = await this.relationshipRepository.getFriends(currentUser.id);
    return await this.userRepository.findByIds(friendIds);
  }

  /**
   * Block a user and remove any existing friendship.
   * @param {string} targetUserId
   * @returns {Promise<boolean>}
   */
  async blockUser(targetUserId) {
    const currentUser = await this.authService.getCurrentUser();
    if (!currentUser || !currentUser.id) {
      throw new ValidationError('Authentication required');
    }
    if (currentUser.id === targetUserId) {
      throw new ValidationError('Cannot block yourself');
    }
    const targetProfile = await this.userRepository.findById(targetUserId);
    if (!targetProfile) {
      throw new ValidationError('Profile not found');
    }
    await this.relationshipRepository.removeFriend(currentUser.id, targetUserId);
    return await this.relationshipRepository.blockUser(
      currentUser.id,
      targetUserId
    );
  }

  /**
   * Unblock a user.
   * @param {string} targetUserId
   * @returns {Promise<boolean>}
   */
  async unblockUser(targetUserId) {
    const currentUser = await this.authService.getCurrentUser();
    if (!currentUser || !currentUser.id) {
      throw new ValidationError('Authentication required');
    }
    return await this.relationshipRepository.unblockUser(
      currentUser.id,
      targetUserId
    );
  }

  /**
   * Get the current user's blocked users list.
   * @returns {Promise<Array>}
   */
  async getBlockedUsers() {
    const currentUser = await this.authService.getCurrentUser();
    if (!currentUser || !currentUser.id) {
      throw new ValidationError('Authentication required');
    }
    const blockedIds = await this.relationshipRepository.getBlockedUsers(
      currentUser.id
    );
    return await this.userRepository.findByIds(blockedIds);
  }
}

module.exports = UserService;