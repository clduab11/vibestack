/**
 * Security Middleware Orchestrator
 * Imports modular middleware and provides a factory for composing security chains.
 * All dependencies are injected for testability and modularity.
 */

const { AuthenticationMiddleware, AuthenticationError } = require('./authenticationMiddleware');
const { AuthorizationMiddleware, AuthorizationError } = require('./authorizationMiddleware');
const { InputValidationMiddleware, SecurityValidationError } = require('./inputValidationMiddleware');
const { RateLimitingMiddleware, RateLimitExceededError } = require('./rateLimitingMiddleware');
const { SecurityHeadersMiddleware } = require('./securityHeadersMiddleware');
const { ErrorHandlingMiddleware } = require('./errorHandlingMiddleware');
const { CsrfProtectionMiddleware } = require('./csrfProtectionMiddleware');

/**
 * SecurityMiddlewareFactory: Composes all modular middleware for security chains.
 */
class SecurityMiddlewareFactory {
  /**
   * @param {Object} deps - { authService, validationService, rateLimitService, loggerService }
   */
  constructor(deps) {
    this.authService = deps.authService;
    this.validationService = deps.validationService;
    this.rateLimitService = deps.rateLimitService;
    this.loggerService = deps.loggerService;
    this.sessionService = deps.sessionService; // Needed for CSRF
    this.csrfConfig = deps.csrfConfig || {};
  }

  createAuthenticationMiddleware() {
    return new AuthenticationMiddleware({
      authService: this.authService,
      loggerService: this.loggerService
    });
  }

  createAuthorizationMiddleware() {
    return new AuthorizationMiddleware({
      authService: this.authService,
      loggerService: this.loggerService
    });
  }

  createInputValidationMiddleware() {
    return new InputValidationMiddleware({
      validationService: this.validationService,
      loggerService: this.loggerService
    });
  }

  createRateLimitingMiddleware() {
    return new RateLimitingMiddleware({
      rateLimitService: this.rateLimitService,
      loggerService: this.loggerService
    });
  }

  createSecurityHeadersMiddleware() {
    return new SecurityHeadersMiddleware({
      loggerService: this.loggerService
    });
  }

  createErrorHandlingMiddleware() {
    return new ErrorHandlingMiddleware({
      loggerService: this.loggerService
    });
  }

  createCsrfProtectionMiddleware() {
    return new CsrfProtectionMiddleware({
      loggerService: this.loggerService,
      sessionService: this.sessionService,
      config: this.csrfConfig
    });
  }

  /**
   * Returns an array of middleware functions for the full security chain.
   * @param {Object} config
   */
  createSecurityChain(config) {
    const chain = [];
    if (config && config.auth && config.auth.required) {
      chain.push(this.createAuthenticationMiddleware().authenticate());
    }
    if (config && config.validation && config.validation.sanitizeInput) {
      chain.push(this.createInputValidationMiddleware().validateInput());
    }
    if (config && config.rateLimit) {
      chain.push(this.createRateLimitingMiddleware().limitRequests(config.rateLimit));
    }
    if (config && config.headers) {
      const headers = this.createSecurityHeadersMiddleware();
      if (config.headers.csp) {
        chain.push(headers.setSecurityHeaders({
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"]
          }
        }));
      } else {
        chain.push(headers.setSecurityHeaders());
      }
    }
    // Insert CSRF protection for state-changing operations (after auth, before error handling)
    if (config && config.csrf && config.csrf.enabled !== false) {
      chain.push(this.createCsrfProtectionMiddleware().validateToken());
    }
    chain.push(this.createErrorHandlingMiddleware().handleSecurityError());
    return chain;
  }
}

/**
 * Main SecurityMiddleware Orchestrator
 */
class SecurityMiddleware {
  /**
   * @param {Object} deps - { authService, validationService, rateLimitService, loggerService }
   */
  constructor(deps) {
    this.factory = new SecurityMiddlewareFactory(deps);
  }
  getFactory() {
    return this.factory;
  }
}

module.exports = {
  SecurityMiddleware,
  SecurityMiddlewareFactory,
  AuthenticationMiddleware,
  AuthorizationMiddleware,
  InputValidationMiddleware,
  RateLimitingMiddleware,
  SecurityHeadersMiddleware,
  ErrorHandlingMiddleware,
  CsrfProtectionMiddleware,
  SecurityValidationError,
  RateLimitExceededError,
  AuthenticationError,
  AuthorizationError
};