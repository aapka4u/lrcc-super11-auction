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
import { logAudit, logAuthFailure } from '@/lib/audit';
import {
  getTournamentConfig,
  getTournamentState,
  setTournamentState,
  getTournamentTeams,
  getTournamentPlayers,
  getPlayerProfiles,
  getTeamProfiles,
} from '@/lib/tournament-storage';
import {
  getTournamentLifecycleStatus,
  isTournamentExpired,
  updateTournamentActivity,
} from '@/lib/tournament-lifecycle';
import {
  TournamentAuctionState,
  TournamentPlayer,
  TournamentPlayerProfile,
  getInitialAuctionState,
} from '@/lib/tournament-types';
import { AuctionActionSchema, validate, formatValidationErrors } from '@/lib/schemas';

// ============================================
// Helper: Verify admin access
// ============================================

async function verifyAdminAccess(
  request: NextRequest,
  tournamentId: string,
  body?: Record<string, unknown>
): Promise<{ authorized: boolean; reason?: string; tokenType?: string }> {
  const ip = getClientIP(request);

  // Rate limit auth attempts
  const rateLimitResult = await checkRateLimit(getAuthRateLimitId(ip, tournamentId), 'AUTH_ATTEMPT');
  if (!rateLimitResult.allowed) {
    return { authorized: false, reason: 'Too many authentication attempts. Please try again later.' };
  }

  const credentials = extractCredentials(request.headers, body as { pin?: string } | undefined);
  const tournament = await getTournamentConfig(tournamentId);

  if (!tournament) {
    return { authorized: false, reason: 'Tournament not found' };
  }

  // Check session token first (fastest)
  if (credentials.sessionToken) {
    const session = await verifySessionToken(credentials.sessionToken);
    if (session && session.tournamentId === tournamentId) {
      return { authorized: true, tokenType: 'session' };
    }
  }

  // Check master token
  if (credentials.masterToken) {
    const master = await verifyMasterAdminToken(credentials.masterToken);
    if (master && master.tournamentId === tournamentId) {
      return { authorized: true, tokenType: 'master' };
    }
  }

  // Check PIN
  if (credentials.pin) {
    if (verifyPinHash(credentials.pin, tournamentId, tournament.adminPinHash)) {
      return { authorized: true, tokenType: 'pin' };
    }
  }

  // Log failed auth attempt
  await logAuthFailure(tournamentId, 'Invalid credentials', ip);

  return { authorized: false, reason: 'Invalid credentials' };
}

// ============================================
// Helper: Merge player with profile
// ============================================

function mergeProfile(
  player: TournamentPlayer,
  profiles: Record<string, TournamentPlayerProfile>
): TournamentPlayer {
  return {
    ...player,
    image: profiles[player.id]?.image || player.image,
    cricHeroesUrl: profiles[player.id]?.cricHeroesUrl || player.cricHeroesUrl,
  };
}

// ============================================
// Helper: Calculate max bid
// ============================================

function calculateMaxBid(
  teamBudget: number,
  teamSpent: number,
  rosterSize: number,
  teamSize: number,
  basePriceBase: number
): number {
  const remainingBudget = teamBudget - teamSpent;
  const playersStillNeeded = (teamSize - 2) - rosterSize; // -2 for C and VC

  if (playersStillNeeded <= 0) return 0; // Team is full

  // Reserve minimum for remaining players at base price
  const reserveForFuturePlayers = (playersStillNeeded - 1) * basePriceBase;
  return Math.max(0, remainingBudget - reserveForFuturePlayers);
}

// ============================================
// GET /api/[tournamentId]/state - Get auction state
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tournamentId: string }> }
): Promise<NextResponse> {
  const requestId = nanoid(8);

  try {
    const { tournamentId } = await params;

    // Fetch tournament config
    const tournament = await getTournamentConfig(tournamentId);
    if (!tournament) {
      throw new NotFoundError('Tournament', tournamentId);
    }

    // Check if tournament is published or user has access
    if (!tournament.published) {
      const auth = await verifyAdminAccess(request, tournamentId);
      if (!auth.authorized) {
        throw new UnauthorizedError('Authentication required for unpublished tournaments');
      }
    }

    // Check if expired
    if (isTournamentExpired(tournament)) {
      throw new NotFoundError('Tournament', tournamentId);
    }

    // Fetch state and related data in parallel
    const [state, teams, players, playerProfiles, teamProfiles] = await Promise.all([
      getTournamentState(tournamentId),
      getTournamentTeams(tournamentId),
      getTournamentPlayers(tournamentId),
      getPlayerProfiles(tournamentId),
      getTeamProfiles(tournamentId),
    ]);

    // Get or initialize auction state
    let auctionState = state;
    if (!auctionState) {
      auctionState = getInitialAuctionState();
      await setTournamentState(tournamentId, auctionState);
    }

    // Ensure backward compatibility fields
    if (!auctionState.soldPrices) auctionState.soldPrices = {};
    if (!auctionState.teamSpent) {
      auctionState.teamSpent = Object.fromEntries(teams.map(t => [t.id, 0]));
    }
    if (!auctionState.unsoldPlayers) auctionState.unsoldPlayers = [];
    if (!auctionState.usedJokers) auctionState.usedJokers = {};

    // Count remaining players
    const remainingPlayers = players.filter(p => !auctionState!.soldPlayers.includes(p.id));
    const remainingAplusCount = remainingPlayers.filter(p => p.category === 'APLUS').length;
    const remainingBaseCount = remainingPlayers.filter(p => p.category === 'BASE').length;

    // Count remaining by role
    const remainingByRole = {
      Batsman: remainingPlayers.filter(p => p.role === 'Batsman').length,
      Bowler: remainingPlayers.filter(p => p.role === 'Bowler').length,
      'All-rounder': remainingPlayers.filter(p => p.role === 'All-rounder').length,
      'WK-Batsman': remainingPlayers.filter(p => p.role === 'WK-Batsman').length,
    };

    // Build teams with rosters
    const teamsWithRosters = teams.map(team => {
      const rosterPlayerIds = auctionState!.rosters[team.id] || [];
      const roster = rosterPlayerIds
        .map(playerId => players.find(p => p.id === playerId))
        .filter((p): p is TournamentPlayer => p !== undefined)
        .map(p => mergeProfile(p, playerProfiles));

      const spent = auctionState!.teamSpent[team.id] || 0;
      const remainingBudget = team.budget - spent;
      const playersNeeded = (tournament.settings.teamSize - 2) - roster.length;
      const maxBid = calculateMaxBid(
        team.budget,
        spent,
        roster.length,
        tournament.settings.teamSize,
        tournament.settings.basePrices.BASE
      );

      return {
        ...team,
        logo: teamProfiles[team.id]?.logo || team.logo,
        roster,
        spent,
        remainingBudget,
        playersNeeded,
        maxBid,
      };
    });

    const currentPlayer = auctionState.currentPlayerId
      ? players.find(p => p.id === auctionState!.currentPlayerId)
      : null;

    const soldToTeam = auctionState.soldToTeamId
      ? teams.find(t => t.id === auctionState!.soldToTeamId)
      : null;

    // Get base price for current player
    const currentPlayerBasePrice = currentPlayer
      ? tournament.settings.basePrices[currentPlayer.category as keyof typeof tournament.settings.basePrices] ||
        tournament.settings.basePrices.BASE
      : 0;

    const lifecycle = getTournamentLifecycleStatus(tournament);

    return NextResponse.json(
      {
        tournament: {
          id: tournament.id,
          name: tournament.name,
          status: tournament.status,
          settings: tournament.settings,
          lifecycle,
        },
        status: auctionState.status,
        currentPlayer: currentPlayer ? mergeProfile(currentPlayer, playerProfiles) : null,
        currentPlayerBasePrice,
        soldToTeam,
        teams: teamsWithRosters,
        lastUpdate: auctionState.lastUpdate,
        soldCount: auctionState.soldPlayers.length,
        soldPlayers: auctionState.soldPlayers,
        totalPlayers: players.length,
        pauseMessage: auctionState.pauseMessage,
        pauseUntil: auctionState.pauseUntil,
        soldPrices: auctionState.soldPrices,
        remainingByRole,
        remainingAplusCount,
        remainingBaseCount,
        biddingDurations: auctionState.biddingDurations || {},
        unsoldPlayers: auctionState.unsoldPlayers,
        jokerPlayerId: auctionState.jokerPlayerId,
        jokerRequestingTeamId: auctionState.jokerRequestingTeamId,
        usedJokers: auctionState.usedJokers,
        teamProfiles,
        rosters: auctionState.rosters,
        teamSpent: auctionState.teamSpent,
      },
      { headers: { 'X-Request-ID': requestId } }
    );
  } catch (error) {
    return handleError(error, requestId);
  }
}

// ============================================
// POST /api/[tournamentId]/state - Update auction state
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

    // Verify admin access
    const auth = await verifyAdminAccess(request, tournamentId, body);
    if (!auth.authorized) {
      throw new UnauthorizedError(auth.reason);
    }

    // Fetch tournament config
    const tournament = await getTournamentConfig(tournamentId);
    if (!tournament) {
      throw new NotFoundError('Tournament', tournamentId);
    }

    // Check lifecycle
    if (isTournamentExpired(tournament)) {
      throw new NotFoundError('Tournament', tournamentId);
    }

    // Validate action
    const validation = validate(AuctionActionSchema, body);
    if (!validation.success) {
      throw new BadRequestError(formatValidationErrors(validation.errors), 'VALIDATION_ERROR');
    }

    const actionData = validation.data;

    // Fetch current state
    let state = await getTournamentState(tournamentId);
    if (!state) {
      state = getInitialAuctionState();
    }

    // Fetch teams and players for validation
    const [teams, players] = await Promise.all([
      getTournamentTeams(tournamentId),
      getTournamentPlayers(tournamentId),
    ]);

    // Ensure state has required fields
    if (!state.soldPrices) state.soldPrices = {};
    if (!state.teamSpent) {
      state.teamSpent = Object.fromEntries(teams.map(t => [t.id, 0]));
    }
    if (!state.usedJokers) state.usedJokers = {};
    if (!state.unsoldPlayers) state.unsoldPlayers = [];

    const findPlayer = (id: string) => players.find(p => p.id === id);
    const findTeam = (id: string) => teams.find(t => t.id === id);

    switch (actionData.action) {
      case 'VERIFY': {
        // Just checking credentials
        return NextResponse.json(
          { success: true },
          { headers: { 'X-Request-ID': requestId } }
        );
      }

      case 'START_AUCTION': {
        const player = findPlayer(actionData.playerId);
        if (!player) {
          throw new BadRequestError('Player not found');
        }
        if (state.soldPlayers.includes(actionData.playerId)) {
          throw new BadRequestError('This player was already sold');
        }

        state.status = 'LIVE';
        state.currentPlayerId = actionData.playerId;
        state.soldToTeamId = null;
        state.auctionStartTime = Date.now();

        await logAudit({
          tournamentId,
          action: 'AUCTION_STARTED',
          actorType: 'admin',
          ip,
          targetType: 'player',
          targetId: actionData.playerId,
          details: { playerName: player.name },
        });
        break;
      }

      case 'SOLD': {
        if (!state.currentPlayerId) {
          throw new BadRequestError('No player is currently being auctioned');
        }

        const team = findTeam(actionData.teamId);
        if (!team) {
          throw new BadRequestError('Team not found');
        }

        const currentPlayer = findPlayer(state.currentPlayerId);
        if (!currentPlayer) {
          throw new BadRequestError('Current player not found');
        }

        // Check if already sold (idempotency)
        if (state.soldPlayers.includes(state.currentPlayerId)) {
          return NextResponse.json(
            { success: true, message: 'Already processed' },
            { headers: { 'X-Request-ID': requestId } }
          );
        }

        const basePrice =
          tournament.settings.basePrices[currentPlayer.category as keyof typeof tournament.settings.basePrices] ||
          tournament.settings.basePrices.BASE;

        // Validate sold price
        const isJokerPlayer = state.jokerPlayerId === state.currentPlayerId;
        const isJokerTeamClaiming = isJokerPlayer && state.jokerRequestingTeamId === actionData.teamId;

        if (!(isJokerTeamClaiming && actionData.soldPrice === basePrice) && actionData.soldPrice < basePrice) {
          throw new BadRequestError(
            `Sold price ₹${actionData.soldPrice} is below base price ₹${basePrice}`
          );
        }

        const currentSpent = state.teamSpent[actionData.teamId] || 0;
        const rosterSize = (state.rosters[actionData.teamId] || []).length;

        // Check team roster isn't full
        if (rosterSize >= tournament.settings.teamSize - 2) {
          throw new BadRequestError(`${team.name} roster is full`);
        }

        // Calculate max bid
        const maxBidAllowed = calculateMaxBid(
          team.budget,
          currentSpent,
          rosterSize,
          tournament.settings.teamSize,
          tournament.settings.basePrices.BASE
        );

        // Joker team claiming at base price bypasses max bid check
        if (!(isJokerTeamClaiming && actionData.soldPrice === basePrice) && actionData.soldPrice > maxBidAllowed) {
          throw new BadRequestError(
            `Bid of ₹${actionData.soldPrice} exceeds max allowed ₹${maxBidAllowed}`
          );
        }

        // Calculate bidding duration
        if (!state.biddingDurations) state.biddingDurations = {};
        const biddingDuration = state.auctionStartTime
          ? Math.floor((Date.now() - state.auctionStartTime) / 1000)
          : 0;
        state.biddingDurations[state.currentPlayerId] = biddingDuration;

        // Update state
        state.status = 'SOLD';
        state.soldToTeamId = actionData.teamId;
        state.rosters[actionData.teamId] = [...(state.rosters[actionData.teamId] || []), state.currentPlayerId];
        state.soldPlayers = [...state.soldPlayers, state.currentPlayerId];
        state.soldPrices[state.currentPlayerId] = actionData.soldPrice;
        state.teamSpent[actionData.teamId] = currentSpent + actionData.soldPrice;
        state.auctionStartTime = undefined;

        // Record joker usage if applicable
        if (isJokerTeamClaiming && actionData.soldPrice === basePrice) {
          state.usedJokers[actionData.teamId] = state.currentPlayerId;
        }
        state.jokerPlayerId = null;
        state.jokerRequestingTeamId = null;

        // Remove from unsold list if was there
        const soldPlayerId = state.currentPlayerId;
        if (soldPlayerId && state.unsoldPlayers.includes(soldPlayerId)) {
          state.unsoldPlayers = state.unsoldPlayers.filter(id => id !== soldPlayerId);
        }

        await logAudit({
          tournamentId,
          action: 'PLAYER_SOLD',
          actorType: 'admin',
          ip,
          targetType: 'player',
          targetId: state.currentPlayerId,
          details: {
            playerName: currentPlayer.name,
            teamId: actionData.teamId,
            teamName: team.name,
            soldPrice: actionData.soldPrice,
            biddingDuration,
          },
        });
        break;
      }

      case 'UNSOLD': {
        if (state.currentPlayerId) {
          if (!state.unsoldPlayers.includes(state.currentPlayerId)) {
            state.unsoldPlayers = [...state.unsoldPlayers, state.currentPlayerId];
          }

          await logAudit({
            tournamentId,
            action: 'PLAYER_UNSOLD',
            actorType: 'admin',
            ip,
            targetType: 'player',
            targetId: state.currentPlayerId,
            details: {},
          });

          state.status = 'IDLE';
          state.currentPlayerId = null;
          state.soldToTeamId = null;
          state.jokerPlayerId = null;
          state.jokerRequestingTeamId = null;
        }
        break;
      }

      case 'PAUSE': {
        state.status = 'PAUSED';
        state.pauseMessage = actionData.message || 'Auction is paused. We will be back shortly.';
        state.pauseUntil = actionData.duration
          ? Date.now() + actionData.duration * 1000
          : undefined;

        await logAudit({
          tournamentId,
          action: 'AUCTION_PAUSED',
          actorType: 'admin',
          ip,
          details: { message: state.pauseMessage, duration: actionData.duration },
        });
        break;
      }

      case 'UNPAUSE': {
        if (state.status === 'PAUSED') {
          state.status = state.currentPlayerId ? 'LIVE' : 'IDLE';
          state.pauseMessage = undefined;
          state.pauseUntil = undefined;

          await logAudit({
            tournamentId,
            action: 'AUCTION_RESUMED',
            actorType: 'admin',
            ip,
            details: {},
          });
        }
        break;
      }

      case 'CLEAR': {
        state.status = 'IDLE';
        state.currentPlayerId = null;
        state.soldToTeamId = null;
        state.jokerPlayerId = null;
        state.jokerRequestingTeamId = null;
        break;
      }

      case 'VERIFY': {
        // Already handled above
        break;
      }

      case 'RANDOM': {
        // Get random next player
        const unsoldPlayerIds = state.unsoldPlayers || [];
        const remainingPlayers = players.filter(
          p => !state!.soldPlayers.includes(p.id) && !unsoldPlayerIds.includes(p.id)
        );
        const unsoldPlayerObjects = unsoldPlayerIds
          .map(id => players.find(p => p.id === id))
          .filter((p): p is TournamentPlayer => p !== undefined);

        const starPlayers = remainingPlayers.filter(p => p.category === 'APLUS');
        const leaguePlayers = remainingPlayers.filter(p => p.category === 'BASE');

        let randomPlayer: TournamentPlayer | undefined;

        // Priority: Star → League → Unsold
        if (starPlayers.length > 0) {
          randomPlayer = starPlayers[Math.floor(Math.random() * starPlayers.length)];
        } else if (leaguePlayers.length > 0) {
          randomPlayer = leaguePlayers[Math.floor(Math.random() * leaguePlayers.length)];
        } else if (unsoldPlayerObjects.length > 0) {
          randomPlayer = unsoldPlayerObjects[Math.floor(Math.random() * unsoldPlayerObjects.length)];
        }

        if (randomPlayer) {
          return NextResponse.json(
            { success: true, randomPlayer: { id: randomPlayer.id, name: randomPlayer.name } },
            { headers: { 'X-Request-ID': requestId } }
          );
        } else {
          throw new BadRequestError('No players available');
        }
      }

      case 'JOKER': {
        const teamId = (body as { teamId?: string }).teamId;
        if (!teamId) {
          throw new BadRequestError('Team ID required for joker request');
        }

        const team = findTeam(teamId);
        if (!team) {
          throw new BadRequestError('Team not found');
        }

        // Check if team has already used their joker
        if (state.usedJokers[teamId]) {
          const usedOnPlayer = findPlayer(state.usedJokers[teamId]);
          throw new BadRequestError(
            `This team already used their joker on ${usedOnPlayer?.name || 'a player'}`
          );
        }

        if (state.currentPlayerId && state.status === 'LIVE') {
          state.jokerPlayerId = state.currentPlayerId;
          state.jokerRequestingTeamId = teamId;

          await logAudit({
            tournamentId,
            action: 'JOKER_USED',
            actorType: 'admin',
            ip,
            targetType: 'player',
            targetId: state.currentPlayerId,
            details: { teamId, teamName: team.name },
          });
        }
        break;
      }

      case 'CORRECT': {
        const { playerId, fromTeamId, toTeamId } = body as {
          playerId?: string;
          fromTeamId?: string;
          toTeamId?: string;
        };

        if (!playerId || !fromTeamId || !toTeamId) {
          throw new BadRequestError('CORRECT requires playerId, fromTeamId, toTeamId');
        }

        if (!state.soldPlayers.includes(playerId)) {
          throw new BadRequestError('Player is not sold');
        }

        if (!state.rosters[fromTeamId]?.includes(playerId)) {
          throw new BadRequestError('Player is not in the specified from team');
        }

        const toTeam = findTeam(toTeamId);
        if (!toTeam) {
          throw new BadRequestError('Target team not found');
        }

        // Transfer player
        const oldPrice = state.soldPrices[playerId] || 0;
        state.rosters[fromTeamId] = (state.rosters[fromTeamId] || []).filter(id => id !== playerId);
        state.teamSpent[fromTeamId] = (state.teamSpent[fromTeamId] || 0) - oldPrice;
        state.rosters[toTeamId] = [...(state.rosters[toTeamId] || []), playerId];
        state.teamSpent[toTeamId] = (state.teamSpent[toTeamId] || 0) + oldPrice;

        await logAudit({
          tournamentId,
          action: 'PLAYER_CORRECTED',
          actorType: 'admin',
          ip,
          targetType: 'player',
          targetId: playerId,
          details: { fromTeamId, toTeamId, price: oldPrice },
        });
        break;
      }

      case 'RESET': {
        state = getInitialAuctionState();

        await logAudit({
          tournamentId,
          action: 'AUCTION_RESET',
          actorType: 'admin',
          ip,
          details: {},
        });
        break;
      }

      default:
        throw new BadRequestError(`Unknown action: ${(actionData as { action: string }).action}`);
    }

    // Update timestamp and save
    state.lastUpdate = Date.now();
    await setTournamentState(tournamentId, state);

    // Update tournament activity
    await updateTournamentActivity(tournamentId);

    return NextResponse.json(
      { success: true, state },
      { headers: { 'X-Request-ID': requestId } }
    );
  } catch (error) {
    return handleError(error, requestId);
  }
}
