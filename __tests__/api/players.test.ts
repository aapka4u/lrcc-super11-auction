import { describe, it, expect, beforeEach, vi } from 'vitest';
import { clearKvStore } from '../setup';
import { POST as CreateTournament } from '@/app/api/tournaments/route';
import { PATCH as PatchTournament } from '@/app/api/tournaments/[tournamentId]/route';
import { GET, POST, PUT, DELETE } from '@/app/api/[tournamentId]/players/route';
import { NextRequest } from 'next/server';
import {
  getTournamentPlayers,
  setTournamentPlayers,
  getPlayerProfiles,
} from '@/lib/tournament-storage';
import { generateSessionToken } from '@/lib/tournament-auth';
import { TournamentPlayer } from '@/lib/tournament-types';

describe('Players API', () => {
  let sessionToken: string;
  const adminPin = 'secure1234';
  const tournamentId = 'test-players-tournament';

  const initialPlayers: TournamentPlayer[] = [
    { id: 'player1', name: 'Player One', role: 'Batsman', category: 'APLUS' },
    { id: 'player2', name: 'Player Two', role: 'Bowler', category: 'BASE' },
  ];

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
        name: 'Test Players Tournament',
        adminPin,
      }),
    });

    await CreateTournament(createRequest);
    sessionToken = await generateSessionToken(tournamentId);

    // Add initial players
    await setTournamentPlayers(tournamentId, initialPlayers);

    // Publish the tournament
    const publishRequest = new NextRequest(`http://localhost/api/tournaments/${tournamentId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
        'x-forwarded-for': '192.168.1.1',
      },
      body: JSON.stringify({ action: 'publish' }),
    });

    await PatchTournament(publishRequest, { params: Promise.resolve({ tournamentId }) });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('GET /api/[tournamentId]/players', () => {
    it('returns players list for published tournament', async () => {
      const request = new NextRequest(`http://localhost/api/${tournamentId}/players`, {
        method: 'GET',
      });

      const response = await GET(request, { params: Promise.resolve({ tournamentId }) });
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.players).toBeDefined();
      expect(body.players.length).toBe(2);
      expect(body.count).toBe(2);
    });

    it('returns 404 for non-existent tournament', async () => {
      const request = new NextRequest('http://localhost/api/nonexistent/players', {
        method: 'GET',
      });

      const response = await GET(request, { params: Promise.resolve({ tournamentId: 'nonexistent' }) });
      expect(response.status).toBe(404);
    });

    it('includes profile data merged with players', async () => {
      const request = new NextRequest(`http://localhost/api/${tournamentId}/players`, {
        method: 'GET',
      });

      const response = await GET(request, { params: Promise.resolve({ tournamentId }) });
      const body = await response.json();

      expect(body.profiles).toBeDefined();
    });

    it('requires auth for unpublished tournament', async () => {
      // Create unpublished tournament
      const createRequest = new NextRequest('http://localhost/api/tournaments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.2',
        },
        body: JSON.stringify({
          slug: 'unpublished-tournament',
          name: 'Unpublished Tournament',
          adminPin,
        }),
      });

      await CreateTournament(createRequest);

      const request = new NextRequest('http://localhost/api/unpublished-tournament/players', {
        method: 'GET',
      });

      const response = await GET(request, { params: Promise.resolve({ tournamentId: 'unpublished-tournament' }) });
      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/[tournamentId]/players - Add player', () => {
    it('requires authentication', async () => {
      const request = new NextRequest(`http://localhost/api/${tournamentId}/players`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          id: 'player3',
          name: 'Player Three',
          role: 'All-rounder',
          category: 'BASE',
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ tournamentId }) });
      expect(response.status).toBe(401);
    });

    it('adds new player', async () => {
      const request = new NextRequest(`http://localhost/api/${tournamentId}/players`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          id: 'player3',
          name: 'Player Three',
          role: 'All-rounder',
          category: 'BASE',
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ tournamentId }) });
      expect(response.status).toBe(201);

      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.player.id).toBe('player3');
    });

    it('validates player schema', async () => {
      const request = new NextRequest(`http://localhost/api/${tournamentId}/players`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          id: 'player3',
          name: 'P', // Too short
          role: 'InvalidRole',
          category: 'BASE',
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ tournamentId }) });
      expect(response.status).toBe(400);
    });

    it('rejects duplicate player ID', async () => {
      const request = new NextRequest(`http://localhost/api/${tournamentId}/players`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          id: 'player1', // Already exists
          name: 'Duplicate Player',
          role: 'Batsman',
          category: 'BASE',
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ tournamentId }) });
      expect(response.status).toBe(400);
    });

    it('sets default availability', async () => {
      const request = new NextRequest(`http://localhost/api/${tournamentId}/players`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          id: 'player3',
          name: 'Player Three',
          role: 'All-rounder',
          category: 'BASE',
        }),
      });

      await POST(request, { params: Promise.resolve({ tournamentId }) });

      const players = await getTournamentPlayers(tournamentId);
      const newPlayer = players.find(p => p.id === 'player3');
      expect(newPlayer?.availability).toBe('full');
    });
  });

  describe('POST /api/[tournamentId]/players - UPDATE_PROFILE', () => {
    it('updates player image', async () => {
      const request = new NextRequest(`http://localhost/api/${tournamentId}/players`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          action: 'UPDATE_PROFILE',
          playerId: 'player1',
          image: 'https://example.com/player1.jpg',
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ tournamentId }) });
      expect(response.status).toBe(200);

      const profiles = await getPlayerProfiles(tournamentId);
      expect(profiles.player1?.image).toBe('https://example.com/player1.jpg');
    });

    it('updates cricHeroesUrl', async () => {
      const request = new NextRequest(`http://localhost/api/${tournamentId}/players`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          action: 'UPDATE_PROFILE',
          playerId: 'player1',
          cricHeroesUrl: 'https://cricheroes.com/player/123',
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ tournamentId }) });
      expect(response.status).toBe(200);

      const profiles = await getPlayerProfiles(tournamentId);
      expect(profiles.player1?.cricHeroesUrl).toBe('https://cricheroes.com/player/123');
    });

    it('rejects non-HTTPS image URL', async () => {
      const request = new NextRequest(`http://localhost/api/${tournamentId}/players`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          action: 'UPDATE_PROFILE',
          playerId: 'player1',
          image: 'http://insecure.com/image.jpg',
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ tournamentId }) });
      expect(response.status).toBe(400);
    });

    it('accepts base64 image data', async () => {
      const smallBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      const request = new NextRequest(`http://localhost/api/${tournamentId}/players`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          action: 'UPDATE_PROFILE',
          playerId: 'player1',
          image: smallBase64,
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ tournamentId }) });
      expect(response.status).toBe(200);
    });

    it('requires playerId', async () => {
      const request = new NextRequest(`http://localhost/api/${tournamentId}/players`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          action: 'UPDATE_PROFILE',
          image: 'https://example.com/image.jpg',
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ tournamentId }) });
      expect(response.status).toBe(400);
    });

    it('returns 404 for non-existent player', async () => {
      const request = new NextRequest(`http://localhost/api/${tournamentId}/players`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          action: 'UPDATE_PROFILE',
          playerId: 'nonexistent',
          image: 'https://example.com/image.jpg',
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ tournamentId }) });
      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/[tournamentId]/players', () => {
    it('requires authentication', async () => {
      const request = new NextRequest(`http://localhost/api/${tournamentId}/players`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          playerId: 'player1',
          name: 'Updated Name',
        }),
      });

      const response = await PUT(request, { params: Promise.resolve({ tournamentId }) });
      expect(response.status).toBe(401);
    });

    it('updates player data', async () => {
      const request = new NextRequest(`http://localhost/api/${tournamentId}/players`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          playerId: 'player1',
          name: 'Updated Player Name',
          role: 'All-rounder',
        }),
      });

      const response = await PUT(request, { params: Promise.resolve({ tournamentId }) });
      expect(response.status).toBe(200);

      const players = await getTournamentPlayers(tournamentId);
      const player = players.find(p => p.id === 'player1');
      expect(player?.name).toBe('Updated Player Name');
      expect(player?.role).toBe('All-rounder');
    });

    it('requires playerId', async () => {
      const request = new NextRequest(`http://localhost/api/${tournamentId}/players`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          name: 'Updated Name',
        }),
      });

      const response = await PUT(request, { params: Promise.resolve({ tournamentId }) });
      expect(response.status).toBe(400);
    });

    it('returns 404 for non-existent player', async () => {
      const request = new NextRequest(`http://localhost/api/${tournamentId}/players`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          playerId: 'nonexistent',
          name: 'Updated Name',
        }),
      });

      const response = await PUT(request, { params: Promise.resolve({ tournamentId }) });
      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/[tournamentId]/players', () => {
    it('requires authentication', async () => {
      const request = new NextRequest(`http://localhost/api/${tournamentId}/players`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          playerId: 'player1',
        }),
      });

      const response = await DELETE(request, { params: Promise.resolve({ tournamentId }) });
      expect(response.status).toBe(401);
    });

    it('removes player', async () => {
      const request = new NextRequest(`http://localhost/api/${tournamentId}/players`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          playerId: 'player1',
        }),
      });

      const response = await DELETE(request, { params: Promise.resolve({ tournamentId }) });
      expect(response.status).toBe(200);

      const players = await getTournamentPlayers(tournamentId);
      expect(players.find(p => p.id === 'player1')).toBeUndefined();
      expect(players.length).toBe(1);
    });

    it('requires playerId', async () => {
      const request = new NextRequest(`http://localhost/api/${tournamentId}/players`, {
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
    });

    it('returns 404 for non-existent player', async () => {
      const request = new NextRequest(`http://localhost/api/${tournamentId}/players`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          playerId: 'nonexistent',
        }),
      });

      const response = await DELETE(request, { params: Promise.resolve({ tournamentId }) });
      expect(response.status).toBe(404);
    });
  });
});
