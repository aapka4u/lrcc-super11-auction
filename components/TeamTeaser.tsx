'use client';

import { useEffect, useRef, useState } from 'react';
import { Team, Player } from '@/lib/types';
import { analyzeTeamComposition, ROLE_ICONS, getCaptainName } from '@/lib/teamAnalysis';

// Sound URL for teaser
const TEASER_SOUND_URL = 'https://assets.mixkit.co/sfx/preview/mixkit-message-pop-alert-2354.mp3';

interface TeamTeaserProps {
  team: Team & {
    roster: Player[];
    captainPlayer?: Player;
    viceCaptainPlayer?: Player;
    spent?: number;
  };
  soldPrices: Record<string, number>;
  biddingDurations: Record<string, number>;
  onDismiss: () => void;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function TeamTeaser({ team, soldPrices, biddingDurations, onDismiss }: TeamTeaserProps) {
  const [isVisible, setIsVisible] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const analysis = analyzeTeamComposition(team, soldPrices, biddingDurations);
  const captainName = getCaptainName(team);
  const totalPlayers = 2 + team.roster.length; // C + VC + roster

  useEffect(() => {
    // Play sound
    try {
      audioRef.current = new Audio(TEASER_SOUND_URL);
      audioRef.current.volume = 0.5;
      audioRef.current.play().catch(() => {});
    } catch (err) {
      console.error('Failed to play teaser sound:', err);
    }

    // Animate in
    setTimeout(() => setIsVisible(true), 50);

    // Auto-dismiss after 5 seconds
    const timeout = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onDismiss, 300); // Wait for fade out animation
    }, 5000);

    return () => {
      clearTimeout(timeout);
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [onDismiss]);

  // Role stats display
  const roleStats = [
    { role: 'Batsman', count: analysis.batsmen, icon: ROLE_ICONS.Batsman },
    { role: 'Bowler', count: analysis.bowlers, icon: ROLE_ICONS.Bowler },
    { role: 'All-rounder', count: analysis.allRounders, icon: ROLE_ICONS['All-rounder'] },
    { role: 'WK-Batsman', count: analysis.wicketKeepers, icon: ROLE_ICONS['WK-Batsman'] },
  ].filter(r => r.count > 0);

  return (
    <div
      className={`fixed inset-0 z-[90] flex items-center justify-center transition-all duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={onDismiss}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Teaser Card */}
      <div
        className={`relative glass rounded-2xl p-6 max-w-md mx-4 border-2 transform transition-all duration-300 ${
          isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
        }`}
        style={{
          borderColor: team.color,
          boxShadow: `0 0 40px ${team.color}40`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Team color accent bar */}
        <div
          className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
          style={{ backgroundColor: team.color }}
        />

        {/* Header */}
        <div className="flex items-center gap-4 mb-4">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg"
            style={{ backgroundColor: team.color }}
          >
            {team.name.split(' ')[1]?.[0] || team.name[0]}
          </div>
          <div className="flex-1">
            <div className="text-xs text-white/50 uppercase tracking-wider">Team Update</div>
            <h3 className="text-xl font-bold text-white">{team.name}</h3>
            <div className="text-sm text-white/70">Captain {captainName}</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-white">{totalPlayers}</div>
            <div className="text-xs text-white/50">players</div>
          </div>
        </div>

        {/* Teaser Message */}
        <div
          className="rounded-xl p-4 mb-4 border"
          style={{
            backgroundColor: `${team.color}15`,
            borderColor: `${team.color}30`,
          }}
        >
          <p className="text-lg font-semibold text-white text-center">
            {analysis.teaserMessage}
          </p>
        </div>

        {/* Role breakdown */}
        <div className="flex justify-center gap-3 mb-4">
          {roleStats.map(({ role, count, icon }) => (
            <div
              key={role}
              className="flex items-center gap-1.5 bg-white/10 rounded-lg px-3 py-1.5"
            >
              <span className="text-lg">{icon}</span>
              <span className="text-white font-semibold">{count}</span>
            </div>
          ))}
        </div>

        {/* Player thumbnails */}
        <div className="flex justify-center gap-2 mb-4">
          {/* Captain */}
          {team.captainPlayer && (
            <div className="relative">
              {team.captainPlayer.image ? (
                <img
                  src={team.captainPlayer.image}
                  alt={team.captainPlayer.name}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-amber-400"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold ring-2 ring-amber-400">
                  {getInitials(team.captainPlayer.name)}
                </div>
              )}
              <span className="absolute -bottom-1 -right-1 text-[10px] bg-amber-500 text-black font-bold px-1 rounded">C</span>
            </div>
          )}

          {/* Vice Captain */}
          {team.viceCaptainPlayer && (
            <div className="relative">
              {team.viceCaptainPlayer.image ? (
                <img
                  src={team.viceCaptainPlayer.image}
                  alt={team.viceCaptainPlayer.name}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-amber-400/60"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold ring-2 ring-amber-400/60">
                  {getInitials(team.viceCaptainPlayer.name)}
                </div>
              )}
              <span className="absolute -bottom-1 -right-1 text-[10px] bg-amber-500/70 text-black font-bold px-1 rounded">VC</span>
            </div>
          )}

          {/* Roster players */}
          {team.roster.slice(0, 4).map((player) => (
            <div key={player.id} className="relative">
              {player.image ? (
                <img
                  src={player.image}
                  alt={player.name}
                  className="w-10 h-10 rounded-full object-cover border-2"
                  style={{ borderColor: team.color }}
                />
              ) : (
                <div
                  className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold border-2"
                  style={{ borderColor: team.color }}
                >
                  {getInitials(player.name)}
                </div>
              )}
              {player.category === 'APLUS' && (
                <span className="absolute -top-1 -right-1 text-[10px]">⭐</span>
              )}
            </div>
          ))}

          {/* More indicator */}
          {team.roster.length > 4 && (
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white/70">
              +{team.roster.length - 4}
            </div>
          )}
        </div>

        {/* Summary line */}
        <div className="text-center">
          <span className="text-sm text-white/50">{analysis.summary}</span>
        </div>

        {/* Dismiss hint */}
        <div className="text-center mt-3">
          <span className="text-xs text-white/30">Tap to dismiss</span>
        </div>
      </div>
    </div>
  );
}
