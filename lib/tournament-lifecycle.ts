import { kv } from '@vercel/kv';
import {
  Tournament,
  TournamentStatus,
  ArchivedTournamentData,
  TOURNAMENT_EXPIRY_DAYS,
} from './tournament-types';
import {
  getTournamentConfig,
  setTournamentConfig,
  getTournamentFullData,
  removeFromTournamentIndex,
  getArchiveKey,
  getTournamentKey,
} from './tournament-storage';

// ============================================
// LIFECYCLE STATUS
// ============================================

export type LifecycleStatus = 'active' | 'readonly' | 'expired';

export interface LifecycleInfo {
  status: LifecycleStatus;
  daysRemaining: number;
  expiresAt: number;
  canModify: boolean;
  warning?: string;
}

/**
 * Get lifecycle status for a tournament
 */
export function getTournamentLifecycleStatus(tournament: Tournament): LifecycleInfo {
  const now = Date.now();
  const daysRemaining = Math.ceil((tournament.expiresAt - now) / (24 * 60 * 60 * 1000));

  if (daysRemaining <= 0) {
    return {
      status: 'expired',
      daysRemaining: 0,
      expiresAt: tournament.expiresAt,
      canModify: false,
      warning: 'Tournament has expired and will be deleted soon',
    };
  }

  if (daysRemaining <= 10) {
    return {
      status: 'readonly',
      daysRemaining,
      expiresAt: tournament.expiresAt,
      canModify: false,
      warning: `Tournament will expire in ${daysRemaining} days. No modifications allowed.`,
    };
  }

  return {
    status: 'active',
    daysRemaining,
    expiresAt: tournament.expiresAt,
    canModify: true,
  };
}

// ============================================
// STATUS TRANSITIONS
// ============================================

const VALID_TRANSITIONS: Record<TournamentStatus, TournamentStatus[]> = {
  draft: ['lobby', 'archived'],
  lobby: ['active', 'draft', 'archived'],
  active: ['completed', 'lobby', 'archived'],
  completed: ['archived'],
  archived: [], // No transitions from archived
};

export function canTransitionTo(from: TournamentStatus, to: TournamentStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export async function transitionTournamentStatus(
  tournamentId: string,
  newStatus: TournamentStatus
): Promise<{ success: boolean; error?: string }> {
  const tournament = await getTournamentConfig(tournamentId);

  if (!tournament) {
    return { success: false, error: 'Tournament not found' };
  }

  if (!canTransitionTo(tournament.status, newStatus)) {
    return {
      success: false,
      error: `Cannot transition from ${tournament.status} to ${newStatus}`,
    };
  }

  tournament.status = newStatus;
  tournament.updatedAt = Date.now();
  tournament.lastActivityAt = Date.now();

  if (newStatus === 'completed') {
    tournament.completedAt = Date.now();
  }

  await setTournamentConfig(tournamentId, tournament);

  return { success: true };
}

// ============================================
// ARCHIVAL
// ============================================

const ARCHIVE_TTL_SECONDS = TOURNAMENT_EXPIRY_DAYS * 24 * 60 * 60; // 90 days

/**
 * Archive a tournament - compress and store data, remove from active indexes
 */
export async function archiveTournament(tournamentId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const fullData = await getTournamentFullData(tournamentId);

    if (!fullData.config) {
      return { success: false, error: 'Tournament not found' };
    }

    if (fullData.config.archived) {
      return { success: false, error: 'Tournament is already archived' };
    }

    // Create archived data blob
    const archivedData: ArchivedTournamentData = {
      config: fullData.config,
      state: fullData.state!,
      teams: fullData.teams,
      players: fullData.players,
      profiles: fullData.profiles,
      teamProfiles: fullData.teamProfiles,
      compressedAt: Date.now(),
    };

    // Store as single compressed blob
    const jsonData = JSON.stringify(archivedData);
    await kv.set(getArchiveKey(tournamentId, 'data'), jsonData, {
      ex: ARCHIVE_TTL_SECONDS,
    });

    // Store lightweight metadata for querying
    await kv.set(
      getArchiveKey(tournamentId, 'metadata'),
      {
        name: fullData.config.name,
        completedAt: fullData.config.completedAt,
        archivedAt: Date.now(),
      },
      { ex: ARCHIVE_TTL_SECONDS }
    );

    // Update tournament config to mark as archived
    fullData.config.archived = true;
    fullData.config.archiveDate = Date.now();
    fullData.config.status = 'archived';
    fullData.config.updatedAt = Date.now();
    await setTournamentConfig(tournamentId, fullData.config);

    // Remove from active indexes
    await removeFromTournamentIndex(tournamentId);

    // Delete active data keys (frees up space)
    await Promise.all([
      kv.del(getTournamentKey(tournamentId, 'state')),
      kv.del(getTournamentKey(tournamentId, 'teams')),
      kv.del(getTournamentKey(tournamentId, 'players')),
      kv.del(getTournamentKey(tournamentId, 'profiles')),
      kv.del(getTournamentKey(tournamentId, 'team_profiles')),
    ]);

    return { success: true };
  } catch (error) {
    console.error('Failed to archive tournament:', error);
    return { success: false, error: 'Failed to archive tournament' };
  }
}

/**
 * Retrieve archived tournament data
 */
export async function getArchivedTournament(tournamentId: string): Promise<ArchivedTournamentData | null> {
  try {
    const jsonData = await kv.get<string>(getArchiveKey(tournamentId, 'data'));
    if (!jsonData) {
      return null;
    }
    return JSON.parse(jsonData) as ArchivedTournamentData;
  } catch (error) {
    console.error('Failed to get archived tournament:', error);
    return null;
  }
}

// ============================================
// ACTIVITY TRACKING
// ============================================

/**
 * Update last activity timestamp for a tournament
 */
export async function updateTournamentActivity(tournamentId: string): Promise<void> {
  const tournament = await getTournamentConfig(tournamentId);
  if (tournament) {
    tournament.lastActivityAt = Date.now();
    await setTournamentConfig(tournamentId, tournament);
  }
}

// ============================================
// EXPIRATION CHECKS
// ============================================

/**
 * Check if a tournament is expired
 */
export function isTournamentExpired(tournament: Tournament): boolean {
  return Date.now() > tournament.expiresAt;
}

/**
 * Check if a tournament is in read-only mode (last 10 days before expiry)
 */
export function isTournamentReadOnly(tournament: Tournament): boolean {
  const daysRemaining = Math.ceil((tournament.expiresAt - Date.now()) / (24 * 60 * 60 * 1000));
  return daysRemaining <= 10 && daysRemaining > 0;
}

/**
 * Get tournaments that should be archived (completed > 7 days ago)
 */
export async function getTournamentsToArchive(): Promise<string[]> {
  // This would require scanning all tournaments
  // In practice, this should be run as a cron job
  const allIds = await kv.smembers('tournaments:all') as string[];
  const toArchive: string[] = [];

  for (const id of allIds) {
    const config = await getTournamentConfig(id);
    if (!config) continue;

    if (
      config.status === 'completed' &&
      config.completedAt &&
      !config.archived &&
      Date.now() - config.completedAt > 7 * 24 * 60 * 60 * 1000 // 7 days
    ) {
      toArchive.push(id);
    }
  }

  return toArchive;
}

/**
 * Get tournaments that should be deleted (archived > 90 days or draft with no activity > 1 hour)
 */
export async function getTournamentsToDelete(): Promise<string[]> {
  const allIds = await kv.smembers('tournaments:all') as string[];
  const toDelete: string[] = [];

  for (const id of allIds) {
    const config = await getTournamentConfig(id);
    if (!config) continue;

    // Delete archived tournaments past expiry
    if (config.archived && config.archiveDate) {
      const daysSinceArchive = (Date.now() - config.archiveDate) / (24 * 60 * 60 * 1000);
      if (daysSinceArchive > TOURNAMENT_EXPIRY_DAYS) {
        toDelete.push(id);
        continue;
      }
    }

    // Delete draft tournaments with no activity for 24 hours
    if (config.status === 'draft') {
      const hoursSinceActivity = (Date.now() - config.lastActivityAt) / (60 * 60 * 1000);
      if (hoursSinceActivity > 24) {
        toDelete.push(id);
        continue;
      }
    }

    // Delete expired tournaments
    if (isTournamentExpired(config)) {
      toDelete.push(id);
    }
  }

  return toDelete;
}

// ============================================
// EXTENSION
// ============================================

/**
 * Extend tournament expiry date (for paid/premium tournaments in future)
 */
export async function extendTournamentExpiry(
  tournamentId: string,
  additionalDays: number
): Promise<{ success: boolean; error?: string; newExpiresAt?: number }> {
  const tournament = await getTournamentConfig(tournamentId);

  if (!tournament) {
    return { success: false, error: 'Tournament not found' };
  }

  if (tournament.archived) {
    return { success: false, error: 'Cannot extend archived tournament' };
  }

  const newExpiresAt = tournament.expiresAt + additionalDays * 24 * 60 * 60 * 1000;
  tournament.expiresAt = newExpiresAt;
  tournament.updatedAt = Date.now();

  await setTournamentConfig(tournamentId, tournament);

  return { success: true, newExpiresAt };
}
