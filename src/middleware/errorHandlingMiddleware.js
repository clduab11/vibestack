// src/middleware/errorHandlingMiddleware.js

/**
 * ErrorHandlingMiddleware: Handles security-related error responses.
 * Extracted from securityMiddleware.js for modularity and maintainability.
 * All dependencies are injected for testability.
 */

class SecurityValidationError extends Error {
  constructor(message, details) {
    super(message);
    this.name = 'SecurityValidationError';
    this.details = details;
  }
}

class RateLimitExceededError extends Error {
  constructor(message, details) {
    super(message);
    this.name = 'RateLimitExceededError';
    this.details = details;
  }
}

class ErrorHandlingMiddleware {
  /**
   * @param {Object} deps - { loggerService }
   */
  constructor(deps) {
    if (!deps || !deps.loggerService) {
      throw new Error('Required dependencies missing for ErrorHandlingMiddleware');
    }
    this.loggerService = deps.loggerService;
  }

  /**
   * Express error-handling middleware for security errors.
   */
  handleSecurityError() {
    // eslint-disable-next-line no-unused-vars
    return (err, req, res, next) => {
      if (err instanceof SecurityValidationError) {
        res.status(400).json({
          error: 'Validation Error',
          message: err.message,
          details: err.details
        });
      } else if (err instanceof RateLimitExceededError) {
        res.status(429).json({
          error: 'Rate Limit Exceeded',
          message: err.message,
          retryAfter: err.details && err.details.windowMs ? err.details.windowMs / 1000 : undefined
        });
      } else if (process.env.NODE_ENV === 'production') {
        res.status(500).json({
          error: 'Internal Server Error',
          message: 'An unexpected error occurred'
        });
        this.loggerService.logError(err);
      } else {
        res.status(500).json({
          error: err.name || 'Error',
          message: err.message
        });
        this.loggerService.logError(err);
      }
    };
  }
}

module.exports = {
  ErrorHandlingMiddleware,
  SecurityValidationError,
  RateLimitExceededError
};