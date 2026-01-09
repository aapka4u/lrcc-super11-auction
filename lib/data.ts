import { Team, Player, TEAM_SIZE, BASE_PRICES } from './types';

export const TEAMS: Team[] = [
  {
    id: 'team_sree_naveen',
    name: 'Team Sree & Naveen',
    captain: 'Sree',
    viceCaptain: 'Naveen',
    color: '#3B82F6', // Blue
    budget: 11500,
  },
  {
    id: 'team_sathish_mehul',
    name: 'Team Sathish & Mehul',
    captain: 'Sathish',
    viceCaptain: 'Mehul Lalith',
    color: '#EF4444', // Red
    budget: 11500,
  },
  {
    id: 'team_rohit_praveen',
    name: 'Team Rohit & Praveen',
    captain: 'Rohit',
    viceCaptain: 'Praveen',
    color: '#10B981', // Green
    budget: 11500,
  },
  {
    id: 'team_rajul_kathir',
    name: 'Team Rajul & Kathir',
    captain: 'Rajul',
    viceCaptain: 'Kathir',
    color: '#F59E0B', // Amber
    budget: 11500,
  },
  {
    id: 'team_vaibhav_sasi',
    name: 'Team Vaibhav & Sasi',
    captain: 'Vaibhav',
    viceCaptain: 'Sasi',
    color: '#8B5CF6', // Purple
    budget: 11500,
  },
  {
    id: 'team_murali_paddy',
    name: 'Team Murali & Paddy',
    captain: 'Murali',
    viceCaptain: 'KP Paddy',
    color: '#EC4899', // Pink
    budget: 12500,
  },
];

// Captains and Vice-Captains (not in auction pool)
export const TEAM_LEADERS: Player[] = [
  // Team Sree & Naveen
  { id: 'sree', name: 'Sree', category: 'CAPTAIN', club: 'LRCC', availability: 'full', role: 'All-rounder', teamId: 'team_sree_naveen' },
  { id: 'naveen', name: 'Naveen', category: 'VICE_CAPTAIN', club: 'Super11', availability: 'full', role: 'All-rounder', teamId: 'team_sree_naveen' },

  // Team Sathish & Mehul
  { id: 'sathish', name: 'Sathish', category: 'CAPTAIN', club: 'Super11', availability: 'full', role: 'All-rounder', teamId: 'team_sathish_mehul' },
  { id: 'mehul_lalith', name: 'Mehul Lalith', category: 'VICE_CAPTAIN', club: 'LRCC', availability: 'full', role: 'All-rounder', teamId: 'team_sathish_mehul' },

  // Team Rohit & Praveen
  { id: 'rohit', name: 'Rohit', category: 'CAPTAIN', club: 'LRCC', availability: 'full', role: 'All-rounder', teamId: 'team_rohit_praveen' },
  { id: 'praveen', name: 'Praveen', category: 'VICE_CAPTAIN', club: 'Super11', availability: 'full', role: 'Bowler', teamId: 'team_rohit_praveen' },

  // Team Rajul & Kathir
  { id: 'rajul', name: 'Rajul', category: 'CAPTAIN', club: 'LRCC', availability: 'full', role: 'All-rounder', teamId: 'team_rajul_kathir' },
  { id: 'kathir', name: 'Kathir', category: 'VICE_CAPTAIN', club: 'Super11', availability: 'full', role: 'All-rounder', teamId: 'team_rajul_kathir' },

  // Team Vaibhav & Sasi
  { id: 'vaibhav', name: 'Vaibhav', category: 'CAPTAIN', club: 'LRCC', availability: 'full', role: 'All-rounder', teamId: 'team_vaibhav_sasi' },
  { id: 'sasi', name: 'Sasi', category: 'VICE_CAPTAIN', club: 'Super11', availability: 'full', role: 'All-rounder', teamId: 'team_vaibhav_sasi' },

  // Team Murali & Paddy
  { id: 'murali', name: 'Murali', category: 'CAPTAIN', club: 'Super11', availability: 'full', role: 'All-rounder', teamId: 'team_murali_paddy' },
  { id: 'kp_paddy', name: 'KP Paddy', category: 'VICE_CAPTAIN', club: 'LRCC', availability: 'full', role: 'WK-Batsman', teamId: 'team_murali_paddy' },
];

// Auction pool players
export const PLAYERS: Player[] = [
  // A+ Category (6 players)
  { id: 'bir', name: 'Bir', category: 'APLUS', club: 'LRCC', availability: 'full', role: 'All-rounder' },
  { id: 'puneet', name: 'Puneet', category: 'APLUS', club: 'LRCC', availability: 'full', role: 'All-rounder' },
  { id: 'tushar', name: 'Tushar', category: 'APLUS', club: 'Super11', availability: 'till_12', role: 'All-rounder' },
  { id: 'akash', name: 'Akash', category: 'APLUS', club: 'Super11', availability: 'full', role: 'All-rounder' },
  { id: 'ajinkya', name: 'Ajinkya', category: 'APLUS', club: 'Super11', availability: 'full', role: 'All-rounder' },
  { id: 'sayed_saadat', name: 'Sayed Saadat', category: 'APLUS', club: 'LRCC', availability: 'full', role: 'All-rounder' },

  // BASE Category - LRCC
  { id: 'kunal_kanade', name: 'Kunal Kanade', category: 'BASE', club: 'LRCC', availability: 'full', role: 'Bowler' },
  { id: 'vikas', name: 'Vikas', category: 'BASE', club: 'LRCC', availability: 'full', role: 'WK-Batsman' },
  { id: 'nitesh_more', name: 'Nitesh More', category: 'BASE', club: 'LRCC', availability: 'full', role: 'All-rounder' },
  { id: 'srini', name: 'Srini', category: 'BASE', club: 'LRCC', availability: 'full', role: 'WK-Batsman' },
  { id: 'ayush_kothari', name: 'Ayush Kothari', category: 'BASE', club: 'LRCC', availability: 'full', role: 'All-rounder' },
  { id: 'jitesh', name: 'Jitesh', category: 'BASE', club: 'LRCC', availability: 'full', role: 'All-rounder' },
  { id: 'karna_bhatt', name: 'Karna Bhatt', category: 'BASE', club: 'LRCC', availability: 'full', role: 'Batsman' },
  { id: 'aditya', name: 'Aditya', category: 'BASE', club: 'LRCC', availability: 'full', role: 'All-rounder' },
  { id: 'jayendra', name: 'Jayendra', category: 'BASE', club: 'LRCC', availability: 'full', role: 'Batsman' },
  { id: 'prakhar', name: 'Prakhar', category: 'BASE', club: 'LRCC', availability: 'full', role: 'All-rounder' },
  { id: 'manjeet', name: 'Manjeet', category: 'BASE', club: 'LRCC', availability: 'full', role: 'All-rounder' },
  { id: 'sayed_zahid', name: 'Sayed Zahid', category: 'BASE', club: 'LRCC', availability: 'full', role: 'Bowler' },
  { id: 'gagan_sharma', name: 'Gagan Sharma', category: 'BASE', club: 'LRCC', availability: 'full', role: 'WK-Batsman' },
  { id: 'mahay_sanjeev', name: 'Mahay Sanjeev', category: 'BASE', club: 'LRCC', availability: 'full', role: 'Bowler' },
  { id: 'amulya', name: 'Amulya', category: 'BASE', club: 'LRCC', availability: 'tentative', role: 'All-rounder' },
  { id: 'yakeen', name: 'Yakeen', category: 'BASE', club: 'LRCC', availability: 'full', role: 'Batsman' },
  { id: 'bala', name: 'Bala', category: 'BASE', club: 'LRCC', availability: 'full', role: 'WK-Batsman' },
  { id: 'brijul', name: 'Brijul', category: 'BASE', club: 'LRCC', availability: 'full', role: 'All-rounder' },
  { id: 'vinith', name: 'Vinith', category: 'BASE', club: 'LRCC', availability: 'full', role: 'All-rounder' },
  { id: 'ayush_agarwal', name: 'Ayush Agarwal', category: 'BASE', club: 'LRCC', availability: 'full', role: 'Batsman' },
  { id: 'arjun', name: 'Arjun', category: 'BASE', club: 'LRCC', availability: 'full', role: 'All-rounder' },

  // BASE Category - Super11
  { id: 'saravanan', name: 'Saravanan', category: 'BASE', club: 'Super11', availability: 'full', role: 'Batsman' },
  { id: 'kannav', name: 'Kannav', category: 'BASE', club: 'Super11', availability: 'full', role: 'Batsman' },
  { id: 'prathush', name: 'Prathush', category: 'BASE', club: 'Super11', availability: 'full', role: 'Bowler' },
  { id: 'vipul', name: 'Vipul', category: 'BASE', club: 'Super11', availability: 'full', role: 'Bowler' },
  { id: 'anish', name: 'Anish', category: 'BASE', club: 'Super11', availability: 'full', role: 'All-rounder' },
  { id: 'satheesh', name: 'Satheesh', category: 'BASE', club: 'Super11', availability: 'full', role: 'All-rounder' },
  { id: 'kamal', name: 'Kamal', category: 'BASE', club: 'Super11', availability: 'full', role: 'Batsman' },
  { id: 'bhuvanesh', name: 'Bhuvanesh', category: 'BASE', club: 'Super11', availability: 'full', role: 'Bowler' },
  { id: 'karthik', name: 'Karthik', category: 'BASE', club: 'Super11', availability: 'full', role: 'Batsman' },
];

// All players combined (for the players page)
export const ALL_PLAYERS: Player[] = [...TEAM_LEADERS, ...PLAYERS];

export const getInitialState = () => ({
  status: 'IDLE' as const,
  currentPlayerId: null,
  soldToTeamId: null,
  rosters: Object.fromEntries(TEAMS.map(t => [t.id, []])),
  soldPlayers: [],
  soldPrices: {} as Record<string, number>,
  teamSpent: Object.fromEntries(TEAMS.map(t => [t.id, 0])),
  lastUpdate: Date.now(),
  pauseMessage: undefined,
  pauseUntil: undefined,
});

// Calculate max bid a team can make
// Formula: remaining budget - (players still needed * base price for remaining players)
export const calculateMaxBid = (
  teamId: string,
  teamSpent: number,
  rosterSize: number, // Current roster size (excluding C and VC)
  remainingAplusCount: number, // A+ players still in pool
  remainingBaseCount: number // Base players still in pool
): number => {
  const team = TEAMS.find(t => t.id === teamId);
  if (!team) return 0;

  const remainingBudget = team.budget - teamSpent;
  const playersStillNeeded = (TEAM_SIZE - 2) - rosterSize; // -2 for C and VC

  if (playersStillNeeded <= 0) return 0; // Team is full

  // Reserve minimum for remaining players at base price
  // Worst case: all remaining picks are base players at 1000
  const reserveForFuturePlayers = (playersStillNeeded - 1) * BASE_PRICES.BASE;

  const maxBid = remainingBudget - reserveForFuturePlayers;
  return Math.max(0, maxBid);
};

export const getPlayerById = (id: string): Player | undefined => 
  PLAYERS.find(p => p.id === id);

export const getTeamById = (id: string): Team | undefined => 
  TEAMS.find(t => t.id === id);

export const getAvailablePlayers = (soldPlayerIds: string[]): Player[] =>
  PLAYERS.filter(p => !soldPlayerIds.includes(p.id));
