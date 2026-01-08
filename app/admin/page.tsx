'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { TEAMS, PLAYERS, ALL_PLAYERS } from '@/lib/data';
import { Team, Player, AuctionStatus, PlayerProfile } from '@/lib/types';

function getRoleIcon(role?: string): string {
  switch (role) {
    case 'Batsman': return '🏏';
    case 'Bowler': return '🎯';
    case 'All-rounder': return '⚡';
    case 'WK-Batsman': return '🧤';
    default: return '';
  }
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

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

  // Player profiles state
  const [activeTab, setActiveTab] = useState<'auction' | 'profiles'>('auction');
  const [profiles, setProfiles] = useState<Record<string, PlayerProfile>>({});
  const [editingPlayer, setEditingPlayer] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [cricHeroesUrl, setCricHeroesUrl] = useState('');
  const [profileSearch, setProfileSearch] = useState('');
  const [pauseMessage, setPauseMessage] = useState('');
  const [pauseMinutes, setPauseMinutes] = useState<number | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const fetchProfiles = useCallback(async () => {
    try {
      const res = await fetch('/api/players', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setProfiles(data.profiles || {});
      }
    } catch (err) {
      console.error('Error fetching profiles:', err);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchState();
      fetchProfiles();
      // Keep admin polling at 2 seconds for responsiveness
      const interval = setInterval(fetchState, 2000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, fetchState, fetchProfiles]);

  // Clear pause form when unpaused
  useEffect(() => {
    if (state?.status !== 'PAUSED') {
      setPauseMessage('');
      setPauseMinutes(undefined);
    }
  }, [state?.status]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, action: 'VERIFY' }),
      });
      
      if (res.ok) {
        setIsAuthenticated(true);
        setPinError(false);
      } else {
        setPinError(true);
        setPin('');
      }
    } catch (err) {
      setPinError(true);
    } finally {
      setLoading(false);
    }
  };

  const performAction = async (action: string, data: Record<string, string | boolean | number | undefined> = {}) => {
    setLoading(true);
    setMessage(null);
    
    try {
      const res = await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, action, ...data }),
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

  // Handle image file upload - convert to base64
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1000000) { // 1MB limit
        setMessage({ type: 'error', text: 'Image too large. Max 1MB.' });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Save player profile
  const saveProfile = async (playerId: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pin,
          playerId,
          image: imageUrl || undefined,
          cricHeroesUrl: cricHeroesUrl || undefined,
        }),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Profile saved!' });
        setEditingPlayer(null);
        setImageUrl('');
        setCricHeroesUrl('');
        fetchProfiles();
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Failed to save' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error' });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  // Delete profile image
  const deleteProfileImage = async (playerId: string) => {
    if (!confirm('Remove this player\'s image?')) return;
    setLoading(true);
    try {
      const res = await fetch('/api/players', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, playerId, field: 'image' }),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Image removed!' });
        fetchProfiles();
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to remove' });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  // Start editing a player
  const startEditing = (player: Player) => {
    setEditingPlayer(player.id);
    setImageUrl(profiles[player.id]?.image || '');
    setCricHeroesUrl(profiles[player.id]?.cricHeroesUrl || '');
  };

  // Filter players for profile search
  const filteredProfilePlayers = ALL_PLAYERS.filter(p =>
    p.name.toLowerCase().includes(profileSearch.toLowerCase())
  );

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
            <div className="flex items-center gap-3">
              <Link
                href="/players"
                className="text-sm bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition-colors"
              >
                👥 View All
              </Link>
              <button
                onClick={() => setIsAuthenticated(false)}
                className="text-sm text-white/50 hover:text-white"
              >
                Logout
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => setActiveTab('auction')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'auction'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              🎯 Auction Control
            </button>
            <button
              onClick={() => setActiveTab('profiles')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'profiles'
                  ? 'bg-purple-500 text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              📸 Player Profiles
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

        {/* AUCTION TAB */}
        {activeTab === 'auction' && (
          <>
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
              ${state.status === 'PAUSED' ? 'bg-amber-500/30 text-amber-300' : ''}
            `}>
              {state.status}
            </div>
            {state.currentPlayer && (
              <span className="text-white font-semibold">
                {getRoleIcon(state.currentPlayer.role)} {state.currentPlayer.name}
                {state.currentPlayer.role && (
                  <span className="ml-2 text-xs bg-white/10 text-white/70 px-2 py-0.5 rounded">{state.currentPlayer.role}</span>
                )}
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

        {/* Pause/Resume Control */}
        <section className="glass rounded-2xl p-4 border border-amber-500/30">
          <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wider mb-3">
            ⏸️ Pause Control
          </h2>
          {state.status === 'PAUSED' ? (
            <div className="space-y-3">
              <div className="bg-amber-500/20 border border-amber-500/30 rounded-lg p-3 mb-3">
                <p className="text-sm text-amber-200 font-semibold mb-1">Auction is PAUSED</p>
                <p className="text-xs text-amber-300/80">Viewers see a pause message</p>
              </div>
              <button
                onClick={() => performAction('UNPAUSE')}
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                ▶️ Resume Auction
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Pause message (e.g., 'Back in 10 minutes')"
                value={pauseMessage}
                onChange={(e) => setPauseMessage(e.target.value)}
                className="w-full px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Minutes"
                  value={pauseMinutes}
                  onChange={(e) => setPauseMinutes(e.target.value ? parseInt(e.target.value) : undefined)}
                  min="1"
                  max="120"
                  className="w-24 px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                />
                <button
                  onClick={() => performAction('PAUSE', { pauseMessage, pauseMinutes })}
                  disabled={loading}
                  className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-600 text-white font-semibold py-2 rounded-xl transition-colors"
                >
                  ⏸️ Pause Auction
                </button>
              </div>
              <p className="text-xs text-white/40">
                Leave message blank for default. Set minutes for countdown.
              </p>
            </div>
          )}
        </section>

        {/* Soundboard */}
        <section className="glass rounded-2xl p-4">
           <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">
             🔊 Soundboard
           </h2>
           <div className="flex gap-3">
             <button 
               onClick={() => new Audio('https://assets.mixkit.co/sfx/preview/mixkit-judge-gavel-hit-530.mp3').play()}
               className="flex-1 bg-amber-600/20 hover:bg-amber-600/40 text-amber-500 border border-amber-600/30 py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
             >
               🔨 Sold Hammer
             </button>
             <button 
               onClick={() => new Audio('https://assets.mixkit.co/sfx/preview/mixkit-happy-bells-notification-937.mp3').play()}
               className="flex-1 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-600/30 py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
             >
               🔔 New Player
             </button>
           </div>
           <p className="text-xs text-center mt-2 text-white/30">
             (Uses external audio files - ensure internet access)
           </p>
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
                      {getRoleIcon(p.role)} {p.name} • {p.role || 'Player'} ({p.club}) {p.availability !== 'full' ? `⚠️ ${p.availability}` : ''}
                    </option>
                  ))}
                </optgroup>
              )}

              <optgroup label="Base Players" className="bg-slate-800">
                {basePlayers.map(p => (
                  <option key={p.id} value={p.id} className="bg-slate-800">
                    {getRoleIcon(p.role)} {p.name} • {p.role || 'Player'} ({p.club}) {p.availability !== 'full' ? `⚠️ ${p.availability}` : ''}
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
                </div>
                {team.roster.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {team.roster.map(p => (
                      <span key={p.id} className="text-xs bg-white/10 text-white/70 px-2 py-0.5 rounded">
                        {getRoleIcon(p.role)} {p.name}
                      </span>
                    ))}
                  </div>
                )}
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
              const confirmText = prompt("Type 'RESET' to confirm wiping all data:");
              if (confirmText === 'RESET') {
                performAction('RESET', { confirmReset: true });
              }
            }}
            disabled={loading}
            className="w-full bg-red-900/50 hover:bg-red-900 text-red-300 font-semibold py-3 rounded-xl transition-colors"
          >
            🔄 Reset Entire Auction
          </button>
        </section>
          </>
        )}

        {/* PROFILES TAB */}
        {activeTab === 'profiles' && (
          <>
            {/* Instructions */}
            <section className="glass rounded-2xl p-4">
              <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">
                📸 Manage Player Profiles
              </h2>
              <p className="text-sm text-white/60 mb-2">
                Add photos and CricHeroes links for each player. You can:
              </p>
              <ul className="text-sm text-white/50 space-y-1 ml-4 list-disc">
                <li>Upload a photo (max 1MB) or paste an image URL</li>
                <li>Add a CricHeroes profile link</li>
                <li>Paste a screenshot URL from CricHeroes</li>
              </ul>
            </section>

            {/* Search */}
            <input
              type="text"
              placeholder="Search players..."
              value={profileSearch}
              onChange={(e) => setProfileSearch(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />

            {/* Player List */}
            <div className="space-y-3">
              {filteredProfilePlayers.map(player => {
                const profile = profiles[player.id];
                const isEditing = editingPlayer === player.id;

                return (
                  <div key={player.id} className="glass rounded-xl p-4">
                    <div className="flex items-start gap-4">
                      {/* Avatar/Image */}
                      <div className="relative">
                        {profile?.image ? (
                          <img
                            src={profile.image}
                            alt={player.name}
                            className="w-16 h-16 rounded-full object-cover ring-2 ring-white/20"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-white/20 to-white/5 flex items-center justify-center text-xl font-bold ring-2 ring-white/20">
                            {getInitials(player.name)}
                          </div>
                        )}
                        {profile?.image && (
                          <button
                            onClick={() => deleteProfileImage(player.id)}
                            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center hover:bg-red-600"
                            title="Remove image"
                          >
                            ×
                          </button>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-white">{player.name}</h3>
                          <span className="text-xs bg-white/10 text-white/50 px-2 py-0.5 rounded">
                            {getRoleIcon(player.role)} {player.role}
                          </span>
                          {(player.category === 'CAPTAIN' || player.category === 'VICE_CAPTAIN') && (
                            <span className="text-xs bg-amber-500/30 text-amber-300 px-2 py-0.5 rounded">
                              {player.category === 'CAPTAIN' ? 'C' : 'VC'}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-white/40 mt-1">{player.club}</p>

                        {profile?.cricHeroesUrl && !isEditing && (
                          <a
                            href={profile.cricHeroesUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-400 hover:underline mt-1 inline-block"
                          >
                            🏏 CricHeroes Profile →
                          </a>
                        )}
                      </div>

                      {/* Edit Button */}
                      {!isEditing && (
                        <button
                          onClick={() => startEditing(player)}
                          className="text-sm bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          Edit
                        </button>
                      )}
                    </div>

                    {/* Edit Form */}
                    {isEditing && (
                      <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
                        {/* Image Upload */}
                        <div>
                          <label className="text-xs text-white/50 block mb-1">Photo</label>
                          <div className="flex gap-2">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                              ref={fileInputRef}
                              className="hidden"
                            />
                            <button
                              onClick={() => fileInputRef.current?.click()}
                              className="text-sm bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg transition-colors"
                            >
                              📁 Upload File
                            </button>
                            <input
                              type="text"
                              placeholder="Or paste image URL..."
                              value={imageUrl.startsWith('data:') ? '(File uploaded)' : imageUrl}
                              onChange={(e) => setImageUrl(e.target.value)}
                              className="flex-1 px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500"
                              disabled={imageUrl.startsWith('data:')}
                            />
                          </div>
                          {imageUrl && (
                            <div className="mt-2 flex items-center gap-2">
                              <img src={imageUrl} alt="Preview" className="w-12 h-12 rounded-lg object-cover" />
                              <button
                                onClick={() => setImageUrl('')}
                                className="text-xs text-red-400 hover:text-red-300"
                              >
                                Clear
                              </button>
                            </div>
                          )}
                        </div>

                        {/* CricHeroes URL */}
                        <div>
                          <label className="text-xs text-white/50 block mb-1">CricHeroes Profile URL</label>
                          <input
                            type="text"
                            placeholder="https://cricheroes.com/player/..."
                            value={cricHeroesUrl}
                            onChange={(e) => setCricHeroesUrl(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveProfile(player.id)}
                            disabled={loading}
                            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-semibold py-2 rounded-lg transition-colors"
                          >
                            {loading ? 'Saving...' : '✓ Save'}
                          </button>
                          <button
                            onClick={() => {
                              setEditingPlayer(null);
                              setImageUrl('');
                              setCricHeroesUrl('');
                            }}
                            className="px-4 bg-white/10 hover:bg-white/20 text-white py-2 rounded-lg transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {filteredProfilePlayers.length === 0 && (
              <div className="text-center py-8 text-white/50">
                No players found
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
