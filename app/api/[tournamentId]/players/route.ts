import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { handleError, NotFoundError, UnauthorizedError, BadRequestError } from '@/lib/errors';
import { checkRateLimit, getClientIP, getRateLimitHeaders, getAuthRateLimitId } from '@/lib/rate-limit';
import {
  verifySessionToken,
  verifyMasterAdminToken,
  verifyPinHash,
  extractCredentials,
} from '@/lib/tournament-auth';
import { logAudit } from '@/lib/audit';
import {
  getTournamentConfig,
  getTournamentPlayers,
  setTournamentPlayers,
  getPlayerProfiles,
  setPlayerProfiles,
  updatePlayerProfile,
} from '@/lib/tournament-storage';
import {
  isTournamentExpired,
  isTournamentReadOnly,
} from '@/lib/tournament-lifecycle';
import {
  TournamentPlayer,
  TournamentPlayerProfile,
} from '@/lib/tournament-types';
import { PlayerSchema, validate, formatValidationErrors } from '@/lib/schemas';

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
// Helper: Merge player with profile
// ============================================

function mergeProfile(
  player: TournamentPlayer,
  profiles: Record<string, TournamentPlayerProfile>
): TournamentPlayer & { profile?: TournamentPlayerProfile } {
  const profile = profiles[player.id];
  return {
    ...player,
    image: profile?.image || player.image,
    cricHeroesUrl: profile?.cricHeroesUrl || player.cricHeroesUrl,
    profile,
  };
}

// ============================================
// GET /api/[tournamentId]/players - Get all players
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

    const [players, profiles] = await Promise.all([
      getTournamentPlayers(tournamentId),
      getPlayerProfiles(tournamentId),
    ]);

    const playersWithProfiles = players.map(p => mergeProfile(p, profiles));

    return NextResponse.json(
      {
        players: playersWithProfiles,
        count: players.length,
        profiles,
      },
      { headers: { 'X-Request-ID': requestId } }
    );
  } catch (error) {
    return handleError(error, requestId);
  }
}

// ============================================
// POST /api/[tournamentId]/players - Add/update player
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

    // Check if this is a profile update or new player
    const { action, playerId, image, cricHeroesUrl, ...playerData } = body;

    if (action === 'UPDATE_PROFILE') {
      // Update player profile (image, cricHeroesUrl)
      if (!playerId) {
        throw new BadRequestError('Player ID required');
      }

      const players = await getTournamentPlayers(tournamentId);
      const player = players.find(p => p.id === playerId);
      if (!player) {
        throw new NotFoundError('Player', playerId);
      }

      const profileUpdate: Partial<TournamentPlayerProfile> = {};

      if (image !== undefined) {
        // Validate image (must be URL or base64)
        if (image && typeof image === 'string') {
          if (!image.startsWith('https://') && !image.startsWith('data:image/')) {
            throw new BadRequestError('Image must be a HTTPS URL or base64 data URI');
          }
          // Check size for base64 (approximate 1MB limit)
          if (image.startsWith('data:image/') && image.length > 1.4 * 1024 * 1024) {
            throw new BadRequestError('Image exceeds 1MB limit');
          }
        }
        profileUpdate.image = image || undefined;
      }

      if (cricHeroesUrl !== undefined) {
        if (cricHeroesUrl && typeof cricHeroesUrl === 'string' && !cricHeroesUrl.startsWith('https://')) {
          throw new BadRequestError('CricHeroes URL must use HTTPS');
        }
        profileUpdate.cricHeroesUrl = cricHeroesUrl || undefined;
      }

      await updatePlayerProfile(tournamentId, playerId, profileUpdate);

      await logAudit({
        tournamentId,
        action: 'PLAYER_PROFILE_UPDATED',
        actorType: 'admin',
        ip,
        targetType: 'player',
        targetId: playerId,
        details: { updates: Object.keys(profileUpdate) },
      });

      return NextResponse.json(
        { success: true, message: 'Player profile updated' },
        { headers: { 'X-Request-ID': requestId } }
      );
    }

    // Add new player
    const validation = validate(PlayerSchema, playerData);
    if (!validation.success) {
      throw new BadRequestError(formatValidationErrors(validation.errors), 'VALIDATION_ERROR');
    }

    const newPlayer = validation.data;

    const players = await getTournamentPlayers(tournamentId);

    // Check if player ID already exists
    if (players.some(p => p.id === newPlayer.id)) {
      throw new BadRequestError('Player with this ID already exists');
    }

    const playerToAdd: TournamentPlayer = {
      id: newPlayer.id,
      name: newPlayer.name,
      role: newPlayer.role,
      category: newPlayer.category,
      club: newPlayer.club,
      availability: newPlayer.availability || 'full',
      image: newPlayer.image,
      cricHeroesUrl: newPlayer.cricHeroesUrl,
    };

    players.push(playerToAdd);
    await setTournamentPlayers(tournamentId, players);

    await logAudit({
      tournamentId,
      action: 'PLAYER_ADDED',
      actorType: 'admin',
      ip,
      targetType: 'player',
      targetId: newPlayer.id,
      details: { playerName: newPlayer.name, role: newPlayer.role, category: newPlayer.category },
    });

    return NextResponse.json(
      {
        success: true,
        player: playerToAdd,
        message: 'Player added successfully',
      },
      { status: 201, headers: { 'X-Request-ID': requestId } }
    );
  } catch (error) {
    return handleError(error, requestId);
  }
}

// ============================================
// PUT /api/[tournamentId]/players - Update player
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

    if (!body || !body.playerId) {
      throw new BadRequestError('Player ID required');
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

    const { playerId, ...updates } = body;

    const players = await getTournamentPlayers(tournamentId);
    const playerIndex = players.findIndex(p => p.id === playerId);

    if (playerIndex === -1) {
      throw new NotFoundError('Player', playerId);
    }

    // Apply updates
    const updatedPlayer: TournamentPlayer = {
      ...players[playerIndex],
      name: updates.name ?? players[playerIndex].name,
      role: updates.role ?? players[playerIndex].role,
      category: updates.category ?? players[playerIndex].category,
      club: updates.club ?? players[playerIndex].club,
      availability: updates.availability ?? players[playerIndex].availability,
      image: updates.image ?? players[playerIndex].image,
      cricHeroesUrl: updates.cricHeroesUrl ?? players[playerIndex].cricHeroesUrl,
    };

    players[playerIndex] = updatedPlayer;
    await setTournamentPlayers(tournamentId, players);

    await logAudit({
      tournamentId,
      action: 'PLAYER_PROFILE_UPDATED',
      actorType: 'admin',
      ip,
      targetType: 'player',
      targetId: playerId,
      details: { updates: Object.keys(updates) },
    });

    return NextResponse.json(
      { success: true, player: updatedPlayer },
      { headers: { 'X-Request-ID': requestId } }
    );
  } catch (error) {
    return handleError(error, requestId);
  }
}

// ============================================
// DELETE /api/[tournamentId]/players - Remove player
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

    if (!body.playerId) {
      throw new BadRequestError('Player ID required');
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

    const { playerId } = body;

    const players = await getTournamentPlayers(tournamentId);
    const playerIndex = players.findIndex(p => p.id === playerId);

    if (playerIndex === -1) {
      throw new NotFoundError('Player', playerId);
    }

    const removedPlayer = players[playerIndex];
    players.splice(playerIndex, 1);
    await setTournamentPlayers(tournamentId, players);

    // Also remove profile if exists
    const profiles = await getPlayerProfiles(tournamentId);
    if (profiles[playerId]) {
      delete profiles[playerId];
      await setPlayerProfiles(tournamentId, profiles);
    }

    await logAudit({
      tournamentId,
      action: 'PLAYER_ADDED', // Using PLAYER_ADDED with negative context since there's no PLAYER_REMOVED
      actorType: 'admin',
      ip,
      targetType: 'player',
      targetId: playerId,
      details: { playerName: removedPlayer.name, action: 'removed' },
    });

    return NextResponse.json(
      { success: true, message: `Player ${removedPlayer.name} removed` },
      { headers: { 'X-Request-ID': requestId } }
    );
  } catch (error) {
    return handleError(error, requestId);
  }
}
