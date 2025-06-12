-- Seed data for habits table
-- Version 1.0.0
-- Date: 2025-06-11

-- This migration populates the habits table with a comprehensive set of habits
-- across multiple categories with varying difficulty levels

-- ============================================
-- HEALTH & FITNESS HABITS
-- ============================================

INSERT INTO public.habits (name, description, category, difficulty, icon, color) VALUES
-- Basic Health
('Drink 8 glasses of water', 'Stay hydrated by drinking 8 glasses of water throughout the day', 'health', 2, '💧', '#3B82F6'),
('Take 10,000 steps', 'Walk at least 10,000 steps daily for cardiovascular health', 'health', 4, '🚶', '#10B981'),
('Sleep 8 hours', 'Get a full 8 hours of quality sleep each night', 'health', 5, '😴', '#6366F1'),
('Take vitamins', 'Take your daily vitamins and supplements', 'health', 1, '💊', '#F59E0B'),
('Stretch for 10 minutes', 'Do a 10-minute stretching routine', 'health', 2, '🧘', '#8B5CF6'),

-- Exercise & Fitness
('Morning workout', 'Complete a 30-minute morning workout routine', 'fitness', 6, '💪', '#EF4444'),
('Go to the gym', 'Visit the gym for a full workout session', 'fitness', 7, '🏋️', '#F97316'),
('Do 50 push-ups', 'Complete 50 push-ups throughout the day', 'fitness', 5, '🔥', '#DC2626'),
('Run 5K', 'Run 5 kilometers without stopping', 'fitness', 8, '🏃', '#059669'),
('Yoga session', 'Complete a 45-minute yoga session', 'fitness', 4, '🧘‍♀️', '#7C3AED'),

-- Nutrition
('Eat 5 servings of vegetables', 'Consume at least 5 servings of vegetables', 'nutrition', 3, '🥗', '#16A34A'),
('No sugary drinks', 'Avoid all sugary beverages for the day', 'nutrition', 4, '🚫', '#E11D48'),
('Meal prep', 'Prepare healthy meals for the week', 'nutrition', 6, '🍱', '#0891B2'),
('Track calories', 'Log all meals and track daily calorie intake', 'nutrition', 3, '📊', '#7C2D12'),
('Intermittent fasting', 'Complete a 16-hour fasting window', 'nutrition', 7, '⏰', '#701A75'),

-- ============================================
-- PRODUCTIVITY & CAREER HABITS
-- ============================================

INSERT INTO public.habits (name, description, category, difficulty, icon, color) VALUES
-- Work & Career
('Deep work session', 'Complete 2 hours of uninterrupted focused work', 'productivity', 7, '🎯', '#1E40AF'),
('Clear email inbox', 'Process and organize all emails to inbox zero', 'productivity', 4, '📧', '#DC2626'),
('Plan tomorrow', 'Plan and prioritize tasks for the next day', 'productivity', 2, '📅', '#2563EB'),
('Learn new skill', 'Spend 30 minutes learning a new professional skill', 'productivity', 5, '🎓', '#7C3AED'),
('Network outreach', 'Connect with one new professional contact', 'productivity', 6, '🤝', '#0D9488'),

-- Time Management
('Use Pomodoro technique', 'Work in 25-minute focused intervals', 'productivity', 3, '🍅', '#DC2626'),
('No social media before noon', 'Avoid social media until after 12 PM', 'productivity', 5, '📵', '#6B7280'),
('Time block calendar', 'Schedule all tasks in time blocks', 'productivity', 4, '⏱️', '#3730A3'),
('Complete MIT', 'Finish your Most Important Task of the day', 'productivity', 6, '⭐', '#F59E0B'),
('Review goals', 'Review and track progress on monthly goals', 'productivity', 2, '🎯', '#10B981'),

-- ============================================
-- MENTAL WELLNESS HABITS
-- ============================================

INSERT INTO public.habits (name, description, category, difficulty, icon, color) VALUES
-- Mindfulness
('Meditate 10 minutes', 'Practice mindfulness meditation for 10 minutes', 'wellness', 3, '🧘‍♂️', '#6366F1'),
('Gratitude journal', 'Write down 3 things you are grateful for', 'wellness', 2, '🙏', '#EC4899'),
('Deep breathing', 'Practice deep breathing exercises for 5 minutes', 'wellness', 1, '🌬️', '#06B6D4'),
('Mindful eating', 'Eat one meal mindfully without distractions', 'wellness', 4, '🍽️', '#84CC16'),
('Body scan', 'Complete a full body scan meditation', 'wellness', 5, '✨', '#A855F7'),

-- Mental Health
('Journal thoughts', 'Write in a journal for 15 minutes', 'wellness', 3, '📔', '#F472B6'),
('Practice self-compassion', 'Do one act of self-kindness', 'wellness', 2, '💗', '#EC4899'),
('Digital detox hour', 'Spend one hour completely offline', 'wellness', 6, '📴', '#64748B'),
('Positive affirmations', 'Recite 5 positive affirmations', 'wellness', 1, '💭', '#F59E0B'),
('Therapy session', 'Attend therapy or counseling session', 'wellness', 7, '🗣️', '#10B981'),

-- ============================================
-- LEARNING & GROWTH HABITS
-- ============================================

INSERT INTO public.habits (name, description, category, difficulty, icon, color) VALUES
-- Reading & Learning
('Read 30 minutes', 'Read a book for at least 30 minutes', 'learning', 3, '📚', '#3B82F6'),
('Learn 5 new words', 'Learn and use 5 new vocabulary words', 'learning', 4, '🔤', '#8B5CF6'),
('Watch educational video', 'Watch one educational video or documentary', 'learning', 2, '🎥', '#EF4444'),
('Practice new language', 'Spend 20 minutes on language learning', 'learning', 5, '🗣️', '#10B981'),
('Write blog post', 'Write and publish a blog post', 'learning', 8, '✍️', '#6366F1'),

-- Skill Development
('Code for 1 hour', 'Write code or work on programming project', 'learning', 6, '💻', '#1E293B'),
('Practice instrument', 'Practice musical instrument for 30 minutes', 'learning', 5, '🎵', '#DC2626'),
('Draw or sketch', 'Create one drawing or sketch', 'learning', 4, '🎨', '#F59E0B'),
('Online course lesson', 'Complete one lesson in online course', 'learning', 3, '🎓', '#7C3AED'),
('Teach someone', 'Teach someone something new', 'learning', 6, '👨‍🏫', '#059669'),

-- ============================================
-- SOCIAL & RELATIONSHIPS HABITS
-- ============================================

INSERT INTO public.habits (name, description, category, difficulty, icon, color) VALUES
-- Connection
('Call a friend', 'Have a meaningful conversation with a friend', 'social', 3, '📞', '#3B82F6'),
('Send appreciation message', 'Send a message of appreciation to someone', 'social', 2, '💌', '#EC4899'),
('Family dinner', 'Have dinner with family without devices', 'social', 4, '👨‍👩‍👧‍👦', '#F97316'),
('Random act of kindness', 'Perform one random act of kindness', 'social', 3, '🤗', '#10B981'),
('Active listening', 'Practice active listening in all conversations', 'social', 5, '👂', '#6366F1'),

-- Community
('Volunteer', 'Volunteer for a cause you care about', 'social', 7, '🤲', '#059669'),
('Join community event', 'Participate in a community gathering', 'social', 6, '🎉', '#F59E0B'),
('Help a neighbor', 'Offer help to a neighbor in need', 'social', 4, '🏘️', '#8B5CF6'),
('Share knowledge', 'Share your expertise with others', 'social', 5, '💡', '#0891B2'),
('Reconnect with old friend', 'Reach out to someone you have not spoken to', 'social', 5, '🤝', '#DC2626'),

-- ============================================
-- FINANCIAL HABITS
-- ============================================

INSERT INTO public.habits (name, description, category, difficulty, icon, color) VALUES
-- Money Management
('Track expenses', 'Log all daily expenses', 'financial', 3, '💰', '#16A34A'),
('No impulse purchases', 'Avoid any unplanned purchases', 'financial', 6, '🛍️', '#DC2626'),
('Save $20', 'Put $20 into savings account', 'financial', 4, '🏦', '#2563EB'),
('Review budget', 'Review and adjust monthly budget', 'financial', 5, '📊', '#7C3AED'),
('Pack lunch', 'Bring lunch instead of buying', 'financial', 3, '🍱', '#F59E0B'),

-- Investment & Growth
('Research investments', 'Spend 30 minutes learning about investing', 'financial', 5, '📈', '#10B981'),
('Update financial goals', 'Review and update financial goals', 'financial', 4, '🎯', '#6366F1'),
('Negotiate a bill', 'Call to negotiate or reduce a monthly bill', 'financial', 7, '📞', '#EF4444'),
('Side hustle work', 'Work on side business for 1 hour', 'financial', 6, '💼', '#8B5CF6'),
('Financial education', 'Read financial book or article', 'financial', 3, '📚', '#0891B2'),

-- ============================================
-- ENVIRONMENT & HOME HABITS
-- ============================================

INSERT INTO public.habits (name, description, category, difficulty, icon, color) VALUES
-- Home Care
('Make bed', 'Make your bed first thing in the morning', 'home', 1, '🛏️', '#3B82F6'),
('Declutter 10 items', 'Remove or organize 10 items from living space', 'home', 3, '🗑️', '#EF4444'),
('Clean for 15 minutes', 'Spend 15 minutes cleaning living space', 'home', 2, '🧹', '#10B981'),
('Do laundry', 'Complete one load of laundry', 'home', 4, '👕', '#F59E0B'),
('Organize workspace', 'Clean and organize work area', 'home', 3, '🗂️', '#6366F1'),

-- Sustainability
('Use reusable bags', 'Use only reusable bags for shopping', 'environment', 2, '♻️', '#16A34A'),
('Zero food waste', 'Ensure no food is wasted today', 'environment', 5, '🌱', '#059669'),
('Reduce energy use', 'Consciously reduce electricity usage', 'environment', 4, '💡', '#F59E0B'),
('Public transport', 'Use public transport instead of driving', 'environment', 6, '🚌', '#0891B2'),
('Plant care', 'Water and care for plants', 'environment', 2, '🌿', '#10B981'),

-- ============================================
-- CREATIVITY & HOBBIES HABITS
-- ============================================

INSERT INTO public.habits (name, description, category, difficulty, icon, color) VALUES
-- Creative Expression
('Write creatively', 'Write 500 words of creative content', 'creativity', 5, '✍️', '#8B5CF6'),
('Take photos', 'Take and edit 3 creative photographs', 'creativity', 3, '📷', '#EC4899'),
('Dance', 'Dance freely for 15 minutes', 'creativity', 4, '💃', '#F59E0B'),
('Sing', 'Practice singing for 20 minutes', 'creativity', 3, '🎤', '#EF4444'),
('Cook new recipe', 'Try cooking a completely new recipe', 'creativity', 5, '👨‍🍳', '#F97316'),

-- Hobbies
('Garden', 'Spend 30 minutes gardening', 'hobbies', 4, '🌻', '#84CC16'),
('Play games', 'Enjoy 30 minutes of games or puzzles', 'hobbies', 2, '🎮', '#6366F1'),
('Watch sunset', 'Take time to watch the sunset', 'hobbies', 1, '🌅', '#F97316'),
('Build something', 'Work on a DIY or craft project', 'hobbies', 6, '🔨', '#7C2D12'),
('Collect memories', 'Add to scrapbook or photo album', 'hobbies', 3, '📸', '#EC4899');

-- Create a function to get habit recommendations based on user data
CREATE OR REPLACE FUNCTION get_habit_recommendations(
    user_profile JSONB,
    behavior_data JSONB
) RETURNS TABLE (
    habit_id UUID,
    score FLOAT,
    reason TEXT
) AS $$
DECLARE
    sleep_quality FLOAT;
    activity_level FLOAT;
    stress_level FLOAT;
BEGIN
    -- Extract key metrics from behavior data
    sleep_quality := COALESCE((behavior_data->>'sleep_quality')::FLOAT, 0.5);
    activity_level := COALESCE((behavior_data->>'activity_level')::FLOAT, 0.5);
    stress_level := COALESCE((behavior_data->>'stress_level')::FLOAT, 0.5);
    
    -- Return habit recommendations with scores
    RETURN QUERY
    SELECT 
        h.id,
        CASE
            -- Recommend sleep habits for poor sleep quality
            WHEN sleep_quality < 0.6 AND h.name LIKE '%sleep%' THEN 0.9
            WHEN sleep_quality < 0.6 AND h.category = 'wellness' THEN 0.8
            
            -- Recommend fitness for low activity
            WHEN activity_level < 0.4 AND h.category = 'fitness' THEN 0.85
            WHEN activity_level < 0.4 AND h.name LIKE '%walk%' THEN 0.9
            
            -- Recommend wellness for high stress
            WHEN stress_level > 0.7 AND h.category = 'wellness' THEN 0.9
            WHEN stress_level > 0.7 AND h.name LIKE '%meditat%' THEN 0.95
            
            -- Default scoring based on difficulty
            ELSE 0.5 + (0.3 * (1 - (h.difficulty::FLOAT / 10)))
        END as recommendation_score,
        
        CASE
            WHEN sleep_quality < 0.6 AND h.name LIKE '%sleep%' THEN 'Based on your sleep patterns'
            WHEN activity_level < 0.4 AND h.category = 'fitness' THEN 'To increase your activity level'
            WHEN stress_level > 0.7 AND h.category = 'wellness' THEN 'To help manage stress levels'
            ELSE 'General recommendation based on your profile'
        END as recommendation_reason
        
    FROM public.habits h
    WHERE h.difficulty <= 5  -- Start with easier habits
    ORDER BY recommendation_score DESC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_habit_recommendations TO authenticated;
GRANT EXECUTE ON FUNCTION get_habit_recommendations TO service_role;