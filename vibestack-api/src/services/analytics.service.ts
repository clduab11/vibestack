import type { SupabaseClient } from '@supabase/supabase-js';
import type { ApiResponse, Database } from '../types';

interface AnalyticsFilters {
  startDate?: string;
  endDate?: string;
}

interface HabitAnalytics {
  totalHabits: number;
  activeHabits: number;
  completionRate: number;
  averageStreak: number;
  bestStreak: number;
  totalCompletions: number;
}

interface AchievementAnalytics {
  totalAchievements: number;
  recentAchievements: number;
  pointsEarned: number;
  achievementRate: number;
}

interface SocialAnalytics {
  totalFriends: number;
  activeFriends: number;
  challengesParticipated: number;
  challengesWon: number;
  socialEngagementScore: number;
}

interface UserAnalytics {
  habits: HabitAnalytics;
  achievements: AchievementAnalytics;
  social: SocialAnalytics;
}

interface HabitDetailedAnalytics {
  totalDays: number;
  completedDays: number;
  completionRate: number;
  currentStreak: number;
  longestStreak: number;
  averageDailyCount?: number;
  weeklyPattern?: Record<string, number>;
  hourlyDistribution?: Record<string, number>;
  trend?: {
    direction: 'improving' | 'declining' | 'stable';
    changePercentage: number;
    predictionNextWeek?: number;
  };
}

interface ProgressTrend {
  date: string;
  completionRate: number;
}

interface ProgressTrendsData {
  dailyTrends: ProgressTrend[];
  weeklyAverage: number;
  monthlyAverage: number;
  improvementRate: number;
}

interface AchievementStats {
  totalAchievements: number;
  unlockedAchievements: number;
  completionRate: number;
  categoryBreakdown: Array<{
    category: string;
    count: number;
    total: number;
  }>;
  recentAchievements?: any[];
}

interface SocialStats {
  totalFriends: number;
  activeFriendsLastWeek: number;
  challengesCreated: number;
  challengesParticipated: number;
  challengesWon: number;
  challengeWinRate: number;
  socialScore: number;
  ranking: number;
  interactionFrequency?: Record<string, number>;
  friendActivity?: Array<{
    friendId: string;
    sharedHabits: number;
    interactionScore: number;
  }>;
  averageFriendInteraction?: number;
}

interface Insight {
  type: 'habit_improvement' | 'habit_struggle' | 'social_opportunity' | 'achievement_near' | 'general';
  title: string;
  description: string;
  recommendation: string;
  priority: 'high' | 'medium' | 'low';
}

interface InsightsData {
  insights: Insight[];
  summary: string;
}

interface ExportOptions {
  format: 'json' | 'csv';
  sections?: string[];
  includeRawData?: boolean;
}

interface ExportData {
  format: string;
  data: any;
  generatedAt: string;
}

export class AnalyticsService {
  constructor(private supabase: SupabaseClient<Database>) {}

  async getUserAnalytics(
    userId: string,
    filters?: AnalyticsFilters
  ): Promise<ApiResponse<UserAnalytics>> {
    try {
      // Check authentication
      const {
        data: { user },
      } = await this.supabase.auth.getUser();

      if (!user) {
        return {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Must be authenticated',
          },
        };
      }

      // Check authorization
      if (user.id !== userId) {
        return {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Cannot access analytics for another user',
          },
        };
      }

      // Get habit analytics
      const { data: habitData, error: habitError } = await this.supabase.rpc(
        'get_habit_analytics',
        {
          user_id: userId,
          start_date: filters?.startDate,
          end_date: filters?.endDate,
        }
      );

      if (habitError) {
        throw habitError;
      }

      // Get achievement analytics
      const { data: achievementData, error: achievementError } = await this.supabase.rpc(
        'get_achievement_analytics',
        {
          user_id: userId,
          start_date: filters?.startDate,
          end_date: filters?.endDate,
        }
      );

      if (achievementError) {
        throw achievementError;
      }

      // Get social analytics
      const { data: socialData, error: socialError } = await this.supabase.rpc(
        'get_social_analytics',
        {
          user_id: userId,
          start_date: filters?.startDate,
          end_date: filters?.endDate,
        }
      );

      if (socialError) {
        throw socialError;
      }

      return {
        success: true,
        data: {
          habits: {
            totalHabits: habitData.total_habits,
            activeHabits: habitData.active_habits,
            completionRate: habitData.completion_rate,
            averageStreak: habitData.average_streak,
            bestStreak: habitData.best_streak,
            totalCompletions: habitData.total_completions,
          },
          achievements: {
            totalAchievements: achievementData.total_achievements,
            recentAchievements: achievementData.recent_achievements,
            pointsEarned: achievementData.points_earned,
            achievementRate: achievementData.achievement_rate,
          },
          social: {
            totalFriends: socialData.total_friends,
            activeFriends: socialData.active_friends,
            challengesParticipated: socialData.challenges_participated,
            challengesWon: socialData.challenges_won,
            socialEngagementScore: socialData.social_engagement_score,
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'ANALYTICS_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get analytics',
        },
      };
    }
  }

  async getHabitAnalytics(
    habitId: string,
    options?: { includeTrends?: boolean }
  ): Promise<ApiResponse<HabitDetailedAnalytics>> {
    try {
      // Check authentication
      const {
        data: { user },
      } = await this.supabase.auth.getUser();

      if (!user) {
        return {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Must be authenticated',
          },
        };
      }

      // Check habit ownership
      const { data: habit, error: habitError } = await this.supabase
        .from('habits')
        .select('user_id')
        .eq('id', habitId)
        .single();

      if (habitError || !habit || habit.user_id !== user.id) {
        return {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Cannot access analytics for this habit',
          },
        };
      }

      // Get habit analytics
      const { data, error } = await this.supabase.rpc('get_habit_detailed_analytics', {
        habit_id: habitId,
        include_trends: options?.includeTrends || false,
      });

      if (error) {
        throw error;
      }

      const analytics: HabitDetailedAnalytics = {
        totalDays: data.total_days,
        completedDays: data.completed_days,
        completionRate: data.completion_rate,
        currentStreak: data.current_streak,
        longestStreak: data.longest_streak,
        averageDailyCount: data.average_daily_count,
        weeklyPattern: data.weekly_pattern,
        hourlyDistribution: data.hourly_distribution,
      };

      if (data.trend) {
        analytics.trend = {
          direction: data.trend.direction,
          changePercentage: data.trend.change_percentage,
          predictionNextWeek: data.trend.prediction_next_week,
        };
      }

      return {
        success: true,
        data: analytics,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'ANALYTICS_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get habit analytics',
        },
      };
    }
  }

  async getProgressTrends(
    userId: string,
    options?: {
      period?: 'week' | 'month' | 'quarter' | 'year';
      habitIds?: string[];
    }
  ): Promise<ApiResponse<ProgressTrendsData>> {
    try {
      // Check authentication
      const {
        data: { user },
      } = await this.supabase.auth.getUser();

      if (!user) {
        return {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Must be authenticated',
          },
        };
      }

      // Check authorization
      if (user.id !== userId) {
        return {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Cannot access trends for another user',
          },
        };
      }

      const { data, error } = await this.supabase.rpc('calculate_progress_trends', {
        user_id: userId,
        period: options?.period || 'week',
        habit_ids: options?.habitIds,
      });

      if (error) {
        throw error;
      }

      return {
        success: true,
        data: {
          dailyTrends: data.daily_trends.map((t: any) => ({
            date: t.date,
            completionRate: t.completion_rate,
          })),
          weeklyAverage: data.weekly_average,
          monthlyAverage: data.monthly_average,
          improvementRate: data.improvement_rate,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'TRENDS_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get trends',
        },
      };
    }
  }

  async getAchievementStats(
    userId: string,
    options?: { includeRecent?: boolean }
  ): Promise<ApiResponse<AchievementStats>> {
    try {
      // Check authentication
      const {
        data: { user },
      } = await this.supabase.auth.getUser();

      if (!user) {
        return {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Must be authenticated',
          },
        };
      }

      // Check authorization
      if (user.id !== userId) {
        return {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Cannot access achievement stats for another user',
          },
        };
      }

      // Get total achievements
      const { count: totalCount } = await this.supabase
        .from('achievements')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Get unlocked achievements
      const { count: unlockedCount } = await this.supabase
        .from('user_achievements')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      // Get category breakdown
      const { data: categoryData, error: categoryError } = await this.supabase.rpc(
        'get_achievement_category_stats',
        {
          user_id: userId,
        }
      );

      if (categoryError) {
        throw categoryError;
      }

      const stats: AchievementStats = {
        totalAchievements: totalCount || 0,
        unlockedAchievements: unlockedCount || 0,
        completionRate: totalCount ? (unlockedCount || 0) / totalCount : 0,
        categoryBreakdown: categoryData || [],
      };

      // Get recent achievements if requested
      if (options?.includeRecent) {
        const { data: recentData } = await this.supabase
          .from('user_achievements')
          .select('*')
          .eq('user_id', userId)
          .order('unlocked_at', { ascending: false })
          .limit(5);

        stats.recentAchievements = recentData || [];
      }

      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'ACHIEVEMENT_STATS_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get achievement stats',
        },
      };
    }
  }

  async getSocialStats(
    userId: string,
    options?: { includeFriendActivity?: boolean }
  ): Promise<ApiResponse<SocialStats>> {
    try {
      // Check authentication
      const {
        data: { user },
      } = await this.supabase.auth.getUser();

      if (!user) {
        return {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Must be authenticated',
          },
        };
      }

      // Check authorization
      if (user.id !== userId) {
        return {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Cannot access social stats for another user',
          },
        };
      }

      const { data, error } = await this.supabase.rpc('get_social_stats', {
        user_id: userId,
        include_friend_activity: options?.includeFriendActivity || false,
      });

      if (error) {
        throw error;
      }

      const stats: SocialStats = {
        totalFriends: data.total_friends,
        activeFriendsLastWeek: data.active_friends_last_week,
        challengesCreated: data.challenges_created || 0,
        challengesParticipated: data.challenges_participated,
        challengesWon: data.challenges_won,
        challengeWinRate: data.win_rate || 0,
        socialScore: data.social_score || 0,
        ranking: data.ranking || 0,
        interactionFrequency: data.interaction_frequency,
      };

      if (data.friend_activity) {
        stats.friendActivity = data.friend_activity.map((fa: any) => ({
          friendId: fa.friend_id,
          sharedHabits: fa.shared_habits,
          interactionScore: fa.interaction_score,
        }));
        stats.averageFriendInteraction = data.average_friend_interaction;
      }

      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SOCIAL_STATS_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get social stats',
        },
      };
    }
  }

  async generateInsights(userId: string): Promise<ApiResponse<InsightsData>> {
    try {
      // Check authentication
      const {
        data: { user },
      } = await this.supabase.auth.getUser();

      if (!user) {
        return {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Must be authenticated',
          },
        };
      }

      // Check authorization
      if (user.id !== userId) {
        return {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Cannot generate insights for another user',
          },
        };
      }

      // Collect data for insights
      const { data: analyticsData, error: dataError } = await this.supabase.rpc(
        'collect_insights_data',
        {
          user_id: userId,
        }
      );

      if (dataError) {
        throw dataError;
      }

      // Generate AI insights
      const { data: insightsData, error: insightsError } = await this.supabase.rpc(
        'generate_ai_insights',
        {
          user_id: userId,
          analytics_data: analyticsData,
        }
      );

      if (insightsError) {
        // Return default insights on AI failure
        return {
          success: true,
          data: {
            insights: [],
            summary: 'Unable to generate insights at this time',
          },
        };
      }

      return {
        success: true,
        data: {
          insights: insightsData.insights || [],
          summary: insightsData.summary || 'No insights available',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'INSIGHTS_ERROR',
          message: error instanceof Error ? error.message : 'Failed to generate insights',
        },
      };
    }
  }

  async exportAnalytics(
    userId: string,
    options: ExportOptions
  ): Promise<ApiResponse<ExportData>> {
    try {
      // Check authentication
      const {
        data: { user },
      } = await this.supabase.auth.getUser();

      if (!user) {
        return {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Must be authenticated',
          },
        };
      }

      // Check authorization
      if (user.id !== userId) {
        return {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Cannot export analytics for another user',
          },
        };
      }

      // Collect all analytics data
      const { data, error } = await this.supabase.rpc('export_user_analytics', {
        user_id: userId,
        sections: options.sections,
        include_raw_data: options.includeRawData || false,
      });

      if (error) {
        throw error;
      }

      let exportData: any;

      if (options.format === 'csv') {
        // Convert to CSV format
        exportData = this.convertToCSV(data);
      } else {
        // Default to JSON
        exportData = data;
      }

      return {
        success: true,
        data: {
          format: options.format,
          data: exportData,
          generatedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'EXPORT_ERROR',
          message: error instanceof Error ? error.message : 'Failed to export analytics',
        },
      };
    }
  }

  private convertToCSV(data: any): string {
    // Simple CSV conversion for habits data
    if (data.habits && Array.isArray(data.habits)) {
      const headers = Object.keys(data.habits[0] || {});
      const csvHeaders = headers.join(',');
      const csvRows = data.habits
        .map((habit: any) => headers.map(h => habit[h]).join(','))
        .join('\n');
      return `${csvHeaders}\n${csvRows}`;
    }
    return 'No data available';
  }
}