# Emergency Rollback Procedures

This document outlines the procedures for performing an emergency rollback of the VibeStack application in a Kubernetes environment. These procedures should be followed when automated rollbacks fail or a critical issue necessitates immediate manual intervention.

## 1. Pre-Rollback Checklist & Preparation

*   **Identify the Issue:** Clearly understand the nature of the critical issue and confirm that a rollback is the appropriate immediate action.
*   **Notify Stakeholders:** Inform relevant stakeholders (e.g., SRE team, product owners, support) about the ongoing incident and the decision to roll back.
*   **Gather Information:**
    *   Identify the last known good deployment/version.
    *   Identify the current problematic deployment/version.
    *   Check CI/CD pipeline logs for the failed deployment (if applicable).
    *   Check monitoring dashboards (Prometheus, Grafana) and logs (Fluentd/SIEM) for error patterns and impact.
*   **Access Credentials:** Ensure you have necessary `kubectl` access to the production Kubernetes cluster and any other required systems (e.g., database, secret manager).
*   **Communication Channel:** Establish a clear communication channel for the rollback team (e.g., dedicated Slack channel, war room).

## 2. Application Rollback (Kubernetes Deployment)

This is the most common rollback scenario, reverting the application code to a previous stable version.

*   **Identify Previous Revision:**
    ```bash
    kubectl rollout history deployment/vibestack-app-deployment -n <your-namespace>
    ```
    Note the revision number of the last known good state.

*   **Execute Rollback to Specific Revision:**
    ```bash
    kubectl rollout undo deployment/vibestack-app-deployment --to-revision=<revision-number> -n <your-namespace>
    ```
    Replace `<revision-number>` and `<your-namespace>`.

*   **Monitor Rollback Status:**
    ```bash
    kubectl rollout status deployment/vibestack-app-deployment -n <your-namespace> --watch
    ```
    Wait for the rollout to complete successfully.

*   **Verify Application Health:**
    *   Check pod status: `kubectl get pods -n <your-namespace> -l app=vibestack-app`
    *   Check pod logs: `kubectl logs -f <pod-name> -n <your-namespace>`
    *   Test application endpoints and critical functionalities.
    *   Monitor metrics in Grafana for recovery.

*   **Scripted Rollback (If available and trusted):**
    If the [`scripts/rollback_k8s.sh`](scripts/rollback_k8s.sh) script is tested and reliable for this scenario:
    ```bash
    ./scripts/rollback_k8s.sh vibestack-app-deployment <your-namespace>
    ```

## 3. Configuration Rollback (Kubernetes ConfigMaps/Secrets)

If the issue is suspected to be due to a recent configuration change:

*   **Identify Problematic ConfigMap/Secret:** Determine which ConfigMap or Secret was recently changed.
*   **Identify Previous Version:**
    *   If using versioned ConfigMaps/Secrets (e.g., `my-config-v1`, `my-config-v2`): Identify the name of the last known good version.
    *   If not versioned directly in the name, check Git history for the manifest changes or use `kubectl describe configmap <configmap-name> -n <your-namespace>` for annotations if versioning is done that way.
*   **Apply Previous ConfigMap/Secret Version:**
    *   If manifests are versioned in Git:
        ```bash
        kubectl apply -f path/to/previous/configmap-version.yaml -n <your-namespace>
        ```
    *   If you need to edit live (less ideal, but for emergencies):
        ```bash
        kubectl edit configmap <configmap-name> -n <your-namespace>
        # Carefully revert the changes.
        ```
*   **Restart Affected Pods:** Deployments need to be rolled (restarted) to pick up changes in ConfigMaps or Secrets they mount as environment variables or files.
    ```bash
    kubectl rollout restart deployment/vibestack-app-deployment -n <your-namespace>
    ```
*   **Monitor and Verify:** As per step 2.4.
*   **Scripted Rollback (If available and configured for your versioning strategy):**
    If the [`scripts/rollback_config_k8s.sh`](scripts/rollback_config_k8s.sh) script is applicable:
    ```bash
    ./scripts/rollback_config_k8s.sh vibestack-app-deployment vibestack-config <target-version-tag> <your-namespace>
    ```

## 4. Database Migration Rollback

This is a high-risk operation and should be approached with extreme caution. Data loss can occur.

*   **Assess Necessity:** Confirm that a database schema rollback is absolutely necessary and that the issue isn't resolvable at the application layer.
*   **Backup Database (If not automatically done before migration):**
    **CRITICAL: Perform a full backup of the production database BEFORE attempting any schema rollback.**
    ```bash
    # Command depends on your database type (e.g., pg_dump, mysqldump)
    echo "TODO: Add database-specific backup command here."
    ```
*   **Execute Migration Rollback Script:**
    Use the specific command for your migration tool. Ensure you understand how many steps back it will go.
    If the [`scripts/rollback_db_migration.sh`](scripts/rollback_db_migration.sh) script is configured and tested:
    ```bash
    # Example: Roll back the very last migration
    ./scripts/rollback_db_migration.sh 1
    ```
    Ensure environment variables for the script are correctly set or passed.
*   **Verify Database State:**
    *   Check migration status using your migration tool.
    *   Manually inspect critical tables or schema changes if possible.
*   **Verify Application Health:** Thoroughly test application functionality that interacts with the affected database tables.

## 5. Post-Rollback Actions

*   **Stabilize the Environment:** Ensure the application is stable and functioning as expected.
*   **Communicate Status:** Update stakeholders on the rollback outcome.
*   **Disable Problematic Feature/Code (If applicable):** If the rollback was to mitigate a specific feature, consider using feature flags to disable it if possible, allowing a roll-forward later.
*   **Root Cause Analysis (RCA):** Once the immediate crisis is over, conduct a thorough RCA to understand why the failure occurred and how to prevent it in the future.
*   **Update Documentation:** Update this document and any related runbooks based on lessons learned.

## Escalation Points

*   **Primary On-Call DevOps/SRE:** [Name/Team Contact]
*   **Secondary On-Call DevOps/SRE:** [Name/Team Contact]
*   **Engineering Lead:** [Name/Contact]

**Note:** Always prefer automated rollback mechanisms integrated into the CI/CD pipeline. These manual procedures are a last resort. Ensure these scripts and procedures are regularly reviewed and tested in a non-production environment.