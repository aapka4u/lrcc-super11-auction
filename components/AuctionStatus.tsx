'use client';

import { Player, Team, AuctionStatus as Status } from '@/lib/types';

interface AuctionStatusProps {
  status: Status;
  currentPlayer: Player | null;
  soldToTeam: Team | null;
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
  // IDLE state
  if (status === 'IDLE' || !currentPlayer) {
    return (
      <div className="glass rounded-2xl p-6 text-center">
        <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-2 mb-4">
          <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
          <span className="text-sm font-medium text-white/70">Waiting</span>
        </div>
        <h2 className="text-xl font-semibold text-white/50">
          Next player coming up...
        </h2>
        <p className="text-sm text-white/30 mt-2">
          Auction in progress
        </p>
      </div>
    );
  }

  // SOLD state
  if (status === 'SOLD' && soldToTeam) {
    const soldRoleDisplay = getRoleDisplay(currentPlayer.role);
    return (
      <div
        className="glass rounded-2xl p-6 text-center relative overflow-hidden"
        style={{
          boxShadow: `0 0 60px ${soldToTeam.color}40`,
          borderColor: soldToTeam.color
        }}
      >
        {/* Celebration background effect */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            background: `radial-gradient(circle at center, ${soldToTeam.color} 0%, transparent 70%)`
          }}
        />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 bg-green-500/20 border border-green-500/30 rounded-full px-4 py-2 mb-4">
            <span className="text-lg">✅</span>
            <span className="text-sm font-bold text-green-400">SOLD!</span>
          </div>

          {/* Player */}
          <div className="flex items-center justify-center gap-4 mb-4">
            {currentPlayer.image ? (
              <img
                src={currentPlayer.image}
                alt={currentPlayer.name}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-white/20 to-white/5 flex items-center justify-center text-2xl font-bold">
                {getInitials(currentPlayer.name)}
              </div>
            )}
            <div className="text-left">
              <h2 className="text-2xl font-bold text-white">{currentPlayer.name}</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {soldRoleDisplay && (
                  <span className={`text-xs ${soldRoleDisplay.color} px-2 py-0.5 rounded font-medium`}>
                    {soldRoleDisplay.icon} {soldRoleDisplay.label}
                  </span>
                )}
                {currentPlayer.category === 'APLUS' && (
                  <span className="text-xs bg-amber-500/30 text-amber-300 px-2 py-0.5 rounded font-medium">
                    A+ Player
                  </span>
                )}
                <span className="text-xs text-white/50">{currentPlayer.club}</span>
              </div>
            </div>
          </div>

          {/* Arrow */}
          <div className="text-3xl mb-4">⬇️</div>

          {/* Team */}
          <div
            className="inline-flex items-center gap-3 rounded-xl px-5 py-3"
            style={{ backgroundColor: `${soldToTeam.color}30` }}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-lg"
              style={{ backgroundColor: soldToTeam.color }}
            >
              {soldToTeam.name.split(' ')[1]?.[0] || soldToTeam.name[0]}
            </div>
            <span className="text-xl font-bold text-white">{soldToTeam.name}</span>
          </div>
        </div>
      </div>
    );
  }

  // LIVE state
  const availabilityLabel = getAvailabilityLabel(currentPlayer.availability);
  const roleDisplay = getRoleDisplay(currentPlayer.role);

  return (
    <div className="glass rounded-2xl p-6 text-center relative overflow-hidden border-red-500/30">
      {/* Animated background */}
      <div className="absolute inset-0 animate-shimmer opacity-30" />

      <div className="relative z-10">
        <div className="inline-flex items-center gap-2 bg-red-500/20 border border-red-500/30 rounded-full px-4 py-2 mb-4">
          <div className="live-dot" />
          <span className="text-sm font-bold text-red-400 uppercase tracking-wider">Live Auction</span>
        </div>

        {/* Player */}
        <div className="flex flex-col items-center">
          {currentPlayer.image ? (
            <img
              src={currentPlayer.image}
              alt={currentPlayer.name}
              className="w-20 h-20 rounded-full object-cover mb-4 ring-4 ring-red-500/30"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-white/20 to-white/5 flex items-center justify-center text-3xl font-bold mb-4 ring-4 ring-red-500/30">
              {getInitials(currentPlayer.name)}
            </div>
          )}

          <h2 className="text-3xl font-bold text-white mb-2">{currentPlayer.name}</h2>

          {/* Role badge - prominent display */}
          {roleDisplay && (
            <span className={`text-base ${roleDisplay.color} px-4 py-1.5 rounded-full font-semibold mb-3`}>
              {roleDisplay.icon} {roleDisplay.label}
            </span>
          )}

          <div className="flex items-center gap-2 flex-wrap justify-center">
            {currentPlayer.category === 'APLUS' && (
              <span className="text-sm bg-amber-500/30 text-amber-300 px-3 py-1 rounded-full font-medium">
                ⭐ A+ Player
              </span>
            )}
            <span className="text-sm bg-white/10 text-white/70 px-3 py-1 rounded-full">
              {currentPlayer.club}
            </span>
            {availabilityLabel && (
              <span className="text-sm bg-orange-500/20 text-orange-300 px-3 py-1 rounded-full">
                ⏰ {availabilityLabel}
              </span>
            )}
          </div>
        </div>

        <p className="text-white/40 text-sm mt-4 animate-pulse">
          Bidding in progress...
        </p>
      </div>
    </div>
  );
}
