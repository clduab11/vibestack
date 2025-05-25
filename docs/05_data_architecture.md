# VibeStack Data Architecture Requirements
## Version 1.0

---

## 1. Core Data Entities

### 1.1 User Entity

#### DE-1.1.1: User Profile
- **Primary Key:** user_id (UUID)
- **Attributes:**
  - email (encrypted)
  - username (unique)
  - display_name
  - profile_image_url
  - created_at (timestamp)
  - updated_at (timestamp)
  - account_status (active/suspended/deleted)
  - subscription_tier (free/premium/pro/enterprise)
  - data_consent_level (bronze/silver/gold)
  - preferred_language
  - timezone
  - last_active (timestamp)

#### DE-1.1.2: Authentication Data
- **Primary Key:** auth_id (UUID)
- **Foreign Key:** user_id
- **Attributes:**
  - password_hash (bcrypt)
  - salt
  - mfa_enabled (boolean)
  - mfa_secret (encrypted)
  - oauth_providers (array)
  - last_login (timestamp)
  - failed_attempts (counter)
  - locked_until (timestamp)
  - password_history (array, encrypted)

### 1.2 Behavioral Data Entity

#### DE-1.2.1: Phone Usage Data
- **Primary Key:** usage_id (UUID)
- **Foreign Key:** user_id
- **Attributes:**
  - timestamp
  - app_name
  - category
  - duration_seconds
  - foreground_time
  - background_time
  - notification_count
  - interaction_count
  - data_quality_score

#### DE-1.2.2: Biometric Data
- **Primary Key:** biometric_id (UUID)
- **Foreign Key:** user_id
- **Attributes:**
  - source_device (watch/ring/phone)
  - timestamp
  - heart_rate
  - hrv_ms
  - steps
  - calories
  - sleep_quality_score
  - stress_level
  - activity_type
  - encrypted_raw_data

#### DE-1.2.3: Location Context
- **Primary Key:** location_id (UUID)
- **Foreign Key:** user_id
- **Attributes:**
  - timestamp
  - location_type (home/work/gym/other)
  - duration_minutes
  - movement_pattern
  - visit_frequency
  - anonymized_coordinates

### 1.3 Habit Entity

#### DE-1.3.1: Habit Definition
- **Primary Key:** habit_id (UUID)
- **Attributes:**
  - habit_name
  - description
  - category
  - base_difficulty (1-10)
  - success_criteria
  - measurement_unit
  - frequency (daily/weekly)
  - prerequisites (array)
  - incompatible_habits (array)

#### DE-1.3.2: User Habit Assignment
- **Primary Key:** assignment_id (UUID)
- **Foreign Keys:** user_id, habit_id
- **Attributes:**
  - assigned_date
  - personalized_difficulty
  - target_value
  - current_streak
  - longest_streak
  - total_completions
  - success_rate
  - last_completed
  - status (active/paused/completed)

### 1.4 Avatar Entity

#### DE-1.4.1: Avatar Profile
- **Primary Key:** avatar_id (UUID)
- **Foreign Key:** user_id
- **Attributes:**
  - avatar_name
  - visual_config (JSON)
  - personality_type
  - voice_settings
  - conversation_style
  - emotional_state
  - experience_points
  - level
  - unlocked_features (array)

#### DE-1.4.2: Conversation History
- **Primary Key:** conversation_id (UUID)
- **Foreign Keys:** user_id, avatar_id
- **Attributes:**
  - session_start
  - session_end
  - message_count
  - sentiment_score
  - topics_discussed (array)
  - insights_generated
  - user_satisfaction_rating

### 1.5 Social Entity

#### DE-1.5.1: Friendship
- **Primary Key:** friendship_id (UUID)
- **Foreign Keys:** user_id_1, user_id_2
- **Attributes:**
  - status (pending/active/blocked)
  - created_at
  - interaction_count
  - shared_challenges (array)
  - privacy_settings

#### DE-1.5.2: Challenge
- **Primary Key:** challenge_id (UUID)
- **Foreign Key:** creator_id
- **Attributes:**
  - challenge_name
  - description
  - habit_id
  - start_date
  - end_date
  - participants (array)
  - rules (JSON)
  - rewards
  - visibility (public/friends/private)

### 1.6 Content Entity

#### DE-1.6.1: Generated Content
- **Primary Key:** content_id (UUID)
- **Foreign Key:** user_id
- **Attributes:**
  - content_type (image/video/text)
  - generation_timestamp
  - ai_model_used
  - prompt_hash
  - media_url
  - thumbnail_url
  - captions (JSON)
  - hashtags (array)
  - platform_metadata (JSON)

#### DE-1.6.2: Social Share
- **Primary Key:** share_id (UUID)
- **Foreign Keys:** user_id, content_id
- **Attributes:**
  - platform (tiktok/twitter/instagram/etc)
  - share_timestamp
  - platform_post_id
  - engagement_metrics (JSON)
  - viral_score
  - referral_conversions

---

## 2. Data Privacy Architecture

### 2.1 Data Classification

#### DP-2.1.1: Sensitivity Levels
- **Level 1 - Public:** Username, avatar appearance, public achievements
- **Level 2 - Private:** Email, friend list, habit progress
- **Level 3 - Sensitive:** Behavioral patterns, location data
- **Level 4 - Highly Sensitive:** Biometric data, health information
- **Level 5 - Restricted:** Payment info, authentication credentials

#### DP-2.1.2: Access Control Matrix
| Data Level | User | Friends | Analytics | Admin | External |
|------------|------|---------|-----------|-------|----------|
| Public     | ✓    | ✓       | ✓         | ✓     | ✓        |
| Private    | ✓    | ✓*      | ✓†        | ✓     | ✗        |
| Sensitive  | ✓    | ✗       | ✓†        | ✓     | ✗        |
| Highly Sensitive | ✓ | ✗    | ✗         | ✓‡    | ✗        |
| Restricted | ✓    | ✗       | ✗         | ✓‡    | ✗        |

*With explicit permission  
†Anonymized only  
‡Audit logged

### 2.2 Anonymization Strategy

#### DP-2.2.1: User Anonymization
- Replace user_id with anonymous_id for analytics
- Remove all PII before data processing
- Aggregate data at minimum 100-user cohorts
- Apply differential privacy with ε=1.0
- K-anonymity with k≥5 for all datasets

#### DP-2.2.2: Location Anonymization
- Convert coordinates to region codes
- Remove precise timestamps (round to hour)
- Aggregate movement patterns weekly
- Remove home/work location identifiers
- Apply spatial cloaking (500m minimum)

### 2.3 Consent Management

#### DP-2.3.1: Consent Records
- **Primary Key:** consent_id (UUID)
- **Foreign Key:** user_id
- **Attributes:**
  - consent_type
  - consent_level
  - granted_date
  - expiry_date
  - purposes (array)
  - data_categories (array)
  - withdrawal_date
  - ip_address
  - user_agent

#### DP-2.3.2: Data Usage Audit
- **Primary Key:** audit_id (UUID)
- **Attributes:**
  - user_id (hashed)
  - data_type_accessed
  - purpose
  - accessing_system
  - timestamp
  - legal_basis
  - retention_period

---

## 3. Data Retention Policies

### 3.1 Active User Data

#### DR-3.1.1: Retention Periods
- **Behavioral Data:** 2 years rolling window
- **Biometric Data:** 1 year (health regulations)
- **Chat History:** 6 months (AI training excluded)
- **Achievement Data:** Indefinite
- **Generated Content:** User-controlled

#### DR-3.1.2: Compression Strategy
- Raw data compressed after 30 days
- Aggregated summaries retained longer
- Biometric data downsampled after 90 days
- Location data generalized after 60 days

### 3.2 Inactive User Data

#### DR-3.2.1: Inactivity Thresholds
- **Warning:** 6 months inactive
- **Data Archival:** 12 months inactive
- **Deletion Notice:** 18 months inactive
- **Auto Deletion:** 24 months inactive

#### DR-3.2.2: Reactivation Process
- Archived data restored within 48 hours
- Historical data may be aggregated
- Biometric data requires re-consent
- Social connections preserved

---

## 4. Data Monetization Structure

### 4.1 Anonymized Data Packages

#### DM-4.1.1: Bronze Tier Package
- **Contents:**
  - Basic demographic segments
  - General app usage patterns
  - Habit completion rates
- **Granularity:** Weekly aggregates
- **Cohort Size:** Minimum 1000 users

#### DM-4.1.2: Silver Tier Package
- **Contents:**
  - Behavioral pattern clusters
  - Time-based activity flows
  - Habit success predictors
  - Device usage correlations
- **Granularity:** Daily aggregates
- **Cohort Size:** Minimum 500 users

#### DM-4.1.3: Gold Tier Package
- **Contents:**
  - Full behavioral profiles
  - Biometric trend data
  - Location-based patterns
  - AI conversation insights
  - Predictive models
- **Granularity:** Hourly aggregates
- **Cohort Size:** Minimum 100 users

### 4.2 Research Data Sets

#### DM-4.2.1: Academic Package
- **Requirements:**
  - IRB approval
  - Data use agreement
  - Publication rights granted
- **Contents:**
  - De-identified user cohorts
  - Longitudinal behavior data
  - Intervention outcomes

#### DM-4.2.2: AI Training Package
- **Contents:**
  - Conversation transcripts (cleaned)
  - Behavioral sequences
  - Success/failure labels
  - Context metadata
- **Format:** TensorFlow/PyTorch ready

---

## 5. Data Integration Architecture

### 5.1 Real-time Data Pipeline

#### DI-5.1.1: Stream Processing
- **Ingestion Rate:** 100,000 events/second
- **Processing Latency:** <500ms
- **Technologies:**
  - Message Queue: Apache Kafka
  - Stream Processing: Apache Flink
  - Time Series DB: InfluxDB

#### DI-5.1.2: Batch Processing
- **Schedule:** Hourly aggregations
- **Technologies:**
  - Data Lake: S3/GCS
  - Processing: Apache Spark
  - Warehouse: Snowflake/BigQuery

### 5.2 Data Quality Management

#### DI-5.2.1: Validation Rules
- Completeness checks on required fields
- Range validation for numeric values
- Pattern matching for structured data
- Anomaly detection for outliers
- Duplicate detection and merging

#### DI-5.2.2: Data Lineage
- Track data source to destination
- Version control for transformations
- Audit trail for all modifications
- Impact analysis capabilities
- Rollback mechanisms

---

## 6. Compliance Data Requirements

### 6.1 GDPR Compliance

#### CD-6.1.1: Right to Access
- Export user data within 30 days
- Machine-readable format (JSON/CSV)
- Include all processing activities
- Provide data dictionary

#### CD-6.1.2: Right to Erasure
- Complete deletion within 30 days
- Cascade deletion to all systems
- Retain legally required data only
- Provide deletion certificate

### 6.2 CCPA Compliance

#### CD-6.2.1: Data Sale Registry
- **Attributes:**
  - User opt-out status
  - Last sale date
  - Buyer categories
  - Data categories sold
  - Revenue generated

#### CD-6.2.2: Consumer Rights Log
- Track all data requests
- Response times documented
- Actions taken recorded
- Communication history

---

## 7. Security Data Requirements

### 7.1 Encryption Standards

#### SD-7.1.1: Data at Rest
- **Database:** AES-256-GCM
- **File Storage:** AES-256-CBC
- **Backups:** AES-256 + RSA-4096
- **Key Rotation:** 90 days

#### SD-7.1.2: Data in Transit
- **APIs:** TLS 1.3 minimum
- **Internal:** mTLS required
- **Certificates:** 2048-bit minimum
- **Perfect Forward Secrecy:** Required

### 7.2 Access Logging

#### SD-7.2.1: Security Audit Log
- **Attributes:**
  - access_timestamp
  - user_identity
  - resource_accessed
  - action_performed
  - source_ip
  - success_status
  - anomaly_score