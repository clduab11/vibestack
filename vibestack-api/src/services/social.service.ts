import type { SupabaseClient } from '@supabase/supabase-js';
import type { ApiResponse, Database, Friend, Challenge, ChallengeParticipant } from '../types';

interface FriendFilters {
  status?: 'pending' | 'accepted' | 'rejected';
}

interface ChallengeCreateData {
  name: string;
  description?: string;
  habit_id: string;
  start_date: string;
  end_date: string;
  target_count: number;
  participant_ids: string[];
}

interface ChallengeFilters {
  status?: 'pending' | 'active' | 'completed';
  created_by?: string;
  participating?: boolean;
}

interface BlockData {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at?: string;
}

export class SocialService {
  constructor(private supabase: SupabaseClient<Database>) {}

  async sendFriendRequest(friendId: string): Promise<ApiResponse<Friend>> {
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

      // Check for existing request
      const { data: existingRequest } = await this.supabase
        .from('friends')
        .select('*')
        .or(`user_id.eq.${user.id}.and.friend_id.eq.${friendId},user_id.eq.${friendId}.and.friend_id.eq.${user.id}`)
        .single();

      if (existingRequest) {
        return {
          success: false,
          error: {
            code: 'REQUEST_EXISTS',
            message: 'Friend request already exists',
          },
        };
      }

      // Check if user is blocked
      const { data: blockData } = await this.supabase
        .from('blocks')
        .select('*')
        .or(`blocker_id.eq.${user.id}.and.blocked_id.eq.${friendId},blocker_id.eq.${friendId}.and.blocked_id.eq.${user.id}`)
        .single();

      if (blockData) {
        return {
          success: false,
          error: {
            code: 'USER_BLOCKED',
            message: 'Cannot send friend request to this user',
          },
        };
      }

      // Create friend request
      const { data: friendRequest, error } = await this.supabase
        .from('friends')
        .insert({
          user_id: user.id,
          friend_id: friendId,
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Send notification
      await this.supabase.from('notifications').insert({
        user_id: friendId,
        type: 'friend_request',
        title: 'New Friend Request',
        message: 'You have a new friend request',
        data: { request_id: friendRequest.id, from_user_id: user.id },
      });

      return {
        success: true,
        data: friendRequest as Friend,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'FRIEND_REQUEST_ERROR',
          message: error instanceof Error ? error.message : 'Failed to send friend request',
        },
      };
    }
  }

  async acceptFriendRequest(requestId: string): Promise<ApiResponse<Friend>> {
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

      // Get friend request
      const { data: request, error: fetchError } = await this.supabase
        .from('friends')
        .select('*')
        .eq('id', requestId)
        .single();

      if (fetchError || !request) {
        return {
          success: false,
          error: {
            code: 'REQUEST_NOT_FOUND',
            message: 'Friend request not found',
          },
        };
      }

      // Check if user is the recipient
      if (request.friend_id !== user.id) {
        return {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Only recipient can accept friend request',
          },
        };
      }

      // Update request status
      const { data: updatedRequest, error: updateError } = await this.supabase
        .from('friends')
        .update({ status: 'accepted' })
        .eq('id', requestId)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      // Send notification
      await this.supabase.from('notifications').insert({
        user_id: request.user_id,
        type: 'friend_request_accepted',
        title: 'Friend Request Accepted',
        message: 'Your friend request has been accepted',
        data: { request_id: requestId, user_id: user.id },
      });

      return {
        success: true,
        data: updatedRequest as Friend,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'ACCEPT_ERROR',
          message: error instanceof Error ? error.message : 'Failed to accept friend request',
        },
      };
    }
  }

  async rejectFriendRequest(requestId: string): Promise<ApiResponse<Friend>> {
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

      // Get friend request
      const { data: request, error: fetchError } = await this.supabase
        .from('friends')
        .select('*')
        .eq('id', requestId)
        .single();

      if (fetchError || !request) {
        return {
          success: false,
          error: {
            code: 'REQUEST_NOT_FOUND',
            message: 'Friend request not found',
          },
        };
      }

      // Check if user is the recipient
      if (request.friend_id !== user.id) {
        return {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Only recipient can reject friend request',
          },
        };
      }

      // Update request status
      const { data: updatedRequest, error: updateError } = await this.supabase
        .from('friends')
        .update({ status: 'rejected' })
        .eq('id', requestId)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      return {
        success: true,
        data: updatedRequest as Friend,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'REJECT_ERROR',
          message: error instanceof Error ? error.message : 'Failed to reject friend request',
        },
      };
    }
  }

  async removeFriend(friendId: string): Promise<ApiResponse<void>> {
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

      // Get friendship
      const { data: friendship, error: fetchError } = await this.supabase
        .from('friends')
        .select('*')
        .or(`user_id.eq.${user.id}.and.friend_id.eq.${friendId},user_id.eq.${friendId}.and.friend_id.eq.${user.id}`)
        .eq('status', 'accepted')
        .single();

      if (fetchError || !friendship) {
        return {
          success: false,
          error: {
            code: 'FRIENDSHIP_NOT_FOUND',
            message: 'Friendship not found',
          },
        };
      }

      // Delete friendship
      const { error } = await this.supabase
        .from('friends')
        .delete()
        .eq('id', friendship.id);

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'REMOVE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to remove friend',
        },
      };
    }
  }

  async getFriends(userId: string, filters?: FriendFilters): Promise<ApiResponse<Friend[]>> {
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

      let query = this.supabase
        .from('friends')
        .select('*')
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return {
        success: true,
        data: (data || []) as Friend[],
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GET_FRIENDS_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get friends',
        },
      };
    }
  }

  async blockUser(blockedId: string): Promise<ApiResponse<void>> {
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

      // Check if already blocked
      const { data: existingBlock } = await this.supabase
        .from('blocks')
        .select('*')
        .eq('blocker_id', user.id)
        .eq('blocked_id', blockedId)
        .single();

      if (existingBlock) {
        return {
          success: false,
          error: {
            code: 'ALREADY_BLOCKED',
            message: 'User is already blocked',
          },
        };
      }

      // Create block
      const { error: blockError } = await this.supabase
        .from('blocks')
        .insert({
          blocker_id: user.id,
          blocked_id: blockedId,
        })
        .select()
        .single();

      if (blockError) {
        throw blockError;
      }

      // Remove any existing friendship
      await this.supabase
        .from('friends')
        .delete()
        .or(`user_id.eq.${user.id}.and.friend_id.eq.${blockedId},user_id.eq.${blockedId}.and.friend_id.eq.${user.id}`);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'BLOCK_ERROR',
          message: error instanceof Error ? error.message : 'Failed to block user',
        },
      };
    }
  }

  async unblockUser(blockedId: string): Promise<ApiResponse<void>> {
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

      // Delete block
      const { error } = await this.supabase
        .from('blocks')
        .delete()
        .eq('blocker_id', user.id)
        .eq('blocked_id', blockedId);

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UNBLOCK_ERROR',
          message: error instanceof Error ? error.message : 'Failed to unblock user',
        },
      };
    }
  }

  async createChallenge(data: ChallengeCreateData): Promise<ApiResponse<Challenge>> {
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

      // Validate dates
      const startDate = new Date(data.start_date);
      const endDate = new Date(data.end_date);

      if (endDate <= startDate) {
        return {
          success: false,
          error: {
            code: 'INVALID_DATES',
            message: 'End date must be after start date',
          },
        };
      }

      // Validate participants
      if (!data.participant_ids || data.participant_ids.length === 0) {
        return {
          success: false,
          error: {
            code: 'NO_PARTICIPANTS',
            message: 'Challenge must have at least one participant',
          },
        };
      }

      // Check habit ownership
      const { data: habit, error: habitError } = await this.supabase
        .from('habits')
        .select('*')
        .eq('id', data.habit_id)
        .single();

      if (habitError || !habit || habit.user_id !== user.id) {
        return {
          success: false,
          error: {
            code: 'INVALID_HABIT',
            message: 'Invalid habit or not owned by user',
          },
        };
      }

      // Create challenge
      const { data: challenge, error: challengeError } = await this.supabase
        .from('challenges')
        .insert({
          name: data.name,
          description: data.description,
          habit_id: data.habit_id,
          created_by: user.id,
          start_date: data.start_date,
          end_date: data.end_date,
          target_count: data.target_count,
          status: 'active',
        })
        .select()
        .single();

      if (challengeError) {
        throw challengeError;
      }

      // Add participants
      const participants = data.participant_ids.map(userId => ({
        challenge_id: challenge.id,
        user_id: userId,
        progress_count: 0,
      }));

      const { error: participantError } = await this.supabase
        .from('challenge_participants')
        .insert(participants);

      if (participantError) {
        // Rollback challenge creation
        await this.supabase.from('challenges').delete().eq('id', challenge.id);
        throw participantError;
      }

      // Send notifications
      const notifications = data.participant_ids.map(userId => ({
        user_id: userId,
        type: 'challenge_invite',
        title: 'Challenge Invitation',
        message: `You've been invited to join "${data.name}"`,
        data: { challenge_id: challenge.id, created_by: user.id },
      }));

      await this.supabase.from('notifications').insert(notifications);

      return {
        success: true,
        data: challenge as Challenge,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CREATE_CHALLENGE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create challenge',
        },
      };
    }
  }

  async joinChallenge(challengeId: string): Promise<ApiResponse<ChallengeParticipant>> {
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

      // Get challenge
      const { data: challenge, error: challengeError } = await this.supabase
        .from('challenges')
        .select('*')
        .eq('id', challengeId)
        .single();

      if (challengeError || !challenge) {
        return {
          success: false,
          error: {
            code: 'CHALLENGE_NOT_FOUND',
            message: 'Challenge not found',
          },
        };
      }

      if (challenge.status !== 'active') {
        return {
          success: false,
          error: {
            code: 'CHALLENGE_NOT_ACTIVE',
            message: 'Challenge is not active',
          },
        };
      }

      // Check if already participating
      const { data: existingParticipant } = await this.supabase
        .from('challenge_participants')
        .select('*')
        .eq('challenge_id', challengeId)
        .eq('user_id', user.id)
        .single();

      if (existingParticipant) {
        return {
          success: false,
          error: {
            code: 'ALREADY_PARTICIPATING',
            message: 'Already participating in this challenge',
          },
        };
      }

      // Create participation
      const { data: participant, error: participantError } = await this.supabase
        .from('challenge_participants')
        .insert({
          challenge_id: challengeId,
          user_id: user.id,
          progress_count: 0,
        })
        .select()
        .single();

      if (participantError) {
        throw participantError;
      }

      return {
        success: true,
        data: participant as ChallengeParticipant,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'JOIN_CHALLENGE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to join challenge',
        },
      };
    }
  }

  async leaveChallenge(challengeId: string): Promise<ApiResponse<void>> {
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

      // Get challenge
      const { data: challenge, error: challengeError } = await this.supabase
        .from('challenges')
        .select('*')
        .eq('id', challengeId)
        .single();

      if (challengeError || !challenge) {
        return {
          success: false,
          error: {
            code: 'CHALLENGE_NOT_FOUND',
            message: 'Challenge not found',
          },
        };
      }

      if (challenge.status === 'completed') {
        return {
          success: false,
          error: {
            code: 'CHALLENGE_NOT_ACTIVE',
            message: 'Cannot leave completed challenge',
          },
        };
      }

      // Delete participation
      const { error } = await this.supabase
        .from('challenge_participants')
        .delete()
        .eq('challenge_id', challengeId)
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'LEAVE_CHALLENGE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to leave challenge',
        },
      };
    }
  }

  async getChallenges(
    userId: string,
    filters?: ChallengeFilters
  ): Promise<ApiResponse<Challenge[]>> {
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

      const { data, error } = await this.supabase.rpc('get_user_challenges', {
        user_id: userId,
        status_filter: filters?.status,
        created_by_filter: filters?.created_by,
        participating_filter: filters?.participating,
      });

      if (error) {
        throw error;
      }

      return {
        success: true,
        data: (data || []) as Challenge[],
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GET_CHALLENGES_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get challenges',
        },
      };
    }
  }

  async updateChallengeProgress(
    challengeId: string,
    increment: number
  ): Promise<ApiResponse<ChallengeParticipant>> {
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

      // Get participant record
      const { data: participant, error: participantError } = await this.supabase
        .from('challenge_participants')
        .select('*')
        .eq('challenge_id', challengeId)
        .eq('user_id', user.id)
        .single();

      if (participantError || !participant) {
        return {
          success: false,
          error: {
            code: 'NOT_PARTICIPATING',
            message: 'Not participating in this challenge',
          },
        };
      }

      // Update progress
      const newProgress = participant.progress_count + increment;
      const { data: updatedParticipant, error: updateError } = await this.supabase
        .from('challenge_participants')
        .update({ progress_count: newProgress })
        .eq('id', participant.id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      // Check if challenge is complete
      const { data: completionData } = await this.supabase.rpc('check_challenge_completion', {
        challenge_id: challengeId,
      });

      if (completionData?.is_complete) {
        // Challenge completed - notifications would be sent by the RPC function
      }

      return {
        success: true,
        data: updatedParticipant as ChallengeParticipant,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UPDATE_PROGRESS_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update progress',
        },
      };
    }
  }
}