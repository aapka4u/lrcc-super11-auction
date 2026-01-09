import { Player, Team, BASE_PRICES, TEAM_SIZE } from './types';
import { PLAYERS } from './data';
import { calculateMaxBid } from './data';

// Team preference data (stored in KV/localStorage, manually entered)
export interface TeamPreference {
  teamId: string;
  captainStyle?: string; // e.g., "prefers allrounders", "loves explosive bats"
  playerPreferences?: Record<string, number>; // playerId -> preference score (0-1)
  avoidPlayers?: string[]; // playerId[] - players you don't want at all
  chemistry?: Record<string, string[]>; // playerId -> [list of players they work well with]
  riskTolerance?: 'low' | 'medium' | 'high'; // How aggressive they bid
  rolePriorities?: string[]; // e.g., ['WK-Batsman', 'Bowler', 'All-rounder']
  fairPriceTargets?: Record<string, FairPriceConfig>;
  stealPriceTargets?: Record<string, StealPriceConfig>;
  conditionalPreferences?: Record<string, ConditionalPreference>;
}

export interface FairPriceConfig {
  maxPrice: number;
  basePreference: number;
  fairPriceBoost: number;
  note: string;
}

export interface StealPriceConfig {
  maxPrice: number;
  basePreference: number;
  stealBoost: number;
  note: string;
}

export interface ConditionalPreference {
  condition: string;
  maxPriceMultiplier?: number;
  note: string;
}

// Behavior pattern learned from auction
export interface TeamBehavior {
  teamId: string;
  avgBidPrice: number;
  overpayFrequency: number; // 0-1, how often they pay above base
  earlyBidFrequency: number; // 0-1, how often they bid early
  roleFocus: Record<string, number>; // role -> frequency of bidding on that role
  tiltFactor: number; // 0-1, tendency to overreact after losing a bid
  lastLossTimestamp?: number; // When they last lost a bid
}

// Role gap analysis
export interface RoleGap {
  role: string;
  current: number;
  ideal: number;
  urgency: number; // 0-100
  remainingInPool: number;
}

// Club constraint analysis (each team needs 3 from Super11)
export interface ClubGap {
  club: 'Super11' | 'LRCC';
  required: number;
  current: number;
  needed: number;
  remainingInPool: number;
  urgency: number; // 0-100
}

// Bid likelihood prediction
export interface BidPrediction {
  teamId: string;
  teamName: string;
  likelihood: number; // 0-1 (BidIntentScore, not calibrated probability)
  confidence: 'low' | 'medium' | 'high';
  reasoning: string[];
  maxBid: number;
  recommendedWalkAway: number;
  walkAwayReason: string;
}

// Strategic bidding recommendation
export interface StrategicRecommendation {
  action: 'push_price' | 'stay_out' | 'compete' | 'neutral';
  reasoning: string[];
  targetPrice?: number; // Price to push competitor to
  competitorTeamId?: string; // Which team is desperate
  competitorTeamName?: string;
  yourInterestLevel: 'high' | 'medium' | 'low' | 'none';
  competitorDesperation: 'high' | 'medium' | 'low';
  confidence: 'high' | 'medium' | 'low';
}

// Full intelligence analysis
export interface IntelligenceAnalysis {
  currentPlayer: Player | null;
  teamGaps: Record<string, RoleGap[]>; // teamId -> gaps
  clubGaps: Record<string, ClubGap[]>; // teamId -> club gaps (Super11 requirement)
  bidPredictions: BidPrediction[];
  behaviorPatterns: Record<string, TeamBehavior>;
  scarcityAlerts: string[];
  strategicRecommendation?: StrategicRecommendation; // Strategic advice for your team
}

// Target role distribution for 8-player squad (including C & VC)
const TARGET_ROLES = {
  'Batsman': 2,      // Want at least 2 batsmen
  'Bowler': 2,       // Want at least 2 bowlers
  'All-rounder': 2,  // Want at least 2 all-rounders
  'WK-Batsman': 1,   // Need at least 1 keeper
};

// Club requirement: Each team needs 3 players from Super11 (1 from C/VC + 2 from auction)
const SUPER11_REQUIRED = 3;

// Calculate role gaps for a team
export function calculateRoleGaps(
  team: Team & { roster: Player[]; captainPlayer?: Player; viceCaptainPlayer?: Player; playersNeeded?: number },
  remainingPlayers: Player[]
): RoleGap[] {
  const allPlayers: Player[] = [];
  if (team.captainPlayer) allPlayers.push(team.captainPlayer);
  if (team.viceCaptainPlayer) allPlayers.push(team.viceCaptainPlayer);
  allPlayers.push(...team.roster);

  // How many slots the team still needs to fill
  const slotsRemaining = team.playersNeeded ?? (TEAM_SIZE - allPlayers.length);

  const roleCounts: Record<string, number> = {
    'Batsman': 0,
    'Bowler': 0,
    'All-rounder': 0,
    'WK-Batsman': 0,
  };

  allPlayers.forEach(p => {
    if (p.role) roleCounts[p.role] = (roleCounts[p.role] || 0) + 1;
  });

  const remainingByRole: Record<string, number> = {
    'Batsman': remainingPlayers.filter(p => p.role === 'Batsman').length,
    'Bowler': remainingPlayers.filter(p => p.role === 'Bowler').length,
    'All-rounder': remainingPlayers.filter(p => p.role === 'All-rounder').length,
    'WK-Batsman': remainingPlayers.filter(p => p.role === 'WK-Batsman').length,
  };

  const gaps: RoleGap[] = [];

  Object.keys(roleCounts).forEach(role => {
    const current = roleCounts[role];
    const target = TARGET_ROLES[role as keyof typeof TARGET_ROLES] || 0;
    const remaining = remainingByRole[role] || 0;

    // Calculate deficit from target, but cap by slots remaining
    const rawDeficit = Math.max(0, target - current);
    const deficit = Math.min(rawDeficit, slotsRemaining); // Can't fill more than slots available

    // Urgency calculation: higher if missing role, lower if well covered
    let urgency = 0;

    // If team is full, no urgency for any role
    if (slotsRemaining <= 0) {
      urgency = 0;
    } else if (current === 0 && role === 'WK-Batsman') {
      // Must have keeper - highest priority
      urgency = 100;
    } else if (current === 0 && role === 'Bowler') {
      urgency = 80;
    } else if (current === 0) {
      urgency = 60;
    } else if (deficit > 0) {
      // Scale by deficit, but reduce if we have limited slots
      const slotScarcity = slotsRemaining <= 2 ? 0.7 : 1.0;
      urgency = Math.min(100, deficit * 30 * slotScarcity);
    }

    // Increase urgency if scarcity is high AND we need this role
    if (remaining <= 2 && urgency > 0) urgency = Math.min(100, urgency + 20);
    if (remaining === 0 && deficit > 0) urgency = 100; // Last chance and we need it!

    // If at/above target but low slots, still might consider players opportunistically
    // (reduced urgency, not zero - they're still viable)
    if (current >= target && slotsRemaining > 0 && remaining > 0) {
      urgency = Math.max(urgency, 10); // Minimum baseline interest
    }

    gaps.push({
      role,
      current,
      ideal: target,
      urgency,
      remainingInPool: remaining,
    });
  });

  return gaps;
}

// Calculate club gaps for a team (Super11 requirement: 3 per team)
export function calculateClubGaps(
  team: Team & { roster: Player[]; captainPlayer?: Player; viceCaptainPlayer?: Player },
  remainingPlayers: Player[]
): ClubGap[] {
  // Count Super11 players in team (C + VC + roster)
  const allPlayers: Player[] = [];
  if (team.captainPlayer) allPlayers.push(team.captainPlayer);
  if (team.viceCaptainPlayer) allPlayers.push(team.viceCaptainPlayer);
  allPlayers.push(...team.roster);

  const super11Count = allPlayers.filter(p => p.club === 'Super11').length;
  const super11Needed = Math.max(0, SUPER11_REQUIRED - super11Count);
  const super11RemainingInPool = remainingPlayers.filter(p => p.club === 'Super11').length;

  // Calculate urgency for Super11 requirement
  let super11Urgency = 0;
  if (super11Needed > 0) {
    // Base urgency from need
    super11Urgency = Math.min(100, super11Needed * 35);

    // Increase urgency if remaining Super11 players are scarce
    if (super11RemainingInPool <= super11Needed) {
      super11Urgency = 100; // Critical - must get every Super11 player
    } else if (super11RemainingInPool <= super11Needed + 2) {
      super11Urgency = Math.min(100, super11Urgency + 30);
    }
  }

  return [
    {
      club: 'Super11',
      required: SUPER11_REQUIRED,
      current: super11Count,
      needed: super11Needed,
      remainingInPool: super11RemainingInPool,
      urgency: super11Urgency,
    },
  ];
}

// Calculate bid likelihood for a team on current player
export function calculateBidLikelihood(
  team: Team & { 
    roster: Player[]; 
    captainPlayer?: Player; 
    viceCaptainPlayer?: Player; 
    spent: number; 
    remainingBudget: number; 
    maxBid: number; 
    playersNeeded: number;
  },
  currentPlayer: Player,
  remainingPlayers: Player[],
  preferences?: TeamPreference,
  behaviors?: TeamBehavior,
  currentBidPrice?: number // Optional: current bid during LIVE auction
): BidPrediction {
  // HARD CONSTRAINT: Team is full or cannot afford base price
  const basePrice = BASE_PRICES[currentPlayer.category as keyof typeof BASE_PRICES] || BASE_PRICES.BASE;
  const totalPlayers = 2 + team.roster.length; // C + VC + roster

  if (team.playersNeeded <= 0) {
    return {
      teamId: team.id,
      teamName: team.name,
      likelihood: 0,
      confidence: 'high',
      reasoning: [`🚫 Team is full (${totalPlayers}/8 players)`],
      maxBid: team.maxBid,
      recommendedWalkAway: 0,
      walkAwayReason: 'Team complete - cannot bid',
    };
  }

  if (team.maxBid < basePrice) {
    const reserveNeeded = Math.max(0, team.playersNeeded - 1) * BASE_PRICES.BASE;
    return {
      teamId: team.id,
      teamName: team.name,
      likelihood: 0,
      confidence: 'high',
      reasoning: [
        `🚫 Cannot afford base price (₹${basePrice.toLocaleString()})`,
        `Max bid: ₹${team.maxBid.toLocaleString()} (need ₹${reserveNeeded.toLocaleString()} reserve for ${team.playersNeeded - 1} more picks)`,
        `${totalPlayers}/8 players, ₹${team.remainingBudget.toLocaleString()} remaining`
      ],
      maxBid: team.maxBid,
      recommendedWalkAway: 0,
      walkAwayReason: 'Budget constraint - must reserve for future picks',
    };
  }
  
  // HARD CONSTRAINT: Player is on avoid list
  if (preferences?.avoidPlayers?.includes(currentPlayer.id)) {
    return {
      teamId: team.id,
      teamName: team.name,
      likelihood: 0,
      confidence: 'high',
      reasoning: ['Player on avoid list - not interested'],
      maxBid: team.maxBid,
      recommendedWalkAway: 0,
      walkAwayReason: 'Not wanted',
    };
  }

  const gaps = calculateRoleGaps(team, remainingPlayers);
  const clubGaps = calculateClubGaps(team, remainingPlayers);
  const playerRole = currentPlayer.role || '';
  const roleGap = gaps.find(g => g.role === playerRole);
  const super11Gap = clubGaps.find(g => g.club === 'Super11');

  // Check Super11 constraint - team needs 3 Super11 players
  const isSuper11Player = currentPlayer.club === 'Super11';
  const needsSuper11 = super11Gap && super11Gap.needed > 0;
  const super11Urgency = super11Gap?.urgency || 0;
  const super11RemainingInPool = super11Gap?.remainingInPool || 0;

  // HARD CONSTRAINT: If team still needs Super11 players and this is the last Super11 player(s), they MUST bid
  // BUT only if they can actually afford the base price!
  if (needsSuper11 && isSuper11Player && super11RemainingInPool <= (super11Gap?.needed || 0)) {
    // Check if team can afford this player
    if (team.maxBid >= basePrice) {
      return {
        teamId: team.id,
        teamName: team.name,
        likelihood: 1.0,
        confidence: 'high',
        reasoning: [
          `🏆 MUST GET - Super11 requirement`,
          `Need ${super11Gap?.needed} more Super11, only ${super11RemainingInPool} left in pool`,
          `${totalPlayers}/8 players | Max bid: ₹${team.maxBid.toLocaleString()}`
        ],
        maxBid: team.maxBid,
        recommendedWalkAway: team.maxBid, // Will bid max
        walkAwayReason: 'Must complete Super11 quota',
      };
    }
    // If they can't afford, they're in trouble - but still can't bid
  }

  // Base likelihood uses a principled approach:
  // - Start at 0.25 (neutral prior)
  // - Each factor contributes a weighted adjustment
  // - Final score is clamped [0, 1] and represents relative intent, not calibrated probability
  let likelihood = 0.25; // Neutral prior (slightly below center)
  let confidence: 'low' | 'medium' | 'high' = 'low';
  const reasoning: string[] = [];

  // Add team status context
  reasoning.push(`📊 ${totalPlayers}/8 players | Max bid: ₹${team.maxBid.toLocaleString()}`);
  
  // Factor 1: Role Need (0-0.4 weight)
  if (roleGap) {
    const needScore = roleGap.urgency / 100;
    likelihood += needScore * 0.4;
    if (roleGap.urgency >= 70) {
      reasoning.push(`Missing ${roleGap.role} (urgency: ${roleGap.urgency}%)`);
      confidence = 'high';
    } else if (roleGap.urgency >= 40) {
      reasoning.push(`Needs more ${roleGap.role}`);
      confidence = 'medium';
    }
  }
  
  // Factor 2: Budget Freedom (0-0.2 weight)
  // Guard against division by zero or undefined budget
  const safeBudget = team.budget || 11500; // Default budget if undefined
  const budgetRatio = team.remainingBudget / safeBudget;
  const slotsRatio = team.playersNeeded / 6; // Max slots is 6
  const budgetFreedom = budgetRatio / Math.max(slotsRatio, 0.1); // Higher if more budget per slot
  likelihood += Math.min(budgetFreedom, 1) * 0.2;
  
  if (budgetFreedom > 1.2) {
    reasoning.push('Healthy budget per slot');
  } else if (budgetFreedom < 0.5) {
    reasoning.push('Budget constrained');
  }
  
  // Factor 3: Scarcity (0-0.2 weight)
  if (roleGap) {
    const scarcityScore = roleGap.remainingInPool <= 2 ? 1 : Math.max(0, (5 - roleGap.remainingInPool) / 5);
    likelihood += scarcityScore * 0.2;

    if (roleGap.remainingInPool <= 2) {
      reasoning.push(`Only ${roleGap.remainingInPool} ${roleGap.role} left`);
      confidence = confidence === 'low' ? 'medium' : confidence;
    }
  }

  // Factor 3.5: Super11 Club Requirement (0-0.25 weight)
  // Each team needs 3 Super11 players (1 C/VC + 2 from auction)
  if (needsSuper11 && isSuper11Player) {
    const super11NeedScore = super11Urgency / 100;
    likelihood += super11NeedScore * 0.25;

    if (super11Urgency >= 80) {
      reasoning.push(`🏆 Needs Super11 (${super11Gap?.needed} needed, ${super11RemainingInPool} in pool)`);
      confidence = 'high';
    } else if (super11Urgency >= 50) {
      reasoning.push(`🏆 Looking for Super11 (${super11Gap?.needed} needed)`);
      confidence = confidence === 'low' ? 'medium' : confidence;
    } else if (super11Gap?.needed && super11Gap.needed > 0) {
      reasoning.push(`Super11 player (+${super11Gap.needed} needed)`);
    }
  } else if (needsSuper11 && !isSuper11Player) {
    // Team needs Super11 but this player isn't one
    // Edge case: if slots remaining = Super11 needed, they CANNOT buy non-Super11
    const slotsRemaining = team.playersNeeded;
    const super11Needed = super11Gap?.needed || 0;

    if (slotsRemaining <= super11Needed && super11Needed > 0) {
      // HARD CONSTRAINT: Every remaining slot must be Super11
      return {
        teamId: team.id,
        teamName: team.name,
        likelihood: 0,
        confidence: 'high',
        reasoning: [
          `🚫 Cannot buy non-Super11 - needs ${super11Needed} Super11 with ${slotsRemaining} slots`,
          `Every remaining pick MUST be Super11`
        ],
        maxBid: team.maxBid,
        recommendedWalkAway: 0,
        walkAwayReason: 'Must fill remaining slots with Super11 only',
      };
    }

    // Check if Super11 is scarce and buying this would jeopardize
    if (super11RemainingInPool <= super11Needed + 1) {
      const super11BaseCost = super11Needed * BASE_PRICES.BASE;
      const budgetAfterThisBuy = team.remainingBudget - basePrice;
      const wouldJeopardizeSuper11 = budgetAfterThisBuy < super11BaseCost;

      if (wouldJeopardizeSuper11) {
        likelihood -= 0.2;
        reasoning.push(`⚠️ Must save budget for Super11 (${super11Needed} needed, ₹${super11BaseCost.toLocaleString()} minimum)`);
      } else {
        likelihood -= 0.05;
        reasoning.push(`Super11 needed (${super11Needed}) but can afford this too`);
      }
    }
  }

  // Factor 4: Captain Preference (0-0.1 weight)
  if (preferences?.playerPreferences?.[currentPlayer.id]) {
    const prefScore = preferences.playerPreferences[currentPlayer.id];
    likelihood += prefScore * 0.1;
    if (prefScore >= 0.85) {
      reasoning.push('Strong captain preference');
      confidence = 'high';
    } else if (prefScore >= 0.70) {
      reasoning.push('Moderate preference');
      confidence = confidence === 'low' ? 'medium' : confidence;
    }
  }
  
  // Factor 5: Role Priority (0-0.05 weight)
  if (preferences?.rolePriorities?.includes(playerRole)) {
    likelihood += 0.05;
  }
  
  // Factor 6: Fair Price Target (BOOSTS existing likelihood, doesn't replace)
  // Cap boost at 0.2 to prevent runaway scores
  if (preferences?.fairPriceTargets?.[currentPlayer.id]) {
    const fairConfig = preferences.fairPriceTargets[currentPlayer.id];
    if (currentBidPrice !== undefined) {
      if (currentBidPrice <= fairConfig.maxPrice) {
        // Boost likelihood when at fair price (capped at 0.2)
        const cappedBoost = Math.min(fairConfig.fairPriceBoost, 0.2);
        likelihood += cappedBoost;
        reasoning.push(`💰 Fair price opportunity (current: ₹${currentBidPrice})`);
        confidence = 'high';
      } else {
        // Reduce likelihood when above fair price
        likelihood -= 0.1;
        reasoning.push(`Price above fair threshold (max: ₹${fairConfig.maxPrice})`);
      }
    } else {
      // No current bid - note the fair price target exists
      reasoning.push(`Fair price target: ₹${fairConfig.maxPrice}`);
    }
  }

  // Factor 7: Steal Price Target (even bigger boost for steal opportunities)
  // Only applies if price is at steal level - cap at 0.25 to prevent runaway scores
  if (preferences?.stealPriceTargets?.[currentPlayer.id]) {
    const stealConfig = preferences.stealPriceTargets[currentPlayer.id];
    if (currentBidPrice !== undefined) {
      if (currentBidPrice <= stealConfig.maxPrice) {
        // Steal price is better than fair price - use steal boost (capped at 0.25)
        const cappedBoost = Math.min(stealConfig.stealBoost, 0.25);
        likelihood += cappedBoost;
        reasoning.push(`🔥 Steal price! (current: ₹${currentBidPrice}, max: ₹${stealConfig.maxPrice})`);
        confidence = 'high';
      }
      // If above steal price, fair price logic already handled it
    } else {
      reasoning.push(`Steal price target: ₹${stealConfig.maxPrice}`);
    }
  }
  
  // Factor 8: Conditional Preferences (e.g., Tushar availability)
  if (preferences?.conditionalPreferences?.[currentPlayer.id]) {
    const cond = preferences.conditionalPreferences[currentPlayer.id];
    // For now, we'll just note it - actual condition checking would need state
    reasoning.push(`⚠️ ${cond.note}`);
    if (cond.maxPriceMultiplier) {
      // Adjust likelihood downward if conditional
      likelihood *= 0.9;
    }
  }
  
  // Factor 9: Behavior Pattern - Tilt (0-0.05 weight)
  if (behaviors?.tiltFactor && behaviors.lastLossTimestamp) {
    const secondsSinceLoss = (Date.now() - behaviors.lastLossTimestamp) / 1000;
    if (secondsSinceLoss < 300 && behaviors.tiltFactor > 0.5) { // Within 5 minutes
      likelihood += behaviors.tiltFactor * 0.05;
      reasoning.push('Momentum factor (recent loss)');
    }
  }
  
  // Factor 10: Behavior Pattern - Role Focus (0-0.05 weight)
  if (behaviors?.roleFocus?.[playerRole] && behaviors.roleFocus[playerRole] > 0.3) {
    likelihood += behaviors.roleFocus[playerRole] * 0.05;
  }

  // Factor 11: Player Availability (-0.15 to 0 weight)
  // Tentative players are risky, limited availability players are less desirable
  if (currentPlayer.availability === 'tentative') {
    likelihood -= 0.15;
    reasoning.push('⚠️ Tentative availability - risky pick');
  } else if (currentPlayer.availability === 'till_11') {
    likelihood -= 0.08;
    reasoning.push('⏰ Available only till 11 AM');
  } else if (currentPlayer.availability === 'till_12') {
    likelihood -= 0.05;
    reasoning.push('⏰ Available only till noon');
  }

  // Clamp likelihood between 0 and 1 (can go negative from penalties)
  likelihood = Math.max(0, Math.min(1.0, likelihood));

  // Default reasoning if none beyond status line
  if (reasoning.length <= 1) {
    reasoning.push('Neutral interest');
  }
  
  // Calculate recommended walk-away price
  let recommendedWalkAway = team.maxBid;
  let walkAwayReason = 'Max budget limit';

  // Walk-away multipliers should be higher for APLUS players (they're worth more)
  const isAplusPlayer = currentPlayer.category === 'APLUS';
  const conservativeMultiplier = isAplusPlayer ? 0.75 : 0.65;
  const moderateMultiplier = isAplusPlayer ? 0.85 : 0.80;
  const aggressiveMultiplier = isAplusPlayer ? 0.95 : 0.95;

  if (roleGap) {
    const similarRemaining = remainingPlayers.filter(p =>
      p.role === playerRole &&
      p.category === currentPlayer.category &&
      p.id !== currentPlayer.id
    ).length;

    if (similarRemaining >= 2) {
      // Multiple alternatives available - be conservative
      recommendedWalkAway = Math.floor(team.maxBid * conservativeMultiplier);
      walkAwayReason = `${similarRemaining} similar ${isAplusPlayer ? 'star' : 'base'} players still available`;
    } else if (similarRemaining === 1) {
      // One alternative left - moderate
      recommendedWalkAway = Math.floor(team.maxBid * moderateMultiplier);
      walkAwayReason = `Only 1 similar ${isAplusPlayer ? 'star' : 'base'} player left`;
    } else if (similarRemaining === 0) {
      // No alternatives! Adjust based on urgency
      if (roleGap.urgency >= 70) {
        // High urgency + no alternatives = go aggressive
        recommendedWalkAway = Math.floor(team.maxBid * aggressiveMultiplier);
        walkAwayReason = `Last ${isAplusPlayer ? 'star ' : ''}${playerRole} available!`;
      } else if (roleGap.urgency >= 40) {
        // Medium urgency + no alternatives = moderate aggression
        recommendedWalkAway = Math.floor(team.maxBid * moderateMultiplier);
        walkAwayReason = `No more similar players in pool (urgency: ${roleGap.urgency}%)`;
      } else {
        // Low urgency = team already covered, but still last chance
        recommendedWalkAway = Math.floor(team.maxBid * conservativeMultiplier);
        walkAwayReason = `Last of type but low urgency - be cautious`;
      }
    }
  }
  
  // Adjust based on preferences
  if (preferences?.fairPriceTargets?.[currentPlayer.id]) {
    recommendedWalkAway = Math.min(recommendedWalkAway, preferences.fairPriceTargets[currentPlayer.id].maxPrice);
    walkAwayReason = `Fair price threshold: ₹${preferences.fairPriceTargets[currentPlayer.id].maxPrice}`;
  }
  
  if (preferences?.stealPriceTargets?.[currentPlayer.id]) {
    recommendedWalkAway = Math.min(recommendedWalkAway, preferences.stealPriceTargets[currentPlayer.id].maxPrice);
    walkAwayReason = `Steal price threshold: ₹${preferences.stealPriceTargets[currentPlayer.id].maxPrice}`;
  }
  
  if (preferences?.conditionalPreferences?.[currentPlayer.id]?.maxPriceMultiplier) {
    recommendedWalkAway = Math.floor(recommendedWalkAway * preferences.conditionalPreferences[currentPlayer.id]!.maxPriceMultiplier!);
    walkAwayReason = 'Conditional target - price restraint';
  }
  
  // Adjust based on behavior risk tolerance
  if (preferences?.riskTolerance === 'low') {
    recommendedWalkAway = Math.floor(recommendedWalkAway * 0.9);
  } else if (preferences?.riskTolerance === 'high') {
    recommendedWalkAway = Math.floor(recommendedWalkAway * 1.05);
  }

  // Adjust for player availability (reduce walk-away for less available players)
  if (currentPlayer.availability === 'tentative') {
    recommendedWalkAway = Math.floor(recommendedWalkAway * 0.75);
    walkAwayReason = 'Tentative - high risk, pay less';
  } else if (currentPlayer.availability === 'till_11') {
    recommendedWalkAway = Math.floor(recommendedWalkAway * 0.85);
  } else if (currentPlayer.availability === 'till_12') {
    recommendedWalkAway = Math.floor(recommendedWalkAway * 0.90);
  }

  // Final constraints: must be between basePrice and maxBid
  recommendedWalkAway = Math.max(basePrice, Math.min(team.maxBid, recommendedWalkAway));
  
  return {
    teamId: team.id,
    teamName: team.name,
    likelihood,
    confidence,
    reasoning,
    maxBid: team.maxBid,
    recommendedWalkAway,
    walkAwayReason,
  };
}

// Calculate strategic recommendation for your team
export function calculateStrategicRecommendation(
  yourTeamId: string,
  currentPlayer: Player | null,
  bidPredictions: BidPrediction[],
  teamGaps: Record<string, RoleGap[]>,
  teams: (Team & { maxBid: number; remainingBudget: number })[]
): StrategicRecommendation | undefined {
  if (!currentPlayer) return undefined;

  const yourPrediction = bidPredictions.find(p => p.teamId === yourTeamId);
  const yourTeam = teams.find(t => t.id === yourTeamId);
  const playerRole = currentPlayer.role || '';
  const basePrice = BASE_PRICES[currentPlayer.category as keyof typeof BASE_PRICES] || BASE_PRICES.BASE;

  // Determine your interest level
  let yourInterestLevel: 'high' | 'medium' | 'low' | 'none' = 'none';
  if (yourPrediction) {
    if (yourPrediction.likelihood >= 0.75) yourInterestLevel = 'high';
    else if (yourPrediction.likelihood >= 0.50) yourInterestLevel = 'medium';
    else if (yourPrediction.likelihood >= 0.25) yourInterestLevel = 'low';
  }

  // Check if current player is Super11 (affects desperation calculation)
  const isSuper11Player = currentPlayer.club === 'Super11';

  // Find most desperate competitor (high likelihood + high confidence + high urgency)
  // Using a principled scoring model:
  // - MUST GET scenarios (likelihood = 1.0) indicate absolute necessity
  // - Confidence indicates prediction reliability
  // - Role urgency indicates structural need
  const competitors = bidPredictions
    .filter(p => p.teamId !== yourTeamId)
    .map(pred => {
      const team = teams.find(t => t.id === pred.teamId);
      const gaps = teamGaps[pred.teamId] || [];
      const roleGap = gaps.find(g => g.role === playerRole);

      // Check if this competitor is in MUST GET mode (100% likelihood = constrained necessity)
      const isMustGet = pred.likelihood >= 0.99;
      const mustGetBoost = isMustGet ? 0.4 : 0; // Massive boost for constrained necessity

      // Secondary check: high confidence + high likelihood = very desperate
      const isHighlyDesperate = pred.likelihood >= 0.75 && pred.confidence === 'high';
      const desperateBoost = isHighlyDesperate ? 0.15 : 0;

      // Weighted desperation score (normalized to ~0-1 range)
      const desperationScore =
        (pred.likelihood * 0.35) +                                    // Base intent
        (pred.confidence === 'high' ? 0.15 : pred.confidence === 'medium' ? 0.08 : 0) + // Confidence
        ((roleGap?.urgency || 0) / 100 * 0.10) +                      // Role urgency
        mustGetBoost +                                                 // Constrained necessity
        desperateBoost;                                                // High desperation

      return {
        prediction: pred,
        team,
        roleGap,
        desperationScore: Math.min(1, desperationScore), // Cap at 1.0 for cleaner thresholds
      };
    })
    .sort((a, b) => b.desperationScore - a.desperationScore);
  
  const mostDesperate = competitors[0];

  if (!mostDesperate || !yourTeam) return undefined;

  // Count how many teams are highly interested (desperation >= 0.6)
  // Multiple desperate teams = bidding war = prices will be driven up
  const highlyInterestedCount = competitors.filter(c => c.desperationScore >= 0.6).length;
  const isBiddingWar = highlyInterestedCount >= 2;

  const competitorDesperation: 'high' | 'medium' | 'low' =
    mostDesperate.desperationScore >= 0.7 ? 'high' :
    mostDesperate.desperationScore >= 0.5 ? 'medium' : 'low';
  
  const reasoning: string[] = [];
  let action: 'push_price' | 'stay_out' | 'compete' | 'neutral' = 'neutral';
  let targetPrice: number | undefined;
  let confidence: 'high' | 'medium' | 'low' = 'low';
  
  // Your max bid constraint for PUSH strategy
  const yourMaxBid = yourPrediction?.maxBid || yourTeam?.maxBid || 0;

  // Decision logic
  if (yourInterestLevel === 'high') {
    // You want this player - compete
    action = 'compete';
    targetPrice = yourPrediction?.recommendedWalkAway; // Show your walk-away
    reasoning.push(`You want this player (${Math.round((yourPrediction?.likelihood || 0) * 100)}% interest)`);

    if (isBiddingWar) {
      // Multiple teams are desperate - expect fierce competition
      reasoning.push(`⚔️ BIDDING WAR: ${highlyInterestedCount} teams highly interested`);
      reasoning.push(`Price will be driven up - consider your max carefully`);
      confidence = 'high';
    } else if (competitorDesperation === 'high') {
      reasoning.push(`⚠️ Strong competition from ${mostDesperate.prediction.teamName}`);
      reasoning.push(`They're desperate (${Math.round(mostDesperate.desperationScore * 100)}% desperation score)`);
      confidence = 'high';
    } else {
      reasoning.push(`Moderate competition expected`);
      confidence = 'medium';
    }
  } else if (yourInterestLevel === 'medium') {
    // Moderate interest - be careful
    action = 'compete';
    targetPrice = yourPrediction?.recommendedWalkAway; // Show your walk-away for medium interest too
    reasoning.push(`Moderate interest - compete if price stays reasonable`);
    reasoning.push(`Walk away at ₹${(yourPrediction?.recommendedWalkAway || 0).toLocaleString()}`);
    if (competitorDesperation === 'high') {
      reasoning.push(`⚠️ Strong competition - consider walking away early`);
      confidence = 'medium';
    } else {
      confidence = 'low';
    }
  } else if (yourInterestLevel === 'low' || yourInterestLevel === 'none') {
    // You don't want this player - consider strategic push
    // Game theory: PUSH only works if opponent is constrained (MUST GET) or highly desperate
    // Rational opponents will recognize your push and may call your bluff

    const opponentIsMustGet = mostDesperate.prediction.likelihood >= 0.99;

    if (opponentIsMustGet || (competitorDesperation === 'high' && mostDesperate.prediction.confidence === 'high')) {
      // Opponent is constrained - they MUST bid, so push is safe
      // But cap at YOUR max bid (you can't bid higher than you can afford)
      // Game-theoretic insight: push to 70-80% of their max, not 85%
      // This leaves them room to "win" while still draining budget
      const pushMultiplier = opponentIsMustGet ? 0.80 : 0.70; // Higher if they're truly constrained
      const idealPushPrice = Math.floor(mostDesperate.prediction.maxBid * pushMultiplier);
      targetPrice = Math.min(idealPushPrice, yourMaxBid - 100); // Stay 100 below your max

      if (targetPrice >= basePrice + 500) { // Only worth pushing if meaningful
        action = 'push_price';
        if (opponentIsMustGet) {
          reasoning.push(`🎯 SAFE PUSH: ${mostDesperate.prediction.teamName} MUST get this player`);
          reasoning.push(`They have no choice - will pay up to ₹${mostDesperate.prediction.maxBid.toLocaleString()}`);
        } else {
          reasoning.push(`🎯 Strategic opportunity: ${mostDesperate.prediction.teamName} is desperate`);
          reasoning.push(`They need ${playerRole} (urgency: ${mostDesperate.roleGap?.urgency || 0}%)`);
        }
        reasoning.push(`Push price to ₹${targetPrice.toLocaleString()} to drain their budget`);
        reasoning.push(`⚠️ Stop at ₹${targetPrice.toLocaleString()} - don't get caught!`);
        confidence = opponentIsMustGet ? 'high' : 'medium';
      } else {
        action = 'stay_out';
        targetPrice = undefined;
        reasoning.push(`Stay out - can't push price high enough to matter`);
        confidence = 'medium';
      }
    } else if (competitorDesperation === 'medium' && mostDesperate.prediction.confidence === 'medium') {
      // Medium desperation - RISKY to push (they might drop, leaving you stuck)
      // Game theory: only push if damage is worth the risk
      const idealPushPrice = Math.floor(mostDesperate.prediction.maxBid * 0.60); // More conservative
      targetPrice = Math.min(idealPushPrice, yourMaxBid - 200); // Larger safety margin

      if (targetPrice >= basePrice + 500) {
        action = 'push_price';
        reasoning.push(`⚠️ Risky push: ${mostDesperate.prediction.teamName} has medium interest`);
        reasoning.push(`They might drop - stop EARLY if hesitation`);
        reasoning.push(`Push cautiously to ₹${targetPrice.toLocaleString()}`);
        confidence = 'low'; // Low confidence because opponent might not bite
      } else {
        action = 'stay_out';
        targetPrice = undefined;
        reasoning.push(`Stay out - not worth the risk to push`);
        confidence = 'low';
      }
    } else {
      // Competitor not desperate enough - stay out
      // Game theory: pushing non-desperate opponents often backfires
      action = 'stay_out';
      reasoning.push(`Stay out - competitor interest is ${competitorDesperation}`);
      reasoning.push(`Not worth pushing (they may drop, you get stuck)`);
      confidence = 'medium';
    }
  }
  
  return {
    action,
    reasoning,
    targetPrice,
    competitorTeamId: mostDesperate?.prediction.teamId,
    competitorTeamName: mostDesperate?.prediction.teamName,
    yourInterestLevel,
    competitorDesperation,
    confidence,
  };
}

// Analyze full intelligence
export function analyzeIntelligence(
  teams: (Team & { 
    roster: Player[]; 
    captainPlayer?: Player; 
    viceCaptainPlayer?: Player; 
    spent: number; 
    remainingBudget: number; 
    maxBid: number; 
    playersNeeded: number;
  })[],
  currentPlayer: Player | null,
  soldPlayers: string[],
  soldPrices: Record<string, number>,
  preferences?: Record<string, TeamPreference>,
  behaviors?: Record<string, TeamBehavior>,
  currentBidPrice?: number,
  yourTeamId?: string // Your team ID for strategic recommendations
): IntelligenceAnalysis {
  const remainingPlayers = PLAYERS.filter(p => !soldPlayers.includes(p.id));

  const teamGaps: Record<string, RoleGap[]> = {};
  const clubGaps: Record<string, ClubGap[]> = {};
  const bidPredictions: BidPrediction[] = [];
  const scarcityAlerts: string[] = [];

  // Check for scarcity alerts - Roles
  const remainingByRole: Record<string, number> = {
    'Batsman': remainingPlayers.filter(p => p.role === 'Batsman').length,
    'Bowler': remainingPlayers.filter(p => p.role === 'Bowler').length,
    'All-rounder': remainingPlayers.filter(p => p.role === 'All-rounder').length,
    'WK-Batsman': remainingPlayers.filter(p => p.role === 'WK-Batsman').length,
  };

  Object.entries(remainingByRole).forEach(([role, count]) => {
    if (count <= 2) {
      scarcityAlerts.push(`⚠️ Only ${count} ${role}${count === 1 ? '' : 's'} remaining`);
    }
  });

  // Check for Super11 scarcity
  const remainingSuper11 = remainingPlayers.filter(p => p.club === 'Super11').length;
  // Calculate total Super11 still needed across all teams
  let totalSuper11Needed = 0;
  teams.forEach(team => {
    const teamClubGaps = calculateClubGaps(team, remainingPlayers);
    const super11Gap = teamClubGaps.find(g => g.club === 'Super11');
    if (super11Gap) {
      totalSuper11Needed += super11Gap.needed;
    }
  });

  if (remainingSuper11 <= totalSuper11Needed) {
    scarcityAlerts.push(`🏆 CRITICAL: Only ${remainingSuper11} Super11 left, ${totalSuper11Needed} needed across teams!`);

    // Identify how many teams are in "MUST GET" mode for Super11
    const teamsInMustGetMode = teams.filter(team => {
      const teamClubGap = calculateClubGaps(team, remainingPlayers).find(g => g.club === 'Super11');
      return teamClubGap && teamClubGap.needed > 0 && remainingSuper11 <= teamClubGap.needed;
    });

    if (teamsInMustGetMode.length >= 2 && currentPlayer?.club === 'Super11') {
      scarcityAlerts.push(`⚔️ BIDDING WAR: ${teamsInMustGetMode.length} teams MUST get this Super11 player!`);
    }
  } else if (remainingSuper11 <= totalSuper11Needed + 2) {
    scarcityAlerts.push(`🏆 Super11 getting scarce: ${remainingSuper11} left, ${totalSuper11Needed} needed`);
  }

  teams.forEach(team => {
    const gaps = calculateRoleGaps(team, remainingPlayers);
    const cGaps = calculateClubGaps(team, remainingPlayers);
    teamGaps[team.id] = gaps;
    clubGaps[team.id] = cGaps;
    
    if (currentPlayer) {
      const prediction = calculateBidLikelihood(
        team,
        currentPlayer,
        remainingPlayers,
        preferences?.[team.id],
        behaviors?.[team.id],
        currentBidPrice
      );
      bidPredictions.push(prediction);
    }
  });
  
  // Sort predictions by likelihood
  bidPredictions.sort((a, b) => b.likelihood - a.likelihood);
  
  // Calculate strategic recommendation if your team ID provided
  const strategicRecommendation = yourTeamId 
    ? calculateStrategicRecommendation(yourTeamId, currentPlayer, bidPredictions, teamGaps, teams)
    : undefined;
  
  return {
    currentPlayer,
    teamGaps,
    clubGaps,
    bidPredictions,
    behaviorPatterns: behaviors || {},
    scarcityAlerts,
    strategicRecommendation,
  };
}

// Learn behavior from auction history
export function learnBehaviorPattern(
  teamId: string,
  auctionHistory: { playerId: string; teamId: string; price: number; timestamp: number; playerRole?: string }[],
  allTeams: Team[]
): TeamBehavior {
  const teamHistory = auctionHistory.filter(h => h.teamId === teamId);
  
  if (teamHistory.length === 0) {
    return {
      teamId,
      avgBidPrice: 0,
      overpayFrequency: 0,
      earlyBidFrequency: 0,
      roleFocus: {},
      tiltFactor: 0,
    };
  }
  
  const prices = teamHistory.map(h => h.price);
  const avgBidPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
  
  // Calculate overpay frequency (bids above base price by 20%+)
  const overpays = teamHistory.filter(h => {
    const player = PLAYERS.find(p => p.id === h.playerId);
    if (!player) return false;
    const basePrice = BASE_PRICES[player.category as keyof typeof BASE_PRICES] || BASE_PRICES.BASE;
    return h.price > basePrice * 1.2;
  });
  const overpayFrequency = overpays.length / teamHistory.length;
  
  // Early bid frequency (placeholder - would need auction start times)
  const earlyBidFrequency = 0.5;
  
  // Role focus
  const roleFocus: Record<string, number> = {};
  teamHistory.forEach(h => {
    if (h.playerRole) {
      roleFocus[h.playerRole] = (roleFocus[h.playerRole] || 0) + 1;
    }
  });
  Object.keys(roleFocus).forEach(role => {
    roleFocus[role] = roleFocus[role] / teamHistory.length;
  });
  
  // Tilt factor: tendency to bid aggressively after losing
  let tiltFactor = 0;
  for (let i = 1; i < auctionHistory.length; i++) {
    const prev = auctionHistory[i - 1];
    const curr = auctionHistory[i];
    if (prev.teamId !== teamId && curr.teamId === teamId) {
      const timeDiff = curr.timestamp - prev.timestamp;
      if (timeDiff < 60000) { // Within 1 minute
        tiltFactor += 0.1;
      }
    }
  }
  tiltFactor = Math.min(1, tiltFactor);
  
  return {
    teamId,
    avgBidPrice,
    overpayFrequency,
    earlyBidFrequency,
    roleFocus,
    tiltFactor,
  };
}
