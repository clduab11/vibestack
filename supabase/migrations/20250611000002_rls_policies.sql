-- Row Level Security Policies for VibeStack
-- Version 1.0.0
-- Date: 2025-06-11

-- This migration creates comprehensive RLS policies for all tables
-- ensuring data privacy and security at the database level

-- ============================================
-- PROFILES TABLE POLICIES
-- ============================================

-- Public profiles can be viewed by authenticated users
CREATE POLICY "Public profiles are viewable" ON public.profiles
    FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================
-- USER_HABITS TABLE POLICIES
-- ============================================

-- Users can insert their own habit assignments (via AI)
CREATE POLICY "Service role can assign habits" ON public.user_habits
    FOR INSERT USING (auth.uid() = user_id OR auth.jwt()->>'role' = 'service_role');

-- Users can update their own habit status
CREATE POLICY "Users can update own habit status" ON public.user_habits
    FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- HABIT_CHECKINS TABLE POLICIES
-- ============================================

-- Users can update their own check-ins
CREATE POLICY "Users can update own checkins" ON public.habit_checkins
    FOR UPDATE USING (auth.uid() = user_id);

-- Friends can view each other's check-ins (if privacy settings allow)
CREATE POLICY "Friends can view checkins" ON public.habit_checkins
    FOR SELECT USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM public.friendships
            WHERE status = 'accepted'
            AND ((user_id = auth.uid() AND friend_id = habit_checkins.user_id)
                OR (friend_id = auth.uid() AND user_id = habit_checkins.user_id))
        )
    );

-- ============================================
-- BEHAVIOR_EVENTS TABLE POLICIES
-- ============================================

-- Only users can insert their own behavior events
CREATE POLICY "Users can insert own behavior events" ON public.behavior_events
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Only users can view their own behavior events
CREATE POLICY "Users can view own behavior events" ON public.behavior_events
    FOR SELECT USING (auth.uid() = user_id);

-- Service role can update processed status
CREATE POLICY "Service role can process behavior events" ON public.behavior_events
    FOR UPDATE USING (auth.jwt()->>'role' = 'service_role');

-- ============================================
-- AVATARS TABLE POLICIES
-- ============================================

-- Users can view their own avatar
CREATE POLICY "Users can view own avatar" ON public.avatars
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own avatar
CREATE POLICY "Users can insert own avatar" ON public.avatars
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own avatar
CREATE POLICY "Users can update own avatar" ON public.avatars
    FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- CONVERSATIONS TABLE POLICIES
-- ============================================

-- Users can view their own conversations
CREATE POLICY "Users can view own conversations" ON public.conversations
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own conversations
CREATE POLICY "Users can insert own conversations" ON public.conversations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own conversations
CREATE POLICY "Users can update own conversations" ON public.conversations
    FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- FRIENDSHIPS TABLE POLICIES
-- ============================================

-- Users can view friendships they're part of
CREATE POLICY "Users can view own friendships" ON public.friendships
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Users can create friendship requests
CREATE POLICY "Users can create friendship requests" ON public.friendships
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update friendships they're part of
CREATE POLICY "Users can update friendships" ON public.friendships
    FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Users can delete friendships they're part of
CREATE POLICY "Users can delete friendships" ON public.friendships
    FOR DELETE USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- ============================================
-- CHALLENGES TABLE POLICIES
-- ============================================

-- Public challenges are viewable by all
CREATE POLICY "Public challenges are viewable" ON public.challenges
    FOR SELECT USING (
        type = 'public' OR
        auth.uid() = creator_id OR
        EXISTS (
            SELECT 1 FROM public.challenge_participants
            WHERE challenge_id = challenges.id AND user_id = auth.uid()
        )
    );

-- Users can create challenges
CREATE POLICY "Users can create challenges" ON public.challenges
    FOR INSERT WITH CHECK (auth.uid() = creator_id);

-- Challenge creators can update their challenges
CREATE POLICY "Creators can update challenges" ON public.challenges
    FOR UPDATE USING (auth.uid() = creator_id);

-- Challenge creators can delete their challenges
CREATE POLICY "Creators can delete challenges" ON public.challenges
    FOR DELETE USING (auth.uid() = creator_id);

-- ============================================
-- CHALLENGE_PARTICIPANTS TABLE POLICIES
-- ============================================

-- Participants can view challenge participants
CREATE POLICY "Participants can view challenge participants" ON public.challenge_participants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.challenges
            WHERE id = challenge_participants.challenge_id
            AND (type = 'public' OR EXISTS (
                SELECT 1 FROM public.challenge_participants cp
                WHERE cp.challenge_id = challenges.id AND cp.user_id = auth.uid()
            ))
        )
    );

-- Users can join challenges
CREATE POLICY "Users can join challenges" ON public.challenge_participants
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Service role can update scores and ranks
CREATE POLICY "Service role can update participant scores" ON public.challenge_participants
    FOR UPDATE USING (auth.jwt()->>'role' = 'service_role');

-- Users can leave challenges
CREATE POLICY "Users can leave challenges" ON public.challenge_participants
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- USER_ACHIEVEMENTS TABLE POLICIES
-- ============================================

-- Users can view their own achievements
CREATE POLICY "Users can view own achievements" ON public.user_achievements
    FOR SELECT USING (auth.uid() = user_id);

-- Service role can insert achievements
CREATE POLICY "Service role can grant achievements" ON public.user_achievements
    FOR INSERT USING (auth.jwt()->>'role' = 'service_role');

-- Friends can view shared achievements
CREATE POLICY "Friends can view shared achievements" ON public.user_achievements
    FOR SELECT USING (
        shared = true AND
        EXISTS (
            SELECT 1 FROM public.friendships
            WHERE status = 'accepted'
            AND ((user_id = auth.uid() AND friend_id = user_achievements.user_id)
                OR (friend_id = auth.uid() AND user_id = user_achievements.user_id))
        )
    );

-- ============================================
-- GENERATED_CONTENT TABLE POLICIES
-- ============================================

-- Users can view their own generated content
CREATE POLICY "Users can view own generated content" ON public.generated_content
    FOR SELECT USING (auth.uid() = user_id);

-- Service role can insert generated content
CREATE POLICY "Service role can create generated content" ON public.generated_content
    FOR INSERT USING (auth.jwt()->>'role' = 'service_role');

-- Users can update their own content (e.g., mark as shared)
CREATE POLICY "Users can update own generated content" ON public.generated_content
    FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- HELPER FUNCTIONS FOR RLS
-- ============================================

-- Function to check if two users are friends
CREATE OR REPLACE FUNCTION are_friends(user1 UUID, user2 UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.friendships
        WHERE status = 'accepted'
        AND ((user_id = user1 AND friend_id = user2)
            OR (friend_id = user1 AND user_id = user2))
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if a user is in a challenge
CREATE OR REPLACE FUNCTION is_in_challenge(user_id UUID, challenge_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.challenge_participants
        WHERE challenge_participants.user_id = $1
        AND challenge_participants.challenge_id = $2
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on helper functions
GRANT EXECUTE ON FUNCTION are_friends TO authenticated;
GRANT EXECUTE ON FUNCTION is_in_challenge TO authenticated;