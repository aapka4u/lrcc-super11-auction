'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Player, Team } from '@/lib/types';
import IntelligencePanel from '@/components/IntelligencePanel';
import { ALL_PLAYERS } from '@/lib/data';

interface TeamWithBudget extends Team {
  roster: Player[];
  captainPlayer?: Player;
  viceCaptainPlayer?: Player;
  spent: number;
  remainingBudget: number;
  maxBid: number;
  playersNeeded: number;
}

interface AuctionState {
  status: string;
  currentPlayer: Player | null;
  teams: TeamWithBudget[];
  soldPlayers: string[];
  soldPrices: Record<string, number>;
  rosters: Record<string, string[]>;
  lastUpdate: number;
}

export default function IntelligencePage() {
  const [state, setState] = useState<AuctionState | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch state
  useEffect(() => {
    const fetchState = async () => {
      try {
        const res = await fetch('/api/state');
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setState(data);
        setError(null);
      } catch (err) {
        setError('Failed to connect');
      }
    };

    fetchState();
    const interval = setInterval(fetchState, 2000);
    return () => clearInterval(interval);
  }, []);

  // Build auction history from sold players
  const auctionHistory = useMemo(() => {
    if (!state) return [];
    return (state.soldPlayers || []).map(playerId => {
      const player = ALL_PLAYERS.find(p => p.id === playerId);
      const teamId = Object.entries(state.rosters || {}).find(([_, roster]) =>
        roster.includes(playerId)
      )?.[0];
      return {
        playerId,
        teamId: teamId || '',
        price: state.soldPrices?.[playerId] || 0,
        timestamp: state.lastUpdate || Date.now(),
        playerRole: player?.role,
      };
    });
  }, [state]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white/60">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 pb-20">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/lrccsuper11" className="text-white/60 hover:text-white text-sm">
            ← Back to Auction
          </Link>
          <div className="text-xs text-white/40">
            Last update: {new Date(state.lastUpdate).toLocaleTimeString()}
          </div>
        </div>

        {/* Intelligence Panel */}
        <IntelligencePanel
          teams={state.teams}
          currentPlayer={state.currentPlayer}
          soldPlayers={state.soldPlayers || []}
          soldPrices={state.soldPrices || {}}
          auctionHistory={auctionHistory}
        />
      </div>
    </div>
  );
}
