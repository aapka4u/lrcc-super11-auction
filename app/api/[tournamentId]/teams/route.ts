import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { handleError, NotFoundError, UnauthorizedError, BadRequestError } from '@/lib/errors';
import { checkRateLimit, getClientIP, getAuthRateLimitId } from '@/lib/rate-limit';
import {
  verifySessionToken,
  verifyMasterAdminToken,
  verifyPinHash,
  extractCredentials,
} from '@/lib/tournament-auth';
import { logAudit } from '@/lib/audit';
import {
  getTournamentConfig,
  getTournamentTeams,
  setTournamentTeams,
  getTeamProfiles,
  setTeamProfiles,
  updateTeamProfile,
  getTournamentState,
} from '@/lib/tournament-storage';
import {
  isTournamentExpired,
  isTournamentReadOnly,
} from '@/lib/tournament-lifecycle';
import {
  TournamentTeam,
  TournamentTeamProfile,
} from '@/lib/tournament-types';
import { TeamSchema, validate, formatValidationErrors } from '@/lib/schemas';

// ============================================
// Helper: Verify admin access
// ============================================

async function verifyAdminAccess(
  request: NextRequest,
  tournamentId: string,
  body?: Record<string, unknown>
): Promise<{ authorized: boolean; reason?: string }> {
  const ip = getClientIP(request);

  const rateLimitResult = await checkRateLimit(getAuthRateLimitId(ip, tournamentId), 'AUTH_ATTEMPT');
  if (!rateLimitResult.allowed) {
    return { authorized: false, reason: 'Too many authentication attempts' };
  }

  const credentials = extractCredentials(request.headers, body as { pin?: string } | undefined);
  const tournament = await getTournamentConfig(tournamentId);

  if (!tournament) {
    return { authorized: false, reason: 'Tournament not found' };
  }

  if (credentials.sessionToken) {
    const session = await verifySessionToken(credentials.sessionToken);
    if (session && session.tournamentId === tournamentId) {
      return { authorized: true };
    }
  }

  if (credentials.masterToken) {
    const master = await verifyMasterAdminToken(credentials.masterToken);
    if (master && master.tournamentId === tournamentId) {
      return { authorized: true };
    }
  }

  if (credentials.pin) {
    if (verifyPinHash(credentials.pin, tournamentId, tournament.adminPinHash)) {
      return { authorized: true };
    }
  }

  return { authorized: false, reason: 'Invalid credentials' };
}

// ============================================
// GET /api/[tournamentId]/teams - Get all teams
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tournamentId: string }> }
): Promise<NextResponse> {
  const requestId = nanoid(8);

  try {
    const { tournamentId } = await params;

    const tournament = await getTournamentConfig(tournamentId);
    if (!tournament) {
      throw new NotFoundError('Tournament', tournamentId);
    }

    if (!tournament.published) {
      const auth = await verifyAdminAccess(request, tournamentId);
      if (!auth.authorized) {
        throw new UnauthorizedError('Authentication required for unpublished tournaments');
      }
    }

    if (isTournamentExpired(tournament)) {
      throw new NotFoundError('Tournament', tournamentId);
    }

    const [teams, teamProfiles, auctionState] = await Promise.all([
      getTournamentTeams(tournamentId),
      getTeamProfiles(tournamentId),
      getTournamentState(tournamentId),
    ]);

    const teamsWithProfiles = teams.map(team => {
      const profile = teamProfiles[team.id];
      const roster = auctionState?.rosters[team.id] || [];
      const spent = auctionState?.teamSpent[team.id] || 0;

      return {
        ...team,
        logo: profile?.logo || team.logo,
        profile,
        rosterSize: roster.length,
        spent,
        remainingBudget: team.budget - spent,
      };
    });

    return NextResponse.json(
      {
        teams: teamsWithProfiles,
        count: teams.length,
        profiles: teamProfiles,
      },
      { headers: { 'X-Request-ID': requestId } }
    );
  } catch (error) {
    return handleError(error, requestId);
  }
}

// ============================================
// POST /api/[tournamentId]/teams - Add new team
// ============================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tournamentId: string }> }
): Promise<NextResponse> {
  const requestId = nanoid(8);
  const ip = getClientIP(request);

  try {
    const { tournamentId } = await params;
    const body = await request.json().catch(() => null);

    if (!body) {
      throw new BadRequestError('Invalid JSON body');
    }

    const auth = await verifyAdminAccess(request, tournamentId, body);
    if (!auth.authorized) {
      throw new UnauthorizedError(auth.reason);
    }

    const tournament = await getTournamentConfig(tournamentId);
    if (!tournament) {
      throw new NotFoundError('Tournament', tournamentId);
    }

    if (isTournamentReadOnly(tournament)) {
      throw new BadRequestError('Tournament is in read-only mode');
    }

    // Check if this is a logo update
    const { action, teamId, logo, ...teamData } = body;

    if (action === 'UPDATE_LOGO') {
      if (!teamId) {
        throw new BadRequestError('Team ID required');
      }

      const teams = await getTournamentTeams(tournamentId);
      const team = teams.find(t => t.id === teamId);
      if (!team) {
        throw new NotFoundError('Team', teamId);
      }

      // Validate logo
      if (logo && typeof logo === 'string') {
        if (!logo.startsWith('https://') && !logo.startsWith('data:image/')) {
          throw new BadRequestError('Logo must be a HTTPS URL or base64 data URI');
        }
        if (logo.startsWith('data:image/') && logo.length > 1.4 * 1024 * 1024) {
          throw new BadRequestError('Logo exceeds 1MB limit');
        }
      }

      await updateTeamProfile(tournamentId, teamId, { logo: logo || undefined });

      await logAudit({
        tournamentId,
        action: 'TEAM_PROFILE_UPDATED',
        actorType: 'admin',
        ip,
        targetType: 'team',
        targetId: teamId,
        details: { updated: 'logo' },
      });

      return NextResponse.json(
        { success: true, message: 'Team logo updated' },
        { headers: { 'X-Request-ID': requestId } }
      );
    }

    // Add new team
    const validation = validate(TeamSchema, teamData);
    if (!validation.success) {
      throw new BadRequestError(formatValidationErrors(validation.errors), 'VALIDATION_ERROR');
    }

    const newTeam = validation.data;

    const teams = await getTournamentTeams(tournamentId);

    // Check if team ID already exists
    if (teams.some(t => t.id === newTeam.id)) {
      throw new BadRequestError('Team with this ID already exists');
    }

    const teamToAdd: TournamentTeam = {
      id: newTeam.id,
      name: newTeam.name,
      budget: newTeam.budget,
      color: newTeam.color,
      captainId: newTeam.captainId,
      viceCaptainId: newTeam.viceCaptainId,
      logo: newTeam.logo,
    };

    teams.push(teamToAdd);
    await setTournamentTeams(tournamentId, teams);

    await logAudit({
      tournamentId,
      action: 'TEAM_ADDED',
      actorType: 'admin',
      ip,
      targetType: 'team',
      targetId: newTeam.id,
      details: { teamName: newTeam.name, budget: newTeam.budget },
    });

    return NextResponse.json(
      {
        success: true,
        team: teamToAdd,
        message: 'Team added successfully',
      },
      { status: 201, headers: { 'X-Request-ID': requestId } }
    );
  } catch (error) {
    return handleError(error, requestId);
  }
}

// ============================================
// PUT /api/[tournamentId]/teams - Update team
// ============================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tournamentId: string }> }
): Promise<NextResponse> {
  const requestId = nanoid(8);
  const ip = getClientIP(request);

  try {
    const { tournamentId } = await params;
    const body = await request.json().catch(() => null);

    if (!body || !body.teamId) {
      throw new BadRequestError('Team ID required');
    }

    const auth = await verifyAdminAccess(request, tournamentId, body);
    if (!auth.authorized) {
      throw new UnauthorizedError(auth.reason);
    }

    const tournament = await getTournamentConfig(tournamentId);
    if (!tournament) {
      throw new NotFoundError('Tournament', tournamentId);
    }

    if (isTournamentReadOnly(tournament)) {
      throw new BadRequestError('Tournament is in read-only mode');
    }

    const { teamId, ...updates } = body;

    const teams = await getTournamentTeams(tournamentId);
    const teamIndex = teams.findIndex(t => t.id === teamId);

    if (teamIndex === -1) {
      throw new NotFoundError('Team', teamId);
    }

    // Apply updates
    const updatedTeam: TournamentTeam = {
      ...teams[teamIndex],
      name: updates.name ?? teams[teamIndex].name,
      budget: updates.budget ?? teams[teamIndex].budget,
      color: updates.color ?? teams[teamIndex].color,
      captainId: updates.captainId ?? teams[teamIndex].captainId,
      viceCaptainId: updates.viceCaptainId ?? teams[teamIndex].viceCaptainId,
      logo: updates.logo ?? teams[teamIndex].logo,
    };

    teams[teamIndex] = updatedTeam;
    await setTournamentTeams(tournamentId, teams);

    await logAudit({
      tournamentId,
      action: 'TEAM_PROFILE_UPDATED',
      actorType: 'admin',
      ip,
      targetType: 'team',
      targetId: teamId,
      details: { updates: Object.keys(updates) },
    });

    return NextResponse.json(
      { success: true, team: updatedTeam },
      { headers: { 'X-Request-ID': requestId } }
    );
  } catch (error) {
    return handleError(error, requestId);
  }
}

// ============================================
// DELETE /api/[tournamentId]/teams - Remove team
// ============================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tournamentId: string }> }
): Promise<NextResponse> {
  const requestId = nanoid(8);
  const ip = getClientIP(request);

  try {
    const { tournamentId } = await params;
    const body = await request.json().catch(() => ({}));

    if (!body.teamId) {
      throw new BadRequestError('Team ID required');
    }

    const auth = await verifyAdminAccess(request, tournamentId, body);
    if (!auth.authorized) {
      throw new UnauthorizedError(auth.reason);
    }

    const tournament = await getTournamentConfig(tournamentId);
    if (!tournament) {
      throw new NotFoundError('Tournament', tournamentId);
    }

    if (isTournamentReadOnly(tournament)) {
      throw new BadRequestError('Tournament is in read-only mode');
    }

    // Check if tournament has started (auction in progress)
    if (tournament.status !== 'draft') {
      throw new BadRequestError('Cannot remove teams after tournament has started');
    }

    const { teamId } = body;

    const teams = await getTournamentTeams(tournamentId);
    const teamIndex = teams.findIndex(t => t.id === teamId);

    if (teamIndex === -1) {
      throw new NotFoundError('Team', teamId);
    }

    const removedTeam = teams[teamIndex];
    teams.splice(teamIndex, 1);
    await setTournamentTeams(tournamentId, teams);

    // Also remove team profile if exists
    const profiles = await getTeamProfiles(tournamentId);
    if (profiles[teamId]) {
      delete profiles[teamId];
      await setTeamProfiles(tournamentId, profiles);
    }

    await logAudit({
      tournamentId,
      action: 'TEAM_ADDED', // Using TEAM_ADDED with negative context
      actorType: 'admin',
      ip,
      targetType: 'team',
      targetId: teamId,
      details: { teamName: removedTeam.name, action: 'removed' },
    });

    return NextResponse.json(
      { success: true, message: `Team ${removedTeam.name} removed` },
      { headers: { 'X-Request-ID': requestId } }
    );
  } catch (error) {
    return handleError(error, requestId);
  }
}
