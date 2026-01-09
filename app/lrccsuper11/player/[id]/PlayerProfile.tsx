'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ALL_PLAYERS, TEAMS } from '@/lib/data';
import { Player, Team } from '@/lib/types';

// Role icons
const ROLE_ICONS: Record<string, string> = {
  Batsman: '🏏',
  Bowler: '🎯',
  'All-rounder': '⚡',
  'WK-Batsman': '🧤',
};

// Availability labels
const AVAILABILITY_LABELS: Record<string, { label: string; color: string }> = {
  full: { label: 'Full Availability', color: 'text-green-400' },
  till_11: { label: 'Available till 11 AM', color: 'text-amber-400' },
  till_12: { label: 'Available till 12 PM', color: 'text-amber-400' },
  tentative: { label: 'Tentative', color: 'text-red-400' },
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Photo Upload Modal Component
function PhotoUploadModal({
  player,
  onClose,
  onSuccess
}: {
  player: Player;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [nameInput, setNameInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'verify' | 'upload'>('verify');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 1MB)
    if (file.size > 1024 * 1024) {
      setError('Image must be less than 1MB');
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    setSelectedFile(file);
    setError(null);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleVerify = () => {
    // Simple name verification (case-insensitive, trimmed)
    const inputName = nameInput.trim().toLowerCase();
    const playerName = player.name.toLowerCase();

    if (inputName === playerName || inputName === playerName.split(' ')[0].toLowerCase()) {
      setStep('upload');
      setError(null);
    } else {
      setError('Name does not match. Please enter your name exactly as shown.');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !preview) return;

    setIsUploading(true);
    setError(null);

    try {
      const response = await fetch('/api/players/self-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: player.id,
          playerName: player.name,
          verificationName: nameInput,
          image: preview,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Upload failed');
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="glass bg-slate-900/90 border border-white/20 rounded-2xl max-w-md w-full p-6 animate-scale-in">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Update Your Photo</h2>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {step === 'verify' ? (
          <>
            <p className="text-white/70 mb-4">
              To verify it&apos;s you, please enter your name:
            </p>
            <p className="text-lg font-semibold text-white mb-4">
              {player.name}
            </p>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Enter your name"
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-amber-500/50 mb-4"
              onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
            />
            {error && (
              <p className="text-red-400 text-sm mb-4">{error}</p>
            )}
            <button
              onClick={handleVerify}
              className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold py-3 rounded-lg transition-colors"
            >
              Verify & Continue
            </button>
          </>
        ) : (
          <>
            <div className="mb-6">
              {preview ? (
                <div className="relative w-32 h-32 mx-auto rounded-xl overflow-hidden border-4 border-amber-500/50">
                  <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-32 h-32 mx-auto rounded-xl bg-white/10 border-2 border-dashed border-white/30 flex items-center justify-center">
                  <span className="text-white/40 text-sm text-center px-2">
                    Select a photo
                  </span>
                </div>
              )}
            </div>

            <label className="block mb-4">
              <span className="sr-only">Choose photo</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="block w-full text-sm text-white/60 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-amber-500 file:text-black hover:file:bg-amber-600 file:cursor-pointer cursor-pointer"
              />
            </label>

            <p className="text-white/50 text-xs mb-4">
              Max file size: 1MB. Supported formats: JPG, PNG, GIF
            </p>

            {error && (
              <p className="text-red-400 text-sm mb-4">{error}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep('verify')}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold py-3 rounded-lg transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
                className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 disabled:cursor-not-allowed text-black font-semibold py-3 rounded-lg transition-colors"
              >
                {isUploading ? 'Uploading...' : 'Upload Photo'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Share Buttons Component
function ShareButtons({ playerName }: { playerName: string }) {
  const [showToast, setShowToast] = useState(false);

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const shareText = `Check out ${playerName}'s profile in the LRCC Super 11 auction! 🏏`;

  const handleWhatsAppShare = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    }
  };

  return (
    <div className="flex items-center gap-3">
      {showToast && (
        <span className="text-green-400 text-sm animate-fade-in">✓ Copied!</span>
      )}
      <button
        onClick={handleWhatsAppShare}
        className="glass bg-green-600/20 hover:bg-green-600/40 border border-green-500/30 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all"
        title="Share on WhatsApp"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
        WhatsApp
      </button>
      <button
        onClick={handleCopyLink}
        className="glass bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/30 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all"
        title="Copy link"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        Copy Link
      </button>
    </div>
  );
}

interface AuctionState {
  soldPlayers: string[];
  soldPrices: Record<string, number>;
  rosters: Record<string, string[]>;
}

export default function PlayerProfile() {
  const params = useParams();
  const playerId = params.id as string;

  const [player, setPlayer] = useState<Player | null>(null);
  const [playerImage, setPlayerImage] = useState<string | null>(null);
  const [soldToTeam, setSoldToTeam] = useState<Team | null>(null);
  const [soldPrice, setSoldPrice] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const fetchData = useCallback(async () => {
    // Find player from static data
    const foundPlayer = ALL_PLAYERS.find(p => p.id === playerId);
    if (!foundPlayer) {
      setIsLoading(false);
      return;
    }
    setPlayer(foundPlayer);

    // Fetch player image from profiles
    try {
      const profilesRes = await fetch('/api/players');
      if (profilesRes.ok) {
        const data = await profilesRes.json();
        const profile = data.profiles?.[playerId];
        if (profile?.image) {
          setPlayerImage(profile.image);
        }
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }

    // Fetch auction state to check if sold
    try {
      const stateRes = await fetch('/api/state');
      if (stateRes.ok) {
        const state: AuctionState & { teams?: Array<{ id: string; roster: Array<{ id: string }> }> } = await stateRes.json();

        // Check if player is sold
        if (state.soldPlayers?.includes(playerId)) {
          setSoldPrice(state.soldPrices?.[playerId] || null);

          // Find which team bought this player
          for (const [teamId, roster] of Object.entries(state.rosters || {})) {
            if (roster.includes(playerId)) {
              const team = TEAMS.find(t => t.id === teamId);
              if (team) setSoldToTeam(team);
              break;
            }
          }
        }

        // Also check if player is a captain/vice-captain (pre-assigned)
        if (foundPlayer.teamId) {
          const team = TEAMS.find(t => t.id === foundPlayer.teamId);
          if (team) setSoldToTeam(team);
        }
      }
    } catch (err) {
      console.error('Error fetching state:', err);
    }

    setIsLoading(false);
  }, [playerId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUploadSuccess = () => {
    // Refresh data after successful upload
    fetchData();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/50">Loading player...</p>
        </div>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🤷</div>
          <h1 className="text-2xl font-bold text-white mb-2">Player Not Found</h1>
          <p className="text-white/60 mb-6">The player you&apos;re looking for doesn&apos;t exist.</p>
          <Link
            href="/lrccsuper11"
            className="inline-block bg-amber-500 hover:bg-amber-600 text-black font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            Back to Auction
          </Link>
        </div>
      </div>
    );
  }

  const availability = AVAILABILITY_LABELS[player.availability] || AVAILABILITY_LABELS.full;
  const isLeader = player.category === 'CAPTAIN' || player.category === 'VICE_CAPTAIN';
  const isStar = player.category === 'APLUS';

  return (
    <main className="min-h-screen pb-8">
      {/* Upload Modal */}
      {showUploadModal && (
        <PhotoUploadModal
          player={player}
          onClose={() => setShowUploadModal(false)}
          onSuccess={handleUploadSuccess}
        />
      )}

      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link
              href="/lrccsuper11"
              className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Auction
            </Link>
            <Link
              href="/lrccsuper11/players"
              className="text-sm bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition-colors"
            >
              All Players
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Player Card */}
        <div className="glass rounded-2xl border border-white/10 overflow-hidden">
          {/* Sold Banner */}
          {soldToTeam && (
            <div
              className="py-3 px-4 text-center font-bold text-white"
              style={{ backgroundColor: soldToTeam.color }}
            >
              {isLeader ? (
                <span>{player.category === 'CAPTAIN' ? '👑 CAPTAIN' : '⭐ VICE-CAPTAIN'} - {soldToTeam.name}</span>
              ) : (
                <span>🎉 SOLD TO {soldToTeam.name.toUpperCase()} {soldPrice ? `FOR ₹${soldPrice.toLocaleString()}` : ''}</span>
              )}
            </div>
          )}

          <div className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
              {/* Player Image */}
              <div className="relative">
                {playerImage ? (
                  <img
                    src={playerImage}
                    alt={player.name}
                    className="w-40 h-40 md:w-48 md:h-48 rounded-2xl object-cover ring-4 ring-white/20"
                  />
                ) : (
                  <div className="w-40 h-40 md:w-48 md:h-48 rounded-2xl bg-gradient-to-br from-white/20 to-white/5 flex items-center justify-center text-5xl font-bold ring-4 ring-white/20">
                    {getInitials(player.name)}
                  </div>
                )}

                {/* Category Badge */}
                {isStar && (
                  <div className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-xl border-4 border-slate-900">
                    ⭐
                  </div>
                )}
              </div>

              {/* Player Info */}
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-3xl md:text-4xl font-black text-white mb-2">
                  {player.name}
                </h1>

                <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-4">
                  {/* Role */}
                  {player.role && (
                    <span className="bg-white/10 px-3 py-1 rounded-full text-sm text-white/80">
                      {ROLE_ICONS[player.role]} {player.role}
                    </span>
                  )}

                  {/* Club */}
                  <span className="bg-white/10 px-3 py-1 rounded-full text-sm text-white/80">
                    🏟️ {player.club}
                  </span>

                  {/* Category */}
                  {isStar && (
                    <span className="bg-amber-500/20 text-amber-300 px-3 py-1 rounded-full text-sm font-semibold">
                      ⭐ Star Player
                    </span>
                  )}
                </div>

                {/* Availability */}
                <p className={`text-sm ${availability.color} mb-4`}>
                  📅 {availability.label}
                </p>

                {/* Status */}
                {!soldToTeam && (
                  <div className="inline-block bg-green-500/20 border border-green-500/30 text-green-300 px-4 py-2 rounded-lg font-semibold mb-4">
                    ✓ Available for Auction
                  </div>
                )}

                {/* Update Photo Button */}
                <div className="mt-4">
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all mx-auto md:mx-0"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Update My Photo
                  </button>
                </div>
              </div>
            </div>

            {/* Share Section */}
            <div className="mt-8 pt-6 border-t border-white/10">
              <h3 className="text-sm text-white/60 mb-3">Share this profile</h3>
              <ShareButtons playerName={player.name} />
            </div>
          </div>
        </div>

        {/* Back to auction link */}
        <div className="mt-8 text-center">
          <Link
            href="/lrccsuper11"
            className="inline-block bg-amber-500 hover:bg-amber-600 text-black font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            🏏 Watch Live Auction
          </Link>
        </div>
      </div>
    </main>
  );
}
