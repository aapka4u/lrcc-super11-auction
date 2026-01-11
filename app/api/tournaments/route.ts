import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { handleError, BadRequestError, ConflictError } from '@/lib/errors';
import { checkRateLimit, getClientIP, getRateLimitHeaders } from '@/lib/rate-limit';
import { validateTournamentSlug, validateAdminPin } from '@/lib/tournament-validation';
import { hashPin, generateMasterAdminToken } from '@/lib/tournament-auth';
import { logAudit } from '@/lib/audit';
import {
  Tournament,
  TournamentSettings,
  DEFAULT_TOURNAMENT_SETTINGS,
  getDefaultExpiryDate,
  getInitialAuctionState,
} from '@/lib/tournament-types';
import {
  getTournamentConfig,
  setTournamentConfig,
  setTournamentState,
  addToTournamentIndex,
  tournamentExists,
  getPublishedTournamentsList,
} from '@/lib/tournament-storage';
import { CreateTournamentSchema, validate, formatValidationErrors } from '@/lib/schemas';

// ============================================
// GET /api/tournaments - List published tournaments
// ============================================

export async function GET(): Promise<NextResponse> {
  try {
    const tournaments = await getPublishedTournamentsList();

    // Sort by creation date, newest first
    tournaments.sort((a, b) => b.createdAt - a.createdAt);

    return NextResponse.json({
      tournaments,
      count: tournaments.length,
    });
  } catch (error) {
    return handleError(error);
  }
}

// ============================================
// POST /api/tournaments - Create a new tournament
// ============================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = nanoid(8);

  try {
    // Rate limiting
    const ip = getClientIP(request);
    const rateLimitResult = await checkRateLimit(ip, 'TOURNAMENT_CREATE');

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. You can create up to 3 tournaments per day.',
          code: 'RATE_LIMITED',
          resetAt: rateLimitResult.resetAt,
        },
        {
          status: 429,
          headers: {
            ...getRateLimitHeaders(rateLimitResult),
            'Retry-After': Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    // Parse request body
    const body = await request.json().catch(() => null);
    if (!body) {
      throw new BadRequestError('Invalid JSON body');
    }

    // Validate with Zod schema
    const validation = validate(CreateTournamentSchema, body);
    if (!validation.success) {
      throw new BadRequestError(formatValidationErrors(validation.errors), 'VALIDATION_ERROR');
    }

    const { slug, name, description, adminPin, settings, sport, location, startDate, endDate, logo, theme } =
      validation.data;

    // Validate slug format
    const slugValidation = validateTournamentSlug(slug);
    if (!slugValidation.valid) {
      throw new BadRequestError(slugValidation.error!, slugValidation.code);
    }

    // Validate PIN strength
    const pinValidation = validateAdminPin(adminPin);
    if (!pinValidation.valid) {
      throw new BadRequestError(pinValidation.error!, pinValidation.code);
    }

    // Check if slug already exists
    const exists = await tournamentExists(slug);
    if (exists) {
      throw new ConflictError('Tournament ID already exists. Please choose a different ID.', 'SLUG_TAKEN');
    }

    // Create tournament config
    const now = Date.now();

    // Merge settings with defaults, ensuring required fields are present
    const mergedSettings: TournamentSettings = {
      teamSize: settings?.teamSize ?? DEFAULT_TOURNAMENT_SETTINGS.teamSize,
      basePrices: {
        APLUS: settings?.basePrices?.APLUS ?? DEFAULT_TOURNAMENT_SETTINGS.basePrices.APLUS,
        BASE: settings?.basePrices?.BASE ?? DEFAULT_TOURNAMENT_SETTINGS.basePrices.BASE,
      },
      bidIncrement: settings?.bidIncrement ?? DEFAULT_TOURNAMENT_SETTINGS.bidIncrement,
      currency: settings?.currency ?? DEFAULT_TOURNAMENT_SETTINGS.currency,
      enableJokerCard: settings?.enableJokerCard ?? DEFAULT_TOURNAMENT_SETTINGS.enableJokerCard,
      enableIntelligence: settings?.enableIntelligence ?? DEFAULT_TOURNAMENT_SETTINGS.enableIntelligence,
      customRules: settings?.customRules ?? DEFAULT_TOURNAMENT_SETTINGS.customRules,
    };

    const tournament: Tournament = {
      id: slug,
      name,
      description,
      status: 'draft',
      published: false,
      createdAt: now,
      updatedAt: now,
      lastActivityAt: now,
      expiresAt: getDefaultExpiryDate(),
      settings: mergedSettings,
      adminPinHash: hashPin(adminPin, slug),
      sport,
      location,
      startDate,
      endDate,
      logo,
      theme,
      archived: false,
    };

    // Generate master admin token
    const masterAdminToken = await generateMasterAdminToken(slug);

    // Save tournament config and initial state
    await Promise.all([
      setTournamentConfig(slug, tournament),
      setTournamentState(slug, getInitialAuctionState()),
      addToTournamentIndex(tournament),
    ]);

    // Log audit
    await logAudit({
      tournamentId: slug,
      action: 'TOURNAMENT_CREATED',
      actorType: 'admin',
      ip,
      details: {
        name,
        sport,
        location,
      },
    });

    return NextResponse.json(
      {
        success: true,
        tournament: {
          id: tournament.id,
          name: tournament.name,
          status: tournament.status,
          published: tournament.published,
          createdAt: tournament.createdAt,
          expiresAt: tournament.expiresAt,
          settings: tournament.settings,
        },
        masterAdminToken,
        message:
          'Tournament created successfully. Save the masterAdminToken securely - it can be used to recover admin access if you forget your PIN.',
        adminUrl: `/${slug}/admin`,
        publicUrl: `/${slug}`,
      },
      {
        status: 201,
        headers: {
          'X-Request-ID': requestId,
          ...getRateLimitHeaders(rateLimitResult),
        },
      }
    );
  } catch (error) {
    const response = handleError(error, requestId);
    return response;
  }
}
