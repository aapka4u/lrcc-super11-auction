'use client';

import { useEffect, useState, useCallback } from 'react';
import { TEAMS, PLAYERS, ADMIN_PIN } from '@/lib/data';
import { Team, Player, AuctionStatus } from '@/lib/types';

interface AdminState {
  status: AuctionStatus;
  currentPlayer: Player | null;
  soldToTeam: Team | null;
  teams: (Team & { roster: Player[] })[];
  soldCount: number;
  totalPlayers: number;
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  
  const [state, setState] = useState<AdminState | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch('/api/state', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setState(data);
      }
    } catch (err) {
      console.error('Error fetching state:', err);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchState();
      const interval = setInterval(fetchState, 2000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, fetchState]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === ADMIN_PIN) {
      setIsAuthenticated(true);
      setPinError(false);
    } else {
      setPinError(true);
      setPin('');
    }
  };

  const performAction = async (action: string, data: Record<string, string> = {}) => {
    setLoading(true);
    setMessage(null);
    
    try {
      const res = await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: ADMIN_PIN, action, ...data }),
      });
      
      const result = await res.json();
      
      if (res.ok) {
        setMessage({ type: 'success', text: `${action} successful!` });
        await fetchState();
        if (action === 'SOLD' || action === 'UNSOLD') {
          setSelectedPlayerId('');
        }
      } else {
        setMessage({ type: 'error', text: result.error || 'Action failed' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error' });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const soldPlayerIds = state?.teams.flatMap(t => t.roster.map(p => p.id)) || [];
  const availablePlayers = PLAYERS.filter(p => !soldPlayerIds.includes(p.id));
  const aplusPlayers = availablePlayers.filter(p => p.category === 'APLUS');
  const basePlayers = availablePlayers.filter(p => p.category === 'BASE');

  // PIN Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass rounded-2xl p-8 w-full max-w-sm">
          <h1 className="text-2xl font-bold text-white text-center mb-6">
            🔐 Admin Access
          </h1>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter PIN"
              className={`
                w-full px-4 py-3 rounded-xl bg-white/10 border text-white text-center text-2xl tracking-widest
                placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500
                ${pinError ? 'border-red-500 shake' : 'border-white/20'}
              `}
              autoFocus
            />
            {pinError && (
              <p className="text-red-400 text-sm text-center mt-2">Incorrect PIN</p>
            )}
            <button
              type="submit"
              className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              Enter
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-white">⚙️ Admin Console</h1>
              <p className="text-xs text-white/50">
                {state.soldCount} / {state.totalPlayers} sold • {availablePlayers.length} remaining
              </p>
            </div>
            <button
              onClick={() => setIsAuthenticated(false)}
              className="text-sm text-white/50 hover:text-white"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Message Toast */}
      {message && (
        <div className={`
          fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg font-medium
          ${message.type === 'success' ? 'bg-green-500' : 'bg-red-500'} text-white
        `}>
          {message.text}
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        
        {/* Current Status */}
        <section className="glass rounded-2xl p-4">
          <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">
            Current Status
          </h2>
          <div className="flex items-center gap-4">
            <div className={`
              px-3 py-1 rounded-full text-sm font-bold
              ${state.status === 'IDLE' ? 'bg-gray-500/30 text-gray-300' : ''}
              ${state.status === 'LIVE' ? 'bg-red-500/30 text-red-300' : ''}
              ${state.status === 'SOLD' ? 'bg-green-500/30 text-green-300' : ''}
            `}>
              {state.status}
            </div>
            {state.currentPlayer && (
              <span className="text-white font-semibold">
                {state.currentPlayer.name}
                {state.currentPlayer.category === 'APLUS' && (
                  <span className="ml-2 text-xs bg-amber-500/30 text-amber-300 px-2 py-0.5 rounded">A+</span>
                )}
              </span>
            )}
            {state.soldToTeam && state.status === 'SOLD' && (
              <span className="text-green-400">→ {state.soldToTeam.name}</span>
            )}
          </div>
        </section>

        {/* Action: Select Player */}
        {(state.status === 'IDLE' || state.status === 'SOLD') && (
          <section className="glass rounded-2xl p-4">
            <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">
              1️⃣ Select Next Player
            </h2>
            
            <select
              value={selectedPlayerId}
              onChange={(e) => setSelectedPlayerId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="" className="bg-slate-800">-- Select a player --</option>
              
              {aplusPlayers.length > 0 && (
                <optgroup label="⭐ A+ Players" className="bg-slate-800">
                  {aplusPlayers.map(p => (
                    <option key={p.id} value={p.id} className="bg-slate-800">
                      {p.name} ({p.club}) {p.availability !== 'full' ? `⚠️ ${p.availability}` : ''}
                    </option>
                  ))}
                </optgroup>
              )}
              
              <optgroup label="Base Players" className="bg-slate-800">
                {basePlayers.map(p => (
                  <option key={p.id} value={p.id} className="bg-slate-800">
                    {p.name} ({p.club}) {p.availability !== 'full' ? `⚠️ ${p.availability}` : ''}
                  </option>
                ))}
              </optgroup>
            </select>
            
            <button
              onClick={() => performAction('START_AUCTION', { playerId: selectedPlayerId })}
              disabled={!selectedPlayerId || loading}
              className="w-full mt-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
            >
              🔴 Start Auction for This Player
            </button>
          </section>
        )}

        {/* Action: Sold To Team */}
        {state.status === 'LIVE' && (
          <section className="glass rounded-2xl p-4">
            <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">
              2️⃣ Sold To Which Team?
            </h2>
            
            <div className="grid grid-cols-2 gap-3">
              {TEAMS.map(team => (
                <button
                  key={team.id}
                  onClick={() => performAction('SOLD', { teamId: team.id })}
                  disabled={loading}
                  className="p-4 rounded-xl border-2 border-white/20 hover:border-white/40 transition-all text-left"
                  style={{ backgroundColor: `${team.color}20` }}
                >
                  <div 
                    className="w-8 h-8 rounded-full mb-2 flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: team.color }}
                  >
                    {team.name.split(' ')[1]?.[0]}
                  </div>
                  <div className="text-sm font-semibold text-white truncate">{team.name}</div>
                </button>
              ))}
            </div>
            
            <button
              onClick={() => performAction('UNSOLD')}
              disabled={loading}
              className="w-full mt-4 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              ⏭️ Unsold / Skip
            </button>
          </section>
        )}

        {/* Clear after SOLD */}
        {state.status === 'SOLD' && (
          <section className="glass rounded-2xl p-4">
            <button
              onClick={() => performAction('CLEAR')}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              ✅ Continue to Next Player
            </button>
          </section>
        )}

        {/* Team Rosters */}
        <section className="glass rounded-2xl p-4">
          <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">
            Current Team Rosters
          </h2>
          <div className="space-y-3">
            {state.teams.map(team => (
              <div key={team.id} className="bg-white/5 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div 
                    className="w-6 h-6 rounded-full"
                    style={{ backgroundColor: team.color }}
                  />
                  <span className="font-semibold text-white">{team.name}</span>
                  <span className="text-xs text-white/40">
                    ({2 + team.roster.length} players)
                  </span>
                </div>
                <div className="text-sm text-white/60">
                  <span className="text-amber-400">C:</span> {team.captain} • 
                  <span className="text-amber-400/70 ml-1">VC:</span> {team.viceCaptain}
                  {team.roster.length > 0 && (
                    <span className="ml-2">
                      • {team.roster.map(p => p.name).join(', ')}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Danger Zone */}
        <section className="glass rounded-2xl p-4 border border-red-500/30">
          <h2 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-3">
            ⚠️ Danger Zone
          </h2>
          <button
            onClick={() => {
              if (confirm('Are you sure you want to RESET the entire auction? This cannot be undone!')) {
                performAction('RESET');
              }
            }}
            disabled={loading}
            className="w-full bg-red-900/50 hover:bg-red-900 text-red-300 font-semibold py-3 rounded-xl transition-colors"
          >
            🔄 Reset Entire Auction
          </button>
        </section>
      </div>
    </main>
  );
}
