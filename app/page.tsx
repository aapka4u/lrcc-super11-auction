'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import TeamCard from '@/components/TeamCard';
import AuctionStatus from '@/components/AuctionStatus';
import { Team, Player, AuctionStatus as Status } from '@/lib/types';

interface PublicState {
  status: Status;
  currentPlayer: Player | null;
  soldToTeam: Team | null;
  teams: (Team & { roster: Player[]; captainPlayer?: Player; viceCaptainPlayer?: Player })[];
  lastUpdate: number;
  soldCount: number;
  totalPlayers: number;
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
    
    // Poll every 2 seconds
    const interval = setInterval(fetchState, 2000);
    
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

      {/* Error Banner */}
      {error && (
        <div className="bg-red-500/20 border-b border-red-500/30 px-4 py-2 text-center">
          <p className="text-sm text-red-300">{error}</p>
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
          <span>Auto-refreshing every 2s</span>
          <span>Last update: {lastRefresh.toLocaleTimeString()}</span>
        </div>
      </footer>
    </main>
  );
}
