'use client';

import { useEffect, useState, useCallback } from 'react';
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
    return <span className="text-amber-400">Resuming soon...</span>;
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return <span className="text-amber-400">{minutes}:{seconds.toString().padStart(2, '0')}</span>;
}

interface PublicState {
  status: Status;
  currentPlayer: Player | null;
  soldToTeam: Team | null;
  teams: (Team & { roster: Player[] })[];
  lastUpdate: number;
  soldCount: number;
  totalPlayers: number;
  soldPlayers: string[]; // IDs
  pauseMessage?: string;
  pauseUntil?: number;
}

export default function BroadcastPage() {
  const [state, setState] = useState<PublicState | null>(null);
  const [recentSales, setRecentSales] = useState<{ player: string; team: string; teamColor: string }[]>([]);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch('/api/state', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setState(data);
      
      // Calculate recent sales for ticker
      // Show the last sold player if status is SOLD
      if (data.status === 'SOLD' && data.currentPlayer && data.soldToTeam) {
        setRecentSales([{
          player: data.currentPlayer.name,
          team: data.soldToTeam.name,
          teamColor: data.soldToTeam.color
        }]);
      }
    } catch (err) {
      console.error('Error fetching state:', err);
    }
  }, []);

  // Initialize recentSales from current state on mount/update
  useEffect(() => {
    if (state?.status === 'SOLD' && state.currentPlayer && state.soldToTeam) {
      setRecentSales([{
        player: state.currentPlayer.name,
        team: state.soldToTeam.name,
        teamColor: state.soldToTeam.color
      }]);
    }
  }, [state?.status, state?.currentPlayer, state?.soldToTeam]);

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 60000); // 60s - auction is over
    return () => clearInterval(interval);
  }, [fetchState]);

  if (!state) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading Broadcast...</div>;
  }

  return (
    <main className="min-h-screen bg-black text-white flex flex-col relative overflow-hidden">
      {/* Background Atmosphere */}
      <div className="absolute inset-0 stadium-bg opacity-50" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/50 to-black" />

      {/* Pause Banner - Full Screen Overlay */}
      {state.status === 'PAUSED' && (
        <div className="absolute inset-0 z-50 bg-black/95 flex items-center justify-center">
          <div className="text-center px-4">
            <div className="text-8xl mb-6 animate-pulse">⏸️</div>
            <h1 className="text-5xl md:text-6xl font-black text-white mb-4 uppercase tracking-wider">
              Auction Paused
            </h1>
            <p className="text-2xl md:text-3xl text-amber-400 font-bold mb-6">
              {state.pauseMessage || 'We will be back shortly.'}
            </p>
            {state.pauseUntil && (
              <div className="text-4xl md:text-5xl font-black text-white">
                <span className="text-amber-400">Back in </span>
                <PauseCountdown pauseUntil={state.pauseUntil} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <header className="relative z-10 p-6 text-center border-b border-white/10 bg-black/40 backdrop-blur-md">
        <h1 className="text-2xl font-bold uppercase tracking-[0.2em] text-amber-500">
          Super 11 Premier League
        </h1>
        <div className="flex items-center justify-center gap-4 mt-2 text-sm text-white/60">
          <span>Live Auction 2026</span>
          <span>•</span>
          <span>Parkwijk Utrecht</span>
        </div>
      </header>

      {/* Main Stage */}
      <div className="flex-1 flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-2xl transform scale-110">
          <AuctionStatus
            status={state.status}
            currentPlayer={state.currentPlayer}
            soldToTeam={state.soldToTeam}
          />
        </div>
      </div>

      {/* Stats / Ticker */}
      <footer className="relative z-10 bg-black/80 border-t border-white/10">
        <div className="p-4 flex justify-around items-center border-b border-white/5">
           <div className="text-center">
             <div className="text-3xl font-bold text-white">{state.soldCount}</div>
             <div className="text-xs text-white/40 uppercase tracking-wider">Sold</div>
           </div>
           <div className="text-center">
             <div className="text-3xl font-bold text-white">{state.totalPlayers - state.soldCount}</div>
             <div className="text-xs text-white/40 uppercase tracking-wider">Remaining</div>
           </div>
           <div className="text-center">
             <div className="text-3xl font-bold text-amber-500">
                {Math.round((state.soldCount / state.totalPlayers) * 100)}%
             </div>
             <div className="text-xs text-white/40 uppercase tracking-wider">Complete</div>
           </div>
        </div>

        {/* Scrolling Ticker */}
        <div className="bg-amber-500 text-black py-2 overflow-hidden relative flex items-center">
          <div className="bg-amber-600 px-3 py-2 font-bold uppercase tracking-wider text-xs z-10 shadow-lg">
            LATEST UPDATES
          </div>
          <div className="whitespace-nowrap animate-marquee flex items-center gap-8 pl-4">
             {/* Repeat content for smooth loop */}
             {[1,2,3].map(i => (
               <div key={i} className="flex items-center gap-8">
                  {state.status === 'SOLD' && state.soldToTeam && state.currentPlayer ? (
                    <span className="font-bold uppercase flex items-center gap-2">
                      <span className="text-lg">🔥</span> 
                      JUST SOLD: {state.currentPlayer.name} 
                      <span className="opacity-50">→</span> 
                      {state.soldToTeam.name}
                    </span>
                  ) : (
                    <span className="font-bold uppercase tracking-wider">
                      🏏 LRCC + Super 11 Premier League 2026 Live Auction
                    </span>
                  )}
                  <span className="w-2 h-2 rounded-full bg-black/30" />
               </div>
             ))}
          </div>
        </div>
      </footer>
      
      <style jsx>{`
        .animate-marquee {
          animation: marquee 20s linear infinite;
        }
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </main>
  );
}
