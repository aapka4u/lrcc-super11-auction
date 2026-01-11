'use client';

import { useEffect, useState, useMemo } from 'react';
import { Player, Team } from '@/lib/types';
import { analyzeIntelligence, calculateRoleGaps, calculateClubGaps, ClubGap, TeamPreference, TeamBehavior, BidPrediction, StrategicRecommendation } from '@/lib/intelligence';
import { PLAYERS, TEAMS, ALL_PLAYERS } from '@/lib/data';

interface IntelligencePanelProps {
  teams: (Team & { 
    roster: Player[]; 
    captainPlayer?: Player; 
    viceCaptainPlayer?: Player; 
    spent: number; 
    remainingBudget: number; 
    maxBid: number; 
    playersNeeded: number;
  })[];
  currentPlayer: Player | null;
  soldPlayers: string[];
  soldPrices: Record<string, number>;
  auctionHistory: { playerId: string; teamId: string; price: number; timestamp: number; playerRole?: string }[];
}

const INTELLIGENCE_PASSWORD = 'boomgaard';
const PREFERENCE_STORAGE_KEY = 'intelligence:preferences';
const AUTH_STORAGE_KEY = 'intelligence:authenticated';

// Helper functions for Simple Mode
function getTopThreats(predictions: BidPrediction[], yourTeamId: string, limit: number = 2): BidPrediction[] {
  // Get competitors sorted by likelihood, then filter to meaningful threats (>=40%)
  const competitors = predictions
    .filter(p => p.teamId !== yourTeamId && p.likelihood > 0)
    .sort((a, b) => b.likelihood - a.likelihood);

  // If top competitor is high enough, show threats above 40% (meaningful interest)
  // If top is only 30%, show top 2 anyway so user knows who's most likely
  const topLikelihood = competitors[0]?.likelihood || 0;
  const threshold = topLikelihood >= 0.5 ? 0.4 : 0.25; // Dynamic threshold

  return competitors
    .filter(p => p.likelihood >= threshold)
    .slice(0, limit);
}

function getTopReason(recommendation?: StrategicRecommendation, yourPred?: BidPrediction): string {
  // Skip the status line (starts with 📊) to get the actual insight
  if (recommendation?.reasoning) {
    const actionableReason = recommendation.reasoning.find(r => !r.startsWith('📊'));
    if (actionableReason) return actionableReason;
  }
  if (yourPred?.reasoning) {
    const actionableReason = yourPred.reasoning.find(r => !r.startsWith('📊'));
    if (actionableReason) return actionableReason;
  }
  return 'Evaluate based on need';
}

function getActionLimit(recommendation?: StrategicRecommendation, yourPred?: BidPrediction): number {
  // For PUSH, use targetPrice. For BID, use walk-away price
  if (recommendation?.action === 'push_price' && recommendation.targetPrice) {
    return recommendation.targetPrice;
  }
  if (yourPred?.recommendedWalkAway && yourPred.recommendedWalkAway > 0) {
    return yourPred.recommendedWalkAway;
  }
  return 0;
}

function getActionType(recommendation?: StrategicRecommendation, yourPred?: BidPrediction): 'BID' | 'PUSH' | 'WAIT' | 'SKIP' {
  // Check if you're constrained OUT of this player
  if (yourPred && yourPred.likelihood === 0) {
    // Hard constraint - you can't/shouldn't bid
    const isConstraint = yourPred.reasoning.some(r =>
      r.includes('Cannot') || r.includes('Team is full') || r.includes('avoid list')
    );
    if (isConstraint) return 'SKIP';
    return 'WAIT';
  }

  if (!recommendation) {
    // No strategic recommendation - base on your own interest
    if (yourPred && yourPred.likelihood >= 0.5) return 'BID';
    if (yourPred && yourPred.likelihood >= 0.3) return 'BID'; // Lower threshold, show walk-away
    return 'WAIT';
  }
  if (recommendation.action === 'compete') return 'BID';
  if (recommendation.action === 'push_price') return 'PUSH';
  return 'WAIT';
}

export default function IntelligencePanel({
  teams,
  currentPlayer,
  soldPlayers,
  soldPrices,
  auctionHistory,
}: IntelligencePanelProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  const [preferences, setPreferences] = useState<Record<string, TeamPreference>>({});
  const [editingPreference, setEditingPreference] = useState<string | null>(null);
  const [preferenceInput, setPreferenceInput] = useState('');
  const [editingAvoidList, setEditingAvoidList] = useState<string | null>(null);
  const [avoidListInput, setAvoidListInput] = useState('');
  const [simpleMode, setSimpleMode] = useState(true); // Default to simple mode for mobile

  // Load auth state from localStorage on mount
  useEffect(() => {
    const savedAuth = localStorage.getItem(AUTH_STORAGE_KEY);
    if (savedAuth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  // Load preferences from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(PREFERENCE_STORAGE_KEY);
    let parsed: Record<string, TeamPreference> = {};
    
    if (saved) {
      try {
        parsed = JSON.parse(saved);
        setPreferences(parsed);
      } catch (e) {
        console.warn('Failed to parse saved preferences:', e);
        // Clear corrupted data
        localStorage.removeItem(PREFERENCE_STORAGE_KEY);
      }
    }
    
    // Auto-load avoid list for your team (Octo-Pace) if not set
    const yourTeam = TEAMS.find(t => t.id === 'team_rajul_kathir');
    if (yourTeam && !parsed[yourTeam.id]?.avoidPlayers) {
      // Default avoid list: Ayush Kothari, Srini, Jayendra, Bala, Vinith, Brijul, Gagan, Vikas, Kunal Kanade
      const avoidPlayerNames = ['Ayush Kothari', 'Srini', 'Jayendra', 'Bala', 'Vinith', 'Brijul', 'Gagan Sharma', 'Vikas', 'Kunal Kanade'];
      const avoidPlayerIds = avoidPlayerNames.map(name => {
        const player = ALL_PLAYERS.find(p => 
          p.name.toLowerCase() === name.toLowerCase() ||
          (name === 'Kunal Kanade' && p.name.toLowerCase().includes('kunal'))
        );
        return player?.id;
      }).filter((id): id is string => !!id);
      
      if (avoidPlayerIds.length > 0) {
        const updated = {
          ...parsed,
          [yourTeam.id]: {
            ...(parsed[yourTeam.id] || {}),
            teamId: yourTeam.id,
            avoidPlayers: avoidPlayerIds,
          },
        };
        setPreferences(updated);
        localStorage.setItem(PREFERENCE_STORAGE_KEY, JSON.stringify(updated));
      }
    }
  }, []);
  
  // Save preferences
  const savePreferences = (teamId: string, pref: TeamPreference) => {
    const updated = { ...preferences, [teamId]: pref };
    setPreferences(updated);
    localStorage.setItem(PREFERENCE_STORAGE_KEY, JSON.stringify(updated));
  };
  
  // Learn behaviors from history - actually compute from auction data
  const behaviors = useMemo(() => {
    const learned: Record<string, TeamBehavior> = {};

    // Group history by team
    teams.forEach(team => {
      const teamHistory = auctionHistory.filter(h => h.teamId === team.id);

      if (teamHistory.length === 0) {
        learned[team.id] = {
          teamId: team.id,
          avgBidPrice: 0,
          overpayFrequency: 0,
          earlyBidFrequency: 0.5,
          roleFocus: {},
          tiltFactor: 0,
        };
        return;
      }

      // Calculate average bid price
      const prices = teamHistory.map(h => h.price);
      const avgBidPrice = prices.reduce((a, b) => a + b, 0) / prices.length;

      // Calculate overpay frequency (paid > 1.2x base price)
      const overpays = teamHistory.filter(h => {
        const player = PLAYERS.find(p => p.id === h.playerId);
        if (!player) return false;
        const basePrice = player.category === 'APLUS' ? 2500 : 1000;
        return h.price > basePrice * 1.2;
      });
      const overpayFrequency = overpays.length / teamHistory.length;

      // Calculate role focus
      const roleFocus: Record<string, number> = {};
      teamHistory.forEach(h => {
        if (h.playerRole) {
          roleFocus[h.playerRole] = (roleFocus[h.playerRole] || 0) + 1;
        }
      });
      Object.keys(roleFocus).forEach(role => {
        roleFocus[role] = roleFocus[role] / teamHistory.length;
      });

      // Calculate tilt factor (buying quickly after losing)
      let tiltFactor = 0;
      const sortedHistory = [...auctionHistory].sort((a, b) => a.timestamp - b.timestamp);
      for (let i = 1; i < sortedHistory.length; i++) {
        const prev = sortedHistory[i - 1];
        const curr = sortedHistory[i];
        if (prev.teamId !== team.id && curr.teamId === team.id) {
          const timeDiff = curr.timestamp - prev.timestamp;
          if (timeDiff < 60000) { // Within 1 minute of losing previous player
            tiltFactor += 0.15;
          }
        }
      }
      tiltFactor = Math.min(1, tiltFactor);

      // Find last loss timestamp
      let lastLossTimestamp: number | undefined;
      for (let i = sortedHistory.length - 1; i >= 0; i--) {
        if (sortedHistory[i].teamId !== team.id) {
          lastLossTimestamp = sortedHistory[i].timestamp;
          break;
        }
      }

      learned[team.id] = {
        teamId: team.id,
        avgBidPrice,
        overpayFrequency,
        earlyBidFrequency: 0.5,
        roleFocus,
        tiltFactor,
        lastLossTimestamp,
      };
    });

    return learned;
  }, [teams, auctionHistory]);
  
  // Identify your team (Octo-Pace, formerly Team Rajul & Kathir)
  // Use the team ID directly for reliable lookup
  const yourTeamId = useMemo(() => {
    const teamId = 'team_rajul_kathir';
    // Verify team exists in static or live data
    if (TEAMS.find(t => t.id === teamId) || teams.find(t => t.id === teamId)) {
      return teamId;
    }
    return teams[0]?.id || ''; // Empty string as last resort
  }, [teams]);
  
  // Calculate intelligence analysis
  const analysis = useMemo(() => {
    return analyzeIntelligence(
      teams,
      currentPlayer,
      soldPlayers,
      soldPrices,
      preferences,
      behaviors,
      undefined, // Remove currentBidPrice - not needed
      yourTeamId
    );
  }, [teams, currentPlayer, soldPlayers, soldPrices, preferences, behaviors, yourTeamId]);
  
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === INTELLIGENCE_PASSWORD) {
      setIsAuthenticated(true);
      setPasswordError(false);
      setPassword('');
      // Persist auth to localStorage
      localStorage.setItem(AUTH_STORAGE_KEY, 'true');
    } else {
      setPasswordError(true);
      setPassword('');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };
  
  const remainingPlayers = PLAYERS.filter(p => !soldPlayers.includes(p.id));
  
  // Password screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass rounded-2xl p-8 w-full max-w-sm">
          <h1 className="text-2xl font-bold text-white text-center mb-6">
            🧠 Intelligence Panel
          </h1>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setPasswordError(false);
              }}
              placeholder="Enter password"
              className={`
                w-full px-4 py-3 rounded-xl bg-white/10 border text-white text-center text-lg
                placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500
                ${passwordError ? 'border-red-500 shake' : 'border-white/20'}
              `}
              autoFocus
            />
            {passwordError && (
              <p className="text-red-400 text-sm text-center mt-2">
                Incorrect password
              </p>
            )}
            <button
              type="submit"
              disabled={!password}
              className="w-full mt-4 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
            >
              Access Intelligence
            </button>
          </form>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass rounded-2xl p-6 border-2 border-purple-500/30">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">🧠 Intelligence Panel</h2>
            <p className="text-white/60 text-sm">
              Real-time auction advisor based on team gaps, budget, scarcity, and behavior patterns
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSimpleMode(!simpleMode)}
              className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
                simpleMode 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              {simpleMode ? '⚡ Simple' : '📊 Detailed'}
            </button>
            <button
              onClick={handleLogout}
              className="text-sm text-white/50 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
      
      {/* Simple Mode View */}
      {simpleMode && currentPlayer && (() => {
        const yourPrediction = analysis.bidPredictions.find(p => p.teamId === yourTeamId);
        const threats = getTopThreats(analysis.bidPredictions, yourTeamId, 2);
        const action = getActionType(analysis.strategicRecommendation, yourPrediction);
        const limit = getActionLimit(analysis.strategicRecommendation, yourPrediction);
        const reason = getTopReason(analysis.strategicRecommendation, yourPrediction);
        
        return (
          <>
            {/* Critical Scarcity Alert - prioritize BIDDING WAR alerts */}
            {analysis.scarcityAlerts.length > 0 && (() => {
              // Find most critical alert (bidding war > critical > other)
              const biddingWarAlert = analysis.scarcityAlerts.find(a => a.includes('BIDDING WAR'));
              const criticalAlert = analysis.scarcityAlerts.find(a => a.includes('CRITICAL'));
              const alertToShow = biddingWarAlert || criticalAlert || analysis.scarcityAlerts[0];
              const isBiddingWar = alertToShow.includes('BIDDING WAR');
              const isCritical = alertToShow.includes('CRITICAL');

              return (
                <div className={`glass rounded-xl p-3 border ${
                  isBiddingWar
                    ? 'bg-red-500/20 border-red-500/50 animate-pulse'
                    : isCritical
                    ? 'bg-red-500/10 border-red-500/30'
                    : 'bg-amber-500/10 border-amber-500/30'
                }`}>
                  <p className={`text-sm font-semibold ${
                    isBiddingWar ? 'text-red-200' : isCritical ? 'text-red-300' : 'text-amber-200'
                  }`}>
                    {alertToShow}
                  </p>
                </div>
              );
            })()}
            
            {/* Player Name Header */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-xl">
                {currentPlayer.role === 'Batsman' ? '🏏' :
                 currentPlayer.role === 'Bowler' ? '🎯' :
                 currentPlayer.role === 'All-rounder' ? '⚡' :
                 currentPlayer.role === 'WK-Batsman' ? '🧤' : ''}
              </span>
              <h3 className="text-lg font-bold text-white">{currentPlayer.name}</h3>
              {currentPlayer.category === 'APLUS' && (
                <span className="text-xs bg-purple-500/30 text-purple-300 px-2 py-0.5 rounded font-semibold">⭐ Star</span>
              )}
              {currentPlayer.club === 'Super11' && (
                <span className="text-xs bg-yellow-500/30 text-yellow-300 px-2 py-0.5 rounded font-semibold">🏆 Super11</span>
              )}
              {currentPlayer.availability === 'tentative' && (
                <span className="text-xs bg-red-500/30 text-red-300 px-2 py-0.5 rounded">⚠️ Tentative</span>
              )}
              {currentPlayer.availability === 'till_11' && (
                <span className="text-xs bg-orange-500/30 text-orange-300 px-2 py-0.5 rounded">⏰ Till 11AM</span>
              )}
              {currentPlayer.availability === 'till_12' && (
                <span className="text-xs bg-orange-500/30 text-orange-300 px-2 py-0.5 rounded">⏰ Till noon</span>
              )}
            </div>
            
            {/* Simple Action Card - Mobile Optimized */}
            <div className={`p-5 rounded-2xl text-center border-4 ${
              action === 'PUSH' ? 'bg-orange-900/90 border-orange-500' :
              action === 'BID' ? 'bg-green-900/90 border-green-500' :
              action === 'SKIP' ? 'bg-red-900/90 border-red-500' :
              'bg-slate-900/90 border-slate-600'
            }`}>
              <div className="flex items-center justify-center gap-3 mb-2">
                <h1 className="text-4xl font-black text-white uppercase">
                  {action}
                </h1>
                {limit > 0 && action !== 'SKIP' && (
                  <div className="text-2xl font-bold text-white">
                    ₹{limit.toLocaleString()}
                  </div>
                )}
              </div>
              <div className="text-sm text-white/80 font-medium">
                {action === 'SKIP' ? (
                  <>{yourPrediction?.reasoning.find(r => r.includes('Cannot') || r.includes('Team is full') || r.includes('avoid'))?.replace(/^[🚫⚠️]+\s*/, '') || 'Constraint prevents bidding'}</>
                ) : action === 'PUSH' && limit > 0 ? (
                  <>⚠️ Stop at ₹{limit.toLocaleString()} - drain their budget</>
                ) : action === 'BID' && limit > 0 ? (
                  <>Walk away above ₹{limit.toLocaleString()}</>
                ) : (
                  <>{reason}</>
                )}
              </div>
              {/* Show main reason if different from default action text */}
              {reason && !reason.includes('Walk away') && !reason.includes('drain') && action !== 'WAIT' && action !== 'SKIP' && (
                <div className="text-xs text-white/60 mt-1 truncate">
                  {reason}
                </div>
              )}
            </div>
            
            {/* Top Threats */}
            {threats.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-white/70 uppercase tracking-wider">
                    Top Threats
                  </h4>
                  {threats.length >= 2 && threats.every(t => t.likelihood >= 0.6) && (
                    <span className="text-xs bg-red-500/30 text-red-300 px-2 py-0.5 rounded animate-pulse">
                      ⚔️ Multi-team interest
                    </span>
                  )}
                </div>
                {threats.map((threat) => {
                  const team = teams.find(t => t.id === threat.teamId);
                  const likelihoodPercent = Math.round(threat.likelihood * 100);
                  const isDesperate = threat.confidence === 'high' && likelihoodPercent >= 70;
                  // Get the key reason (skip status line)
                  const keyReason = threat.reasoning.find(r => !r.startsWith('📊')) || '';
                  const isMustGet = keyReason.includes('MUST GET');

                  return (
                    <div
                      key={threat.teamId}
                      className={`glass rounded-xl p-4 border min-h-[72px] ${isMustGet ? 'border-red-500/50 bg-red-500/10' : 'border-white/10'}`}
                      style={{ borderLeftColor: team?.color, borderLeftWidth: '4px' }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: team?.color }}
                          />
                          <span className="font-bold text-white text-base">{threat.teamName.split(' ')[1]}</span>
                          <span className={`text-base font-bold ${likelihoodPercent >= 80 ? 'text-red-400' : likelihoodPercent >= 60 ? 'text-orange-400' : 'text-white'}`}>
                            {likelihoodPercent}%
                          </span>
                        </div>
                        <div className="flex gap-1">
                          {isMustGet && (
                            <span className="text-xs bg-red-500/40 text-red-200 px-2 py-1 rounded font-semibold">
                              MUST GET
                            </span>
                          )}
                          {!isMustGet && isDesperate && (
                            <span className="text-xs bg-orange-500/30 text-orange-300 px-2 py-1 rounded">
                              Desperate
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Show key reason on mobile - with better formatting */}
                      <div className="flex items-center justify-between">
                        {keyReason && (
                          <div className="text-sm text-white/70 truncate flex-1">
                            {keyReason.replace(/^[🏆⚠️📊🔥💰⏰]+\s*/, '')}
                          </div>
                        )}
                        {/* Show max bid for context */}
                        <div className="text-sm text-white/50 ml-2 whitespace-nowrap">
                          Max ₹{threat.maxBid.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="glass rounded-xl p-4 text-center border border-white/10">
                <p className="text-white/60 text-sm">No strong competition</p>
              </div>
            )}
          </>
        );
      })()}
      
      {/* Detailed Mode View */}
      {!simpleMode && (
        <>
          {/* Scarcity Alerts */}
          {analysis.scarcityAlerts.length > 0 && (
            <div className="glass rounded-xl p-4 bg-amber-500/10 border border-amber-500/30">
              <h3 className="text-sm font-semibold text-amber-300 mb-2">⚠️ Scarcity Alerts</h3>
              <ul className="space-y-1">
                {analysis.scarcityAlerts.map((alert, i) => (
                  <li key={i} className="text-sm text-amber-200">{alert}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {/* Strategic Bidding Recommendation */}
      {currentPlayer && analysis.strategicRecommendation && (
        <div className={`glass rounded-2xl p-6 border-2 ${
          analysis.strategicRecommendation.action === 'push_price' 
            ? 'border-orange-500/50 bg-orange-500/10' 
            : analysis.strategicRecommendation.action === 'stay_out'
            ? 'border-gray-500/50 bg-gray-500/10'
            : analysis.strategicRecommendation.action === 'compete'
            ? 'border-green-500/50 bg-green-500/10'
            : 'border-blue-500/30'
        }`}>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">
              {analysis.strategicRecommendation.action === 'push_price' ? '🎯' :
               analysis.strategicRecommendation.action === 'stay_out' ? '🚫' :
               analysis.strategicRecommendation.action === 'compete' ? '⚔️' : '📊'}
            </span>
            <div>
              <h3 className="text-xl font-bold text-white">
                {analysis.strategicRecommendation.action === 'push_price' ? 'Push Price - Strategic Opportunity' :
                 analysis.strategicRecommendation.action === 'stay_out' ? 'Stay Out - Avoid Crossfire' :
                 analysis.strategicRecommendation.action === 'compete' ? 'Compete - You Want This Player' :
                 'Neutral'}
              </h3>
              <p className="text-white/60 text-sm">
                Confidence: <span className={`font-semibold ${
                  analysis.strategicRecommendation.confidence === 'high' ? 'text-green-400' :
                  analysis.strategicRecommendation.confidence === 'medium' ? 'text-yellow-400' :
                  'text-gray-400'
                }`}>{analysis.strategicRecommendation.confidence.toUpperCase()}</span>
              </p>
            </div>
          </div>
          
          <div className="space-y-3">
            {analysis.strategicRecommendation.action === 'push_price' && (
              <>
                <div className="bg-orange-500/20 border border-orange-500/30 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-orange-200 font-semibold mb-1">
                        Target: {analysis.strategicRecommendation.competitorTeamName}
                      </p>
                      <p className="text-orange-300 text-sm">
                        Desperation: {analysis.strategicRecommendation.competitorDesperation.toUpperCase()}
                      </p>
                    </div>
                    {analysis.strategicRecommendation.targetPrice && (
                      <div className="text-right">
                        <p className="text-orange-200 font-bold text-lg">
                          ₹{analysis.strategicRecommendation.targetPrice.toLocaleString()}
                        </p>
                        <p className="text-orange-300 text-xs">Push to this price</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3">
                  <p className="text-red-200 text-sm font-semibold">
                    ⚠️ CRITICAL: Stop bidding at ₹{analysis.strategicRecommendation.targetPrice?.toLocaleString()} - Don't get caught!
                  </p>
                </div>
              </>
            )}
            
            {analysis.strategicRecommendation.action === 'stay_out' && (
              <div className="bg-gray-500/20 border border-gray-500/30 rounded-lg p-4">
                <p className="text-gray-200 font-semibold mb-2">Stay Out - Let Them Bid</p>
                <p className="text-gray-300 text-sm">
                  Competitor interest is not high enough to justify pushing price. 
                  Let them bid naturally - they may drop early.
                </p>
              </div>
            )}
            
            {analysis.strategicRecommendation.action === 'compete' && (
              <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4">
                <p className="text-green-200 font-semibold mb-2">
                  Your Interest: {analysis.strategicRecommendation.yourInterestLevel.toUpperCase()}
                </p>
                {analysis.strategicRecommendation.competitorDesperation === 'high' && (
                  <p className="text-yellow-300 text-sm mt-2">
                    ⚠️ Strong competition expected - be prepared for bidding war
                  </p>
                )}
              </div>
            )}
            
            <div className="space-y-1">
              {analysis.strategicRecommendation.reasoning.map((reason, i) => (
                <p key={i} className="text-white/70 text-sm">• {reason}</p>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Current Player Analysis */}
      {currentPlayer && (
        <div className="glass rounded-2xl p-6 border-2 border-blue-500/30">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">
              {currentPlayer.role === 'Batsman' ? '🏏' : 
               currentPlayer.role === 'Bowler' ? '🎯' :
               currentPlayer.role === 'All-rounder' ? '⚡' :
               currentPlayer.role === 'WK-Batsman' ? '🧤' : ''}
            </span>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white">{currentPlayer.name}</h3>
              <p className="text-white/60 text-sm">
                {currentPlayer.role} • {currentPlayer.category === 'APLUS' ? '⭐ Star' : 'League'} • Base: ₹{currentPlayer.category === 'APLUS' ? '2,500' : '1,000'}
              </p>
            </div>
            {currentPlayer.availability === 'tentative' && (
              <span className="text-xs bg-yellow-500/30 text-yellow-300 px-2 py-1 rounded">⚠️ Tentative</span>
            )}
          </div>
          
          {/* Your Team Prediction */}
          {analysis.bidPredictions.find(p => p.teamId === yourTeamId) && (
            <div className="mb-4 p-4 bg-purple-500/20 border-2 border-purple-500/50 rounded-xl">
              <h4 className="text-sm font-semibold text-purple-300 uppercase tracking-wider mb-2">
                👤 Your Team
              </h4>
              {(() => {
                const yourPred = analysis.bidPredictions.find(p => p.teamId === yourTeamId)!;
                const yourTeam = teams.find(t => t.id === yourTeamId);
                return (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-white">{yourPred.teamName}</span>
                      <span className="text-purple-300 font-bold">
                        {Math.round(yourPred.likelihood * 100)}% Interest
                      </span>
                    </div>
                    <div className="text-xs text-white/70 space-y-1 mb-2">
                      {yourPred.reasoning.map((reason, j) => (
                        <div key={j}>• {reason}</div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div>
                        <span className="text-white/50">Max Bid: </span>
                        <span className="text-white font-semibold">₹{yourPred.maxBid.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-purple-300">Walk-away: </span>
                        <span className="text-purple-200 font-bold">₹{yourPred.recommendedWalkAway.toLocaleString()}</span>
                      </div>
                    </div>
                    <p className="text-xs text-purple-300/80 mt-2">
                      💡 {yourPred.walkAwayReason}
                    </p>
                  </div>
                );
              })()}
            </div>
          )}
          
          {/* Competitor Predictions */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-white/70 uppercase tracking-wider">
              Competitors (Ranked by BidIntentScore)
            </h4>
            {analysis.bidPredictions
              .filter(p => p.teamId !== yourTeamId)
              .map((pred, i) => {
              const team = teams.find(t => t.id === pred.teamId);
              const likelihoodPercent = Math.round(pred.likelihood * 100);
              const confidenceColor = 
                pred.confidence === 'high' ? 'text-green-400' :
                pred.confidence === 'medium' ? 'text-yellow-400' :
                'text-gray-400';
              
              return (
                <div
                  key={pred.teamId}
                  className="glass rounded-xl p-4 border border-white/10"
                  style={{ borderLeftColor: team?.color, borderLeftWidth: '4px' }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: team?.color }}
                      />
                      <span className="font-semibold text-white">{pred.teamName}</span>
                      <span className={`text-sm font-bold ${confidenceColor}`}>
                        {likelihoodPercent}%
                      </span>
                      <span className="text-xs text-white/40">({pred.confidence})</span>
                    </div>
                    <div className="text-right text-xs text-white/50">
                      <div>Max: ₹{pred.maxBid.toLocaleString()}</div>
                      <div className="text-purple-400">Walk: ₹{pred.recommendedWalkAway.toLocaleString()}</div>
                    </div>
                  </div>
                  
                  <div className="text-xs text-white/60 space-y-1">
                    {pred.reasoning.map((reason, j) => (
                      <div key={j}>• {reason}</div>
                    ))}
                    <div className="text-purple-300 mt-1">
                      💡 Walk-away: {pred.walkAwayReason}
                    </div>
                  </div>
                  
                  {/* Likelihood Bar */}
                  <div className="mt-2 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full transition-all"
                      style={{
                        width: `${likelihoodPercent}%`,
                        backgroundColor: team?.color || '#fff',
                      }}
                    />
                  </div>
                  
                  {/* Desperation Indicator */}
                  {pred.confidence === 'high' && likelihoodPercent >= 70 && (
                    <div className="mt-2 text-xs bg-red-500/20 text-red-300 px-2 py-1 rounded">
                      🔥 High confidence - likely to pay maximum
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {!currentPlayer && (
        <div className="glass rounded-xl p-6 text-center border border-white/10">
          <p className="text-white/60">No player currently up for auction</p>
          <p className="text-white/40 text-sm mt-2">Predictions will appear when a player goes LIVE</p>
        </div>
      )}
      
      {simpleMode && !currentPlayer && (
        <div className="glass rounded-xl p-6 text-center border border-white/10">
          <p className="text-white/60">No player up</p>
          <p className="text-white/40 text-sm mt-2">Switch to Detailed mode for full analysis</p>
        </div>
      )}
      
      {/* Team Budget & Constraints - Only in Detailed Mode */}
      {!simpleMode && (
        <div className="glass rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-2">💰 Team Budget Constraints</h3>
        <p className="text-xs text-white/50 mb-4">
          Max Bid = Remaining Budget - (Players Needed × ₹1,000 base price). Teams must reserve enough for remaining picks.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {teams.map(team => {
            const totalPlayers = 2 + team.roster.length; // C + VC + roster
            const playersNeeded = 8 - totalPlayers;
            const reserveNeeded = Math.max(0, playersNeeded - 1) * 1000; // Reserve for future picks at base
            const isFull = playersNeeded <= 0;
            const isBudgetTight = team.maxBid < 1500;

            return (
              <div
                key={team.id}
                className={`glass rounded-xl p-3 border ${isFull ? 'border-green-500/30 bg-green-500/5' : isBudgetTight ? 'border-orange-500/30 bg-orange-500/5' : 'border-white/10'}`}
                style={{ borderLeftColor: team.color, borderLeftWidth: '4px' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-white text-sm">{team.name.split(' ')[1]}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${isFull ? 'bg-green-500/20 text-green-300' : 'bg-white/10 text-white/60'}`}>
                    {totalPlayers}/8 players
                  </span>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-white/50">Budget:</span>
                    <span className="text-white font-mono">₹{team.budget.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">Spent:</span>
                    <span className="text-red-400 font-mono">₹{team.spent.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">Remaining:</span>
                    <span className="text-green-400 font-mono">₹{team.remainingBudget.toLocaleString()}</span>
                  </div>
                  {!isFull && (
                    <>
                      <div className="flex justify-between text-white/40">
                        <span>Reserve ({playersNeeded - 1} × ₹1k):</span>
                        <span className="font-mono">-₹{reserveNeeded.toLocaleString()}</span>
                      </div>
                      <div className="border-t border-white/10 pt-1 mt-1">
                        <div className="flex justify-between">
                          <span className="text-yellow-300 font-semibold">Max Bid:</span>
                          <span className={`font-mono font-bold ${team.maxBid < 1000 ? 'text-red-400' : team.maxBid < 2000 ? 'text-orange-400' : 'text-yellow-300'}`}>
                            ₹{team.maxBid.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                  {isFull && (
                    <div className="text-center text-green-400 font-semibold mt-1">
                      ✓ Team Complete
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      )}

      {/* Super11 Club Constraint - Only in Detailed Mode */}
      {!simpleMode && (
        <div className="glass rounded-2xl p-6 border-2 border-yellow-500/30 bg-yellow-500/5">
          <h3 className="text-lg font-bold text-white mb-2">🏆 Super11 Club Requirement</h3>
          <p className="text-xs text-white/50 mb-4">
            Each team needs 3 players from Super11 (1 from C/VC + 2 from auction). Teams must prioritize Super11 players.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {teams.map(team => {
              const clubGapsForTeam = analysis.clubGaps[team.id] || [];
              const super11Gap = clubGapsForTeam.find(g => g.club === 'Super11');
              const isComplete = super11Gap ? super11Gap.needed <= 0 : true;
              const isCritical = super11Gap && super11Gap.urgency >= 80;
              const isUrgent = super11Gap && super11Gap.urgency >= 50;

              return (
                <div
                  key={team.id}
                  className={`glass rounded-xl p-3 border ${
                    isComplete ? 'border-green-500/30 bg-green-500/5' :
                    isCritical ? 'border-red-500/30 bg-red-500/5' :
                    isUrgent ? 'border-orange-500/30 bg-orange-500/5' :
                    'border-white/10'
                  }`}
                  style={{ borderLeftColor: team.color, borderLeftWidth: '4px' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-white text-sm">{team.name.split(' ')[1]}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      isComplete ? 'bg-green-500/20 text-green-300' :
                      isCritical ? 'bg-red-500/20 text-red-300' :
                      isUrgent ? 'bg-orange-500/20 text-orange-300' :
                      'bg-white/10 text-white/60'
                    }`}>
                      {super11Gap?.current || 0}/3 Super11
                    </span>
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-white/50">Have:</span>
                      <span className="text-white font-mono">{super11Gap?.current || 0} Super11</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/50">Need:</span>
                      <span className={`font-mono ${
                        (super11Gap?.needed || 0) > 0 ? 'text-yellow-400' : 'text-green-400'
                      }`}>
                        {super11Gap?.needed || 0} more
                      </span>
                    </div>
                    {!isComplete && (
                      <div className="flex justify-between">
                        <span className="text-white/50">Urgency:</span>
                        <span className={`font-mono font-bold ${
                          isCritical ? 'text-red-400' :
                          isUrgent ? 'text-orange-400' :
                          'text-yellow-400'
                        }`}>
                          {super11Gap?.urgency || 0}%
                        </span>
                      </div>
                    )}
                    {isComplete && (
                      <div className="text-center text-green-400 font-semibold mt-1">
                        ✓ Super11 Complete
                      </div>
                    )}
                    {isCritical && !isComplete && (
                      <div className="text-center text-red-300 font-semibold mt-1 text-xs">
                        ⚠️ Must get Super11!
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pool Status */}
          <div className="mt-4 p-3 bg-white/5 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/70">Super11 players remaining in pool:</span>
              <span className="text-yellow-400 font-bold">
                {remainingPlayers.filter(p => p.club === 'Super11').length}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Team Gaps Analysis - Only in Detailed Mode */}
      {!simpleMode && (
        <div className="glass rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">📊 Team Role Coverage</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {teams.map(team => {
            const gaps = analysis.teamGaps[team.id] || [];
            const criticalGaps = gaps.filter(g => g.urgency >= 70);

            return (
              <div
                key={team.id}
                className="glass rounded-xl p-4 border border-white/10"
                style={{ borderLeftColor: team.color, borderLeftWidth: '4px' }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: team.color }}
                    />
                    <span className="font-semibold text-white">{team.name.split(' ')[1]}</span>
                  </div>
                  {criticalGaps.length > 0 && (
                    <span className="text-xs bg-red-500/30 text-red-300 px-2 py-1 rounded">
                      {criticalGaps.length} Critical
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  {gaps.map(gap => {
                    const urgencyColor =
                      gap.urgency >= 70 ? 'text-red-400' :
                      gap.urgency >= 40 ? 'text-yellow-400' :
                      'text-green-400';

                    return (
                      <div key={gap.role} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span>
                            {gap.role === 'Batsman' ? '🏏' :
                             gap.role === 'Bowler' ? '🎯' :
                             gap.role === 'All-rounder' ? '⚡' :
                             gap.role === 'WK-Batsman' ? '🧤' : ''}
                          </span>
                          <span className="text-white/70">{gap.role}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-white/50">
                            {gap.current}/{gap.ideal}
                          </span>
                          <span className={`text-xs font-semibold ${urgencyColor}`}>
                            {gap.urgency}%
                          </span>
                          <span className="text-xs text-white/40">
                            ({gap.remainingInPool} left)
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      )}
      
      {/* Preferences Editor - Only in Detailed Mode */}
      {!simpleMode && (
        <div className="glass rounded-2xl p-6 border-2 border-purple-500/30">
        <h3 className="text-lg font-bold text-white mb-4">⚙️ Team Preferences (Your Knowledge)</h3>
        <p className="text-sm text-white/60 mb-4">
          Add captain preferences, player chemistry, and behavior notes. This is YOUR knowledge, not system knowledge.
        </p>
        
        <div className="space-y-3">
          {teams.map(team => {
            const pref = preferences[team.id];
            const isEditing = editingPreference === team.id;
            
            return (
              <div
                key={team.id}
                className="glass rounded-xl p-4 border border-white/10"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: team.color }}
                    />
                    <span className="font-semibold text-white">{team.name}</span>
                  </div>
                  <button
                    onClick={() => {
                      if (isEditing) {
                        setEditingPreference(null);
                        setPreferenceInput('');
                      } else {
                        setEditingPreference(team.id);
                        setPreferenceInput(pref?.captainStyle || '');
                      }
                    }}
                    className="text-xs bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    {isEditing ? 'Cancel' : pref ? 'Edit' : 'Add'}
                  </button>
                </div>
                
                {pref?.captainStyle && !isEditing && (
                  <p className="text-sm text-white/70 mt-2">
                    💡 {pref.captainStyle}
                  </p>
                )}
                
                {isEditing && (
                  <div className="mt-3 space-y-2">
                    <textarea
                      value={preferenceInput}
                      onChange={(e) => setPreferenceInput(e.target.value)}
                      placeholder="e.g., 'Prefers allrounders', 'Loves explosive bats', 'Values keepers highly', 'Likely targets: Player X and Y'"
                      className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                      rows={3}
                    />
                    <button
                      onClick={() => {
                        if (preferenceInput.trim()) {
                          savePreferences(team.id, {
                            ...pref,
                            teamId: team.id,
                            captainStyle: preferenceInput.trim(),
                          });
                          setEditingPreference(null);
                          setPreferenceInput('');
                        }
                      }}
                      className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Save Preference
                    </button>
                  </div>
                )}
                
                {/* Avoid List */}
                {team.id === yourTeamId && (
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-white/50">Avoid List</span>
                      <button
                        onClick={() => {
                          if (editingAvoidList === team.id) {
                            setEditingAvoidList(null);
                            setAvoidListInput('');
                          } else {
                            setEditingAvoidList(team.id);
                            setAvoidListInput((pref?.avoidPlayers || []).join(', '));
                          }
                        }}
                        className="text-xs bg-red-500/20 hover:bg-red-500/30 text-red-300 px-2 py-1 rounded transition-colors"
                      >
                        {editingAvoidList === team.id ? 'Cancel' : pref?.avoidPlayers?.length ? 'Edit' : 'Add'}
                      </button>
                    </div>
                    
                    {pref?.avoidPlayers && pref.avoidPlayers.length > 0 && !editingAvoidList && (
                      <div className="flex flex-wrap gap-1">
                        {pref.avoidPlayers.map(playerId => {
                          const player = ALL_PLAYERS.find(p => p.id === playerId);
                          return player ? (
                            <span key={playerId} className="text-xs bg-red-500/20 text-red-300 px-2 py-0.5 rounded">
                              {player.name}
                            </span>
                          ) : null;
                        })}
                      </div>
                    )}
                    
                    {editingAvoidList === team.id && (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={avoidListInput}
                          onChange={(e) => setAvoidListInput(e.target.value)}
                          placeholder="Comma-separated player names: Ayush, Srini, Jayendra..."
                          className="w-full px-3 py-2 rounded-lg bg-white/10 border border-red-500/30 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                        />
                        <button
                          onClick={() => {
                            const playerNames = avoidListInput.split(',').map(s => s.trim()).filter(Boolean);
                            const playerIds = playerNames.map(name => {
                              const player = ALL_PLAYERS.find(p => 
                                p.name.toLowerCase() === name.toLowerCase()
                              );
                              return player?.id;
                            }).filter((id): id is string => !!id);
                            
                            savePreferences(team.id, {
                              ...pref,
                              teamId: team.id,
                              avoidPlayers: playerIds,
                            });
                            setEditingAvoidList(null);
                            setAvoidListInput('');
                          }}
                          className="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg transition-colors"
                        >
                          Save Avoid List
                        </button>
                        <p className="text-xs text-white/40">
                          Players on this list will show 0% interest when they come up
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      )}
      
      {/* Info Box - Only in Detailed Mode */}
      {!simpleMode && (
        <div className="glass rounded-xl p-4 bg-blue-500/10 border border-blue-500/30">
        <p className="text-xs text-blue-200">
          <strong>How it works:</strong> This panel analyzes public auction data only. It doesn't peek at upcoming players or use unfair system knowledge. 
          Add your own knowledge (preferences, chemistry) to improve predictions. Predictions are based on role gaps, budget constraints, scarcity, and learned behavior patterns.
          <br /><br />
          <strong>BidIntentScore:</strong> Not a calibrated probability, but a relative score (0-100%) indicating how likely a team is to bid, based on need, budget, scarcity, and preferences.
        </p>
      </div>
      )}
    </div>
  );
}
