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
    <div className="flex items-center gap-2.5 bg-slate-800/70 backdrop-blur-sm rounded-xl px-2.5 py-2 border border-white/5">
      {player.image ? (
        <img
          src={player.image}
          alt={player.name}
          className="w-9 h-9 rounded-lg object-cover ring-1 ring-white/10"
        />
      ) : (
        <div
          className="w-9 h-9 rounded-lg bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-[11px] font-semibold text-white/90"
        >
          {getInitials(player.name)}
        </div>
      )}
      <span className="text-sm text-white truncate font-medium flex-1 min-w-0">{player.name}</span>
      {player.category === 'APLUS' && (
        <span className="text-xs bg-amber-500/25 text-amber-300 px-1.5 py-0.5 rounded-md font-medium shrink-0">
          ⭐
        </span>
      )}
    </div>
  );
}

export default function TeamCard({ team, isHighlighted }: TeamCardProps) {
  const totalPlayers = 2 + team.roster.length; // Captain + VC + roster
  const maxPlayers = 8; // Total team size
  const progressPercent = (totalPlayers / maxPlayers) * 100;

  return (
    <div
      className={`
        rounded-2xl p-3.5 sm:p-4 transition-all duration-500 relative overflow-hidden
        ${isHighlighted
          ? 'z-10'
          : 'glass'
        }
      `}
      style={isHighlighted ? {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        boxShadow: `0 0 40px ${team.color}50, 0 0 80px ${team.color}25`,
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
      {/* Team Header - Mobile optimized */}
      <div className="flex items-center gap-2.5 sm:gap-3 mb-3">
        <div
          className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg shrink-0"
          style={{ backgroundColor: team.color }}
        >
          {team.name.split(' ')[1]?.[0] || team.name[0]}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white truncate text-sm sm:text-base leading-tight">{team.name}</h3>
          {/* Progress bar */}
          <div className="mt-1.5 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progressPercent}%`,
                  backgroundColor: team.color,
                }}
              />
            </div>
            <span className="text-[10px] sm:text-xs text-white/50 font-medium tabular-nums shrink-0">
              {totalPlayers}/{maxPlayers}
            </span>
          </div>
        </div>
        {isHighlighted && (
          <div
            className="text-white text-[10px] sm:text-xs font-bold px-2 py-1 rounded-lg animate-bounce shrink-0"
            style={{ backgroundColor: team.color }}
          >
            NEW!
          </div>
        )}
      </div>

      {/* Captain & Vice Captain - Compact for mobile */}
      <div className="space-y-1.5 mb-3">
        <div className="flex items-center gap-2 bg-amber-500/10 rounded-lg px-2 py-1.5 border border-amber-500/20">
          <span className="text-amber-400 font-bold text-xs w-5 shrink-0">C</span>
          {team.captainPlayer?.image ? (
            <img
              src={team.captainPlayer.image}
              alt={team.captain}
              className="w-7 h-7 rounded-md object-cover ring-1 ring-amber-500/30"
            />
          ) : (
            <div className="w-7 h-7 rounded-md bg-slate-700 flex items-center justify-center text-[10px] font-semibold text-white">
              {getInitials(team.captain)}
            </div>
          )}
          <span className="text-white font-medium text-sm truncate">{team.captain}</span>
        </div>
        <div className="flex items-center gap-2 bg-amber-500/5 rounded-lg px-2 py-1.5 border border-amber-500/10">
          <span className="text-amber-500/70 font-bold text-xs w-5 shrink-0">VC</span>
          {team.viceCaptainPlayer?.image ? (
            <img
              src={team.viceCaptainPlayer.image}
              alt={team.viceCaptain}
              className="w-7 h-7 rounded-md object-cover ring-1 ring-amber-500/20"
            />
          ) : (
            <div className="w-7 h-7 rounded-md bg-slate-700 flex items-center justify-center text-[10px] font-semibold text-white">
              {getInitials(team.viceCaptain)}
            </div>
          )}
          <span className="text-white/90 font-medium text-sm truncate">{team.viceCaptain}</span>
        </div>
      </div>

      {/* Roster - with subtle divider */}
      {team.roster.length > 0 && (
        <>
          <div className="border-t border-white/5 my-2.5" />
          <div className="space-y-1.5">
            {team.roster.map((player, index) => (
              <div
                key={player.id}
                className="animate-slide-up"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <PlayerBadge player={player} />
              </div>
            ))}
          </div>
        </>
      )}

      {/* Empty state - Friendlier message */}
      {team.roster.length === 0 && (
        <div className="text-center py-3 opacity-60">
          <p className="text-xs text-slate-400">
            Waiting for picks...
          </p>
        </div>
      )}
    </div>
  );
}
