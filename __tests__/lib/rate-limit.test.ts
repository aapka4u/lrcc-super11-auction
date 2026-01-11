import { describe, it, expect, beforeEach, vi } from 'vitest';
import { clearKvStore } from '../setup';
import {
  checkRateLimit,
  peekRateLimit,
  getClientIP,
  getRateLimitHeaders,
  getTournamentRateLimitId,
  getAuthRateLimitId,
  RATE_LIMITS,
} from '@/lib/rate-limit';
import { NextRequest } from 'next/server';

describe('Rate Limiting', () => {
  beforeEach(() => {
    clearKvStore();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('checkRateLimit', () => {
    it('allows first request in window', async () => {
      const result = await checkRateLimit('user1', 'TOURNAMENT_CREATE');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(RATE_LIMITS.TOURNAMENT_CREATE.limit - 1);
    });

    it('allows requests within limit', async () => {
      // First 3 requests should be allowed for TOURNAMENT_CREATE (limit: 3)
      for (let i = 0; i < 3; i++) {
        const result = await checkRateLimit('user1', 'TOURNAMENT_CREATE');
        expect(result.allowed).toBe(true);
      }
    });

    it('blocks request exceeding limit', async () => {
      // Use all 3 allowed requests
      for (let i = 0; i < 3; i++) {
        await checkRateLimit('user1', 'TOURNAMENT_CREATE');
      }
      // 4th request should be blocked
      const result = await checkRateLimit('user1', 'TOURNAMENT_CREATE');
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('remaining count decrements correctly', async () => {
      const limit = RATE_LIMITS.TOURNAMENT_CREATE.limit;

      const result1 = await checkRateLimit('user1', 'TOURNAMENT_CREATE');
      expect(result1.remaining).toBe(limit - 1);

      const result2 = await checkRateLimit('user1', 'TOURNAMENT_CREATE');
      expect(result2.remaining).toBe(limit - 2);

      const result3 = await checkRateLimit('user1', 'TOURNAMENT_CREATE');
      expect(result3.remaining).toBe(limit - 3);
    });

    it('resets after window expires', async () => {
      // Use all requests
      for (let i = 0; i < 3; i++) {
        await checkRateLimit('user1', 'TOURNAMENT_CREATE');
      }

      // Should be blocked now
      let result = await checkRateLimit('user1', 'TOURNAMENT_CREATE');
      expect(result.allowed).toBe(false);

      // Advance time past window (86400 seconds = 1 day)
      vi.advanceTimersByTime(86401 * 1000);

      // Should be allowed again
      result = await checkRateLimit('user1', 'TOURNAMENT_CREATE');
      expect(result.allowed).toBe(true);
    });

    it('different identifiers have separate limits', async () => {
      // User1 uses all requests
      for (let i = 0; i < 3; i++) {
        await checkRateLimit('user1', 'TOURNAMENT_CREATE');
      }

      // User2 should still be allowed
      const result = await checkRateLimit('user2', 'TOURNAMENT_CREATE');
      expect(result.allowed).toBe(true);
    });

    it('calculates resetAt correctly', async () => {
      const now = Math.floor(Date.now() / 1000);
      const windowSeconds = RATE_LIMITS.TOURNAMENT_CREATE.windowSeconds;
      const windowStart = Math.floor(now / windowSeconds) * windowSeconds;
      const expectedResetAt = (windowStart + windowSeconds) * 1000;

      const result = await checkRateLimit('user1', 'TOURNAMENT_CREATE');
      expect(result.resetAt).toBe(expectedResetAt);
    });

    it('enforces AUTH_ATTEMPT limit (10 per 15 min)', async () => {
      // Use all 10 allowed attempts
      for (let i = 0; i < 10; i++) {
        const result = await checkRateLimit('user1', 'AUTH_ATTEMPT');
        expect(result.allowed).toBe(true);
      }

      // 11th attempt should be blocked
      const result = await checkRateLimit('user1', 'AUTH_ATTEMPT');
      expect(result.allowed).toBe(false);
    });

    it('returns correct limit value', async () => {
      const result = await checkRateLimit('user1', 'TOURNAMENT_CREATE');
      expect(result.limit).toBe(RATE_LIMITS.TOURNAMENT_CREATE.limit);
    });
  });

  describe('peekRateLimit', () => {
    it('does not consume quota', async () => {
      // Peek should not affect count
      await peekRateLimit('user1', 'TOURNAMENT_CREATE');
      await peekRateLimit('user1', 'TOURNAMENT_CREATE');

      // First actual request should still have full remaining
      const result = await checkRateLimit('user1', 'TOURNAMENT_CREATE');
      expect(result.remaining).toBe(RATE_LIMITS.TOURNAMENT_CREATE.limit - 1);
    });

    it('returns correct state after consumption', async () => {
      await checkRateLimit('user1', 'TOURNAMENT_CREATE');

      const peek = await peekRateLimit('user1', 'TOURNAMENT_CREATE');
      expect(peek.remaining).toBe(RATE_LIMITS.TOURNAMENT_CREATE.limit - 1);
    });
  });

  describe('getClientIP', () => {
    it('extracts IP from x-forwarded-for header', () => {
      const request = new NextRequest('http://localhost/api/test', {
        headers: { 'x-forwarded-for': '192.168.1.1, 10.0.0.1' },
      });
      const ip = getClientIP(request);
      expect(ip).toBe('192.168.1.1');
    });

    it('extracts IP from x-real-ip header', () => {
      const request = new NextRequest('http://localhost/api/test', {
        headers: { 'x-real-ip': '192.168.1.2' },
      });
      const ip = getClientIP(request);
      expect(ip).toBe('192.168.1.2');
    });

    it('extracts IP from cf-connecting-ip header', () => {
      const request = new NextRequest('http://localhost/api/test', {
        headers: { 'cf-connecting-ip': '192.168.1.3' },
      });
      const ip = getClientIP(request);
      expect(ip).toBe('192.168.1.3');
    });

    it('prefers x-forwarded-for over other headers', () => {
      const request = new NextRequest('http://localhost/api/test', {
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'x-real-ip': '192.168.1.2',
        },
      });
      const ip = getClientIP(request);
      expect(ip).toBe('192.168.1.1');
    });

    it('returns unknown for no IP headers', () => {
      const request = new NextRequest('http://localhost/api/test');
      const ip = getClientIP(request);
      expect(ip).toBe('unknown');
    });
  });

  describe('getRateLimitHeaders', () => {
    it('returns correct header format', () => {
      const result = {
        allowed: true,
        remaining: 5,
        resetAt: 1704067200000,
        limit: 10,
      };

      const headers = getRateLimitHeaders(result);
      expect(headers['X-RateLimit-Limit']).toBe('10');
      expect(headers['X-RateLimit-Remaining']).toBe('5');
      expect(headers['X-RateLimit-Reset']).toBe('1704067200000');
    });
  });

  describe('Identifier Helpers', () => {
    it('getTournamentRateLimitId combines IP and tournament', () => {
      const id = getTournamentRateLimitId('192.168.1.1', 'tournament1');
      expect(id).toBe('192.168.1.1:tournament1');
    });

    it('getAuthRateLimitId creates auth-specific identifier', () => {
      const id = getAuthRateLimitId('192.168.1.1', 'tournament1');
      expect(id).toBe('auth:192.168.1.1:tournament1');
    });
  });

  describe('Concurrent Requests (Atomic Test)', () => {
    it('handles concurrent requests atomically', async () => {
      vi.useRealTimers(); // Need real async for this test

      // Fire 10 concurrent requests (limit is 3 for TOURNAMENT_CREATE)
      const promises = Array(10).fill(null).map(() =>
        checkRateLimit('concurrent-user', 'TOURNAMENT_CREATE')
      );

      const results = await Promise.all(promises);

      // Exactly 3 should be allowed
      const allowed = results.filter(r => r.allowed).length;
      expect(allowed).toBe(3);

      // Cleanup
      vi.useFakeTimers();
    });
  });
});
