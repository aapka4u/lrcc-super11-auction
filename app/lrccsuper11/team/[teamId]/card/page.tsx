'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { TEAMS } from '@/lib/data';
import { Player } from '@/lib/types';

interface TeamProfile {
  logo?: string;
}

interface TeamFromAPI {
  id: string;
  name: string;
  color: string;
  captain: string;
  viceCaptain: string;
  roster: Player[];
  captainPlayer?: Player;
  viceCaptainPlayer?: Player;
}

interface APIResponse {
  teams: TeamFromAPI[];
  soldPrices: Record<string, number>;
  teamProfiles?: Record<string, TeamProfile>;
}

function getRoleIcon(role?: string): string {
  switch (role) {
    case 'Batsman': return '🏏';
    case 'Bowler': return '🎯';
    case 'All-rounder': return '⚡';
    case 'WK-Batsman': return '🧤';
    default: return '🏏';
  }
}

export default function TeamCardPage() {
  const params = useParams();
  const teamId = params.teamId as string;
  const teamStatic = TEAMS.find(t => t.id === teamId);

  const [apiData, setApiData] = useState<APIResponse | null>(null);
  const [teamProfile, setTeamProfile] = useState<TeamProfile>({});

  useEffect(() => {
    const fetchState = async () => {
      try {
        const res = await fetch('/api/state');
        const data = await res.json();
        setApiData(data);
        if (data.teamProfiles?.[teamId]) {
          setTeamProfile(data.teamProfiles[teamId]);
        }
      } catch (err) {
        console.error('Failed to fetch state:', err);
      }
    };
    fetchState();
  }, [teamId]);

  if (!teamStatic) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Team Not Found</h1>
          <Link href="/lrccsuper11" className="text-blue-400 hover:underline">
            Back to Auction
          </Link>
        </div>
      </div>
    );
  }

  // Get team from API response (has roster with images)
  const teamFromAPI = apiData?.teams?.find(t => t.id === teamId);
  const team = teamFromAPI || teamStatic;

  // Get roster players sorted by role: Batsman/WK-Batsman -> All-rounder -> Bowler
  const roleOrder: Record<string, number> = {
    'Batsman': 1,
    'WK-Batsman': 2,
    'All-rounder': 3,
    'Bowler': 4,
  };

  const rosterPlayers = (teamFromAPI?.roster || [])
    .slice()
    .sort((a, b) => (roleOrder[a.role || ''] || 99) - (roleOrder[b.role || ''] || 99));

  // Get captain and VC from API (with images)
  const captain = teamFromAPI?.captainPlayer;
  const viceCaptain = teamFromAPI?.viceCaptainPlayer;

  const totalPlayers = 2 + rosterPlayers.length;

  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareText = `🏏 ${team.name}\n\nLRCC Super 11 League 2026\n\n👨‍✈️ Captain: ${team.captain}\n🎖️ Vice Captain: ${team.viceCaptain}\n\n👥 Squad: ${totalPlayers} players`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: team.name,
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        // User cancelled
      }
    } else {
      navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
      alert('Copied to clipboard!');
    }
  };

  return (
    <div className="min-h-screen p-4 pb-24">
      <div className="max-w-md mx-auto">
        {/* Back Link */}
        <Link href="/lrccsuper11" className="inline-flex items-center text-white/60 hover:text-white mb-4">
          ← Back to Auction
        </Link>

        {/* Team Card */}
        <div
          className="rounded-2xl overflow-hidden border-2"
          style={{
            borderColor: team.color,
            background: `linear-gradient(135deg, ${team.color}20 0%, rgba(15, 23, 42, 0.95) 50%)`,
          }}
        >
          {/* Header with gradient */}
          <div
            className="p-6 text-center relative"
            style={{
              background: `linear-gradient(180deg, ${team.color}40 0%, transparent 100%)`,
            }}
          >
            {/* Logo */}
            <div className="inline-block mb-4">
              {teamProfile.logo ? (
                <img
                  src={teamProfile.logo}
                  alt={team.name}
                  className="w-24 h-24 rounded-2xl object-cover ring-4 ring-white/20 shadow-2xl"
                />
              ) : (
                <div
                  className="w-24 h-24 rounded-2xl flex items-center justify-center text-white font-black text-4xl ring-4 ring-white/20 shadow-2xl"
                  style={{ backgroundColor: team.color }}
                >
                  {team.name.split(' ')[1]?.[0] || team.name[0]}
                </div>
              )}
            </div>

            <h1 className="text-2xl font-black text-white mb-2">{team.name}</h1>

            {/* Captain & VC badges */}
            <div className="flex items-center justify-center gap-2">
              <span className="text-sm bg-amber-500/30 text-amber-200 px-3 py-1 rounded-full font-medium">
                👨‍✈️ {team.captain}
              </span>
              <span className="text-sm bg-amber-500/20 text-amber-300/80 px-3 py-1 rounded-full font-medium">
                🎖️ {team.viceCaptain}
              </span>
            </div>
          </div>

          {/* Player Count */}
          <div className="px-6 py-3 text-center border-t border-white/10">
            <span className="text-white/60 text-sm">{totalPlayers} Players</span>
          </div>

          {/* Squad List */}
          <div className="px-6 py-4 border-t border-white/10">
            <h2 className="text-white/60 text-xs uppercase tracking-wider mb-3">Squad</h2>

            <div className="space-y-2">
              {/* Captain */}
              {captain && (
                <div className="flex items-center gap-3 bg-amber-500/15 rounded-xl px-3 py-2.5">
                  <span className="w-6 h-6 rounded-lg bg-amber-500/30 flex items-center justify-center text-amber-300 text-xs font-bold">C</span>
                  <span className="text-white font-medium flex-1">{captain.name}</span>
                  <span className="text-white/40 text-sm">{getRoleIcon(captain.role)}</span>
                </div>
              )}

              {/* Vice Captain */}
              {viceCaptain && (
                <div className="flex items-center gap-3 bg-amber-500/10 rounded-xl px-3 py-2.5">
                  <span className="w-6 h-6 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400/80 text-xs font-bold">VC</span>
                  <span className="text-white/90 font-medium flex-1">{viceCaptain.name}</span>
                  <span className="text-white/40 text-sm">{getRoleIcon(viceCaptain.role)}</span>
                </div>
              )}

              {/* Roster players */}
              {rosterPlayers.map((player, index) => (
                <div key={player.id} className="flex items-center gap-3 bg-white/5 rounded-xl px-3 py-2.5">
                  <span className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-white/50 text-xs">
                    {index + 1}
                  </span>
                  <span className="text-sm">{getRoleIcon(player.role)}</span>
                  <span className="text-white font-medium flex-1">{player.name}</span>
                  {player.category === 'APLUS' && (
                    <span className="text-amber-400 text-sm">⭐</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-black/20 text-center">
            <p className="text-white/40 text-xs">LRCC + Super 11 Premier League 2026</p>
            <p className="text-white/30 text-xs mt-1">draftcast.app</p>
          </div>
        </div>

        {/* Share Button */}
        <button
          onClick={handleShare}
          className="w-full mt-4 py-4 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all active:scale-98"
          style={{ backgroundColor: team.color }}
        >
          <span>📤</span> Share on WhatsApp
        </button>
      </div>
    </div>
  );
}
