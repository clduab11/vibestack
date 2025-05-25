#!/bin/bash

# scripts/rollback_k8s.sh
# Description: Placeholder script for automating Kubernetes deployment rollbacks.
# This script demonstrates a basic rollback to the previous deployment revision.

# Usage: ./scripts/rollback_k8s.sh <deployment-name> [namespace]
# Example: ./scripts/rollback_k8s.sh vibestack-app-deployment my-namespace

DEPLOYMENT_NAME=$1
NAMESPACE=$2

if [ -z "$DEPLOYMENT_NAME" ]; then
  echo "Error: Deployment name is required."
  echo "Usage: $0 <deployment-name> [namespace]"
  exit 1
fi

KUBECTL_CMD="kubectl"

if [ -n "$NAMESPACE" ]; then
  KUBECTL_CMD="kubectl -n $NAMESPACE"
  echo "Operating in namespace: $NAMESPACE"
else
  echo "Operating in default namespace (or namespace from current context)."
fi

echo "Attempting to roll back deployment: $DEPLOYMENT_NAME..."

# Check current rollout status
echo "Current rollout status for $DEPLOYMENT_NAME:"
$KUBECTL_CMD rollout status deployment/"$DEPLOYMENT_NAME" --timeout=30s || {
  echo "Warning: Could not get current rollout status for $DEPLOYMENT_NAME. Proceeding with rollback attempt."
}

# Perform the rollback
echo "Executing rollback for $DEPLOYMENT_NAME..."
$KUBECTL_CMD rollout undo deployment/"$DEPLOYMENT_NAME"
ROLLBACK_STATUS=$?

if [ $ROLLBACK_STATUS -eq 0 ]; then
  echo "Rollback command for $DEPLOYMENT_NAME initiated successfully."
  echo "Monitoring new rollout status (after rollback)..."
  # Wait for the rollback to complete and check status
  sleep 5 # Give it a moment to start
  $KUBECTL_CMD rollout status deployment/"$DEPLOYMENT_NAME" --timeout=2m
  FINAL_STATUS=$?
  if [ $FINAL_STATUS -eq 0 ]; then
    echo "Rollback of $DEPLOYMENT_NAME completed successfully."
    # Additional verification steps could be added here
    # e.g., checking pod versions, application health endpoint
  else
    echo "Error: Rollback of $DEPLOYMENT_NAME may not have completed successfully. Check deployment status manually."
    exit 1
  fi
else
  echo "Error: Failed to initiate rollback for $DEPLOYMENT_NAME. Exit code: $ROLLBACK_STATUS"
  echo "Check 'kubectl rollout history deployment/$DEPLOYMENT_NAME' for more details."
  exit 1
fi

echo "Rollback script finished."
exit 0