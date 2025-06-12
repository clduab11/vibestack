import { Request, Response, NextFunction } from 'express';

interface RateLimitOptions {
  maxRequests: number;
  windowMs: number;
}

// Simple in-memory rate limiter for testing
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export const rateLimitingMiddleware = (options: RateLimitOptions) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${req.ip}-${req.path}`;
    const now = Date.now();
    
    const record = requestCounts.get(key);
    
    if (!record || now > record.resetTime) {
      // Reset the counter
      requestCounts.set(key, {
        count: 1,
        resetTime: now + options.windowMs,
      });
      return next();
    }
    
    if (record.count >= options.maxRequests) {
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests, please try again later',
        },
      });
    }
    
    record.count++;
    next();
  };
};

// Reset function for testing
export const resetRateLimits = () => {
  requestCounts.clear();
};