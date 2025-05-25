// src/middleware/securityMiddleware.test.js

/**
 * Security Middleware TDD Test Suite - London School Outside-In Approach
 * 
 * Defines the Security Middleware interfaces and behavior through comprehensive tests.
 * Tests cover authentication, authorization, input validation, rate limiting, 
 * security headers, and attack prevention mechanisms.
 * All dependencies are mocked to ensure unit test isolation.
 */

const {
  SecurityMiddleware,
  AuthenticationMiddleware,
  AuthorizationMiddleware,
  InputValidationMiddleware,
  RateLimitingMiddleware,
  SecurityHeadersMiddleware,
  ErrorHandlingMiddleware,
  SecurityMiddlewareFactory,
  AuthenticationError,
  AuthorizationError
} = require('./securityMiddleware');

const {
  SecurityValidationError,
  RateLimitExceededError
} = require('./errorHandlingMiddleware');

describe('Security Middleware', () => {
  let mockAuthService;
  let mockValidationService;
  let mockRateLimitService;
  let mockLoggerService;
  let mockRequest;
  let mockResponse;
  let mockNext;

  beforeEach(() => {
    // Mock dependencies using London School approach
    mockAuthService = {
      validateToken: jest.fn(),
      verifySession: jest.fn(),
      checkPermissions: jest.fn(),
      refreshToken: jest.fn(),
      blacklistToken: jest.fn(),
      extractTokenFromHeader: jest.fn()
    };

    mockValidationService = {
      sanitizeInput: jest.fn(),
      validateSQLInjection: jest.fn(),
      validateXSS: jest.fn(),
      validateCSRF: jest.fn(),
      validateFileUpload: jest.fn(),
      validateContentType: jest.fn(),
      normalizeInput: jest.fn()
    };

    mockRateLimitService = {
      checkRateLimit: jest.fn(),
      incrementCounter: jest.fn(),
      resetCounter: jest.fn(),
      getWindowInfo: jest.fn(),
      detectAbusePattern: jest.fn(),
      blockIP: jest.fn()
    };

    mockLoggerService = {
      logSecurityEvent: jest.fn(),
      logAuthAttempt: jest.fn(),
      logValidationFailure: jest.fn(),
      logRateLimitViolation: jest.fn(),
      logError: jest.fn(),
      auditRequest: jest.fn()
    };

    // Mock Express request/response/next
    mockRequest = {
      headers: {},
      body: {},
      query: {},
      params: {},
      ip: '192.168.1.1',
      method: 'GET',
      url: '/api/test',
      get: jest.fn(),
      session: {}
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      header: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };

    mockNext = jest.fn();
  });

  describe('AuthenticationMiddleware', () => {
    let authMiddleware;

    beforeEach(() => {
      authMiddleware = new AuthenticationMiddleware({
        authService: mockAuthService,
        loggerService: mockLoggerService
      });
    });

    it('should create authentication middleware with required dependencies', () => {
      expect(authMiddleware.authService).toBe(mockAuthService);
      expect(authMiddleware.loggerService).toBe(mockLoggerService);
    });

    it('should throw error when dependencies are missing', () => {
      expect(() => new AuthenticationMiddleware({}))
        .toThrow('Required dependencies missing for AuthenticationMiddleware');
    });

    describe('Token Validation', () => {
      it('should validate JWT token from Authorization header', async () => {
        const validToken = 'Bearer valid-jwt-token';
        const decodedToken = { userId: 'user-123', permissions: ['read'] };
        
        mockRequest.headers.authorization = validToken;
        mockAuthService.extractTokenFromHeader.mockReturnValue('valid-jwt-token');
        mockAuthService.validateToken.mockResolvedValue({ 
          isValid: true, 
          payload: decodedToken 
        });

        await authMiddleware.authenticate()(mockRequest, mockResponse, mockNext);

        expect(mockAuthService.extractTokenFromHeader).toHaveBeenCalledWith(validToken);
        expect(mockAuthService.validateToken).toHaveBeenCalledWith('valid-jwt-token');
        expect(mockRequest.user).toEqual(decodedToken);
        expect(mockNext).toHaveBeenCalled();
      });

      it('should reject invalid JWT token', async () => {
        const invalidToken = 'Bearer invalid-token';
        
        mockRequest.headers.authorization = invalidToken;
        mockAuthService.extractTokenFromHeader.mockReturnValue('invalid-token');
        mockAuthService.validateToken.mockResolvedValue({ 
          isValid: false, 
          error: 'Token expired' 
        });

        await authMiddleware.authenticate()(mockRequest, mockResponse, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Authentication failed',
          message: 'Token expired'
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should reject request without authorization header', async () => {
        mockRequest.headers = {}; // No authorization header

        await authMiddleware.authenticate()(mockRequest, mockResponse, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Authentication required',
          message: 'Authorization header missing'
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should handle malformed authorization header', async () => {
        mockRequest.headers.authorization = 'InvalidFormat token';

        await authMiddleware.authenticate()(mockRequest, mockResponse, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Authentication failed',
          message: 'Invalid authorization header format'
        });
      });
    });

    describe('Session Validation', () => {
      it('should validate active session', async () => {
        const sessionId = 'session-123';
        const sessionData = { userId: 'user-123', isActive: true };
        
        mockRequest.session.id = sessionId;
        mockAuthService.verifySession.mockResolvedValue({
          isValid: true,
          session: sessionData
        });

        await authMiddleware.validateSession()(mockRequest, mockResponse, mockNext);

        expect(mockAuthService.verifySession).toHaveBeenCalledWith(sessionId);
        expect(mockRequest.session.data).toEqual(sessionData);
        expect(mockNext).toHaveBeenCalled();
      });

      it('should reject expired session', async () => {
        const expiredSessionId = 'expired-session';
        
        mockRequest.session.id = expiredSessionId;
        mockAuthService.verifySession.mockResolvedValue({
          isValid: false,
          error: 'Session expired'
        });

        await authMiddleware.validateSession()(mockRequest, mockResponse, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Session invalid',
          message: 'Session expired'
        });
      });
    });

    it('should log authentication attempts', async () => {
      mockRequest.headers.authorization = 'Bearer test-token';
      mockAuthService.extractTokenFromHeader.mockReturnValue('test-token');
      mockAuthService.validateToken.mockResolvedValue({ isValid: true, payload: {} });

      await authMiddleware.authenticate()(mockRequest, mockResponse, mockNext);

      expect(mockLoggerService.logAuthAttempt).toHaveBeenCalledWith({
        ip: mockRequest.ip,
        userAgent: undefined,
        success: true,
        timestamp: expect.any(Date)
      });
    });
  });

  describe('AuthorizationMiddleware', () => {
    let authzMiddleware;

    beforeEach(() => {
      authzMiddleware = new AuthorizationMiddleware({
        authService: mockAuthService,
        loggerService: mockLoggerService
      });
    });

    it('should create authorization middleware with required dependencies', () => {
      expect(authzMiddleware.authService).toBe(mockAuthService);
      expect(authzMiddleware.loggerService).toBe(mockLoggerService);
    });

    describe('Permission Checking', () => {
      it('should authorize user with required permissions', async () => {
        const requiredPermissions = ['read', 'write'];
        mockRequest.user = { userId: 'user-123', permissions: ['read', 'write', 'admin'] };
        
        mockAuthService.checkPermissions.mockReturnValue({
          hasPermission: true,
          missingPermissions: []
        });

        await authzMiddleware.requirePermissions(requiredPermissions)(mockRequest, mockResponse, mockNext);

        expect(mockAuthService.checkPermissions).toHaveBeenCalledWith(
          mockRequest.user.permissions,
          requiredPermissions
        );
        expect(mockNext).toHaveBeenCalled();
      });

      it('should reject user without required permissions', async () => {
        const requiredPermissions = ['admin'];
        mockRequest.user = { userId: 'user-123', permissions: ['read'] };
        
        mockAuthService.checkPermissions.mockReturnValue({
          hasPermission: false,
          missingPermissions: ['admin']
        });

        await authzMiddleware.requirePermissions(requiredPermissions)(mockRequest, mockResponse, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Access denied',
          message: 'Insufficient permissions',
          missingPermissions: ['admin']
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should reject unauthenticated user', async () => {
        mockRequest.user = null; // No user attached to request

        await authzMiddleware.requirePermissions(['read'])(mockRequest, mockResponse, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Authentication required',
          message: 'User not authenticated'
        });
      });
    });

    describe('Role-Based Access Control', () => {
      it('should authorize user with required role', async () => {
        const requiredRole = 'moderator';
        mockRequest.user = { userId: 'user-123', role: 'moderator' };

        await authzMiddleware.requireRole(requiredRole)(mockRequest, mockResponse, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });

      it('should reject user without required role', async () => {
        const requiredRole = 'admin';
        mockRequest.user = { userId: 'user-123', role: 'user' };

        await authzMiddleware.requireRole(requiredRole)(mockRequest, mockResponse, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Access denied',
          message: 'Insufficient role',
          requiredRole: 'admin',
          currentRole: 'user'
        });
      });
    });
  });

  describe('InputValidationMiddleware', () => {
    let validationMiddleware;

    beforeEach(() => {
      validationMiddleware = new InputValidationMiddleware({
        validationService: mockValidationService,
        loggerService: mockLoggerService
      });
    });

    describe('SQL Injection Prevention', () => {
      it('should detect and block SQL injection attempts', async () => {
        const maliciousQuery = "'; DROP TABLE users; --";
        mockRequest.query.search = maliciousQuery;
        
        mockValidationService.validateSQLInjection.mockReturnValue({
          isSafe: false,
          threats: ['DROP_TABLE', 'SQL_COMMENT']
        });

        await validationMiddleware.validateInput()(mockRequest, mockResponse, mockNext);

        expect(mockValidationService.validateSQLInjection).toHaveBeenCalledWith(maliciousQuery);
        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Validation failed',
          message: 'Potentially harmful input detected',
          threats: ['DROP_TABLE', 'SQL_COMMENT']
        });
        expect(mockLoggerService.logValidationFailure).toHaveBeenCalled();
      });

      it('should allow safe SQL-like strings', async () => {
        const safeQuery = "user@example.com";
        mockRequest.query.email = safeQuery;
        
        mockValidationService.validateSQLInjection.mockReturnValue({
          isSafe: true,
          threats: []
        });

        await validationMiddleware.validateInput()(mockRequest, mockResponse, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });
    });

    describe('XSS Prevention', () => {
      it('should sanitize potentially harmful scripts', async () => {
        const maliciousScript = '<script>alert("xss")</script>Hello';
        const sanitizedContent = 'Hello';
        
        mockRequest.body.content = maliciousScript;
        mockValidationService.validateXSS.mockReturnValue({
          isSafe: false,
          sanitized: sanitizedContent
        });
        mockValidationService.sanitizeInput.mockReturnValue(sanitizedContent);

        await validationMiddleware.sanitizeXSS()(mockRequest, mockResponse, mockNext);

        expect(mockValidationService.validateXSS).toHaveBeenCalledWith(maliciousScript);
        expect(mockRequest.body.content).toBe(sanitizedContent);
        expect(mockNext).toHaveBeenCalled();
      });

      it('should preserve safe HTML content', async () => {
        const safeContent = '<p>This is safe content</p>';
        
        mockRequest.body.content = safeContent;
        mockValidationService.validateXSS.mockReturnValue({
          isSafe: true,
          sanitized: safeContent
        });

        await validationMiddleware.sanitizeXSS()(mockRequest, mockResponse, mockNext);

        expect(mockRequest.body.content).toBe(safeContent);
        expect(mockNext).toHaveBeenCalled();
      });
    });

    describe('File Upload Validation', () => {
      it('should validate file type and size', async () => {
        const validFile = {
          originalname: 'photo.jpg',
          mimetype: 'image/jpeg',
          size: 1024000, // 1MB
          buffer: Buffer.from('fake-image-data')
        };
        
        mockRequest.file = validFile;
        mockValidationService.validateFileUpload.mockReturnValue({
          isValid: true,
          errors: []
        });

        await validationMiddleware.validateFileUpload({
          allowedTypes: ['image/jpeg', 'image/png'],
          maxSize: 5000000 // 5MB
        })(mockRequest, mockResponse, mockNext);

        expect(mockValidationService.validateFileUpload).toHaveBeenCalledWith(validFile, {
          allowedTypes: ['image/jpeg', 'image/png'],
          maxSize: 5000000
        });
        expect(mockNext).toHaveBeenCalled();
      });

      it('should reject invalid file types', async () => {
        const invalidFile = {
          originalname: 'script.exe',
          mimetype: 'application/x-executable',
          size: 1024,
          buffer: Buffer.from('malicious-code')
        };
        
        mockRequest.file = invalidFile;
        mockValidationService.validateFileUpload.mockReturnValue({
          isValid: false,
          errors: ['Invalid file type: application/x-executable']
        });

        await validationMiddleware.validateFileUpload({
          allowedTypes: ['image/jpeg', 'image/png']
        })(mockRequest, mockResponse, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'File validation failed',
          errors: ['Invalid file type: application/x-executable']
        });
      });
    });
  });

  describe('RateLimitingMiddleware', () => {
    let rateLimitMiddleware;

    beforeEach(() => {
      rateLimitMiddleware = new RateLimitingMiddleware({
        rateLimitService: mockRateLimitService,
        loggerService: mockLoggerService
      });
    });

    describe('Request Rate Limiting', () => {
      it('should allow requests within rate limit', async () => {
        const rateLimitConfig = { windowMs: 60000, maxRequests: 100 };
        
        mockRateLimitService.checkRateLimit.mockResolvedValue({
          allowed: true,
          remaining: 99,
          resetTime: Date.now() + 60000
        });

        await rateLimitMiddleware.limitRequests(rateLimitConfig)(mockRequest, mockResponse, mockNext);

        expect(mockRateLimitService.checkRateLimit).toHaveBeenCalledWith(
          mockRequest.ip,
          rateLimitConfig
        );
        expect(mockResponse.header).toHaveBeenCalledWith('X-RateLimit-Remaining', 99);
        expect(mockNext).toHaveBeenCalled();
      });

      it('should block requests exceeding rate limit', async () => {
        const rateLimitConfig = { windowMs: 60000, maxRequests: 100 };
        
        mockRateLimitService.checkRateLimit.mockResolvedValue({
          allowed: false,
          remaining: 0,
          resetTime: Date.now() + 30000
        });

        await rateLimitMiddleware.limitRequests(rateLimitConfig)(mockRequest, mockResponse, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(429);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Rate limit exceeded',
          message: 'Too many requests',
          retryAfter: expect.any(Number)
        });
        expect(mockNext).not.toHaveBeenCalled();
      });
    });

    describe('Abuse Pattern Detection', () => {
      it('should detect and block abuse patterns', async () => {
        mockRateLimitService.detectAbusePattern.mockResolvedValue({
          isAbusive: true,
          pattern: 'RAPID_FIRE_REQUESTS',
          confidence: 0.95
        });

        await rateLimitMiddleware.detectAbuse()(mockRequest, mockResponse, mockNext);

        expect(mockRateLimitService.detectAbusePattern).toHaveBeenCalledWith(mockRequest.ip);
        expect(mockResponse.status).toHaveBeenCalledWith(429);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Suspicious activity detected',
          message: 'Request blocked due to abuse pattern'
        });
        expect(mockLoggerService.logSecurityEvent).toHaveBeenCalledWith({
          type: 'ABUSE_DETECTED',
          ip: mockRequest.ip,
          pattern: 'RAPID_FIRE_REQUESTS'
        });
      });
    });
  });

  describe('SecurityHeadersMiddleware', () => {
    let headersMiddleware;

    beforeEach(() => {
      headersMiddleware = new SecurityHeadersMiddleware({
        loggerService: mockLoggerService
      });
    });

    it('should set comprehensive security headers', async () => {
      await headersMiddleware.setSecurityHeaders()(mockRequest, mockResponse, mockNext);

      expect(mockResponse.header).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
      expect(mockResponse.header).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
      expect(mockResponse.header).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block');
      expect(mockResponse.header).toHaveBeenCalledWith('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
      expect(mockResponse.header).toHaveBeenCalledWith('Referrer-Policy', 'strict-origin-when-cross-origin');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should set Content Security Policy', async () => {
      const cspConfig = {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"]
        }
      };

      await headersMiddleware.setCSP(cspConfig)(mockRequest, mockResponse, mockNext);

      expect(mockResponse.header).toHaveBeenCalledWith(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
      );
    });

    it('should configure CORS headers', async () => {
      const corsConfig = {
        origin: 'https://example.com',
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE']
      };

      await headersMiddleware.setCORS(corsConfig)(mockRequest, mockResponse, mockNext);

      expect(mockResponse.header).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://example.com');
      expect(mockResponse.header).toHaveBeenCalledWith('Access-Control-Allow-Credentials', 'true');
      expect(mockResponse.header).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    });
  });

  describe('ErrorHandlingMiddleware', () => {
    let errorMiddleware;

    beforeEach(() => {
      errorMiddleware = new ErrorHandlingMiddleware({
        loggerService: mockLoggerService
      });
    });

    it('should handle security validation errors', () => {
      const validationError = new SecurityValidationError('Input validation failed', {
        field: 'email',
        rule: 'format'
      });

      errorMiddleware.handleSecurityError()(validationError, mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Validation Error',
        message: 'Input validation failed',
        details: { field: 'email', rule: 'format' }
      });
    });

    it('should handle rate limit errors', () => {
      const rateLimitError = new RateLimitExceededError('Rate limit exceeded', {
        limit: 100,
        windowMs: 60000
      });

      errorMiddleware.handleSecurityError()(rateLimitError, mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(429);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Rate Limit Exceeded',
        message: 'Rate limit exceeded',
        retryAfter: 60
      });
    });

    it('should prevent information leakage in production errors', () => {
      process.env.NODE_ENV = 'production';
      const internalError = new Error('Database connection failed');

      errorMiddleware.handleSecurityError()(internalError, mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred'
      });
      expect(mockLoggerService.logError).toHaveBeenCalledWith(internalError);
    });
  });

  describe('SecurityMiddlewareFactory', () => {
    let factory;

    beforeEach(() => {
      factory = new SecurityMiddlewareFactory({
        authService: mockAuthService,
        validationService: mockValidationService,
        rateLimitService: mockRateLimitService,
        loggerService: mockLoggerService
      });
    });

    it('should create complete security middleware chain', () => {
      const config = {
        auth: { required: true },
        rateLimit: { windowMs: 60000, maxRequests: 100 },
        validation: { sanitizeInput: true },
        headers: { csp: true }
      };

      const middlewareChain = factory.createSecurityChain(config);

      expect(middlewareChain).toHaveLength(5); // auth, validation, rate limit, headers, error handling
      expect(typeof middlewareChain[0]).toBe('function');
    });

    it('should create middleware with consistent dependencies', () => {
      const authMiddleware = factory.createAuthenticationMiddleware();
      const validationMiddleware = factory.createInputValidationMiddleware();

      expect(authMiddleware.authService).toBe(mockAuthService);
      expect(validationMiddleware.validationService).toBe(mockValidationService);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete security flow for authenticated request', async () => {
      // Setup middleware chain
      const authMiddleware = new AuthenticationMiddleware({
        authService: mockAuthService,
        loggerService: mockLoggerService
      });
      
      const validationMiddleware = new InputValidationMiddleware({
        validationService: mockValidationService,
        loggerService: mockLoggerService
      });

      // Mock successful authentication
      mockRequest.headers.authorization = 'Bearer valid-token';
      mockAuthService.extractTokenFromHeader.mockReturnValue('valid-token');
      mockAuthService.validateToken.mockResolvedValue({
        isValid: true,
        payload: { userId: 'user-123', permissions: ['read'] }
      });

      // Mock successful validation
      mockRequest.body.message = 'Hello world';
      mockValidationService.validateXSS.mockReturnValue({
        isSafe: true,
        sanitized: 'Hello world'
      });

      // Execute middleware chain
      await authMiddleware.authenticate()(mockRequest, mockResponse, mockNext);
      await validationMiddleware.sanitizeXSS()(mockRequest, mockResponse, mockNext);

      expect(mockRequest.user).toBeDefined();
      expect(mockRequest.body.message).toBe('Hello world');
      expect(mockNext).toHaveBeenCalledTimes(2);
    });

    it('should stop execution on security failure', async () => {
      const authMiddleware = new AuthenticationMiddleware({
        authService: mockAuthService,
        loggerService: mockLoggerService
      });

      // Mock authentication failure
      mockRequest.headers.authorization = 'Bearer invalid-token';
      mockAuthService.extractTokenFromHeader.mockReturnValue('invalid-token');
      mockAuthService.validateToken.mockResolvedValue({
        isValid: false,
        error: 'Token expired'
      });

      await authMiddleware.authenticate()(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});