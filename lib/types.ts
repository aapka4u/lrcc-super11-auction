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

export type AuctionStatus = 'IDLE' | 'LIVE' | 'SOLD';

export interface AuctionState {
  status: AuctionStatus;
  currentPlayerId: string | null;
  soldToTeamId: string | null;
  rosters: Record<string, string[]>; // teamId -> playerIds
  soldPlayers: string[]; // playerIds that have been sold
  lastUpdate: number;
}

export interface PublicState {
  status: AuctionStatus;
  currentPlayer: Player | null;
  soldToTeam: Team | null;
  teams: (Team & { roster: Player[] })[];
  lastUpdate: number;
}
