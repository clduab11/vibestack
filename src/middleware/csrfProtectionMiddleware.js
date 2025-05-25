// src/middleware/csrfProtectionMiddleware.js

/**
 * CsrfProtectionMiddleware: Provides CSRF protection for state-changing operations.
 * Implements token generation, validation, rotation, double-submit cookie, and security logging.
 * Follows OWASP CSRF prevention guidelines.
 */

const crypto = require('crypto');

/**
 * Utility for secure random token generation.
 * @param {number} length
 * @returns {string}
 */
function generateCsrfToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

class CsrfProtectionMiddleware {
  /**
   * @param {Object} deps - { loggerService, sessionService, config }
   */
  constructor(deps) {
    if (!deps || !deps.loggerService || !deps.sessionService) {
      throw new Error('Required dependencies missing for CsrfProtectionMiddleware');
    }
    this.loggerService = deps.loggerService;
    this.sessionService = deps.sessionService;
    this.config = deps.config || {};
    this.tokenLength = this.config.tokenLength || 32;
    this.tokenExpiryMs = this.config.tokenExpiryMs || 60 * 60 * 1000; // 1 hour
    this.cookieName = this.config.cookieName || 'csrf_token';
    this.headerName = this.config.headerName || 'x-csrf-token';
    this.formField = this.config.formField || '_csrf';
    this.maxTokensPerSession = this.config.maxTokensPerSession || 5;
  }

  /**
   * Middleware to generate and set a CSRF token (for GET/HEAD/OPTIONS or explicit refresh).
   */
  generateToken() {
    return (req, res, next) => {
      try {
        if (!req.session) {
          this.loggerService.error('Session missing for CSRF token generation');
          return res.status(500).json({ error: 'Session required for CSRF protection' });
        }
        // Support multiple tokens per session (multi-tab)
        req.session.csrfTokens = req.session.csrfTokens || [];
        // Remove expired tokens
        const now = Date.now();
        req.session.csrfTokens = req.session.csrfTokens.filter(t => t.expires > now);
        // Generate new token
        const token = generateCsrfToken(this.tokenLength);
        req.session.csrfTokens.push({
          value: token,
          expires: now + this.tokenExpiryMs
        });
        // Limit number of tokens per session
        if (req.session.csrfTokens.length > this.maxTokensPerSession) {
          req.session.csrfTokens = req.session.csrfTokens.slice(-this.maxTokensPerSession);
        }
        // Set as cookie (double-submit pattern, SameSite, HttpOnly=false)
        res.cookie(this.cookieName, token, {
          sameSite: 'Strict',
          secure: true,
          httpOnly: false,
          maxAge: this.tokenExpiryMs
        });
        // Expose token in response for client-side apps
        res.locals.csrfToken = token;
        next();
      } catch (err) {
        this.loggerService.error('CSRF token generation error', { error: err });
        res.status(500).json({ error: 'CSRF token generation failed' });
      }
    };
  }

  /**
   * Middleware to validate CSRF token for state-changing requests.
   * Exempts safe methods and login endpoints.
   */
  validateToken() {
    return (req, res, next) => {
      try {
        const method = req.method.toUpperCase();
        // Exempt safe methods
        if (['GET', 'HEAD', 'OPTIONS'].includes(method)) return next();
        // Exempt login endpoint (customize as needed)
        if (req.path.startsWith('/auth/login')) return next();

        if (!req.session || !req.session.csrfTokens) {
          this.loggerService.warn('CSRF validation failed: no session or tokens');
          return res.status(403).json({ error: 'CSRF validation failed: session missing' });
        }

        // Accept token from header, form, or cookie
        const token =
          req.headers[this.headerName] ||
          req.body?.[this.formField] ||
          req.cookies?.[this.cookieName];

        if (!token) {
          this.loggerService.warn('CSRF validation failed: token missing', { path: req.path });
          return res.status(403).json({ error: 'CSRF token missing' });
        }

        // Validate token exists and is not expired
        const now = Date.now();
        const idx = req.session.csrfTokens.findIndex(
          t => t.value === token && t.expires > now
        );
        if (idx === -1) {
          this.loggerService.warn('CSRF validation failed: invalid or expired token', { path: req.path });
          return res.status(403).json({ error: 'Invalid or expired CSRF token' });
        }

        // Token rotation: remove used token, generate new one for next request
        req.session.csrfTokens.splice(idx, 1);

        // Optionally, generate and set a new token for the session
        const newToken = generateCsrfToken(this.tokenLength);
        req.session.csrfTokens.push({
          value: newToken,
          expires: now + this.tokenExpiryMs
        });
        res.cookie(this.cookieName, newToken, {
          sameSite: 'Strict',
          secure: true,
          httpOnly: false,
          maxAge: this.tokenExpiryMs
        });
        res.locals.csrfToken = newToken;

        // Origin/Referer validation for extra protection
        const origin = req.headers.origin;
        const referer = req.headers.referer;
        const allowedOrigin = this.config.allowedOrigin || req.get('host');
        if (origin && !origin.includes(allowedOrigin)) {
          this.loggerService.warn('CSRF validation failed: invalid origin', { origin });
          return res.status(403).json({ error: 'Invalid request origin' });
        }
        if (referer && !referer.includes(allowedOrigin)) {
          this.loggerService.warn('CSRF validation failed: invalid referer', { referer });
          return res.status(403).json({ error: 'Invalid request referer' });
        }

        next();
      } catch (err) {
        this.loggerService.error('CSRF validation error', { error: err });
        res.status(500).json({ error: 'CSRF validation failed' });
      }
    };
  }

  /**
   * Middleware to provide a CSRF token endpoint for client apps.
   * Rate-limited externally.
   */
  csrfTokenEndpoint() {
    return (req, res) => {
      try {
        if (!req.session) {
          this.loggerService.error('Session missing for CSRF token endpoint');
          return res.status(500).json({ error: 'Session required for CSRF protection' });
        }
        // Generate and return a new token
        const now = Date.now();
        req.session.csrfTokens = req.session.csrfTokens || [];
        req.session.csrfTokens = req.session.csrfTokens.filter(t => t.expires > now);
        const token = generateCsrfToken(this.tokenLength);
        req.session.csrfTokens.push({
          value: token,
          expires: now + this.tokenExpiryMs
        });
        if (req.session.csrfTokens.length > this.maxTokensPerSession) {
          req.session.csrfTokens = req.session.csrfTokens.slice(-this.maxTokensPerSession);
        }
        res.cookie(this.cookieName, token, {
          sameSite: 'Strict',
          secure: true,
          httpOnly: false,
          maxAge: this.tokenExpiryMs
        });
        res.json({ csrfToken: token });
      } catch (err) {
        this.loggerService.error('CSRF token endpoint error', { error: err });
        res.status(500).json({ error: 'CSRF token endpoint failed' });
      }
    };
  }
}

module.exports = {
  CsrfProtectionMiddleware
};