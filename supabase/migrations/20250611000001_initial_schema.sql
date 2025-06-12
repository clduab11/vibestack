-- Initial VibeStack Database Schema
-- Version 1.0.0
-- Date: 2025-06-11

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
CREATE TYPE personality_type AS ENUM ('encouraging', 'drillSergeant', 'zenMaster', 'dataAnalyst');
CREATE TYPE friendship_status AS ENUM ('pending', 'accepted', 'blocked');
CREATE TYPE challenge_type AS ENUM ('1v1', 'group', 'public');
CREATE TYPE habit_status AS ENUM ('active', 'paused', 'completed', 'abandoned');

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    display_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    preferences JSONB DEFAULT '{}'::jsonb,
    onboarding_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habits catalog
CREATE TABLE IF NOT EXISTS public.habits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    difficulty INTEGER CHECK (difficulty >= 1 AND difficulty <= 10),
    icon TEXT,
    color TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User habit assignments
CREATE TABLE IF NOT EXISTS public.user_habits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    habit_id UUID REFERENCES public.habits(id),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    status habit_status DEFAULT 'active',
    ai_confidence FLOAT CHECK (ai_confidence >= 0 AND ai_confidence <= 1),
    assignment_reason JSONB,
    UNIQUE(user_id, habit_id)
);

-- Habit check-ins
CREATE TABLE IF NOT EXISTS public.habit_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    habit_id UUID REFERENCES public.habits(id),
    completed BOOLEAN DEFAULT FALSE,
    checkin_date DATE DEFAULT CURRENT_DATE,
    checkin_time TIMESTAMPTZ DEFAULT NOW(),
    mood TEXT,
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    UNIQUE(user_id, habit_id, checkin_date)
);

-- Behavioral events for AI analysis
CREATE TABLE IF NOT EXISTS public.behavior_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    event_data JSONB NOT NULL,
    device_info JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed BOOLEAN DEFAULT FALSE
);

-- Avatar configurations
CREATE TABLE IF NOT EXISTS public.avatars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    appearance JSONB NOT NULL DEFAULT '{}'::jsonb,
    personality personality_type NOT NULL DEFAULT 'encouraging',
    memories JSONB[] DEFAULT ARRAY[]::JSONB[],
    emotion_state JSONB DEFAULT '{"mood": "happy", "energy": 0.8}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversation history
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    messages JSONB[] NOT NULL DEFAULT ARRAY[]::JSONB[],
    context JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Social features: Friendships
CREATE TABLE IF NOT EXISTS public.friendships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    friend_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    status friendship_status DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, friend_id),
    CHECK (user_id != friend_id)
);

-- Challenges
CREATE TABLE IF NOT EXISTS public.challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    habit_id UUID REFERENCES public.habits(id),
    name TEXT NOT NULL,
    description TEXT,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    type challenge_type NOT NULL,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (end_date > start_date)
);

-- Challenge participants
CREATE TABLE IF NOT EXISTS public.challenge_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id UUID REFERENCES public.challenges(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    score INTEGER DEFAULT 0,
    rank INTEGER,
    UNIQUE(challenge_id, user_id)
);

-- User achievements
CREATE TABLE IF NOT EXISTS public.user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    achievement_type TEXT NOT NULL,
    achievement_data JSONB NOT NULL,
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    shared BOOLEAN DEFAULT FALSE
);

-- Generated content for social sharing
CREATE TABLE IF NOT EXISTS public.generated_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content_type TEXT NOT NULL,
    platform TEXT NOT NULL,
    content_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    shared_at TIMESTAMPTZ,
    share_metrics JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for performance
CREATE INDEX idx_behavior_events_user_created ON public.behavior_events(user_id, created_at DESC);
CREATE INDEX idx_behavior_events_type ON public.behavior_events(event_type);
CREATE INDEX idx_behavior_events_processed ON public.behavior_events(processed) WHERE processed = FALSE;
CREATE INDEX idx_habit_checkins_user_date ON public.habit_checkins(user_id, checkin_date DESC);
CREATE INDEX idx_habit_checkins_habit_date ON public.habit_checkins(habit_id, checkin_date DESC);
CREATE INDEX idx_user_habits_status ON public.user_habits(status) WHERE status = 'active';
CREATE INDEX idx_challenges_active ON public.challenges(start_date, end_date) WHERE NOW() BETWEEN start_date AND end_date;
CREATE INDEX idx_friendships_user ON public.friendships(user_id, status);
CREATE INDEX idx_friendships_friend ON public.friendships(friend_id, status);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_avatars_updated_at BEFORE UPDATE ON public.avatars
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_friendships_updated_at BEFORE UPDATE ON public.friendships
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.behavior_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avatars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_content ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policies (to be expanded in next migration)
-- Users can read their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Habits are publicly readable
CREATE POLICY "Habits are publicly readable" ON public.habits
    FOR SELECT USING (true);

-- Users can view their own habit assignments
CREATE POLICY "Users can view own habits" ON public.user_habits
    FOR SELECT USING (auth.uid() = user_id);

-- Users can view their own check-ins
CREATE POLICY "Users can view own checkins" ON public.habit_checkins
    FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own check-ins
CREATE POLICY "Users can create own checkins" ON public.habit_checkins
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Grant permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO authenticated;