// src/auth/mfaService.js

/**
 * MFAService provides TOTP-based MFA logic, QR code generation, and backup code management.
 * Uses speakeasy for TOTP and qrcode for QR code generation.
 * All secrets and backup codes must be encrypted at rest by the caller.
 */

const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const crypto = require('crypto');

class MFAService {
  /**
   * Generates a new TOTP secret for a user.
   * @param {string} username - Used for QR code label
   * @param {string} issuer - App/service name
   * @returns {Object} { secret, otpauth_url }
   */
  static generateTOTPSecret(username, issuer = 'VibeStack') {
    const secret = speakeasy.generateSecret({
      name: `${issuer}:${username}`,
      length: 32,
    });
    return {
      secret: secret.base32,
      otpauth_url: secret.otpauth_url,
    };
  }

  /**
   * Generates a QR code data URL for the given otpauth URL.
   * @param {string} otpauthUrl
   * @returns {Promise<string>} - Data URL for QR code
   */
  static async generateQRCode(otpauthUrl) {
    return qrcode.toDataURL(otpauthUrl);
  }

  /**
   * Verifies a TOTP token against a secret.
   * @param {string} secret - Base32 TOTP secret
   * @param {string} token - User-provided TOTP code
   * @returns {boolean}
   */
  static verifyTOTP(secret, token) {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 1, // allow 1 step clock drift
    });
  }

  /**
   * Generates cryptographically secure backup codes.
   * @param {number} count - Number of codes
   * @param {number} length - Length of each code
   * @returns {string[]} - Array of backup codes
   */
  static generateBackupCodes(count = 8, length = 10) {
    const codes = [];
    for (let i = 0; i < count; i++) {
      // Each code is a random alphanumeric string
      codes.push(crypto.randomBytes(length)
        .toString('base64')
        .replace(/[^a-zA-Z0-9]/g, '')
        .slice(0, length)
        .toUpperCase());
    }
    return codes;
  }

  /**
   * Verifies a backup code and returns the updated list (removes used code).
   * @param {string[]} backupCodes - Array of valid codes
   * @param {string} code - Code to verify
   * @returns {{ valid: boolean, updatedCodes: string[] }}
   */
  static verifyAndConsumeBackupCode(backupCodes, code) {
    const idx = backupCodes.indexOf(code);
    if (idx === -1) {
      return { valid: false, updatedCodes: backupCodes };
    }
    // Remove used code
    const updatedCodes = backupCodes.slice();
    updatedCodes.splice(idx, 1);
    return { valid: true, updatedCodes };
  }
}

module.exports = MFAService;