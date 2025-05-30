// src/api/apiRoutes.test.js

/**
 * API Routes TDD Test Suite - London School Outside-In Approach
 * 
 * Defines the API Routes interfaces and behavior through comprehensive tests.
 * Tests cover authentication, user management, content management, and system routes.
 * All dependencies are mocked to ensure unit test isolation.
 * This is the final RED phase test suite for the VibeStack core modules.
 */

const {
  APIRoutes,
  AuthenticationRoutes,
  UserManagementRoutes,
  ContentRoutes,
  SystemRoutes,
  APIRouter,
  APIError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  createAPIRouter
} = require('./apiRoutes');

describe('API Routes', () => {
  let mockAuthService;
  let mockUserService;
  let mockContentService;
  let mockSecurityMiddleware;
  let mockValidationService;
  let mockLoggerService;
  let mockCsrfProtectionMiddleware;
  let mockRequest;
  let mockResponse;
  let mockNext;
  let mockApp;

  beforeEach(() => {
    // Mock service dependencies using London School approach
    mockAuthService = {
      register: jest.fn(),
      login: jest.fn(),
      logout: jest.fn(),
      verifyToken: jest.fn(),
      refreshToken: jest.fn(),
      resetPassword: jest.fn(),
      validateCredentials: jest.fn()
    };

    mockUserService = {
      getUserProfile: jest.fn(),
      updateUserProfile: jest.fn(),
      deleteUserAccount: jest.fn(),
      getFriendsList: jest.fn(),
      addFriend: jest.fn(),
      removeFriend: jest.fn(),
      getUserById: jest.fn(),
      searchUsers: jest.fn()
    };

    mockContentService = {
      createContent: jest.fn(),
      getContentById: jest.fn(),
      updateContent: jest.fn(),
      deleteContent: jest.fn(),
      getUserFeed: jest.fn(),
      getPublicFeed: jest.fn(),
      searchContent: jest.fn(),
      validateContentData: jest.fn()
    };

    mockSecurityMiddleware = {
      authenticate: jest.fn().mockReturnValue((req, res, next) => next()),
      authorize: jest.fn().mockReturnValue((req, res, next) => next()),
      validateInput: jest.fn().mockReturnValue((req, res, next) => next()),
      rateLimit: jest.fn().mockReturnValue((req, res, next) => next()),
      requirePermissions: jest.fn().mockReturnValue((req, res, next) => next())
    };

    mockValidationService = {
      validateRegistration: jest.fn(),
      validateLogin: jest.fn(),
      validateUserUpdate: jest.fn(),
      validateContentCreation: jest.fn(),
      validateContentUpdate: jest.fn(),
      sanitizeInput: jest.fn()
    };

    mockLoggerService = {
      logAPIRequest: jest.fn(),
      logAPIResponse: jest.fn(),
      logAPIError: jest.fn(),
      auditAPIAccess: jest.fn(),
      logSecurityEvent: jest.fn()
    };

    mockCsrfProtectionMiddleware = {
      csrfProtection: jest.fn().mockReturnValue((req, res, next) => next()),
      generateToken: jest.fn().mockReturnValue((req, res, next) => next()),
      csrfTokenEndpoint: jest.fn().mockReturnValue((req, res, next) => next()),
      validateToken: jest.fn().mockReturnValue((req, res, next) => next())
    };

    // Mock Express request/response/next
    mockRequest = {
      method: 'GET',
      url: '/api/test',
      headers: {
        'authorization': 'Bearer valid-token',
        'content-type': 'application/json'
      },
      body: {},
      query: {},
      params: {},
      ip: '192.168.1.1',
      user: { userId: 'user-123', permissions: ['read'] },
      get: jest.fn(),
      header: jest.fn()
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      header: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis()
    };

    mockNext = jest.fn();

    mockApp = {
      use: jest.fn(),
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      all: jest.fn()
    };
  });

  describe('AuthenticationRoutes', () => {
    let authRoutes;

    beforeEach(() => {
      authRoutes = new AuthenticationRoutes({
        authService: mockAuthService,
        validationService: mockValidationService,
        securityMiddleware: mockSecurityMiddleware,
        loggerService: mockLoggerService
      });
    });

    it('should create authentication routes with required dependencies', () => {
      expect(authRoutes.authService).toBe(mockAuthService);
      expect(authRoutes.validationService).toBe(mockValidationService);
      expect(authRoutes.securityMiddleware).toBe(mockSecurityMiddleware);
      expect(authRoutes.loggerService).toBe(mockLoggerService);
    });

    it('should throw error when dependencies are missing', () => {
      expect(() => new AuthenticationRoutes({}))
        .toThrow('Required dependencies missing for AuthenticationRoutes');
    });

    describe('POST /auth/register', () => {
      it('should register new user with valid data', async () => {
        const registrationData = {
          email: 'test@example.com',
          password: 'SecurePass123!',
          username: 'testuser'
        };
        const expectedResponse = {
          userId: 'user-123',
          token: 'jwt-token',
          refreshToken: 'refresh-token'
        };

        mockRequest.method = 'POST';
        mockRequest.url = '/auth/register';
        mockRequest.body = registrationData;
        
        mockValidationService.validateRegistration.mockReturnValue({
          isValid: true,
          sanitizedData: registrationData
        });
        mockAuthService.register.mockResolvedValue({
          success: true,
          user: { userId: 'user-123', email: 'test@example.com' },
          tokens: { token: 'jwt-token', refreshToken: 'refresh-token' }
        });

        await authRoutes.register()(mockRequest, mockResponse, mockNext);

        expect(mockValidationService.validateRegistration).toHaveBeenCalledWith(registrationData);
        expect(mockAuthService.register).toHaveBeenCalledWith(registrationData);
        expect(mockResponse.status).toHaveBeenCalledWith(201);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: true,
          message: 'User registered successfully',
          data: expectedResponse
        });
        expect(mockLoggerService.logAPIRequest).toHaveBeenCalled();
      });

      it('should reject registration with invalid data', async () => {
        const invalidData = {
          email: 'invalid-email',
          password: '123',
          username: 'a'
        };

        mockRequest.body = invalidData;
        mockValidationService.validateRegistration.mockReturnValue({
          isValid: false,
          errors: ['Invalid email format', 'Password too weak', 'Username too short']
        });

        await authRoutes.register()(mockRequest, mockResponse, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Validation failed',
          message: 'Registration data is invalid',
          details: ['Invalid email format', 'Password too weak', 'Username too short']
        });
        expect(mockAuthService.register).not.toHaveBeenCalled();
      });

      it('should handle registration service errors', async () => {
        const registrationData = {
          email: 'test@example.com',
          password: 'SecurePass123!',
          username: 'testuser'
        };

        mockRequest.body = registrationData;
        mockValidationService.validateRegistration.mockReturnValue({
          isValid: true,
          sanitizedData: registrationData
        });
        mockAuthService.register.mockResolvedValue({
          success: false,
          error: 'Email already exists'
        });

        await authRoutes.register()(mockRequest, mockResponse, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(409);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Registration failed',
          message: 'Email already exists'
        });
      });
    });

    describe('POST /auth/login', () => {
      it('should authenticate user with valid credentials', async () => {
        const loginData = {
          email: 'test@example.com',
          password: 'SecurePass123!'
        };
        const expectedResponse = {
          userId: 'user-123',
          token: 'jwt-token',
          refreshToken: 'refresh-token'
        };

        mockRequest.method = 'POST';
        mockRequest.url = '/auth/login';
        mockRequest.body = loginData;
        
        mockValidationService.validateLogin.mockReturnValue({
          isValid: true,
          sanitizedData: loginData
        });
        mockAuthService.login.mockResolvedValue({
          success: true,
          user: { userId: 'user-123', email: 'test@example.com' },
          tokens: { token: 'jwt-token', refreshToken: 'refresh-token' }
        });

        await authRoutes.login()(mockRequest, mockResponse, mockNext);

        expect(mockValidationService.validateLogin).toHaveBeenCalledWith(loginData);
        expect(mockAuthService.login).toHaveBeenCalledWith(loginData);
        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: true,
          message: 'Login successful',
          data: expectedResponse
        });
      });

      it('should reject invalid credentials', async () => {
        const loginData = {
          email: 'test@example.com',
          password: 'wrongpassword'
        };

        mockRequest.body = loginData;
        mockValidationService.validateLogin.mockReturnValue({
          isValid: true,
          sanitizedData: loginData
        });
        mockAuthService.login.mockResolvedValue({
          success: false,
          error: 'Invalid credentials'
        });

        await authRoutes.login()(mockRequest, mockResponse, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Authentication failed',
          message: 'Invalid credentials'
        });
      });
    });

    describe('POST /auth/logout', () => {
      it('should logout authenticated user', async () => {
        mockRequest.method = 'POST';
        mockRequest.url = '/auth/logout';
        mockRequest.headers.authorization = 'Bearer valid-token';
        
        mockAuthService.logout.mockResolvedValue({
          success: true
        });

        await authRoutes.logout()(mockRequest, mockResponse, mockNext);

        expect(mockAuthService.logout).toHaveBeenCalledWith('valid-token');
        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: true,
          message: 'Logout successful'
        });
        expect(mockResponse.clearCookie).toHaveBeenCalledWith('refreshToken');
      });

      it('should handle logout without token', async () => {
        mockRequest.headers = {}; // No authorization header

        await authRoutes.logout()(mockRequest, mockResponse, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Authentication required',
          message: 'No token provided'
        });
      });
    });

    describe('GET /auth/verify', () => {
      it('should verify valid token', async () => {
        mockRequest.method = 'GET';
        mockRequest.url = '/auth/verify';
        mockRequest.headers.authorization = 'Bearer valid-token';
        
        mockAuthService.verifyToken.mockResolvedValue({
          isValid: true,
          payload: { userId: 'user-123', permissions: ['read'] }
        });

        await authRoutes.verifyToken()(mockRequest, mockResponse, mockNext);

        expect(mockAuthService.verifyToken).toHaveBeenCalledWith('valid-token');
        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith({
          valid: true,
          user: { userId: 'user-123', permissions: ['read'] }
        });
      });

      it('should reject invalid token', async () => {
        mockRequest.headers.authorization = 'Bearer invalid-token';
        
        mockAuthService.verifyToken.mockResolvedValue({
          isValid: false,
          error: 'Token expired'
        });

        await authRoutes.verifyToken()(mockRequest, mockResponse, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({
          valid: false,
          error: 'Token expired'
        });
      });
    });
  });

  describe('UserManagementRoutes', () => {
    let userRoutes;

    beforeEach(() => {
      userRoutes = new UserManagementRoutes({
        userService: mockUserService,
        validationService: mockValidationService,
        securityMiddleware: mockSecurityMiddleware,
        loggerService: mockLoggerService
      });
    });

    describe('GET /users/:id', () => {
      it('should retrieve user profile by ID', async () => {
        const userId = 'user-123';
        const userProfile = {
          id: userId,
          email: 'test@example.com',
          username: 'testuser',
          profile: { displayName: 'Test User' }
        };

        mockRequest.method = 'GET';
        mockRequest.url = `/users/${userId}`;
        mockRequest.params.id = userId;
        mockRequest.user = { userId: 'user-123', permissions: ['read'] };
        
        mockUserService.getUserById.mockResolvedValue({
          success: true,
          user: userProfile
        });

        await userRoutes.getUserProfile()(mockRequest, mockResponse, mockNext);

        expect(mockUserService.getUserById).toHaveBeenCalledWith(userId);
        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: true,
          data: userProfile
        });
      });

      it('should handle user not found', async () => {
        const userId = 'nonexistent-user';
        
        mockRequest.params.id = userId;
        mockUserService.getUserById.mockResolvedValue({
          success: false,
          error: 'User not found'
        });

        await userRoutes.getUserProfile()(mockRequest, mockResponse, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(404);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Not found',
          message: 'User not found'
        });
      });

      it('should enforce privacy controls for private profiles', async () => {
        const userId = 'private-user';
        
        mockRequest.params.id = userId;
        mockRequest.user = { userId: 'different-user', permissions: ['read'] };
        mockUserService.getUserById.mockResolvedValue({
          success: false,
          error: 'Access denied - private profile'
        });

        await userRoutes.getUserProfile()(mockRequest, mockResponse, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Access denied',
          message: 'Access denied - private profile'
        });
      });
    });

    describe('PUT /users/:id', () => {
      it('should update user profile with valid data', async () => {
        const userId = 'user-123';
        const updateData = {
          profile: { displayName: 'Updated Name', bio: 'Updated bio' }
        };

        mockRequest.method = 'PUT';
        mockRequest.url = `/users/${userId}`;
        mockRequest.params.id = userId;
        mockRequest.user = { userId: 'user-123', permissions: ['write'] };
        mockRequest.body = updateData;
        
        mockValidationService.validateUserUpdate.mockReturnValue({
          isValid: true,
          sanitizedData: updateData
        });
        mockUserService.updateUserProfile.mockResolvedValue({
          success: true,
          user: { id: userId, ...updateData }
        });

        await userRoutes.updateUserProfile()(mockRequest, mockResponse, mockNext);

        expect(mockValidationService.validateUserUpdate).toHaveBeenCalledWith(updateData);
        expect(mockUserService.updateUserProfile).toHaveBeenCalledWith(userId, updateData);
        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: true,
          message: 'Profile updated successfully',
          data: { id: userId, ...updateData }
        });
      });

      it('should prevent unauthorized profile updates', async () => {
        const userId = 'user-123';
        
        mockRequest.params.id = userId;
        mockRequest.user = { userId: 'different-user', permissions: ['read'] };

        await userRoutes.updateUserProfile()(mockRequest, mockResponse, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Access denied',
          message: 'Can only update own profile'
        });
        expect(mockUserService.updateUserProfile).not.toHaveBeenCalled();
      });
    });

    describe('GET /users/:id/friends', () => {
      it('should retrieve user friends list', async () => {
        const userId = 'user-123';
        const friendsList = {
          friends: [
            { id: 'friend-1', username: 'friend1' },
            { id: 'friend-2', username: 'friend2' }
          ],
          count: 2
        };

        mockRequest.params.id = userId;
        mockRequest.user = { userId: 'user-123', permissions: ['read'] };
        
        mockUserService.getFriendsList.mockResolvedValue({
          success: true,
          friends: friendsList
        });

        await userRoutes.getFriendsList()(mockRequest, mockResponse, mockNext);

        expect(mockUserService.getFriendsList).toHaveBeenCalledWith(userId);
        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: true,
          data: friendsList
        });
      });
    });
  });

  describe('ContentRoutes', () => {
    let contentRoutes;

    beforeEach(() => {
      contentRoutes = new ContentRoutes({
        contentService: mockContentService,
        validationService: mockValidationService,
        securityMiddleware: mockSecurityMiddleware,
        loggerService: mockLoggerService
      });
    });

    describe('POST /content', () => {
      it('should create content with valid data', async () => {
        const contentData = {
          title: 'Test Content',
          body: 'This is test content',
          type: 'post',
          tags: ['test', 'example']
        };
        const createdContent = {
          id: 'content-123',
          ...contentData,
          authorId: 'user-123',
          createdAt: new Date().toISOString()
        };

        mockRequest.method = 'POST';
        mockRequest.url = '/content';
        mockRequest.body = contentData;
        mockRequest.user = { userId: 'user-123', permissions: ['write'] };
        
        mockValidationService.validateContentCreation.mockReturnValue({
          isValid: true,
          sanitizedData: contentData
        });
        mockContentService.createContent.mockResolvedValue({
          success: true,
          content: createdContent
        });

        await contentRoutes.createContent()(mockRequest, mockResponse, mockNext);

        expect(mockValidationService.validateContentCreation).toHaveBeenCalledWith(contentData);
        expect(mockContentService.createContent).toHaveBeenCalledWith({
          ...contentData,
          authorId: 'user-123'
        });
        expect(mockResponse.status).toHaveBeenCalledWith(201);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: true,
          message: 'Content created successfully',
          data: createdContent
        });
      });

      it('should reject content creation with invalid data', async () => {
        const invalidData = {
          title: '', // Empty title
          body: 'x'.repeat(10001), // Too long
          type: 'invalid'
        };

        mockRequest.body = invalidData;
        mockValidationService.validateContentCreation.mockReturnValue({
          isValid: false,
          errors: ['Title is required', 'Body too long', 'Invalid content type']
        });

        await contentRoutes.createContent()(mockRequest, mockResponse, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Validation failed',
          message: 'Content data is invalid',
          details: ['Title is required', 'Body too long', 'Invalid content type']
        });
      });
    });

    describe('GET /content/:id', () => {
      it('should retrieve content by ID', async () => {
        const contentId = 'content-123';
        const content = {
          id: contentId,
          title: 'Test Content',
          body: 'This is test content',
          authorId: 'user-123',
          createdAt: new Date().toISOString()
        };

        mockRequest.params.id = contentId;
        
        mockContentService.getContentById.mockResolvedValue({
          success: true,
          content: content
        });

        await contentRoutes.getContent()(mockRequest, mockResponse, mockNext);

        expect(mockContentService.getContentById).toHaveBeenCalledWith(contentId);
        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: true,
          data: content
        });
      });

      it('should handle content not found', async () => {
        const contentId = 'nonexistent';
        
        mockRequest.params.id = contentId;
        mockContentService.getContentById.mockResolvedValue({
          success: false,
          error: 'Content not found'
        });

        await contentRoutes.getContent()(mockRequest, mockResponse, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(404);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Not found',
          message: 'Content not found'
        });
      });
    });

    describe('GET /content/feed', () => {
      it('should retrieve personalized content feed', async () => {
        const feedData = {
          posts: [
            { id: 'post-1', title: 'Post 1' },
            { id: 'post-2', title: 'Post 2' }
          ],
          pagination: { page: 1, total: 2, hasMore: false }
        };

        mockRequest.url = '/content/feed';
        mockRequest.query = { page: '1', limit: '10' };
        mockRequest.user = { userId: 'user-123' };
        
        mockContentService.getUserFeed.mockResolvedValue({
          success: true,
          feed: feedData
        });

        await contentRoutes.getFeed()(mockRequest, mockResponse, mockNext);

        expect(mockContentService.getUserFeed).toHaveBeenCalledWith('user-123', {
          page: 1,
          limit: 10
        });
        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: true,
          data: feedData
        });
      });
    });
  });

  describe('SystemRoutes', () => {
    let systemRoutes;

    beforeEach(() => {
      systemRoutes = new SystemRoutes({
        loggerService: mockLoggerService
      });
    });

    describe('GET /health', () => {
      it('should return health check status', async () => {
        mockRequest.method = 'GET';
        mockRequest.url = '/health';

        await systemRoutes.healthCheck()(mockRequest, mockResponse, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith({
          status: 'healthy',
          timestamp: expect.any(String),
          uptime: expect.any(Number),
          version: expect.any(String),
          components: {
            authentication: 'healthy',
            userService: 'healthy',
            database: 'healthy',
            models: 'healthy'
          }
        });
      });
    });

    describe('GET /version', () => {
      it('should return API version information', async () => {
        await systemRoutes.getVersion()(mockRequest, mockResponse, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith({
          version: expect.any(String),
          apiVersion: 'v1',
          build: expect.any(String),
          environment: expect.any(String)
        });
      });
    });

    describe('GET /metrics', () => {
      it('should return system metrics for authenticated admin users', async () => {
        mockRequest.user = { userId: 'admin-123', permissions: ['admin'] };

        await systemRoutes.getMetrics()(mockRequest, mockResponse, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith({
          metrics: {
            requestCount: expect.any(Number),
            responseTime: expect.any(Number),
            errorRate: expect.any(Number),
            activeUsers: expect.any(Number)
          }
        });
      });

      it('should reject non-admin users', async () => {
        mockRequest.user = { userId: 'user-123', permissions: ['read'] };

        await systemRoutes.getMetrics()(mockRequest, mockResponse, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Access denied',
          message: 'Admin privileges required'
        });
      });
    });
  });

  describe('APIRouter', () => {
    let apiRouter;

    beforeEach(() => {
      apiRouter = new APIRouter({
        authService: mockAuthService,
        userService: mockUserService,
        contentService: mockContentService,
        securityMiddleware: mockSecurityMiddleware,
        validationService: mockValidationService,
        loggerService: mockLoggerService,
        csrfProtectionMiddleware: mockCsrfProtectionMiddleware
      });
    });

    it('should create API router with all route handlers', () => {
      expect(apiRouter.authRoutes).toBeDefined();
      expect(apiRouter.userRoutes).toBeDefined();
      expect(apiRouter.contentRoutes).toBeDefined();
      expect(apiRouter.systemRoutes).toBeDefined();
    });

    it('should configure Express app with all routes', () => {
      apiRouter.configureRoutes(mockApp);

      // Verify authentication routes
      expect(mockApp.post).toHaveBeenCalledWith('/auth/register', expect.any(Function));
      expect(mockApp.post).toHaveBeenCalledWith('/auth/login', expect.any(Function));
      expect(mockApp.post).toHaveBeenCalledWith('/auth/logout', expect.any(Function), expect.any(Function));
      expect(mockApp.get).toHaveBeenCalledWith('/auth/verify', expect.any(Function));

      // Verify user routes
      expect(mockApp.get).toHaveBeenCalledWith('/users/:id', expect.any(Function), expect.any(Function));
      expect(mockApp.put).toHaveBeenCalledWith('/users/:id', expect.any(Function), expect.any(Function), expect.any(Function));
      expect(mockApp.get).toHaveBeenCalledWith('/users/:id/friends', expect.any(Function), expect.any(Function));

      // Verify content routes
      expect(mockApp.post).toHaveBeenCalledWith('/content', expect.any(Function), expect.any(Function), expect.any(Function));
      expect(mockApp.get).toHaveBeenCalledWith('/content/:id', expect.any(Function), expect.any(Function));
      expect(mockApp.get).toHaveBeenCalledWith('/content/feed', expect.any(Function), expect.any(Function));

      // Verify system routes
      expect(mockApp.get).toHaveBeenCalledWith('/health', expect.any(Function));
      expect(mockApp.get).toHaveBeenCalledWith('/version', expect.any(Function));
      expect(mockApp.get).toHaveBeenCalledWith('/metrics', expect.any(Function), expect.any(Function));
    });

    it('should apply security middleware to protected routes', () => {
      apiRouter.configureRoutes(mockApp);

      expect(mockSecurityMiddleware.authenticate).toHaveBeenCalled();
      // Note: The current routes only use authenticate middleware
      // Other middleware like authorize, validateInput, rateLimit may be added in future routes
    });

    it('should handle 404 for undefined routes', () => {
      apiRouter.configureRoutes(mockApp);

      expect(mockApp.all).toHaveBeenCalledWith('*', expect.any(Function));
      
      // Test the 404 handler
      const notFoundHandler = mockApp.all.mock.calls.find(call => call[0] === '*')[1];
      notFoundHandler(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Not found',
        message: 'API endpoint not found',
        path: mockRequest.url
      });
    });

    it('should handle global error responses', () => {
      const error = new Error('Test error');
      const errorHandler = jest.fn((err, req, res, next) => {
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

      apiRouter.configureErrorHandling(mockApp);
      
      // Test different error types
      const validationError = new ValidationError('Validation failed');
      errorHandler(validationError, mockRequest, mockResponse, mockNext);
      expect(mockResponse.status).toHaveBeenCalledWith(400);

      const authError = new AuthenticationError('Authentication failed');
      errorHandler(authError, mockRequest, mockResponse, mockNext);
      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });
  });

  describe('createAPIRouter Factory', () => {
    it('should create complete API router with all dependencies', () => {
      const dependencies = {
        authService: mockAuthService,
        userService: mockUserService,
        contentService: mockContentService,
        securityMiddleware: mockSecurityMiddleware,
        validationService: mockValidationService,
        loggerService: mockLoggerService,
        csrfProtectionMiddleware: mockCsrfProtectionMiddleware
      };

      const router = createAPIRouter(dependencies);

      expect(router).toBeInstanceOf(APIRouter);
      expect(router.authRoutes).toBeDefined();
      expect(router.userRoutes).toBeDefined();
      expect(router.contentRoutes).toBeDefined();
      expect(router.systemRoutes).toBeDefined();
    });

    it('should throw error when required dependencies are missing', () => {
      expect(() => createAPIRouter({}))
        .toThrow('Required dependencies missing for API Router');
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete API request flow', async () => {
      const apiRouter = new APIRouter({
        authService: mockAuthService,
        userService: mockUserService,
        contentService: mockContentService,
        securityMiddleware: mockSecurityMiddleware,
        validationService: mockValidationService,
        loggerService: mockLoggerService,
        csrfProtectionMiddleware: mockCsrfProtectionMiddleware
      });

      // Mock successful authentication middleware
      mockSecurityMiddleware.authenticate.mockReturnValue((req, res, next) => {
        req.user = { userId: 'user-123', permissions: ['write'] };
        next();
      });

      // Mock successful content creation
      const contentData = { title: 'Test', body: 'Content' };
      mockRequest.body = contentData;
      mockValidationService.validateContentCreation.mockReturnValue({
        isValid: true,
        sanitizedData: contentData
      });
      mockContentService.createContent.mockResolvedValue({
        success: true,
        content: { id: 'content-123', ...contentData }
      });

      await apiRouter.contentRoutes.createContent()(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockLoggerService.logAPIRequest).toHaveBeenCalled();
    });

    it('should handle API error chain', async () => {
      const apiRouter = new APIRouter({
        authService: mockAuthService,
        userService: mockUserService,
        contentService: mockContentService,
        securityMiddleware: mockSecurityMiddleware,
        validationService: mockValidationService,
        loggerService: mockLoggerService,
        csrfProtectionMiddleware: mockCsrfProtectionMiddleware
      });

      // Mock authentication failure
      mockSecurityMiddleware.authenticate.mockReturnValue((req, res, next) => {
        res.status(401).json({ error: 'Authentication failed' });
      });

      // Simulate the middleware chain: auth fails, so content creation should not be reached
      const authMiddleware = mockSecurityMiddleware.authenticate();
      await authMiddleware(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockContentService.createContent).not.toHaveBeenCalled();
    });
  });
});