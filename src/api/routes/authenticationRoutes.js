// src/api/routes/authenticationRoutes.js

/**
 * AuthenticationRoutes: Handles registration, login, logout, and token verification.
 * Extracted from apiRoutes.js for modularity and maintainability.
 * All dependencies are injected for testability.
 */

class AuthenticationRoutes {
  constructor({ authService, validationService, securityMiddleware, loggerService }) {
    if (!authService || !validationService || !securityMiddleware || !loggerService) {
      throw new Error('Required dependencies missing for AuthenticationRoutes');
    }
    this.authService = authService;
    this.validationService = validationService;
    this.securityMiddleware = securityMiddleware;
    this.loggerService = loggerService;
  }

  register() {
    return async (req, res, next) => {
      try {
        this.loggerService.logAPIRequest?.(req);
        const result = this.validationService.validateRegistration(req.body);
        if (!result.isValid) {
          return res.status(400).json({
            error: 'Validation failed',
            message: 'Registration data is invalid',
            details: result.errors
          });
        }
        const regResult = await this.authService.register(result.sanitizedData);
        if (regResult.success) {
          res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
              userId: regResult.user.userId,
              token: regResult.tokens.token,
              refreshToken: regResult.tokens.refreshToken
            }
          });
        } else {
          res.status(409).json({
            error: 'Registration failed',
            message: regResult.error
          });
        }
      } catch (err) {
        next(err);
      }
    };
  }

  login() {
    return async (req, res, next) => {
      try {
        const result = this.validationService.validateLogin(req.body);
        if (!result.isValid) {
          return res.status(400).json({
            error: 'Validation failed',
            message: 'Login data is invalid',
            details: result.errors
          });
        }
        const loginResult = await this.authService.login(result.sanitizedData);
        if (loginResult.success) {
          res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
              userId: loginResult.user.userId,
              token: loginResult.tokens.token,
              refreshToken: loginResult.tokens.refreshToken
            }
          });
        } else {
          res.status(401).json({
            error: 'Authentication failed',
            message: loginResult.error
          });
        }
      } catch (err) {
        next(err);
      }
    };
  }

  logout() {
    return async (req, res, next) => {
      try {
        const authHeader = req.headers['authorization'];
        if (!authHeader) {
          return res.status(401).json({
            error: 'Authentication required',
            message: 'No token provided'
          });
        }
        const token = authHeader.replace(/^Bearer\s+/i, '');
        const result = await this.authService.logout(token);
        if (result.success) {
          res.clearCookie?.('refreshToken');
          res.status(200).json({
            success: true,
            message: 'Logout successful'
          });
        } else {
          res.status(401).json({
            error: 'Logout failed',
            message: result.error || 'Invalid token'
          });
        }
      } catch (err) {
        next(err);
      }
    };
  }

  verifyToken() {
    return async (req, res, next) => {
      try {
        const authHeader = req.headers['authorization'];
        if (!authHeader) {
          return res.status(401).json({
            valid: false,
            error: 'No token provided'
          });
        }
        const token = authHeader.replace(/^Bearer\s+/i, '');
        const result = await this.authService.verifyToken(token);
        if (result.isValid) {
          res.status(200).json({
            valid: true,
            user: result.payload
          });
        } else {
          res.status(401).json({
            valid: false,
            error: result.error
          });
        }
      } catch (err) {
        next(err);
      }
    };
  }
}

module.exports = {
  AuthenticationRoutes
};