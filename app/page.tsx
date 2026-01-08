'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import TeamCard from '@/components/TeamCard';
import AuctionStatus from '@/components/AuctionStatus';
import { Team, Player, AuctionStatus as Status } from '@/lib/types';

function PauseCountdown({ pauseUntil }: { pauseUntil: number }) {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      const diff = pauseUntil - now;
      setTimeLeft(Math.max(0, Math.floor(diff / 1000)));
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [pauseUntil]);

  if (timeLeft <= 0) {
    return <p className="text-sm text-amber-200">Resuming soon...</p>;
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <p className="text-xl md:text-2xl font-bold text-white">
      Back in <span className="text-amber-300">{minutes}:{seconds.toString().padStart(2, '0')}</span>
    </p>
  );
}

interface PublicState {
  status: Status;
  currentPlayer: Player | null;
  soldToTeam: Team | null;
  teams: (Team & { roster: Player[]; captainPlayer?: Player; viceCaptainPlayer?: Player })[];
  lastUpdate: number;
  soldCount: number;
  totalPlayers: number;
  pauseMessage?: string;
  pauseUntil?: number;
}

export default function Home() {
  const [state, setState] = useState<PublicState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch('/api/state', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setState(data);
      setError(null);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Error fetching state:', err);
      setError('Connection lost. Retrying...');
    }
  }, []);

  useEffect(() => {
    fetchState();
    
    // Poll every 3 seconds for public pages (reduced load)
    const interval = setInterval(fetchState, 3000);
    
    return () => clearInterval(interval);
  }, [fetchState]);

  if (!state) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/50">Loading auction...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen pb-8">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-white">
                🏏 LRCC + Super 11 Premier League 2026
              </h1>
              <p className="text-xs text-white/50">
                Live Auction • Parkwijk Utrecht
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/players"
                className="text-sm bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition-colors"
              >
                👥 All Players
              </Link>
              <div className="text-right">
                <div className="text-sm font-semibold text-white/80">
                  {state.soldCount} / {state.totalPlayers}
                </div>
                <div className="text-xs text-white/40">players sold</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Error Banner - Prominent and Sticky */}
      {error && (
        <div className="sticky top-0 z-50 bg-red-600/90 backdrop-blur-md border-b-2 border-red-500 px-4 py-3 text-center shadow-lg">
          <p className="text-base font-semibold text-red-100 flex items-center justify-center gap-2">
            <span className="text-xl">⚠️</span>
            {error}
          </p>
        </div>
      )}

      {/* Pause Banner - Very Prominent */}
      {state.status === 'PAUSED' && (
        <div className="sticky top-0 z-50 bg-amber-600/95 backdrop-blur-md border-b-4 border-amber-400 px-4 py-6 text-center shadow-xl">
          <div className="max-w-4xl mx-auto">
            <div className="text-4xl mb-3 animate-pulse">⏸️</div>
            <h2 className="text-2xl md:text-3xl font-black text-white mb-2 uppercase tracking-wider">
              Auction Paused
            </h2>
            <p className="text-lg md:text-xl text-amber-100 font-semibold mb-3">
              {state.pauseMessage || 'We will be back shortly.'}
            </p>
            {state.pauseUntil && (
              <PauseCountdown pauseUntil={state.pauseUntil} />
            )}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Auction Status - Featured */}
        <section className="mb-8">
          <AuctionStatus
            status={state.status}
            currentPlayer={state.currentPlayer}
            soldToTeam={state.soldToTeam}
          />
        </section>

        {/* Teams Grid */}
        <section>
          <h2 className="text-lg font-semibold text-white/70 mb-4 flex items-center gap-2">
            <span>Teams</span>
            <span className="text-sm font-normal text-white/40">
              (Captain & Vice-Captain pre-assigned)
            </span>
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {state.teams.map((team) => (
              <TeamCard
                key={team.id}
                team={team}
                isHighlighted={state.status === 'SOLD' && state.soldToTeam?.id === team.id}
              />
            ))}
          </div>
        </section>
      </div>

      {/* Footer with connection status */}
      <footer className="fixed bottom-0 left-0 right-0 bg-black/50 backdrop-blur-sm border-t border-white/10 px-4 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-white/40">
          <span>Auto-refreshing every 3s</span>
          <span>Last update: {lastRefresh.toLocaleTimeString()}</span>
        </div>
      </footer>
    </main>
  );
}
