# [FEATURE] Implement Real AI/LLM Integration - Replace Simulated Responses with OpenAI & Anthropic

## 🎯 Issue Overview

**Priority:** 🔴 HIGH
**Type:** Feature / Enhancement
**Component:** AI Integration / Edge Functions
**Milestone:** Core Functionality
**Depends On:** Issue #1 (Backend Blockers)
**Estimated Copilot Sessions:** 8-10

### Problem Statement
The VibeStack AI avatar features currently use **simulated/mock responses** instead of real Large Language Model (LLM) API calls. All 6 Supabase Edge Functions return hardcoded responses, preventing actual intelligent conversations, personalized habit recommendations, and behavioral analysis.

### Current State
```typescript
// supabase/functions/avatar-chat/index.ts - Example of simulated response:
const simulatedResponse = {
  response: "Hey there! I'm Mentor Malik...", // ❌ HARDCODED
  personality: personality,
  timestamp: new Date().toISOString()
};
// No actual LLM API calls made
```

### Desired State
- ✅ Real OpenAI GPT-4 integration
- ✅ Real Anthropic Claude integration
- ✅ Dynamic, contextual AI responses
- ✅ Personality-driven conversation
- ✅ Cost tracking and monitoring
- ✅ Rate limiting and safety

### Impact
- 🎯 Enables core product differentiator (AI avatars)
- 🎯 Unlocks personalized habit recommendations
- 🎯 Enables behavioral pattern analysis
- 🎯 Required for production launch
- 🎯 Significantly improves user experience

---

## 🎓 Copilot Instructions

### Prerequisites
- ✅ Issue #1 (Backend Blockers) must be completed first
- ✅ OpenAI API account and API key
- ✅ Anthropic API account and API key
- ✅ Supabase CLI installed
- ✅ Understanding of prompt engineering

### Context Setup for Copilot
```bash
# Open these files for Copilot context:
code supabase/functions/avatar-chat/index.ts
code supabase/functions/analyze-behavior/index.ts
code supabase/functions/assign-habit/index.ts
code supabase/functions/generate-content/index.ts
code docs/PHASE_5_AI_INTEGRATION_COMPLETE.md
code vibestack-api/src/types/index.ts
```

### Copilot-Friendly Branch Name
```bash
git checkout -b feature/real-ai-llm-integration
```

---

## 📋 Task Breakdown

### Phase 1: Setup AI SDK Dependencies

**Copilot Prompt (for package.json updates):**
```typescript
// GitHub Copilot: Add AI SDK dependencies to project
//
// Add these npm packages:
// 1. OpenAI SDK: openai@^4.20.0
// 2. Anthropic SDK: @anthropic-ai/sdk@^0.9.0
// 3. Token counting: tiktoken@^1.0.0
// 4. Rate limiting: bottleneck@^2.19.5
//
// Update both:
// - vibestack-api/package.json (for backend utilities)
// - supabase/functions/package.json (for edge functions - create if doesn't exist)
//
// @copilot-add-dependencies
```

**Action Items:**
- [ ] Add OpenAI SDK to dependencies
- [ ] Add Anthropic SDK to dependencies
- [ ] Add tiktoken for token counting
- [ ] Add bottleneck for rate limiting
- [ ] Run `npm install` in both directories
- [ ] Verify installations successful

---

### Phase 2: Create AI Configuration & Utilities

#### File 1: AI Client Configuration
**File:** `vibestack-api/src/config/aiClients.ts` (NEW FILE)

**Copilot Prompt:**
```typescript
// GitHub Copilot: Create AI client configuration for OpenAI and Anthropic
//
// File: vibestack-api/src/config/aiClients.ts
//
// Requirements:
// 1. Import OpenAI from 'openai'
// 2. Import Anthropic from '@anthropic-ai/sdk'
// 3. Create and export configured OpenAI client:
//    - API key from process.env.OPENAI_API_KEY
//    - Organization from process.env.OPENAI_ORG_ID (optional)
//    - Default model: 'gpt-4-turbo-preview'
//    - Timeout: 30000ms
//    - Max retries: 3
// 4. Create and export configured Anthropic client:
//    - API key from process.env.ANTHROPIC_API_KEY
//    - Default model: 'claude-3-sonnet-20240229'
//    - Timeout: 30000ms
//    - Max retries: 3
// 5. Create type definitions:
//    - LLMProvider: 'openai' | 'anthropic'
//    - LLMModel: string
//    - LLMConfig interface with provider, model, temperature, maxTokens
// 6. Create utility function: getClientForProvider(provider: LLMProvider)
// 7. Add error handling for missing API keys
// 8. Export constants for default models and parameters
// 9. Add JSDoc comments explaining usage
//
// This will be used by Edge Functions and backend services

// @copilot-start
```

**Acceptance Criteria:**
- [ ] OpenAI client configured and exported
- [ ] Anthropic client configured and exported
- [ ] Type definitions for LLM operations
- [ ] Helper function to get client by provider
- [ ] Environment variable validation
- [ ] Error handling for missing keys
- [ ] JSDoc documentation
- [ ] No TypeScript errors

---

#### File 2: Token Counter Utility
**File:** `vibestack-api/src/utils/tokenCounter.ts` (NEW FILE)

**Copilot Prompt:**
```typescript
// GitHub Copilot: Create token counting utility for AI operations
//
// File: vibestack-api/src/utils/tokenCounter.ts
//
// Requirements:
// 1. Import tiktoken
// 2. Create function: countTokens(text: string, model: string): number
// 3. Support these models:
//    - gpt-4, gpt-4-turbo-preview (cl100k_base encoding)
//    - gpt-3.5-turbo (cl100k_base encoding)
//    - claude-3-* (approximate, use cl100k_base)
// 4. Cache encoding instances (don't recreate each time)
// 5. Create function: estimateCost(tokens: number, model: string): number
//    - GPT-4 Turbo: $0.01 per 1K input tokens, $0.03 per 1K output tokens
//    - GPT-3.5 Turbo: $0.0005 per 1K input tokens, $0.0015 per 1K output tokens
//    - Claude 3 Sonnet: $0.003 per 1K input tokens, $0.015 per 1K output tokens
// 6. Create function: truncateToTokenLimit(text: string, limit: number, model: string): string
//    - Truncates text to fit within token limit
// 7. Export all functions with proper TypeScript types
// 8. Add comprehensive JSDoc comments
//
// This helps monitor costs and prevent token limit errors

// @copilot-start
```

**Acceptance Criteria:**
- [ ] Token counting function implemented
- [ ] Support for all target models
- [ ] Cost estimation function
- [ ] Text truncation function
- [ ] Encoding caching for performance
- [ ] Accurate token counts (test against known examples)
- [ ] JSDoc documentation
- [ ] No TypeScript errors

---

#### File 3: Rate Limiter Utility
**File:** `vibestack-api/src/utils/rateLimiter.ts` (NEW FILE)

**Copilot Prompt:**
```typescript
// GitHub Copilot: Create rate limiter for AI API calls
//
// File: vibestack-api/src/utils/rateLimiter.ts
//
// Requirements:
// 1. Import Bottleneck from 'bottleneck'
// 2. Create rate limiters for each provider:
//    - OpenAI: 3,500 requests/minute, 90,000 tokens/minute
//    - Anthropic: 4,000 requests/minute, 400,000 tokens/minute
// 3. Create wrapper function: rateLimitedLLMCall<T>(
//      provider: LLMProvider,
//      fn: () => Promise<T>,
//      estimatedTokens: number
//    ): Promise<T>
// 4. Track token usage per minute
// 5. Add logging when rate limit is approached (80%+ usage)
// 6. Queue requests when limit reached
// 7. Add error handling for rate limit errors from APIs
// 8. Implement exponential backoff for retries
// 9. Export rate limiter instances and wrapper function
// 10. Add JSDoc with usage examples
//
// This prevents hitting API rate limits

// @copilot-start
```

**Acceptance Criteria:**
- [ ] Bottleneck rate limiters configured
- [ ] Separate limiters for OpenAI and Anthropic
- [ ] Token-based rate limiting
- [ ] Request queuing
- [ ] Logging for high usage
- [ ] Retry logic with exponential backoff
- [ ] JSDoc documentation
- [ ] No TypeScript errors

---

### Phase 3: Update Edge Functions with Real AI

#### Edge Function 1: Avatar Chat
**File:** `supabase/functions/avatar-chat/index.ts` (MODIFY EXISTING)

**Current Issue:**
```typescript
// Lines 75-79: Simulated response
const simulatedResponse = {
  response: "Hey there! I'm Mentor Malik...",
  personality: personality,
  timestamp: new Date().toISOString()
};
// Need to replace with real LLM API call
```

**Copilot Prompt:**
```typescript
// GitHub Copilot: Replace simulated AI responses with real OpenAI/Anthropic calls
//
// File: supabase/functions/avatar-chat/index.ts
//
// Current state: Lines 75-79 have simulated responses
//
// Requirements:
// 1. Import AI clients from shared config (adapt for Deno/Supabase)
// 2. Remove all simulated response logic
// 3. Implement real LLM calls based on personality:
//    - mentor_malik: Use GPT-4 (motivational, encouraging tone)
//    - sage_sofia: Use Claude 3 Sonnet (mindful, calm tone)
//    - coach_carlos: Use GPT-4 (energetic, fitness-focused tone)
//    - buddy_bailey: Use GPT-3.5 Turbo (friendly, casual tone)
//
// 4. Create system prompts for each personality:
//    Example for Mentor Malik:
//    "You are Mentor Malik, a supportive and motivational habit coach.
//    Your role is to encourage users, celebrate their progress, and
//    help them overcome challenges with wisdom and empathy. Keep
//    responses concise (2-3 sentences), actionable, and uplifting.
//    Reference the user's specific habits and progress when relevant."
//
// 5. Build conversation context:
//    - Include last 5 messages from conversation history
//    - Include user's current habits and progress
//    - Include time of day and day of week (for contextual relevance)
//
// 6. API call structure:
//    For OpenAI:
//    ```
//    const response = await openai.chat.completions.create({
//      model: 'gpt-4-turbo-preview',
//      messages: [
//        { role: 'system', content: systemPrompt },
//        ...conversationHistory,
//        { role: 'user', content: userMessage }
//      ],
//      temperature: 0.8, // Creative but consistent
//      max_tokens: 150, // Keep responses concise
//      presence_penalty: 0.6, // Encourage variety
//      frequency_penalty: 0.3
//    });
//    ```
//
//    For Anthropic:
//    ```
//    const response = await anthropic.messages.create({
//      model: 'claude-3-sonnet-20240229',
//      max_tokens: 150,
//      system: systemPrompt,
//      messages: [
//        ...conversationHistory,
//        { role: 'user', content: userMessage }
//      ],
//      temperature: 0.8
//    });
//    ```
//
// 7. Add token counting before API call
// 8. Add cost tracking (log to database)
// 9. Implement rate limiting
// 10. Add error handling:
//     - Rate limit errors → queue and retry
//     - Timeout errors → return friendly error message
//     - Invalid API key → log error, return generic error
//     - Content policy violations → log and sanitize
//
// 11. Add content moderation:
//     - Use OpenAI moderation API for user messages
//     - Reject inappropriate content
//     - Log violations
//
// 12. Store conversation in database:
//     - Save user message
//     - Save AI response
//     - Save metadata (tokens used, cost, model, latency)
//
// 13. Return response in same format:
//     {
//       response: string,
//       personality: string,
//       timestamp: string,
//       metadata: {
//         model: string,
//         tokensUsed: number,
//         cost: number
//       }
//     }
//
// 14. Add comprehensive error logging
// 15. Add performance monitoring (track latency)
//
// Reference existing structure but replace simulated logic

// @copilot-replace-simulated
```

**Acceptance Criteria:**
- [ ] All simulated responses removed
- [ ] Real OpenAI integration for 2 personalities
- [ ] Real Anthropic integration for 2 personalities
- [ ] System prompts created for each personality
- [ ] Conversation context management (last 5 messages)
- [ ] Token counting implemented
- [ ] Cost tracking implemented
- [ ] Rate limiting applied
- [ ] Error handling comprehensive
- [ ] Content moderation active
- [ ] Conversation stored in database
- [ ] Response format maintained
- [ ] Performance monitoring added
- [ ] Function deploys successfully
- [ ] Returns real, contextual AI responses

---

#### Edge Function 2: Analyze Behavior
**File:** `supabase/functions/analyze-behavior/index.ts` (MODIFY EXISTING)

**Copilot Prompt:**
```typescript
// GitHub Copilot: Implement real behavioral analysis using GPT-4
//
// File: supabase/functions/analyze-behavior/index.ts
//
// Current state: Uses simulated behavior analysis
//
// Requirements:
// 1. Remove simulated analysis logic
// 2. Fetch user's habit data (last 30 days):
//    - Habit completion rates
//    - Streak data
//    - Time patterns (morning vs evening)
//    - Difficulty ratings
//    - User-reported challenges
//
// 3. Create analysis prompt for GPT-4:
//    "You are an expert behavioral analyst specializing in habit formation.
//    Analyze the following habit data and provide insights.
//
//    User Data:
//    {JSON of habit data}
//
//    Provide analysis in this JSON structure:
//    {
//      patterns: [
//        { pattern: string, confidence: number, explanation: string }
//      ],
//      insights: [
//        { insight: string, actionable: boolean, priority: 'high' | 'medium' | 'low' }
//      ],
//      recommendations: [
//        { recommendation: string, expected_impact: string, difficulty: number }
//      ],
//      risk_factors: [
//        { factor: string, severity: number, mitigation: string }
//      ]
//    }
//
//    Be specific, data-driven, and actionable."
//
// 4. Make GPT-4 API call with:
//    - Model: gpt-4-turbo-preview
//    - Temperature: 0.3 (more deterministic for analysis)
//    - Response format: JSON mode
//    - Max tokens: 1000
//
// 5. Parse and validate JSON response
// 6. Store analysis results in database
// 7. Add confidence scores to insights
// 8. Track analysis quality (user feedback)
// 9. Implement caching (analysis valid for 24 hours)
// 10. Add error handling and fallbacks
// 11. Log tokens and costs
// 12. Return structured analysis

// @copilot-implement-analysis
```

**Acceptance Criteria:**
- [ ] Real GPT-4 integration
- [ ] Fetches actual user habit data
- [ ] Comprehensive analysis prompt
- [ ] JSON mode for structured output
- [ ] Response validation
- [ ] Results stored in database
- [ ] Caching implemented (24hr)
- [ ] Error handling
- [ ] Cost tracking
- [ ] Returns actionable insights

---

#### Edge Function 3: Assign Habit
**File:** `supabase/functions/assign-habit/index.ts` (MODIFY EXISTING)

**Copilot Prompt:**
```typescript
// GitHub Copilot: Implement AI-powered habit recommendations
//
// File: supabase/functions/assign-habit/index.ts
//
// Requirements:
// 1. Remove simulated habit assignment
// 2. Fetch user profile:
//    - Current habits
//    - Completed habits
//    - Goals and preferences
//    - Lifestyle data (wake time, work schedule, etc.)
//    - Previous successes and failures
//
// 3. Fetch available habit templates from database
//
// 4. Create recommendation prompt for Claude 3 Sonnet:
//    "You are a habit formation specialist. Recommend the next habit
//    for this user based on their profile and goals.
//
//    User Profile:
//    {JSON of user data}
//
//    Available Habits:
//    {JSON of habit templates}
//
//    Select the most appropriate habit and customize it for this user.
//    Return JSON:
//    {
//      habit_id: string,
//      custom_title: string,
//      custom_description: string,
//      recommended_frequency: number,
//      recommended_time: string,
//      difficulty_rating: number,
//      reasoning: string,
//      success_probability: number,
//      supporting_habits: string[],
//      potential_obstacles: string[],
//      motivation_strategy: string
//    }"
//
// 5. Make Claude API call
// 6. Validate recommendation
// 7. Create habit instance in database
// 8. Log recommendation for tracking success rate
// 9. Return customized habit

// @copilot-implement-recommendations
```

**Acceptance Criteria:**
- [ ] Real Claude integration
- [ ] Fetches user profile data
- [ ] Fetches habit templates
- [ ] Personalized recommendations
- [ ] JSON validation
- [ ] Habit created in database
- [ ] Success tracking
- [ ] Error handling
- [ ] Cost tracking

---

#### Edge Function 4: Generate Content
**File:** `supabase/functions/generate-content/index.ts` (MODIFY EXISTING)

**Copilot Prompt:**
```typescript
// GitHub Copilot: Implement AI content generation for social sharing
//
// File: supabase/functions/generate-content/index.ts
//
// Requirements:
// 1. Remove simulated content generation
// 2. Accept inputs:
//    - content_type: 'social_post' | 'achievement_caption' | 'challenge_invite' | 'progress_update'
//    - context: { habit, streak, milestone, etc. }
//    - tone: 'motivational' | 'casual' | 'proud' | 'humorous'
//
// 3. Create content generation prompts for each type using GPT-3.5 Turbo
//
// 4. Implement content moderation before returning
//
// 5. Add image generation recommendations (suggest which images would pair well)
//
// 6. Generate multiple variations (3) and return best one
//
// 7. Track which generated content gets shared (CTR)
//
// 8. Return formatted content ready for sharing

// @copilot-implement-content-gen
```

**Acceptance Criteria:**
- [ ] Real GPT-3.5 Turbo integration
- [ ] Multiple content types supported
- [ ] Tone customization
- [ ] Content moderation
- [ ] Multiple variations generated
- [ ] Image pairing suggestions
- [ ] Usage tracking
- [ ] Ready-to-share format

---

### Phase 4: Create Cost Tracking System

#### Database Migration
**File:** `supabase/migrations/00004_ai_usage_tracking.sql` (NEW FILE)

**Copilot Prompt:**
```sql
-- GitHub Copilot: Create database tables for AI usage and cost tracking
--
-- File: supabase/migrations/00004_ai_usage_tracking.sql
--
-- Requirements:
-- 1. Create table: ai_api_calls
--    Columns:
--    - id (uuid, primary key)
--    - user_id (uuid, foreign key to auth.users)
--    - function_name (text) - which edge function
--    - provider (text) - 'openai' or 'anthropic'
--    - model (text) - specific model used
--    - input_tokens (integer)
--    - output_tokens (integer)
--    - total_tokens (integer)
--    - estimated_cost (decimal)
--    - latency_ms (integer)
--    - success (boolean)
--    - error_message (text, nullable)
--    - created_at (timestamp with time zone)
--
-- 2. Create indexes:
--    - user_id for user-specific queries
--    - created_at for time-based queries
--    - provider for cost analysis
--    - function_name for function-specific metrics
--
-- 3. Create table: ai_cost_budgets
--    Columns:
--    - id (uuid, primary key)
--    - user_id (uuid, foreign key, unique)
--    - daily_limit_usd (decimal, default 1.00)
--    - monthly_limit_usd (decimal, default 20.00)
--    - current_month_spend (decimal, default 0)
--    - current_day_spend (decimal, default 0)
--    - last_reset_at (timestamp)
--    - created_at, updated_at
--
-- 4. Create RLS policies for both tables
--
-- 5. Create function: check_ai_budget(user_id uuid, estimated_cost decimal) returns boolean
--    - Checks if user is within budget
--    - Updates current spend
--
-- 6. Create view: ai_usage_summary
--    - Aggregates usage by user, provider, function
--    - Shows total costs

-- @copilot-start
```

**Acceptance Criteria:**
- [ ] ai_api_calls table created
- [ ] ai_cost_budgets table created
- [ ] All indexes created
- [ ] RLS policies in place
- [ ] Budget check function implemented
- [ ] Usage summary view created
- [ ] Migration runs successfully
- [ ] Tables accessible from edge functions

---

### Phase 5: Environment Configuration

**File:** `.env.example` (UPDATE - Both root and vibestack-api)

**Add these environment variables:**
```bash
# AI/LLM Configuration
OPENAI_API_KEY=sk-...
OPENAI_ORG_ID=org-... # Optional
ANTHROPIC_API_KEY=sk-ant-...

# AI Model Configuration
DEFAULT_OPENAI_MODEL=gpt-4-turbo-preview
DEFAULT_ANTHROPIC_MODEL=claude-3-sonnet-20240229
DEFAULT_AI_TEMPERATURE=0.8
DEFAULT_MAX_TOKENS=150

# AI Rate Limiting
OPENAI_RPM_LIMIT=3500 # Requests per minute
OPENAI_TPM_LIMIT=90000 # Tokens per minute
ANTHROPIC_RPM_LIMIT=4000
ANTHROPIC_TPM_LIMIT=400000

# AI Cost Controls
ENABLE_AI_BUDGET=true
DEFAULT_DAILY_BUDGET_USD=1.00
DEFAULT_MONTHLY_BUDGET_USD=20.00
COST_ALERT_THRESHOLD=0.80 # Alert at 80% of budget

# AI Safety
ENABLE_CONTENT_MODERATION=true
MAX_CONVERSATION_CONTEXT=5 # Number of messages to include
MAX_CONVERSATION_AGE_HOURS=24
```

**Acceptance Criteria:**
- [ ] All AI environment variables documented
- [ ] Default values provided
- [ ] Comments explain each variable
- [ ] Added to both .env.example files

---

### Phase 6: Testing

#### Test File 1: AI Client Configuration
**File:** `vibestack-api/src/__tests__/config/aiClients.test.ts` (NEW FILE)

**Copilot Prompt:**
```typescript
// GitHub Copilot: Create tests for AI client configuration
//
// Test cases:
// 1. OpenAI client initializes with valid API key
// 2. Anthropic client initializes with valid API key
// 3. Error thrown when API key missing
// 4. getClientForProvider returns correct client
// 5. Default models configured correctly
// 6. Timeout settings applied
// 7. Retry settings applied
//
// Use Vitest with mocks for API clients

// @copilot-start
```

---

#### Test File 2: Token Counter
**File:** `vibestack-api/src/__tests__/utils/tokenCounter.test.ts` (NEW FILE)

**Copilot Prompt:**
```typescript
// GitHub Copilot: Create tests for token counting utility
//
// Test cases:
// 1. Accurately counts tokens for GPT-4
// 2. Accurately counts tokens for Claude
// 3. Cost estimation is correct for each model
// 4. Truncation maintains meaning
// 5. Truncation respects token limits
// 6. Handles empty strings
// 7. Handles very long texts
// 8. Encoding is cached (performance test)
//
// Use known token counts from OpenAI tokenizer tool for validation

// @copilot-start
```

---

#### Test File 3: Edge Function Integration
**File:** `supabase/functions/__tests__/avatar-chat.test.ts` (NEW FILE)

**Copilot Prompt:**
```typescript
// GitHub Copilot: Create integration tests for avatar-chat edge function
//
// Test cases:
// 1. Returns real AI response (not simulated)
// 2. Uses correct model for each personality
// 3. Includes conversation context
// 4. Tracks token usage
// 5. Respects rate limits
// 6. Handles API errors gracefully
// 7. Content moderation blocks inappropriate messages
// 8. Conversation saved to database
// 9. Cost tracked in database
// 10. Response format correct
//
// Mock OpenAI/Anthropic clients for testing
// Use actual database for integration tests

// @copilot-start
```

**Acceptance Criteria:**
- [ ] All critical paths tested
- [ ] Mocks for external APIs
- [ ] Database integration tested
- [ ] Error scenarios covered
- [ ] All tests pass
- [ ] Coverage ≥ 75% for new code

---

## ✅ Overall Acceptance Criteria

### Functionality
- [ ] All 6 edge functions use real LLM APIs
- [ ] No more simulated responses
- [ ] Avatar conversations are contextual and intelligent
- [ ] Behavioral analysis provides real insights
- [ ] Habit recommendations are personalized
- [ ] Content generation works for all types
- [ ] Cost tracking functional
- [ ] Rate limiting prevents API errors
- [ ] Budget controls prevent overspending

### Code Quality
- [ ] All TypeScript errors resolved
- [ ] ESLint passes
- [ ] Code formatted
- [ ] No 'any' types
- [ ] Comprehensive error handling
- [ ] JSDoc on all functions

### Testing
- [ ] All tests pass
- [ ] Coverage ≥ 75% for AI code
- [ ] Integration tests with mocked APIs
- [ ] Edge function tests pass

### Performance
- [ ] Avatar responses < 3 seconds
- [ ] Token counting efficient (< 10ms)
- [ ] Rate limiting doesn't cause delays
- [ ] Caching reduces API calls

### Cost Management
- [ ] Cost tracking accurate within 5%
- [ ] Budget limits enforced
- [ ] Alerts sent at 80% usage
- [ ] User budgets configurable

### Security
- [ ] API keys stored securely
- [ ] Content moderation active
- [ ] No PII sent to LLM providers
- [ ] Error messages don't leak keys
- [ ] RLS policies protect cost data

---

## 🔍 Validation Commands

```bash
# 1. Install AI SDKs
cd vibestack-api
npm install openai @anthropic-ai/sdk tiktoken bottleneck

# 2. Set environment variables
cp .env.example .env
# Edit .env and add real API keys

# 3. Run tests
npm run test -- aiClients
npm run test -- tokenCounter
npm run test:coverage

# 4. Deploy edge functions
cd ../supabase
npx supabase functions deploy avatar-chat
npx supabase functions deploy analyze-behavior
npx supabase functions deploy assign-habit
npx supabase functions deploy generate-content

# 5. Test avatar chat (replace with your values)
curl -X POST https://[project-ref].supabase.co/functions/v1/avatar-chat \
  -H "Authorization: Bearer [anon-key]" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-id",
    "message": "I want to build better habits",
    "personality": "mentor_malik"
  }'

# Expected: Real AI response, not simulated

# 6. Check cost tracking
# Query ai_api_calls table - should have new entries

# 7. Verify token counts
npm run test:tokens

# 8. Check rate limiting
# Make 10 rapid requests - should queue properly

# 9. Test content moderation
# Send inappropriate message - should be blocked

# 10. Monitor costs
# Check ai_cost_budgets table - should track spending
```

---

## 📊 Success Metrics

**Issue is complete when:**
- ✅ All edge functions use real LLM APIs
- ✅ Avatar conversations are intelligent and contextual
- ✅ Behavioral analysis provides actionable insights
- ✅ Habit recommendations are personalized
- ✅ Content generation works for all formats
- ✅ Cost tracking is accurate
- ✅ Budget limits enforced
- ✅ Rate limiting prevents errors
- ✅ Tests pass with ≥75% coverage
- ✅ No simulated responses remain
- ✅ API costs < $5/day for 100 active users

**Expected Timeline:** 8-10 Copilot-assisted development sessions

---

## 🚀 Next Steps After Completion

Once this issue is resolved:
1. ✅ Core AI features fully functional
2. ✅ Can proceed with Issue #3 (Testing)
3. ✅ Ready for beta user testing
4. ✅ Can gather AI quality feedback
5. ✅ Can optimize prompts based on usage data

---

## 📚 Reference Documentation

- OpenAI API Docs: https://platform.openai.com/docs
- Anthropic API Docs: https://docs.anthropic.com
- Tiktoken: https://github.com/openai/tiktoken
- `docs/PHASE_5_AI_INTEGRATION_COMPLETE.md` - AI architecture
- `docs/SPECIFICATION.md` - Feature requirements
- Supabase Edge Functions: https://supabase.com/docs/guides/functions

---

## 🐛 Troubleshooting

### If API calls fail:
1. **Check API keys** - Verify in Supabase dashboard
2. **Check rate limits** - View Bottleneck logs
3. **Check budgets** - Query ai_cost_budgets table
4. **Check quotas** - Verify OpenAI/Anthropic usage limits
5. **Check logs** - Supabase function logs

### If responses are poor quality:
1. **Review prompts** - Test in OpenAI Playground first
2. **Adjust temperature** - Lower for consistency, higher for creativity
3. **Add examples** - Few-shot learning improves quality
4. **Check context** - Ensure relevant user data included
5. **Try different models** - GPT-4 vs Claude for different tasks

### If costs too high:
1. **Reduce max_tokens** - Keep responses concise
2. **Implement better caching** - Don't regenerate same content
3. **Use GPT-3.5** - For simpler tasks
4. **Batch requests** - Analyze multiple items in one call
5. **Lower budgets** - Enforce stricter limits

---

**Issue Labels:** `enhancement`, `high-priority`, `ai-integration`, `backend`, `edge-functions`, `milestone: core functionality`

**Assignees:** (Assign to yourself or team member)

**Projects:** VibeStack Production Readiness

**Milestone:** Core Functionality

**Depends On:** #1 (Backend Blockers)

---

**Created:** 2025-11-16
**Last Updated:** 2025-11-16
