// src/middleware/authenticationMiddleware.js

/**
 * AuthenticationMiddleware: Handles authentication and session validation.
 * Extracted from securityMiddleware.js for modularity and maintainability.
 * All dependencies are injected for testability.
 */

class AuthenticationError extends Error {
  constructor(message, details) {
    super(message);
    this.name = 'AuthenticationError';
    this.details = details;
  }
}

class AuthenticationMiddleware {
  /**
   * @param {Object} deps - { authService, loggerService }
   */
  constructor(deps) {
    if (!deps || !deps.authService || !deps.loggerService) {
      throw new Error('Required dependencies missing for AuthenticationMiddleware');
    }
    this.authService = deps.authService;
    this.loggerService = deps.loggerService;
  }

  /**
   * Express middleware for authenticating JWT/Bearer tokens.
   */
  authenticate() {
    return async (req, res, next) => {
      const authHeader = req.headers.authorization;
      const logAttempt = (success, message) => {
        this.loggerService.logAuthAttempt({
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          success,
          timestamp: new Date()
        });
      };

      if (!authHeader) {
        res.status(401).json({
          error: 'Authentication required',
          message: 'Authorization header missing'
        });
        logAttempt(false, 'No header');
        return;
      }

      if (!/^Bearer\s[\w\-\.]+$/.test(authHeader)) {
        res.status(401).json({
          error: 'Authentication failed',
          message: 'Invalid authorization header format'
        });
        logAttempt(false, 'Malformed header');
        return;
      }

      const token = this.authService.extractTokenFromHeader(authHeader);
      try {
        const result = await this.authService.validateToken(token);
        if (result && result.isValid) {
          req.user = result.payload;
          logAttempt(true, 'Success');
          return next();
        } else {
          res.status(401).json({
            error: 'Authentication failed',
            message: (result && result.error) || 'Invalid token'
          });
          logAttempt(false, (result && result.error) || 'Invalid token');
        }
      } catch (err) {
        res.status(401).json({
          error: 'Authentication failed',
          message: 'Token validation error'
        });
        logAttempt(false, 'Exception');
      }
    };
  }

  /**
   * Express middleware for validating session with 30-minute inactivity timeout.
   * Destroys session if expired, refreshes lastActivity on valid requests.
   * Ensures secure session lifecycle management.
   */
  validateSession() {
    return async (req, res, next) => {
      const sessionId = req.session && req.session.id;
      if (!sessionId) {
        res.status(401).json({
          error: 'Session invalid',
          message: 'Session ID missing'
        });
        return;
      }
      try {
        const result = await this.authService.verifySession(sessionId);
        if (result && result.isValid) {
          req.session.data = result.session;
          // --- Session Timeout Logic (30 min inactivity) ---
          const now = Date.now();
          const lastActivity = req.session.data.lastActivity || now;
          const THIRTY_MIN_MS = 30 * 60 * 1000;
          if (now - lastActivity > THIRTY_MIN_MS) {
            // Session expired due to inactivity
            if (typeof req.session.destroy === 'function') {
              req.session.destroy(() => {});
            }
            res.status(401).json({
              error: 'Session expired',
              message: 'Session expired due to inactivity'
            });
            return;
          }
          // --- Session Refresh: update lastActivity timestamp ---
          req.session.data.lastActivity = now;
          // Optionally, implement session cleanup here (e.g., call a cleanup service)
          return next();
        } else {
          res.status(401).json({
            error: 'Session invalid',
            message: (result && result.error) || 'Session invalid'
          });
        }
      } catch (err) {
        res.status(401).json({
          error: 'Session invalid',
          message: 'Session verification error'
        });
      }
    };
  }
  /**
   * Middleware to enforce MFA for admin users on protected routes.
   * Requires that req.user is set and that MFA has been verified in the session or request context.
   * Responds with 401 if MFA is required but not completed.
   */
  enforceAdminMfa() {
    return (req, res, next) => {
      const user = req.user;
      // Only enforce for admin users with MFA enabled
      if (user && user.roles && Array.isArray(user.roles) && user.roles.includes('admin') && user.mfaEnabled) {
        // MFA verification flag can be set in session or request (adjust as needed for your session strategy)
        const mfaVerified = req.session?.mfaVerified || req.mfaVerified;
        if (!mfaVerified) {
          this.loggerService.logAuthAttempt({
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            success: false,
            reason: 'MFA required',
            timestamp: new Date()
          });
          return res.status(401).json({
            error: 'MFA required',
            message: 'Multi-factor authentication required for admin access.'
          });
        }
      }
      return next();
    };
  }
}

module.exports = {
  AuthenticationMiddleware,
  AuthenticationError
};