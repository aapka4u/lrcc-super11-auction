'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

// ============================================
// Types
// ============================================

interface Player {
  id: string;
  name: string;
  role?: string;
  category: string;
  club?: string;
  image?: string;
  availability?: string;
}

interface Team {
  id: string;
  name: string;
  budget: number;
  color: string;
  captainId?: string;
  viceCaptainId?: string;
  logo?: string;
}

interface TeamWithBudget extends Team {
  roster: Player[];
  spent: number;
  remainingBudget: number;
  playersNeeded: number;
  maxBid: number;
}

type AuctionStatus = 'IDLE' | 'LIVE' | 'SOLD' | 'PAUSED';

interface AdminState {
  tournament: {
    id: string;
    name: string;
    status: string;
    settings: {
      teamSize: number;
      basePrices: { APLUS: number; BASE: number };
      bidIncrement: number;
      currency: string;
      enableJokerCard: boolean;
    };
  };
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
  usedJokers?: Record<string, string>;
  pauseMessage?: string;
  pauseUntil?: number;
}

// ============================================
// Confirmation Modal Component
// ============================================

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

// ============================================
// Helper Functions
// ============================================

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

// ============================================
// Auth Storage Keys (per-tournament)
// ============================================

function getAuthStorageKey(tournamentId: string): string {
  return `admin:auth:${tournamentId}:v1`;
}

function getPinStorageKey(tournamentId: string): string {
  return `admin:pin:${tournamentId}:v1`;
}

// ============================================
// Main Admin Page Component
// ============================================

export default function TournamentAdminPage() {
  const params = useParams();
  const slug = (params?.slug as string) || '';

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);

  const [state, setState] = useState<AdminState | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'retrying'>('connected');

  const [soldPrice, setSoldPrice] = useState<number>(0);
  const [soldPriceInput, setSoldPriceInput] = useState<string>('');
  const [pauseMessage, setPauseMessage] = useState('');
  const [pauseMinutes, setPauseMinutes] = useState<number | undefined>(undefined);

  const [showResetModal, setShowResetModal] = useState(false);
  const [showUnsoldModal, setShowUnsoldModal] = useState(false);

  const [selectedJokerTeamId, setSelectedJokerTeamId] = useState('');

  // Audio refs
  const hammerAudioRef = useRef<HTMLAudioElement | null>(null);
  const bellAudioRef = useRef<HTMLAudioElement | null>(null);

  // Abort controller for requests
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load auth state from localStorage
  useEffect(() => {
    if (!slug) return;
    try {
      const savedAuth = localStorage.getItem(getAuthStorageKey(slug));
      const savedPin = localStorage.getItem(getPinStorageKey(slug));
      if (savedAuth === 'true' && savedPin) {
        setIsAuthenticated(true);
        setPin(savedPin);
      }
    } catch {
      // localStorage not available
    }
  }, [slug]);

  // Initialize audio
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

  // Fetch state
  const fetchState = useCallback(async (retries = 3) => {
    if (!slug || !isAuthenticated) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch(`/api/${slug}/state`, {
        headers: {
          'Authorization': `Bearer ${pin}`,
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        if (response.status === 401) {
          setIsAuthenticated(false);
          localStorage.removeItem(getAuthStorageKey(slug));
          localStorage.removeItem(getPinStorageKey(slug));
          return;
        }
        throw new Error('Failed to fetch state');
      }

      const data = await response.json();
      setState(data);
      setConnectionStatus('connected');
    } catch (error) {
      if ((error as Error).name === 'AbortError') return;

      if (retries > 0) {
        setConnectionStatus('retrying');
        await new Promise(r => setTimeout(r, 2000));
        return fetchState(retries - 1);
      }
      setConnectionStatus('disconnected');
    }
  }, [slug, isAuthenticated, pin]);

  // Fetch players
  const fetchPlayers = useCallback(async () => {
    if (!slug || !isAuthenticated) return;

    try {
      const response = await fetch(`/api/${slug}/players`, {
        headers: {
          'Authorization': `Bearer ${pin}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPlayers(data.players || []);
      }
    } catch {
      // Ignore player fetch errors
    }
  }, [slug, isAuthenticated, pin]);

  // Poll for updates
  useEffect(() => {
    if (!isAuthenticated || !slug) return;

    fetchState();
    fetchPlayers();
    const interval = setInterval(fetchState, 2000);
    return () => clearInterval(interval);
  }, [isAuthenticated, slug, fetchState, fetchPlayers]);

  // Handle PIN verification
  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug || !pin.trim()) return;

    setPinLoading(true);
    setPinError(false);

    try {
      const response = await fetch(`/api/${slug}/state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'VERIFY', pin }),
      });

      if (response.ok) {
        setIsAuthenticated(true);
        localStorage.setItem(getAuthStorageKey(slug), 'true');
        localStorage.setItem(getPinStorageKey(slug), pin);
      } else {
        setPinError(true);
      }
    } catch {
      setPinError(true);
    } finally {
      setPinLoading(false);
    }
  };

  // Execute action
  const executeAction = async (action: string, params: Record<string, unknown> = {}) => {
    if (!slug) return;

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/${slug}/state`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${pin}`,
        },
        body: JSON.stringify({ action, pin, ...params }),
      });

      const data = await response.json();

      if (response.ok) {
        if (action === 'SOLD') playHammer();
        if (action === 'START_AUCTION') playBell();

        setMessage({ type: 'success', text: 'Action completed' });
        fetchState();
      } else {
        setMessage({ type: 'error', text: data.error || 'Action failed' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error' });
    } finally {
      setLoading(false);
    }
  };

  // Set sold price from input
  const handleSoldPriceChange = (value: string) => {
    setSoldPriceInput(value);
    const num = parseInt(value, 10);
    if (!isNaN(num)) {
      setSoldPrice(num);
    }
  };

  // Available players (not sold)
  const availablePlayers = useMemo(() => {
    if (!state) return players;
    return players.filter(p => !state.soldPlayers.includes(p.id));
  }, [players, state]);

  // If not authenticated, show login form
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-elevated rounded-2xl p-8 border border-white/20 max-w-md w-full">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-white mb-2">Admin Access</h1>
            <p className="text-white/60">Enter your tournament PIN to continue</p>
            {slug && <p className="text-white/40 text-sm mt-2">Tournament: {slug}</p>}
          </div>

          <form onSubmit={handleVerifyPin} className="space-y-4">
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter PIN"
              className={`w-full min-h-[48px] px-4 py-3 rounded-xl bg-white/10 border ${
                pinError ? 'border-red-500' : 'border-white/20'
              } text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500`}
              autoFocus
            />
            {pinError && (
              <p className="text-red-400 text-sm">Invalid PIN. Please try again.</p>
            )}
            <button
              type="submit"
              disabled={pinLoading || !pin.trim()}
              className="w-full min-h-[48px] bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-50"
            >
              {pinLoading ? 'Verifying...' : 'Enter Admin Panel'}
            </button>
          </form>

          <Link
            href={`/tournaments/${slug}`}
            className="block text-center text-white/60 hover:text-white mt-6 text-sm"
          >
            ← Back to Tournament
          </Link>
        </div>
      </div>
    );
  }

  // Loading state
  if (!state) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  const { tournament, status, currentPlayer, currentPlayerBasePrice, soldToTeam, teams } = state;

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <div className="glass-elevated border-b border-white/10 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Link
                href={`/tournaments/${slug}`}
                className="text-white/60 hover:text-white text-sm mb-1 inline-block"
              >
                ← Back to Tournament
              </Link>
              <h1 className="text-xl font-bold text-white">{tournament.name} - Admin</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                connectionStatus === 'connected' ? 'bg-green-500/20 text-green-400' :
                connectionStatus === 'retrying' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-red-500/20 text-red-400'
              }`}>
                {connectionStatus === 'connected' ? '🟢 Connected' :
                 connectionStatus === 'retrying' ? '🟡 Reconnecting' :
                 '🔴 Disconnected'}
              </span>
              <button
                onClick={() => {
                  setIsAuthenticated(false);
                  localStorage.removeItem(getAuthStorageKey(slug));
                  localStorage.removeItem(getPinStorageKey(slug));
                }}
                className="text-white/60 hover:text-white text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Message Toast */}
      {message && (
        <div className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-xl ${
          message.type === 'success' ? 'bg-green-500/90' : 'bg-red-500/90'
        } text-white font-semibold animate-slide-in`}>
          {message.text}
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Auction Control */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status Banner */}
            <div className={`glass-elevated rounded-2xl p-6 border ${
              status === 'LIVE' ? 'border-green-500/30' :
              status === 'SOLD' ? 'border-amber-500/30' :
              status === 'PAUSED' ? 'border-red-500/30' :
              'border-white/20'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">Auction Status</h2>
                <span className={`px-4 py-1.5 rounded-full text-sm font-bold ${
                  status === 'LIVE' ? 'bg-green-500/20 text-green-400' :
                  status === 'SOLD' ? 'bg-amber-500/20 text-amber-400' :
                  status === 'PAUSED' ? 'bg-red-500/20 text-red-400' :
                  'bg-white/10 text-white/60'
                }`}>
                  {status}
                </span>
              </div>

              {/* Current Player Display */}
              {currentPlayer && (
                <div className="bg-white/5 rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl bg-white/10 flex items-center justify-center overflow-hidden">
                      {currentPlayer.image ? (
                        <Image
                          src={currentPlayer.image}
                          alt={currentPlayer.name}
                          width={64}
                          height={64}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xl font-bold text-white/60">
                          {getInitials(currentPlayer.name)}
                        </span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getRoleIcon(currentPlayer.role)}</span>
                        <h3 className="text-xl font-bold text-white">{currentPlayer.name}</h3>
                      </div>
                      <p className="text-white/60">{currentPlayer.role || 'Player'}</p>
                      <p className="text-amber-400 font-semibold">Base: {tournament.settings.currency}{currentPlayerBasePrice}</p>
                    </div>
                    {currentPlayer.category === 'APLUS' && (
                      <span className="bg-amber-500/30 text-amber-300 px-3 py-1 rounded-full text-sm font-semibold">
                        ⭐ Star
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Sold To Team Display */}
              {soldToTeam && status === 'SOLD' && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-4">
                  <div className="text-center">
                    <span className="text-3xl">🔨</span>
                    <p className="text-amber-400 font-bold text-lg mt-2">
                      SOLD to {soldToTeam.name}
                    </p>
                    {currentPlayer && state.soldPrices[currentPlayer.id] && (
                      <p className="text-white text-xl font-bold mt-1">
                        {tournament.settings.currency}{state.soldPrices[currentPlayer.id]}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Pause Info */}
              {status === 'PAUSED' && state.pauseMessage && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4">
                  <p className="text-red-400 text-center">{state.pauseMessage}</p>
                </div>
              )}
            </div>

            {/* Player Selection */}
            {status === 'IDLE' && (
              <div className="glass-elevated rounded-2xl p-6 border border-white/20">
                <h3 className="text-lg font-bold text-white mb-4">Select Next Player</h3>
                <div className="flex gap-3">
                  <select
                    value={selectedPlayerId}
                    onChange={(e) => setSelectedPlayerId(e.target.value)}
                    className="flex-1 min-h-[48px] px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="" className="bg-slate-800">Select a player...</option>
                    {availablePlayers.map(p => (
                      <option key={p.id} value={p.id} className="bg-slate-800">
                        {getRoleIcon(p.role)} {p.name} - {p.role}
                        {p.category === 'APLUS' ? ' ⭐' : ''}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => executeAction('START_AUCTION', { playerId: selectedPlayerId })}
                    disabled={loading || !selectedPlayerId}
                    className="min-h-[48px] px-6 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-semibold rounded-xl transition-colors"
                  >
                    Start Auction
                  </button>
                </div>
                <button
                  onClick={async () => {
                    const res = await fetch(`/api/${slug}/state`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${pin}` },
                      body: JSON.stringify({ action: 'RANDOM', pin }),
                    });
                    if (res.ok) {
                      const data = await res.json();
                      if (data.randomPlayer) {
                        setSelectedPlayerId(data.randomPlayer.id);
                      }
                    }
                  }}
                  className="mt-3 w-full min-h-[44px] bg-white/10 hover:bg-white/20 text-white font-semibold py-3 rounded-xl transition-colors"
                >
                  🎲 Pick Random Player
                </button>
              </div>
            )}

            {/* Bidding Controls */}
            {status === 'LIVE' && currentPlayer && (
              <div className="glass-elevated rounded-2xl p-6 border border-white/20">
                <h3 className="text-lg font-bold text-white mb-4">Sell Player</h3>

                {/* Price Input */}
                <div className="mb-4">
                  <label className="block text-white/60 text-sm mb-2">Sold Price</label>
                  <input
                    type="number"
                    value={soldPriceInput}
                    onChange={(e) => handleSoldPriceChange(e.target.value)}
                    placeholder={`Min: ${currentPlayerBasePrice}`}
                    step={tournament.settings.bidIncrement}
                    min={currentPlayerBasePrice}
                    className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white text-xl font-bold placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Quick Price Buttons */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {[currentPlayerBasePrice, currentPlayerBasePrice + 500, currentPlayerBasePrice + 1000, currentPlayerBasePrice + 1500].map(price => (
                    <button
                      key={price}
                      onClick={() => {
                        setSoldPrice(price);
                        setSoldPriceInput(price.toString());
                      }}
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                    >
                      {tournament.settings.currency}{price}
                    </button>
                  ))}
                </div>

                {/* Team Selection */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                  {teams.map(team => (
                    <button
                      key={team.id}
                      onClick={() => {
                        if (soldPrice >= currentPlayerBasePrice && soldPrice <= team.maxBid) {
                          executeAction('SOLD', { teamId: team.id, soldPrice });
                        }
                      }}
                      disabled={loading || soldPrice < currentPlayerBasePrice || soldPrice > team.maxBid || team.playersNeeded <= 0}
                      className="p-3 rounded-xl border transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105"
                      style={{
                        borderColor: `${team.color}50`,
                        background: `linear-gradient(135deg, ${team.color}10, transparent)`,
                      }}
                    >
                      <div className="font-semibold text-white truncate">{team.name.split(' ')[1] || team.name}</div>
                      <div className="text-xs text-white/60">
                        Max: {tournament.settings.currency}{team.maxBid}
                      </div>
                      <div className="text-xs text-white/40">
                        {team.playersNeeded} slots left
                      </div>
                    </button>
                  ))}
                </div>

                {/* Joker Control */}
                {tournament.settings.enableJokerCard && (
                  <div className="border-t border-white/10 pt-4">
                    <h4 className="text-white/60 text-sm mb-2">Joker Card</h4>
                    <div className="flex gap-2">
                      <select
                        value={selectedJokerTeamId}
                        onChange={(e) => setSelectedJokerTeamId(e.target.value)}
                        className="flex-1 min-h-[44px] px-3 py-2 rounded-lg bg-white/10 border border-purple-500/30 text-white focus:outline-none"
                      >
                        <option value="" className="bg-slate-800">Select team...</option>
                        {teams.filter(t => !state.usedJokers?.[t.id]).map(t => (
                          <option key={t.id} value={t.id} className="bg-slate-800">
                            {t.name.split(' ')[1] || t.name}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => {
                          if (selectedJokerTeamId) {
                            executeAction('JOKER', { teamId: selectedJokerTeamId });
                            setSelectedJokerTeamId('');
                          }
                        }}
                        disabled={loading || !selectedJokerTeamId}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white font-semibold rounded-lg"
                      >
                        🎴 Play Joker
                      </button>
                    </div>
                    {state.jokerPlayerId === currentPlayer.id && state.jokerRequestingTeamId && (
                      <div className="mt-2 bg-purple-500/20 border border-purple-500/30 rounded-lg p-2 text-center">
                        <span className="text-purple-300 text-sm">
                          🎴 {teams.find(t => t.id === state.jokerRequestingTeamId)?.name} playing Joker!
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Unsold Button */}
                <div className="mt-4 pt-4 border-t border-white/10">
                  <button
                    onClick={() => setShowUnsoldModal(true)}
                    disabled={loading}
                    className="w-full min-h-[44px] bg-amber-600/20 hover:bg-amber-600/40 text-amber-400 border border-amber-600/30 font-semibold py-3 rounded-xl transition-colors"
                  >
                    Mark as Unsold
                  </button>
                </div>
              </div>
            )}

            {/* After Sold - Clear Button */}
            {status === 'SOLD' && (
              <div className="glass-elevated rounded-2xl p-6 border border-white/20">
                <button
                  onClick={() => executeAction('CLEAR')}
                  disabled={loading}
                  className="w-full min-h-[48px] bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors"
                >
                  Ready for Next Player
                </button>
              </div>
            )}

            {/* Pause Controls */}
            <div className="glass-elevated rounded-2xl p-6 border border-white/20">
              <h3 className="text-lg font-bold text-white mb-4">Pause Controls</h3>
              {status !== 'PAUSED' ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={pauseMessage}
                    onChange={(e) => setPauseMessage(e.target.value)}
                    placeholder="Pause message (optional)"
                    className="w-full min-h-[44px] px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:outline-none"
                  />
                  <div className="flex gap-3">
                    <input
                      type="number"
                      value={pauseMinutes || ''}
                      onChange={(e) => setPauseMinutes(e.target.value ? parseInt(e.target.value) : undefined)}
                      placeholder="Minutes (optional)"
                      className="w-32 min-h-[44px] px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:outline-none"
                    />
                    <button
                      onClick={() => executeAction('PAUSE', {
                        message: pauseMessage || undefined,
                        duration: pauseMinutes ? pauseMinutes * 60 : undefined,
                      })}
                      disabled={loading}
                      className="flex-1 min-h-[44px] bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded-lg transition-colors"
                    >
                      Pause Auction
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => executeAction('UNPAUSE')}
                  disabled={loading}
                  className="w-full min-h-[44px] bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition-colors"
                >
                  Resume Auction
                </button>
              )}
            </div>

            {/* Danger Zone */}
            <div className="glass-elevated rounded-2xl p-6 border border-red-500/30">
              <h3 className="text-lg font-bold text-red-400 mb-4">⚠️ Danger Zone</h3>
              <button
                onClick={() => setShowResetModal(true)}
                disabled={loading}
                className="w-full min-h-[44px] bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-600/30 font-semibold py-3 rounded-xl transition-colors"
              >
                Reset Entire Auction
              </button>
            </div>
          </div>

          {/* Sidebar - Teams */}
          <div className="space-y-4">
            <div className="glass-elevated rounded-2xl p-4 border border-white/20">
              <h3 className="text-lg font-bold text-white mb-4">Teams</h3>
              <div className="space-y-3">
                {teams.map(team => (
                  <div
                    key={team.id}
                    className="p-3 rounded-xl border"
                    style={{ borderColor: `${team.color}30` }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-white">{team.name.split(' ').slice(1).join(' ') || team.name}</span>
                      <span className="text-xs text-white/60">{team.roster.length}/{tournament.settings.teamSize - 2}</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-2">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${(team.spent / team.budget) * 100}%`,
                          backgroundColor: team.color,
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-white/60">Spent: {tournament.settings.currency}{team.spent}</span>
                      <span className="text-white/40">Max: {tournament.settings.currency}{team.maxBid}</span>
                    </div>
                    {state.usedJokers?.[team.id] && (
                      <div className="mt-1 text-xs text-purple-400">🎴 Joker used</div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="glass-elevated rounded-2xl p-4 border border-white/20">
              <h3 className="text-lg font-bold text-white mb-3">Progress</h3>
              <div className="text-center">
                <div className="text-4xl font-bold text-white">
                  {state.soldCount}/{state.totalPlayers}
                </div>
                <div className="text-white/60">Players Sold</div>
              </div>
              <div className="h-3 bg-white/10 rounded-full overflow-hidden mt-4">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all"
                  style={{ width: `${(state.soldCount / state.totalPlayers) * 100}%` }}
                />
              </div>
            </div>

            {/* Soundboard */}
            <div className="glass-elevated rounded-2xl p-4 border border-white/20">
              <h3 className="text-lg font-bold text-white mb-3">🔊 Soundboard</h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={playHammer}
                  className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors"
                >
                  🔨 Sold!
                </button>
                <button
                  onClick={playBell}
                  className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors"
                >
                  🔔 Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ConfirmModal
        isOpen={showResetModal}
        title="Reset Entire Auction"
        message="This will clear all sold players, rosters, and prices. Type 'RESET' to confirm."
        confirmText="Reset"
        confirmVariant="danger"
        requiresInput
        inputPlaceholder="Type RESET"
        inputMatch="RESET"
        onConfirm={() => {
          executeAction('RESET', { confirmReset: true });
          setShowResetModal(false);
        }}
        onCancel={() => setShowResetModal(false)}
      />

      <ConfirmModal
        isOpen={showUnsoldModal}
        title="Mark as Unsold"
        message={`Are you sure you want to mark ${currentPlayer?.name || 'this player'} as unsold?`}
        confirmText="Unsold"
        confirmVariant="primary"
        onConfirm={() => {
          executeAction('UNSOLD');
          setShowUnsoldModal(false);
        }}
        onCancel={() => setShowUnsoldModal(false)}
      />
    </div>
  );
}
