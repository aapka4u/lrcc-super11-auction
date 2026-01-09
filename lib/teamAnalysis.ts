import { Player, Team } from './types';

export interface TeamAnalysis {
  batsmen: number;
  bowlers: number;
  allRounders: number;
  wicketKeepers: number;
  aplusCount: number;
  lrccCount: number;
  super11Count: number;
  totalSpent: number;
  budgetRemaining: number;
  longestBid: { playerId: string; playerName: string; duration: number } | null;
  strengths: string[];
  needs: string[];
  rating: number;
  summary: string;
  teaserMessage: string;
}

// Role icons for display
export const ROLE_ICONS: Record<string, string> = {
  Batsman: '🏏',
  Bowler: '🎯',
  'All-rounder': '⚡',
  'WK-Batsman': '🧤',
};

// Analyze team composition and generate story elements
export function analyzeTeamComposition(
  team: Team & { roster: Player[]; captainPlayer?: Player; viceCaptainPlayer?: Player },
  soldPrices: Record<string, number>,
  biddingDurations: Record<string, number>
): TeamAnalysis {
  // Combine all team players (C, VC, + roster)
  const allPlayers: Player[] = [];
  if (team.captainPlayer) allPlayers.push(team.captainPlayer);
  if (team.viceCaptainPlayer) allPlayers.push(team.viceCaptainPlayer);
  allPlayers.push(...team.roster);

  // Count roles
  const batsmen = allPlayers.filter(p => p.role === 'Batsman').length;
  const bowlers = allPlayers.filter(p => p.role === 'Bowler').length;
  const allRounders = allPlayers.filter(p => p.role === 'All-rounder').length;
  const wicketKeepers = allPlayers.filter(p => p.role === 'WK-Batsman').length;

  // Count categories and clubs
  const aplusCount = allPlayers.filter(p => p.category === 'APLUS').length;
  const lrccCount = allPlayers.filter(p => p.club === 'LRCC').length;
  const super11Count = allPlayers.filter(p => p.club === 'Super11').length;

  // Calculate spending
  const totalSpent = team.roster.reduce((sum, p) => sum + (soldPrices[p.id] || 0), 0);
  const budgetRemaining = team.budget - totalSpent;

  // Find longest bid
  let longestBid: { playerId: string; playerName: string; duration: number } | null = null;
  for (const player of team.roster) {
    const duration = biddingDurations[player.id] || 0;
    if (!longestBid || duration > longestBid.duration) {
      longestBid = { playerId: player.id, playerName: player.name, duration };
    }
  }

  // Determine strengths
  const strengths: string[] = [];
  if (allRounders >= 3) strengths.push('All-rounder powerhouse!');
  if (batsmen >= 3) strengths.push('Strong batting lineup');
  if (bowlers >= 2) strengths.push('Solid bowling attack');
  if (wicketKeepers >= 1) strengths.push('Keeper secured');
  if (aplusCount >= 2) strengths.push('Premium talent loaded');
  if (lrccCount >= 4) strengths.push('LRCC reunion squad!');
  if (super11Count >= 4) strengths.push('Super11 takeover!');
  if (budgetRemaining > team.budget * 0.4) strengths.push('Budget master - saving for big moves?');

  // Determine needs
  const needs: string[] = [];
  const playersRemaining = 6 - team.roster.length;
  if (bowlers === 0 && playersRemaining > 0) needs.push('Desperately needs bowlers!');
  else if (bowlers < 2 && playersRemaining > 0) needs.push('Could use more bowling');
  if (wicketKeepers === 0 && playersRemaining > 0) needs.push('No keeper yet - risky!');
  if (batsmen === 0 && playersRemaining > 0) needs.push('Batting depth needed');
  if (playersRemaining > 0) needs.push(`${playersRemaining} pick${playersRemaining > 1 ? 's' : ''} remaining`);

  // Calculate rating (1-10)
  let rating = 5;
  // Balance bonus
  if (batsmen >= 2 && bowlers >= 1 && allRounders >= 1) rating += 1;
  if (wicketKeepers >= 1) rating += 0.5;
  // Talent bonus
  rating += Math.min(aplusCount * 0.5, 1.5);
  // Flexibility bonus (all-rounders)
  rating += Math.min(allRounders * 0.3, 1);
  // Depth penalty if missing key roles
  if (bowlers === 0) rating -= 1;
  if (wicketKeepers === 0 && playersRemaining === 0) rating -= 0.5;
  rating = Math.max(1, Math.min(10, Math.round(rating * 10) / 10));

  // Generate summary
  let summary = 'Building...';
  if (team.roster.length >= 6) {
    if (rating >= 8) summary = 'Championship Contender!';
    else if (rating >= 7) summary = 'Strong Squad!';
    else if (allRounders >= 4) summary = 'Flexibility Masters!';
    else if (batsmen >= 4) summary = 'Batting Heavy!';
    else if (bowlers >= 3) summary = 'Bowling Focused!';
    else summary = 'Balanced Squad';
  } else if (team.roster.length >= 3) {
    if (allRounders >= 3) summary = 'All-rounder army forming!';
    else if (batsmen >= 2) summary = 'Batting core secured';
    else if (bowlers >= 2) summary = 'Bowling foundation set';
    else summary = 'Strategy emerging...';
  }

  // Generate teaser message (fun, engaging)
  const teaserMessages: string[] = [];

  if (longestBid && longestBid.duration >= 60) {
    teaserMessages.push(`Fought ${Math.floor(longestBid.duration / 60)}+ minutes for ${longestBid.playerName}! 💪`);
  } else if (longestBid && longestBid.duration >= 30) {
    teaserMessages.push(`Battled hard for ${longestBid.playerName}! 🔥`);
  }

  if (allRounders >= 3) {
    teaserMessages.push(`${allRounders} all-rounders?! Maximum flexibility! ⚡`);
  }

  if (aplusCount >= 2) {
    teaserMessages.push(`${aplusCount} premium players secured! ⭐`);
  }

  if (lrccCount >= 4) {
    teaserMessages.push('LRCC reunion is HAPPENING! 🤝');
  } else if (super11Count >= 4) {
    teaserMessages.push('Super11 takeover in progress! 🔥');
  }

  if (budgetRemaining > team.budget * 0.5 && team.roster.length >= 2) {
    teaserMessages.push('Playing it smart with the budget... 💰');
  }

  if (bowlers === 0 && team.roster.length >= 3) {
    teaserMessages.push('Still hunting for a bowler... 🎯');
  }

  if (wicketKeepers === 0 && team.roster.length >= 4) {
    teaserMessages.push('Keeper search continues! 🧤');
  }

  // Default messages if nothing specific
  if (teaserMessages.length === 0) {
    if (team.roster.length === 1) {
      teaserMessages.push('First pick in! The journey begins...');
    } else if (team.roster.length === 2) {
      teaserMessages.push('Strategy taking shape!');
    } else {
      teaserMessages.push('Building momentum!');
    }
  }

  const teaserMessage = teaserMessages[Math.floor(Math.random() * teaserMessages.length)];

  return {
    batsmen,
    bowlers,
    allRounders,
    wicketKeepers,
    aplusCount,
    lrccCount,
    super11Count,
    totalSpent,
    budgetRemaining,
    longestBid,
    strengths,
    needs,
    rating,
    summary,
    teaserMessage,
  };
}

// Get captain name from team
export function getCaptainName(team: Team): string {
  return team.captain;
}
