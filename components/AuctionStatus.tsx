'use client';

import { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { Player, Team, AuctionStatus as Status } from '@/lib/types';

interface AuctionStatusProps {
  status: Status;
  currentPlayer: Player | null;
  soldToTeam: Team | null;
}

// Live auction timer component
function LiveTimer({ isActive, playerId }: { isActive: boolean; playerId: string | null }) {
  const [seconds, setSeconds] = useState(0);
  const lastPlayerIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Reset timer when player changes or status changes
    if (playerId !== lastPlayerIdRef.current) {
      setSeconds(0);
      lastPlayerIdRef.current = playerId;
    }

    if (!isActive) {
      return;
    }

    const interval = setInterval(() => {
      setSeconds(s => s + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, playerId]);

  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return (
    <div className="inline-flex items-center gap-2 bg-black/30 rounded-lg px-3 py-1.5 border border-white/10">
      <span className="text-xs text-white/50 uppercase tracking-wider">On Block</span>
      <span className="text-lg font-mono font-bold text-yellow-400 animate-pulse">
        {minutes.toString().padStart(2, '0')}:{secs.toString().padStart(2, '0')}
      </span>
    </div>
  );
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getAvailabilityLabel(availability: string): string | null {
  switch (availability) {
    case 'till_11':
      return 'Available till 11 AM';
    case 'till_12':
      return 'Available till 12 noon';
    case 'tentative':
      return 'Tentative';
    default:
      return null;
  }
}

function getRoleDisplay(role?: string): { icon: string; label: string; color: string } | null {
  switch (role) {
    case 'Batsman':
      return { icon: '🏏', label: 'Batsman', color: 'bg-blue-500/20 text-blue-300' };
    case 'Bowler':
      return { icon: '🎯', label: 'Bowler', color: 'bg-green-500/20 text-green-300' };
    case 'All-rounder':
      return { icon: '⚡', label: 'All-rounder', color: 'bg-purple-500/20 text-purple-300' };
    case 'WK-Batsman':
      return { icon: '🧤', label: 'WK-Batsman', color: 'bg-cyan-500/20 text-cyan-300' };
    default:
      return null;
  }
}

export default function AuctionStatus({ status, currentPlayer, soldToTeam }: AuctionStatusProps) {
  const lastSoldPlayerRef = useRef<string | null>(null);

  // Trigger confetti when status changes to SOLD
  useEffect(() => {
    if (status === 'SOLD' && soldToTeam && currentPlayer) {
      // Only fire once per sale (check player ID to avoid re-firing)
      if (lastSoldPlayerRef.current !== currentPlayer.id) {
        lastSoldPlayerRef.current = currentPlayer.id;

        // Fire confetti from center of screen with team color
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { x: 0.5, y: 0.5 },
          colors: [soldToTeam.color, '#ffffff', '#ffd700'],
        });
      }
    } else if (status !== 'SOLD') {
      // Reset ref when not in SOLD state so next sale can trigger
      lastSoldPlayerRef.current = null;
    }
  }, [status, soldToTeam, currentPlayer]);

  // PAUSED state
  if (status === 'PAUSED') {
    return (
      <div className="glass rounded-2xl p-8 text-center border-2 border-amber-500/50 bg-amber-500/10">
        <div className="text-6xl mb-4 animate-pulse">⏸️</div>
        <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-wider">
          Auction Paused
        </h2>
        <p className="text-xl text-amber-200 font-semibold">
          Please stand by...
        </p>
      </div>
    );
  }

  // IDLE state
  if (status === 'IDLE' || !currentPlayer) {
    return (
      <div className="glass rounded-2xl p-6 text-center border-yellow-500/10">
        <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-2 mb-4">
          <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
          <span className="text-sm font-medium text-white/70">Waiting for Auctioneer</span>
        </div>
        <h2 className="text-xl font-semibold text-white/50">
          Super 11 Premier League 2026
        </h2>
        <p className="text-sm text-white/30 mt-2">
          Auction will begin shortly
        </p>
      </div>
    );
  }

  // SOLD state
  if (status === 'SOLD' && soldToTeam) {
    const soldRoleDisplay = getRoleDisplay(currentPlayer.role);
    return (
      <div
        className="glass rounded-2xl p-8 text-center relative overflow-hidden transform transition-all duration-500 scale-105 border-2"
        style={{
          boxShadow: `0 0 100px ${soldToTeam.color}60`,
          borderColor: soldToTeam.color,
          backgroundColor: `${soldToTeam.color}10`
        }}
      >
        {/* Celebration background effect */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: `radial-gradient(circle at center, ${soldToTeam.color} 0%, transparent 80%)`
          }}
        />

        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 justify-center">
          
          {/* SOLD STAMP */}
          <div className="absolute top-4 right-4 md:right-10 z-20 animate-stamp rotate-[-15deg]">
             <div className="border-4 border-dashed border-red-500 text-red-500 font-black text-4xl px-4 py-2 uppercase tracking-widest bg-white/10 backdrop-blur-sm rounded-lg shadow-xl">
               SOLD
             </div>
          </div>

          {/* Player Image */}
          <div className="relative">
            {currentPlayer.image ? (
              <img
                src={currentPlayer.image}
                alt={currentPlayer.name}
                className="w-32 h-32 md:w-48 md:h-48 rounded-xl object-cover shadow-2xl ring-4 ring-white/20"
              />
            ) : (
              <div className="w-32 h-32 md:w-48 md:h-48 rounded-xl bg-gradient-to-br from-white/20 to-white/5 flex items-center justify-center text-4xl font-bold ring-4 ring-white/20">
                {getInitials(currentPlayer.name)}
              </div>
            )}
            <div className="absolute -bottom-3 -right-3 w-10 h-10 md:w-14 md:h-14 rounded-full bg-amber-500 flex items-center justify-center font-bold text-black border-4 border-white shadow-lg">
              {currentPlayer.category === 'APLUS' ? 'A+' : currentPlayer.category === 'BASE' ? 'B' : 'C'}
            </div>
          </div>

          {/* Info */}
          <div className="text-left flex-1 min-w-0">
            <h2 className="text-4xl md:text-5xl font-black text-white leading-tight mb-2 drop-shadow-lg">
              {currentPlayer.name}
            </h2>
            
            <div className="flex items-center gap-3 mb-6">
              {soldRoleDisplay && (
                <span className={`text-lg ${soldRoleDisplay.color} px-4 py-1.5 rounded-lg font-bold border border-white/10`}>
                  {soldRoleDisplay.icon} {soldRoleDisplay.label}
                </span>
              )}
              <span className="text-lg text-white/60 font-mono">
                {currentPlayer.club}
              </span>
            </div>

            {/* Team */}
            <div
              className="inline-flex items-center gap-4 rounded-xl px-6 py-4 border border-white/20"
              style={{ backgroundColor: `${soldToTeam.color}80` }}
            >
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-2xl shadow-inner bg-black/20"
              >
                {soldToTeam.name.split(' ')[1]?.[0] || soldToTeam.name[0]}
              </div>
              <div>
                <div className="text-xs text-white/80 uppercase tracking-widest font-bold mb-0.5">Sold To</div>
                <div className="text-2xl font-bold text-white leading-none">{soldToTeam.name}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // LIVE state
  const availabilityLabel = getAvailabilityLabel(currentPlayer.availability);
  const roleDisplay = getRoleDisplay(currentPlayer.role);

  return (
    <div className="glass rounded-2xl p-6 text-center relative overflow-hidden border-2 border-yellow-500/30">
      <div className="absolute inset-0 animate-shimmer opacity-20 bg-gradient-to-br from-yellow-500/5 to-transparent" />

      <div className="relative z-10">
        <div className="flex items-center justify-center gap-4 mb-6">
          <div className="inline-flex items-center gap-2 bg-red-500/20 border border-red-500/30 rounded-lg px-4 py-2">
            <div className="live-dot" />
            <span className="text-sm font-bold text-red-400 uppercase tracking-wider">Live Auction</span>
          </div>
          <LiveTimer isActive={true} playerId={currentPlayer.id} />
        </div>

        <div className="flex flex-col md:flex-row items-center justify-center gap-8">
          <div className="relative group">
            <div className="absolute inset-0 bg-yellow-500/20 blur-xl rounded-full opacity-50 group-hover:opacity-75 transition-opacity" />
            {currentPlayer.image ? (
              <img
                src={currentPlayer.image}
                alt={currentPlayer.name}
                className="w-40 h-40 md:w-56 md:h-56 rounded-xl object-cover relative z-10 shadow-2xl ring-4 ring-yellow-500/30"
              />
            ) : (
              <div className="w-40 h-40 md:w-56 md:h-56 rounded-xl bg-gradient-to-br from-white/20 to-white/5 flex items-center justify-center text-5xl font-bold relative z-10 shadow-2xl ring-4 ring-yellow-500/30">
                {getInitials(currentPlayer.name)}
              </div>
            )}

            <div className="absolute -top-3 -right-3 z-20">
              {currentPlayer.category === 'APLUS' ? (
                <div className="bg-gradient-to-r from-amber-400 to-yellow-600 text-black font-bold px-3 py-1 rounded-lg shadow-lg border border-white/20 text-sm">
                  A+ PLAYER
                </div>
              ) : (
                <div className="bg-white/10 backdrop-blur-md text-white/80 font-bold px-3 py-1 rounded-lg shadow-lg border border-white/20 text-sm">
                  {currentPlayer.category === 'BASE' ? 'BASE CATEGORY' : 'CAPTAIN'}
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 md:text-left">
            <h2 className="text-4xl md:text-6xl font-black text-white mb-4 tracking-tight drop-shadow-xl">
              {currentPlayer.name}
            </h2>

            <div className="flex flex-wrap items-center gap-3 md:justify-start justify-center mb-6">
              {roleDisplay && (
                <span className={`text-lg ${roleDisplay.color} px-4 py-2 rounded-lg font-bold border border-white/10 flex items-center gap-2`}>
                  {roleDisplay.icon} {roleDisplay.label}
                </span>
              )}
              <span className="text-lg bg-white/5 text-white/60 px-4 py-2 rounded-lg font-mono border border-white/10">
                {currentPlayer.club}
              </span>
            </div>

            {availabilityLabel && (
              <div className="inline-block bg-orange-500/20 text-orange-300 px-4 py-2 rounded-lg border border-orange-500/30 text-sm font-medium mb-4">
                {availabilityLabel}
              </div>
            )}

            <p className="text-white/30 text-sm font-mono uppercase tracking-widest mt-2 animate-pulse">
              Waiting for bid...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
