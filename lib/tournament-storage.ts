import { kv } from '@vercel/kv';
import {
  Tournament,
  TournamentAuctionState,
  TournamentTeam,
  TournamentPlayer,
  TournamentPlayerProfile,
  TournamentTeamProfile,
  TournamentIndexEntry,
} from './tournament-types';

// ============================================
// KEY GENERATION
// ============================================

export function getTournamentKey(tournamentId: string, key: string): string {
  return `tournament:${tournamentId}:${key}`;
}

export function getArchiveKey(tournamentId: string, key: string): string {
  return `archive:${tournamentId}:${key}`;
}

// ============================================
// TOURNAMENT CONFIG OPERATIONS
// ============================================

export async function getTournamentConfig(tournamentId: string): Promise<Tournament | null> {
  try {
    return await kv.get<Tournament>(getTournamentKey(tournamentId, 'config'));
  } catch (error) {
    console.error('Failed to get tournament config:', error);
    return null;
  }
}

export async function setTournamentConfig(tournamentId: string, config: Tournament): Promise<void> {
  try {
    await kv.set(getTournamentKey(tournamentId, 'config'), config);
  } catch (error) {
    console.error('Failed to set tournament config:', error);
    throw error;
  }
}

export async function deleteTournamentConfig(tournamentId: string): Promise<void> {
  try {
    await kv.del(getTournamentKey(tournamentId, 'config'));
  } catch (error) {
    console.error('Failed to delete tournament config:', error);
    throw error;
  }
}

// ============================================
// AUCTION STATE OPERATIONS
// ============================================

export async function getTournamentState(tournamentId: string): Promise<TournamentAuctionState | null> {
  try {
    return await kv.get<TournamentAuctionState>(getTournamentKey(tournamentId, 'state'));
  } catch (error) {
    console.error('Failed to get tournament state:', error);
    return null;
  }
}

export async function setTournamentState(tournamentId: string, state: TournamentAuctionState): Promise<void> {
  try {
    await kv.set(getTournamentKey(tournamentId, 'state'), state);
  } catch (error) {
    console.error('Failed to set tournament state:', error);
    throw error;
  }
}

// ============================================
// TEAMS OPERATIONS
// ============================================

export async function getTournamentTeams(tournamentId: string): Promise<TournamentTeam[]> {
  try {
    const teams = await kv.get<TournamentTeam[]>(getTournamentKey(tournamentId, 'teams'));
    return teams || [];
  } catch (error) {
    console.error('Failed to get tournament teams:', error);
    return [];
  }
}

export async function setTournamentTeams(tournamentId: string, teams: TournamentTeam[]): Promise<void> {
  try {
    await kv.set(getTournamentKey(tournamentId, 'teams'), teams);
  } catch (error) {
    console.error('Failed to set tournament teams:', error);
    throw error;
  }
}

// ============================================
// PLAYERS OPERATIONS
// ============================================

export async function getTournamentPlayers(tournamentId: string): Promise<TournamentPlayer[]> {
  try {
    const players = await kv.get<TournamentPlayer[]>(getTournamentKey(tournamentId, 'players'));
    return players || [];
  } catch (error) {
    console.error('Failed to get tournament players:', error);
    return [];
  }
}

export async function setTournamentPlayers(tournamentId: string, players: TournamentPlayer[]): Promise<void> {
  try {
    await kv.set(getTournamentKey(tournamentId, 'players'), players);
  } catch (error) {
    console.error('Failed to set tournament players:', error);
    throw error;
  }
}

// ============================================
// PLAYER PROFILES OPERATIONS
// ============================================

export async function getPlayerProfiles(tournamentId: string): Promise<Record<string, TournamentPlayerProfile>> {
  try {
    const profiles = await kv.get<Record<string, TournamentPlayerProfile>>(
      getTournamentKey(tournamentId, 'profiles')
    );
    return profiles || {};
  } catch (error) {
    console.error('Failed to get player profiles:', error);
    return {};
  }
}

export async function setPlayerProfiles(
  tournamentId: string,
  profiles: Record<string, TournamentPlayerProfile>
): Promise<void> {
  try {
    await kv.set(getTournamentKey(tournamentId, 'profiles'), profiles);
  } catch (error) {
    console.error('Failed to set player profiles:', error);
    throw error;
  }
}

export async function updatePlayerProfile(
  tournamentId: string,
  playerId: string,
  profile: Partial<TournamentPlayerProfile>
): Promise<void> {
  const profiles = await getPlayerProfiles(tournamentId);
  profiles[playerId] = {
    ...profiles[playerId],
    ...profile,
    updatedAt: Date.now(),
  };
  await setPlayerProfiles(tournamentId, profiles);
}

// ============================================
// TEAM PROFILES OPERATIONS
// ============================================

export async function getTeamProfiles(tournamentId: string): Promise<Record<string, TournamentTeamProfile>> {
  try {
    const profiles = await kv.get<Record<string, TournamentTeamProfile>>(
      getTournamentKey(tournamentId, 'team_profiles')
    );
    return profiles || {};
  } catch (error) {
    console.error('Failed to get team profiles:', error);
    return {};
  }
}

export async function setTeamProfiles(
  tournamentId: string,
  profiles: Record<string, TournamentTeamProfile>
): Promise<void> {
  try {
    await kv.set(getTournamentKey(tournamentId, 'team_profiles'), profiles);
  } catch (error) {
    console.error('Failed to set team profiles:', error);
    throw error;
  }
}

export async function updateTeamProfile(
  tournamentId: string,
  teamId: string,
  profile: Partial<TournamentTeamProfile>
): Promise<void> {
  const profiles = await getTeamProfiles(tournamentId);
  profiles[teamId] = {
    ...profiles[teamId],
    ...profile,
    updatedAt: Date.now(),
  };
  await setTeamProfiles(tournamentId, profiles);
}

// ============================================
// INDEX MANAGEMENT
// ============================================

export async function addToTournamentIndex(tournament: Tournament): Promise<void> {
  const entry: TournamentIndexEntry = {
    id: tournament.id,
    name: tournament.name,
    status: tournament.status,
    published: tournament.published,
    sport: tournament.sport,
    location: tournament.location,
    startDate: tournament.startDate,
    logo: tournament.logo,
    createdAt: tournament.createdAt,
  };

  try {
    // Add to all tournaments set
    await kv.sadd('tournaments:all', tournament.id);

    // Add to published set if published
    if (tournament.published) {
      await kv.sadd('tournaments:published', tournament.id);
    }

    // Store index entry
    await kv.set(`tournaments:index:${tournament.id}`, entry);
  } catch (error) {
    console.error('Failed to add tournament to index:', error);
    throw error;
  }
}

export async function removeFromTournamentIndex(tournamentId: string): Promise<void> {
  try {
    await Promise.all([
      kv.srem('tournaments:all', tournamentId),
      kv.srem('tournaments:published', tournamentId),
      kv.del(`tournaments:index:${tournamentId}`),
    ]);
  } catch (error) {
    console.error('Failed to remove tournament from index:', error);
    throw error;
  }
}

export async function updateTournamentPublished(tournamentId: string, published: boolean): Promise<void> {
  try {
    if (published) {
      await kv.sadd('tournaments:published', tournamentId);
    } else {
      await kv.srem('tournaments:published', tournamentId);
    }

    // Update index entry
    const entry = await kv.get<TournamentIndexEntry>(`tournaments:index:${tournamentId}`);
    if (entry) {
      entry.published = published;
      await kv.set(`tournaments:index:${tournamentId}`, entry);
    }
  } catch (error) {
    console.error('Failed to update tournament published status:', error);
    throw error;
  }
}

export async function getPublishedTournaments(): Promise<string[]> {
  try {
    const ids = await kv.smembers('tournaments:published');
    return (ids as string[]) || [];
  } catch (error) {
    console.error('Failed to get published tournaments:', error);
    return [];
  }
}

export async function getAllTournaments(): Promise<string[]> {
  try {
    const ids = await kv.smembers('tournaments:all');
    return (ids as string[]) || [];
  } catch (error) {
    console.error('Failed to get all tournaments:', error);
    return [];
  }
}

export async function getTournamentIndexEntry(tournamentId: string): Promise<TournamentIndexEntry | null> {
  try {
    return await kv.get<TournamentIndexEntry>(`tournaments:index:${tournamentId}`);
  } catch (error) {
    console.error('Failed to get tournament index entry:', error);
    return null;
  }
}

export async function getPublishedTournamentsList(): Promise<TournamentIndexEntry[]> {
  const ids = await getPublishedTournaments();
  const entries = await Promise.all(
    ids.map(id => getTournamentIndexEntry(id))
  );
  return entries.filter((e): e is TournamentIndexEntry => e !== null);
}

// ============================================
// EXISTENCE CHECKS
// ============================================

export async function tournamentExists(tournamentId: string): Promise<boolean> {
  const config = await getTournamentConfig(tournamentId);
  return config !== null;
}

// ============================================
// CLEANUP HELPERS
// ============================================

export async function deleteTournamentData(tournamentId: string): Promise<void> {
  const keys = [
    getTournamentKey(tournamentId, 'config'),
    getTournamentKey(tournamentId, 'state'),
    getTournamentKey(tournamentId, 'teams'),
    getTournamentKey(tournamentId, 'players'),
    getTournamentKey(tournamentId, 'profiles'),
    getTournamentKey(tournamentId, 'team_profiles'),
  ];

  try {
    await Promise.all([
      ...keys.map(key => kv.del(key)),
      removeFromTournamentIndex(tournamentId),
    ]);
  } catch (error) {
    console.error('Failed to delete tournament data:', error);
    throw error;
  }
}

// ============================================
// BATCH OPERATIONS
// ============================================

export async function getTournamentFullData(tournamentId: string): Promise<{
  config: Tournament | null;
  state: TournamentAuctionState | null;
  teams: TournamentTeam[];
  players: TournamentPlayer[];
  profiles: Record<string, TournamentPlayerProfile>;
  teamProfiles: Record<string, TournamentTeamProfile>;
}> {
  const [config, state, teams, players, profiles, teamProfiles] = await Promise.all([
    getTournamentConfig(tournamentId),
    getTournamentState(tournamentId),
    getTournamentTeams(tournamentId),
    getTournamentPlayers(tournamentId),
    getPlayerProfiles(tournamentId),
    getTeamProfiles(tournamentId),
  ]);

  return { config, state, teams, players, profiles, teamProfiles };
}
