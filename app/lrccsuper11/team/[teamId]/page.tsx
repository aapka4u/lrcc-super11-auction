'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { TEAMS } from '@/lib/data';
import { Player } from '@/lib/types';
import TeamStoryVideo from '@/components/TeamStoryVideo';

interface TeamProfile {
  logo?: string;
}

interface TeamFromAPI {
  id: string;
  name: string;
  color: string;
  captain: string;
  viceCaptain: string;
  budget: number;
  roster: Player[];
  captainPlayer?: Player;
  viceCaptainPlayer?: Player;
  spent?: number;
}

interface APIResponse {
  teams: TeamFromAPI[];
  soldPrices: Record<string, number>;
  teamProfiles?: Record<string, TeamProfile>;
  biddingDurations?: Record<string, number>;
}

// Camera icon component
const CameraIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

export default function TeamPage() {
  const params = useParams();
  const teamId = params.teamId as string;
  const teamStatic = TEAMS.find(t => t.id === teamId);

  const [teamProfile, setTeamProfile] = useState<TeamProfile>({});
  const [apiData, setApiData] = useState<APIResponse | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [showStoryVideo, setShowStoryVideo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch auction state
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

  useEffect(() => {
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

  // Handle logo upload
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      setLogoError('Image must be less than 1MB');
      return;
    }

    setIsUploadingLogo(true);
    setLogoError(null);

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const res = await fetch('/api/team-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ teamId, logo: reader.result }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Upload failed');
        }
        // Refresh state to get new logo
        await fetchState();
      } catch (err) {
        setLogoError(err instanceof Error ? err.message : 'Upload failed');
      } finally {
        setIsUploadingLogo(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/lrccsuper11/team/${teamId}`;
    const shareText = `Check out ${team.name} in the LRCC Super 11 League 2026!`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: team.name,
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        // User cancelled or share failed
      }
    } else {
      navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      alert('Link copied to clipboard!');
    }
  };

  // Get roster players sorted by role from API (with images)
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

  const spent = teamFromAPI?.spent || 0;

  return (
    <div className="min-h-screen p-4 pb-24">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/lrccsuper11" className="text-white/60 hover:text-white">
            ← Back
          </Link>
        </div>

        {/* Team Header Card */}
        <div
          className="glass rounded-2xl p-5 mb-4 border-2"
          style={{ borderColor: team.color }}
        >
          <div className="flex items-center gap-4">
            {/* Logo or Placeholder with Upload */}
            <div className="relative group">
              {teamProfile.logo ? (
                <img
                  src={teamProfile.logo}
                  alt={team.name}
                  className="w-20 h-20 rounded-xl object-cover"
                />
              ) : (
                <div
                  className="w-20 h-20 rounded-xl flex items-center justify-center text-white font-bold text-3xl"
                  style={{ backgroundColor: team.color }}
                >
                  {team.name.split(' ')[1]?.[0] || team.name[0]}
                </div>
              )}
              {/* Upload overlay */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingLogo}
                className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                {isUploadingLogo ? (
                  <span className="text-white text-sm">...</span>
                ) : (
                  <CameraIcon className="w-8 h-8 text-white" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
            </div>

            <div className="flex-1">
              <h1 className="text-xl font-bold text-white">{team.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">
                  C: {team.captain}
                </span>
                <span className="text-xs bg-amber-500/10 text-amber-400/70 px-2 py-0.5 rounded-full">
                  VC: {team.viceCaptain}
                </span>
              </div>
            </div>
          </div>
          {logoError && (
            <p className="text-red-400 text-sm mt-2 text-center">{logoError}</p>
          )}
        </div>

        {/* Share Your Team Section */}
        <div className="glass rounded-xl p-4 mb-4">
          <h2 className="text-white font-semibold mb-3">Share Your Team</h2>
          <div className="grid grid-cols-2 gap-3">
            {/* Team Story Video Button */}
            <button
              onClick={() => setShowStoryVideo(true)}
              className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl border border-purple-500/30 hover:border-purple-400/50 transition-all"
            >
              <span className="text-2xl mb-2">🎬</span>
              <span className="text-white text-sm font-medium">Team Story</span>
              <span className="text-white/50 text-xs">15 sec video</span>
            </button>

            {/* Static Card Button */}
            <Link
              href={`/lrccsuper11/team/${teamId}/card`}
              className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl border border-blue-500/30 hover:border-blue-400/50 transition-all"
            >
              <span className="text-2xl mb-2">🖼️</span>
              <span className="text-white text-sm font-medium">Team Card</span>
              <span className="text-white/50 text-xs">Share image</span>
            </Link>
          </div>
        </div>

        {/* Roster */}
        <div className="glass rounded-xl p-4 mb-4">
          <h2 className="text-white font-semibold mb-3">Squad</h2>

          {/* Captain & VC */}
          <div className="space-y-2 mb-3">
            {captain && (
              <div className="flex items-center gap-3 bg-amber-500/10 rounded-lg px-3 py-2 border border-amber-500/20">
                <span className="text-amber-400 font-bold text-xs w-6">C</span>
                <Link
                  href={`/lrccsuper11/player/${captain.id}`}
                  className="text-white font-medium hover:text-amber-300 transition-colors flex-1"
                >
                  {captain.name}
                </Link>
                <Link
                  href={`/lrccsuper11/player/${captain.id}?upload=true`}
                  className="text-white/30 hover:text-white/70 transition-colors p-1"
                  title="Upload photo"
                >
                  <CameraIcon className="w-4 h-4" />
                </Link>
              </div>
            )}
            {viceCaptain && (
              <div className="flex items-center gap-3 bg-amber-500/5 rounded-lg px-3 py-2 border border-amber-500/10">
                <span className="text-amber-500/70 font-bold text-xs w-6">VC</span>
                <Link
                  href={`/lrccsuper11/player/${viceCaptain.id}`}
                  className="text-white/90 font-medium hover:text-amber-300 transition-colors flex-1"
                >
                  {viceCaptain.name}
                </Link>
                <Link
                  href={`/lrccsuper11/player/${viceCaptain.id}?upload=true`}
                  className="text-white/30 hover:text-white/70 transition-colors p-1"
                  title="Upload photo"
                >
                  <CameraIcon className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>

          {/* Divider */}
          {rosterPlayers.length > 0 && (
            <div className="border-t border-white/10 my-3" />
          )}

          {/* Roster Players */}
          <div className="space-y-2">
            {rosterPlayers.map((player, index) => {
              const roleIcon = player.role === 'Batsman' ? '🏏' :
                               player.role === 'WK-Batsman' ? '🧤' :
                               player.role === 'All-rounder' ? '⚡' :
                               player.role === 'Bowler' ? '🎯' : '';
              return (
                <div
                  key={player.id}
                  className="flex items-center justify-between bg-slate-800/50 rounded-lg px-3 py-2"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-white/40 text-xs w-4">{index + 1}</span>
                    <span className="text-sm w-5">{roleIcon}</span>
                    <Link
                      href={`/lrccsuper11/player/${player.id}`}
                      className="text-white hover:text-amber-300 transition-colors truncate"
                    >
                      {player.name}
                    </Link>
                    {player.category === 'APLUS' && (
                      <span className="text-xs bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">⭐</span>
                    )}
                  </div>
                  <Link
                    href={`/lrccsuper11/player/${player.id}?upload=true`}
                    className="text-white/30 hover:text-white/70 transition-colors p-1"
                    title="Upload photo"
                  >
                    <CameraIcon className="w-4 h-4" />
                  </Link>
                </div>
              );
            })}
          </div>

          {rosterPlayers.length === 0 && (
            <p className="text-white/40 text-sm text-center py-4">
              No players picked yet
            </p>
          )}
        </div>

        {/* Share Button */}
        <button
          onClick={handleShare}
          className="w-full py-4 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all active:scale-98"
          style={{ backgroundColor: team.color }}
        >
          Share Team Link
        </button>
      </div>

      {/* Team Story Video Modal */}
      {showStoryVideo && captain && viceCaptain && (
        <TeamStoryVideo
          team={{
            ...team,
            roster: rosterPlayers,
            captainPlayer: captain,
            viceCaptainPlayer: viceCaptain,
            spent: spent,
          }}
          soldPrices={apiData?.soldPrices || {}}
          biddingDurations={apiData?.biddingDurations || {}}
          onComplete={() => setShowStoryVideo(false)}
        />
      )}
    </div>
  );
}
