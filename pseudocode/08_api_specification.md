# API Specification Pseudocode
## Module: External Integrations and API Contracts

```pseudocode
// ============================================
// EXTERNAL API INTEGRATIONS MODULE
// ============================================

MODULE ExternalAPIIntegrations:
    // Configuration
    API_VERSIONS = ["v1", "v2"]
    RATE_LIMITS = {
        FREE: {requests: 100, window: 3600},
        PREMIUM: {requests: 1000, window: 3600},
        ENTERPRISE: {requests: 10000, window: 3600}
    }
    
    // TEST: Should integrate with social media platforms
    CLASS SocialMediaIntegration:
        PLATFORMS = {
            TIKTOK: {
                endpoint: {{TIKTOK_API_ENDPOINT}},
                version: "v2",
                auth: "OAUTH2",
                scopes: ["user.info", "video.upload", "analytics.read"]
            },
            TWITTER: {
                endpoint: {{TWITTER_API_ENDPOINT}},
                version: "v2",
                auth: "OAUTH2",
                scopes: ["tweet.read", "tweet.write", "users.read"]
            },
            INSTAGRAM: {
                endpoint: {{INSTAGRAM_API_ENDPOINT}},
                version: "v1",
                auth: "OAUTH2",
                scopes: ["basic", "publish_content", "insights"]
            },
            FACEBOOK: {
                endpoint: {{FACEBOOK_API_ENDPOINT}},
                version: "v15.0",
                auth: "OAUTH2",
                scopes: ["public_profile", "publish_actions", "user_insights"]
            },
            REDDIT: {
                endpoint: {{REDDIT_API_ENDPOINT}},
                version: "v1",
                auth: "OAUTH2",
                scopes: ["identity", "submit", "read"]
            },
            YOUTUBE: {
                endpoint: {{YOUTUBE_API_ENDPOINT}},
                version: "v3",
                auth: "OAUTH2",
                scopes: ["youtube.upload", "youtube.readonly"]
            }
        }
        
        FUNCTION authenticatePlatform(platform, userId):
            config = PLATFORMS[platform]
            
            authRequest = {
                clientId: getClientId(platform),
                redirectUri: generateRedirectUri(userId, platform),
                scopes: config.scopes,
                state: generateSecureState(userId)
            }
            
            // TEST: Should handle OAuth flow securely
            authUrl = buildOAuthUrl(config.endpoint, authRequest)
            
            // Store state for validation
            storeOAuthState(userId, authRequest.state, platform)
            
            RETURN {
                authUrl: authUrl,
                expiresIn: 300 // 5 minutes
            }
        
        // TEST: Should post content to platform
        FUNCTION postToPlatform(platform, userId, content):
            credentials = loadUserPlatformCredentials(userId, platform)
            
            IF NOT credentials OR isTokenExpired(credentials):
                credentials = refreshToken(credentials)
            
            // Format content for platform
            platformContent = formatContentForPlatform(content, platform)
            
            // Platform-specific posting
            SWITCH platform:
                CASE "TIKTOK":
                    result = postToTikTok(credentials, platformContent)
                CASE "TWITTER":
                    result = postToTwitter(credentials, platformContent)
                CASE "INSTAGRAM":
                    result = postToInstagram(credentials, platformContent)
                CASE "FACEBOOK":
                    result = postToFacebook(credentials, platformContent)
                CASE "REDDIT":
                    result = postToReddit(credentials, platformContent)
                CASE "YOUTUBE":
                    result = postToYouTube(credentials, platformContent)
            
            // Track metrics
            trackSocialPost(userId, platform, result)
            
            RETURN result
    
    // TEST: Should integrate with wearable devices
    CLASS WearableIntegration:
        DEVICES = {
            APPLE_WATCH: {
                framework: "HealthKit",
                dataTypes: ["heartRate", "steps", "sleep", "workouts", "hrv"],
                syncInterval: 300 // 5 minutes
            },
            FITBIT: {
                endpoint: {{FITBIT_API_ENDPOINT}},
                auth: "OAUTH2",
                dataTypes: ["activities", "heart", "sleep", "nutrition"],
                syncInterval: 900 // 15 minutes
            },
            OURA: {
                endpoint: {{OURA_API_ENDPOINT}},
                auth: "API_KEY",
                dataTypes: ["readiness", "sleep", "activity", "heart_rate"],
                syncInterval: 3600 // 1 hour
            },
            GARMIN: {
                endpoint: {{GARMIN_API_ENDPOINT}},
                auth: "OAUTH2",
                dataTypes: ["activities", "wellness", "sleep", "stress"],
                syncInterval: 600 // 10 minutes
            }
        }
        
        FUNCTION syncWearableData(device, userId, credentials):
            config = DEVICES[device]
            lastSync = getLastSyncTime(userId, device)
            
            // Determine data range
            startTime = lastSync || getCurrentTimestamp() - 86400 // 24 hours
            endTime = getCurrentTimestamp()
            
            syncData = {
                userId: userId,
                device: device,
                startTime: startTime,
                endTime: endTime,
                data: {}
            }
            
            // Fetch data for each type
            FOR EACH dataType IN config.dataTypes:
                TRY:
                    data = fetchWearableData(device, credentials, dataType, startTime, endTime)
                    syncData.data[dataType] = processWearableData(data, dataType)
                CATCH error:
                    logWearableError(device, dataType, error)
                    CONTINUE
            
            // Store synced data
            storeWearableData(syncData)
            updateLastSyncTime(userId, device, endTime)
            
            // TEST: Should handle missing data gracefully
            ASSERT syncData.data != EMPTY
            
            RETURN syncData
    
    // TEST: Should integrate with LLM providers
    CLASS LLMIntegration:
        PROVIDERS = {
            OPENAI: {
                endpoint: {{OPENAI_API_ENDPOINT}},
                models: ["gpt-4", "gpt-4-turbo", "gpt-4o"],
                maxTokens: 4096,
                rateLimit: 10000 // per minute
            },
            ANTHROPIC: {
                endpoint: {{ANTHROPIC_API_ENDPOINT}},
                models: ["claude-3-opus", "claude-3-sonnet", "claude-3-haiku"],
                maxTokens: 100000,
                rateLimit: 1000 // per minute
            },
            GOOGLE: {
                endpoint: {{GOOGLE_AI_ENDPOINT}},
                models: ["gemini-pro", "gemini-pro-vision"],
                maxTokens: 30720,
                rateLimit: 60 // per minute
            }
        }
        
        FUNCTION callLLM(provider, model, messages, context):
            config = PROVIDERS[provider]
            
            // Check rate limit
            IF NOT checkLLMRateLimit(provider):
                RETURN {error: "Rate limit exceeded", retry: 60}
            
            request = {
                model: model,
                messages: formatMessages(messages, provider),
                maxTokens: MIN(context.maxTokens, config.maxTokens),
                temperature: context.temperature || 0.7,
                systemPrompt: generateSystemPrompt(context)
            }
            
            // Add provider-specific parameters
            SWITCH provider:
                CASE "OPENAI":
                    request.functions = context.functions
                    request.functionCall = context.functionCall
                CASE "ANTHROPIC":
                    request.system = request.systemPrompt
                    DELETE request.systemPrompt
                CASE "GOOGLE":
                    request.generationConfig = {
                        temperature: request.temperature,
                        maxOutputTokens: request.maxTokens
                    }
            
            // Make API call with retry logic
            response = callWithRetry(
                () => makeAPICall(config.endpoint, request),
                maxRetries = 3,
                backoffMultiplier = 2
            )
            
            // Process response
            processedResponse = {
                provider: provider,
                model: model,
                content: extractContent(response, provider),
                usage: extractUsage(response, provider),
                functionCalls: extractFunctionCalls(response, provider)
            }
            
            // Track usage for billing
            trackLLMUsage(provider, model, processedResponse.usage)
            
            RETURN processedResponse

// ============================================
// PUBLIC API SPECIFICATION MODULE
// ============================================

MODULE PublicAPISpecification:
    // TEST: Should provide RESTful API endpoints
    CLASS RestAPIEndpoints:
        BASE_URL = "https://api.vibestack.com"
        
        ENDPOINTS = {
            // Authentication endpoints
            "/auth/register": {
                method: "POST",
                auth: "NONE",
                body: {
                    email: "string",
                    password: "string",
                    username: "string"
                },
                response: {
                    userId: "string",
                    token: "string",
                    refreshToken: "string"
                }
            },
            "/auth/login": {
                method: "POST",
                auth: "NONE",
                body: {
                    email: "string",
                    password: "string"
                },
                response: {
                    userId: "string",
                    token: "string",
                    refreshToken: "string"
                }
            },
            
            // User endpoints
            "/users/me": {
                method: "GET",
                auth: "BEARER",
                response: {
                    id: "string",
                    email: "string",
                    username: "string",
                    profile: "object",
                    avatar: "object",
                    habits: "array"
                }
            },
            "/users/me/habits": {
                method: "GET",
                auth: "BEARER",
                response: {
                    currentHabit: "object",
                    progress: "object",
                    history: "array"
                }
            },
            "/users/me/habits/progress": {
                method: "POST",
                auth: "BEARER",
                body: {
                    habitId: "string",
                    completed: "boolean",
                    notes: "string"
                },
                response: {
                    success: "boolean",
                    streak: "number",
                    points: "number"
                }
            },
            
            // Avatar endpoints
            "/avatar": {
                method: "GET",
                auth: "BEARER",
                response: {
                    id: "string",
                    visual: "object",
                    personality: "object",
                    voice: "object"
                }
            },
            "/avatar/conversation": {
                method: "POST",
                auth: "BEARER",
                body: {
                    message: "string",
                    context: "object"
                },
                response: {
                    reply: "string",
                    suggestions: "array",
                    mood: "string"
                }
            },
            
            // Social endpoints
            "/social/friends": {
                method: "GET",
                auth: "BEARER",
                response: {
                    friends: "array",
                    pending: "array",
                    suggested: "array"
                }
            },
            "/social/challenges": {
                method: "GET",
                auth: "BEARER",
                query: {
                    status: "active|completed|pending",
                    type: "1v1|group"
                },
                response: {
                    challenges: "array",
                    invitations: "array"
                }
            },
            "/social/challenges/create": {
                method: "POST",
                auth: "BEARER",
                body: {
                    name: "string",
                    description: "string",
                    habitId: "string",
                    type: "1v1|group",
                    duration: "number",
                    participants: "array"
                },
                response: {
                    challengeId: "string",
                    status: "string"
                }
            },
            
            // Analytics endpoints
            "/analytics/personal": {
                method: "GET",
                auth: "BEARER",
                query: {
                    timeframe: "day|week|month|year",
                    metrics: "array"
                },
                response: {
                    habitCompletion: "object",
                    streaks: "object",
                    trends: "array",
                    insights: "array"
                }
            },
            
            // Data consent endpoints
            "/consent": {
                method: "GET",
                auth: "BEARER",
                response: {
                    currentTier: "string",
                    consentedTypes: "array",
                    earnings: "object"
                }
            },
            "/consent/update": {
                method: "PUT",
                auth: "BEARER",
                body: {
                    tier: "bronze|silver|gold",
                    dataTypes: "array"
                },
                response: {
                    success: "boolean",
                    updatedConsent: "object"
                }
            }
        }
        
        FUNCTION validateAPIRequest(request, endpoint):
            schema = ENDPOINTS[endpoint]
            
            // Validate method
            IF request.method != schema.method:
                RETURN {valid: FALSE, error: "Invalid method"}
            
            // Validate authentication
            IF schema.auth != "NONE":
                authResult = validateAuthentication(request, schema.auth)
                IF NOT authResult.valid:
                    RETURN authResult
            
            // Validate body schema
            IF schema.body:
                bodyValidation = validateRequestBody(request.body, schema.body)
                IF NOT bodyValidation.valid:
                    RETURN bodyValidation
            
            // Validate query parameters
            IF schema.query:
                queryValidation = validateQueryParams(request.query, schema.query)
                IF NOT queryValidation.valid:
                    RETURN queryValidation
            
            RETURN {valid: TRUE}
    
    // TEST: Should provide WebSocket API for real-time features
    CLASS WebSocketAPI:
        EVENTS = {
            // Client -> Server events
            "habit.update": {
                auth: REQUIRED,
                data: {
                    habitId: "string",
                    status: "completed|skipped",
                    timestamp: "number"
                }
            },
            "avatar.message": {
                auth: REQUIRED,
                data: {
                    message: "string",
                    conversationId: "string"
                }
            },
            "challenge.action": {
                auth: REQUIRED,
                data: {
                    challengeId: "string",
                    action: "join|leave|complete"
                }
            },
            
            // Server -> Client events
            "notification.habit": {
                data: {
                    type: "reminder|encouragement|milestone",
                    message: "string",
                    avatarMood: "string"
                }
            },
            "challenge.update": {
                data: {
                    challengeId: "string",
                    rankings: "array",
                    updates: "array"
                }
            },
            "friend.activity": {
                data: {
                    friendId: "string",
                    activity: "string",
                    timestamp: "number"
                }
            },
            "sync.complete": {
                data: {
                    device: "string",
                    dataTypes: "array",
                    timestamp: "number"
                }
            }
        }
        
        FUNCTION handleWebSocketConnection(socket, userId):
            connection = {
                socketId: socket.id,
                userId: userId,
                subscribedChannels: [],
                lastActivity: getCurrentTimestamp()
            }
            
            // Authenticate connection
            IF NOT authenticateWebSocket(socket, userId):
                socket.close(1008, "Authentication failed")
                RETURN
            
            // Subscribe to user channels
            subscribeToUserChannels(connection, userId)
            
            // Set up event handlers
            FOR EACH event, config IN EVENTS:
                IF event.startsWith("client."):
                    socket.on(event, (data) => handleClientEvent(event, data, connection))
            
            // Set up heartbeat
            heartbeatInterval = setInterval(() => {
                IF getCurrentTimestamp() - connection.lastActivity > 60000:
                    socket.close(1001, "Idle timeout")
                ELSE:
                    socket.ping()
            }, 30000)
            
            // Handle disconnect
            socket.on("close", () => {
                clearInterval(heartbeatInterval)
                unsubscribeFromChannels(connection)
                removeConnection(connection)
            })

// ============================================
// WEBHOOK INTEGRATION MODULE
// ============================================

MODULE WebhookIntegration:
    // TEST: Should support webhook subscriptions
    CLASS WebhookManager:
        WEBHOOK_EVENTS = [
            "user.registered",
            "habit.completed",
            "streak.milestone",
            "challenge.completed",
            "achievement.unlocked",
            "consent.updated",
            "data.shared"
        ]
        
        FUNCTION subscribeWebhook(subscription):
            // Validate webhook URL
            IF NOT isValidUrl(subscription.url):
                RETURN {success: FALSE, error: "Invalid URL"}
            
            // Validate events
            FOR EACH event IN subscription.events:
                IF event NOT IN WEBHOOK_EVENTS:
                    RETURN {success: FALSE, error: "Invalid event: " + event}
            
            // Generate webhook secret
            secret = generateWebhookSecret()
            
            webhook = {
                id: generateWebhookId(),
                url: subscription.url,
                events: subscription.events,
                secret: secret,
                userId: subscription.userId,
                createdAt: getCurrentTimestamp(),
                active: TRUE,
                retryPolicy: {
                    maxAttempts: 3,
                    backoffMultiplier: 2,
                    timeout: 5000
                }
            }
            
            // Verify endpoint with test webhook
            testResult = sendTestWebhook(webhook)
            IF NOT testResult.success:
                RETURN {
                    success: FALSE,
                    error: "Endpoint verification failed"
                }
            
            // Save webhook
            saveWebhook(webhook)
            
            RETURN {
                success: TRUE,
                webhookId: webhook.id,
                secret: secret
            }
        
        // TEST: Should deliver webhooks reliably
        FUNCTION deliverWebhook(event, data):
            webhooks = getActiveWebhooksForEvent(event)
            
            FOR EACH webhook IN webhooks:
                payload = {
                    id: generateEventId(),
                    event: event,
                    data: data,
                    timestamp: getCurrentTimestamp()
                }
                
                // Sign payload
                signature = signWebhookPayload(payload, webhook.secret)
                
                headers = {
                    "X-VibeStack-Signature": signature,
                    "X-VibeStack-Event": event,
                    "X-VibeStack-Delivery": payload.id
                }
                
                // Attempt delivery with retry
                deliveryAttempt = {
                    webhookId: webhook.id,
                    eventId: payload.id,
                    attempt: 0,
                    success: FALSE
                }
                
                WHILE deliveryAttempt.attempt < webhook.retryPolicy.maxAttempts:
                    deliveryAttempt.attempt += 1
                    
                    TRY:
                        response = httpPost(
                            webhook.url,
                            payload,
                            headers,
                            webhook.retryPolicy.timeout
                        )
                        
                        IF response.status >= 200 AND response.status < 300:
                            deliveryAttempt.success = TRUE
                            BREAK
                    CATCH error:
                        logWebhookError(webhook.id, error)
                    
                    // Exponential backoff
                    IF deliveryAttempt.attempt < webhook.retryPolicy.maxAttempts:
                        delay = 1000 * POW(webhook.retryPolicy.backoffMultiplier, deliveryAttempt.attempt - 1)
                        wait(delay)
                
                // Record delivery result
                recordWebhookDelivery(deliveryAttempt)
                
                // Disable webhook after repeated failures
                IF NOT deliveryAttempt.success:
                    incrementWebhookFailures(webhook.id)
                    IF getWebhookFailureCount(webhook.id) > 10:
                        disableWebhook(webhook.id)

// ============================================
// API DOCUMENTATION MODULE
// ============================================

MODULE APIDocumentation:
    // TEST: Should generate OpenAPI specification
    CLASS OpenAPIGenerator:
        FUNCTION generateOpenAPISpec():
            spec = {
                openapi: "3.0.0",
                info: {
                    title: "VibeStack API",
                    version: "1.0.0",
                    description: "API for VibeStack habit tracking platform",
                    contact: {
                        name: "VibeStack Support",
                        email: "support@vibestack.com"
                    }
                },
                servers: [
                    {
                        url: "https://api.vibestack.com/v1",
                        description: "Production server"
                    },
                    {
                        url: "https://staging-api.vibestack.com/v1",
                        description: "Staging server"
                    }
                ],
                security: [
                    {bearerAuth: []}
                ],
                paths: generateAPIPaths(),
                components: {
                    schemas: generateSchemas(),
                    securitySchemes: {
                        bearerAuth: {
                            type: "http",
                            scheme: "bearer",
                            bearerFormat: "JWT"
                        }
                    }
                }
            }
            
            RETURN spec
        
        FUNCTION generateAPIPaths():
            paths = {}
            
            FOR EACH endpoint, config IN RestAPIEndpoints.ENDPOINTS:
                path = {
                    [config.method.toLowerCase()]: {
                        summary: generateSummary(endpoint),
                        operationId: generateOperationId(endpoint),
                        tags: generateTags(endpoint),
                        security: config.auth != "NONE" ? [{bearerAuth: []}] : [],
                        parameters: generateParameters(config),
                        requestBody: config.body ? {
                            required: TRUE,
                            content: {
                                "application/json": {
                                    schema: generateSchema(config.body)
                                }
                            }
                        } : UNDEFINED,
                        responses: {
                            "200": {
                                description: "Successful response",
                                content: {
                                    "application/json": {
                                        schema: generateSchema(config.response)
                                    }
                                }
                            },
                            "400": {
                                description: "Bad request"
                            },
                            "401": {
                                description: "Unauthorized"
                            },
                            "500": {
                                description: "Internal server error"
                            }
                        }
                    }
                }
                
                paths[endpoint] = path
            
            RETURN paths

// ============================================
// SDK GENERATION MODULE
// ============================================

MODULE SDKGeneration:
    // TEST: Should generate client SDKs
    CLASS SDKGenerator:
        SUPPORTED_LANGUAGES = ["typescript", "python", "java", "swift", "kotlin"]
        
        FUNCTION generateSDK(language):
            spec = generateOpenAPISpec()
            
            sdk = {
                language: language,
                version: "1.0.0",
                files: []
            }
            
            SWITCH language:
                CASE "typescript":
                    sdk.files = generateTypeScriptSDK(spec)
                CASE "python":
                    sdk.files = generatePythonSDK(spec)
                CASE "java":
                    sdk.files = generateJavaSDK(spec)
                CASE "swift":
                    sdk.files = generateSwiftSDK(spec)
                CASE "kotlin":
                    sdk.files = generateKotlinSDK(spec)
            
            // Add common files
            sdk.files.ADD(generateReadme(language))
            sdk.files.ADD(generateExamples(language))
            sdk.files.ADD(generateTests(language))
            
            RETURN sdk
        
        FUNCTION generateTypeScriptSDK(spec):
            files = []
            
            // Generate types
            types = {
                filename: "types.ts",
                content: generateTypeScriptTypes(spec.components.schemas)
            }
            files.ADD(types)
            
            // Generate API client
            client = {
                filename: "client.ts",
                content: generateTypeScriptClient(spec.paths)
            }
            files.ADD(client)
            
            // Generate utilities
            utils = {
                filename: "utils.ts",
                content: generateTypeScriptUtils()
            }
            files.ADD(utils)
            
            // Generate package.json
            packageJson = {
                filename: "package.json",
                content: {
                    name: "@vibestack/sdk",
                    version: "1.0.0",
                    main: "dist/index.js",
                    types: "dist/index.d.ts",
                    dependencies: {
                        "axios": "^1.0.0",
                        "ws": "^8.0.0"
                    }
                }
            }
            files.ADD(packageJson)
            
            RETURN files

// ============================================
// API VERSIONING MODULE
// ============================================

MODULE APIVersioning:
    // TEST: Should handle API version migration
    CLASS VersionManager:
        VERSIONS = {
            "v1": {
                released: "2024-01-01",
                deprecated: NULL,
                sunset: NULL,
                changes: []
            },
            "v2": {
                released: "2024-07-01",
                deprecated: NULL,
                sunset: NULL,
                changes: [
                    {
                        type: "BREAKING",
                        description: "Changed habit.id from number to string"
                    },
                    {
                        type: "ADDITION",
                        description: "Added avatar personality modes"
                    },
                    {
                        type: "DEPRECATION",
                        description: "Deprecated /users/habits in favor of /users/me/habits"
                    }
                ]
            }
        }
        
        FUNCTION handleVersionedRequest(request):
            // Extract version from URL or header
            version = extractVersion(request)
            
            IF NOT version:
                version = getDefaultVersion()
            
            IF version NOT IN VERSIONS:
                RETURN {
                    status: 404,
                    error: "API version not found"
                }
            
            versionInfo = VERSIONS[version]
            
            // Check if version is deprecated
            IF versionInfo.deprecated:
                response.headers["X-API-Deprecated"] = "true"
                response.headers["X-API-Sunset"] = versionInfo.sunset
            
            // Apply version-specific transformations
            transformedRequest = applyVersionTransformations(request, version)
            
            // Route to version-specific handler
            result = routeToVersionHandler(transformedRequest, version)
            
            // Transform response for version compatibility
            transformedResponse = transformResponseForVersion(result, version)
            
            RETURN transformedResponse
        
        FUNCTION migrateToNewVersion(fromVersion, toVersion):
            migration = {
                from: fromVersion,
                to: toVersion,
                steps: []
            }
            
            // Generate migration steps
            changes = getChangesBetweenVersions(fromVersion, toVersion)
            
            FOR EACH change IN changes:
                IF change.type == "BREAKING":
                    step = {
                        type: "TRANSFORM",
                        description: change.description,
                        transformer: generateTransformer(change)
                    }
                    migration.steps.ADD(step)
                ELSE IF change.type == "DEPRECATION":
                    step = {
                        type: "WARNING",
                        description: change.description,
                        alternative: change.alternative
                    }
                    migration.steps.ADD(step)
            
            RETURN migration