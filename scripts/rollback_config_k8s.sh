#!/bin/bash

# scripts/rollback_config_k8s.sh
# Description: Placeholder script for Kubernetes ConfigMap rollback.
# This script assumes a versioning strategy for ConfigMaps (e.g., configmap-name-v1, configmap-name-v2)
# and that the application deployment is updated to point to the desired ConfigMap version.

# Usage: ./scripts/rollback_config_k8s.sh <deployment-name> <configmap-base-name> <target-version-tag> [namespace]
# Example: ./scripts/rollback_config_k8s.sh vibestack-app-deployment vibestack-config v1 my-namespace

DEPLOYMENT_NAME=$1
CONFIGMAP_BASE_NAME=$2
TARGET_VERSION_TAG=$3 # e.g., "v1", "previous-stable"
NAMESPACE=$4

if [ -z "$DEPLOYMENT_NAME" ] || [ -z "$CONFIGMAP_BASE_NAME" ] || [ -z "$TARGET_VERSION_TAG" ]; then
  echo "Error: Deployment name, ConfigMap base name, and target version tag are required."
  echo "Usage: $0 <deployment-name> <configmap-base-name> <target-version-tag> [namespace]"
  exit 1
fi

KUBECTL_CMD="kubectl"
TARGET_CONFIGMAP_NAME="${CONFIGMAP_BASE_NAME}-${TARGET_VERSION_TAG}"

if [ -n "$NAMESPACE" ]; then
  KUBECTL_CMD="kubectl -n $NAMESPACE"
  echo "Operating in namespace: $NAMESPACE"
else
  echo "Operating in default namespace (or namespace from current context)."
fi

echo "Attempting to roll back configuration for deployment: $DEPLOYMENT_NAME"
echo "Target ConfigMap: $TARGET_CONFIGMAP_NAME"

# --- Pre-Rollback Checks ---
# 1. Verify the target ConfigMap version exists
echo "Verifying target ConfigMap '$TARGET_CONFIGMAP_NAME' exists..."
$KUBECTL_CMD get configmap "$TARGET_CONFIGMAP_NAME" > /dev/null 2>&1
if [ $? -ne 0 ]; then
  echo "Error: Target ConfigMap '$TARGET_CONFIGMAP_NAME' not found. Aborting rollback."
  exit 1
fi
echo "Target ConfigMap '$TARGET_CONFIGMAP_NAME' found."

# --- Update Deployment to Use Target ConfigMap ---
# This step is highly dependent on how your deployment references ConfigMaps.
# Option 1: If ConfigMap name is directly in the deployment spec (e.g., envFrom or volumeMounts)
#   You might need to patch the deployment to point to the TARGET_CONFIGMAP_NAME.
#   This requires knowing the structure of your deployment manifest.

echo "Patching deployment '$DEPLOYMENT_NAME' to use ConfigMap '$TARGET_CONFIGMAP_NAME'..."
# Example: Patching an environment variable sourced from a ConfigMap
# This is a SIMPLIFIED example. You'd need to identify the correct container and env var.
# $KUBECTL_CMD patch deployment "$DEPLOYMENT_NAME" \
#   -p "{\"spec\":{\"template\":{\"spec\":{\"containers\":[{\"name\":\"vibestack-app-container\",\"envFrom\":[{\"configMapRef\":{\"name\":\"${TARGET_CONFIGMAP_NAME}\"}}]}]}}}}"
#
# Example: Patching a volume mount for a ConfigMap
# $KUBECTL_CMD patch deployment "$DEPLOYMENT_NAME" \
#   -p "{\"spec\":{\"template\":{\"spec\":{\"volumes\":[{\"name\":\"config-volume\",\"configMap\":{\"name\":\"${TARGET_CONFIGMAP_NAME}\"}}]}}}}"

echo "INFO: The method to update the deployment to use '$TARGET_CONFIGMAP_NAME' is highly specific."
echo "INFO: This script currently does NOT automatically patch the deployment."
echo "INFO: You would typically:"
echo "      1. Have versioned ConfigMap manifests (e.g., vibestack-config-v1.yaml, vibestack-config-v2.yaml)."
echo "      2. Apply the desired ConfigMap version: kubectl apply -f vibestack-config-${TARGET_VERSION_TAG}.yaml"
echo "      3. Update your deployment manifest to reference this specific ConfigMap version."
echo "      4. Re-apply the deployment: kubectl apply -f kubernetes/deployment.yaml (after updating it)."
echo "      Alternatively, if using a GitOps tool like ArgoCD or Flux, you would commit the change to the deployment manifest."

# For a true automated rollback, the deployment manifest itself should be versioned,
# or the CI/CD system should be able to re-deploy a previous known-good state
# which includes the correct ConfigMap reference.

# As a simpler placeholder, we can trigger a rollout restart if the deployment
# is already configured to pick up changes from a ConfigMap with a fixed name
# and that ConfigMap was updated externally to the rollback version.
# However, the prompt implies rolling back the *mechanism*, so we assume versioned ConfigMaps.

# If your deployment is set up to automatically pick up changes from a ConfigMap
# (e.g., via a volume mount that gets updated, or tools like Reloader),
# you might just need to ensure the correct ConfigMap version is active.

# For now, this script will simulate the action by noting what needs to be done.
echo "Simulating deployment update to use $TARGET_CONFIGMAP_NAME."
echo "To complete, manually update deployment '$DEPLOYMENT_NAME' to reference '$TARGET_CONFIGMAP_NAME' and re-apply, or use GitOps."

# After the deployment is updated (manually or via GitOps), monitor its rollout.
echo "Assuming deployment $DEPLOYMENT_NAME is updated to use $TARGET_CONFIGMAP_NAME."
echo "Monitoring rollout status for $DEPLOYMENT_NAME (if it were automatically updated)..."
# $KUBECTL_CMD rollout status deployment/"$DEPLOYMENT_NAME" --timeout=2m
# if [ $? -eq 0 ]; then
#   echo "Configuration rollback for $DEPLOYMENT_NAME (by pointing to $TARGET_CONFIGMAP_NAME) likely successful."
# else
#   echo "Error: Deployment $DEPLOYMENT_NAME did not stabilize after pointing to $TARGET_CONFIGMAP_NAME."
#   exit 1
# fi

echo "Configuration rollback script finished."
exit 0