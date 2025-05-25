// src/middleware/authorizationMiddleware.js

/**
 * AuthorizationMiddleware: Handles permission and role-based access control.
 * Extracted from securityMiddleware.js for modularity and maintainability.
 * All dependencies are injected for testability.
 */

class AuthorizationError extends Error {
  constructor(message, details) {
    super(message);
    this.name = 'AuthorizationError';
    this.details = details;
  }
}

class AuthorizationMiddleware {
  /**
   * @param {Object} deps - { authService, loggerService }
   */
  constructor(deps) {
    if (!deps || !deps.authService || !deps.loggerService) {
      throw new Error('Required dependencies missing for AuthorizationMiddleware');
    }
    this.authService = deps.authService;
    this.loggerService = deps.loggerService;
  }

  /**
   * Express middleware for permission checking.
   * @param {Array<string>} requiredPermissions
   */
  requirePermissions(requiredPermissions) {
    return (req, res, next) => {
      if (!req.user) {
        res.status(401).json({
          error: 'Authentication required',
          message: 'User not authenticated'
        });
        return;
      }
      const userPerms = req.user.permissions || [];
      const result = this.authService.checkPermissions(userPerms, requiredPermissions);
      if (result && result.hasPermission) {
        return next();
      } else {
        res.status(403).json({
          error: 'Access denied',
          message: 'Insufficient permissions',
          missingPermissions: (result && result.missingPermissions) || requiredPermissions
        });
      }
    };
  }

  /**
   * Express middleware for role-based access control.
   * @param {string} requiredRole
   */
  requireRole(requiredRole) {
    return (req, res, next) => {
      if (!req.user) {
        res.status(401).json({
          error: 'Authentication required',
          message: 'User not authenticated'
        });
        return;
      }
      const userRole = req.user.role;
      if (userRole === requiredRole) {
        return next();
      } else {
        res.status(403).json({
          error: 'Access denied',
          message: 'Insufficient role',
          requiredRole,
          currentRole: userRole
        });
      }
    };
  }
}

module.exports = {
  AuthorizationMiddleware,
  AuthorizationError
};