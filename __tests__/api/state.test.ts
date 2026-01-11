import { describe, it, expect, beforeEach, vi } from 'vitest';
import { clearKvStore } from '../setup';
import { POST as CreateTournament } from '@/app/api/tournaments/route';
import { PATCH as PatchTournament } from '@/app/api/tournaments/[tournamentId]/route';
import { GET, POST } from '@/app/api/[tournamentId]/state/route';
import { NextRequest } from 'next/server';
import {
  getTournamentState,
  setTournamentTeams,
  setTournamentPlayers,
} from '@/lib/tournament-storage';
import { generateSessionToken } from '@/lib/tournament-auth';
import { TournamentTeam, TournamentPlayer } from '@/lib/tournament-types';

describe('Tournament State API', () => {
  let sessionToken: string;
  const adminPin = 'secure1234';
  const tournamentId = 'test-state-tournament';

  const teams: TournamentTeam[] = [
    { id: 'team_alpha', name: 'Team Alpha', budget: 10000, color: '#ff0000' },
    { id: 'team_beta', name: 'Team Beta', budget: 10000, color: '#0000ff' },
  ];

  const players: TournamentPlayer[] = [
    { id: 'player1', name: 'Player One', role: 'Batsman', category: 'APLUS' },
    { id: 'player2', name: 'Player Two', role: 'Bowler', category: 'BASE' },
    { id: 'player3', name: 'Player Three', role: 'All-rounder', category: 'BASE' },
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
        name: 'Test State Tournament',
        adminPin,
      }),
    });

    await CreateTournament(createRequest);
    sessionToken = await generateSessionToken(tournamentId);

    // Add teams and players
    await setTournamentTeams(tournamentId, teams);
    await setTournamentPlayers(tournamentId, players);

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

  describe('GET /api/[tournamentId]/state', () => {
    it('returns 404 for non-existent tournament', async () => {
      const request = new NextRequest('http://localhost/api/non-existent/state', {
        method: 'GET',
      });

      const response = await GET(request, { params: Promise.resolve({ tournamentId: 'non-existent' }) });
      expect(response.status).toBe(404);
    });

    it('returns initial state for published tournament', async () => {
      const request = new NextRequest(`http://localhost/api/${tournamentId}/state`, {
        method: 'GET',
      });

      const response = await GET(request, { params: Promise.resolve({ tournamentId }) });
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.status).toBe('IDLE');
      expect(body.currentPlayer).toBeNull();
    });

    it('returns teams with budget info', async () => {
      const request = new NextRequest(`http://localhost/api/${tournamentId}/state`, {
        method: 'GET',
      });

      const response = await GET(request, { params: Promise.resolve({ tournamentId }) });
      const body = await response.json();

      expect(body.teams).toBeDefined();
      expect(body.teams.length).toBe(2);
      expect(body.teams[0].maxBid).toBeDefined();
      expect(body.teams[0].remainingBudget).toBe(10000);
    });

    it('includes tournament info', async () => {
      const request = new NextRequest(`http://localhost/api/${tournamentId}/state`, {
        method: 'GET',
      });

      const response = await GET(request, { params: Promise.resolve({ tournamentId }) });
      const body = await response.json();

      expect(body.tournament).toBeDefined();
      expect(body.tournament.id).toBe(tournamentId);
      expect(body.tournament.settings).toBeDefined();
    });

    it('includes player counts', async () => {
      const request = new NextRequest(`http://localhost/api/${tournamentId}/state`, {
        method: 'GET',
      });

      const response = await GET(request, { params: Promise.resolve({ tournamentId }) });
      const body = await response.json();

      expect(body.totalPlayers).toBe(3);
      expect(body.soldCount).toBe(0);
    });
  });

  describe('POST /api/[tournamentId]/state - START_AUCTION', () => {
    it('requires authentication', async () => {
      const request = new NextRequest(`http://localhost/api/${tournamentId}/state`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          action: 'START_AUCTION',
          playerId: 'player1',
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ tournamentId }) });
      expect(response.status).toBe(401);
    });

    it('starts auction for player', async () => {
      const request = new NextRequest(`http://localhost/api/${tournamentId}/state`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          action: 'START_AUCTION',
          playerId: 'player1',
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ tournamentId }) });
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.state.status).toBe('LIVE');
      expect(body.state.currentPlayerId).toBe('player1');
    });

    it('rejects non-existent player', async () => {
      const request = new NextRequest(`http://localhost/api/${tournamentId}/state`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          action: 'START_AUCTION',
          playerId: 'nonexistent',
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ tournamentId }) });
      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/[tournamentId]/state - SOLD', () => {
    beforeEach(async () => {
      // Start auction for player1 first
      const startRequest = new NextRequest(`http://localhost/api/${tournamentId}/state`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          action: 'START_AUCTION',
          playerId: 'player1',
        }),
      });

      await POST(startRequest, { params: Promise.resolve({ tournamentId }) });
    });

    it('sells player to team', async () => {
      const request = new NextRequest(`http://localhost/api/${tournamentId}/state`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          action: 'SOLD',
          teamId: 'team_alpha',
          soldPrice: 3000,
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ tournamentId }) });
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.state.status).toBe('SOLD');
      expect(body.state.soldToTeamId).toBe('team_alpha');
      expect(body.state.soldPlayers).toContain('player1');
      expect(body.state.soldPrices.player1).toBe(3000);
    });

    it('rejects price below base price', async () => {
      const request = new NextRequest(`http://localhost/api/${tournamentId}/state`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          action: 'SOLD',
          teamId: 'team_alpha',
          soldPrice: 1000, // Base price for APLUS is 2500
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ tournamentId }) });
      expect(response.status).toBe(400);
    });

    it('rejects price not multiple of 100', async () => {
      const request = new NextRequest(`http://localhost/api/${tournamentId}/state`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          action: 'SOLD',
          teamId: 'team_alpha',
          soldPrice: 2550,
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ tournamentId }) });
      expect(response.status).toBe(400);
    });

    it('updates team spent', async () => {
      const request = new NextRequest(`http://localhost/api/${tournamentId}/state`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          action: 'SOLD',
          teamId: 'team_alpha',
          soldPrice: 3000,
        }),
      });

      await POST(request, { params: Promise.resolve({ tournamentId }) });

      const state = await getTournamentState(tournamentId);
      expect(state?.teamSpent.team_alpha).toBe(3000);
    });

    it('is idempotent (prevents double-click)', async () => {
      // Sell player
      const request1 = new NextRequest(`http://localhost/api/${tournamentId}/state`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          action: 'SOLD',
          teamId: 'team_alpha',
          soldPrice: 3000,
        }),
      });

      await POST(request1, { params: Promise.resolve({ tournamentId }) });

      // Try to sell again
      const request2 = new NextRequest(`http://localhost/api/${tournamentId}/state`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          action: 'SOLD',
          teamId: 'team_beta',
          soldPrice: 4000,
        }),
      });

      const response = await POST(request2, { params: Promise.resolve({ tournamentId }) });
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.message).toBe('Already processed');

      // Verify player is still with first team
      const state = await getTournamentState(tournamentId);
      expect(state?.rosters.team_alpha).toContain('player1');
      expect(state?.rosters.team_beta || []).not.toContain('player1');
    });
  });

  describe('POST /api/[tournamentId]/state - UNSOLD', () => {
    beforeEach(async () => {
      const startRequest = new NextRequest(`http://localhost/api/${tournamentId}/state`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          action: 'START_AUCTION',
          playerId: 'player2',
        }),
      });

      await POST(startRequest, { params: Promise.resolve({ tournamentId }) });
    });

    it('marks player as unsold', async () => {
      const request = new NextRequest(`http://localhost/api/${tournamentId}/state`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          action: 'UNSOLD',
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ tournamentId }) });
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.state.status).toBe('IDLE');
      expect(body.state.unsoldPlayers).toContain('player2');
    });
  });

  describe('POST /api/[tournamentId]/state - PAUSE/UNPAUSE', () => {
    it('pauses auction', async () => {
      const request = new NextRequest(`http://localhost/api/${tournamentId}/state`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          action: 'PAUSE',
          message: 'Taking a break',
          duration: 300,
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ tournamentId }) });
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.state.status).toBe('PAUSED');
      expect(body.state.pauseMessage).toBe('Taking a break');
    });

    it('unpauses auction', async () => {
      // Pause first
      const pauseRequest = new NextRequest(`http://localhost/api/${tournamentId}/state`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({ action: 'PAUSE' }),
      });

      await POST(pauseRequest, { params: Promise.resolve({ tournamentId }) });

      // Unpause
      const unpauseRequest = new NextRequest(`http://localhost/api/${tournamentId}/state`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({ action: 'UNPAUSE' }),
      });

      const response = await POST(unpauseRequest, { params: Promise.resolve({ tournamentId }) });
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.state.status).toBe('IDLE');
    });
  });

  describe('POST /api/[tournamentId]/state - CLEAR', () => {
    it('clears current auction state', async () => {
      // Start auction
      const startRequest = new NextRequest(`http://localhost/api/${tournamentId}/state`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          action: 'START_AUCTION',
          playerId: 'player1',
        }),
      });

      await POST(startRequest, { params: Promise.resolve({ tournamentId }) });

      // Clear
      const clearRequest = new NextRequest(`http://localhost/api/${tournamentId}/state`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({ action: 'CLEAR' }),
      });

      const response = await POST(clearRequest, { params: Promise.resolve({ tournamentId }) });
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.state.status).toBe('IDLE');
      expect(body.state.currentPlayerId).toBeNull();
    });
  });

  describe('POST /api/[tournamentId]/state - RESET', () => {
    it('requires confirmation', async () => {
      const request = new NextRequest(`http://localhost/api/${tournamentId}/state`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({ action: 'RESET' }),
      });

      const response = await POST(request, { params: Promise.resolve({ tournamentId }) });
      expect(response.status).toBe(400);
    });

    it('resets all auction data with confirmation', async () => {
      // Make some changes first
      const startRequest = new NextRequest(`http://localhost/api/${tournamentId}/state`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          action: 'START_AUCTION',
          playerId: 'player1',
        }),
      });

      await POST(startRequest, { params: Promise.resolve({ tournamentId }) });

      const soldRequest = new NextRequest(`http://localhost/api/${tournamentId}/state`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          action: 'SOLD',
          teamId: 'team_alpha',
          soldPrice: 3000,
        }),
      });

      await POST(soldRequest, { params: Promise.resolve({ tournamentId }) });

      // Reset
      const resetRequest = new NextRequest(`http://localhost/api/${tournamentId}/state`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          action: 'RESET',
          confirmReset: true,
        }),
      });

      const response = await POST(resetRequest, { params: Promise.resolve({ tournamentId }) });
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.state.status).toBe('IDLE');
      expect(body.state.soldPlayers).toEqual([]);
      expect(body.state.rosters).toEqual({});
    });
  });

  describe('POST /api/[tournamentId]/state - VERIFY', () => {
    it('verifies credentials without changing state', async () => {
      const request = new NextRequest(`http://localhost/api/${tournamentId}/state`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          pin: adminPin,
          action: 'VERIFY',
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ tournamentId }) });
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.success).toBe(true);
    });

    it('rejects invalid credentials', async () => {
      const request = new NextRequest(`http://localhost/api/${tournamentId}/state`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          pin: 'wrongpin',
          action: 'VERIFY',
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ tournamentId }) });
      expect(response.status).toBe(401);
    });
  });
});
