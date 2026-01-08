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
    <div className="flex items-center gap-2 bg-white/5 rounded-lg px-2 py-1.5">
      {player.image ? (
        <img
          src={player.image}
          alt={player.name}
          className="w-6 h-6 rounded-full object-cover"
        />
      ) : (
        <div
          className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-semibold"
        >
          {getInitials(player.name)}
        </div>
      )}
      <span className="text-sm text-white/90 truncate">{player.name}</span>
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
        glass rounded-2xl p-4 transition-all duration-500
        ${isHighlighted 
          ? 'ring-2 ring-green-400 shadow-lg shadow-green-400/20 scale-[1.02]' 
          : 'hover:bg-white/10'
        }
      `}
    >
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
          <p className="text-xs text-white/50">
            {totalPlayers} players
          </p>
        </div>
        {isHighlighted && (
          <div className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
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
              className="w-6 h-6 rounded-full object-cover"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-semibold">
              {getInitials(team.captain)}
            </div>
          )}
          <span className="text-white/90">{team.captain}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-amber-400/70 font-medium w-6">VC</span>
          {team.viceCaptainPlayer?.image ? (
            <img
              src={team.viceCaptainPlayer.image}
              alt={team.viceCaptain}
              className="w-6 h-6 rounded-full object-cover"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-semibold">
              {getInitials(team.viceCaptain)}
            </div>
          )}
          <span className="text-white/90">{team.viceCaptain}</span>
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
        <p className="text-xs text-white/30 italic text-center py-2">
          No players bought yet
        </p>
      )}
    </div>
  );
}
