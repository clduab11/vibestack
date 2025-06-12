import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SocialService } from '../../../services/social.service';
import { supabaseMock, type SupabaseMock } from '../../mocks/supabase.mock';
import {
  setupTest,
  teardownTest,
  expectApiSuccess,
  expectApiError,
  mockAuthState,
  createSupabaseError,
  measurePerformance,
} from '../../utils/test-helpers';
import {
  createUser,
  createProfile,
  createSession,
  createFriend,
  createChallenge,
  createChallengeParticipant,
  createHabit,
  createNotification,
  testScenarios,
} from '../../fixtures/test-data';

describe('SocialService', () => {
  let socialService: SocialService;
  let supabase: SupabaseMock;

  beforeEach(() => {
    const test = setupTest();
    supabase = test.supabase;
    socialService = new SocialService(supabase as any);
  });

  afterEach(() => {
    teardownTest();
  });

  describe('sendFriendRequest', () => {
    it('should send a friend request', async () => {
      const user = createUser();
      const friendUser = createUser();

      mockAuthState(supabase, user, createSession({ user }));

      // Mock check for existing request
      supabase.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          or: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null, // No existing request
              error: null,
            }),
          }),
        }),
      }));

      // Mock check if user blocked
      supabase.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          or: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null, // Not blocked
              error: null,
            }),
          }),
        }),
      }));

      // Mock friend request creation
      const friendRequest = createFriend({
        user_id: user.id,
        friend_id: friendUser.id,
        status: 'pending',
      });

      supabase.from.mockImplementationOnce(() => ({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: friendRequest,
              error: null,
            }),
          }),
        }),
      }));

      // Mock notification creation
      supabase.from.mockImplementationOnce(() => ({
        insert: vi.fn().mockResolvedValue({
          data: createNotification(),
          error: null,
        }),
      }));

      const result = await socialService.sendFriendRequest(friendUser.id);

      expectApiSuccess(result);
      expect(result.data?.friend_id).toBe(friendUser.id);
      expect(result.data?.status).toBe('pending');
    });

    it('should prevent duplicate friend requests', async () => {
      const user = createUser();
      const friendUser = createUser();

      mockAuthState(supabase, user, createSession({ user }));

      // Mock existing request
      supabase.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          or: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: createFriend({ user_id: user.id, friend_id: friendUser.id }),
              error: null,
            }),
          }),
        }),
      }));

      const result = await socialService.sendFriendRequest(friendUser.id);

      expectApiError(result, {
        code: 'REQUEST_EXISTS',
        message: 'Friend request already exists',
      });
    });

    it('should prevent sending request to blocked users', async () => {
      const user = createUser();
      const blockedUser = createUser();

      mockAuthState(supabase, user, createSession({ user }));

      // Mock no existing request
      supabase.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          or: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      }));

      // Mock user is blocked
      supabase.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          or: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'block-id', blocker_id: blockedUser.id },
              error: null,
            }),
          }),
        }),
      }));

      const result = await socialService.sendFriendRequest(blockedUser.id);

      expectApiError(result, {
        code: 'USER_BLOCKED',
        message: 'Cannot send friend request to this user',
      });
    });

    it('should require authentication', async () => {
      mockAuthState(supabase, null, null);

      const result = await socialService.sendFriendRequest('friend-id');

      expectApiError(result, {
        code: 'UNAUTHORIZED',
        message: 'Must be authenticated',
      });
    });
  });

  describe('acceptFriendRequest', () => {
    it('should accept a pending friend request', async () => {
      const user = createUser();
      const requestingUser = createUser();
      const friendRequest = createFriend({
        user_id: requestingUser.id,
        friend_id: user.id,
        status: 'pending',
      });

      mockAuthState(supabase, user, createSession({ user }));

      // Mock get friend request
      supabase.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: friendRequest,
              error: null,
            }),
          }),
        }),
      }));

      // Mock update request
      supabase.from.mockImplementationOnce(() => ({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { ...friendRequest, status: 'accepted' },
                error: null,
              }),
            }),
          }),
        }),
      }));

      // Mock notification
      supabase.from.mockImplementationOnce(() => ({
        insert: vi.fn().mockResolvedValue({
          data: createNotification(),
          error: null,
        }),
      }));

      const result = await socialService.acceptFriendRequest(friendRequest.id);

      expectApiSuccess(result);
      expect(result.data?.status).toBe('accepted');
    });

    it('should only allow recipient to accept request', async () => {
      const user = createUser();
      const otherUser = createUser();
      const friendRequest = createFriend({
        user_id: user.id, // Current user sent the request
        friend_id: otherUser.id,
        status: 'pending',
      });

      mockAuthState(supabase, user, createSession({ user }));

      // Mock get friend request
      supabase.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: friendRequest,
              error: null,
            }),
          }),
        }),
      }));

      const result = await socialService.acceptFriendRequest(friendRequest.id);

      expectApiError(result, {
        code: 'FORBIDDEN',
        message: 'Only recipient can accept friend request',
      });
    });
  });

  describe('rejectFriendRequest', () => {
    it('should reject a pending friend request', async () => {
      const user = createUser();
      const requestingUser = createUser();
      const friendRequest = createFriend({
        user_id: requestingUser.id,
        friend_id: user.id,
        status: 'pending',
      });

      mockAuthState(supabase, user, createSession({ user }));

      // Mock get friend request
      supabase.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: friendRequest,
              error: null,
            }),
          }),
        }),
      }));

      // Mock update request
      supabase.from.mockImplementationOnce(() => ({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { ...friendRequest, status: 'rejected' },
                error: null,
              }),
            }),
          }),
        }),
      }));

      const result = await socialService.rejectFriendRequest(friendRequest.id);

      expectApiSuccess(result);
      expect(result.data?.status).toBe('rejected');
    });
  });

  describe('removeFriend', () => {
    it('should remove an existing friendship', async () => {
      const user = createUser();
      const friendUser = createUser();
      const friendship = createFriend({
        user_id: user.id,
        friend_id: friendUser.id,
        status: 'accepted',
      });

      mockAuthState(supabase, user, createSession({ user }));

      // Mock get friendship
      supabase.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          or: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: friendship,
                error: null,
              }),
            }),
          }),
        }),
      }));

      // Mock delete friendship
      supabase.from.mockImplementationOnce(() => ({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      }));

      const result = await socialService.removeFriend(friendUser.id);

      expectApiSuccess(result);
    });

    it('should handle non-existent friendship', async () => {
      const user = createUser();
      mockAuthState(supabase, user, createSession({ user }));

      // Mock no friendship found
      supabase.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          or: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          }),
        }),
      }));

      const result = await socialService.removeFriend('non-friend-id');

      expectApiError(result, {
        code: 'FRIENDSHIP_NOT_FOUND',
        message: 'Friendship not found',
      });
    });
  });

  describe('getFriends', () => {
    it('should get all accepted friends', async () => {
      const user = createUser();
      const friends = [
        createFriend({ user_id: user.id, status: 'accepted' }),
        createFriend({ friend_id: user.id, status: 'accepted' }),
      ];

      mockAuthState(supabase, user, createSession({ user }));

      supabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          or: vi.fn().mockResolvedValue({
            data: friends,
            error: null,
          }),
        }),
      }));

      const result = await socialService.getFriends(user.id);

      expectApiSuccess(result);
      expect(result.data).toHaveLength(2);
    });

    it('should filter by status', async () => {
      const user = createUser();
      const pendingRequests = [
        createFriend({ friend_id: user.id, status: 'pending' }),
      ];

      mockAuthState(supabase, user, createSession({ user }));

      supabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          or: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: pendingRequests,
              error: null,
            }),
          }),
        }),
      }));

      const result = await socialService.getFriends(user.id, { status: 'pending' });

      expectApiSuccess(result);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].status).toBe('pending');
    });
  });

  describe('blockUser', () => {
    it('should block a user', async () => {
      const user = createUser();
      const userToBlock = createUser();

      mockAuthState(supabase, user, createSession({ user }));

      // Mock check existing block
      supabase.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null, // Not blocked
                error: null,
              }),
            }),
          }),
        }),
      }));

      // Mock create block
      supabase.from.mockImplementationOnce(() => ({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { 
                id: 'block-id',
                blocker_id: user.id,
                blocked_id: userToBlock.id,
              },
              error: null,
            }),
          }),
        }),
      }));

      // Mock remove friendship
      supabase.from.mockImplementationOnce(() => ({
        delete: vi.fn().mockReturnValue({
          or: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      }));

      const result = await socialService.blockUser(userToBlock.id);

      expectApiSuccess(result);
    });

    it('should prevent duplicate blocks', async () => {
      const user = createUser();
      const blockedUser = createUser();

      mockAuthState(supabase, user, createSession({ user }));

      // Mock existing block
      supabase.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'block-id' },
                error: null,
              }),
            }),
          }),
        }),
      }));

      const result = await socialService.blockUser(blockedUser.id);

      expectApiError(result, {
        code: 'ALREADY_BLOCKED',
        message: 'User is already blocked',
      });
    });
  });

  describe('unblockUser', () => {
    it('should unblock a user', async () => {
      const user = createUser();
      const blockedUser = createUser();

      mockAuthState(supabase, user, createSession({ user }));

      // Mock delete block
      supabase.from.mockImplementation(() => ({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      }));

      const result = await socialService.unblockUser(blockedUser.id);

      expectApiSuccess(result);
    });
  });

  describe('createChallenge', () => {
    it('should create a new challenge', async () => {
      const user = createUser();
      const habit = createHabit({ user_id: user.id });
      const participants = [createUser(), createUser()];

      mockAuthState(supabase, user, createSession({ user }));

      const challengeData = {
        name: 'Week Challenge',
        description: '7 day streak challenge',
        habit_id: habit.id,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        target_count: 7,
        participant_ids: participants.map(p => p.id),
      };

      // Mock habit ownership check
      supabase.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: habit,
              error: null,
            }),
          }),
        }),
      }));

      // Mock challenge creation
      const challenge = createChallenge({
        ...challengeData,
        created_by: user.id,
        status: 'active',
      });

      supabase.from.mockImplementationOnce(() => ({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: challenge,
              error: null,
            }),
          }),
        }),
      }));

      // Mock participant creation
      supabase.from.mockImplementationOnce(() => ({
        insert: vi.fn().mockResolvedValue({
          data: participants.map(p => createChallengeParticipant({
            challenge_id: challenge.id,
            user_id: p.id,
          })),
          error: null,
        }),
      }));

      // Mock notifications
      supabase.from.mockImplementationOnce(() => ({
        insert: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      }));

      const result = await socialService.createChallenge(challengeData);

      expectApiSuccess(result);
      expect(result.data?.name).toBe(challengeData.name);
      expect(result.data?.created_by).toBe(user.id);
    });

    it('should validate challenge dates', async () => {
      const user = createUser();
      mockAuthState(supabase, user, createSession({ user }));

      const result = await socialService.createChallenge({
        name: 'Invalid Challenge',
        habit_id: 'habit-id',
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() - 1000).toISOString(), // End before start
        target_count: 7,
        participant_ids: [],
      });

      expectApiError(result, {
        code: 'INVALID_DATES',
        message: 'End date must be after start date',
      });
    });

    it('should require at least one participant', async () => {
      const user = createUser();
      mockAuthState(supabase, user, createSession({ user }));

      const result = await socialService.createChallenge({
        name: 'No Participants',
        habit_id: 'habit-id',
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 1000).toISOString(),
        target_count: 7,
        participant_ids: [],
      });

      expectApiError(result, {
        code: 'NO_PARTICIPANTS',
        message: 'Challenge must have at least one participant',
      });
    });
  });

  describe('joinChallenge', () => {
    it('should join an active challenge', async () => {
      const user = createUser();
      const challenge = createChallenge({ status: 'active' });

      mockAuthState(supabase, user, createSession({ user }));

      // Mock get challenge
      supabase.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: challenge,
              error: null,
            }),
          }),
        }),
      }));

      // Mock check existing participation
      supabase.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null, // Not participating
                error: null,
              }),
            }),
          }),
        }),
      }));

      // Mock create participation
      const participant = createChallengeParticipant({
        challenge_id: challenge.id,
        user_id: user.id,
      });

      supabase.from.mockImplementationOnce(() => ({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: participant,
              error: null,
            }),
          }),
        }),
      }));

      const result = await socialService.joinChallenge(challenge.id);

      expectApiSuccess(result);
      expect(result.data?.user_id).toBe(user.id);
    });

    it('should prevent joining completed challenges', async () => {
      const user = createUser();
      const challenge = createChallenge({ status: 'completed' });

      mockAuthState(supabase, user, createSession({ user }));

      // Mock get challenge
      supabase.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: challenge,
              error: null,
            }),
          }),
        }),
      }));

      const result = await socialService.joinChallenge(challenge.id);

      expectApiError(result, {
        code: 'CHALLENGE_NOT_ACTIVE',
        message: 'Challenge is not active',
      });
    });

    it('should prevent duplicate participation', async () => {
      const user = createUser();
      const challenge = createChallenge({ status: 'active' });

      mockAuthState(supabase, user, createSession({ user }));

      // Mock get challenge
      supabase.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: challenge,
              error: null,
            }),
          }),
        }),
      }));

      // Mock existing participation
      supabase.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: createChallengeParticipant(),
                error: null,
              }),
            }),
          }),
        }),
      }));

      const result = await socialService.joinChallenge(challenge.id);

      expectApiError(result, {
        code: 'ALREADY_PARTICIPATING',
        message: 'Already participating in this challenge',
      });
    });
  });

  describe('leaveChallenge', () => {
    it('should leave an active challenge', async () => {
      const user = createUser();
      const challenge = createChallenge({ status: 'active' });

      mockAuthState(supabase, user, createSession({ user }));

      // Mock get challenge
      supabase.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: challenge,
              error: null,
            }),
          }),
        }),
      }));

      // Mock delete participation
      supabase.from.mockImplementationOnce(() => ({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      }));

      const result = await socialService.leaveChallenge(challenge.id);

      expectApiSuccess(result);
    });

    it('should prevent leaving completed challenges', async () => {
      const user = createUser();
      const challenge = createChallenge({ status: 'completed' });

      mockAuthState(supabase, user, createSession({ user }));

      // Mock get challenge
      supabase.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: challenge,
              error: null,
            }),
          }),
        }),
      }));

      const result = await socialService.leaveChallenge(challenge.id);

      expectApiError(result, {
        code: 'CHALLENGE_NOT_ACTIVE',
        message: 'Cannot leave completed challenge',
      });
    });
  });

  describe('getChallenges', () => {
    it('should get user challenges', async () => {
      const user = createUser();
      const challenges = [
        createChallenge({ created_by: user.id }),
        createChallenge({ created_by: 'other-user' }),
      ];

      mockAuthState(supabase, user, createSession({ user }));

      // Mock RPC call
      supabase.rpc.mockResolvedValue({
        data: challenges,
        error: null,
      });

      const result = await socialService.getChallenges(user.id);

      expectApiSuccess(result);
      expect(result.data).toHaveLength(2);
    });

    it('should filter by status', async () => {
      const user = createUser();
      const activeChallenges = [
        createChallenge({ status: 'active' }),
      ];

      mockAuthState(supabase, user, createSession({ user }));

      supabase.rpc.mockResolvedValue({
        data: activeChallenges,
        error: null,
      });

      const result = await socialService.getChallenges(user.id, { status: 'active' });

      expectApiSuccess(result);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].status).toBe('active');
    });
  });

  describe('updateChallengeProgress', () => {
    it('should update challenge progress', async () => {
      const user = createUser();
      const challenge = createChallenge({ status: 'active' });
      const participant = createChallengeParticipant({
        challenge_id: challenge.id,
        user_id: user.id,
        progress_count: 3,
      });

      mockAuthState(supabase, user, createSession({ user }));

      // Mock get participant
      supabase.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: participant,
                error: null,
              }),
            }),
          }),
        }),
      }));

      // Mock update progress
      supabase.from.mockImplementationOnce(() => ({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { ...participant, progress_count: 4 },
                error: null,
              }),
            }),
          }),
        }),
      }));

      // Mock check completion
      supabase.rpc.mockResolvedValue({
        data: { is_complete: false },
        error: null,
      });

      const result = await socialService.updateChallengeProgress(challenge.id, 1);

      expectApiSuccess(result);
      expect(result.data?.progress_count).toBe(4);
    });

    it('should trigger completion check', async () => {
      const user = createUser();
      const challenge = createChallenge({ status: 'active', target_count: 5 });
      const participant = createChallengeParticipant({
        challenge_id: challenge.id,
        user_id: user.id,
        progress_count: 4,
      });

      mockAuthState(supabase, user, createSession({ user }));

      // Mock get participant
      supabase.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: participant,
                error: null,
              }),
            }),
          }),
        }),
      }));

      // Mock update progress
      supabase.from.mockImplementationOnce(() => ({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { ...participant, progress_count: 5 },
                error: null,
              }),
            }),
          }),
        }),
      }));

      // Mock completion check
      supabase.rpc.mockResolvedValue({
        data: { is_complete: true, winner_id: user.id },
        error: null,
      });

      const result = await socialService.updateChallengeProgress(challenge.id, 1);

      expectApiSuccess(result);
      expect(result.data?.progress_count).toBe(5);
      expect(supabase.rpc).toHaveBeenCalledWith('check_challenge_completion', {
        challenge_id: challenge.id,
      });
    });
  });

  describe('performance', () => {
    it('should send friend request within performance threshold', async () => {
      const user = createUser();
      mockAuthState(supabase, user, createSession({ user }));

      // Mock all required calls
      supabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          or: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: createFriend(),
              error: null,
            }),
          }),
        }),
      }));

      await measurePerformance(
        'SocialService.sendFriendRequest',
        async () => {
          await socialService.sendFriendRequest('friend-id');
        },
        100 // 100ms threshold
      );
    });

    it('should get friends within performance threshold', async () => {
      const user = createUser();
      const friends = Array.from({ length: 50 }, () => createFriend());

      mockAuthState(supabase, user, createSession({ user }));

      supabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          or: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: friends,
              error: null,
            }),
          }),
        }),
      }));

      await measurePerformance(
        'SocialService.getFriends',
        async () => {
          await socialService.getFriends(user.id);
        },
        100 // 100ms threshold
      );
    });
  });
});