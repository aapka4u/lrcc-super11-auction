export interface Team {
  id: string;
  name: string;
  captain: string;
  viceCaptain: string;
  color: string;
  budget: number;
}

export interface Player {
  id: string;
  name: string;
  category: 'APLUS' | 'BASE' | 'CAPTAIN' | 'VICE_CAPTAIN';
  club: 'LRCC' | 'Super11';
  availability: 'full' | 'till_11' | 'till_12' | 'tentative';
  role?: 'Batsman' | 'Bowler' | 'All-rounder' | 'WK-Batsman';
  image?: string; // URL to player image (uploaded or external)
  teamId?: string; // for captains/VCs - which team they belong to
  cricHeroesUrl?: string; // link to CricHeroes profile
}

// Player profile data stored in KV (images, cricHeroes links)
export interface PlayerProfile {
  playerId: string;
  image?: string; // base64 or URL
  cricHeroesUrl?: string;
  updatedAt: number;
}

export type AuctionStatus = 'IDLE' | 'LIVE' | 'SOLD' | 'PAUSED';

// Base prices for player categories
export const BASE_PRICES = {
  APLUS: 2500,
  BASE: 1000,
  CAPTAIN: 0, // Already assigned
  VICE_CAPTAIN: 0, // Already assigned
} as const;

// Total players each team needs (including C and VC)
export const TEAM_SIZE = 8;

export interface AuctionState {
  status: AuctionStatus;
  currentPlayerId: string | null;
  soldToTeamId: string | null;
  rosters: Record<string, string[]>; // teamId -> playerIds
  soldPlayers: string[]; // playerIds that have been sold
  soldPrices: Record<string, number>; // playerId -> sold price
  teamSpent: Record<string, number>; // teamId -> total spent
  lastUpdate: number;
  pauseMessage?: string; // Custom message when paused
  pauseUntil?: number; // Timestamp when auction resumes
  // Bidding tracking for story generation
  auctionStartTime?: number; // When current player went LIVE
  biddingDurations?: Record<string, number>; // playerId -> seconds it took to sell
}

// Sale history for team stories
export interface SaleRecord {
  playerId: string;
  teamId: string;
  price: number;
  duration: number; // seconds
  timestamp: number;
}

export interface PublicState {
  status: AuctionStatus;
  currentPlayer: Player | null;
  soldToTeam: Team | null;
  teams: (Team & { roster: Player[] })[];
  lastUpdate: number;
}
