// Rate limiting implementation for API protection
import { Redis } from 'ioredis';

// In-memory fallback for development
class InMemoryRateLimiter {
  private store = new Map<string, { count: number; resetTime: number }>();

  async increment(key: string, windowSeconds: number): Promise<{ count: number; resetTime: number }> {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const existing = this.store.get(key);

    if (!existing || now > existing.resetTime) {
      // New window
      const resetTime = now + windowMs;
      this.store.set(key, { count: 1, resetTime });
      return { count: 1, resetTime };
    } else {
      // Increment existing
      existing.count++;
      return existing;
    }
  }

  async cleanup(): Promise<void> {
    const now = Date.now();
    for (const [key, value] of this.store.entries()) {
      if (now > value.resetTime) {
        this.store.delete(key);
      }
    }
  }
}

class RateLimiter {
  private redis: Redis | null = null;
  private inMemory = new InMemoryRateLimiter();

  constructor() {
    // Initialize Redis if available
    if (process.env.REDIS_URL) {
      try {
        this.redis = new Redis(process.env.REDIS_URL);
      } catch (error) {
        console.warn('Redis not available, using in-memory rate limiting:', error);
      }
    }

    // Cleanup in-memory store periodically
    setInterval(() => {
      this.inMemory.cleanup();
    }, 60000); // Every minute
  }

  async checkLimit(
    key: string,
    maxRequests: number,
    windowSeconds: number
  ): Promise<{
    allowed: boolean;
    count: number;
    remaining: number;
    resetTime: number;
    retryAfter?: number;
  }> {
    try {
      let count: number;
      let resetTime: number;

      if (this.redis) {
        const result = await this.redisIncrement(key, windowSeconds);
        count = result.count;
        resetTime = result.resetTime;
      } else {
        const result = await this.inMemory.increment(key, windowSeconds);
        count = result.count;
        resetTime = result.resetTime;
      }

      const allowed = count <= maxRequests;
      const remaining = Math.max(0, maxRequests - count);
      const retryAfter = allowed ? undefined : Math.ceil((resetTime - Date.now()) / 1000);

      return {
        allowed,
        count,
        remaining,
        resetTime,
        retryAfter,
      };
    } catch (error) {
      console.error('Rate limiting error:', error);
      // Fail open - allow request if rate limiting fails
      return {
        allowed: true,
        count: 0,
        remaining: maxRequests,
        resetTime: Date.now() + windowSeconds * 1000,
      };
    }
  }

  private async redisIncrement(
    key: string,
    windowSeconds: number
  ): Promise<{ count: number; resetTime: number }> {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const resetTime = now + windowMs;

    // Use Redis pipeline for atomic operations
    const pipeline = this.redis!.pipeline();
    pipeline.incr(key);
    pipeline.expire(key, windowSeconds);
    
    const results = await pipeline.exec();
    const count = results?.[0]?.[1] as number || 1;

    return { count, resetTime };
  }
}

// Singleton instance
const rateLimiter = new RateLimiter();

// Export rate limiting function
export async function rateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number
): Promise<{
  allowed: boolean;
  count: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}> {
  return rateLimiter.checkLimit(key, maxRequests, windowSeconds);
}

// Predefined rate limit configurations
export const RateLimitConfigs = {
  // Authentication endpoints
  LOGIN: { max: 5, window: 900 }, // 5 attempts per 15 minutes
  SIGNUP: { max: 3, window: 3600 }, // 3 attempts per hour
  PASSWORD_RESET: { max: 3, window: 3600 }, // 3 attempts per hour

  // API endpoints
  API_GENERAL: { max: 100, window: 3600 }, // 100 requests per hour
  API_UPLOAD: { max: 10, window: 3600 }, // 10 uploads per hour
  API_EXPORT: { max: 5, window: 3600 }, // 5 exports per hour

  // PHI access
  PHI_ACCESS: { max: 50, window: 3600 }, // 50 PHI accesses per hour
  CLAIM_CREATION: { max: 20, window: 3600 }, // 20 claims per hour

  // Search and queries
  SEARCH: { max: 200, window: 3600 }, // 200 searches per hour
  
  // Notifications
  NOTIFICATION_SEND: { max: 100, window: 3600 }, // 100 notifications per hour
} as const;

// Helper function to get rate limit key
export function getRateLimitKey(
  type: keyof typeof RateLimitConfigs,
  identifier: string
): string {
  return `rate_limit:${type}:${identifier}`;
}

// Middleware helper for Express-style rate limiting
export function createRateLimitMiddleware(
  type: keyof typeof RateLimitConfigs,
  getIdentifier: (req: any) => string = (req) => req.ip || 'unknown'
) {
  return async (req: any, res: any, next: any) => {
    const config = RateLimitConfigs[type];
    const identifier = getIdentifier(req);
    const key = getRateLimitKey(type, identifier);

    const result = await rateLimit(key, config.max, config.window);

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', config.max);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000));

    if (!result.allowed) {
      res.setHeader('Retry-After', result.retryAfter || config.window);
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests',
          retryAfter: result.retryAfter,
        },
      });
    }

    next();
  };
}