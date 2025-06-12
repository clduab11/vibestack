import {
  User,
  Profile,
  Habit,
  HabitProgress,
  Friend,
  Challenge,
  ChallengeParticipant,
  Achievement,
  UserAchievement,
  Avatar,
  Subscription,
  SubscriptionPlan,
  Notification,
  Session,
  AvatarItem,
  UserInventory,
  Transaction,
} from '../../types';

// Helper to generate unique IDs
let idCounter = 1;
export const generateId = (prefix: string = 'test'): string => `${prefix}_${idCounter++}`;

// Helper to generate dates
export const generateDate = (daysAgo: number = 0): string => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString();
};

// User factory
export const createUser = (overrides: Partial<User> = {}): User => ({
  id: generateId('user'),
  email: `test${idCounter}@example.com`,
  created_at: generateDate(30),
  updated_at: generateDate(0),
  last_sign_in_at: generateDate(0),
  app_metadata: {},
  user_metadata: {},
  ...overrides,
});

// Profile factory
export const createProfile = (overrides: Partial<Profile> = {}): Profile => ({
  id: generateId('profile'),
  user_id: generateId('user'),
  username: `testuser${idCounter}`,
  display_name: `Test User ${idCounter}`,
  avatar_url: `https://avatars.example.com/${idCounter}`,
  bio: 'Test bio',
  privacy_settings: {
    profile_visibility: 'public',
    show_activity: true,
    allow_friend_requests: true,
    show_stats: true,
  },
  notification_preferences: {
    email_notifications: true,
    push_notifications: true,
    friend_requests: true,
    habit_reminders: true,
    achievement_alerts: true,
    social_interactions: true,
  },
  created_at: generateDate(30),
  updated_at: generateDate(0),
  ...overrides,
});

// Habit factory
export const createHabit = (overrides: Partial<Habit> = {}): Habit => ({
  id: generateId('habit'),
  user_id: generateId('user'),
  name: `Test Habit ${idCounter}`,
  description: 'A test habit description',
  category: 'health',
  frequency: {
    type: 'daily',
    days_of_week: [1, 2, 3, 4, 5], // Monday to Friday
  },
  target_value: 1,
  unit: 'times',
  reminder_time: '09:00',
  is_active: true,
  created_at: generateDate(14),
  updated_at: generateDate(0),
  ...overrides,
});

// Habit Progress factory
export const createHabitProgress = (overrides: Partial<HabitProgress> = {}): HabitProgress => ({
  id: generateId('progress'),
  habit_id: generateId('habit'),
  user_id: generateId('user'),
  date: generateDate(0),
  value: 1,
  notes: 'Completed successfully',
  mood: 4,
  created_at: generateDate(0),
  ...overrides,
});

// Friend factory
export const createFriend = (overrides: Partial<Friend> = {}): Friend => ({
  id: generateId('friend'),
  user_id: generateId('user'),
  friend_id: generateId('user'),
  status: 'accepted',
  created_at: generateDate(7),
  updated_at: generateDate(0),
  ...overrides,
});

// Challenge factory
export const createChallenge = (overrides: Partial<Challenge> = {}): Challenge => ({
  id: generateId('challenge'),
  creator_id: generateId('user'),
  name: `Test Challenge ${idCounter}`,
  description: 'A test challenge to build habits together',
  habit_category: 'fitness',
  start_date: generateDate(-7),
  end_date: generateDate(23), // 30 days total
  target_type: 'streak',
  target_value: 30,
  is_public: true,
  max_participants: 10,
  created_at: generateDate(8),
  updated_at: generateDate(0),
  ...overrides,
});

// Challenge Participant factory
export const createChallengeParticipant = (
  overrides: Partial<ChallengeParticipant> = {},
): ChallengeParticipant => ({
  id: generateId('participant'),
  challenge_id: generateId('challenge'),
  user_id: generateId('user'),
  progress: 7,
  rank: 1,
  joined_at: generateDate(7),
  ...overrides,
});

// Achievement factory
export const createAchievement = (overrides: Partial<Achievement> = {}): Achievement => ({
  id: generateId('achievement'),
  name: `Test Achievement ${idCounter}`,
  description: 'Complete a 7-day streak',
  icon_url: `https://icons.example.com/achievement${idCounter}.png`,
  category: 'streak',
  criteria: {
    type: 'consecutive_days',
    value: 7,
    habit_category: 'health',
  },
  points: 100,
  rarity: 'common',
  ...overrides,
});

// User Achievement factory
export const createUserAchievement = (
  overrides: Partial<UserAchievement> = {},
): UserAchievement => ({
  id: generateId('user_achievement'),
  user_id: generateId('user'),
  achievement_id: generateId('achievement'),
  unlocked_at: generateDate(1),
  progress: 100,
  ...overrides,
});

// Avatar factory
export const createAvatar = (overrides: Partial<Avatar> = {}): Avatar => ({
  id: generateId('avatar'),
  user_id: generateId('user'),
  name: `Test Avatar ${idCounter}`,
  personality_traits: {
    encouragement_style: 'cheerful',
    communication_frequency: 'medium',
    humor_level: 7,
    formality: 3,
  },
  appearance: {
    body_type: 'athletic',
    skin_tone: '#F5DEB3',
    hair_style: 'short',
    hair_color: '#4B0082',
    outfit_id: generateId('outfit'),
    accessories: [generateId('accessory')],
  },
  level: 5,
  experience: 2500,
  mood: 80,
  energy: 90,
  created_at: generateDate(30),
  updated_at: generateDate(0),
  ...overrides,
});

// Avatar Item factory
export const createAvatarItem = (overrides: Partial<AvatarItem> = {}): AvatarItem => ({
  id: generateId('item'),
  type: 'outfit',
  name: `Test Item ${idCounter}`,
  description: 'A stylish test item',
  rarity: 'common',
  cost_coins: 100,
  cost_gems: 10,
  image_url: `https://items.example.com/item${idCounter}.png`,
  ...overrides,
});

// User Inventory factory
export const createUserInventory = (overrides: Partial<UserInventory> = {}): UserInventory => ({
  id: generateId('inventory'),
  user_id: generateId('user'),
  item_id: generateId('item'),
  quantity: 1,
  acquired_at: generateDate(5),
  equipped: false,
  ...overrides,
});

// Subscription Plan factory
export const createSubscriptionPlan = (
  overrides: Partial<SubscriptionPlan> = {},
): SubscriptionPlan => ({
  id: generateId('plan'),
  name: `Test Plan ${idCounter}`,
  description: 'A test subscription plan',
  price_monthly: 9.99,
  price_yearly: 99.99,
  features: ['Unlimited habits', 'Advanced analytics', 'Custom avatars', 'Priority support'],
  limits: {
    max_habits: 100,
    max_friends: 500,
    max_challenges: 50,
    advanced_analytics: true,
    custom_avatars: true,
    priority_support: true,
  },
  trial_days: 7,
  ...overrides,
});

// Subscription factory
export const createSubscription = (overrides: Partial<Subscription> = {}): Subscription => ({
  id: generateId('subscription'),
  user_id: generateId('user'),
  plan_id: generateId('plan'),
  status: 'active',
  current_period_start: generateDate(0),
  current_period_end: generateDate(-30), // 30 days in future
  cancel_at_period_end: false,
  created_at: generateDate(60),
  updated_at: generateDate(0),
  ...overrides,
});

// Transaction factory
export const createTransaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: generateId('transaction'),
  user_id: generateId('user'),
  type: 'subscription',
  amount: 9.99,
  currency: 'USD',
  status: 'completed',
  description: 'Monthly subscription payment',
  metadata: {},
  created_at: generateDate(0),
  ...overrides,
});

// Notification factory
export const createNotification = (overrides: Partial<Notification> = {}): Notification => ({
  id: generateId('notification'),
  user_id: generateId('user'),
  type: 'achievement_unlocked',
  title: 'Achievement Unlocked!',
  message: 'You completed a 7-day streak!',
  data: {
    achievement_id: generateId('achievement'),
    points_earned: 100,
  },
  read: false,
  created_at: generateDate(0),
  ...overrides,
});

// Notification Preference factory
export const createNotificationPreference = (overrides: Partial<any> = {}): any => ({
  id: generateId('pref'),
  user_id: generateId('user'),
  push_enabled: true,
  email_enabled: true,
  in_app_enabled: true,
  habit_reminders: true,
  social_updates: true,
  achievement_alerts: true,
  challenge_updates: true,
  friend_requests: true,
  system_notifications: true,
  created_at: generateDate(0),
  ...overrides,
});

// Device factory
export const createDevice = (overrides: Partial<any> = {}): any => ({
  id: generateId('device'),
  user_id: generateId('user'),
  token: generateId('token'),
  platform: 'ios',
  device_name: 'Test Device',
  is_active: true,
  created_at: generateDate(0),
  ...overrides,
});

// Analytics factory
export const createAnalytics = (overrides: Partial<any> = {}): any => ({
  id: generateId('analytics'),
  habit_id: generateId('habit'),
  user_id: generateId('user'),
  period: '30d',
  completion_rate: 0.75,
  total_completions: 22,
  total_possible: 30,
  streak_current: 5,
  streak_longest: 15,
  average_value: 1.5,
  best_day: 'Monday',
  worst_day: 'Sunday',
  trend: 'improving',
  created_at: generateDate(0),
  ...overrides,
});

// Session factory
export const createSession = (overrides: Partial<Session> = {}): Session => {
  const user = createUser();
  return {
    access_token: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${generateId('token')}`,
    refresh_token: `refresh_${generateId('token')}`,
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user,
    ...overrides,
  };
};

// Batch creation helpers
export const createBatch = <T>(
  factory: (overrides?: Partial<T>) => T,
  count: number,
  overrides: Partial<T> = {},
): T[] => {
  return Array.from({ length: count }, () => factory(overrides));
};

// Preset data scenarios
export const testScenarios = {
  // New user with basic setup
  newUser: (): { user: User; profile: Profile; avatar: Avatar } => {
    const user = createUser();
    const profile = createProfile({ user_id: user.id });
    const avatar = createAvatar({ user_id: user.id });

    return { user, profile, avatar };
  },

  // Active user with habits and progress
  activeUser: (): { user: User; profile: Profile; habits: Habit[]; progress: HabitProgress[] } => {
    const user = createUser();
    const profile = createProfile({ user_id: user.id });
    const habits = createBatch(createHabit, 3, { user_id: user.id });
    const progress = habits.flatMap((habit) =>
      createBatch(createHabitProgress, 7, {
        habit_id: habit.id,
        user_id: user.id,
      }),
    );

    return { user, profile, habits, progress };
  },

  // Social user with friends and challenges
  socialUser: (): {
    user: User;
    profile: Profile;
    friends: Friend[];
    challenge: Challenge;
    participants: ChallengeParticipant[];
  } => {
    const user = createUser();
    const profile = createProfile({ user_id: user.id });
    const friends = createBatch(createFriend, 5, { user_id: user.id });
    const challenge = createChallenge({ creator_id: user.id });
    const participants = [
      createChallengeParticipant({
        challenge_id: challenge.id,
        user_id: user.id,
        rank: 1,
        progress: 15,
      }),
      ...friends.map((friend, index) =>
        createChallengeParticipant({
          challenge_id: challenge.id,
          user_id: friend.friend_id,
          rank: index + 2,
          progress: 15 - index,
        }),
      ),
    ];

    return { user, profile, friends, challenge, participants };
  },

  // Premium user with subscription
  premiumUser: (): {
    user: User;
    profile: Profile;
    plan: SubscriptionPlan;
    subscription: Subscription;
    avatar: Avatar;
  } => {
    const user = createUser();
    const profile = createProfile({ user_id: user.id });
    const plan = createSubscriptionPlan({
      name: 'Premium',
      price_monthly: 19.99,
    });
    const subscription = createSubscription({
      user_id: user.id,
      plan_id: plan.id,
      status: 'active',
    });
    const avatar = createAvatar({
      user_id: user.id,
      level: 20,
      experience: 15000,
    });

    return { user, profile, plan, subscription, avatar };
  },

  // User with achievements
  achiever: (): {
    user: User;
    profile: Profile;
    achievements: Achievement[];
    userAchievements: UserAchievement[];
  } => {
    const user = createUser();
    const profile = createProfile({ user_id: user.id });
    const achievements = [
      createAchievement({
        name: 'First Steps',
        category: 'milestone',
        points: 50,
        rarity: 'common',
      }),
      createAchievement({
        name: 'Week Warrior',
        category: 'streak',
        points: 200,
        rarity: 'rare',
      }),
      createAchievement({
        name: 'Social Butterfly',
        category: 'social',
        points: 500,
        rarity: 'epic',
      }),
    ];
    const userAchievements = achievements.map((achievement) =>
      createUserAchievement({
        user_id: user.id,
        achievement_id: achievement.id,
        progress: 100,
      }),
    );

    return { user, profile, achievements, userAchievements };
  },
};

// Reset ID counter for tests
export const resetIdCounter = (): void => {
  idCounter = 1;
};

// Export all factories
export const factories = {
  user: createUser,
  profile: createProfile,
  habit: createHabit,
  habitProgress: createHabitProgress,
  friend: createFriend,
  challenge: createChallenge,
  challengeParticipant: createChallengeParticipant,
  achievement: createAchievement,
  userAchievement: createUserAchievement,
  avatar: createAvatar,
  avatarItem: createAvatarItem,
  userInventory: createUserInventory,
  subscriptionPlan: createSubscriptionPlan,
  subscription: createSubscription,
  transaction: createTransaction,
  notification: createNotification,
  notificationPreference: createNotificationPreference,
  device: createDevice,
  analytics: createAnalytics,
  session: createSession,
};
