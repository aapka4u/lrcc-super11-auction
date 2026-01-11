import { kv } from '@vercel/kv';
import { NextRequest, NextResponse } from 'next/server';

// ============================================
// CONFIGURATION
// ============================================

export const RATE_LIMITS = {
  // Tournament creation - very strict
  TOURNAMENT_CREATE: { limit: 3, windowSeconds: 86400 }, // 3 per day

  // API calls - moderate
  API_READ: { limit: 1000, windowSeconds: 3600 }, // 1000/hour
  API_WRITE: { limit: 100, windowSeconds: 3600 }, // 100/hour

  // Auth attempts - strict to prevent brute force
  AUTH_ATTEMPT: { limit: 10, windowSeconds: 900 }, // 10 per 15 min

  // File uploads - moderate
  UPLOAD: { limit: 20, windowSeconds: 3600 }, // 20/hour
} as const;

export type RateLimitType = keyof typeof RATE_LIMITS;

// ============================================
// TYPES
// ============================================

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // Unix timestamp in ms
  limit: number;
}

export interface RateLimitHeaders {
  'X-RateLimit-Limit': string;
  'X-RateLimit-Remaining': string;
  'X-RateLimit-Reset': string;
}

// ============================================
// CORE RATE LIMITING (Atomic)
// ============================================

/**
 * Check and consume rate limit quota
 * Uses Redis INCR for atomic increment (no race conditions)
 */
export async function checkRateLimit(
  identifier: string,
  type: RateLimitType
): Promise<RateLimitResult> {
  const config = RATE_LIMITS[type];
  const { limit, windowSeconds } = config;

  const now = Math.floor(Date.now() / 1000);
  const windowStart = Math.floor(now / windowSeconds) * windowSeconds;
  const key = `ratelimit:${type}:${identifier}:${windowStart}`;

  try {
    // Atomic increment - returns new value after increment
    const count = await kv.incr(key);

    // Set TTL on first request in window (only if count is 1)
    if (count === 1) {
      // Add buffer to TTL to prevent edge cases
      await kv.expire(key, windowSeconds + 60);
    }

    const resetAt = (windowStart + windowSeconds) * 1000;

    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      resetAt,
      limit,
    };
  } catch (error) {
    // On KV failure, allow request but log error
    console.error('Rate limit check failed:', error);
    return {
      allowed: true,
      remaining: limit,
      resetAt: Date.now() + windowSeconds * 1000,
      limit,
    };
  }
}

/**
 * Check rate limit without consuming quota (peek)
 */
export async function peekRateLimit(
  identifier: string,
  type: RateLimitType
): Promise<RateLimitResult> {
  const config = RATE_LIMITS[type];
  const { limit, windowSeconds } = config;

  const now = Math.floor(Date.now() / 1000);
  const windowStart = Math.floor(now / windowSeconds) * windowSeconds;
  const key = `ratelimit:${type}:${identifier}:${windowStart}`;

  try {
    const count = await kv.get<number>(key) || 0;
    const resetAt = (windowStart + windowSeconds) * 1000;

    return {
      allowed: count < limit,
      remaining: Math.max(0, limit - count),
      resetAt,
      limit,
    };
  } catch (error) {
    console.error('Rate limit peek failed:', error);
    return {
      allowed: true,
      remaining: limit,
      resetAt: Date.now() + windowSeconds * 1000,
      limit,
    };
  }
}

// ============================================
// IP EXTRACTION
// ============================================

/**
 * Extract client IP from request with proxy support
 */
export function getClientIP(request: NextRequest): string {
  // Vercel sets x-forwarded-for
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    // Take first IP (client), not proxy IPs
    const firstIP = forwarded.split(',')[0].trim();
    if (isValidIP(firstIP)) {
      return firstIP;
    }
  }

  // Fallback headers
  const realIP = request.headers.get('x-real-ip');
  if (realIP && isValidIP(realIP)) {
    return realIP;
  }

  // Cloudflare
  const cfIP = request.headers.get('cf-connecting-ip');
  if (cfIP && isValidIP(cfIP)) {
    return cfIP;
  }

  // Last resort - should not happen in production
  return 'unknown';
}

function isValidIP(ip: string): boolean {
  // Basic IPv4/IPv6 validation
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  return ipv4Regex.test(ip) || ipv6Regex.test(ip) || ip.includes('::');
}

// ============================================
// RESPONSE HELPERS
// ============================================

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(result: RateLimitResult): RateLimitHeaders {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.resetAt.toString(),
  };
}

/**
 * Create rate limit exceeded response
 */
export function rateLimitExceededResponse(result: RateLimitResult): NextResponse {
  const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);

  return NextResponse.json(
    {
      error: 'Rate limit exceeded',
      code: 'RATE_LIMITED',
      retryAfter,
      resetAt: result.resetAt,
    },
    {
      status: 429,
      headers: {
        ...getRateLimitHeaders(result),
        'Retry-After': retryAfter.toString(),
      },
    }
  );
}

// ============================================
// MIDDLEWARE HELPER
// ============================================

/**
 * Rate limit middleware for API routes
 */
export async function withRateLimit(
  request: NextRequest,
  type: RateLimitType,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  const ip = getClientIP(request);
  const result = await checkRateLimit(ip, type);

  if (!result.allowed) {
    return rateLimitExceededResponse(result);
  }

  const response = await handler();

  // Add rate limit headers to successful response
  const headers = getRateLimitHeaders(result);
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

// ============================================
// COMPOSITE IDENTIFIER HELPERS
// ============================================

/**
 * Create identifier combining IP and tournament for per-tournament limits
 */
export function getTournamentRateLimitId(ip: string, tournamentId: string): string {
  return `${ip}:${tournamentId}`;
}

/**
 * Create identifier for auth attempts (includes tournament to track per-tournament brute force)
 */
export function getAuthRateLimitId(ip: string, tournamentId: string): string {
  return `auth:${ip}:${tournamentId}`;
}
