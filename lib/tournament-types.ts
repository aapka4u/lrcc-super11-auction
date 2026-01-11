// ============================================
// TOURNAMENT STATUS
// ============================================

export type TournamentStatus = 'draft' | 'lobby' | 'active' | 'completed' | 'archived';

// ============================================
// TOURNAMENT CONFIGURATION
// ============================================

export interface TournamentSettings {
  teamSize: number;
  basePrices: {
    APLUS: number;
    BASE: number;
  };
  bidIncrement: number;
  currency: string;
  enableJokerCard: boolean;
  enableIntelligence: boolean;
  customRules?: string;
}

export interface TournamentTheme {
  primaryColor: string;
  secondaryColor: string;
}

export interface Tournament {
  id: string;                    // User-defined slug (validated)
  name: string;
  description?: string;
  status: TournamentStatus;
  published: boolean;            // Explicit publishing (default: false)
  createdAt: number;
  updatedAt: number;
  lastActivityAt: number;        // For slug reservation TTL
  completedAt?: number;
  expiresAt: number;             // createdAt + 90 days

  // Tournament Settings
  settings: TournamentSettings;

  // Access Control - Store hashed PIN, not plaintext
  adminPinHash: string;          // Hashed PIN for security

  // Metadata
  sport?: string;
  location?: string;
  startDate?: number;
  endDate?: number;
  logo?: string;                 // External URL only
  theme?: TournamentTheme;

  // Storage optimization
  archived: boolean;
  archiveDate?: number;
}

// ============================================
// TOURNAMENT INDEX (for discovery)
// ============================================

export interface TournamentIndexEntry {
  id: string;
  name: string;
  status: TournamentStatus;
  published: boolean;
  sport?: string;
  location?: string;
  startDate?: number;
  logo?: string;
  createdAt: number;
}

// ============================================
// TEAM
// ============================================

export interface TournamentTeam {
  id: string;
  name: string;
  budget: number;
  color: string;
  captainId?: string;
  viceCaptainId?: string;
  logo?: string;
}

// ============================================
// PLAYER
// ============================================

export type PlayerRole = 'Batsman' | 'Bowler' | 'All-rounder' | 'WK-Batsman';
export type PlayerCategory = 'APLUS' | 'BASE' | 'CAPTAIN' | 'VICE_CAPTAIN';
export type Availability = 'full' | 'till_11' | 'till_12' | 'tentative';

export interface TournamentPlayer {
  id: string;
  name: string;
  role: PlayerRole;
  category: PlayerCategory;
  club?: string;
  availability: Availability;
  image?: string;
  cricHeroesUrl?: string;
}

// ============================================
// AUCTION STATE
// ============================================

export type AuctionStatus = 'IDLE' | 'LIVE' | 'SOLD' | 'PAUSED';

export interface TournamentAuctionState {
  status: AuctionStatus;
  currentPlayerId: string | null;
  soldToTeamId: string | null;
  rosters: Record<string, string[]>;      // teamId -> playerIds
  soldPlayers: string[];                   // playerIds that have been sold
  soldPrices: Record<string, number>;      // playerId -> sold price
  teamSpent: Record<string, number>;       // teamId -> total spent
  lastUpdate: number;
  pauseMessage?: string;
  pauseUntil?: number;
  auctionStartTime?: number;
  biddingDurations?: Record<string, number>;
  unsoldPlayers?: string[];
  jokerPlayerId?: string | null;
  jokerRequestingTeamId?: string | null;
  usedJokers?: Record<string, string>;     // teamId -> playerId
}

// ============================================
// PLAYER PROFILE (for images/links)
// ============================================

export interface TournamentPlayerProfile {
  image?: string;
  cricHeroesUrl?: string;
  updatedAt: number;
}

// ============================================
// TEAM PROFILE (for logos)
// ============================================

export interface TournamentTeamProfile {
  logo?: string;
  updatedAt: number;
}

// ============================================
// ARCHIVED TOURNAMENT DATA
// ============================================

export interface ArchivedTournamentData {
  config: Tournament;
  state: TournamentAuctionState;
  teams: TournamentTeam[];
  players: TournamentPlayer[];
  profiles: Record<string, TournamentPlayerProfile>;
  teamProfiles: Record<string, TournamentTeamProfile>;
  compressedAt: number;
}

// ============================================
// DEFAULT VALUES
// ============================================

export const DEFAULT_TOURNAMENT_SETTINGS: TournamentSettings = {
  teamSize: 8,
  basePrices: {
    APLUS: 2500,
    BASE: 1000,
  },
  bidIncrement: 100,
  currency: '₹',
  enableJokerCard: true,
  enableIntelligence: true,
};

export const TOURNAMENT_EXPIRY_DAYS = 90;

export function getDefaultExpiryDate(): number {
  return Date.now() + TOURNAMENT_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
}

export function getInitialAuctionState(): TournamentAuctionState {
  return {
    status: 'IDLE',
    currentPlayerId: null,
    soldToTeamId: null,
    rosters: {},
    soldPlayers: [],
    soldPrices: {},
    teamSpent: {},
    lastUpdate: Date.now(),
    unsoldPlayers: [],
    usedJokers: {},
  };
}
