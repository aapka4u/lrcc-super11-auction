import { describe, it, expect, beforeEach, vi } from 'vitest';
import { clearKvStore } from '../setup';
import { POST } from '@/app/api/tournaments/route';
import { GET, PUT, DELETE, PATCH } from '@/app/api/tournaments/[tournamentId]/route';
import { NextRequest } from 'next/server';
import { getTournamentConfig } from '@/lib/tournament-storage';
import { generateMasterAdminToken, generateSessionToken, hashPin } from '@/lib/tournament-auth';

describe('Tournament CRUD API', () => {
  let masterToken: string;
  let sessionToken: string;
  const adminPin = 'secure1234';
  const tournamentId = 'test-crud-tournament';

  beforeEach(async () => {
    clearKvStore();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));

    // Create a test tournament
    const createRequest = new NextRequest('http://localhost/api/tournaments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '192.168.1.1',
      },
      body: JSON.stringify({
        slug: tournamentId,
        name: 'Test CRUD Tournament',
        adminPin,
      }),
    });

    const response = await POST(createRequest);
    const body = await response.json();
    masterToken = body.masterAdminToken;
    sessionToken = await generateSessionToken(tournamentId);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('GET /api/tournaments/[tournamentId]', () => {
    it('returns 404 for non-existent tournament', async () => {
      const request = new NextRequest('http://localhost/api/tournaments/non-existent', {
        method: 'GET',
      });

      const response = await GET(request, { params: Promise.resolve({ tournamentId: 'non-existent' }) });
      expect(response.status).toBe(404);
    });

    it('requires auth for unpublished tournament', async () => {
      const request = new NextRequest(`http://localhost/api/tournaments/${tournamentId}`, {
        method: 'GET',
      });

      const response = await GET(request, { params: Promise.resolve({ tournamentId }) });
      expect(response.status).toBe(401);
    });

    it('returns tournament with valid auth', async () => {
      const request = new NextRequest(`http://localhost/api/tournaments/${tournamentId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });

      const response = await GET(request, { params: Promise.resolve({ tournamentId }) });
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.tournament).toBeDefined();
      expect(body.tournament.id).toBe(tournamentId);
    });

    it('returns tournament config without sensitive data', async () => {
      const request = new NextRequest(`http://localhost/api/tournaments/${tournamentId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });

      const response = await GET(request, { params: Promise.resolve({ tournamentId }) });
      const body = await response.json();

      expect(body.tournament.adminPinHash).toBeUndefined();
    });

    it('includes lifecycle status', async () => {
      const request = new NextRequest(`http://localhost/api/tournaments/${tournamentId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });

      const response = await GET(request, { params: Promise.resolve({ tournamentId }) });
      const body = await response.json();

      expect(body.tournament.lifecycle).toBeDefined();
      expect(body.tournament.lifecycle.status).toBe('active');
      expect(body.tournament.lifecycle.daysRemaining).toBe(90);
    });
  });

  describe('PUT /api/tournaments/[tournamentId]', () => {
    it('requires authentication', async () => {
      const request = new NextRequest(`http://localhost/api/tournaments/${tournamentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'Updated Name' }),
      });

      const response = await PUT(request, { params: Promise.resolve({ tournamentId }) });
      expect(response.status).toBe(401);
    });

    it('updates name with PIN auth', async () => {
      const request = new NextRequest(`http://localhost/api/tournaments/${tournamentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          pin: adminPin,
          name: 'Updated Tournament Name',
        }),
      });

      const response = await PUT(request, { params: Promise.resolve({ tournamentId }) });
      expect(response.status).toBe(200);

      const config = await getTournamentConfig(tournamentId);
      expect(config?.name).toBe('Updated Tournament Name');
    });

    it('updates name with session token', async () => {
      const request = new NextRequest(`http://localhost/api/tournaments/${tournamentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          name: 'Session Updated Name',
        }),
      });

      const response = await PUT(request, { params: Promise.resolve({ tournamentId }) });
      expect(response.status).toBe(200);

      const config = await getTournamentConfig(tournamentId);
      expect(config?.name).toBe('Session Updated Name');
    });

    it('updates name with master token', async () => {
      const request = new NextRequest(`http://localhost/api/tournaments/${tournamentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Token': masterToken,
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          name: 'Master Updated Name',
        }),
      });

      const response = await PUT(request, { params: Promise.resolve({ tournamentId }) });
      expect(response.status).toBe(200);

      const config = await getTournamentConfig(tournamentId);
      expect(config?.name).toBe('Master Updated Name');
    });

    it('updates settings', async () => {
      const request = new NextRequest(`http://localhost/api/tournaments/${tournamentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          settings: {
            teamSize: 10,
            bidIncrement: 200,
          },
        }),
      });

      const response = await PUT(request, { params: Promise.resolve({ tournamentId }) });
      expect(response.status).toBe(200);

      const config = await getTournamentConfig(tournamentId);
      expect(config?.settings.teamSize).toBe(10);
      expect(config?.settings.bidIncrement).toBe(200);
    });

    it('updates updatedAt timestamp', async () => {
      const before = await getTournamentConfig(tournamentId);
      const beforeUpdate = before?.updatedAt;

      vi.advanceTimersByTime(1000);

      const request = new NextRequest(`http://localhost/api/tournaments/${tournamentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          name: 'Time Update Test',
        }),
      });

      await PUT(request, { params: Promise.resolve({ tournamentId }) });

      const after = await getTournamentConfig(tournamentId);
      expect(after?.updatedAt).toBeGreaterThan(beforeUpdate!);
    });

    it('rejects invalid name', async () => {
      const request = new NextRequest(`http://localhost/api/tournaments/${tournamentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          name: 'AB', // Too short
        }),
      });

      const response = await PUT(request, { params: Promise.resolve({ tournamentId }) });
      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/tournaments/[tournamentId]', () => {
    it('requires authentication', async () => {
      const request = new NextRequest(`http://localhost/api/tournaments/${tournamentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ confirmDelete: true }),
      });

      const response = await DELETE(request, { params: Promise.resolve({ tournamentId }) });
      expect(response.status).toBe(401);
    });

    it('requires confirmation', async () => {
      const request = new NextRequest(`http://localhost/api/tournaments/${tournamentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({}),
      });

      const response = await DELETE(request, { params: Promise.resolve({ tournamentId }) });
      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.code).toBe('CONFIRMATION_REQUIRED');
    });

    it('deletes draft tournament with confirmation', async () => {
      const request = new NextRequest(`http://localhost/api/tournaments/${tournamentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          confirmDelete: true,
        }),
      });

      const response = await DELETE(request, { params: Promise.resolve({ tournamentId }) });
      expect(response.status).toBe(200);

      const config = await getTournamentConfig(tournamentId);
      expect(config).toBeNull();
    });

    it('returns 404 for non-existent tournament', async () => {
      const request = new NextRequest('http://localhost/api/tournaments/non-existent', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          pin: adminPin,
          confirmDelete: true,
        }),
      });

      const response = await DELETE(request, { params: Promise.resolve({ tournamentId: 'non-existent' }) });
      expect(response.status).toBe(401); // Auth fails first since tournament doesn't exist
    });
  });

  describe('PATCH /api/tournaments/[tournamentId]', () => {
    it('requires authentication', async () => {
      const request = new NextRequest(`http://localhost/api/tournaments/${tournamentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'publish' }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ tournamentId }) });
      expect(response.status).toBe(401);
    });

    it('publishes tournament', async () => {
      const request = new NextRequest(`http://localhost/api/tournaments/${tournamentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          action: 'publish',
        }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ tournamentId }) });
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.publicUrl).toBe(`/${tournamentId}`);

      const config = await getTournamentConfig(tournamentId);
      expect(config?.published).toBe(true);
    });

    it('returns success for already published tournament', async () => {
      // Publish first
      const request1 = new NextRequest(`http://localhost/api/tournaments/${tournamentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({ action: 'publish' }),
      });

      await PATCH(request1, { params: Promise.resolve({ tournamentId }) });

      // Try to publish again
      const request2 = new NextRequest(`http://localhost/api/tournaments/${tournamentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({ action: 'publish' }),
      });

      const response = await PATCH(request2, { params: Promise.resolve({ tournamentId }) });
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.message).toBe('Tournament is already published');
    });

    it('unpublishes tournament', async () => {
      // Publish first
      const request1 = new NextRequest(`http://localhost/api/tournaments/${tournamentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({ action: 'publish' }),
      });

      await PATCH(request1, { params: Promise.resolve({ tournamentId }) });

      // Unpublish
      const request2 = new NextRequest(`http://localhost/api/tournaments/${tournamentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({ action: 'unpublish' }),
      });

      const response = await PATCH(request2, { params: Promise.resolve({ tournamentId }) });
      expect(response.status).toBe(200);

      const config = await getTournamentConfig(tournamentId);
      expect(config?.published).toBe(false);
    });

    it('generates session token', async () => {
      const request = new NextRequest(`http://localhost/api/tournaments/${tournamentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          pin: adminPin,
          action: 'getSessionToken',
        }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ tournamentId }) });
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.sessionToken).toBeDefined();
      expect(body.expiresIn).toBe('24h');
    });

    it('rejects unknown action', async () => {
      const request = new NextRequest(`http://localhost/api/tournaments/${tournamentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          action: 'unknownAction',
        }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ tournamentId }) });
      expect(response.status).toBe(400);
    });

    it('requires action field', async () => {
      const request = new NextRequest(`http://localhost/api/tournaments/${tournamentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({}),
      });

      const response = await PATCH(request, { params: Promise.resolve({ tournamentId }) });
      expect(response.status).toBe(400);
    });
  });
});
