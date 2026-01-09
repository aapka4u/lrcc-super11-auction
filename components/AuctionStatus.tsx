'use client';

import { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { Player, Team, AuctionStatus as Status } from '@/lib/types';

interface AuctionStatusProps {
  status: Status;
  currentPlayer: Player | null;
  soldToTeam: Team | null;
}

// Live auction timer component - Mobile optimized
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
    <div className="inline-flex items-center gap-2 bg-black/40 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/10">
      <span className="text-[10px] sm:text-xs text-white/60 uppercase tracking-wider font-medium">On Block</span>
      <span className="text-base sm:text-lg font-mono font-bold text-yellow-400 tabular-nums">
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

  // IDLE state - Mobile-first design
  if (status === 'IDLE' || !currentPlayer) {
    return (
      <div className="glass rounded-2xl p-5 sm:p-6 text-center animate-breathe">
        <div className="inline-flex items-center gap-2.5 bg-white/10 rounded-full px-4 py-2.5 mb-4">
          <div className="w-2.5 h-2.5 bg-yellow-400 rounded-full animate-pulse" />
          <span className="text-sm font-medium text-white/80">Waiting for Auctioneer</span>
        </div>
        <h2 className="text-lg sm:text-xl font-semibold text-white/60">
          Super 11 Premier League 2026
        </h2>
        <p className="text-sm text-white/40 mt-2">
          Next player coming up...
        </p>
      </div>
    );
  }

  // SOLD state - Mobile-first celebration design
  if (status === 'SOLD' && soldToTeam) {
    const soldRoleDisplay = getRoleDisplay(currentPlayer.role);
    return (
      <div
        className="glass rounded-2xl p-4 sm:p-6 md:p-8 text-center relative overflow-hidden transform transition-all duration-500 border-2"
        style={{
          boxShadow: `0 0 60px ${soldToTeam.color}50, 0 0 120px ${soldToTeam.color}20`,
          borderColor: soldToTeam.color,
          backgroundColor: `${soldToTeam.color}10`
        }}
      >
        {/* Celebration background effect */}
        <div
          className="absolute inset-0 opacity-25"
          style={{
            background: `radial-gradient(circle at center, ${soldToTeam.color} 0%, transparent 70%)`
          }}
        />

        <div className="relative z-10">
          {/* SOLD STAMP - Repositioned for mobile */}
          <div className="flex justify-center mb-4 animate-stamp">
            <div className="border-[3px] border-dashed border-red-500 text-red-500 font-black text-2xl sm:text-3xl px-4 py-1.5 uppercase tracking-widest bg-white/10 backdrop-blur-sm rounded-lg shadow-xl rotate-[-3deg]">
              SOLD!
            </div>
          </div>

          {/* Mobile-optimized layout - stacked on mobile */}
          <div className="flex flex-col items-center gap-4 sm:gap-6">
            {/* Player Image - Larger on mobile for visibility */}
            <div className="relative">
              {currentPlayer.image ? (
                <img
                  src={currentPlayer.image}
                  alt={currentPlayer.name}
                  className="w-28 h-28 sm:w-36 sm:h-36 md:w-44 md:h-44 rounded-2xl object-cover shadow-2xl ring-4 ring-white/30"
                />
              ) : (
                <div className="w-28 h-28 sm:w-36 sm:h-36 md:w-44 md:h-44 rounded-2xl bg-gradient-to-br from-white/20 to-white/5 flex items-center justify-center text-4xl sm:text-5xl font-bold ring-4 ring-white/30">
                  {getInitials(currentPlayer.name)}
                </div>
              )}
              {/* Category badge */}
              <div className="absolute -bottom-2 -right-2 w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-bold text-black text-lg border-2 border-white shadow-lg">
                {currentPlayer.category === 'APLUS' ? '⭐' : currentPlayer.category === 'BASE' ? 'L' : 'C'}
              </div>
            </div>

            {/* Player Info - Centered on mobile */}
            <div className="text-center w-full">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white leading-tight mb-2 drop-shadow-lg">
                {currentPlayer.name}
              </h2>

              {/* Role & Club badges */}
              <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
                {soldRoleDisplay && (
                  <span className={`text-sm sm:text-base ${soldRoleDisplay.color} px-3 py-1.5 rounded-xl font-semibold border border-white/10`}>
                    {soldRoleDisplay.icon} {soldRoleDisplay.label}
                  </span>
                )}
                <span className="text-sm sm:text-base bg-white/10 text-white/70 px-3 py-1.5 rounded-xl font-mono border border-white/10">
                  {currentPlayer.club}
                </span>
              </div>

              {/* Team - Full width on mobile */}
              <div
                className="flex items-center justify-center gap-3 rounded-xl px-4 py-3 border border-white/20 mx-auto max-w-xs"
                style={{ backgroundColor: `${soldToTeam.color}90` }}
              >
                <div
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-inner bg-black/20 shrink-0"
                >
                  {soldToTeam.name.split(' ')[1]?.[0] || soldToTeam.name[0]}
                </div>
                <div className="text-left min-w-0">
                  <div className="text-[10px] sm:text-xs text-white/80 uppercase tracking-widest font-bold">Sold To</div>
                  <div className="text-base sm:text-lg font-bold text-white leading-tight truncate">{soldToTeam.name}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // LIVE state - Mobile-first bidding view
  const availabilityLabel = getAvailabilityLabel(currentPlayer.availability);
  const roleDisplay = getRoleDisplay(currentPlayer.role);

  return (
    <div className="glass rounded-2xl p-4 sm:p-5 md:p-6 text-center relative overflow-hidden border-2 border-yellow-500/40">
      {/* Subtle animated background */}
      <div className="absolute inset-0 animate-shimmer opacity-10 bg-gradient-to-br from-yellow-500/10 to-transparent" />

      <div className="relative z-10">
        {/* Live indicator + Timer - Compact on mobile */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-4 sm:mb-5">
          <div className="inline-flex items-center gap-2 bg-red-500/20 border border-red-500/40 rounded-xl px-3 sm:px-4 py-2">
            <div className="live-dot" />
            <span className="text-xs sm:text-sm font-bold text-red-400 uppercase tracking-wider">Live</span>
          </div>
          <LiveTimer isActive={true} playerId={currentPlayer.id} />
        </div>

        {/* Mobile-first stacked layout */}
        <div className="flex flex-col items-center gap-4 sm:gap-5">
          {/* Player Image with glow effect */}
          <div className="relative">
            <div className="absolute inset-0 bg-yellow-500/20 blur-2xl rounded-full opacity-60" />
            {currentPlayer.image ? (
              <img
                src={currentPlayer.image}
                alt={currentPlayer.name}
                className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 rounded-2xl object-cover relative z-10 shadow-2xl ring-4 ring-yellow-500/40"
              />
            ) : (
              <div className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 rounded-2xl bg-gradient-to-br from-white/20 to-white/5 flex items-center justify-center text-4xl sm:text-5xl font-bold relative z-10 shadow-2xl ring-4 ring-yellow-500/40">
                {getInitials(currentPlayer.name)}
              </div>
            )}

            {/* Category badge - positioned for mobile visibility */}
            <div className="absolute -top-2 -right-2 z-20">
              {currentPlayer.category === 'APLUS' ? (
                <div className="bg-gradient-to-r from-amber-400 to-yellow-600 text-black font-bold px-2.5 py-1 rounded-lg shadow-lg border border-white/30 text-xs sm:text-sm">
                  ⭐ STAR
                </div>
              ) : (
                <div className="bg-white/20 backdrop-blur-md text-white font-bold px-2.5 py-1 rounded-lg shadow-lg border border-white/20 text-xs sm:text-sm">
                  LEAGUE
                </div>
              )}
            </div>
          </div>

          {/* Player Info - Centered for mobile */}
          <div className="text-center w-full">
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-black text-white mb-3 tracking-tight drop-shadow-xl leading-tight">
              {currentPlayer.name}
            </h2>

            {/* Role & Club badges - Touch-friendly */}
            <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
              {roleDisplay && (
                <span className={`text-sm sm:text-base ${roleDisplay.color} px-3 py-2 rounded-xl font-semibold border border-white/10 flex items-center gap-1.5`}>
                  <span className="text-base">{roleDisplay.icon}</span> {roleDisplay.label}
                </span>
              )}
              <span className="text-sm sm:text-base bg-white/10 text-white/70 px-3 py-2 rounded-xl font-mono border border-white/10">
                {currentPlayer.club}
              </span>
            </div>

            {/* Availability warning if applicable */}
            {availabilityLabel && (
              <div className="inline-flex items-center gap-1.5 bg-orange-500/20 text-orange-300 px-3 py-2 rounded-xl border border-orange-500/30 text-sm font-medium mb-3">
                <span>⚠️</span> {availabilityLabel}
              </div>
            )}

            {/* Bidding status indicator */}
            <div className="mt-3">
              <div className="inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-2.5">
                <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                <span className="text-sm sm:text-base text-yellow-300/90 font-medium">
                  Waiting for bids...
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
