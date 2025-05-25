// Debug script to trace integration issues
const {
  testFixtures,
  testHelpers,
  setupTestEnvironment
} = require('../test-utils/setup');
const {
  IntegrationAdapter,
  DatabaseAdapter,
  SecurityAdapter
} = require('./integration-adapter');
const {
  MockValidationService,
  MockCryptoService,
  MockLoggerService,
  MockDatabase,
  MockAuthService,
  MockUserService
} = require('./mock-services');

// Import actual modules
const { APIRouter } = require('../api/apiRoutes');
const { SecurityMiddleware } = require('../middleware/securityMiddleware');

async function debugIntegration() {
  console.log('=== INTEGRATION DEBUG ANALYSIS ===\n');

  // Initialize mock services
  const baseDb = new MockDatabase();
  const mockValidationService = new MockValidationService();
  const mockCryptoService = new MockCryptoService();
  const mockLoggerService = new MockLoggerService();
  
  // Create services
  const baseAuthService = new MockAuthService(baseDb, mockCryptoService, mockLoggerService);
  const baseUserService = new MockUserService(baseDb, mockValidationService);
  
  const baseSecurity = new SecurityMiddleware({
    authService: baseAuthService,
    validationService: mockValidationService,
    rateLimitService: {
      checkRateLimit: async () => ({ allowed: true, remaining: 99 }),
      detectAbusePattern: async () => ({ isAbusive: false })
    },
    loggerService: mockLoggerService
  });
  
  const baseApiRoutes = new APIRouter({
    authService: baseAuthService,
    userService: baseUserService,
    contentService: {},
    securityMiddleware: baseSecurity,
    validationService: mockValidationService,
    loggerService: mockLoggerService
  });
  
  const apiRoutes = new IntegrationAdapter(baseApiRoutes);
  
  // Test 1: Registration flow
  console.log('1. Testing Registration Flow:');
  const userData = { ...testFixtures.validUser };
  const req = testHelpers.createMockRequest({
    method: 'POST',
    path: '/api/auth/register',
    body: userData
  });
  const res = testHelpers.createMockResponse();
  
  try {
    // Test validation
    const validationResult = mockValidationService.validateRegistration(userData);
    console.log('   - Validation result:', validationResult);
    
    // Test auth service directly
    const authResult = await baseAuthService.register(validationResult.sanitizedData);
    console.log('   - Auth service result:', authResult);
    
    // Test through API route
    await apiRoutes.register(req, res);
    console.log('   - API response:', { status: res.statusCode, data: res.data });
  } catch (error) {
    console.log('   - ERROR:', error.message);
  }
  
  // Test 2: Missing endpoints
  console.log('\n2. Checking for missing endpoints:');
  console.log('   - sendFriendRequest exists?', !!apiRoutes.sendFriendRequest);
  console.log('   - searchUsers exists?', !!apiRoutes.searchUsers);
  console.log('   - healthCheck exists?', !!apiRoutes.healthCheck);
  console.log('   - getUserProfile exists?', !!apiRoutes.getUserProfile);
  
  // Test 3: Database methods
  console.log('\n3. Checking database methods:');
  const testUser = await baseDb.createUser({ ...userData, password: 'hashed' });
  console.log('   - createUser works:', !!testUser);
  console.log('   - updateRelationship exists?', typeof baseDb.updateRelationship === 'function');
  console.log('   - findRelationships exists?', typeof baseDb.findRelationships === 'function');
  
  // Test relationship creation
  if (baseDb.createRelationship) {
    const rel = await baseDb.createRelationship(1, 2, 'friend');
    console.log('   - createRelationship result:', rel);
    if (baseDb.findRelationships) {
      const rels = await baseDb.findRelationships(1);
      console.log('   - findRelationships result:', rels);
    }
  }
  
  // Test 4: Security middleware response format
  console.log('\n4. Testing security middleware:');
  const authReq = testHelpers.createMockRequest({
    method: 'GET',
    path: '/api/users/1'
  });
  const authRes = testHelpers.createMockResponse();
  const authNext = testHelpers.createMockNext();
  
  // Get the authenticate middleware function
  const authenticateMiddleware = baseSecurity.authenticate();
  await authenticateMiddleware(authReq, authRes, authNext);
  console.log('   - No token response:', { status: authRes.statusCode, error: authRes.data?.error });
  
  // Test 5: Input sanitization
  console.log('\n5. Testing input sanitization:');
  const sqlInjection = "'; DROP TABLE users; --";
  const sanitized = mockValidationService.sanitizeInput(sqlInjection);
  console.log('   - SQL injection input:', sqlInjection);
  console.log('   - Sanitized output:', sanitized);
  console.log('   - Contains DROP TABLE?', sanitized.includes('DROP TABLE'));
  
  console.log('\n=== END DEBUG ANALYSIS ===');
}

// Run debug
debugIntegration().catch(console.error);