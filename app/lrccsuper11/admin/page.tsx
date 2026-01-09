'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { TEAMS, PLAYERS, ALL_PLAYERS } from '@/lib/data';
import { Team, Player, AuctionStatus, PlayerProfile, TEAM_SIZE } from '@/lib/types';

// Confirmation Modal Component
function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'danger',
  onConfirm,
  onCancel,
  requiresInput,
  inputPlaceholder,
  inputMatch,
}: {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
  requiresInput?: boolean;
  inputPlaceholder?: string;
  inputMatch?: string;
}) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && requiresInput) {
      inputRef.current?.focus();
    }
    if (!isOpen) {
      setInputValue('');
    }
  }, [isOpen, requiresInput]);

  if (!isOpen) return null;

  const canConfirm = !requiresInput || inputValue === inputMatch;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="glass bg-slate-900/95 border border-white/20 rounded-2xl max-w-md w-full p-6 animate-scale-in">
        <h2 id="modal-title" className="text-xl font-bold text-white mb-3">{title}</h2>
        <p className="text-white/70 mb-4">{message}</p>

        {requiresInput && (
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={inputPlaceholder}
            className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-red-500 mb-4"
            aria-label={inputPlaceholder}
          />
        )}

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={!canConfirm}
            className={`flex-1 font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              confirmVariant === 'danger'
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

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

interface TeamWithBudget extends Team {
  roster: Player[];
  spent: number;
  remainingBudget: number;
  playersNeeded: number;
  maxBid: number;
}

// Unsold Player Card Component with team selection
function UnsoldPlayerCard({
  player,
  teams,
  usedJokers,
  loading,
  canAuction,
  onJokerRequest,
}: {
  player: Player;
  teams: TeamWithBudget[];
  usedJokers: Record<string, string>;
  loading: boolean;
  canAuction: boolean;
  onJokerRequest: (playerId: string, teamId: string) => void;
}) {
  const [selectedTeam, setSelectedTeam] = useState('');
  const availableTeams = teams.filter(t => !usedJokers[t.id]);

  return (
    <div className="bg-white/5 rounded-lg p-3 border border-amber-500/20 flex flex-col justify-between gap-2">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-lg">{getRoleIcon(player.role)}</span>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-white truncate">{player.name}</div>
            <div className="text-xs text-white/50">{player.role || 'Player'}</div>
          </div>
          {player.category === 'APLUS' && (
            <span className="text-xs bg-amber-500/30 text-amber-300 px-2 py-0.5 rounded">⭐</span>
          )}
        </div>
        <div className="text-xs text-white/40 mt-1">{player.club}</div>
      </div>

      {/* Joker with team selection */}
      {canAuction && (
        <div className="space-y-1 mt-1">
          <select
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
            className="w-full text-xs px-2 py-1.5 rounded-lg bg-white/10 border border-purple-500/30 text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
          >
            <option value="" className="bg-slate-800">-- Team --</option>
            {availableTeams.map(t => (
              <option key={t.id} value={t.id} className="bg-slate-800">
                {t.name.split(' ')[1]}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              if (selectedTeam) {
                onJokerRequest(player.id, selectedTeam);
              }
            }}
            disabled={loading || !selectedTeam}
            className="w-full text-xs bg-purple-600/20 hover:bg-purple-600/40 disabled:bg-gray-600/20 disabled:cursor-not-allowed text-purple-300 border border-purple-600/30 py-2 rounded-lg font-semibold transition-colors"
          >
            🎴 Play Joker
          </button>
        </div>
      )}
    </div>
  );
}

interface AdminState {
  status: AuctionStatus;
  currentPlayer: Player | null;
  currentPlayerBasePrice: number;
  soldToTeam: Team | null;
  teams: TeamWithBudget[];
  soldCount: number;
  totalPlayers: number;
  soldPrices: Record<string, number>;
  soldPlayers: string[];
  rosters: Record<string, string[]>;
  lastUpdate: number;
  unsoldPlayers?: string[];
  jokerPlayerId?: string | null;
  jokerRequestingTeamId?: string | null;
  usedJokers?: Record<string, string>; // teamId -> playerId
}

const AUTH_STORAGE_KEY = 'admin:authenticated';
const PIN_STORAGE_KEY = 'admin:pin';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);

  // Load auth state from localStorage on mount
  useEffect(() => {
    try {
      const savedAuth = localStorage.getItem(AUTH_STORAGE_KEY);
      const savedPin = localStorage.getItem(PIN_STORAGE_KEY);
      if (savedAuth === 'true' && savedPin) {
        setIsAuthenticated(true);
        setPin(savedPin);
      }
    } catch {
      // localStorage not available (e.g., private browsing)
    }
  }, []);

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
  const [soldPrice, setSoldPrice] = useState<number>(0);
  const [soldPriceInput, setSoldPriceInput] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [teamsExpanded, setTeamsExpanded] = useState(false);
  const [showJokerSelector, setShowJokerSelector] = useState(false);
  const [selectedJokerTeamId, setSelectedJokerTeamId] = useState('');

  // Modal states
  const [showResetModal, setShowResetModal] = useState(false);
  const [showUnsoldModal, setShowUnsoldModal] = useState(false);
  const [showDeleteImageModal, setShowDeleteImageModal] = useState<string | null>(null);

  // Audio refs (prevent memory leaks)
  const hammerAudioRef = useRef<HTMLAudioElement | null>(null);
  const bellAudioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio on mount
  useEffect(() => {
    hammerAudioRef.current = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-judge-gavel-hit-530.mp3');
    bellAudioRef.current = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-happy-bells-notification-937.mp3');
    return () => {
      hammerAudioRef.current = null;
      bellAudioRef.current = null;
    };
  }, []);

  const playHammer = useCallback(() => {
    if (hammerAudioRef.current) {
      hammerAudioRef.current.currentTime = 0;
      hammerAudioRef.current.play().catch(() => {});
    }
  }, []);

  const playBell = useCallback(() => {
    if (bellAudioRef.current) {
      bellAudioRef.current.currentTime = 0;
      bellAudioRef.current.play().catch(() => {});
    }
  }, []);

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

  // Set sold price to base price when player goes LIVE
  useEffect(() => {
    if (state?.status === 'LIVE' && state.currentPlayerBasePrice) {
      setSoldPrice(state.currentPlayerBasePrice);
      setSoldPriceInput(state.currentPlayerBasePrice.toString());
    } else if (state?.status !== 'LIVE') {
      setSoldPriceInput('');
    }
  }, [state?.status, state?.currentPlayerBasePrice]);

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
        // Save to localStorage
        try {
          localStorage.setItem(AUTH_STORAGE_KEY, 'true');
          localStorage.setItem(PIN_STORAGE_KEY, pin);
        } catch {
          // localStorage not available
        }
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

  const handleLogout = () => {
    setIsAuthenticated(false);
    setPin('');
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem(PIN_STORAGE_KEY);
    } catch {
      // localStorage not available
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
        if (action === 'SOLD' || action === 'UNSOLD' || action === 'CLEAR') {
          setSelectedPlayerId('');
          setShowJokerSelector(false);
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
  const unsoldPlayerIds = state?.unsoldPlayers || [];
  const unsoldPlayers = unsoldPlayerIds
    .map(id => PLAYERS.find(p => p.id === id))
    .filter((p): p is Player => p !== undefined);

  // Random player selection
  const handleRandomPlayer = async () => {
    // Don't set loading here - performAction handles it
    try {
      const res = await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, action: 'RANDOM' }),
      });
      const result = await res.json();
      if (res.ok && result.randomPlayer) {
        setSelectedPlayerId(result.randomPlayer.id);
        await performAction('START_AUCTION', { playerId: result.randomPlayer.id });
      } else {
        setMessage({ type: 'error', text: result.error || 'No players available' });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to get random player' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  // Joker card handler (for current LIVE player) - requires team selection
  const handleJokerCard = async (teamId: string) => {
    if (!teamId) {
      setMessage({ type: 'error', text: 'Please select a team for the joker' });
      return;
    }
    const team = state?.teams.find(t => t.id === teamId);
    await performAction('JOKER', { teamId });
    setMessage({ type: 'success', text: `Joker activated for ${team?.name || 'team'}! They can claim at base price.` });
  };

  // Joker card request handler (select player AND team first, then start auction with joker)
  const handleJokerRequest = async (playerId: string, teamId: string) => {
    if (!teamId) {
      setMessage({ type: 'error', text: 'Please select a team for the joker' });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      // Start auction with the selected player
      const startRes = await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, action: 'START_AUCTION', playerId }),
      });

      if (!startRes.ok) {
        const error = await startRes.json();
        setMessage({ type: 'error', text: error.error || 'Failed to start auction' });
        setLoading(false);
        setTimeout(() => setMessage(null), 3000);
        return;
      }

      // Set joker for this player with team ID
      const jokerRes = await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, action: 'JOKER', teamId }),
      });

      const team = state?.teams.find(t => t.id === teamId);
      if (jokerRes.ok) {
        setMessage({ type: 'success', text: `Joker activated for ${team?.name || 'team'}! Normal bidding begins.` });
        setShowJokerSelector(false);
        setSelectedPlayerId('');
        setSelectedJokerTeamId('');
        await fetchState();
      } else {
        const error = await jokerRes.json();
        setMessage({ type: 'error', text: error.error || 'Failed to activate joker. Auction started but joker not active.' });
        await fetchState();
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error' });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

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

  // Delete profile image (called after modal confirmation)
  const deleteProfileImage = async (playerId: string) => {
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
    } catch {
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
        <div className="glass rounded-2xl p-8 w-full max-w-sm" role="main">
          <h1 className="text-2xl font-bold text-white text-center mb-6">
            🔐 Admin Access
          </h1>
          <form onSubmit={handleLogin} aria-label="Admin login form">
            <label htmlFor="pin-input" className="sr-only">Enter PIN</label>
            <input
              id="pin-input"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter PIN"
              aria-invalid={pinError}
              aria-describedby={pinError ? 'pin-error' : undefined}
              className={`
                w-full px-4 py-3 rounded-xl bg-white/10 border text-white text-center text-2xl tracking-widest
                placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500
                ${pinError ? 'border-red-500 shake' : 'border-white/20'}
              `}
              autoFocus
            />
            {pinError && (
              <p id="pin-error" className="text-red-400 text-sm text-center mt-2" role="alert">
                Incorrect PIN
              </p>
            )}
            <button
              type="submit"
              disabled={loading || !pin}
              className="w-full mt-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
              aria-label="Submit PIN"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Verifying...
                </span>
              ) : (
                'Enter'
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="min-h-screen flex items-center justify-center" role="status" aria-label="Loading">
        <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
        <span className="sr-only">Loading auction data...</span>
      </div>
    );
  }

  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-white/10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden text-white/70 hover:text-white"
              >
                {sidebarOpen ? '✕' : '☰'}
              </button>
              <div>
                <h1 className="text-lg font-bold text-white">⚙️ DraftCast Admin</h1>
                <p className="text-xs text-white/50">
                  {state.soldCount} / {state.totalPlayers} sold • {availablePlayers.length} remaining
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Current Status Badge */}
              <div className={`
                px-3 py-1 rounded-full text-xs font-bold
                ${state.status === 'IDLE' ? 'bg-gray-500/30 text-gray-300' : ''}
                ${state.status === 'LIVE' ? 'bg-red-500/30 text-red-300' : ''}
                ${state.status === 'SOLD' ? 'bg-green-500/30 text-green-300' : ''}
                ${state.status === 'PAUSED' ? 'bg-amber-500/30 text-amber-300' : ''}
              `}>
                {state.status}
              </div>
              <Link
                href="/lrccsuper11/players"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition-colors"
              >
                👥 View All
              </Link>
              <button
                onClick={handleLogout}
                className="text-sm text-white/50 hover:text-white"
              >
                Logout
              </button>
            </div>
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

      {/* Main Layout: Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* SIDEBAR */}
        <aside className={`
          ${sidebarOpen ? 'w-64' : 'w-0'} 
          lg:w-64 
          transition-all duration-300 
          glass border-r border-white/10 
          overflow-y-auto
          ${sidebarOpen ? 'block' : 'hidden lg:block'}
        `}>
          <div className="p-4 space-y-4">
            {/* Pause Control */}
            <div className="glass rounded-xl p-3">
              <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
                ⏸️ Pause
              </h3>
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
                Leave blank for default
              </p>
            </div>
          )}
            </div>

            {/* Joker Card Request */}
            {(state.status === 'IDLE' || state.status === 'SOLD') && (
              <div className="glass rounded-xl p-3 border-2 border-purple-500/30">
                <h3 className="text-xs font-semibold text-purple-300 uppercase tracking-wider mb-2">
                  🎴 Joker Card Request
                </h3>
                <p className="text-xs text-white/50 mb-3">
                  Team calls for a specific player (normal bidding, team can claim at base price)
                </p>
                {/* Show teams that have used their joker */}
                {state.usedJokers && Object.keys(state.usedJokers).length > 0 && (
                  <div className="text-xs text-white/40 mb-2 p-2 bg-white/5 rounded-lg">
                    <span className="font-semibold">Used jokers:</span>{' '}
                    {Object.entries(state.usedJokers).map(([teamId, playerId]) => {
                      const team = state.teams.find(t => t.id === teamId);
                      const player = ALL_PLAYERS.find(p => p.id === playerId);
                      return team ? `${team.name.split(' ')[1]} (${player?.name || 'player'})` : '';
                    }).filter(Boolean).join(', ')}
                  </div>
                )}
                {!showJokerSelector ? (
                  <button
                    onClick={() => setShowJokerSelector(true)}
                    disabled={loading}
                    className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white font-bold py-3 rounded-xl transition-colors"
                  >
                    🎴 Request Joker Card
                  </button>
                ) : (
                  <div className="space-y-2">
                    {/* Team selector */}
                    <select
                      value={selectedJokerTeamId}
                      onChange={(e) => setSelectedJokerTeamId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-white/10 border border-purple-500/30 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="" className="bg-slate-800">-- Select team using joker --</option>
                      {state.teams
                        .filter(t => !state.usedJokers?.[t.id]) // Filter out teams that used joker
                        .map(t => (
                          <option key={t.id} value={t.id} className="bg-slate-800">
                            {t.name}
                          </option>
                        ))}
                    </select>
                    {/* Player selector */}
                    <select
                      value={selectedPlayerId}
                      onChange={(e) => setSelectedPlayerId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="" className="bg-slate-800">-- Select player --</option>
                      {aplusPlayers.length > 0 && (
                        <optgroup label={`⭐ Star Players (${aplusPlayers.length})`} className="bg-slate-800">
                          {aplusPlayers.map(p => (
                            <option key={p.id} value={p.id} className="bg-slate-800">
                              {getRoleIcon(p.role)} {p.name}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {basePlayers.length > 0 && (
                        <optgroup label={`League Players (${basePlayers.length})`} className="bg-slate-800">
                          {basePlayers.map(p => (
                            <option key={p.id} value={p.id} className="bg-slate-800">
                              {getRoleIcon(p.role)} {p.name}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {unsoldPlayers.length > 0 && (
                        <optgroup label={`⚠️ Unsold (${unsoldPlayers.length})`} className="bg-slate-800">
                          {unsoldPlayers.map(p => (
                            <option key={p.id} value={p.id} className="bg-slate-800">
                              {getRoleIcon(p.role)} {p.name}
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          if (selectedPlayerId && selectedJokerTeamId) {
                            handleJokerRequest(selectedPlayerId, selectedJokerTeamId);
                          }
                        }}
                        disabled={!selectedPlayerId || !selectedJokerTeamId || loading}
                        className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white font-semibold py-2 rounded-lg transition-colors"
                      >
                        Start with Joker
                      </button>
                      <button
                        onClick={() => {
                          setShowJokerSelector(false);
                          setSelectedPlayerId('');
                          setSelectedJokerTeamId('');
                        }}
                        className="px-3 bg-white/10 hover:bg-white/20 text-white py-2 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Soundboard */}
            <div className="glass rounded-xl p-3">
              <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
                🔊 Soundboard
              </h3>
              <div className="space-y-2">
                <button
                  onClick={playHammer}
                  className="w-full bg-amber-600/20 hover:bg-amber-600/40 text-amber-500 border border-amber-600/30 py-2 rounded-lg text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500"
                  aria-label="Play hammer sound"
                >
                  🔨 Hammer
                </button>
                <button
                  onClick={playBell}
                  className="w-full bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-600/30 py-2 rounded-lg text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Play bell sound"
                >
                  🔔 Bell
                </button>
              </div>
            </div>

            {/* Team Rosters - Collapsible */}
            <div className="glass rounded-xl p-3">
              <button
                onClick={() => setTeamsExpanded(!teamsExpanded)}
                className="w-full flex items-center justify-between text-xs font-semibold text-white/50 uppercase tracking-wider mb-2"
              >
                👥 Teams ({state.teams.length})
                <span>{teamsExpanded ? '▼' : '▶'}</span>
              </button>
              {teamsExpanded && (
                <div className="space-y-2 mt-2">
                  {state.teams.map(team => (
                    <div key={team.id} className="bg-white/5 rounded-lg p-2 text-xs">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: team.color }} />
                        <span className="font-semibold text-white truncate">{team.name}</span>
                      </div>
                      <div className="text-white/60">
                        {2 + team.roster.length}/{TEAM_SIZE} • ₹{team.remainingBudget.toLocaleString()} left
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Profiles Tab */}
            <button
              onClick={() => setActiveTab(activeTab === 'profiles' ? 'auction' : 'profiles')}
              className={`w-full glass rounded-xl p-3 text-left transition-colors ${
                activeTab === 'profiles' ? 'bg-purple-500/20 border border-purple-500/30' : ''
              }`}
            >
              <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-1">
                📸 Profiles
              </h3>
              <p className="text-xs text-white/40">
                {activeTab === 'profiles' ? '← Back to Auction' : 'Manage player images'}
              </p>
            </button>

            {/* Danger Zone */}
            <div className="glass rounded-xl p-3 border border-red-500/30">
              <h3 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">
                ⚠️ Danger Zone
              </h3>
              <button
                onClick={() => setShowResetModal(true)}
                disabled={loading}
                className="w-full bg-red-900/50 hover:bg-red-900 text-red-300 font-semibold py-2 rounded-lg transition-colors text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                aria-label="Reset entire auction"
              >
                🔄 Reset Auction
              </button>
            </div>
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 py-6">
            {/* AUCTION TAB */}
            {activeTab === 'auction' && (
              <>
                {/* MAIN AUCTION CONTROL CARD */}
                <div className="glass rounded-2xl p-6 mb-6 border-2 border-blue-500/30">
                  <h2 className="text-xl font-bold text-white mb-6 text-center">
                    🎯 Auction Control
                  </h2>

                  {/* STEP 1: Select Player (IDLE/SOLD) - Random Only */}
                  {(state.status === 'IDLE' || state.status === 'SOLD') && (
                    <div className="space-y-4">
                      <div className="text-center mb-4">
                        <span className="text-sm text-white/50">Step 1 of 3</span>
                        <h3 className="text-lg font-semibold text-white mt-1">Pick Next Player</h3>
                        <p className="text-xs text-white/40 mt-1">Random selection only • Use Joker Card in sidebar for specific player requests</p>
                      </div>

                      <button
                        onClick={handleRandomPlayer}
                        disabled={loading || (availablePlayers.length === 0 && unsoldPlayers.length === 0)}
                        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-colors text-lg relative"
                      >
                        {loading ? (
                          <span className="flex items-center justify-center gap-2">
                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Selecting...
                          </span>
                        ) : (
                          <>
                            🎲 Pick Random Player
                            {(availablePlayers.length === 0 && unsoldPlayers.length === 0) && (
                              <span className="block text-xs mt-1 opacity-75">No players available</span>
                            )}
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* STEP 2: Price & Team (LIVE) */}
                  {state.status === 'LIVE' && (
                    <div className="space-y-4">
                      <div className="text-center mb-4">
                        <span className="text-sm text-white/50">Step 2 of 3</span>
                        <h3 className="text-lg font-semibold text-white mt-1">
                          🔴 LIVE: {state.currentPlayer?.name}
                        </h3>
                        {state.currentPlayer && (
                          <div className="flex items-center justify-center gap-2 mt-2">
                            {getRoleIcon(state.currentPlayer.role)}
                            <span className="text-sm text-white/70">{state.currentPlayer.role}</span>
                            {state.currentPlayer.category === 'APLUS' && (
                              <span className="text-xs bg-amber-500/30 text-amber-300 px-2 py-0.5 rounded">⭐ Star</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Price Input */}
                      <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                        <label className="text-sm text-amber-300 font-semibold mb-2 block">
                          Sold Price (Base: ₹{state.currentPlayerBasePrice})
                        </label>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl text-white">₹</span>
                          <input
                            type="number"
                            value={soldPriceInput}
                            onChange={(e) => {
                              const val = e.target.value;
                              // Only allow digits (prevent NaN and negative)
                              if (val === '' || /^\d+$/.test(val)) {
                                setSoldPriceInput(val);
                                const numVal = val === '' ? 0 : Number(val);
                                setSoldPrice(numVal);
                              }
                            }}
                            onBlur={() => {
                              // Round to nearest 100 and ensure minimum base price
                              let roundedPrice = Math.round(soldPrice / 100) * 100;
                              if (roundedPrice < state.currentPlayerBasePrice || isNaN(roundedPrice)) {
                                roundedPrice = state.currentPlayerBasePrice;
                              }
                              setSoldPrice(roundedPrice);
                              setSoldPriceInput(roundedPrice.toString());
                            }}
                            min={state.currentPlayerBasePrice}
                            step={100}
                            placeholder={state.currentPlayerBasePrice.toString()}
                            className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                        {(isNaN(soldPrice) || soldPrice < state.currentPlayerBasePrice) && (
                          <p className="text-red-400 text-sm mt-2">Price must be at least ₹{state.currentPlayerBasePrice}</p>
                        )}
                        {soldPrice % 100 !== 0 && soldPrice >= state.currentPlayerBasePrice && (
                          <p className="text-amber-400 text-sm mt-2">Will round to ₹{Math.round(soldPrice / 100) * 100}</p>
                        )}
                      </div>

                      {/* Joker Card Button - only show if no joker active */}
                      {state.currentPlayer && state.jokerPlayerId !== state.currentPlayer.id && (
                        <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl space-y-2">
                          <p className="text-xs text-purple-300 font-semibold">🎴 Activate Joker for this player</p>
                          <div className="flex gap-2">
                            <select
                              value={selectedJokerTeamId}
                              onChange={(e) => setSelectedJokerTeamId(e.target.value)}
                              className="flex-1 px-3 py-2 rounded-lg bg-white/10 border border-purple-500/30 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                            >
                              <option value="" className="bg-slate-800">-- Team --</option>
                              {state.teams
                                .filter(t => !state.usedJokers?.[t.id])
                                .map(t => (
                                  <option key={t.id} value={t.id} className="bg-slate-800">
                                    {t.name.split(' ')[1]}
                                  </option>
                                ))}
                            </select>
                            <button
                              onClick={() => handleJokerCard(selectedJokerTeamId)}
                              disabled={loading || !selectedJokerTeamId}
                              className="px-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white font-semibold py-2 rounded-lg transition-colors"
                            >
                              🎴 Activate
                            </button>
                          </div>
                          <p className="text-xs text-purple-300/60">Team can claim at base price if no one outbids</p>
                        </div>
                      )}

                      {/* Joker Active Indicator */}
                      {state.currentPlayer && state.jokerPlayerId === state.currentPlayer.id && (
                        <div className="p-3 bg-purple-500/20 border border-purple-500/30 rounded-xl text-center">
                          <p className="text-purple-300 font-semibold">🎴 Joker Card Active!</p>
                          {state.jokerRequestingTeamId && (
                            <p className="text-sm text-purple-200 mt-1">
                              {state.teams.find(t => t.id === state.jokerRequestingTeamId)?.name} can claim at base price
                            </p>
                          )}
                          <p className="text-xs text-purple-300/80 mt-1">Base price: ₹{state.currentPlayerBasePrice} • Normal bidding continues</p>
                        </div>
                      )}

                      {/* Team Selection */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {state.teams.map(team => {
                          const canAfford = soldPrice <= team.maxBid;
                          const isFull = team.playersNeeded <= 0;
                          const isJokerActive = state.jokerPlayerId === state.currentPlayer?.id;
                          const isJokerTeam = isJokerActive && state.jokerRequestingTeamId === team.id;
                          // Joker team can claim at base price, others need to afford the current bid
                          const isDisabled = loading || isFull || isNaN(soldPrice) || soldPrice < state.currentPlayerBasePrice || (!isJokerTeam && !canAfford);

                          return (
                            <button
                              key={team.id}
                              onClick={() => performAction('SOLD', { teamId: team.id, soldPrice: isJokerTeam ? state.currentPlayerBasePrice : soldPrice })}
                              disabled={isDisabled}
                              className={`p-4 rounded-xl border-2 transition-all text-left ${
                                isDisabled
                                  ? 'border-white/10 opacity-50 cursor-not-allowed'
                                  : isJokerTeam
                                    ? 'border-purple-500/50 hover:border-purple-500 hover:scale-105'
                                    : 'border-white/20 hover:border-white/40 hover:scale-105'
                              }`}
                              style={{ backgroundColor: isDisabled ? 'transparent' : isJokerTeam ? `${team.color}30` : `${team.color}20` }}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div
                                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                                    style={{ backgroundColor: team.color }}
                                  >
                                    {team.name.split(' ')[1]?.[0]}
                                  </div>
                                  <div>
                                    <div className="text-sm font-semibold text-white flex items-center gap-2">
                                      {team.name}
                                      {isJokerTeam && <span className="text-purple-300">🎴</span>}
                                    </div>
                                    <div className="text-xs text-white/50">
                                      {TEAM_SIZE - team.playersNeeded}/{TEAM_SIZE} players
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-bold text-green-400">
                                    Max: ₹{team.maxBid.toLocaleString()}
                                  </div>
                                  <div className="text-xs text-white/50">
                                    ₹{team.remainingBudget.toLocaleString()} left
                                  </div>
                                </div>
                              </div>
                              {isFull && (
                                <div className="text-xs text-red-400 mt-2">Team is full</div>
                              )}
                              {!canAfford && !isFull && !isJokerTeam && (
                                <div className="text-xs text-red-400 mt-2">Cannot afford ₹{soldPrice}</div>
                              )}
                              {isJokerTeam && (
                                <div className="text-xs text-purple-400 mt-2">🎴 Joker: Claim at ₹{state.currentPlayerBasePrice}</div>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        onClick={() => setShowUnsoldModal(true)}
                        disabled={loading}
                        className="w-full mt-4 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
                        aria-label={`Mark ${state.currentPlayer?.name || 'player'} as unsold`}
                      >
                        ⏭️ Mark as Unsold
                      </button>
                    </div>
                  )}

                  {/* STEP 3: Continue (SOLD) */}
                  {state.status === 'SOLD' && (
                    <div className="space-y-4 text-center">
                      <div className="mb-4">
                        <span className="text-sm text-white/50">Step 3 of 3</span>
                        <h3 className="text-lg font-semibold text-white mt-1">✅ Player Sold!</h3>
                        {state.currentPlayer && state.soldToTeam && (
                          <div className="mt-3">
                            <p className="text-white text-lg">
                              {state.currentPlayer.name} → {state.soldToTeam.name}
                            </p>
                            <p className="text-green-400 font-bold text-xl mt-1">
                              ₹{state.soldPrices?.[state.currentPlayer.id]?.toLocaleString() || '0'}
                            </p>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => performAction('CLEAR')}
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-colors text-lg"
                      >
                        ✅ Continue to Next Player
                      </button>
                    </div>
                  )}
                </div>

                {/* Unsold Players List */}
                {unsoldPlayers.length > 0 && (
                  <div className="glass rounded-2xl p-6 mt-6 border border-amber-500/30">
                    <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      ⚠️ Unsold Players ({unsoldPlayers.length})
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {unsoldPlayers.map(player => (
                        <UnsoldPlayerCard
                          key={player.id}
                          player={player}
                          teams={state.teams}
                          usedJokers={state.usedJokers || {}}
                          loading={loading}
                          canAuction={state.status === 'IDLE' || state.status === 'SOLD'}
                          onJokerRequest={handleJokerRequest}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-white/40 mt-4">
                      💡 These players can be re-auctioned using the Joker Card or Random selection
                    </p>
                  </div>
                )}
              </>
            )}

            {/* PROFILES TAB */}
            {activeTab === 'profiles' && (
              <>
                {/* Back to Auction Button - Prominent */}
                <div className="mb-4">
                  <button
                    onClick={() => setActiveTab('auction')}
                    className="w-full glass rounded-xl p-4 border-2 border-blue-500/30 hover:border-blue-500/50 transition-colors"
                  >
                    <div className="flex items-center justify-center gap-3">
                      <span className="text-2xl">←</span>
                      <div className="text-left">
                        <div className="text-lg font-bold text-white">Back to Auction Control</div>
                        <div className="text-xs text-white/50">Return to main auction flow</div>
                      </div>
                    </div>
                  </button>
                </div>

                {/* Instructions */}
                <section className="glass rounded-2xl p-4 mb-6">
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
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500 mb-6"
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
                                onClick={() => setShowDeleteImageModal(player.id)}
                                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400"
                                title="Remove image"
                                aria-label={`Remove ${player.name}'s image`}
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
        </div>
      </div>

      {/* Confirmation Modals */}
      <ConfirmModal
        isOpen={showResetModal}
        title="Reset Auction?"
        message="This will clear all sold players, rosters, and prices. This action cannot be undone."
        confirmText="Reset"
        cancelText="Cancel"
        confirmVariant="danger"
        requiresInput
        inputPlaceholder="Type RESET to confirm"
        inputMatch="RESET"
        onConfirm={() => {
          setShowResetModal(false);
          performAction('RESET', { confirmReset: true });
        }}
        onCancel={() => setShowResetModal(false)}
      />

      <ConfirmModal
        isOpen={showUnsoldModal}
        title="Mark as Unsold?"
        message={`${state.currentPlayer?.name || 'This player'} will be added to the unsold list for re-auctioning later.`}
        confirmText="Mark Unsold"
        cancelText="Cancel"
        confirmVariant="primary"
        onConfirm={() => {
          setShowUnsoldModal(false);
          performAction('UNSOLD');
        }}
        onCancel={() => setShowUnsoldModal(false)}
      />

      <ConfirmModal
        isOpen={!!showDeleteImageModal}
        title="Remove Image?"
        message="This will permanently remove the player's profile image."
        confirmText="Remove"
        cancelText="Cancel"
        confirmVariant="danger"
        onConfirm={() => {
          if (showDeleteImageModal) {
            deleteProfileImage(showDeleteImageModal);
          }
          setShowDeleteImageModal(null);
        }}
        onCancel={() => setShowDeleteImageModal(null)}
      />
    </main>
  );
}
