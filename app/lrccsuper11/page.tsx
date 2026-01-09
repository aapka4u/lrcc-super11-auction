'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import confetti from 'canvas-confetti';
import TeamCard from '@/components/TeamCard';
import AuctionStatus from '@/components/AuctionStatus';
import TeamTeaser from '@/components/TeamTeaser';
import TeamStoryVideo from '@/components/TeamStoryVideo';
import { Team, Player, AuctionStatus as Status } from '@/lib/types';

// Milestone thresholds
const MILESTONES = [25, 50, 75, 100];

// Mystery preview messages by role
const MYSTERY_MESSAGES: Record<string, string[]> = {
  Batsman: [
    'A stroke-maker lurks in the shadows... 🏏',
    'Who will be the next run machine? 🏏',
    'A batsman prepares to step up... 🏏',
    'The willow awaits its master... 🏏',
  ],
  Bowler: [
    'A wicket-hunter approaches... 🎯',
    'Who will be the next strike bowler? 🎯',
    'A bowler warms up in the wings... 🎯',
    'Danger incoming for the batsmen... 🎯',
  ],
  'All-rounder': [
    'A complete package emerges... ⚡',
    'Who can do it all? ⚡',
    'An all-rounder steps into the light... ⚡',
    'Versatility personified approaches... ⚡',
  ],
  'WK-Batsman': [
    'A safe pair of hands awaits... 🧤',
    'Who will guard the stumps? 🧤',
    'A keeper-batsman steps forward... 🧤',
    'The last line of defense emerges... 🧤',
  ],
};

const GENERIC_MYSTERY_MESSAGES = [
  'The auction block awaits its next star... ✨',
  'Who will the auctioneer call next? 🎤',
  'A player prepares to find their team... 🏆',
  'The next talent is about to emerge... 💫',
];

// Mystery Preview component
function MysteryPreview({ remainingByRole, remainingAplusCount, totalRemaining }: {
  remainingByRole: Record<string, number>;
  remainingAplusCount: number;
  totalRemaining: number;
}) {
  const [messageIndex, setMessageIndex] = useState(0);

  // Rotate messages every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex(prev => prev + 1);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  if (totalRemaining === 0) {
    return null;
  }

  // Find roles that still have players
  const availableRoles = Object.entries(remainingByRole)
    .filter(([, count]) => count > 0)
    .map(([role]) => role);

  // Pick a random role from available ones based on message index
  const selectedRole = availableRoles[messageIndex % availableRoles.length];
  const roleMessages = selectedRole ? MYSTERY_MESSAGES[selectedRole] : GENERIC_MYSTERY_MESSAGES;
  const message = roleMessages[Math.floor(messageIndex / availableRoles.length) % roleMessages.length];

  // Role icon mapping
  const roleIcons: Record<string, string> = {
    Batsman: '🏏',
    Bowler: '🎯',
    'All-rounder': '⚡',
    'WK-Batsman': '🧤',
  };

  return (
    <div className="glass rounded-xl p-4 border border-purple-500/30 bg-purple-500/5 animate-fade-in">
      <div className="flex items-center gap-3">
        {/* Mystery silhouette */}
        <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-purple-500/30 to-purple-900/30 flex items-center justify-center text-3xl border border-purple-500/20">
          <span className="animate-pulse">❓</span>
        </div>

        <div className="flex-1">
          <div className="text-xs text-purple-300 uppercase tracking-wider font-semibold mb-1">
            Coming Up Next...
          </div>
          <p className="text-white/90 font-medium text-sm md:text-base animate-fade-in" key={messageIndex}>
            {message}
          </p>
        </div>
      </div>

      {/* Role stats ticker */}
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        {Object.entries(remainingByRole).map(([role, count]) => (
          count > 0 && (
            <span
              key={role}
              className="bg-white/5 px-2 py-1 rounded-md text-white/60 border border-white/10"
            >
              {roleIcons[role]} {count} {role}{count > 1 ? 's' : ''}
            </span>
          )
        ))}
        {remainingAplusCount > 0 && (
          <span className="bg-amber-500/20 px-2 py-1 rounded-md text-amber-300 border border-amber-500/30 font-semibold">
            ⭐ {remainingAplusCount} Star remaining
          </span>
        )}
      </div>
    </div>
  );
}

// Milestone celebration overlay component
function MilestoneOverlay({ milestone, onDismiss }: { milestone: number; onDismiss: () => void }) {
  useEffect(() => {
    // Fire confetti burst
    const colors = milestone === 100
      ? ['#FFD700', '#FFA500', '#FF6347', '#00FF00', '#00BFFF']
      : ['#FFD700', '#FFA500', '#00BFFF'];

    // Multiple bursts for bigger celebration
    const burst = () => {
      confetti({
        particleCount: milestone === 100 ? 150 : 80,
        spread: 100,
        origin: { x: 0.5, y: 0.5 },
        colors,
      });
    };

    burst();
    if (milestone >= 50) {
      setTimeout(burst, 200);
    }
    if (milestone === 100) {
      setTimeout(burst, 400);
      setTimeout(burst, 600);
    }

    // Auto dismiss after 3 seconds
    const timeout = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timeout);
  }, [milestone, onDismiss]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md animate-fade-in"
      onClick={onDismiss}
    >
      <div className="text-center animate-scale-in">
        <div className="text-8xl mb-4">
          {milestone === 100 ? '🏆' : milestone === 75 ? '🔥' : milestone === 50 ? '⭐' : '🎯'}
        </div>
        <h2 className="text-5xl md:text-7xl font-black text-white mb-4 drop-shadow-2xl">
          {milestone}% Complete!
        </h2>
        <p className="text-xl md:text-2xl text-white/80">
          {milestone === 100
            ? 'All players sold! Auction Complete!'
            : milestone === 75
              ? 'Final stretch!'
              : milestone === 50
                ? 'Halfway there!'
                : 'Great progress!'}
        </p>
      </div>
    </div>
  );
}

const fetcher = (url: string) => fetch(url, { cache: 'no-store' }).then(res => {
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
});

// Sound URLs - replace with your own if desired
const SOUND_URLS = {
  hammer: 'https://assets.mixkit.co/sfx/preview/mixkit-judge-gavel-hit-530.mp3',
  bell: 'https://assets.mixkit.co/sfx/preview/mixkit-happy-bells-notification-937.mp3',
};

// Custom hook for sound effects with user interaction check
function useSoundEffects() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const hammerAudioRef = useRef<HTMLAudioElement | null>(null);
  const bellAudioRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef(false);
  const audioTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize audio elements on first user interaction
  const initAudio = useCallback(() => {
    if (hammerAudioRef.current) return;

    try {
      hammerAudioRef.current = new Audio(SOUND_URLS.hammer);
      bellAudioRef.current = new Audio(SOUND_URLS.bell);

      // Preload sounds
      hammerAudioRef.current.load();
      bellAudioRef.current.load();

      setIsUnlocked(true);
    } catch (err) {
      console.error('Failed to initialize audio:', err);
    }
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (audioTimeoutRef.current) {
        clearTimeout(audioTimeoutRef.current);
      }
    };
  }, []);

  const playHammer = useCallback(() => {
    if (!hammerAudioRef.current || isPlayingRef.current) return;
    isPlayingRef.current = true;
    hammerAudioRef.current.currentTime = 0;
    hammerAudioRef.current.play().catch((err) => {
      // Audio play failed - non-critical, just log
      console.warn('Failed to play hammer sound:', err);
      isPlayingRef.current = false;
    });
    
    // Clear previous timeout if exists
    if (audioTimeoutRef.current) {
      clearTimeout(audioTimeoutRef.current);
    }
    audioTimeoutRef.current = setTimeout(() => { 
      isPlayingRef.current = false; 
    }, 1000);
  }, []);

  const playBell = useCallback(() => {
    if (!bellAudioRef.current || isPlayingRef.current) return;
    isPlayingRef.current = true;
    bellAudioRef.current.currentTime = 0;
    bellAudioRef.current.play().catch((err) => {
      // Audio play failed - non-critical, just log
      console.warn('Failed to play bell sound:', err);
      isPlayingRef.current = false;
    });
    
    // Clear previous timeout if exists
    if (audioTimeoutRef.current) {
      clearTimeout(audioTimeoutRef.current);
    }
    audioTimeoutRef.current = setTimeout(() => { 
      isPlayingRef.current = false; 
    }, 1000);
  }, []);

  return { initAudio, isUnlocked, playHammer, playBell };
}

// Share Buttons Component
function ShareButtons() {
  const [showToast, setShowToast] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [shareUrl, setShareUrl] = useState('https://draftcast.app/lrccsuper11');

  useEffect(() => {
    // Check if Web Share API is available
    setCanNativeShare(typeof navigator !== 'undefined' && !!navigator.share);
    // Set share URL after mount to avoid SSR hydration issues
    if (typeof window !== 'undefined') {
      setShareUrl(window.location.href);
    }
  }, []);

  const shareText = 'Check out the live cricket auction! 🏏';
  const shareTitle = 'LRCC Super 11 League 2026 - Live Auction';

  const handleNativeShare = async () => {
    try {
      await navigator.share({
        title: shareTitle,
        text: shareText,
        url: shareUrl,
      });
    } catch (err: any) {
      // Only show error if it's not a user cancellation
      if (err.name !== 'AbortError') {
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2000);
      }
      // User cancellation is silent (expected behavior)
    }
  };

  const handleWhatsAppShare = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    } catch (err) {
      // Fallback for older browsers
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
    <>
      {/* Toast notification */}
      {showToast && (
        <div className="fixed bottom-24 right-4 z-50 animate-fade-in">
          <div className="glass bg-green-500/20 border border-green-500/30 text-green-300 px-4 py-2 rounded-lg text-sm font-medium shadow-lg">
            ✓ Link copied!
          </div>
        </div>
      )}

      {/* Share button group */}
      <div className="fixed bottom-16 right-4 z-40 flex flex-col items-end gap-2">
        {/* Expanded buttons */}
        {isExpanded && (
          <div className="flex flex-col gap-2 animate-fade-in">
            {/* WhatsApp */}
            <button
              onClick={handleWhatsAppShare}
              className="glass bg-green-600/20 hover:bg-green-600/40 border border-green-500/30 text-white w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110"
              title="Share on WhatsApp"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </button>

            {/* Copy Link */}
            <button
              onClick={handleCopyLink}
              className="glass bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/30 text-white w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110"
              title="Copy link"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>

            {/* Native Share (if available) */}
            {canNativeShare && (
              <button
                onClick={handleNativeShare}
                className="glass bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/30 text-white w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110"
                title="More share options"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Main share toggle button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`glass ${isExpanded ? 'bg-white/20' : 'bg-amber-500/20 hover:bg-amber-500/40'} border border-amber-500/30 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all hover:scale-105`}
          title={isExpanded ? 'Close' : 'Share'}
        >
          {isExpanded ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          )}
        </button>
      </div>
    </>
  );
}

function PauseCountdown({ pauseUntil }: { pauseUntil: number }) {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      const diff = pauseUntil - now;
      setTimeLeft(Math.max(0, Math.floor(diff / 1000)));
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [pauseUntil]);

  if (timeLeft <= 0) {
    return <p className="text-sm text-amber-200">Resuming soon...</p>;
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <p className="text-xl md:text-2xl font-bold text-white">
      Back in <span className="text-amber-300">{minutes}:{seconds.toString().padStart(2, '0')}</span>
    </p>
  );
}

interface PublicState {
  status: Status;
  currentPlayer: Player | null;
  soldToTeam: Team | null;
  teams: (Team & { roster: Player[]; captainPlayer?: Player; viceCaptainPlayer?: Player; spent?: number })[];
  lastUpdate: number;
  soldCount: number;
  totalPlayers: number;
  pauseMessage?: string;
  pauseUntil?: number;
  remainingByRole?: Record<string, number>;
  remainingAplusCount?: number;
  soldPrices?: Record<string, number>;
  biddingDurations?: Record<string, number>;
}

export default function Home() {
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const { initAudio, isUnlocked, playHammer, playBell } = useSoundEffects();
  const prevStatusRef = useRef<Status | null>(null);
  const celebratedMilestonesRef = useRef<Set<number>>(new Set());
  const [activeMilestone, setActiveMilestone] = useState<number | null>(null);

  // Team teaser state
  const [activeTeaser, setActiveTeaser] = useState<string | null>(null); // teamId
  const lastTeaserSoldCountRef = useRef<number>(0);
  const lastTeasedTeamRef = useRef<string | null>(null);

  // Team story video state
  const [activeStoryVideo, setActiveStoryVideo] = useState<string | null>(null); // teamId
  const storyVideoShownRef = useRef<Set<string>>(new Set()); // Track which teams had their story shown
  const storyTriggerThresholds = useRef<Record<string, number>>({}); // teamId -> threshold (4 or 5)

  // Load persisted state from localStorage on mount
  // Each operation is independent with proper error handling
  useEffect(() => {
    // Load story videos shown
    try {
      const savedShown = localStorage.getItem('draftcast:storyVideosShown');
      if (savedShown) {
        storyVideoShownRef.current = new Set(JSON.parse(savedShown));
      }
    } catch (e) {
      console.error('Failed to load story videos shown', e);
      // Continue with empty set
      storyVideoShownRef.current = new Set();
    }

    // Load trigger thresholds
    try {
      const savedThresholds = localStorage.getItem('draftcast:storyThresholds');
      if (savedThresholds) {
        storyTriggerThresholds.current = JSON.parse(savedThresholds);
      }
    } catch (e) {
      console.error('Failed to load story thresholds', e);
      // Continue with empty object
      storyTriggerThresholds.current = {};
    }

    // Load last teaser count
    try {
      const savedCount = localStorage.getItem('draftcast:lastTeaserCount');
      if (savedCount) {
        const count = parseInt(savedCount, 10);
        if (!isNaN(count)) {
          lastTeaserSoldCountRef.current = count;
        }
      }
    } catch (e) {
      console.error('Failed to load last teaser count', e);
      // Continue with default 0
      lastTeaserSoldCountRef.current = 0;
    }

    // Load last teased team
    try {
      const savedTeam = localStorage.getItem('draftcast:lastTeasedTeam');
      if (savedTeam) {
        lastTeasedTeamRef.current = savedTeam;
      }
    } catch (e) {
      console.error('Failed to load last teased team', e);
      // Continue with null
      lastTeasedTeamRef.current = null;
    }

    // Load celebrated milestones
    try {
      const savedMilestones = localStorage.getItem('draftcast:celebratedMilestones');
      if (savedMilestones) {
        const milestones = JSON.parse(savedMilestones);
        if (Array.isArray(milestones)) {
          celebratedMilestonesRef.current = new Set(milestones);
        }
      }
    } catch (e) {
      console.error('Failed to load milestones', e);
      // Continue with empty set
      celebratedMilestonesRef.current = new Set();
    }
  }, []);

  const { data: state, error: swrError } = useSWR<PublicState>('/api/state', fetcher, {
    refreshInterval: 1000,
    keepPreviousData: true,
    onSuccess: () => setLastRefresh(new Date()),
  });

  // Check for milestone celebrations
  useEffect(() => {
    if (!state || state.totalPlayers === 0) return;

    const percentage = Math.floor((state.soldCount / state.totalPlayers) * 100);

    for (const milestone of MILESTONES) {
      if (percentage >= milestone && !celebratedMilestonesRef.current.has(milestone)) {
        // Trigger celebration
        setActiveMilestone(milestone);
        celebratedMilestonesRef.current.add(milestone);
        // Persist milestones
        localStorage.setItem('draftcast:celebratedMilestones', JSON.stringify(Array.from(celebratedMilestonesRef.current)));
        break; // Only celebrate one milestone at a time
      }
    }
  }, [state?.soldCount, state?.totalPlayers]);

  // Team teaser logic - after 10 sold, every 3-4 sales
  useEffect(() => {
    if (!state || !state.teams || state.soldCount < 10) return;
    if (activeMilestone || activeTeaser) return; // Don't show if milestone or teaser active

    const soldCount = state.soldCount;
    const lastTeaserCount = lastTeaserSoldCountRef.current;

    // Check if we should show a teaser (every 3-4 sales after 10)
    const salesSinceLastTeaser = soldCount - lastTeaserCount;
    const shouldTeaser = salesSinceLastTeaser >= 3 && Math.random() < 0.5; // 50% chance after 3 sales

    if (shouldTeaser || salesSinceLastTeaser >= 4) {
      // Pick a team to feature (rotate, don't repeat last)
      const teamsWithPicks = state.teams.filter(t =>
        t.roster.length >= 1 && // Has at least 1 pick
        t.roster.length < 6 && // Not complete yet
        t.id !== lastTeasedTeamRef.current // Not the same as last
      );

      if (teamsWithPicks.length > 0) {
        // Prefer teams with 2-4 picks for more interesting teasers
        const preferredTeams = teamsWithPicks.filter(t => t.roster.length >= 2 && t.roster.length <= 4);
        const teamPool = preferredTeams.length > 0 ? preferredTeams : teamsWithPicks;
        const randomTeam = teamPool[Math.floor(Math.random() * teamPool.length)];

        setActiveTeaser(randomTeam.id);
        lastTeaserSoldCountRef.current = soldCount;
        lastTeasedTeamRef.current = randomTeam.id;
        
        // Persist teaser state
        localStorage.setItem('draftcast:lastTeaserCount', soldCount.toString());
        localStorage.setItem('draftcast:lastTeasedTeam', randomTeam.id);
      }
    }
  }, [state?.soldCount, state?.teams, activeMilestone, activeTeaser]);

  // Team story video trigger - when team reaches 4-5 picks (randomized per team)
  useEffect(() => {
    if (!state || !state.teams) return;
    if (activeMilestone || activeTeaser || activeStoryVideo) return; // Don't overlap with other overlays

    for (const team of state.teams) {
      // Skip if already shown story for this team
      if (storyVideoShownRef.current.has(team.id)) continue;

      // Assign a random threshold (4 or 5) for this team if not set
      if (!storyTriggerThresholds.current[team.id]) {
        storyTriggerThresholds.current[team.id] = Math.random() < 0.5 ? 4 : 5;
        // Persist threshold
        localStorage.setItem('draftcast:storyThresholds', JSON.stringify(storyTriggerThresholds.current));
      }

      const threshold = storyTriggerThresholds.current[team.id];
      const totalPlayers = 2 + team.roster.length; // C + VC + roster

      // Trigger when team reaches threshold
      if (totalPlayers >= threshold && team.roster.length >= (threshold - 2)) {
        setActiveStoryVideo(team.id);
        storyVideoShownRef.current = new Set(Array.from(storyVideoShownRef.current).concat(team.id));
        // Persist shown videos
        localStorage.setItem('draftcast:storyVideosShown', JSON.stringify(Array.from(storyVideoShownRef.current)));
        break; // Only one video at a time
      }
    }
  }, [state?.teams, activeMilestone, activeTeaser, activeStoryVideo]);

  const dismissMilestone = useCallback(() => {
    setActiveMilestone(null);
  }, []);

  const dismissTeaser = useCallback(() => {
    setActiveTeaser(null);
  }, []);

  const dismissStoryVideo = useCallback(() => {
    setActiveStoryVideo(null);
  }, []);

  // Play sounds on status change
  useEffect(() => {
    if (!state || !isUnlocked) return;

    const prevStatus = prevStatusRef.current;
    const currentStatus = state.status;

    // Play bell when status changes to LIVE
    if (prevStatus !== null && prevStatus !== 'LIVE' && currentStatus === 'LIVE') {
      playBell();
    }

    // Play hammer when status changes to SOLD
    if (prevStatus !== null && prevStatus !== 'SOLD' && currentStatus === 'SOLD') {
      playHammer();
    }

    prevStatusRef.current = currentStatus;
  }, [state?.status, isUnlocked, playBell, playHammer]);

  // Initialize audio on first user interaction
  useEffect(() => {
    const handleInteraction = () => {
      initAudio();
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };

    document.addEventListener('click', handleInteraction);
    document.addEventListener('touchstart', handleInteraction);

    return () => {
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };
  }, [initAudio]);

  const error = swrError ? 'Connection lost. Retrying...' : null;

  if (!state) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/50">Loading auction...</p>
        </div>
      </div>
    );
  }

  // Get the team for active teaser
  const teaserTeam = activeTeaser ? state.teams.find(t => t.id === activeTeaser) : null;

  // Get the team for active story video
  const storyVideoTeam = activeStoryVideo ? state.teams.find(t => t.id === activeStoryVideo) : null;

  // Structured data for SEO
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    "name": "LRCC + Super 11 Premier League 2026",
    "description": "Live cricket player auction for LRCC + Super 11 Premier League 2026",
    "location": {
      "@type": "Place",
      "name": "Parkwijk Utrecht"
    },
    "sport": "Cricket",
    "eventStatus": state?.status === 'LIVE' ? 'https://schema.org/EventScheduled' : 
                   state?.status === 'PAUSED' ? 'https://schema.org/EventPostponed' :
                   'https://schema.org/EventScheduled',
    "organizer": {
      "@type": "Organization",
      "name": "LRCC"
    }
  };

  return (
    <main className="min-h-screen pb-8">
      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      
      {/* Share Buttons - Fixed position */}
      <ShareButtons />

      {/* Milestone Celebration Overlay */}
      {activeMilestone && (
        <MilestoneOverlay milestone={activeMilestone} onDismiss={dismissMilestone} />
      )}

      {/* Team Teaser Overlay */}
      {teaserTeam && state.soldPrices && state.biddingDurations && (
        <TeamTeaser
          team={teaserTeam}
          soldPrices={state.soldPrices}
          biddingDurations={state.biddingDurations}
          onDismiss={dismissTeaser}
        />
      )}

      {/* Team Story Video Overlay */}
      {storyVideoTeam && state.soldPrices && state.biddingDurations && (
        <TeamStoryVideo
          team={storyVideoTeam}
          soldPrices={state.soldPrices}
          biddingDurations={state.biddingDurations}
          onComplete={dismissStoryVideo}
        />
      )}

      {/* Header - Mobile-first sticky nav */}
      <header className="sticky top-0 z-50 glass border-b border-white/10 safe-area-inset-top">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3">
          <div className="flex items-center justify-between gap-2">
            {/* Logo & Title - Compact on mobile */}
            <div className="flex-1 min-w-0">
              <h1 className="text-base sm:text-lg md:text-xl font-bold text-white truncate">
                🏏 LRCC + Super 11
              </h1>
              <p className="text-[10px] sm:text-xs text-white/50 truncate">
                Live Auction • Utrecht
              </p>
            </div>

            {/* Progress indicator - Always visible */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* All Players link - Icon only on mobile */}
              <Link
                href="/lrccsuper11/players"
                className="touch-target bg-white/10 hover:bg-white/20 active:bg-white/25 text-white px-2.5 sm:px-3 py-2 rounded-xl transition-colors text-sm font-medium"
              >
                <span className="hidden sm:inline">👥 All</span>
                <span className="sm:hidden">👥</span>
              </Link>

              {/* Sold counter - Compact pill */}
              <div className="bg-white/10 rounded-xl px-3 py-1.5 text-center">
                <div className="text-sm sm:text-base font-bold text-white tabular-nums">
                  {state.soldCount}<span className="text-white/40">/{state.totalPlayers}</span>
                </div>
                <div className="text-[9px] sm:text-[10px] text-white/40 uppercase tracking-wider">sold</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Error Banner - Prominent and Sticky */}
      {error && (
        <div className="sticky top-0 z-50 bg-red-600/90 backdrop-blur-md border-b-2 border-red-500 px-4 py-3 text-center shadow-lg">
          <p className="text-base font-semibold text-red-100 flex items-center justify-center gap-2">
            <span className="text-xl">⚠️</span>
            {error}
          </p>
        </div>
      )}

      {/* Pause Banner - Very Prominent */}
      {state.status === 'PAUSED' && (
        <div className="sticky top-0 z-50 bg-amber-600/95 backdrop-blur-md border-b-4 border-amber-400 px-4 py-6 text-center shadow-xl">
          <div className="max-w-4xl mx-auto">
            <div className="text-4xl mb-3 animate-pulse">⏸️</div>
            <h2 className="text-2xl md:text-3xl font-black text-white mb-2 uppercase tracking-wider">
              Auction Paused
            </h2>
            <p className="text-lg md:text-xl text-amber-100 font-semibold mb-3">
              {state.pauseMessage || 'We will be back shortly.'}
            </p>
            {state.pauseUntil && (
              <PauseCountdown pauseUntil={state.pauseUntil} />
            )}
          </div>
        </div>
      )}

      {/* Main content - Optimized padding for mobile */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-16">
        {/* Auction Status - Featured */}
        <section className="mb-5 sm:mb-8">
          <AuctionStatus
            status={state.status}
            currentPlayer={state.currentPlayer}
            soldToTeam={state.soldToTeam}
          />

          {/* Mystery Preview - Show when IDLE or after SOLD */}
          {(state.status === 'IDLE' || state.status === 'SOLD') && state.remainingByRole && (
            <div className="mt-3 sm:mt-4">
              <MysteryPreview
                remainingByRole={state.remainingByRole}
                remainingAplusCount={state.remainingAplusCount || 0}
                totalRemaining={state.totalPlayers - state.soldCount}
              />
            </div>
          )}
        </section>

        {/* Teams Grid - Mobile optimized */}
        <section>
          <h2 className="text-base sm:text-lg font-semibold text-white/70 mb-3 sm:mb-4 flex items-center gap-2">
            <span>Teams</span>
            <span className="text-xs sm:text-sm font-normal text-white/40">
              (C & VC pre-assigned)
            </span>
          </h2>

          {/* 2-column on mobile for better overview, 3 on larger screens */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
            {state.teams.map((team) => (
              <TeamCard
                key={team.id}
                team={team}
                isHighlighted={state.status === 'SOLD' && state.soldToTeam?.id === team.id}
              />
            ))}
          </div>
        </section>
      </div>

      {/* Footer - Mobile optimized with safe area */}
      <footer className="fixed bottom-0 left-0 right-0 bg-black/60 backdrop-blur-md border-t border-white/10 px-3 sm:px-4 py-2 safe-area-inset-bottom">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-[10px] sm:text-xs text-white/50">
          {/* Connection indicator */}
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            <span className="hidden sm:inline">Live</span>
          </div>

          {/* Sound status - Touch friendly */}
          <button
            onClick={initAudio}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors ${
              isUnlocked ? 'text-green-400' : 'text-white/40 hover:text-white/60 active:bg-white/10'
            }`}
          >
            {isUnlocked ? '🔊' : '🔇'}
            <span className="hidden sm:inline">{isUnlocked ? 'Sound on' : 'Tap for sound'}</span>
          </button>

          {/* Last update - Compact on mobile */}
          <span className="tabular-nums">
            <span className="hidden sm:inline">Updated </span>
            {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </footer>
    </main>
  );
}
