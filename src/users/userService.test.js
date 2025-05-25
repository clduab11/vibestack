// src/users/userService.test.js

/**
 * UserService TDD Test Suite - London School Outside-In Approach
 * 
 * Defines the UserService interface and behavior through comprehensive tests.
 * Tests cover profile management, validation, relationships, and error handling.
 * All dependencies are mocked to ensure unit test isolation.
 */

const UserService = require('./userService');

describe('UserService', () => {
  let userService;
  let mockUserRepository;
  let mockValidationService;
  let mockAuthService;
  let mockRelationshipRepository;

  beforeEach(() => {
    // Mock dependencies using London School approach
    mockUserRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findByIds: jest.fn()
    };

    mockValidationService = {
      validateProfileData: jest.fn(),
      sanitizeInput: jest.fn(),
      isValidPhoneNumber: jest.fn(),
      isValidDate: jest.fn()
    };

    mockAuthService = {
      getCurrentUser: jest.fn(),
      hasPermission: jest.fn()
    };

    mockRelationshipRepository = {
      addFriend: jest.fn(),
      removeFriend: jest.fn(),
      getFriends: jest.fn(),
      blockUser: jest.fn(),
      unblockUser: jest.fn(),
      getBlockedUsers: jest.fn(),
      isBlocked: jest.fn()
    };

    // Instantiate UserService with mocked dependencies
    userService = new UserService({
      userRepository: mockUserRepository,
      validationService: mockValidationService,
      authService: mockAuthService,
      relationshipRepository: mockRelationshipRepository
    });
  });

  describe('constructor', () => {
    it('should initialize with all required dependencies', () => {
      expect(userService.userRepository).toBe(mockUserRepository);
      expect(userService.validationService).toBe(mockValidationService);
      expect(userService.authService).toBe(mockAuthService);
      expect(userService.relationshipRepository).toBe(mockRelationshipRepository);
    });

    it('should throw error when required dependencies are missing', () => {
      expect(() => new UserService({})).toThrow('Required dependencies missing');
    });
  });

  describe('createProfile', () => {
    const validProfileData = {
      userId: 'user-123',
      name: 'John Doe',
      bio: 'Software developer',
      avatar: 'https://example.com/avatar.jpg',
      phone: '+1234567890',
      birthDate: '1990-01-01',
      preferences: {
        privacy: 'friends',
        notifications: true
      }
    };

    it('should create user profile with valid data', async () => {
      // Arrange
      const sanitizedData = { ...validProfileData, bio: 'Clean bio' };
      const savedProfile = { id: 'profile-123', ...sanitizedData, createdAt: new Date() };

      mockValidationService.validateProfileData.mockReturnValue({ isValid: true });
      mockValidationService.sanitizeInput.mockReturnValue(sanitizedData);
      mockUserRepository.findById.mockResolvedValue(null); // No existing profile
      mockUserRepository.create.mockResolvedValue(savedProfile);

      // Act
      const result = await userService.createProfile(validProfileData);

      // Assert
      expect(mockValidationService.validateProfileData).toHaveBeenCalledWith(validProfileData);
      expect(mockValidationService.sanitizeInput).toHaveBeenCalledWith(validProfileData);
      expect(mockUserRepository.findById).toHaveBeenCalledWith('user-123');
      expect(mockUserRepository.create).toHaveBeenCalledWith(sanitizedData);
      expect(result).toEqual(savedProfile);
    });

    it('should throw error when profile data is invalid', async () => {
      // Arrange
      const invalidData = { ...validProfileData, name: '' };
      mockValidationService.validateProfileData.mockReturnValue({
        isValid: false,
        errors: ['Name is required']
      });

      // Act & Assert
      await expect(userService.createProfile(invalidData)).rejects.toThrow('Name is required');
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it('should throw error when user profile already exists', async () => {
      // Arrange
      mockValidationService.validateProfileData.mockReturnValue({ isValid: true });
      mockUserRepository.findById.mockResolvedValue({ id: 'existing-profile' });

      // Act & Assert
      await expect(userService.createProfile(validProfileData)).rejects.toThrow('User profile already exists');
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it('should sanitize input data to prevent XSS attacks', async () => {
      // Arrange
      const maliciousData = {
        ...validProfileData,
        bio: '<script>alert("xss")</script>Hacker bio'
      };
      const sanitizedData = { ...validProfileData, bio: 'Hacker bio' };

      mockValidationService.validateProfileData.mockReturnValue({ isValid: true });
      mockValidationService.sanitizeInput.mockReturnValue(sanitizedData);
      mockUserRepository.findById.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue({ id: 'profile-123', ...sanitizedData });

      // Act
      await userService.createProfile(maliciousData);

      // Assert
      expect(mockValidationService.sanitizeInput).toHaveBeenCalledWith(maliciousData);
      expect(mockUserRepository.create).toHaveBeenCalledWith(sanitizedData);
    });
  });

  describe('getProfile', () => {
    it('should retrieve user profile by ID', async () => {
      // Arrange
      const profileId = 'profile-123';
      const mockProfile = {
        id: profileId,
        userId: 'user-123',
        name: 'John Doe',
        bio: 'Software developer'
      };
      mockUserRepository.findById.mockResolvedValue(mockProfile);

      // Act
      const result = await userService.getProfile(profileId);

      // Assert
      expect(mockUserRepository.findById).toHaveBeenCalledWith(profileId);
      expect(result).toEqual(mockProfile);
    });

    it('should throw error when profile not found', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(userService.getProfile('nonexistent-id')).rejects.toThrow('Profile not found');
    });

    it('should retrieve user profile by email', async () => {
      // Arrange
      const email = 'john@example.com';
      const mockProfile = { id: 'profile-123', email, name: 'John Doe' };
      mockUserRepository.findByEmail.mockResolvedValue(mockProfile);

      // Act
      const result = await userService.getProfileByEmail(email);

      // Assert
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(email);
      expect(result).toEqual(mockProfile);
    });
  });

  describe('updateProfile', () => {
    const updateData = {
      name: 'Jane Smith',
      bio: 'Updated bio',
      preferences: { privacy: 'public' }
    };

    it('should update user profile with valid data', async () => {
      // Arrange
      const profileId = 'profile-123';
      const existingProfile = { id: profileId, name: 'John Doe', bio: 'Old bio' };
      const sanitizedData = { ...updateData, bio: 'Clean updated bio' };
      const updatedProfile = { ...existingProfile, ...sanitizedData, updatedAt: new Date() };

      mockUserRepository.findById.mockResolvedValue(existingProfile);
      mockValidationService.validateProfileData.mockReturnValue({ isValid: true });
      mockValidationService.sanitizeInput.mockReturnValue(sanitizedData);
      mockUserRepository.update.mockResolvedValue(updatedProfile);

      // Act
      const result = await userService.updateProfile(profileId, updateData);

      // Assert
      expect(mockUserRepository.findById).toHaveBeenCalledWith(profileId);
      expect(mockValidationService.validateProfileData).toHaveBeenCalledWith(updateData);
      expect(mockValidationService.sanitizeInput).toHaveBeenCalledWith(updateData);
      expect(mockUserRepository.update).toHaveBeenCalledWith(profileId, sanitizedData);
      expect(result).toEqual(updatedProfile);
    });

    it('should throw error when profile does not exist', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(userService.updateProfile('nonexistent-id', updateData)).rejects.toThrow('Profile not found');
      expect(mockUserRepository.update).not.toHaveBeenCalled();
    });

    it('should handle partial updates correctly', async () => {
      // Arrange
      const profileId = 'profile-123';
      const partialUpdate = { bio: 'New bio only' };
      const existingProfile = { id: profileId, name: 'John Doe', bio: 'Old bio' };

      mockUserRepository.findById.mockResolvedValue(existingProfile);
      mockValidationService.validateProfileData.mockReturnValue({ isValid: true });
      mockValidationService.sanitizeInput.mockReturnValue(partialUpdate);
      mockUserRepository.update.mockResolvedValue({ ...existingProfile, ...partialUpdate });

      // Act
      const result = await userService.updateProfile(profileId, partialUpdate);

      // Assert
      expect(result.name).toBe('John Doe'); // Should retain existing data
      expect(result.bio).toBe('New bio only'); // Should update specified field
    });
  });

  describe('deleteProfile', () => {
    it('should delete user profile (soft delete)', async () => {
      // Arrange
      const profileId = 'profile-123';
      const existingProfile = { id: profileId, name: 'John Doe' };
      const deletedProfile = { ...existingProfile, deletedAt: new Date(), isActive: false };

      mockUserRepository.findById.mockResolvedValue(existingProfile);
      mockUserRepository.update.mockResolvedValue(deletedProfile);

      // Act
      const result = await userService.deleteProfile(profileId);

      // Assert
      expect(mockUserRepository.findById).toHaveBeenCalledWith(profileId);
      expect(mockUserRepository.update).toHaveBeenCalledWith(profileId, {
        isActive: false,
        deletedAt: expect.any(Date)
      });
      expect(result.isActive).toBe(false);
    });

    it('should perform hard delete when specified', async () => {
      // Arrange
      const profileId = 'profile-123';
      const existingProfile = { id: profileId, name: 'John Doe' };

      mockUserRepository.findById.mockResolvedValue(existingProfile);
      mockUserRepository.delete.mockResolvedValue(true);

      // Act
      const result = await userService.deleteProfile(profileId, { hardDelete: true });

      // Assert
      expect(mockUserRepository.delete).toHaveBeenCalledWith(profileId);
      expect(result).toBe(true);
    });

    it('should throw error when profile does not exist', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(userService.deleteProfile('nonexistent-id')).rejects.toThrow('Profile not found');
      expect(mockUserRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('manageFriends', () => {
    const currentUserId = 'user-123';
    const friendUserId = 'user-456';

    beforeEach(() => {
      mockAuthService.getCurrentUser.mockResolvedValue({ id: currentUserId });
    });

    it('should add friend successfully', async () => {
      // Arrange
      const friendProfile = { id: friendUserId, name: 'Friend User' };
      mockUserRepository.findById.mockResolvedValue(friendProfile);
      mockRelationshipRepository.isBlocked.mockResolvedValue(false);
      mockRelationshipRepository.addFriend.mockResolvedValue(true);

      // Act
      const result = await userService.addFriend(friendUserId);

      // Assert
      expect(mockUserRepository.findById).toHaveBeenCalledWith(friendUserId);
      expect(mockRelationshipRepository.isBlocked).toHaveBeenCalledWith(currentUserId, friendUserId);
      expect(mockRelationshipRepository.addFriend).toHaveBeenCalledWith(currentUserId, friendUserId);
      expect(result).toBe(true);
    });

    it('should throw error when trying to add blocked user as friend', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue({ id: friendUserId });
      mockRelationshipRepository.isBlocked.mockResolvedValue(true);

      // Act & Assert
      await expect(userService.addFriend(friendUserId)).rejects.toThrow('Cannot add blocked user as friend');
      expect(mockRelationshipRepository.addFriend).not.toHaveBeenCalled();
    });

    it('should remove friend successfully', async () => {
      // Arrange
      mockRelationshipRepository.removeFriend.mockResolvedValue(true);

      // Act
      const result = await userService.removeFriend(friendUserId);

      // Assert
      expect(mockRelationshipRepository.removeFriend).toHaveBeenCalledWith(currentUserId, friendUserId);
      expect(result).toBe(true);
    });

    it('should get friends list', async () => {
      // Arrange
      const friendsList = [
        { id: 'user-456', name: 'Friend 1' },
        { id: 'user-789', name: 'Friend 2' }
      ];
      mockRelationshipRepository.getFriends.mockResolvedValue(['user-456', 'user-789']);
      mockUserRepository.findByIds.mockResolvedValue(friendsList);

      // Act
      const result = await userService.getFriends();

      // Assert
      expect(mockRelationshipRepository.getFriends).toHaveBeenCalledWith(currentUserId);
      expect(mockUserRepository.findByIds).toHaveBeenCalledWith(['user-456', 'user-789']);
      expect(result).toEqual(friendsList);
    });
  });

  describe('manageBlocking', () => {
    const currentUserId = 'user-123';
    const targetUserId = 'user-456';

    beforeEach(() => {
      mockAuthService.getCurrentUser.mockResolvedValue({ id: currentUserId });
    });

    it('should block user successfully', async () => {
      // Arrange
      const targetProfile = { id: targetUserId, name: 'Target User' };
      mockUserRepository.findById.mockResolvedValue(targetProfile);
      mockRelationshipRepository.blockUser.mockResolvedValue(true);
      mockRelationshipRepository.removeFriend.mockResolvedValue(true);

      // Act
      const result = await userService.blockUser(targetUserId);

      // Assert
      expect(mockUserRepository.findById).toHaveBeenCalledWith(targetUserId);
      expect(mockRelationshipRepository.removeFriend).toHaveBeenCalledWith(currentUserId, targetUserId);
      expect(mockRelationshipRepository.blockUser).toHaveBeenCalledWith(currentUserId, targetUserId);
      expect(result).toBe(true);
    });

    it('should unblock user successfully', async () => {
      // Arrange
      mockRelationshipRepository.unblockUser.mockResolvedValue(true);

      // Act
      const result = await userService.unblockUser(targetUserId);

      // Assert
      expect(mockRelationshipRepository.unblockUser).toHaveBeenCalledWith(currentUserId, targetUserId);
      expect(result).toBe(true);
    });

    it('should get blocked users list', async () => {
      // Arrange
      const blockedList = [
        { id: 'user-999', name: 'Blocked User 1' }
      ];
      mockRelationshipRepository.getBlockedUsers.mockResolvedValue(['user-999']);
      mockUserRepository.findByIds.mockResolvedValue(blockedList);

      // Act
      const result = await userService.getBlockedUsers();

      // Assert
      expect(mockRelationshipRepository.getBlockedUsers).toHaveBeenCalledWith(currentUserId);
      expect(result).toEqual(blockedList);
    });
  });

  describe('data validation', () => {
    it('should validate phone number format', async () => {
      // Arrange
      const profileData = { userId: 'user-123', phone: 'invalid-phone' };
      mockValidationService.validateProfileData.mockReturnValue({
        isValid: false,
        errors: ['Invalid phone number format']
      });

      // Act & Assert
      await expect(userService.createProfile(profileData)).rejects.toThrow('Invalid phone number format');
    });

    it('should validate birth date format', async () => {
      // Arrange
      const profileData = { userId: 'user-123', birthDate: 'invalid-date' };
      mockValidationService.validateProfileData.mockReturnValue({
        isValid: false,
        errors: ['Invalid birth date format']
      });

      // Act & Assert
      await expect(userService.createProfile(profileData)).rejects.toThrow('Invalid birth date format');
    });
  });

  describe('privacy settings enforcement', () => {
    it('should respect privacy settings when retrieving profile', async () => {
      // Arrange
      const profileId = 'profile-123';
      const requestingUserId = 'user-456';
      const privateProfile = {
        id: profileId,
        userId: 'user-123',
        name: 'Private User',
        preferences: { privacy: 'friends' }
      };

      mockUserRepository.findById.mockResolvedValue(privateProfile);
      mockAuthService.getCurrentUser.mockResolvedValue({ id: requestingUserId });
      mockRelationshipRepository.getFriends.mockResolvedValue([]);

      // Act & Assert
      await expect(userService.getProfile(profileId)).rejects.toThrow('Insufficient permissions to view profile');
    });

    it('should allow friends to view friends-only profile', async () => {
      // Arrange
      const profileId = 'profile-123';
      const requestingUserId = 'user-456';
      const privateProfile = {
        id: profileId,
        userId: 'user-123',
        preferences: { privacy: 'friends' }
      };

      mockUserRepository.findById.mockResolvedValue(privateProfile);
      mockAuthService.getCurrentUser.mockResolvedValue({ id: requestingUserId });
      mockRelationshipRepository.getFriends.mockResolvedValue([requestingUserId]);

      // Act
      const result = await userService.getProfile(profileId);

      // Assert
      expect(result).toEqual(privateProfile);
    });
  });

  describe('error handling', () => {
    it('should handle repository errors gracefully', async () => {
      // Arrange
      mockUserRepository.findById.mockRejectedValue(new Error('Database connection failed'));

      // Act & Assert
      await expect(userService.getProfile('profile-123')).rejects.toThrow('Database connection failed');
    });

    it('should validate user ID format', async () => {
      // Act & Assert
      await expect(userService.getProfile('')).rejects.toThrow('Invalid user ID format');
      await expect(userService.getProfile(null)).rejects.toThrow('Invalid user ID format');
      await expect(userService.getProfile(undefined)).rejects.toThrow('Invalid user ID format');
    });

    it('should prevent self-friending', async () => {
      // Arrange
      const userId = 'user-123';
      mockAuthService.getCurrentUser.mockResolvedValue({ id: userId });

      // Act & Assert
      await expect(userService.addFriend(userId)).rejects.toThrow('Cannot add yourself as friend');
    });

    it('should prevent self-blocking', async () => {
      // Arrange
      const userId = 'user-123';
      mockAuthService.getCurrentUser.mockResolvedValue({ id: userId });

      // Act & Assert
      await expect(userService.blockUser(userId)).rejects.toThrow('Cannot block yourself');
    });
  });
});