#!/bin/bash

# scripts/validate_env.sh
# Description: Validates essential environment variables for production.
# This script should be sourced with the .env file or have variables passed to it.
# Example: source .env && ./scripts/validate_env.sh
# Or in a CI/CD pipeline: ./scripts/validate_env.sh

echo "Starting environment validation..."

# Flag to track validation status
VALIDATION_PASSED=true

# 1. Check NODE_ENV
if [ -z "$NODE_ENV" ]; then
  echo "Error: NODE_ENV is not set."
  VALIDATION_PASSED=false
elif [ "$NODE_ENV" != "production" ]; then
  echo "Error: NODE_ENV is set to '$NODE_ENV'. It must be 'production'."
  VALIDATION_PASSED=false
else
  echo "NODE_ENV: OK ('$NODE_ENV')"
fi

# 2. Check JWT_SECRET
if [ -z "$JWT_SECRET" ]; then
  echo "Error: JWT_SECRET is not set."
  VALIDATION_PASSED=false
elif [[ "$JWT_SECRET" == *"{{"*"}}"* ]]; then # Check if it still contains a placeholder pattern
  echo "Error: JWT_SECRET appears to be a placeholder: '$JWT_SECRET'. It must be a real secret."
  VALIDATION_PASSED=false
else
  # Basic length check, can be made more sophisticated
  if [ ${#JWT_SECRET} -lt 32 ]; then
    echo "Warning: JWT_SECRET is set but is shorter than 32 characters. Consider using a stronger secret."
    # Depending on policy, this could be an error: VALIDATION_PASSED=false
  else
    echo "JWT_SECRET: OK (set and not a placeholder)"
  fi
fi

# 3. Check RATE_LIMIT_WINDOW_MS
if [ -z "$RATE_LIMIT_WINDOW_MS" ]; then
  echo "Error: RATE_LIMIT_WINDOW_MS is not set."
  VALIDATION_PASSED=false
elif ! [[ "$RATE_LIMIT_WINDOW_MS" =~ ^[0-9]+$ ]]; then # Check if it's a number
  echo "Error: RATE_LIMIT_WINDOW_MS is not a valid number: '$RATE_LIMIT_WINDOW_MS'."
  VALIDATION_PASSED=false
elif [[ "$RATE_LIMIT_WINDOW_MS" == *"{{"*"}}"* ]]; then
   echo "Error: RATE_LIMIT_WINDOW_MS appears to be a placeholder: '$RATE_LIMIT_WINDOW_MS'."
   VALIDATION_PASSED=false
else
  echo "RATE_LIMIT_WINDOW_MS: OK ('$RATE_LIMIT_WINDOW_MS')"
fi

# 4. Check RATE_LIMIT_MAX_REQUESTS
if [ -z "$RATE_LIMIT_MAX_REQUESTS" ]; then
  echo "Error: RATE_LIMIT_MAX_REQUESTS is not set."
  VALIDATION_PASSED=false
elif ! [[ "$RATE_LIMIT_MAX_REQUESTS" =~ ^[0-9]+$ ]]; then # Check if it's a number
  echo "Error: RATE_LIMIT_MAX_REQUESTS is not a valid number: '$RATE_LIMIT_MAX_REQUESTS'."
  VALIDATION_PASSED=false
elif [[ "$RATE_LIMIT_MAX_REQUESTS" == *"{{"*"}}"* ]]; then
   echo "Error: RATE_LIMIT_MAX_REQUESTS appears to be a placeholder: '$RATE_LIMIT_MAX_REQUESTS'."
   VALIDATION_PASSED=false
else
  echo "RATE_LIMIT_MAX_REQUESTS: OK ('$RATE_LIMIT_MAX_REQUESTS')"
fi

echo "-------------------------------------"
if [ "$VALIDATION_PASSED" = true ]; then
  echo "Environment validation successful."
  exit 0
else
  echo "Environment validation FAILED. Please check the errors above."
  exit 1
fi