import { Router } from 'express';
import { authRoutes } from './authenticationRoutes';
import { userRoutes } from './userManagementRoutes';
import { habitRoutes } from './habitRoutes';
import { analyticsRoutes } from './analyticsRoutes';
import { socialRoutes } from './socialRoutes';
import { notificationRoutes } from './notificationRoutes';

const router = Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Mount all route modules
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/habits', habitRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/social', socialRoutes);
router.use('/notifications', notificationRoutes);

// API info endpoint
router.get('/', (req, res) => {
  res.status(200).json({
    name: 'VibeStack API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      habits: '/api/habits',
      analytics: '/api/analytics',
      social: '/api/social',
      notifications: '/api/notifications',
      health: '/api/health',
    },
  });
});

export default router;
export {
  authRoutes,
  userRoutes,
  habitRoutes,
  analyticsRoutes,
  socialRoutes,
  notificationRoutes,
};