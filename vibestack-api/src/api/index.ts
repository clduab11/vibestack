import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import routes from './routes';
import { errorHandlingMiddleware } from '../middleware/errorHandlingMiddleware';
import { securityHeadersMiddleware } from '../middleware/securityHeadersMiddleware';
import { csrfProtectionMiddleware } from '../middleware/csrfProtectionMiddleware';

// Create Express app
const app: Application = express();

// Trust proxy for accurate IP addresses
app.set('trust proxy', true);

// Basic middleware
app.use(helmet()); // Security headers
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
}));
app.use(compression()); // Compress responses
app.use(express.json({ limit: '10mb' })); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Custom security middleware
app.use(securityHeadersMiddleware);

// CSRF protection for state-changing operations
app.use(csrfProtectionMiddleware);

// Mount API routes
app.use('/api', routes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'The requested resource was not found',
    },
  });
});

// Global error handler
app.use(errorHandlingMiddleware);

// Export app for testing and server startup
export default app;