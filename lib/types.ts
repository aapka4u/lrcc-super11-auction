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
  category: 'APLUS' | 'BASE';
  club: 'LRCC' | 'Super11';
  availability: 'full' | 'till_11' | 'till_12' | 'tentative';
  role?: 'Batsman' | 'Bowler' | 'All-rounder' | 'WK-Batsman';
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
