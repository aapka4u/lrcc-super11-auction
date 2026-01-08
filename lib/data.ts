import { Team, Player } from './types';

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

export const PLAYERS: Player[] = [
  // A+ Category (6 players)
  { id: 'bir', name: 'Bir', category: 'APLUS', club: 'LRCC', availability: 'full' },
  { id: 'puneet', name: 'Puneet', category: 'APLUS', club: 'LRCC', availability: 'full' },
  { id: 'tushar', name: 'Tushar', category: 'APLUS', club: 'Super11', availability: 'till_12' },
  { id: 'akash', name: 'Akash', category: 'APLUS', club: 'Super11', availability: 'full' },
  { id: 'ajinkya', name: 'Ajinkya', category: 'APLUS', club: 'Super11', availability: 'full' },
  { id: 'sayed_saadat', name: 'Sayed Saadat', category: 'APLUS', club: 'LRCC', availability: 'full' },

  // BASE Category - LRCC (24 players)
  { id: 'kunal_kanade', name: 'Kunal Kanade', category: 'BASE', club: 'LRCC', availability: 'full' },
  { id: 'vikas', name: 'Vikas', category: 'BASE', club: 'LRCC', availability: 'full' },
  { id: 'nitesh_more', name: 'Nitesh More', category: 'BASE', club: 'LRCC', availability: 'full' },
  { id: 'srini', name: 'Srini', category: 'BASE', club: 'LRCC', availability: 'full' },
  { id: 'ayush_kothari', name: 'Ayush Kothari', category: 'BASE', club: 'LRCC', availability: 'full' },
  { id: 'jitesh', name: 'Jitesh', category: 'BASE', club: 'LRCC', availability: 'full' },
  { id: 'karna_bhatt', name: 'Karna Bhatt', category: 'BASE', club: 'LRCC', availability: 'full' },
  { id: 'aditya', name: 'Aditya', category: 'BASE', club: 'LRCC', availability: 'full' },
  { id: 'jayendra', name: 'Jayendra', category: 'BASE', club: 'LRCC', availability: 'full' },
  { id: 'prakhar', name: 'Prakhar', category: 'BASE', club: 'LRCC', availability: 'full' },
  { id: 'manjeet', name: 'Manjeet', category: 'BASE', club: 'LRCC', availability: 'full' },
  { id: 'sayed_zahid', name: 'Sayed Zahid', category: 'BASE', club: 'LRCC', availability: 'full' },
  { id: 'gagan_sharma', name: 'Gagan Sharma', category: 'BASE', club: 'LRCC', availability: 'full' },
  { id: 'mahay_sanjeev', name: 'Mahay Sanjeev', category: 'BASE', club: 'LRCC', availability: 'full' },
  { id: 'amulya', name: 'Amulya', category: 'BASE', club: 'LRCC', availability: 'tentative' },
  { id: 'yakeen', name: 'Yakeen', category: 'BASE', club: 'LRCC', availability: 'full' },
  { id: 'bala', name: 'Bala', category: 'BASE', club: 'LRCC', availability: 'full' },
  { id: 'brijul', name: 'Brijul', category: 'BASE', club: 'LRCC', availability: 'full' },
  { id: 'vinith', name: 'Vinith', category: 'BASE', club: 'LRCC', availability: 'full' },
  { id: 'ayush_agarwal', name: 'Ayush Agarwal', category: 'BASE', club: 'LRCC', availability: 'full' },
  { id: 'arjun', name: 'Arjun', category: 'BASE', club: 'LRCC', availability: 'full' },

  // BASE Category - Super11 (10 players)
  { id: 'saravanan', name: 'Saravanan', category: 'BASE', club: 'Super11', availability: 'full' },
  { id: 'kannav', name: 'Kannav', category: 'BASE', club: 'Super11', availability: 'full' },
  { id: 'prathush', name: 'Prathush', category: 'BASE', club: 'Super11', availability: 'full' },
  { id: 'vipul', name: 'Vipul', category: 'BASE', club: 'Super11', availability: 'full' },
  { id: 'anish', name: 'Anish', category: 'BASE', club: 'Super11', availability: 'full' },
  { id: 'satheesh', name: 'Satheesh', category: 'BASE', club: 'Super11', availability: 'full' },
  { id: 'kamal', name: 'Kamal', category: 'BASE', club: 'Super11', availability: 'full' },
  { id: 'bhuvanesh', name: 'Bhuvanesh', category: 'BASE', club: 'Super11', availability: 'full' },
  { id: 'karthik', name: 'Karthik', category: 'BASE', club: 'Super11', availability: 'full' },
];

export const ADMIN_PIN = '2237';

export const getInitialState = () => ({
  status: 'IDLE' as const,
  currentPlayerId: null,
  soldToTeamId: null,
  rosters: Object.fromEntries(TEAMS.map(t => [t.id, []])),
  soldPlayers: [],
  lastUpdate: Date.now(),
});

export const getPlayerById = (id: string): Player | undefined => 
  PLAYERS.find(p => p.id === id);

export const getTeamById = (id: string): Team | undefined => 
  TEAMS.find(t => t.id === id);

export const getAvailablePlayers = (soldPlayerIds: string[]): Player[] =>
  PLAYERS.filter(p => !soldPlayerIds.includes(p.id));
