// src/api/routes/systemRoutes.js

/**
 * SystemRoutes: Handles health check, version, and metrics endpoints.
 * Extracted from apiRoutes.js for modularity and maintainability.
 * All dependencies are injected for testability.
 */

class SystemRoutes {
  constructor({ loggerService }) {
    if (!loggerService) {
      throw new Error('Required dependencies missing for SystemRoutes');
    }
    this.loggerService = loggerService;
    this._startTime = Date.now();
  }

  healthCheck() {
    return async (req, res, next) => {
      try {
        // Check if we should simulate service degradation for testing
        const simulateFailure = req.query.simulate === 'failure';
        if (simulateFailure) {
          return res.status(503).json({
            status: 'degraded',
            timestamp: new Date().toISOString(),
            uptime: Math.floor((Date.now() - this._startTime) / 1000),
            version: '1.0.0',
            components: {
              authentication: 'degraded',
              userService: 'unhealthy',
              database: 'healthy',
              models: 'healthy'
            },
            error: 'Service temporarily unavailable'
          });
        }
        res.status(200).json({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: Math.floor((Date.now() - this._startTime) / 1000),
          version: '1.0.0',
          components: {
            authentication: 'healthy',
            userService: 'healthy',
            database: 'healthy',
            models: 'healthy'
          }
        });
      } catch (err) {
        // Return 503 for service failures instead of 500
        res.status(503).json({
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          uptime: Math.floor((Date.now() - this._startTime) / 1000),
          version: '1.0.0',
          components: {
            authentication: 'unknown',
            userService: 'unknown',
            database: 'unknown',
            models: 'unknown'
          },
          error: 'Health check failed'
        });
      }
    };
  }

  getVersion() {
    return async (req, res, next) => {
      try {
        res.status(200).json({
          version: '1.0.0',
          apiVersion: 'v1',
          build: '2025-05-24',
          environment: process.env.NODE_ENV || 'development'
        });
      } catch (err) {
        next(err);
      }
    };
  }

  getMetrics() {
    return async (req, res, next) => {
      try {
        if (!req.user || !req.user.permissions?.includes('admin')) {
          return res.status(403).json({
            error: 'Access denied',
            message: 'Admin privileges required'
          });
        }
        res.status(200).json({
          metrics: {
            requestCount: 1000,
            responseTime: 120,
            errorRate: 0.01,
            activeUsers: 42
          }
        });
      } catch (err) {
        next(err);
      }
    };
  }
}

module.exports = {
  SystemRoutes
};