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

// Calculate role gaps for a team
export function calculateRoleGaps(
  team: Team & { roster: Player[]; captainPlayer?: Player; viceCaptainPlayer?: Player },
  remainingPlayers: Player[]
): RoleGap[] {
  const allPlayers: Player[] = [];
  if (team.captainPlayer) allPlayers.push(team.captainPlayer);
  if (team.viceCaptainPlayer) allPlayers.push(team.viceCaptainPlayer);
  allPlayers.push(...team.roster);

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
    
    // Calculate deficit from target
    const deficit = Math.max(0, target - current);
    
    // Urgency calculation: higher if missing role, lower if well covered
    let urgency = 0;
    if (current === 0 && role === 'WK-Batsman') urgency = 100; // Must have keeper
    else if (current === 0 && role === 'Bowler') urgency = 80;
    else if (current === 0) urgency = 60;
    else if (deficit > 0) urgency = Math.min(100, deficit * 30); // 30 points per missing
    
    // Increase urgency if scarcity is high
    if (remaining <= 2 && urgency > 0) urgency = Math.min(100, urgency + 20);
    if (remaining === 0 && urgency > 0) urgency = 100; // Last chance!

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
  if (team.playersNeeded <= 0 || team.maxBid < basePrice) {
    return {
      teamId: team.id,
      teamName: team.name,
      likelihood: 0,
      confidence: 'high',
      reasoning: team.playersNeeded <= 0 ? ['Team is full'] : ['Cannot afford base price'],
      maxBid: team.maxBid,
      recommendedWalkAway: 0,
      walkAwayReason: 'Not possible',
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
  const playerRole = currentPlayer.role || '';
  const roleGap = gaps.find(g => g.role === playerRole);
  
  let likelihood = 0.3; // Base likelihood
  let confidence: 'low' | 'medium' | 'high' = 'low';
  const reasoning: string[] = [];
  
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
  const budgetRatio = team.remainingBudget / team.budget;
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
  
  // Factor 6: Fair Price Target
  if (preferences?.fairPriceTargets?.[currentPlayer.id]) {
    const fairConfig = preferences.fairPriceTargets[currentPlayer.id];
    if (currentBidPrice !== undefined) {
      if (currentBidPrice <= fairConfig.maxPrice) {
        likelihood = fairConfig.basePreference + fairConfig.fairPriceBoost;
        reasoning.push(`💰 Fair price opportunity (current: ₹${currentBidPrice})`);
        confidence = 'high';
      } else {
        likelihood = fairConfig.basePreference;
        reasoning.push(`Price above fair threshold (max: ₹${fairConfig.maxPrice})`);
      }
    } else {
      likelihood = fairConfig.basePreference;
      reasoning.push(`Fair price target (max: ₹${fairConfig.maxPrice})`);
    }
  }
  
  // Factor 7: Steal Price Target
  if (preferences?.stealPriceTargets?.[currentPlayer.id]) {
    const stealConfig = preferences.stealPriceTargets[currentPlayer.id];
    if (currentBidPrice !== undefined) {
      if (currentBidPrice <= stealConfig.maxPrice) {
        likelihood = stealConfig.basePreference + stealConfig.stealBoost;
        reasoning.push(`💰 Steal price opportunity (current: ₹${currentBidPrice})`);
        confidence = 'high';
      } else {
        likelihood = stealConfig.basePreference;
        reasoning.push(`Price above steal threshold (max: ₹${stealConfig.maxPrice})`);
      }
    } else {
      likelihood = stealConfig.basePreference;
      reasoning.push(`Steal price target (max: ₹${stealConfig.maxPrice})`);
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
  
  // Cap at 1.0
  likelihood = Math.min(1.0, likelihood);
  
  // Default reasoning if none
  if (reasoning.length === 0) {
    reasoning.push('Neutral interest');
  }
  
  // Calculate recommended walk-away price
  let recommendedWalkAway = team.maxBid;
  let walkAwayReason = 'Max budget limit';
  
  if (roleGap) {
    const similarRemaining = remainingPlayers.filter(p => 
      p.role === playerRole && 
      p.category === currentPlayer.category &&
      p.id !== currentPlayer.id
    ).length;
    
    if (similarRemaining >= 2) {
      // Multiple alternatives available - be conservative
      recommendedWalkAway = Math.floor(team.maxBid * 0.65);
      walkAwayReason = `${similarRemaining} similar players still available`;
    } else if (similarRemaining === 1) {
      // One alternative left - moderate
      recommendedWalkAway = Math.floor(team.maxBid * 0.80);
      walkAwayReason = 'Only 1 alternative left';
    } else if (similarRemaining === 0 && roleGap.urgency >= 70) {
      // Last chance for this role - can go higher
      recommendedWalkAway = Math.floor(team.maxBid * 0.95);
      walkAwayReason = 'Last chance for this role';
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
  
  recommendedWalkAway = Math.max(basePrice, recommendedWalkAway);
  
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
  const yourGaps = teamGaps[yourTeamId] || [];
  const playerRole = currentPlayer.role || '';
  const yourRoleGap = yourGaps.find(g => g.role === playerRole);
  
  // Determine your interest level
  let yourInterestLevel: 'high' | 'medium' | 'low' | 'none' = 'none';
  if (yourPrediction) {
    if (yourPrediction.likelihood >= 0.75) yourInterestLevel = 'high';
    else if (yourPrediction.likelihood >= 0.50) yourInterestLevel = 'medium';
    else if (yourPrediction.likelihood >= 0.25) yourInterestLevel = 'low';
  }
  
  // Find most desperate competitor (high likelihood + high confidence + high urgency)
  const competitors = bidPredictions
    .filter(p => p.teamId !== yourTeamId)
    .map(pred => {
      const team = teams.find(t => t.id === pred.teamId);
      const gaps = teamGaps[pred.teamId] || [];
      const roleGap = gaps.find(g => g.role === playerRole);
      
      return {
        prediction: pred,
        team,
        roleGap,
        desperationScore: (pred.likelihood * 0.5) + 
                         (pred.confidence === 'high' ? 0.3 : pred.confidence === 'medium' ? 0.15 : 0) +
                         ((roleGap?.urgency || 0) / 100 * 0.2),
      };
    })
    .sort((a, b) => b.desperationScore - a.desperationScore);
  
  const mostDesperate = competitors[0];
  
  if (!mostDesperate || !yourTeam) return undefined;
  
  const competitorDesperation: 'high' | 'medium' | 'low' = 
    mostDesperate.desperationScore >= 0.7 ? 'high' :
    mostDesperate.desperationScore >= 0.5 ? 'medium' : 'low';
  
  const reasoning: string[] = [];
  let action: 'push_price' | 'stay_out' | 'compete' | 'neutral' = 'neutral';
  let targetPrice: number | undefined;
  let confidence: 'high' | 'medium' | 'low' = 'low';
  
  // Decision logic
  if (yourInterestLevel === 'high') {
    // You want this player - compete
    action = 'compete';
    reasoning.push(`You want this player (${Math.round((yourPrediction?.likelihood || 0) * 100)}% interest)`);
    if (competitorDesperation === 'high') {
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
    reasoning.push(`Moderate interest - compete if price stays reasonable`);
    if (competitorDesperation === 'high') {
      reasoning.push(`⚠️ Strong competition - consider walking away early`);
      confidence = 'medium';
    }
  } else if (yourInterestLevel === 'low' || yourInterestLevel === 'none') {
    // You don't want this player
    if (competitorDesperation === 'high' && mostDesperate.prediction.confidence === 'high') {
      // Competitor is desperate - push price to drain their budget
      action = 'push_price';
      targetPrice = Math.floor(mostDesperate.prediction.maxBid * 0.85); // Push them to 85% of max
      reasoning.push(`🎯 Strategic opportunity: ${mostDesperate.prediction.teamName} is desperate`);
      reasoning.push(`They need ${playerRole} (urgency: ${mostDesperate.roleGap?.urgency || 0}%)`);
      reasoning.push(`High confidence they'll pay up to ₹${mostDesperate.prediction.maxBid.toLocaleString()}`);
      reasoning.push(`Push price to ₹${targetPrice.toLocaleString()} to drain their budget`);
      reasoning.push(`⚠️ Stop at ₹${targetPrice.toLocaleString()} - don't get caught!`);
      confidence = mostDesperate.prediction.confidence === 'high' ? 'high' : 'medium';
    } else if (competitorDesperation === 'medium' && mostDesperate.prediction.confidence === 'medium') {
      // Medium desperation - can still push but be more careful
      action = 'push_price';
      targetPrice = Math.floor(mostDesperate.prediction.maxBid * 0.75); // Push them to 75% of max (more conservative)
      reasoning.push(`Moderate opportunity: ${mostDesperate.prediction.teamName} has medium interest`);
      reasoning.push(`Can push price to ₹${targetPrice.toLocaleString()} but be cautious`);
      reasoning.push(`⚠️ Stop early if they show hesitation`);
      confidence = 'medium';
    } else {
      // Competitor not desperate enough - stay out
      action = 'stay_out';
      reasoning.push(`Stay out - competitor interest is ${competitorDesperation}`);
      reasoning.push(`Not worth pushing price (they may drop early)`);
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
  const bidPredictions: BidPrediction[] = [];
  const scarcityAlerts: string[] = [];
  
  // Check for scarcity alerts
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
  
  teams.forEach(team => {
    const gaps = calculateRoleGaps(team, remainingPlayers);
    teamGaps[team.id] = gaps;
    
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
