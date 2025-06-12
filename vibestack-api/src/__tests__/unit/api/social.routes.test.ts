import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import {
  createUser,
  createFriend,
  createChallenge,
  createChallengeParticipant,
  createProfile,
} from '../../fixtures/test-data';

// Mock supabase for auth middleware
const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
};

// First, mock the supabase config
vi.mock('../../../config/supabase', () => ({
  supabase: mockSupabase,
}));

// Mock the services module
const mockSocialService = {
  sendFriendRequest: vi.fn(),
  acceptFriendRequest: vi.fn(),
  declineFriendRequest: vi.fn(),
  getFriends: vi.fn(),
  getFriendRequests: vi.fn(),
  removeFriend: vi.fn(),
  blockUser: vi.fn(),
  unblockUser: vi.fn(),
  getBlockedUsers: vi.fn(),
  createChallenge: vi.fn(),
  getChallenge: vi.fn(),
  getChallenges: vi.fn(),
  joinChallenge: vi.fn(),
  leaveChallenge: vi.fn(),
  updateChallengeProgress: vi.fn(),
  getChallengeLeaderboard: vi.fn(),
  inviteToChallenge: vi.fn(),
  respondToInvite: vi.fn(),
  getActivity: vi.fn(),
  getFriendsActivity: vi.fn(),
  shareAchievement: vi.fn(),
  likeActivity: vi.fn(),
  commentOnActivity: vi.fn(),
};

vi.mock('../../../services', () => ({
  SocialService: vi.fn().mockImplementation(() => mockSocialService),
}));

// Now import the routes after mocking
const { socialRoutes } = await import('../../../api/routes/socialRoutes');
const { resetRateLimits } = await import('../../../middleware/rateLimitingMiddleware');

describe('Social Features Routes', () => {
  let app: express.Application;
  let socialService: typeof mockSocialService;
  let authenticatedUser: any;

  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimits();
    app = express();
    app.use(express.json());
    socialService = mockSocialService;
    app.use('/social', socialRoutes);
    
    // Setup authenticated user
    authenticatedUser = createUser();
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: authenticatedUser },
      error: null,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    resetRateLimits();
  });

  describe('POST /social/friends/request', () => {
    it('should send a friend request', async () => {
      const requestData = {
        targetUserId: 'user-456',
        message: 'Let\'s be friends!',
      };

      socialService.sendFriendRequest.mockResolvedValue({
        success: true,
        data: {
          id: 'request-123',
          from_user_id: authenticatedUser.id,
          to_user_id: requestData.targetUserId,
          message: requestData.message,
          status: 'pending',
        },
      });

      const response = await request(app)
        .post('/social/friends/request')
        .set('Authorization', 'Bearer valid-token')
        .send(requestData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(socialService.sendFriendRequest).toHaveBeenCalledWith(
        authenticatedUser.id,
        requestData.targetUserId,
        requestData.message
      );
    });

    it('should validate required fields', async () => {
      const invalidData = {
        // Missing targetUserId
        message: 'Hello!',
      };

      const response = await request(app)
        .post('/social/friends/request')
        .set('Authorization', 'Bearer valid-token')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle duplicate requests', async () => {
      const requestData = {
        targetUserId: 'user-456',
      };

      socialService.sendFriendRequest.mockResolvedValue({
        success: false,
        error: {
          code: 'REQUEST_EXISTS',
          message: 'Friend request already exists',
        },
      });

      const response = await request(app)
        .post('/social/friends/request')
        .set('Authorization', 'Bearer valid-token')
        .send(requestData);

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('REQUEST_EXISTS');
    });
  });

  describe('PUT /social/friends/request/:requestId/accept', () => {
    it('should accept a friend request', async () => {
      const requestId = 'request-123';

      socialService.acceptFriendRequest.mockResolvedValue({
        success: true,
        data: {
          friend_id: 'friend-123',
          user_id: authenticatedUser.id,
          friend_user_id: 'user-456',
        },
      });

      const response = await request(app)
        .put(`/social/friends/request/${requestId}/accept`)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(socialService.acceptFriendRequest).toHaveBeenCalledWith(
        requestId,
        authenticatedUser.id
      );
    });
  });

  describe('PUT /social/friends/request/:requestId/decline', () => {
    it('should decline a friend request', async () => {
      const requestId = 'request-123';

      socialService.declineFriendRequest.mockResolvedValue({
        success: true,
      });

      const response = await request(app)
        .put(`/social/friends/request/${requestId}/decline`)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(socialService.declineFriendRequest).toHaveBeenCalledWith(
        requestId,
        authenticatedUser.id
      );
    });
  });

  describe('GET /social/friends', () => {
    it('should get friends list', async () => {
      const friends = [
        createFriend({ user_id: authenticatedUser.id }),
        createFriend({ user_id: authenticatedUser.id }),
      ];

      socialService.getFriends.mockResolvedValue({
        success: true,
        data: friends,
      });

      const response = await request(app)
        .get('/social/friends')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(socialService.getFriends).toHaveBeenCalledWith(
        authenticatedUser.id,
        {}
      );
    });

    it('should support pagination', async () => {
      socialService.getFriends.mockResolvedValue({
        success: true,
        data: [],
      });

      const response = await request(app)
        .get('/social/friends?limit=10&offset=20')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(socialService.getFriends).toHaveBeenCalledWith(
        authenticatedUser.id,
        { limit: 10, offset: 20 }
      );
    });
  });

  describe('GET /social/friends/requests', () => {
    it('should get friend requests', async () => {
      const requests = [
        {
          id: 'request-1',
          from_user_id: 'user-123',
          status: 'pending',
        },
        {
          id: 'request-2',
          from_user_id: 'user-456',
          status: 'pending',
        },
      ];

      socialService.getFriendRequests.mockResolvedValue({
        success: true,
        data: requests,
      });

      const response = await request(app)
        .get('/social/friends/requests')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(socialService.getFriendRequests).toHaveBeenCalledWith(
        authenticatedUser.id,
        {}
      );
    });

    it('should filter by type', async () => {
      socialService.getFriendRequests.mockResolvedValue({
        success: true,
        data: [],
      });

      const response = await request(app)
        .get('/social/friends/requests?type=sent')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(socialService.getFriendRequests).toHaveBeenCalledWith(
        authenticatedUser.id,
        { type: 'sent' }
      );
    });
  });

  describe('DELETE /social/friends/:friendId', () => {
    it('should remove a friend', async () => {
      const friendId = 'friend-123';

      socialService.removeFriend.mockResolvedValue({
        success: true,
      });

      const response = await request(app)
        .delete(`/social/friends/${friendId}`)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(socialService.removeFriend).toHaveBeenCalledWith(
        friendId,
        authenticatedUser.id
      );
    });
  });

  describe('POST /social/challenges', () => {
    it('should create a challenge', async () => {
      const challengeData = {
        name: 'Morning Exercise Challenge',
        description: 'Exercise every morning for 30 days',
        type: 'habit_streak',
        target_value: 30,
        start_date: '2025-02-01',
        end_date: '2025-03-02',
        is_public: true,
        max_participants: 10,
      };

      const createdChallenge = createChallenge({
        ...challengeData,
        creator_id: authenticatedUser.id,
      });

      socialService.createChallenge.mockResolvedValue({
        success: true,
        data: createdChallenge,
      });

      const response = await request(app)
        .post('/social/challenges')
        .set('Authorization', 'Bearer valid-token')
        .send(challengeData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(challengeData.name);
      expect(socialService.createChallenge).toHaveBeenCalledWith(
        authenticatedUser.id,
        challengeData
      );
    });

    it('should validate required fields', async () => {
      const invalidData = {
        name: 'Test Challenge',
        // Missing required fields
      };

      const response = await request(app)
        .post('/social/challenges')
        .set('Authorization', 'Bearer valid-token')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /social/challenges', () => {
    it('should get challenges', async () => {
      const challenges = [
        createChallenge(),
        createChallenge(),
      ];

      socialService.getChallenges.mockResolvedValue({
        success: true,
        data: challenges,
      });

      const response = await request(app)
        .get('/social/challenges')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(socialService.getChallenges).toHaveBeenCalledWith(
        authenticatedUser.id,
        {}
      );
    });

    it('should filter by status', async () => {
      socialService.getChallenges.mockResolvedValue({
        success: true,
        data: [],
      });

      const response = await request(app)
        .get('/social/challenges?status=active')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(socialService.getChallenges).toHaveBeenCalledWith(
        authenticatedUser.id,
        { status: 'active' }
      );
    });
  });

  describe('POST /social/challenges/:challengeId/join', () => {
    it('should join a challenge', async () => {
      const challengeId = 'challenge-123';

      socialService.joinChallenge.mockResolvedValue({
        success: true,
        data: createChallengeParticipant({
          challenge_id: challengeId,
          user_id: authenticatedUser.id,
        }),
      });

      const response = await request(app)
        .post(`/social/challenges/${challengeId}/join`)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(socialService.joinChallenge).toHaveBeenCalledWith(
        challengeId,
        authenticatedUser.id
      );
    });
  });

  describe('GET /social/challenges/:challengeId/leaderboard', () => {
    it('should get challenge leaderboard', async () => {
      const challengeId = 'challenge-123';
      const leaderboard = [
        createChallengeParticipant({ rank: 1, progress: 25 }),
        createChallengeParticipant({ rank: 2, progress: 20 }),
      ];

      socialService.getChallengeLeaderboard.mockResolvedValue({
        success: true,
        data: leaderboard,
      });

      const response = await request(app)
        .get(`/social/challenges/${challengeId}/leaderboard`)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(socialService.getChallengeLeaderboard).toHaveBeenCalledWith(
        challengeId,
        authenticatedUser.id,
        {}
      );
    });
  });

  describe('GET /social/activity', () => {
    it('should get user activity feed', async () => {
      const activities = [
        {
          id: 'activity-1',
          type: 'achievement_unlocked',
          user_id: authenticatedUser.id,
          timestamp: new Date().toISOString(),
        },
        {
          id: 'activity-2',
          type: 'habit_completed',
          user_id: authenticatedUser.id,
          timestamp: new Date().toISOString(),
        },
      ];

      socialService.getActivity.mockResolvedValue({
        success: true,
        data: activities,
      });

      const response = await request(app)
        .get('/social/activity')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(socialService.getActivity).toHaveBeenCalledWith(
        authenticatedUser.id,
        {}
      );
    });
  });

  describe('GET /social/activity/friends', () => {
    it('should get friends activity feed', async () => {
      const activities = [
        {
          id: 'activity-1',
          type: 'achievement_unlocked',
          user_id: 'friend-1',
          timestamp: new Date().toISOString(),
        },
      ];

      socialService.getFriendsActivity.mockResolvedValue({
        success: true,
        data: activities,
      });

      const response = await request(app)
        .get('/social/activity/friends')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(socialService.getFriendsActivity).toHaveBeenCalledWith(
        authenticatedUser.id,
        {}
      );
    });
  });

  describe('POST /social/activity/:activityId/like', () => {
    it('should like an activity', async () => {
      const activityId = 'activity-123';

      socialService.likeActivity.mockResolvedValue({
        success: true,
        data: { liked: true, likes_count: 5 },
      });

      const response = await request(app)
        .post(`/social/activity/${activityId}/like`)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(socialService.likeActivity).toHaveBeenCalledWith(
        activityId,
        authenticatedUser.id
      );
    });
  });

  describe('POST /social/activity/:activityId/comment', () => {
    it('should comment on an activity', async () => {
      const activityId = 'activity-123';
      const commentData = {
        content: 'Great job!',
      };

      socialService.commentOnActivity.mockResolvedValue({
        success: true,
        data: {
          id: 'comment-123',
          activity_id: activityId,
          user_id: authenticatedUser.id,
          content: commentData.content,
        },
      });

      const response = await request(app)
        .post(`/social/activity/${activityId}/comment`)
        .set('Authorization', 'Bearer valid-token')
        .send(commentData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(socialService.commentOnActivity).toHaveBeenCalledWith(
        activityId,
        authenticatedUser.id,
        commentData.content
      );
    });

    it('should validate comment content', async () => {
      const activityId = 'activity-123';
      const invalidData = {
        content: '', // Empty content
      };

      const response = await request(app)
        .post(`/social/activity/${activityId}/comment`)
        .set('Authorization', 'Bearer valid-token')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Rate limiting', () => {
    it('should rate limit friend requests', async () => {
      const requestData = {
        targetUserId: 'user-456',
      };

      socialService.sendFriendRequest.mockResolvedValue({
        success: true,
        data: {},
      });

      // Make multiple requests
      for (let i = 0; i < 21; i++) {
        await request(app)
          .post('/social/friends/request')
          .set('Authorization', 'Bearer valid-token')
          .send(requestData);
      }

      // Next request should be rate limited
      const response = await request(app)
        .post('/social/friends/request')
        .set('Authorization', 'Bearer valid-token')
        .send(requestData);

      expect(response.status).toBe(429);
      expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    });
  });
});