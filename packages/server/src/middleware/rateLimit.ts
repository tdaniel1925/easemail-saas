// ===========================================
// RATE LIMITING MIDDLEWARE
// In-memory rate limiting with plan-based limits
// ===========================================

import { Request, Response, NextFunction } from 'express';

// Rate limit configuration by plan
const RATE_LIMITS: Record<string, { requests: number; window: number }> = {
  free: { requests: 100, window: 60 * 1000 },      // 100 requests per minute
  pro: { requests: 1000, window: 60 * 1000 },     // 1000 requests per minute
  enterprise: { requests: 10000, window: 60 * 1000 }, // 10000 requests per minute
  default: { requests: 60, window: 60 * 1000 },   // 60 requests per minute (no auth)
};

// In-memory store for rate limiting
// In production, use Redis for distributed rate limiting
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60 * 1000); // Clean up every minute

// ===========================================
// RATE LIMIT MIDDLEWARE
// ===========================================

export function rateLimit(options?: {
  keyGenerator?: (req: Request) => string;
  skip?: (req: Request) => boolean;
}) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip if configured
    if (options?.skip?.(req)) {
      return next();
    }

    // Generate rate limit key
    const key = options?.keyGenerator?.(req) || getRateLimitKey(req);

    // Get plan-based limits
    const plan = req.apiKey?.tenant?.plan || 'default';
    const limits = RATE_LIMITS[plan] || RATE_LIMITS.default;

    const now = Date.now();
    let entry = rateLimitStore.get(key);

    // Initialize or reset if window expired
    if (!entry || entry.resetAt < now) {
      entry = {
        count: 0,
        resetAt: now + limits.window,
      };
    }

    // Increment count
    entry.count++;
    rateLimitStore.set(key, entry);

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', limits.requests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, limits.requests - entry.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetAt / 1000));

    // Check if over limit
    if (entry.count > limits.requests) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader('Retry-After', retryAfter);

      return res.status(429).json({
        success: false,
        error: 'Too many requests',
        retryAfter,
        limit: limits.requests,
        plan,
        hint: plan === 'free' ? 'Upgrade to Pro for higher limits' : undefined,
      });
    }

    next();
  };
}

// ===========================================
// KEY GENERATORS
// ===========================================

function getRateLimitKey(req: Request): string {
  // Use API key if available, otherwise use IP
  if (req.apiKey) {
    return `apikey:${req.apiKey.id}`;
  }

  // Fall back to IP address
  const ip = req.ip ||
    req.headers['x-forwarded-for']?.toString().split(',')[0] ||
    req.socket.remoteAddress ||
    'unknown';

  return `ip:${ip}`;
}

// Rate limit by tenant
export function rateLimitByTenant() {
  return rateLimit({
    keyGenerator: (req) => {
      const tenantId = req.tenantId || req.params.tenantId || 'unknown';
      return `tenant:${tenantId}`;
    },
  });
}

// Rate limit by API key only
export function rateLimitByApiKey() {
  return rateLimit({
    keyGenerator: (req) => {
      if (req.apiKey) {
        return `apikey:${req.apiKey.id}`;
      }
      return `nokey:${req.ip || 'unknown'}`;
    },
  });
}

// ===========================================
// SPECIFIC RATE LIMITERS
// ===========================================

// Stricter limit for expensive operations (AI, send email)
export function strictRateLimit() {
  return (req: Request, res: Response, next: NextFunction) => {
    const plan = req.apiKey?.tenant?.plan || 'default';
    const limits: Record<string, { requests: number; window: number }> = {
      free: { requests: 10, window: 60 * 1000 },
      pro: { requests: 100, window: 60 * 1000 },
      enterprise: { requests: 1000, window: 60 * 1000 },
      default: { requests: 5, window: 60 * 1000 },
    };

    const key = `strict:${req.apiKey?.id || req.ip || 'unknown'}`;
    const limit = limits[plan] || limits.default;

    const now = Date.now();
    let entry = rateLimitStore.get(key);

    if (!entry || entry.resetAt < now) {
      entry = { count: 0, resetAt: now + limit.window };
    }

    entry.count++;
    rateLimitStore.set(key, entry);

    res.setHeader('X-RateLimit-Limit', limit.requests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, limit.requests - entry.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetAt / 1000));

    if (entry.count > limit.requests) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader('Retry-After', retryAfter);

      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded for this operation',
        retryAfter,
        limit: limit.requests,
      });
    }

    next();
  };
}

// Auth endpoints rate limit (prevent brute force)
export function authRateLimit() {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `auth:${req.ip || 'unknown'}`;
    const limit = { requests: 20, window: 60 * 1000 }; // 20 per minute

    const now = Date.now();
    let entry = rateLimitStore.get(key);

    if (!entry || entry.resetAt < now) {
      entry = { count: 0, resetAt: now + limit.window };
    }

    entry.count++;
    rateLimitStore.set(key, entry);

    if (entry.count > limit.requests) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      return res.status(429).json({
        success: false,
        error: 'Too many authentication attempts',
        retryAfter,
      });
    }

    next();
  };
}
