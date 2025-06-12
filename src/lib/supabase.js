/**
 * Supabase Client Configuration
 * 
 * This module provides configured Supabase clients for different contexts:
 * - Public client: For client-side operations with anon key
 * - Admin client: For server-side operations with service role key
 * - Server client: For API routes with user context
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate required environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing required Supabase environment variables');
}

/**
 * Public Supabase client for client-side operations
 * Uses the anon key which enforces RLS policies
 */
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

/**
 * Admin Supabase client for server-side operations
 * Uses the service role key which bypasses RLS
 * WARNING: Only use this server-side, never expose to client
 */
const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

/**
 * Create a server-side Supabase client with user context
 * @param {string} accessToken - User's access token from request
 * @returns {SupabaseClient} Configured Supabase client
 */
function createServerSupabaseClient(accessToken) {
  if (!accessToken) {
    throw new Error('Access token is required for server client');
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  });
}

/**
 * Database helper functions
 */
const db = {
  /**
   * Get user profile by ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User profile
   */
  async getUserProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Get user's active habits
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of habits
   */
  async getUserHabits(userId) {
    const { data, error } = await supabase
      .from('user_habits')
      .select(`
        *,
        habit:habits(*)
      `)
      .eq('user_id', userId)
      .eq('status', 'active');

    if (error) throw error;
    return data;
  },

  /**
   * Get habit check-ins for a date range
   * @param {string} userId - User ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Array of check-ins
   */
  async getHabitCheckins(userId, startDate, endDate) {
    const { data, error } = await supabase
      .from('habit_checkins')
      .select('*')
      .eq('user_id', userId)
      .gte('checkin_date', startDate.toISOString().split('T')[0])
      .lte('checkin_date', endDate.toISOString().split('T')[0])
      .order('checkin_date', { ascending: false });

    if (error) throw error;
    return data;
  },

  /**
   * Create behavior event for AI analysis
   * @param {string} userId - User ID
   * @param {string} eventType - Type of event
   * @param {Object} eventData - Event data
   * @returns {Promise<Object>} Created event
   */
  async createBehaviorEvent(userId, eventType, eventData) {
    const { data, error } = await supabase
      .from('behavior_events')
      .insert({
        user_id: userId,
        event_type: eventType,
        event_data: eventData,
        device_info: {
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
          platform: typeof navigator !== 'undefined' ? navigator.platform : 'server'
        }
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};

/**
 * Real-time subscription helpers
 */
const realtime = {
  /**
   * Subscribe to habit check-in updates
   * @param {string} userId - User ID
   * @param {Function} callback - Callback function
   * @returns {RealtimeChannel} Subscription channel
   */
  subscribeToCheckins(userId, callback) {
    return supabase
      .channel(`checkins:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'habit_checkins',
          filter: `user_id=eq.${userId}`
        },
        callback
      )
      .subscribe();
  },

  /**
   * Subscribe to challenge updates
   * @param {string} challengeId - Challenge ID
   * @param {Function} callback - Callback function
   * @returns {RealtimeChannel} Subscription channel
   */
  subscribeToChallengeUpdates(challengeId, callback) {
    return supabase
      .channel(`challenge:${challengeId}`)
      .on('broadcast', { event: '*' }, callback)
      .subscribe();
  },

  /**
   * Broadcast challenge update
   * @param {string} challengeId - Challenge ID
   * @param {string} event - Event name
   * @param {Object} payload - Event payload
   */
  async broadcastChallengeUpdate(challengeId, event, payload) {
    const channel = supabase.channel(`challenge:${challengeId}`);
    await channel.send({
      type: 'broadcast',
      event,
      payload
    });
  }
};

module.exports = {
  supabase,
  supabaseAdmin,
  createServerSupabaseClient,
  db,
  realtime
};