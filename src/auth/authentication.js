/* eslint-disable max-lines */
// src/auth/authentication.js

/**
 * AuthenticationService provides user registration and authentication logic.
 * Dependencies are injected for validation, hashing, token, and user repository services.
 * MFA logic is delegated to MFAService for TOTP and backup code support.
 */
const MFAService = require('./mfaService');
const { ValidationError } = require('../models/coreModels');

class AuthenticationService {
  /**
   * @param {Object} deps
   * @param {Object} deps.validationService - Service for input validation
   * @param {Object} deps.hashingService - Service for password hashing/verification
   * @param {Object} deps.tokenService - Service for token generation
   * @param {Object} deps.userRepository - Service for user data persistence
   * @param {Object} [deps.logger] - Optional logger for audit trail
   */
  constructor({ validationService, hashingService, tokenService, userRepository, logger }) {
    this.validationService = validationService;
    this.hashingService = hashingService;
    this.tokenService = tokenService;
    this.userRepository = userRepository;
    this.logger = logger;
  }

  /**
   * Registers a new user after validating and hashing the password.
   * @param {Object} userData - { email, password, ... }
   * @returns {Promise<Object>} - Registered user data (without password)
   * @throws {Error} - On validation or duplicate email
   */
  async register(userData) {
    // Validate email and password
    const { email, password, ...rest } = userData;
    if (!this.validationService.isValidEmail(email)) {
      throw new Error('Invalid email format');
    }
    if (!this.validationService.isStrongPassword(password)) {
      throw new Error('Password does not meet strength requirements');
    }

    // Check for duplicate email
    const existing = await this.userRepository.findByEmail(email);
    if (existing) {
      throw new Error('Email already registered');
    }

    // Hash password
    const hashedPassword = await this.hashingService.hash(password);

    // Store user (never store plain password)
    const userToSave = { email, password: hashedPassword, ...rest };
    const savedUser = await this.userRepository.create(userToSave);

    // Return user data without password
    const { password: _, ...userWithoutPassword } = savedUser;
    return userWithoutPassword;
  }

  /**
   * Initiates authentication and returns MFA challenge state if required.
   * For admin users with MFA enabled, returns { mfaRequired: true, userId } after password check.
   * For others, returns tokens and user data.
   * @param {Object} credentials - { email, password }
   * @returns {Promise<Object>} - { mfaRequired, userId } or { tokens, user }
   */
  async initiateMfaChallenge(credentials) {
    const { email, password } = credentials;
    if (!this.validationService.isValidEmail(email)) {
      throw new Error('Invalid credentials');
    }

    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const passwordMatch = await this.hashingService.compare(password, user.password);
    if (!passwordMatch) {
      throw new Error('Invalid credentials');
    }

    // Enforce MFA for admin users
    const isAdmin = user.roles && Array.isArray(user.roles) && user.roles.includes('admin');
    if (isAdmin && user.mfaEnabled) {
      // MFA required, do not return tokens yet
      if (this.logger) this.logger.info(`MFA challenge required for admin ${user.email}`);
      return { mfaRequired: true, userId: user.id };
    }

    // Non-admin or MFA not enabled: proceed as normal
    const tokens = await this.tokenService.generate(user);
    const { password: _, ...userWithoutPassword } = user;
    return { tokens, user: userWithoutPassword };
  }

  /**
   * Verifies MFA (TOTP or backup code) for a user and returns tokens if successful.
   * @param {Object} params - { userId, mfaToken, backupCode }
   * @returns {Promise<Object>} - { tokens, user }
   * @throws {Error} - On invalid MFA
   */
  async verifyMfa({ userId, mfaToken, backupCode }) {
    const user = await this.userRepository.findById(userId);
    if (!user || !user.mfaEnabled) {
      throw new Error('MFA not enabled or user not found');
    }

    // Decrypt secret and backup codes
    const mfaSecret = user.mfaSecret
      ? this.userRepository.decryptionService.decrypt(user.mfaSecret)
      : null;
    let backupCodes = user.mfaBackupCodes
      ? JSON.parse(this.userRepository.decryptionService.decrypt(user.mfaBackupCodes))
      : [];

    let mfaValid = false;
    let usedBackup = false;

    if (mfaToken && mfaSecret) {
      mfaValid = MFAService.verifyTOTP(mfaSecret, mfaToken);
    }
    if (!mfaValid && backupCode && Array.isArray(backupCodes)) {
      const { valid, updatedCodes } = MFAService.verifyAndConsumeBackupCode(backupCodes, backupCode);
      mfaValid = valid;
      if (valid) {
        usedBackup = true;
        backupCodes = updatedCodes;
        // Save updated backup codes (remove used)
        await this.userRepository.update(userId, {
          mfaBackupCodes: this.userRepository.encryptionService.encrypt(JSON.stringify(backupCodes)),
        });
      }
    }

    if (!mfaValid) {
      if (this.logger) this.logger.warn(`Failed MFA attempt for user ${user.email}`);
      throw new Error('Invalid MFA code');
    }

    // Update last verified timestamp
    await this.userRepository.update(userId, {
      mfaLastVerifiedAt: new Date(),
    });

    if (this.logger) this.logger.info(`MFA verified for user ${user.email}${usedBackup ? ' (backup code)' : ''}`);

    // Issue tokens
    const tokens = await this.tokenService.generate(user);
    const { password: _, ...userWithoutPassword } = user;
    return { tokens, user: userWithoutPassword };
  }

  /**
   * Legacy authenticate method (for backward compatibility).
   * Use initiateMfaChallenge + verifyMfa for admin MFA.
   */
  async authenticate(credentials) {
    // This method is now a wrapper for non-admins or for legacy clients.
    return this.initiateMfaChallenge(credentials);
  }
}

module.exports = AuthenticationService;