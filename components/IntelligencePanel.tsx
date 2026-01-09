'use client';

import { useEffect, useState, useMemo } from 'react';
import { Player, Team } from '@/lib/types';
import { analyzeIntelligence, calculateRoleGaps, TeamPreference, TeamBehavior } from '@/lib/intelligence';
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
  const [currentBidPrice, setCurrentBidPrice] = useState<number | undefined>(undefined);
  
  // Load preferences from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(PREFERENCE_STORAGE_KEY);
    let parsed: Record<string, TeamPreference> = {};
    
    if (saved) {
      try {
        parsed = JSON.parse(saved);
        setPreferences(parsed);
      } catch {}
    }
    
    // Auto-load avoid list for your team if not set
    const yourTeam = TEAMS.find(t => t.name.includes('Rajul') || t.name.includes('Kathir'));
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
  
  // Learn behaviors from history
  const behaviors = useMemo(() => {
    const learned: Record<string, TeamBehavior> = {};
    teams.forEach(team => {
      learned[team.id] = {
        teamId: team.id,
        avgBidPrice: 0,
        overpayFrequency: 0,
        earlyBidFrequency: 0,
        roleFocus: {},
        tiltFactor: 0,
      };
    });
    return learned;
  }, [teams, auctionHistory]);
  
  // Identify your team (Team Rajul & Kathir)
  const yourTeamId = useMemo(() => {
    return TEAMS.find(t => t.name.includes('Rajul') || t.name.includes('Kathir'))?.id || teams[0]?.id;
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
      currentBidPrice,
      yourTeamId
    );
  }, [teams, currentPlayer, soldPlayers, soldPrices, preferences, behaviors, currentBidPrice, yourTeamId]);
  
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === INTELLIGENCE_PASSWORD) {
      setIsAuthenticated(true);
      setPasswordError(false);
      setPassword('');
    } else {
      setPasswordError(true);
      setPassword('');
    }
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
          <button
            onClick={() => setIsAuthenticated(false)}
            className="text-sm text-white/50 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
      
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
          
          {/* Current Bid Price Input (for LIVE auctions) */}
          <div className="mb-4 p-3 bg-white/5 rounded-lg">
            <label className="text-xs text-white/50 block mb-1">Current Bid Price (optional)</label>
            <div className="flex items-center gap-2">
              <span className="text-white">₹</span>
              <input
                type="number"
                value={currentBidPrice || ''}
                onChange={(e) => setCurrentBidPrice(e.target.value ? Number(e.target.value) : undefined)}
                placeholder="Enter current bid"
                className="flex-1 px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              {currentBidPrice && (
                <button
                  onClick={() => setCurrentBidPrice(undefined)}
                  className="text-xs text-red-400 hover:text-red-300 px-2"
                >
                  Clear
                </button>
              )}
            </div>
            <p className="text-xs text-white/40 mt-1">
              Enter current bid to get more accurate predictions
            </p>
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
      
      {/* Team Gaps Analysis */}
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
      
      {/* Preferences Editor */}
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
      
      {/* Info Box */}
      <div className="glass rounded-xl p-4 bg-blue-500/10 border border-blue-500/30">
        <p className="text-xs text-blue-200">
          <strong>How it works:</strong> This panel analyzes public auction data only. It doesn't peek at upcoming players or use unfair system knowledge. 
          Add your own knowledge (preferences, chemistry) to improve predictions. Predictions are based on role gaps, budget constraints, scarcity, and learned behavior patterns.
          <br /><br />
          <strong>BidIntentScore:</strong> Not a calibrated probability, but a relative score (0-100%) indicating how likely a team is to bid, based on need, budget, scarcity, and preferences.
        </p>
      </div>
    </div>
  );
}
