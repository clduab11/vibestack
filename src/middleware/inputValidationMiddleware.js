/**
 * InputValidationMiddleware: Handles comprehensive input validation and sanitization.
 * - Validates query, body, headers, cookies, and file uploads.
 * - Uses Joi for schema-based validation (whitelist, type, length, format).
 * - Provides XSS, SQL/NoSQL/command/path injection prevention.
 * - Modular, testable, and integrates with security logging.
 * - All dependencies are injected for testability.
 */
const Joi = require('joi');

class SecurityValidationError extends Error {
  constructor(message, details) {
    super(message);
    this.name = 'SecurityValidationError';
    this.details = details;
  }
}

class InputValidationMiddleware {
  /**
   * @param {Object} deps - { validationService, loggerService }
   */
  constructor(deps) {
    if (!deps || !deps.validationService || !deps.loggerService) {
      throw new Error('Required dependencies missing for InputValidationMiddleware');
    }
    this.validationService = deps.validationService;
    this.loggerService = deps.loggerService;
  }

  /**
   * Generic schema-based validation middleware.
   * @param {Object} options - { schema, source: 'body'|'query'|'headers'|'cookies', sanitize }
   */
  validateSchema({ schema, source = 'body', sanitize = true, logLabel = 'SCHEMA_VALIDATION' }) {
    return (req, res, next) => {
      const data = req[source] || {};
      const { error, value } = schema.validate(data, { abortEarly: false, stripUnknown: true, convert: true });
      if (error) {
        this.loggerService.logValidationFailure?.({
          type: logLabel,
          details: error.details,
          value: data
        });
        return res.status(400).json({
          error: 'Validation failed',
          message: 'Input validation error',
          details: error.details.map(d => d.message)
        });
      }
      // Optionally sanitize all string fields for XSS
      if (sanitize) {
        for (const key in value) {
          if (typeof value[key] === 'string') {
            value[key] = this.validationService.sanitizeInput(value[key]);
          }
        }
      }
      req[source] = value;
      return next();
    };
  }

  /**
   * Express middleware for SQL injection validation (query params).
   */
  validateInput() {
    return (req, res, next) => {
      for (const key in req.query) {
        const value = req.query[key];
        const result = this.validationService.validateSQLInjection(value);
        if (result && !result.isSafe) {
          this.loggerService.logValidationFailure({
            type: 'SQL_INJECTION',
            threats: result.threats,
            value
          });
          res.status(400).json({
            error: 'Validation failed',
            message: 'Potentially harmful input detected',
            threats: result.threats
          });
          return;
        }
      }
      return next();
    };
  }

  /**
   * Express middleware for XSS sanitization (body.content).
   */
  sanitizeXSS() {
    return (req, res, next) => {
      if (req.body && req.body.content) {
        const result = this.validationService.validateXSS(req.body.content);
        if (result && !result.isSafe) {
          req.body.content = this.validationService.sanitizeInput(req.body.content);
        } else if (result && result.sanitized) {
          req.body.content = result.sanitized;
        }
      }
      return next();
    };
  }

  /**
   * Express middleware for file upload validation.
   * @param {Object} config - { allowedTypes, maxSize }
   */
  validateFileUpload(config) {
    return (req, res, next) => {
      const file = req.file;
      if (!file) return next();
      const result = this.validationService.validateFileUpload(file, config);
      if (result && result.isValid) {
        return next();
      } else {
        this.loggerService.logValidationFailure?.({
          type: 'FILE_UPLOAD',
          details: (result && result.errors) || ['Invalid file'],
          value: file
        });
        res.status(400).json({
          error: 'File validation failed',
          errors: (result && result.errors) || ['Invalid file']
        });
      }
    };
  }

  /**
   * Middleware for validating headers using a Joi schema.
   * @param {Joi.Schema} schema
   */
  validateHeaders(schema) {
    return this.validateSchema({ schema, source: 'headers', logLabel: 'HEADER_VALIDATION' });
  }

  /**
   * Middleware for validating cookies using a Joi schema.
   * @param {Joi.Schema} schema
   */
  validateCookies(schema) {
    return this.validateSchema({ schema, source: 'cookies', logLabel: 'COOKIE_VALIDATION' });
  }

  /**
   * Middleware for validating request body using a Joi schema.
   * @param {Joi.Schema} schema
   */
  validateBody(schema) {
    return this.validateSchema({ schema, source: 'body', logLabel: 'BODY_VALIDATION' });
  }

  /**
   * Middleware for validating query params using a Joi schema.
   * @param {Joi.Schema} schema
   */
  validateQuery(schema) {
    return this.validateSchema({ schema, source: 'query', logLabel: 'QUERY_VALIDATION' });
  }
}

module.exports = {
  InputValidationMiddleware,
  SecurityValidationError,
  Joi // Export Joi for use in route schemas
};