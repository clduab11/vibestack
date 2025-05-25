// src/middleware/rateLimitingMiddleware.js

/**
 * RateLimitingMiddleware: Handles request rate limiting and abuse detection.
 * Extracted from securityMiddleware.js for modularity and maintainability.
 * All dependencies are injected for testability.
 */

class RateLimitExceededError extends Error {
  constructor(message, details) {
    super(message);
    this.name = 'RateLimitExceededError';
    this.details = details;
  }
}

class RateLimitingMiddleware {
  /**
   * @param {Object} deps - { rateLimitService, loggerService }
   */
  constructor(deps) {
    if (!deps || !deps.rateLimitService || !deps.loggerService) {
      throw new Error('Required dependencies missing for RateLimitingMiddleware');
    }
    this.rateLimitService = deps.rateLimitService;
    this.loggerService = deps.loggerService;
  }

  /**
   * Express middleware for request rate limiting.
   * @param {Object} config - { windowMs, maxRequests }
   */
  limitRequests(config) {
    return async (req, res, next) => {
      try {
        const result = await this.rateLimitService.checkRateLimit(req.ip, config);
        res.header('X-RateLimit-Remaining', result.remaining);
        if (result.allowed) {
          return next();
        } else {
          res.status(429).json({
            error: 'Rate limit exceeded',
            message: 'Too many requests',
            retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
          });
        }
      } catch (err) {
        res.status(429).json({
          error: 'Rate limit exceeded',
          message: 'Rate limit check failed'
        });
      }
    };
  }

  /**
   * Express middleware for abuse pattern detection.
   */
  detectAbuse() {
    return async (req, res, next) => {
      try {
        const result = await this.rateLimitService.detectAbusePattern(req.ip);
        if (result && result.isAbusive) {
          this.loggerService.logSecurityEvent({
            type: 'ABUSE_DETECTED',
            ip: req.ip,
            pattern: result.pattern
          });
          res.status(429).json({
            error: 'Suspicious activity detected',
            message: 'Request blocked due to abuse pattern'
          });
        } else {
          return next();
        }
      } catch (err) {
        res.status(429).json({
          error: 'Suspicious activity detected',
          message: 'Abuse detection failed'
        });
      }
    };
  }
}

module.exports = {
  RateLimitingMiddleware,
  RateLimitExceededError
};