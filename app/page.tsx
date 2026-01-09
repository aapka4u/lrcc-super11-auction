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
            ⭐ {remainingAplusCount} A+ remaining
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

  const playHammer = useCallback(() => {
    if (!hammerAudioRef.current || isPlayingRef.current) return;
    isPlayingRef.current = true;
    hammerAudioRef.current.currentTime = 0;
    hammerAudioRef.current.play().catch(() => {});
    setTimeout(() => { isPlayingRef.current = false; }, 1000);
  }, []);

  const playBell = useCallback(() => {
    if (!bellAudioRef.current || isPlayingRef.current) return;
    isPlayingRef.current = true;
    bellAudioRef.current.currentTime = 0;
    bellAudioRef.current.play().catch(() => {});
    setTimeout(() => { isPlayingRef.current = false; }, 1000);
  }, []);

  return { initAudio, isUnlocked, playHammer, playBell };
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
  const [celebratedMilestones, setCelebratedMilestones] = useState<Set<number>>(new Set());
  const [activeMilestone, setActiveMilestone] = useState<number | null>(null);

  // Team teaser state
  const [activeTeaser, setActiveTeaser] = useState<string | null>(null); // teamId
  const lastTeaserSoldCountRef = useRef<number>(0);
  const lastTeasedTeamRef = useRef<string | null>(null);

  // Team story video state
  const [activeStoryVideo, setActiveStoryVideo] = useState<string | null>(null); // teamId
  const storyVideoShownRef = useRef<Set<string>>(new Set()); // Track which teams had their story shown
  const storyTriggerThresholds = useRef<Record<string, number>>({}); // teamId -> threshold (4 or 5)

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
      if (percentage >= milestone && !celebratedMilestones.has(milestone)) {
        // Trigger celebration
        setActiveMilestone(milestone);
        setCelebratedMilestones(prev => new Set(Array.from(prev).concat(milestone)));
        break; // Only celebrate one milestone at a time
      }
    }
  }, [state?.soldCount, state?.totalPlayers, celebratedMilestones]);

  // Team teaser logic - after 10 sold, every 3-4 sales
  useEffect(() => {
    if (!state || state.soldCount < 10) return;
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
      }
    }
  }, [state?.soldCount, activeMilestone, activeTeaser, state?.teams]);

  // Team story video trigger - when team reaches 4-5 picks (randomized per team)
  useEffect(() => {
    if (!state) return;
    if (activeMilestone || activeTeaser || activeStoryVideo) return; // Don't overlap with other overlays

    for (const team of state.teams) {
      // Skip if already shown story for this team
      if (storyVideoShownRef.current.has(team.id)) continue;

      // Assign a random threshold (4 or 5) for this team if not set
      if (!storyTriggerThresholds.current[team.id]) {
        storyTriggerThresholds.current[team.id] = Math.random() < 0.5 ? 4 : 5;
      }

      const threshold = storyTriggerThresholds.current[team.id];
      const totalPlayers = 2 + team.roster.length; // C + VC + roster

      // Trigger when team reaches threshold
      if (totalPlayers >= threshold && team.roster.length >= (threshold - 2)) {
        setActiveStoryVideo(team.id);
        storyVideoShownRef.current = new Set(Array.from(storyVideoShownRef.current).concat(team.id));
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

  return (
    <main className="min-h-screen pb-8">
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

      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-white">
                🏏 LRCC + Super 11 Premier League 2026
              </h1>
              <p className="text-xs text-white/50">
                Live Auction • Parkwijk Utrecht
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/players"
                className="text-sm bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition-colors"
              >
                👥 All Players
              </Link>
              <div className="text-right">
                <div className="text-sm font-semibold text-white/80">
                  {state.soldCount} / {state.totalPlayers}
                </div>
                <div className="text-xs text-white/40">players sold</div>
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

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Auction Status - Featured */}
        <section className="mb-8">
          <AuctionStatus
            status={state.status}
            currentPlayer={state.currentPlayer}
            soldToTeam={state.soldToTeam}
          />

          {/* Mystery Preview - Show when IDLE or after SOLD */}
          {(state.status === 'IDLE' || state.status === 'SOLD') && state.remainingByRole && (
            <div className="mt-4">
              <MysteryPreview
                remainingByRole={state.remainingByRole}
                remainingAplusCount={state.remainingAplusCount || 0}
                totalRemaining={state.totalPlayers - state.soldCount}
              />
            </div>
          )}
        </section>

        {/* Teams Grid */}
        <section>
          <h2 className="text-lg font-semibold text-white/70 mb-4 flex items-center gap-2">
            <span>Teams</span>
            <span className="text-sm font-normal text-white/40">
              (Captain & Vice-Captain pre-assigned)
            </span>
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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

      {/* Footer with connection status */}
      <footer className="fixed bottom-0 left-0 right-0 bg-black/50 backdrop-blur-sm border-t border-white/10 px-4 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-white/40">
          <span>Auto-refreshing every 1s</span>
          <div className="flex items-center gap-3">
            <span className={`flex items-center gap-1 ${isUnlocked ? 'text-green-400' : 'text-white/40'}`}>
              {isUnlocked ? '🔊' : '🔇'} {isUnlocked ? 'Sound on' : 'Click to enable sound'}
            </span>
            <span>Last update: {lastRefresh.toLocaleTimeString()}</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
