import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { handleError, BadRequestError, NotFoundError, UnauthorizedError, ForbiddenError } from '@/lib/errors';
import { checkRateLimit, getClientIP, getRateLimitHeaders, getAuthRateLimitId } from '@/lib/rate-limit';
import {
  hashPin,
  verifyPinHash,
  verifyMasterAdminToken,
  verifySessionToken,
  generateSessionToken,
  extractCredentials,
} from '@/lib/tournament-auth';
import { logAudit, logAuthFailure } from '@/lib/audit';
import {
  getTournamentConfig,
  setTournamentConfig,
  deleteTournamentData,
  updateTournamentPublished,
} from '@/lib/tournament-storage';
import {
  getTournamentLifecycleStatus,
  isTournamentReadOnly,
} from '@/lib/tournament-lifecycle';
import { UpdateTournamentSchema, validate, formatValidationErrors } from '@/lib/schemas';

// ============================================
// Helper: Verify tournament access
// ============================================

async function verifyAccess(
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
// GET /api/tournaments/[tournamentId] - Get tournament details
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

    // Public tournaments return limited info
    // Private (draft) tournaments require auth
    if (!tournament.published) {
      const auth = await verifyAccess(request, tournamentId);
      if (!auth.authorized) {
        throw new UnauthorizedError(auth.reason || 'Authentication required for unpublished tournaments');
      }
    }

    const lifecycle = getTournamentLifecycleStatus(tournament);

    // Don't expose sensitive data
    const publicTournament = {
      id: tournament.id,
      name: tournament.name,
      description: tournament.description,
      status: tournament.status,
      published: tournament.published,
      createdAt: tournament.createdAt,
      updatedAt: tournament.updatedAt,
      settings: tournament.settings,
      sport: tournament.sport,
      location: tournament.location,
      startDate: tournament.startDate,
      endDate: tournament.endDate,
      logo: tournament.logo,
      theme: tournament.theme,
      lifecycle,
    };

    return NextResponse.json(
      { tournament: publicTournament },
      { headers: { 'X-Request-ID': requestId } }
    );
  } catch (error) {
    return handleError(error, requestId);
  }
}

// ============================================
// PUT /api/tournaments/[tournamentId] - Update tournament
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

    if (!body) {
      throw new BadRequestError('Invalid JSON body');
    }

    // Verify access
    const auth = await verifyAccess(request, tournamentId, body);
    if (!auth.authorized) {
      throw new UnauthorizedError(auth.reason);
    }

    const tournament = await getTournamentConfig(tournamentId);
    if (!tournament) {
      throw new NotFoundError('Tournament', tournamentId);
    }

    // Check lifecycle status
    if (isTournamentReadOnly(tournament)) {
      throw new ForbiddenError('Tournament is in read-only mode and cannot be modified');
    }

    // Validate update data
    const validation = validate(UpdateTournamentSchema, body);
    if (!validation.success) {
      throw new BadRequestError(formatValidationErrors(validation.errors), 'VALIDATION_ERROR');
    }

    const updates = validation.data;

    // Apply updates - explicitly type the result
    const updatedTournament: typeof tournament = {
      ...tournament,
      name: updates.name ?? tournament.name,
      description: updates.description ?? tournament.description,
      sport: updates.sport ?? tournament.sport,
      location: updates.location ?? tournament.location,
      startDate: updates.startDate ?? tournament.startDate,
      endDate: updates.endDate ?? tournament.endDate,
      logo: updates.logo ?? tournament.logo,
      theme: updates.theme ?? tournament.theme,
      settings: updates.settings
        ? {
            ...tournament.settings,
            teamSize: updates.settings.teamSize ?? tournament.settings.teamSize,
            basePrices: updates.settings.basePrices
              ? {
                  APLUS: updates.settings.basePrices.APLUS ?? tournament.settings.basePrices.APLUS,
                  BASE: updates.settings.basePrices.BASE ?? tournament.settings.basePrices.BASE,
                }
              : tournament.settings.basePrices,
            bidIncrement: updates.settings.bidIncrement ?? tournament.settings.bidIncrement,
            currency: updates.settings.currency ?? tournament.settings.currency,
            enableJokerCard: updates.settings.enableJokerCard ?? tournament.settings.enableJokerCard,
            enableIntelligence: updates.settings.enableIntelligence ?? tournament.settings.enableIntelligence,
            customRules: updates.settings.customRules ?? tournament.settings.customRules,
          }
        : tournament.settings,
      updatedAt: Date.now(),
      lastActivityAt: Date.now(),
    };

    await setTournamentConfig(tournamentId, updatedTournament);

    // Log audit
    await logAudit({
      tournamentId,
      action: 'TOURNAMENT_UPDATED',
      actorType: 'admin',
      ip,
      details: { updates: Object.keys(updates) },
    });

    return NextResponse.json(
      {
        success: true,
        tournament: {
          id: updatedTournament.id,
          name: updatedTournament.name,
          status: updatedTournament.status,
          updatedAt: updatedTournament.updatedAt,
        },
      },
      { headers: { 'X-Request-ID': requestId } }
    );
  } catch (error) {
    return handleError(error, requestId);
  }
}

// ============================================
// DELETE /api/tournaments/[tournamentId] - Delete tournament
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

    // Verify access
    const auth = await verifyAccess(request, tournamentId, body);
    if (!auth.authorized) {
      throw new UnauthorizedError(auth.reason);
    }

    const tournament = await getTournamentConfig(tournamentId);
    if (!tournament) {
      throw new NotFoundError('Tournament', tournamentId);
    }

    // Only allow deletion of draft tournaments
    if (tournament.status !== 'draft') {
      throw new ForbiddenError(
        'Only draft tournaments can be deleted. Archive completed tournaments instead.'
      );
    }

    // Require confirmation
    if (body.confirmDelete !== true) {
      throw new BadRequestError(
        'Deletion requires confirmation. Set confirmDelete: true in request body.',
        'CONFIRMATION_REQUIRED'
      );
    }

    // Delete all tournament data
    await deleteTournamentData(tournamentId);

    // Log audit (to a global audit log since tournament is deleted)
    await logAudit({
      tournamentId,
      action: 'TOURNAMENT_DELETED',
      actorType: 'admin',
      ip,
      details: { name: tournament.name },
    });

    return NextResponse.json(
      {
        success: true,
        message: `Tournament "${tournament.name}" has been deleted.`,
      },
      { headers: { 'X-Request-ID': requestId } }
    );
  } catch (error) {
    return handleError(error, requestId);
  }
}

// ============================================
// PATCH /api/tournaments/[tournamentId] - Special actions (publish, etc.)
// ============================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tournamentId: string }> }
): Promise<NextResponse> {
  const requestId = nanoid(8);
  const ip = getClientIP(request);

  try {
    const { tournamentId } = await params;
    const body = await request.json().catch(() => null);

    if (!body || !body.action) {
      throw new BadRequestError('Action is required');
    }

    // Verify access
    const auth = await verifyAccess(request, tournamentId, body);
    if (!auth.authorized) {
      throw new UnauthorizedError(auth.reason);
    }

    const tournament = await getTournamentConfig(tournamentId);
    if (!tournament) {
      throw new NotFoundError('Tournament', tournamentId);
    }

    const { action } = body;

    switch (action) {
      case 'publish': {
        if (tournament.published) {
          return NextResponse.json({ success: true, message: 'Tournament is already published' });
        }

        tournament.published = true;
        tournament.updatedAt = Date.now();
        tournament.lastActivityAt = Date.now();

        await Promise.all([
          setTournamentConfig(tournamentId, tournament),
          updateTournamentPublished(tournamentId, true),
        ]);

        await logAudit({
          tournamentId,
          action: 'TOURNAMENT_PUBLISHED',
          actorType: 'admin',
          ip,
          details: {},
        });

        return NextResponse.json({
          success: true,
          message: 'Tournament published successfully',
          publicUrl: `/${tournamentId}`,
        });
      }

      case 'unpublish': {
        if (!tournament.published) {
          return NextResponse.json({ success: true, message: 'Tournament is already unpublished' });
        }

        tournament.published = false;
        tournament.updatedAt = Date.now();
        tournament.lastActivityAt = Date.now();

        await Promise.all([
          setTournamentConfig(tournamentId, tournament),
          updateTournamentPublished(tournamentId, false),
        ]);

        await logAudit({
          tournamentId,
          action: 'TOURNAMENT_UNPUBLISHED',
          actorType: 'admin',
          ip,
          details: {},
        });

        return NextResponse.json({
          success: true,
          message: 'Tournament unpublished',
        });
      }

      case 'getSessionToken': {
        // Generate a new session token for authenticated admin
        const sessionToken = await generateSessionToken(tournamentId);

        return NextResponse.json({
          success: true,
          sessionToken,
          expiresIn: '24h',
        });
      }

      default:
        throw new BadRequestError(`Unknown action: ${action}`);
    }
  } catch (error) {
    return handleError(error, requestId);
  }
}
