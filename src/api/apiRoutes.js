/**
 * VibeStack API Gateway - Minimal, test-compliant implementation.
 * Orchestrates authentication, user, content, and system routes with dependency injection.
 * All handlers are class-based, modular, and Express-compatible.
 */

// Modular route imports
// Modular route imports
const { AuthenticationRoutes } = require('./routes/authenticationRoutes');
const { UserManagementRoutes } = require('./routes/userManagementRoutes');
// Modular route imports
const { ContentRoutes } = require('./routes/contentRoutes');
// Modular route imports
const { SystemRoutes } = require('./routes/systemRoutes');

const express = require('express');
const { CsrfProtectionMiddleware } = require('../middleware/csrfProtectionMiddleware');

// --- Error Classes ---
class APIError extends Error {
  constructor(message) {
    super(message);
    this.name = 'APIError';
  }
}
class ValidationError extends APIError {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}
class AuthenticationError extends APIError {
  constructor(message) {
    super(message);
    this.name = 'AuthenticationError';
  }
}
class AuthorizationError extends APIError {
  constructor(message) {
    super(message);
    this.name = 'AuthorizationError';
  }
}
class NotFoundError extends APIError {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
  }
}

// --- AuthenticationRoutes is now imported from ./routes/authenticationRoutes.js ---

// --- UserManagementRoutes is now imported from ./routes/userManagementRoutes.js ---

// --- ContentRoutes is now imported from ./routes/contentRoutes.js ---

// --- SystemRoutes is now imported from ./routes/systemRoutes.js ---

class APIRouter {
  constructor(deps) {
    if (
      !deps ||
      !deps.authService ||
      !deps.userService ||
      !deps.contentService ||
      !deps.securityMiddleware ||
      !deps.validationService ||
      !deps.loggerService ||
      !deps.csrfProtectionMiddleware
    ) {
      throw new Error('Required dependencies missing for API Router');
    }
    this.authRoutes = new AuthenticationRoutes(deps);
    this.userRoutes = new UserManagementRoutes(deps);
    this.contentRoutes = new ContentRoutes(deps);
    this.systemRoutes = new SystemRoutes(deps);
    this.securityMiddleware = deps.securityMiddleware;
    this.csrfProtectionMiddleware = deps.csrfProtectionMiddleware;
  }

  configureRoutes(app) {
    // --- CSRF Token Endpoint ---
    app.get(
      '/auth/csrf-token',
      this.csrfProtectionMiddleware.generateToken(),
      this.csrfProtectionMiddleware.csrfTokenEndpoint()
    );

    // --- Authentication ---
    app.post('/auth/register', this.authRoutes.register());
    app.post('/auth/login', this.authRoutes.login());
    // CSRF protection for logout (state-changing)
    app.post(
      '/auth/logout',
      this.csrfProtectionMiddleware.validateToken(),
      this.authRoutes.logout()
    );
    app.get('/auth/verify', this.authRoutes.verifyToken());

    // --- User Management ---
    app.get(
      '/users/:id',
      this.securityMiddleware.authenticate(),
      this.userRoutes.getUserProfile()
    );
    app.put(
      '/users/:id',
      this.securityMiddleware.authenticate(),
      this.csrfProtectionMiddleware.validateToken(),
      this.userRoutes.updateUserProfile()
    );
    app.get(
      '/users/:id/friends',
      this.securityMiddleware.authenticate(),
      this.userRoutes.getFriendsList()
    );

    // --- Content ---
    app.post(
      '/content',
      this.securityMiddleware.authenticate(),
      this.csrfProtectionMiddleware.validateToken(),
      this.contentRoutes.createContent()
    );
    app.get(
      '/content/:id',
      this.securityMiddleware.authenticate(),
      this.contentRoutes.getContent()
    );
    app.get(
      '/content/feed',
      this.securityMiddleware.authenticate(),
      this.contentRoutes.getFeed()
    );

    // --- System ---
    app.get('/health', this.systemRoutes.healthCheck());
    app.get('/version', this.systemRoutes.getVersion());
    app.get('/metrics', this.securityMiddleware.authenticate(), this.systemRoutes.getMetrics());

    // --- 404 Handler ---
    app.all('*', (req, res) => {
      res.status(404).json({
        error: 'Not found',
        message: 'API endpoint not found',
        path: req.url
      });
    });
  }

  configureErrorHandling(app) {
    // Global error handler
    app.use((err, req, res, next) => {
      if (err instanceof ValidationError) {
        res.status(400).json({ error: 'Validation Error', message: err.message });
      } else if (err instanceof AuthenticationError) {
        res.status(401).json({ error: 'Authentication Error', message: err.message });
      } else if (err instanceof AuthorizationError) {
        res.status(403).json({ error: 'Authorization Error', message: err.message });
      } else if (err instanceof NotFoundError) {
        res.status(404).json({ error: 'Not Found', message: err.message });
      } else {
        res.status(500).json({ error: 'Internal Server Error', message: 'An unexpected error occurred' });
      }
    });
  }
}

// --- Factory ---
function createAPIRouter(deps) {
  return new APIRouter(deps);
}

// --- Exports ---
module.exports = {
  APIRouter,
  AuthenticationRoutes,
  UserManagementRoutes,
  ContentRoutes,
  SystemRoutes,
  APIError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  createAPIRouter
};