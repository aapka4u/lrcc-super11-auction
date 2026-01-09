'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { TEAMS, TEAM_LEADERS, PLAYERS } from '@/lib/data';
import { Player } from '@/lib/types';

// Generate password: vicecaptain name (lowercase, no spaces) + captain name (lowercase, no spaces)
function generateTeamPassword(team: typeof TEAMS[0]): string {
  const vcName = team.viceCaptain.toLowerCase().replace(/\s+/g, '').replace(/[^a-z]/g, '');
  const captainName = team.captain.toLowerCase().replace(/\s+/g, '').replace(/[^a-z]/g, '');
  return vcName + captainName;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

interface TeamProfile {
  logo?: string;
}

interface AuctionState {
  rosters: Record<string, string[]>;
  soldPrices: Record<string, number>;
  teamSpent: Record<string, number>;
}

export default function TeamPage() {
  const params = useParams();
  const teamId = params.teamId as string;
  const team = TEAMS.find(t => t.id === teamId);

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [teamProfile, setTeamProfile] = useState<TeamProfile>({});
  const [auctionState, setAuctionState] = useState<AuctionState | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch auction state
  useEffect(() => {
    const fetchState = async () => {
      try {
        const res = await fetch('/api/state');
        const data = await res.json();
        setAuctionState(data);
        if (data.teamProfiles?.[teamId]) {
          setTeamProfile(data.teamProfiles[teamId]);
        }
      } catch (err) {
        console.error('Failed to fetch state:', err);
      }
    };
    fetchState();
    const interval = setInterval(fetchState, 5000);
    return () => clearInterval(interval);
  }, [teamId]);

  if (!team) {
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

  const correctPassword = generateTeamPassword(team);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.toLowerCase() === correctPassword) {
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Incorrect password');
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      setError('Image must be less than 1MB');
      return;
    }

    setIsUploading(true);
    setError('');

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;

        const res = await fetch('/api/team-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            teamId,
            password,
            logo: base64,
          }),
        });

        if (res.ok) {
          setTeamProfile({ ...teamProfile, logo: base64 });
          setUploadSuccess(true);
          setTimeout(() => setUploadSuccess(false), 3000);
        } else {
          const data = await res.json();
          setError(data.error || 'Failed to upload logo');
        }
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError('Failed to upload logo');
      setIsUploading(false);
    }
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/lrccsuper11/team/${teamId}/card`;
    const shareText = `Check out ${team.name} in the LRCC Super 11 League 2026! 🏏`;

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
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      alert('Link copied to clipboard!');
    }
  };

  // Get roster players
  const rosterPlayerIds = auctionState?.rosters[teamId] || [];
  const rosterPlayers = rosterPlayerIds
    .map(id => PLAYERS.find(p => p.id === id))
    .filter((p): p is Player => p !== undefined);

  // Get captain and VC
  const captain = TEAM_LEADERS.find(p => p.teamId === teamId && p.category === 'CAPTAIN');
  const viceCaptain = TEAM_LEADERS.find(p => p.teamId === teamId && p.category === 'VICE_CAPTAIN');

  const totalPlayers = 2 + rosterPlayers.length;
  const budget = team.budget;
  const spent = auctionState?.teamSpent[teamId] || 0;
  const remaining = budget - spent;

  // Login screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass rounded-2xl p-6 w-full max-w-sm">
          <div className="text-center mb-6">
            <div
              className="w-16 h-16 rounded-xl mx-auto mb-4 flex items-center justify-center text-white font-bold text-2xl"
              style={{ backgroundColor: team.color }}
            >
              {team.name.split(' ')[1]?.[0] || team.name[0]}
            </div>
            <h1 className="text-xl font-bold text-white">{team.name}</h1>
            <p className="text-white/60 text-sm mt-1">Captain & VC Login</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm text-white/70 mb-2">Team Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:outline-none focus:border-white/40"
                autoComplete="off"
              />
              {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
            </div>
            <button
              type="submit"
              className="w-full py-3 rounded-xl font-semibold text-white transition-all"
              style={{ backgroundColor: team.color }}
            >
              Login
            </button>
          </form>

          <p className="text-center text-white/40 text-xs mt-6">
            Password hint: VC name + Captain name (lowercase)
          </p>

          <Link
            href="/lrccsuper11"
            className="block text-center text-white/60 text-sm mt-4 hover:text-white"
          >
            ← Back to Auction
          </Link>
        </div>
      </div>
    );
  }

  // Team management dashboard
  return (
    <div className="min-h-screen p-4 pb-24">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/lrccsuper11" className="text-white/60 hover:text-white">
            ← Back
          </Link>
          <button
            onClick={() => setIsAuthenticated(false)}
            className="text-white/60 hover:text-white text-sm"
          >
            Logout
          </button>
        </div>

        {/* Team Header Card */}
        <div
          className="glass rounded-2xl p-5 mb-4 border-2"
          style={{ borderColor: team.color }}
        >
          <div className="flex items-center gap-4">
            {/* Logo or Placeholder */}
            <div className="relative">
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
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                disabled={isUploading}
              >
                {isUploading ? '...' : '📷'}
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

          {uploadSuccess && (
            <div className="mt-3 text-center text-green-400 text-sm animate-fade-in">
              ✓ Logo uploaded successfully!
            </div>
          )}
          {error && (
            <div className="mt-3 text-center text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Budget Card */}
        <div className="glass rounded-xl p-4 mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-white/60 text-sm">Budget</span>
            <span className="text-white font-mono">{remaining.toLocaleString()} / {budget.toLocaleString()}</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(remaining / budget) * 100}%`,
                backgroundColor: team.color,
              }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-white/40">
            <span>Spent: {spent.toLocaleString()}</span>
            <span>{totalPlayers}/8 players</span>
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
                <span className="text-white font-medium">{captain.name}</span>
              </div>
            )}
            {viceCaptain && (
              <div className="flex items-center gap-3 bg-amber-500/5 rounded-lg px-3 py-2 border border-amber-500/10">
                <span className="text-amber-500/70 font-bold text-xs w-6">VC</span>
                <span className="text-white/90 font-medium">{viceCaptain.name}</span>
              </div>
            )}
          </div>

          {/* Divider */}
          {rosterPlayers.length > 0 && (
            <div className="border-t border-white/10 my-3" />
          )}

          {/* Roster Players */}
          <div className="space-y-2">
            {rosterPlayers.map((player, index) => (
              <div
                key={player.id}
                className="flex items-center justify-between bg-slate-800/50 rounded-lg px-3 py-2"
              >
                <div className="flex items-center gap-3">
                  <span className="text-white/40 text-xs w-4">{index + 1}</span>
                  <span className="text-white">{player.name}</span>
                  {player.category === 'APLUS' && (
                    <span className="text-xs bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">⭐</span>
                  )}
                </div>
                <span className="text-white/60 font-mono text-sm">
                  {auctionState?.soldPrices[player.id]?.toLocaleString() || '-'}
                </span>
              </div>
            ))}
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
          <span>📤</span> Share Team on WhatsApp
        </button>
      </div>
    </div>
  );
}
