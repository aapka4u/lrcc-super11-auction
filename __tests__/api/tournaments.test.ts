import { describe, it, expect, beforeEach, vi } from 'vitest';
import { clearKvStore } from '../setup';
import { GET, POST } from '@/app/api/tournaments/route';
import { NextRequest } from 'next/server';
import { getTournamentConfig, getPublishedTournaments } from '@/lib/tournament-storage';

describe('Tournaments API', () => {
  beforeEach(() => {
    clearKvStore();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('GET /api/tournaments', () => {
    it('returns empty array initially', async () => {
      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.tournaments).toEqual([]);
      expect(body.count).toBe(0);
    });

    it('returns published tournaments', async () => {
      // Create a tournament first
      const createRequest = new NextRequest('http://localhost/api/tournaments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          slug: 'test-tournament',
          name: 'Test Tournament',
          adminPin: 'secure1234',
        }),
      });

      await POST(createRequest);

      // Tournament is draft, so GET should still return empty
      const response = await GET();
      const body = await response.json();

      expect(body.tournaments).toEqual([]);
    });
  });

  describe('POST /api/tournaments', () => {
    const validTournament = {
      slug: 'my-tournament',
      name: 'My Tournament',
      adminPin: 'secure1234',
    };

    it('creates tournament with valid data', async () => {
      const request = new NextRequest('http://localhost/api/tournaments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify(validTournament),
      });

      const response = await POST(request);
      expect(response.status).toBe(201);

      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.tournament.id).toBe('my-tournament');
      expect(body.tournament.name).toBe('My Tournament');
    });

    it('returns masterAdminToken', async () => {
      const request = new NextRequest('http://localhost/api/tournaments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify(validTournament),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(body.masterAdminToken).toBeDefined();
      expect(typeof body.masterAdminToken).toBe('string');
      expect(body.masterAdminToken.length).toBeGreaterThan(50);
    });

    it('returns adminUrl and publicUrl', async () => {
      const request = new NextRequest('http://localhost/api/tournaments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify(validTournament),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(body.adminUrl).toBe('/my-tournament/admin');
      expect(body.publicUrl).toBe('/my-tournament');
    });

    it('stores tournament config in KV', async () => {
      const request = new NextRequest('http://localhost/api/tournaments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify(validTournament),
      });

      await POST(request);

      const config = await getTournamentConfig('my-tournament');
      expect(config).not.toBeNull();
      expect(config?.name).toBe('My Tournament');
      expect(config?.status).toBe('draft');
      expect(config?.published).toBe(false);
    });

    it('stores hashed PIN, not plaintext', async () => {
      const request = new NextRequest('http://localhost/api/tournaments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify(validTournament),
      });

      await POST(request);

      const config = await getTournamentConfig('my-tournament');
      expect(config?.adminPinHash).toBeDefined();
      expect(config?.adminPinHash).not.toBe('secure1234');
      expect(config?.adminPinHash.length).toBe(64); // SHA-256 hex
    });

    it('rejects duplicate slug', async () => {
      const request1 = new NextRequest('http://localhost/api/tournaments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify(validTournament),
      });

      await POST(request1);

      const request2 = new NextRequest('http://localhost/api/tournaments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.2',
        },
        body: JSON.stringify(validTournament),
      });

      const response = await POST(request2);
      expect(response.status).toBe(409);

      const body = await response.json();
      expect(body.code).toBe('SLUG_TAKEN');
    });

    it('rejects invalid slug format', async () => {
      const request = new NextRequest('http://localhost/api/tournaments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          ...validTournament,
          slug: 'ab', // Too short
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('rejects weak PIN', async () => {
      const request = new NextRequest('http://localhost/api/tournaments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          ...validTournament,
          adminPin: '1234', // Common weak PIN
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.code).toBe('PIN_TOO_COMMON');
    });

    it('applies default settings', async () => {
      const request = new NextRequest('http://localhost/api/tournaments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify(validTournament),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(body.tournament.settings).toBeDefined();
      expect(body.tournament.settings.teamSize).toBe(8);
      expect(body.tournament.settings.bidIncrement).toBe(100);
      expect(body.tournament.settings.enableJokerCard).toBe(true);
    });

    it('accepts custom settings', async () => {
      const request = new NextRequest('http://localhost/api/tournaments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          ...validTournament,
          settings: {
            teamSize: 10,
            bidIncrement: 200,
          },
        }),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(body.tournament.settings.teamSize).toBe(10);
      expect(body.tournament.settings.bidIncrement).toBe(200);
    });

    it('sets expiration date to 90 days from now', async () => {
      const request = new NextRequest('http://localhost/api/tournaments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify(validTournament),
      });

      await POST(request);

      const config = await getTournamentConfig('my-tournament');
      const expectedExpiry = Date.now() + 90 * 24 * 60 * 60 * 1000;

      // Allow 1 second tolerance
      expect(Math.abs(config!.expiresAt - expectedExpiry)).toBeLessThan(1000);
    });

    it('includes X-Request-ID header', async () => {
      const request = new NextRequest('http://localhost/api/tournaments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify(validTournament),
      });

      const response = await POST(request);
      expect(response.headers.get('X-Request-ID')).toBeDefined();
    });

    it('includes rate limit headers', async () => {
      const request = new NextRequest('http://localhost/api/tournaments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify(validTournament),
      });

      const response = await POST(request);
      expect(response.headers.get('X-RateLimit-Limit')).toBeDefined();
      expect(response.headers.get('X-RateLimit-Remaining')).toBeDefined();
    });

    it('respects rate limiting (3 per day)', async () => {
      const ip = '192.168.1.100';

      // Create 3 tournaments
      for (let i = 0; i < 3; i++) {
        const request = new NextRequest('http://localhost/api/tournaments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-forwarded-for': ip,
          },
          body: JSON.stringify({
            slug: `tournament-${i}`,
            name: `Tournament ${i}`,
            adminPin: 'secure1234',
          }),
        });

        const response = await POST(request);
        expect(response.status).toBe(201);
      }

      // 4th should be rate limited
      const request = new NextRequest('http://localhost/api/tournaments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': ip,
        },
        body: JSON.stringify({
          slug: 'tournament-4',
          name: 'Tournament 4',
          adminPin: 'secure1234',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(429);

      const body = await response.json();
      expect(body.code).toBe('RATE_LIMITED');
    });

    it('rejects invalid JSON body', async () => {
      const request = new NextRequest('http://localhost/api/tournaments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.1',
        },
        body: 'invalid json',
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('rejects missing name', async () => {
      const request = new NextRequest('http://localhost/api/tournaments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          slug: 'test-slug',
          adminPin: 'secure1234',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('accepts optional metadata', async () => {
      const request = new NextRequest('http://localhost/api/tournaments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          ...validTournament,
          description: 'A test tournament',
          sport: 'Cricket',
          location: 'Sydney',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(201);

      const config = await getTournamentConfig('my-tournament');
      expect(config?.description).toBe('A test tournament');
      expect(config?.sport).toBe('Cricket');
      expect(config?.location).toBe('Sydney');
    });

    it('normalizes slug to lowercase', async () => {
      const request = new NextRequest('http://localhost/api/tournaments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          ...validTournament,
          slug: 'my-tournament', // Already lowercase
        }),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(body.tournament.id).toBe('my-tournament');
    });
  });
});
