# Supabase Edge Functions

This directory contains the Edge Functions for the VibeStack application.

## Functions Overview

### 1. habit-checkin
Handles daily habit check-ins with streak calculation.

**Endpoint**: `/habit-checkin`
**Method**: POST
**Request Body**:
```json
{
  "habitId": "string",
  "completed": boolean,
  "notes": "string (optional)",
  "mood": number (optional),
  "energy": number (optional)
}
```

### 2. generate-content
Generates social media content for achievements, habits, and challenges.

**Endpoint**: `/generate-content`
**Method**: POST
**Request Body**:
```json
{
  "achievementId": "string (optional)",
  "habitId": "string (optional)",
  "challengeId": "string (optional)",
  "contentType": "twitter" | "instagram" | "facebook" | "linkedin",
  "tone": "motivational" | "celebratory" | "reflective" | "challenging" (optional),
  "includeStats": boolean (optional)
}
```

### 3. challenge-operations
Handles challenge creation, joining, leaving, updating, and daily progress.

**Endpoint**: `/challenge-operations`
**Method**: POST
**Request Body**:
```json
{
  "operation": "create" | "join" | "leave" | "update" | "complete_day",
  "challengeData": { ... }, // For create operation
  "challengeId": "string", // For join, leave, update, complete_day
  "updateData": { ... }, // For update operation
  "dayCompleted": boolean, // For complete_day operation
  "progressData": { ... } // Optional for complete_day
}
```

## Deployment

To deploy these functions:

```bash
# Deploy all functions
supabase functions deploy

# Deploy individual function
supabase functions deploy habit-checkin
supabase functions deploy generate-content
supabase functions deploy challenge-operations
```

## Environment Variables

All functions require the following environment variables:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Your Supabase anonymous key

## Authentication

All functions require a valid JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Error Handling

All functions return consistent error responses:
```json
{
  "success": false,
  "error": "Error message"
}
```

## Testing

You can test these functions locally using:
```bash
supabase functions serve
```

Then make requests to `http://localhost:54321/functions/v1/<function-name>`