# Core System Functions Pseudocode
## Module: User Onboarding, Data Pipeline, and System Infrastructure

```pseudocode
// ============================================
// USER ONBOARDING FLOW MODULE
// ============================================

MODULE UserOnboardingFlow:
    // Configuration
    CONST ONBOARDING_STEPS = [
        "REGISTRATION",
        "AVATAR_CREATION",
        "CONSENT_MANAGEMENT",
        "HABIT_ASSIGNMENT",
        "TUTORIAL_COMPLETION"
    ]
    
    // TEST: Should handle complete registration flow
    CLASS RegistrationManager:
        FUNCTION registerUser(registrationData):
            // Validate input data
            validation = validateRegistrationData(registrationData)
            IF NOT validation.valid:
                RETURN {success: FALSE, errors: validation.errors}
            
            user = {
                id: generateUserId(),
                email: registrationData.email.toLowerCase(),
                username: registrationData.username,
                registrationMethod: registrationData.method,
                registeredAt: getCurrentTimestamp(),
                onboardingProgress: initializeOnboardingProgress(),
                profile: initializeUserProfile(),
                settings: getDefaultSettings()
            }
            
            // TEST: Should support multiple registration methods
            SWITCH registrationData.method:
                CASE "EMAIL_PASSWORD":
                    user.hashedPassword = hashPassword(registrationData.password)
                    user.emailVerified = FALSE
                    sendVerificationEmail(user.email)
                CASE "SOCIAL_OAUTH":
                    user.oauthProvider = registrationData.provider
                    user.oauthId = registrationData.oauthId
                    user.emailVerified = registrationData.emailVerified
                CASE "PHONE_NUMBER":
                    user.phoneNumber = registrationData.phoneNumber
                    user.phoneVerified = FALSE
                    sendVerificationSMS(user.phoneNumber)
            
            // TEST: Should enforce unique constraints
            IF userExists(user.email) OR userExists(user.username):
                RETURN {
                    success: FALSE,
                    error: "User already exists"
                }
            
            // Save user
            saveUser(user)
            
            // Initialize user data structures
            initializeUserDataStructures(user.id)
            
            // Start onboarding
            startOnboarding(user.id)
            
            RETURN {
                success: TRUE,
                userId: user.id,
                nextStep: "AVATAR_CREATION"
            }
        
        // TEST: Should validate all registration fields
        FUNCTION validateRegistrationData(data):
            errors = []
            
            // Email validation
            IF data.email:
                IF NOT isValidEmail(data.email):
                    errors.ADD("Invalid email format")
                IF isDisposableEmail(data.email):
                    errors.ADD("Disposable emails not allowed")
            
            // Username validation
            IF data.username:
                IF length(data.username) < 3 OR length(data.username) > 20:
                    errors.ADD("Username must be 3-20 characters")
                IF NOT matches(data.username, "^[a-zA-Z0-9_]+$"):
                    errors.ADD("Username can only contain letters, numbers, and underscores")
                IF isProfane(data.username):
                    errors.ADD("Username contains inappropriate content")
            
            // Password validation (if applicable)
            IF data.password:
                strength = calculatePasswordStrength(data.password)
                IF strength < 0.6:
                    errors.ADD("Password is too weak")
                IF containsPersonalInfo(data.password, data):
                    errors.ADD("Password contains personal information")
            
            RETURN {
                valid: errors.length == 0,
                errors: errors
            }
    
    // TEST: Should guide through avatar creation
    CLASS AvatarOnboarding:
        FUNCTION startAvatarCreation(userId):
            session = {
                userId: userId,
                sessionId: generateSessionId(),
                startedAt: getCurrentTimestamp(),
                avatarData: initializeAvatarData(),
                completed: FALSE
            }
            
            // Provide guided experience
            guidance = {
                currentStep: 1,
                totalSteps: 5,
                steps: [
                    {
                        name: "BASE_SELECTION",
                        description: "Choose your avatar's base appearance",
                        options: getBaseAvatarOptions()
                    },
                    {
                        name: "CUSTOMIZATION",
                        description: "Customize features",
                        options: getCustomizationOptions()
                    },
                    {
                        name: "PERSONALITY",
                        description: "Select personality traits",
                        options: getPersonalityOptions()
                    },
                    {
                        name: "VOICE_STYLE",
                        description: "Choose communication style",
                        options: getVoiceOptions()
                    },
                    {
                        name: "REVIEW",
                        description: "Review and confirm",
                        summary: NULL
                    }
                ]
            }
            
            RETURN {
                session: session,
                guidance: guidance
            }
        
        // TEST: Should save completed avatar
        FUNCTION completeAvatarCreation(sessionId, finalData):
            session = loadSession(sessionId)
            
            avatar = {
                userId: session.userId,
                ...finalData,
                createdAt: getCurrentTimestamp()
            }
            
            // Validate avatar data
            IF NOT validateAvatarData(avatar):
                RETURN {success: FALSE, error: "Invalid avatar data"}
            
            // Save avatar
            saveAvatar(avatar)
            
            // Update onboarding progress
            updateOnboardingProgress(session.userId, "AVATAR_CREATION", TRUE)
            
            // Trigger avatar welcome message
            sendAvatarWelcome(session.userId, avatar)
            
            RETURN {
                success: TRUE,
                nextStep: "CONSENT_MANAGEMENT"
            }
    
    // TEST: Should handle progressive consent collection
    CLASS ConsentOnboarding:
        FUNCTION presentConsentFlow(userId):
            flow = {
                userId: userId,
                steps: [
                    {
                        type: "ESSENTIAL",
                        title: "Essential Services",
                        description: "Required for app functionality",
                        required: TRUE,
                        preSelected: TRUE
                    },
                    {
                        type: "BEHAVIORAL_ANALYSIS",
                        title: "Behavioral Analysis",
                        description: "Helps us personalize your experience",
                        required: FALSE,
                        preSelected: FALSE,
                        benefits: ["Better habit recommendations", "Personalized insights"]
                    },
                    {
                        type: "DATA_SHARING",
                        title: "Anonymous Data Sharing",
                        description: "Contribute to research and earn rewards",
                        required: FALSE,
                        preSelected: FALSE,
                        tiers: ["BRONZE", "SILVER", "GOLD"],
                        estimatedEarnings: calculateEstimatedEarnings(userId)
                    }
                ]
            }
            
            RETURN flow
        
        // TEST: Should process consent decisions
        FUNCTION processConsentDecisions(userId, decisions):
            consentRecord = {
                userId: userId,
                timestamp: getCurrentTimestamp(),
                consents: {},
                ipAddress: hashIPAddress(getClientIP()),
                userAgent: getUserAgent()
            }
            
            FOR EACH decision IN decisions:
                consentRecord.consents[decision.type] = {
                    granted: decision.granted,
                    tier: decision.tier || NULL,
                    timestamp: getCurrentTimestamp()
                }
                
                // Apply consent-specific actions
                IF decision.type == "DATA_SHARING" AND decision.granted:
                    enableDataSharing(userId, decision.tier)
            
            // Save consent record
            saveConsentRecord(consentRecord)
            
            // Update onboarding
            updateOnboardingProgress(userId, "CONSENT_MANAGEMENT", TRUE)
            
            RETURN {
                success: TRUE,
                nextStep: "HABIT_ASSIGNMENT"
            }

// ============================================
// DATA PIPELINE MODULE
// ============================================

MODULE DataPipeline:
    // TEST: Should collect data from multiple sources
    CLASS DataCollectionOrchestrator:
        FUNCTION orchestrateDataCollection(userId):
            user = loadUserProfile(userId)
            consent = loadUserConsent(userId)
            
            collectors = []
            
            // Initialize collectors based on consent
            IF consent.BEHAVIORAL_ANALYSIS:
                collectors.ADD(PhoneDataCollector(userId))
                collectors.ADD(AppUsageCollector(userId))
            
            IF consent.BIOMETRIC_DATA:
                collectors.ADD(BiometricCollector(userId))
            
            IF consent.LOCATION_TRACKING:
                collectors.ADD(LocationCollector(userId))
            
            // Run collectors in parallel
            collectionTasks = []
            FOR EACH collector IN collectors:
                task = runAsync(collector.collect())
                collectionTasks.ADD(task)
            
            // Wait for all collections to complete
            results = awaitAll(collectionTasks)
            
            // Aggregate results
            aggregatedData = {
                userId: userId,
                timestamp: getCurrentTimestamp(),
                sources: {},
                quality: assessDataQuality(results)
            }
            
            FOR EACH result IN results:
                IF result.success:
                    aggregatedData.sources[result.source] = result.data
            
            // TEST: Data quality should meet minimum threshold
            ASSERT aggregatedData.quality.score >= 0.6
            
            // Process through pipeline
            processedData = runDataPipeline(aggregatedData)
            
            RETURN processedData
        
        // TEST: Should handle real-time data streams
        FUNCTION initializeRealtimeStreams(userId):
            streams = {
                phone: NULL,
                wearable: NULL,
                location: NULL
            }
            
            // Phone data stream
            IF hasPhonePermissions(userId):
                streams.phone = createStream({
                    source: "PHONE",
                    userId: userId,
                    interval: 300, // 5 minutes
                    processor: processPhoneData,
                    errorHandler: handlePhoneStreamError
                })
            
            // Wearable data stream
            wearables = getUserWearables(userId)
            IF wearables.length > 0:
                streams.wearable = createStream({
                    source: "WEARABLE",
                    userId: userId,
                    devices: wearables,
                    interval: 60, // 1 minute for health data
                    processor: processWearableData,
                    errorHandler: handleWearableStreamError
                })
            
            // Start streams
            FOR EACH streamType, stream IN streams:
                IF stream != NULL:
                    stream.start()
                    
                    // Set up monitoring
                    monitorStream(stream)
            
            RETURN streams
    
    // TEST: Should process data efficiently
    CLASS DataProcessor:
        FUNCTION processDataBatch(batch):
            processed = {
                batchId: batch.id,
                startTime: getCurrentTimestamp(),
                items: [],
                metrics: {}
            }
            
            // Validate batch
            validation = validateBatch(batch)
            IF NOT validation.valid:
                RETURN {success: FALSE, error: validation.error}
            
            // Process each item
            FOR EACH item IN batch.items:
                TRY:
                    // Clean data
                    cleaned = cleanData(item)
                    
                    // Transform data
                    transformed = transformData(cleaned)
                    
                    // Enrich data
                    enriched = enrichData(transformed)
                    
                    // Validate output
                    IF validateProcessedData(enriched):
                        processed.items.ADD(enriched)
                    ELSE:
                        logDataQualityIssue(item)
                
                CATCH error:
                    handleProcessingError(item, error)
            
            // Calculate metrics
            processed.metrics = {
                totalItems: batch.items.length,
                processedItems: processed.items.length,
                successRate: processed.items.length / batch.items.length,
                processingTime: getCurrentTimestamp() - processed.startTime
            }
            
            // TEST: Success rate should be high
            ASSERT processed.metrics.successRate >= 0.95
            
            RETURN processed
        
        // TEST: Should maintain data quality
        FUNCTION cleanData(rawData):
            cleaned = COPY(rawData)
            
            // Remove null values
            cleaned = removeNullValues(cleaned)
            
            // Standardize formats
            cleaned = standardizeFormats(cleaned)
            
            // Remove duplicates
            cleaned = removeDuplicates(cleaned)
            
            // Handle outliers
            outliers = detectOutliers(cleaned)
            FOR EACH outlier IN outliers:
                cleaned = handleOutlier(cleaned, outlier)
            
            // Validate cleaned data
            quality = assessDataQuality(cleaned)
            
            // TEST: Cleaned data should have high quality
            ASSERT quality.completeness >= 0.9
            ASSERT quality.consistency >= 0.95
            
            RETURN cleaned

// ============================================
// API GATEWAY MODULE
// ============================================

MODULE APIGateway:
    // TEST: Should handle API requests efficiently
    CLASS RequestHandler:
        FUNCTION handleRequest(request):
            // Rate limiting
            IF NOT checkRateLimit(request.clientId):
                RETURN {
                    status: 429,
                    error: "Rate limit exceeded"
                }
            
            // Authentication
            auth = authenticateRequest(request)
            IF NOT auth.valid:
                RETURN {
                    status: 401,
                    error: "Authentication failed"
                }
            
            // Authorization
            IF NOT authorizeRequest(auth.user, request.endpoint):
                RETURN {
                    status: 403,
                    error: "Forbidden"
                }
            
            // Validate request
            validation = validateRequest(request)
            IF NOT validation.valid:
                RETURN {
                    status: 400,
                    error: "Invalid request",
                    details: validation.errors
                }
            
            // Route request
            response = routeRequest(request, auth.user)
            
            // Audit logging
            logAPIRequest(request, response, auth.user)
            
            RETURN response
        
        // TEST: Should implement proper rate limiting
        FUNCTION checkRateLimit(clientId):
            limits = {
                authenticated: {
                    requests: 1000,
                    window: 3600 // 1 hour
                },
                anonymous: {
                    requests: 100,
                    window: 3600
                }
            }
            
            isAuthenticated = clientId != NULL
            limit = isAuthenticated ? limits.authenticated : limits.anonymous
            
            // Get current usage
            usage = getRateLimitUsage(clientId, limit.window)
            
            IF usage >= limit.requests:
                // Check for burst allowance
                burstAllowance = calculateBurstAllowance(clientId)
                IF usage >= limit.requests + burstAllowance:
                    RETURN FALSE
            
            // Increment usage
            incrementRateLimitUsage(clientId)
            
            RETURN TRUE
    
    // TEST: Should provide RESTful endpoints
    CLASS APIEndpoints:
        ENDPOINTS = {
            // User endpoints
            "/api/v1/users": {
                GET: getUserProfile,
                PUT: updateUserProfile,
                DELETE: deleteUser
            },
            "/api/v1/users/habits": {
                GET: getUserHabits,
                POST: updateHabitProgress
            },
            "/api/v1/users/avatar": {
                GET: getAvatar,
                PUT: updateAvatar
            },
            
            // Social endpoints
            "/api/v1/friends": {
                GET: getFriends,
                POST: addFriend,
                DELETE: removeFriend
            },
            "/api/v1/challenges": {
                GET: getChallenges,
                POST: createChallenge,
                PUT: updateChallenge
            },
            
            // Data endpoints
            "/api/v1/analytics": {
                GET: getAnalytics
            },
            "/api/v1/consent": {
                GET: getConsent,
                PUT: updateConsent
            }
        }
        
        FUNCTION routeRequest(request, user):
            endpoint = ENDPOINTS[request.path]
            
            IF endpoint == NULL:
                RETURN {status: 404, error: "Not found"}
            
            method = endpoint[request.method]
            
            IF method == NULL:
                RETURN {status: 405, error: "Method not allowed"}
            
            // Execute endpoint handler
            TRY:
                result = method(request.params, user)
                RETURN {
                    status: 200,
                    data: result
                }
            CATCH error:
                logError(error)
                RETURN {
                    status: 500,
                    error: "Internal server error"
                }

// ============================================
// SYSTEM MONITORING MODULE
// ============================================

MODULE SystemMonitoring:
    // TEST: Should monitor system health
    CLASS HealthMonitor:
        HEALTH_CHECKS = {
            DATABASE: {
                check: checkDatabaseHealth,
                critical: TRUE,
                threshold: 0.95
            },
            API: {
                check: checkAPIHealth,
                critical: TRUE,
                threshold: 0.99
            },
            CACHE: {
                check: checkCacheHealth,
                critical: FALSE,
                threshold: 0.90
            },
            QUEUE: {
                check: checkQueueHealth,
                critical: TRUE,
                threshold: 0.95
            },
            STORAGE: {
                check: checkStorageHealth,
                critical: TRUE,
                threshold: 0.80
            }
        }
        
        FUNCTION performHealthCheck():
            health = {
                timestamp: getCurrentTimestamp(),
                overall: "HEALTHY",
                components: {},
                alerts: []
            }
            
            FOR EACH component, config IN HEALTH_CHECKS:
                result = config.check()
                
                health.components[component] = {
                    status: result.status,
                    score: result.score,
                    latency: result.latency,
                    details: result.details
                }
                
                // Check thresholds
                IF result.score < config.threshold:
                    alert = {
                        component: component,
                        severity: config.critical ? "CRITICAL" : "WARNING",
                        score: result.score,
                        threshold: config.threshold
                    }
                    
                    health.alerts.ADD(alert)
                    
                    IF config.critical:
                        health.overall = "UNHEALTHY"
            
            // TEST: Critical components must be healthy
            FOR EACH component, config IN HEALTH_CHECKS:
                IF config.critical:
                    ASSERT health.components[component].score >= config.threshold
            
            // Send alerts if needed
            IF health.alerts.length > 0:
                sendHealthAlerts(health.alerts)
            
            RETURN health
    
    // TEST: Should track performance metrics
    CLASS PerformanceTracker:
        FUNCTION trackAPIPerformance(endpoint, duration, success):
            metric = {
                endpoint: endpoint,
                timestamp: getCurrentTimestamp(),
                duration: duration,
                success: success,
                percentile: calculatePercentile(endpoint, duration)
            }
            
            // Store metric
            storePerformanceMetric(metric)
            
            // Check SLA compliance
            sla = getSLAForEndpoint(endpoint)
            IF duration > sla.maxDuration:
                logSLAViolation(endpoint, duration, sla)
            
            // Update running statistics
            updateEndpointStatistics(endpoint, metric)
            
            // TEST: 95th percentile should be within SLA
            p95 = getPercentile(endpoint, 95)
            ASSERT p95 <= sla.p95Target
            
            RETURN metric
        
        FUNCTION generatePerformanceReport(period):
            report = {
                period: period,
                generatedAt: getCurrentTimestamp(),
                summary: {},
                endpoints: {},
                recommendations: []
            }
            
            // Aggregate metrics
            metrics = loadMetricsForPeriod(period)
            
            // Calculate summary statistics
            report.summary = {
                totalRequests: metrics.length,
                successRate: calculateSuccessRate(metrics),
                averageLatency: calculateAverageLatency(metrics),
                p50Latency: calculatePercentile(metrics, 50),
                p95Latency: calculatePercentile(metrics, 95),
                p99Latency: calculatePercentile(metrics, 99)
            }
            
            // Per-endpoint analysis
            endpointGroups = groupByEndpoint(metrics)
            FOR EACH endpoint, endpointMetrics IN endpointGroups:
                report.endpoints[endpoint] = analyzeEndpointPerformance(endpointMetrics)
            
            // Generate recommendations
            report.recommendations = generatePerformanceRecommendations(report)
            
            RETURN report

// ============================================
// ERROR HANDLING & RECOVERY MODULE
// ============================================

MODULE ErrorHandlingRecovery:
    // TEST: Should handle errors gracefully
    CLASS ErrorHandler:
        ERROR_CATEGORIES = {
            VALIDATION: {
                retryable: FALSE,
                userFacing: TRUE,
                logLevel: "INFO"
            },
            NETWORK: {
                retryable: TRUE,
                userFacing: FALSE,
                logLevel: "WARNING"
            },
            DATABASE: {
                retryable: TRUE,
                userFacing: FALSE,
                logLevel: "ERROR"
            },
            AUTHENTICATION: {
                retryable: FALSE,
                userFacing: TRUE,
                logLevel: "WARNING"
            },
            SYSTEM: {
                retryable: FALSE,
                userFacing: FALSE,
                logLevel: "CRITICAL"
            }
        }
        
        FUNCTION handleError(error, context):
            // Categorize error
            category = categorizeError(error)
            config = ERROR_CATEGORIES[category]
            
            // Log error
            logError(error, config.logLevel, context)
            
            // Attempt recovery
            IF config.retryable:
                recovery = attemptRecovery(error, context)
                IF recovery.success:
                    RETURN recovery.result
            
            // Generate user-friendly message
            userMessage = config.userFacing ? 
                generateUserMessage(error) : 
                "An error occurred. Please try again later."
            
            // Create error response
            response = {
                error: TRUE,
                message: userMessage,
                errorId: generateErrorId(),
                timestamp: getCurrentTimestamp()
            }
            
            // Track error metrics
            trackErrorMetrics(error, category)
            
            // Alert if critical
            IF config.logLevel == "CRITICAL":
                sendCriticalAlert(error, context)
            
            RETURN response
        
        // TEST: Should implement exponential backoff
        FUNCTION attemptRecovery(error, context, attempt = 1):
            MAX_ATTEMPTS = 3
            BASE_DELAY = 1000 // milliseconds
            
            IF attempt > MAX_ATTEMPTS:
                RETURN {success: FALSE}
            
            // Calculate backoff delay
            delay = BASE_DELAY * POW(2, attempt - 1)
            wait(delay)
            
            TRY:
                // Retry operation
                result = retryOperation(context)
                RETURN {
                    success: TRUE,
                    result: result,
                    attempts: attempt
                }
            CATCH retryError:
                // Log retry failure
                logRetryFailure(retryError, attempt)
                
                // Recursive retry
                RETURN attemptRecovery(retryError, context, attempt + 1)