// Core domain types for VibeStack API

// User and Profile types
export interface User {
  id: string;
  email?: string;
  created_at: string;
  updated_at: string;
  last_sign_in_at?: string;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
}

export interface Profile {
  id: string;
  user_id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  privacy_settings: PrivacySettings;
  notification_preferences: NotificationPreferences;
  created_at: string;
  updated_at: string;
}

export interface PrivacySettings {
  profile_visibility: 'public' | 'friends' | 'private';
  show_activity: boolean;
  allow_friend_requests: boolean;
  show_stats: boolean;
}

export interface NotificationPreferences {
  email_notifications: boolean;
  push_notifications: boolean;
  friend_requests: boolean;
  habit_reminders: boolean;
  achievement_alerts: boolean;
  social_interactions: boolean;
}

// Habit and Progress types
export interface Habit {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  category: HabitCategory;
  frequency: HabitFrequency;
  target_value?: number;
  unit?: string;
  reminder_time?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type HabitCategory =
  | 'health'
  | 'fitness'
  | 'mindfulness'
  | 'productivity'
  | 'learning'
  | 'social'
  | 'creative'
  | 'financial'
  | 'other';

export interface HabitFrequency {
  type: 'daily' | 'weekly' | 'monthly';
  days_of_week?: number[]; // 0-6, Sunday-Saturday
  times_per_period?: number;
}

export interface HabitProgress {
  id: string;
  habit_id: string;
  user_id: string;
  date: string;
  value: number;
  notes?: string;
  mood?: number; // 1-5 scale
  created_at: string;
}

export interface HabitStreak {
  habit_id: string;
  current_streak: number;
  longest_streak: number;
  last_completed_date?: string;
  total_completions: number;
}

// Social and Gamification types
export interface Friend {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted' | 'blocked';
  created_at: string;
  updated_at: string;
}

export interface Challenge {
  id: string;
  creator_id: string;
  name: string;
  description: string;
  habit_category?: HabitCategory;
  start_date: string;
  end_date: string;
  target_type: 'count' | 'streak' | 'total';
  target_value: number;
  is_public: boolean;
  max_participants?: number;
  created_at: string;
  updated_at: string;
}

export interface ChallengeParticipant {
  id: string;
  challenge_id: string;
  user_id: string;
  progress: number;
  rank?: number;
  joined_at: string;
  completed_at?: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon_url?: string;
  category: AchievementCategory;
  criteria: AchievementCriteria;
  points: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export type AchievementCategory =
  | 'streak'
  | 'completion'
  | 'social'
  | 'challenge'
  | 'milestone'
  | 'special';

export interface AchievementCriteria {
  type: string;
  value: number;
  habit_category?: HabitCategory;
  time_period?: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
  progress?: number;
}

// Avatar and Customization types
export interface Avatar {
  id: string;
  user_id: string;
  name: string;
  personality_traits: PersonalityTraits;
  appearance: AvatarAppearance;
  level: number;
  experience: number;
  mood: number; // 0-100
  energy: number; // 0-100
  created_at: string;
  updated_at: string;
}

export interface PersonalityTraits {
  encouragement_style: 'cheerful' | 'motivational' | 'gentle' | 'competitive';
  communication_frequency: 'high' | 'medium' | 'low';
  humor_level: number; // 0-10
  formality: number; // 0-10
}

export interface AvatarAppearance {
  body_type: string;
  skin_tone: string;
  hair_style: string;
  hair_color: string;
  outfit_id: string;
  accessories: string[];
}

export interface AvatarItem {
  id: string;
  type: 'outfit' | 'accessory' | 'background' | 'effect';
  name: string;
  description?: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  cost_coins?: number;
  cost_gems?: number;
  unlock_requirement?: string;
  image_url: string;
}

export interface UserInventory {
  id: string;
  user_id: string;
  item_id: string;
  quantity: number;
  acquired_at: string;
  equipped: boolean;
}

// Analytics and Insights types
export interface UserAnalytics {
  user_id: string;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  date: string;
  habit_completion_rate: number;
  total_habits_tracked: number;
  mood_average?: number;
  most_consistent_habit?: string;
  total_streak_days: number;
  social_interactions: number;
}

export interface HabitAnalytics {
  habit_id: string;
  period: 'weekly' | 'monthly' | 'yearly';
  completion_rate: number;
  average_value?: number;
  best_streak: number;
  total_completions: number;
  mood_correlation?: number;
  best_time_of_day?: string;
}

// Monetization types
export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: 'active' | 'cancelled' | 'expired' | 'trial';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price_monthly: number;
  price_yearly?: number;
  features: string[];
  limits: PlanLimits;
  trial_days?: number;
}

export interface PlanLimits {
  max_habits: number;
  max_friends: number;
  max_challenges: number;
  advanced_analytics: boolean;
  custom_avatars: boolean;
  priority_support: boolean;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: 'subscription' | 'purchase' | 'reward';
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  description: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

// Notification types
export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

export type NotificationType =
  | 'friend_request'
  | 'challenge_invite'
  | 'achievement_unlocked'
  | 'habit_reminder'
  | 'streak_milestone'
  | 'social_interaction'
  | 'system';

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  metadata?: ResponseMetadata;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ResponseMetadata {
  timestamp: string;
  version: string;
  request_id?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  has_more: boolean;
}

// Session types
export interface Session {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at?: number;
  token_type: string;
  user: User;
}

// Database types for Supabase
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Profile, 'id' | 'user_id'>>;
      };
      habits: {
        Row: Habit;
        Insert: Omit<Habit, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Habit, 'id' | 'user_id'>>;
      };
      habit_progress: {
        Row: HabitProgress;
        Insert: Omit<HabitProgress, 'id' | 'created_at'>;
        Update: Partial<Omit<HabitProgress, 'id' | 'habit_id' | 'user_id'>>;
      };
      friends: {
        Row: Friend;
        Insert: Omit<Friend, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Pick<Friend, 'status'>>;
      };
      challenges: {
        Row: Challenge;
        Insert: Omit<Challenge, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Challenge, 'id' | 'creator_id'>>;
      };
      challenge_participants: {
        Row: ChallengeParticipant;
        Insert: Omit<ChallengeParticipant, 'id' | 'joined_at'>;
        Update: Partial<Pick<ChallengeParticipant, 'progress' | 'completed_at'>>;
      };
      user_achievements: {
        Row: UserAchievement;
        Insert: Omit<UserAchievement, 'id' | 'unlocked_at'>;
        Update: Partial<Pick<UserAchievement, 'progress'>>;
      };
      avatars: {
        Row: Avatar;
        Insert: Omit<Avatar, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Avatar, 'id' | 'user_id'>>;
      };
      subscriptions: {
        Row: Subscription;
        Insert: Omit<Subscription, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Subscription, 'id' | 'user_id'>>;
      };
      notifications: {
        Row: Notification;
        Insert: Omit<Notification, 'id' | 'created_at'>;
        Update: Partial<Pick<Notification, 'read'>>;
      };
    };
  };
}
