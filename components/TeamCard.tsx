'use client';

import { Team, Player } from '@/lib/types';

interface TeamCardProps {
  team: Team & { roster: Player[]; captainPlayer?: Player; viceCaptainPlayer?: Player };
  isHighlighted?: boolean;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function PlayerBadge({ player }: { player: Player }) {
  return (
    <div className="flex items-center gap-2 bg-slate-800/80 rounded-lg px-2 py-1.5">
      {player.image ? (
        <img
          src={player.image}
          alt={player.name}
          className="w-8 h-8 rounded-md object-cover"
        />
      ) : (
        <div
          className="w-8 h-8 rounded-md bg-slate-700 flex items-center justify-center text-[10px] font-semibold text-white"
        >
          {getInitials(player.name)}
        </div>
      )}
      <span className="text-sm text-white truncate font-medium">{player.name}</span>
      {player.category === 'APLUS' && (
        <span className="text-[10px] bg-amber-500/30 text-amber-300 px-1.5 py-0.5 rounded font-medium">
          A+
        </span>
      )}
    </div>
  );
}

export default function TeamCard({ team, isHighlighted }: TeamCardProps) {
  const totalPlayers = 2 + team.roster.length; // Captain + VC + roster

  return (
    <div
      className={`
        rounded-2xl p-4 transition-all duration-500 relative overflow-hidden
        ${isHighlighted
          ? 'scale-[1.02] z-10'
          : 'glass hover:bg-slate-800/90'
        }
      `}
      style={isHighlighted ? {
        backgroundColor: '#0f172a',
        boxShadow: `0 0 40px ${team.color}60, 0 0 80px ${team.color}30`,
        border: `2px solid ${team.color}`,
      } : undefined}
    >
      {/* Celebration shimmer effect when highlighted */}
      {isHighlighted && (
        <>
          {/* Animated glow border */}
          <div
            className="absolute inset-0 rounded-2xl animate-pulse"
            style={{
              background: `linear-gradient(45deg, transparent, ${team.color}40, transparent)`,
              animation: 'shimmer 2s ease-in-out infinite',
            }}
          />
          {/* Corner sparkles */}
          <div
            className="absolute -top-1 -left-1 w-4 h-4 rounded-full animate-ping"
            style={{ backgroundColor: team.color, opacity: 0.6 }}
          />
          <div
            className="absolute -top-1 -right-1 w-4 h-4 rounded-full animate-ping"
            style={{ backgroundColor: team.color, opacity: 0.6, animationDelay: '0.2s' }}
          />
          <div
            className="absolute -bottom-1 -left-1 w-4 h-4 rounded-full animate-ping"
            style={{ backgroundColor: team.color, opacity: 0.6, animationDelay: '0.4s' }}
          />
          <div
            className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full animate-ping"
            style={{ backgroundColor: team.color, opacity: 0.6, animationDelay: '0.6s' }}
          />
          {/* Inner glow */}
          <div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{
              background: `radial-gradient(circle at center, ${team.color}20 0%, transparent 70%)`,
            }}
          />
        </>
      )}
      {/* Team Header */}
      <div className="flex items-center gap-3 mb-3">
        <div 
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg"
          style={{ backgroundColor: team.color }}
        >
          {team.name.split(' ')[1]?.[0] || team.name[0]}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white truncate">{team.name}</h3>
          <p className="text-xs text-slate-400">
            {totalPlayers} players
          </p>
        </div>
        {isHighlighted && (
          <div
            className="text-white text-xs font-bold px-2 py-1 rounded-full animate-bounce"
            style={{ backgroundColor: team.color }}
          >
            SOLD!
          </div>
        )}
      </div>

      {/* Captain & Vice Captain */}
      <div className="space-y-2 mb-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-amber-400 font-medium w-6">C</span>
          {team.captainPlayer?.image ? (
            <img
              src={team.captainPlayer.image}
              alt={team.captain}
              className="w-8 h-8 rounded-md object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-md bg-slate-700 flex items-center justify-center text-[10px] font-semibold text-white">
              {getInitials(team.captain)}
            </div>
          )}
          <span className="text-white font-medium">{team.captain}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-amber-500/80 font-medium w-6">VC</span>
          {team.viceCaptainPlayer?.image ? (
            <img
              src={team.viceCaptainPlayer.image}
              alt={team.viceCaptain}
              className="w-8 h-8 rounded-md object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-md bg-slate-700 flex items-center justify-center text-[10px] font-semibold text-white">
              {getInitials(team.viceCaptain)}
            </div>
          )}
          <span className="text-white font-medium">{team.viceCaptain}</span>
        </div>
      </div>

      {/* Divider */}
      {team.roster.length > 0 && (
        <div className="border-t border-white/10 my-3" />
      )}

      {/* Roster */}
      <div className="space-y-1.5">
        {team.roster.map((player, index) => (
          <div 
            key={player.id}
            className="animate-fade-in-up"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <PlayerBadge player={player} />
          </div>
        ))}
      </div>

      {/* Empty state */}
      {team.roster.length === 0 && (
        <p className="text-xs text-slate-500 italic text-center py-2">
          No players bought yet
        </p>
      )}
    </div>
  );
}
