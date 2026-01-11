import { describe, it, expect, beforeEach, vi } from 'vitest';
import { clearKvStore } from '../setup';
import { POST as CreateTournament } from '@/app/api/tournaments/route';
import { PATCH as PatchTournament } from '@/app/api/tournaments/[tournamentId]/route';
import { GET, POST, PUT, DELETE } from '@/app/api/[tournamentId]/teams/route';
import { NextRequest } from 'next/server';
import {
  getTournamentTeams,
  setTournamentTeams,
  getTeamProfiles,
} from '@/lib/tournament-storage';
import { generateSessionToken } from '@/lib/tournament-auth';
import { TournamentTeam } from '@/lib/tournament-types';

describe('Teams API', () => {
  let sessionToken: string;
  const adminPin = 'secure1234';
  const tournamentId = 'test-teams-tournament';

  const initialTeams: TournamentTeam[] = [
    { id: 'team_alpha', name: 'Team Alpha', budget: 10000, color: '#ff0000' },
    { id: 'team_beta', name: 'Team Beta', budget: 10000, color: '#0000ff' },
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
        name: 'Test Teams Tournament',
        adminPin,
      }),
    });

    await CreateTournament(createRequest);
    sessionToken = await generateSessionToken(tournamentId);

    // Add initial teams
    await setTournamentTeams(tournamentId, initialTeams);

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

  describe('GET /api/[tournamentId]/teams', () => {
    it('returns teams list for published tournament', async () => {
      const request = new NextRequest(`http://localhost/api/${tournamentId}/teams`, {
        method: 'GET',
      });

      const response = await GET(request, { params: Promise.resolve({ tournamentId }) });
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.teams).toBeDefined();
      expect(body.teams.length).toBe(2);
      expect(body.count).toBe(2);
    });

    it('returns 404 for non-existent tournament', async () => {
      const request = new NextRequest('http://localhost/api/nonexistent/teams', {
        method: 'GET',
      });

      const response = await GET(request, { params: Promise.resolve({ tournamentId: 'nonexistent' }) });
      expect(response.status).toBe(404);
    });

    it('includes roster size and spent', async () => {
      const request = new NextRequest(`http://localhost/api/${tournamentId}/teams`, {
        method: 'GET',
      });

      const response = await GET(request, { params: Promise.resolve({ tournamentId }) });
      const body = await response.json();

      expect(body.teams[0].rosterSize).toBeDefined();
      expect(body.teams[0].spent).toBeDefined();
      expect(body.teams[0].remainingBudget).toBeDefined();
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
          slug: 'unpublished-teams',
          name: 'Unpublished Teams Tournament',
          adminPin,
        }),
      });

      await CreateTournament(createRequest);

      const request = new NextRequest('http://localhost/api/unpublished-teams/teams', {
        method: 'GET',
      });

      const response = await GET(request, { params: Promise.resolve({ tournamentId: 'unpublished-teams' }) });
      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/[tournamentId]/teams - Add team', () => {
    it('requires authentication', async () => {
      const request = new NextRequest(`http://localhost/api/${tournamentId}/teams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          id: 'team_gamma',
          name: 'Team Gamma',
          budget: 10000,
          color: '#00ff00',
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ tournamentId }) });
      expect(response.status).toBe(401);
    });

    it('adds new team', async () => {
      const request = new NextRequest(`http://localhost/api/${tournamentId}/teams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          id: 'team_gamma',
          name: 'Team Gamma',
          budget: 10000,
          color: '#00ff00',
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ tournamentId }) });
      expect(response.status).toBe(201);

      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.team.id).toBe('team_gamma');
    });

    it('validates team schema', async () => {
      const request = new NextRequest(`http://localhost/api/${tournamentId}/teams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          id: 'Team-Invalid', // Invalid format (uppercase, hyphen)
          name: 'Team Invalid',
          budget: 10000,
          color: '#00ff00',
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ tournamentId }) });
      expect(response.status).toBe(400);
    });

    it('rejects duplicate team ID', async () => {
      const request = new NextRequest(`http://localhost/api/${tournamentId}/teams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          id: 'team_alpha', // Already exists
          name: 'Duplicate Team',
          budget: 10000,
          color: '#00ff00',
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ tournamentId }) });
      expect(response.status).toBe(400);
    });

    it('rejects negative budget', async () => {
      const request = new NextRequest(`http://localhost/api/${tournamentId}/teams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          id: 'team_gamma',
          name: 'Team Gamma',
          budget: -1000,
          color: '#00ff00',
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ tournamentId }) });
      expect(response.status).toBe(400);
    });

    it('rejects invalid color format', async () => {
      const request = new NextRequest(`http://localhost/api/${tournamentId}/teams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          id: 'team_gamma',
          name: 'Team Gamma',
          budget: 10000,
          color: 'red', // Invalid - should be hex
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ tournamentId }) });
      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/[tournamentId]/teams - UPDATE_LOGO', () => {
    it('updates team logo', async () => {
      const request = new NextRequest(`http://localhost/api/${tournamentId}/teams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          action: 'UPDATE_LOGO',
          teamId: 'team_alpha',
          logo: 'https://example.com/logo.png',
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ tournamentId }) });
      expect(response.status).toBe(200);

      const profiles = await getTeamProfiles(tournamentId);
      expect(profiles.team_alpha?.logo).toBe('https://example.com/logo.png');
    });

    it('rejects non-HTTPS logo URL', async () => {
      const request = new NextRequest(`http://localhost/api/${tournamentId}/teams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          action: 'UPDATE_LOGO',
          teamId: 'team_alpha',
          logo: 'http://insecure.com/logo.png',
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ tournamentId }) });
      expect(response.status).toBe(400);
    });

    it('accepts base64 logo', async () => {
      const smallBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      const request = new NextRequest(`http://localhost/api/${tournamentId}/teams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          action: 'UPDATE_LOGO',
          teamId: 'team_alpha',
          logo: smallBase64,
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ tournamentId }) });
      expect(response.status).toBe(200);
    });

    it('requires teamId', async () => {
      const request = new NextRequest(`http://localhost/api/${tournamentId}/teams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          action: 'UPDATE_LOGO',
          logo: 'https://example.com/logo.png',
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ tournamentId }) });
      expect(response.status).toBe(400);
    });

    it('returns 404 for non-existent team', async () => {
      const request = new NextRequest(`http://localhost/api/${tournamentId}/teams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          action: 'UPDATE_LOGO',
          teamId: 'nonexistent',
          logo: 'https://example.com/logo.png',
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ tournamentId }) });
      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/[tournamentId]/teams', () => {
    it('requires authentication', async () => {
      const request = new NextRequest(`http://localhost/api/${tournamentId}/teams`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          teamId: 'team_alpha',
          name: 'Updated Name',
        }),
      });

      const response = await PUT(request, { params: Promise.resolve({ tournamentId }) });
      expect(response.status).toBe(401);
    });

    it('updates team data', async () => {
      const request = new NextRequest(`http://localhost/api/${tournamentId}/teams`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          teamId: 'team_alpha',
          name: 'Updated Team Alpha',
          budget: 12000,
        }),
      });

      const response = await PUT(request, { params: Promise.resolve({ tournamentId }) });
      expect(response.status).toBe(200);

      const teams = await getTournamentTeams(tournamentId);
      const team = teams.find(t => t.id === 'team_alpha');
      expect(team?.name).toBe('Updated Team Alpha');
      expect(team?.budget).toBe(12000);
    });

    it('requires teamId', async () => {
      const request = new NextRequest(`http://localhost/api/${tournamentId}/teams`, {
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

    it('returns 404 for non-existent team', async () => {
      const request = new NextRequest(`http://localhost/api/${tournamentId}/teams`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          teamId: 'nonexistent',
          name: 'Updated Name',
        }),
      });

      const response = await PUT(request, { params: Promise.resolve({ tournamentId }) });
      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/[tournamentId]/teams', () => {
    it('requires authentication', async () => {
      const request = new NextRequest(`http://localhost/api/${tournamentId}/teams`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          teamId: 'team_alpha',
        }),
      });

      const response = await DELETE(request, { params: Promise.resolve({ tournamentId }) });
      expect(response.status).toBe(401);
    });

    it('removes team from draft tournament', async () => {
      // Create a draft tournament
      const createRequest = new NextRequest('http://localhost/api/tournaments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.2',
        },
        body: JSON.stringify({
          slug: 'draft-tournament',
          name: 'Draft Tournament',
          adminPin,
        }),
      });

      await CreateTournament(createRequest);
      const draftToken = await generateSessionToken('draft-tournament');

      // Add teams to draft tournament
      await setTournamentTeams('draft-tournament', initialTeams);

      const request = new NextRequest('http://localhost/api/draft-tournament/teams', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${draftToken}`,
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          teamId: 'team_alpha',
        }),
      });

      const response = await DELETE(request, { params: Promise.resolve({ tournamentId: 'draft-tournament' }) });
      expect(response.status).toBe(200);

      const teams = await getTournamentTeams('draft-tournament');
      expect(teams.find(t => t.id === 'team_alpha')).toBeUndefined();
      expect(teams.length).toBe(1);
    });

    it('requires teamId', async () => {
      const request = new NextRequest(`http://localhost/api/${tournamentId}/teams`, {
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

    it('returns 404 for non-existent team', async () => {
      // Create a draft tournament
      const createRequest = new NextRequest('http://localhost/api/tournaments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.3',
        },
        body: JSON.stringify({
          slug: 'another-draft',
          name: 'Another Draft',
          adminPin,
        }),
      });

      await CreateTournament(createRequest);
      const draftToken = await generateSessionToken('another-draft');

      const request = new NextRequest('http://localhost/api/another-draft/teams', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${draftToken}`,
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          teamId: 'nonexistent',
        }),
      });

      const response = await DELETE(request, { params: Promise.resolve({ tournamentId: 'another-draft' }) });
      expect(response.status).toBe(404);
    });
  });
});
