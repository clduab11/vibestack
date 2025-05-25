// src/middleware/securityHeadersMiddleware.js

/**
 * SecurityHeadersMiddleware: Handles setting security-related HTTP headers.
 * Extracted from securityMiddleware.js for modularity and maintainability.
 * All dependencies are injected for testability.
 */

class SecurityHeadersMiddleware {
  /**
   * @param {Object} deps - { loggerService }
   */
  constructor(deps) {
    if (!deps || !deps.loggerService) {
      throw new Error('Required dependencies missing for SecurityHeadersMiddleware');
    }
    this.loggerService = deps.loggerService;
  }

  /**
   * Express middleware to set standard security headers, optionally with CSP.
   * @param {Object} [cspConfig] - Optional CSP config
   */
  setSecurityHeaders(cspConfig) {
    return (req, res, next) => {
      res.header('X-Content-Type-Options', 'nosniff');
      res.header('X-Frame-Options', 'DENY');
      res.header('X-XSS-Protection', '1; mode=block');
      res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
      res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
      if (cspConfig && cspConfig.directives) {
        const directives = cspConfig.directives;
        const cspHeader = Object.entries(directives)
          .map(([k, v]) => `${k.replace(/([A-Z])/g, '-$1').toLowerCase()} ${v.join(' ')}`)
          .join('; ');
        res.header('Content-Security-Policy', cspHeader);
      }
      return next();
    };
  }

  /**
   * Express middleware to set Content Security Policy.
   * @param {Object} cspConfig
   */
  setCSP(cspConfig) {
    return (req, res, next) => {
      if (cspConfig && cspConfig.directives) {
        const directives = cspConfig.directives;
        const cspHeader = Object.entries(directives)
          .map(([k, v]) => `${k.replace(/([A-Z])/g, '-$1').toLowerCase()} ${v.join(' ')}`)
          .join('; ');
        res.header('Content-Security-Policy', cspHeader);
      }
      return next();
    };
  }

  /**
   * Express middleware to set CORS headers.
   * @param {Object} corsConfig
   */
  setCORS(corsConfig) {
    return (req, res, next) => {
      if (corsConfig && corsConfig.origin) {
        res.header('Access-Control-Allow-Origin', corsConfig.origin);
      }
      if (corsConfig && corsConfig.credentials) {
        res.header('Access-Control-Allow-Credentials', 'true');
      }
      if (corsConfig && corsConfig.methods) {
        res.header('Access-Control-Allow-Methods', corsConfig.methods.join(', '));
      }
      return next();
    };
  }
}

module.exports = {
  SecurityHeadersMiddleware
};