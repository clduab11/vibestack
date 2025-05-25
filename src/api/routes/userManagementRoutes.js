// src/api/routes/userManagementRoutes.js

/**
 * UserManagementRoutes: Handles user profile, update, and friends list endpoints.
 * Extracted from apiRoutes.js for modularity and maintainability.
 * All dependencies are injected for testability.
 */

class UserManagementRoutes {
  constructor({ userService, validationService, securityMiddleware, loggerService }) {
    if (!userService || !validationService || !securityMiddleware || !loggerService) {
      throw new Error('Required dependencies missing for UserManagementRoutes');
    }
    this.userService = userService;
    this.validationService = validationService;
    this.securityMiddleware = securityMiddleware;
    this.loggerService = loggerService;
  }

  getUserProfile() {
    return async (req, res, next) => {
      try {
        const userId = req.params.id;
        const result = await this.userService.getUserById(userId);
        if (result.success) {
          res.status(200).json({ success: true, data: result.user });
        } else if (result.error === 'Access denied - private profile') {
          res.status(403).json({
            error: 'Access denied',
            message: result.error
          });
        } else if (result.error === 'User not found') {
          res.status(404).json({
            error: 'Not found',
            message: result.error
          });
        } else {
          res.status(400).json({
            error: 'Error',
            message: result.error
          });
        }
      } catch (err) {
        next(err);
      }
    };
  }

  updateUserProfile() {
    return async (req, res, next) => {
      try {
        const userId = req.params.id;
        const currentUserId = req.user?.userId || req.user?.id;
        if (!req.user || currentUserId !== userId) {
          return res.status(403).json({
            error: 'Access denied',
            message: 'Can only update own profile'
          });
        }
        const result = this.validationService.validateUserUpdate(req.body);
        if (!result.isValid) {
          return res.status(400).json({
            error: 'Validation failed',
            message: 'Update data is invalid',
            details: result.errors
          });
        }
        const updateResult = await this.userService.updateUserProfile(userId, result.sanitizedData);
        if (updateResult.success) {
          res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: updateResult.user
          });
        } else {
          res.status(400).json({
            error: 'Update failed',
            message: updateResult.error
          });
        }
      } catch (err) {
        next(err);
      }
    };
  }

  getFriendsList() {
    return async (req, res, next) => {
      try {
        const userId = req.params.id;
        const result = await this.userService.getFriendsList(userId);
        if (result.success) {
          res.status(200).json({
            success: true,
            data: result.friends
          });
        } else {
          res.status(404).json({
            error: 'Not found',
            message: result.error
          });
        }
      } catch (err) {
        next(err);
      }
    };
  }
}

module.exports = {
  UserManagementRoutes
};