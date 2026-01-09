'use client';

import { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { Team, Player } from '@/lib/types';
import { analyzeTeamComposition, ROLE_ICONS, getCaptainName } from '@/lib/teamAnalysis';

// Sound URLs
const SOUND_URLS = {
  intro: 'https://assets.mixkit.co/sfx/preview/mixkit-epic-impact-afar-explosion-2782.mp3',
  transition: 'https://assets.mixkit.co/sfx/preview/mixkit-fast-small-sweep-transition-166.mp3',
  success: 'https://assets.mixkit.co/sfx/preview/mixkit-winning-chimes-2015.mp3',
};

interface TeamStoryVideoProps {
  team: Team & {
    roster: Player[];
    captainPlayer?: Player;
    viceCaptainPlayer?: Player;
    spent?: number;
  };
  soldPrices: Record<string, number>;
  biddingDurations: Record<string, number>;
  onComplete: () => void;
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function TeamStoryVideo({ team, soldPrices, biddingDurations, onComplete }: TeamStoryVideoProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const analysis = analyzeTeamComposition(team, soldPrices, biddingDurations);
  const captainName = getCaptainName(team);
  const totalPlayers = 2 + team.roster.length;

  // All players for display
  const allPlayers: (Player & { label?: string })[] = [];
  if (team.captainPlayer) allPlayers.push({ ...team.captainPlayer, label: 'C' });
  if (team.viceCaptainPlayer) allPlayers.push({ ...team.viceCaptainPlayer, label: 'VC' });
  team.roster.forEach(p => allPlayers.push(p));

  // Slide timing (milliseconds)
  const SLIDE_DURATIONS = [2500, 3500, 3500, 3000, 2500]; // Total: 15 seconds
  const TOTAL_SLIDES = 5;

  useEffect(() => {
    // Play intro sound and fire confetti
    try {
      audioRef.current = new Audio(SOUND_URLS.intro);
      audioRef.current.volume = 0.4;
      audioRef.current.play().catch(() => {});
    } catch (err) {
      console.error('Failed to play intro sound:', err);
    }

    // Fire confetti on start
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { x: 0.5, y: 0.3 },
      colors: [team.color, '#ffffff', '#ffd700'],
    });

    // Animate in
    setTimeout(() => setIsVisible(true), 50);

    // Slide progression
    let slideIndex = 0;
    const advanceSlide = () => {
      slideIndex++;
      if (slideIndex >= TOTAL_SLIDES) {
        // End video
        setIsVisible(false);
        setTimeout(onComplete, 300);
      } else {
        setCurrentSlide(slideIndex);
        // Play transition sound
        try {
          const transSound = new Audio(SOUND_URLS.transition);
          transSound.volume = 0.2;
          transSound.play().catch(() => {});
        } catch {}

        // Schedule next slide
        setTimeout(advanceSlide, SLIDE_DURATIONS[slideIndex]);
      }
    };

    // Start first slide timer
    const firstTimeout = setTimeout(advanceSlide, SLIDE_DURATIONS[0]);

    return () => {
      clearTimeout(firstTimeout);
      if (audioRef.current) audioRef.current.pause();
    };
  }, [onComplete, team.color]);

  // Play success sound on final slide
  useEffect(() => {
    if (currentSlide === TOTAL_SLIDES - 1) {
      try {
        const successSound = new Audio(SOUND_URLS.success);
        successSound.volume = 0.3;
        successSound.play().catch(() => {});
      } catch {}

      // Extra confetti on final slide
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { x: 0.5, y: 0.5 },
        colors: [team.color, '#ffffff', '#ffd700', '#00ff00'],
      });
    }
  }, [currentSlide, team.color]);

  // Generate story highlights
  const storyHighlights: string[] = [];
  if (analysis.longestBid && analysis.longestBid.duration >= 30) {
    const mins = Math.floor(analysis.longestBid.duration / 60);
    const secs = analysis.longestBid.duration % 60;
    storyHighlights.push(
      mins > 0
        ? `Fought ${mins}m ${secs}s for ${analysis.longestBid.playerName}!`
        : `Battled ${secs}s for ${analysis.longestBid.playerName}!`
    );
  }
  if (analysis.aplusCount >= 2) {
    storyHighlights.push(`${analysis.aplusCount} premium A+ players secured!`);
  }
  if (analysis.lrccCount >= 4) {
    storyHighlights.push('LRCC reunion squad assembled!');
  } else if (analysis.super11Count >= 4) {
    storyHighlights.push('Super11 takeover complete!');
  }
  if (analysis.budgetRemaining > team.budget * 0.3) {
    storyHighlights.push(`Budget master - saved ${Math.round((analysis.budgetRemaining / team.budget) * 100)}%!`);
  }
  if (storyHighlights.length === 0) {
    storyHighlights.push('Strategic picks throughout!');
  }

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center transition-all duration-500 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Backdrop with team color gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, ${team.color}40 0%, #000000 50%, ${team.color}20 100%)`,
        }}
      />
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />

      {/* Video Container */}
      <div className="relative w-full max-w-2xl mx-4">
        {/* Progress bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full transition-all duration-500"
            style={{
              width: `${((currentSlide + 1) / TOTAL_SLIDES) * 100}%`,
              backgroundColor: team.color,
            }}
          />
        </div>

        {/* Slide Content */}
        <div className="mt-4">
          {/* SLIDE 1: Celebration Header */}
          {currentSlide === 0 && (
            <div className="text-center animate-scale-in py-12">
              <div
                className="inline-block w-24 h-24 rounded-full mb-6 flex items-center justify-center text-4xl font-black text-white shadow-2xl"
                style={{ backgroundColor: team.color }}
              >
                {team.name.split(' ')[1]?.[0] || team.name[0]}
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-white mb-4 drop-shadow-2xl">
                {team.name}
              </h1>
              <div
                className="inline-block px-6 py-2 rounded-full text-xl font-bold text-white"
                style={{ backgroundColor: team.color }}
              >
                SQUAD {totalPlayers >= 6 ? 'COMPLETE!' : 'UPDATE!'}
              </div>
            </div>
          )}

          {/* SLIDE 2: Team Lineup */}
          {currentSlide === 1 && (
            <div className="animate-fade-in py-8">
              <h2 className="text-2xl font-bold text-white text-center mb-6">THE SQUAD</h2>
              <div className="grid grid-cols-4 gap-4 justify-items-center">
                {allPlayers.map((player, index) => (
                  <div
                    key={player.id}
                    className="text-center animate-fade-in-up"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="relative inline-block mb-2">
                      {player.image ? (
                        <img
                          src={player.image}
                          alt={player.name}
                          className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover border-3"
                          style={{ borderColor: team.color }}
                        />
                      ) : (
                        <div
                          className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/20 flex items-center justify-center text-lg font-bold border-3"
                          style={{ borderColor: team.color }}
                        >
                          {getInitials(player.name)}
                        </div>
                      )}
                      {player.label && (
                        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-xs bg-amber-500 text-black font-bold px-2 rounded">
                          {player.label}
                        </span>
                      )}
                      {player.category === 'APLUS' && (
                        <span className="absolute -top-1 -right-1 text-lg">⭐</span>
                      )}
                    </div>
                    <div className="text-white text-xs md:text-sm font-medium truncate max-w-[80px]">
                      {player.name.split(' ')[0]}
                    </div>
                    <div className="text-lg">{ROLE_ICONS[player.role || ''] || ''}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SLIDE 3: Role Breakdown */}
          {currentSlide === 2 && (
            <div className="animate-fade-in py-8 text-center">
              <h2 className="text-2xl font-bold text-white mb-6">TEAM COMPOSITION</h2>
              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-6">
                {[
                  { icon: ROLE_ICONS.Batsman, label: 'Batsmen', count: analysis.batsmen },
                  { icon: ROLE_ICONS.Bowler, label: 'Bowlers', count: analysis.bowlers },
                  { icon: ROLE_ICONS['All-rounder'], label: 'All-rounders', count: analysis.allRounders },
                  { icon: ROLE_ICONS['WK-Batsman'], label: 'Keepers', count: analysis.wicketKeepers },
                ].map(({ icon, label, count }) => (
                  <div
                    key={label}
                    className="glass rounded-xl p-4 border"
                    style={{ borderColor: `${team.color}50` }}
                  >
                    <div className="text-3xl mb-1">{icon}</div>
                    <div className="text-2xl font-bold text-white">{count}</div>
                    <div className="text-xs text-white/60">{label}</div>
                  </div>
                ))}
              </div>
              <div className="text-white/70 text-sm">
                {analysis.aplusCount > 0 && (
                  <span className="inline-flex items-center gap-1 bg-amber-500/20 px-3 py-1 rounded-full mr-2">
                    ⭐ {analysis.aplusCount} A+ Players
                  </span>
                )}
              </div>
            </div>
          )}

          {/* SLIDE 4: The Story */}
          {currentSlide === 3 && (
            <div className="animate-fade-in py-8 text-center">
              <h2 className="text-2xl font-bold text-white mb-6">THE STORY</h2>
              <div className="space-y-4 max-w-md mx-auto">
                {storyHighlights.map((highlight, index) => (
                  <div
                    key={index}
                    className="glass rounded-xl p-4 border animate-fade-in-up"
                    style={{
                      borderColor: `${team.color}50`,
                      animationDelay: `${index * 200}ms`,
                    }}
                  >
                    <p className="text-lg text-white font-medium">{highlight}</p>
                  </div>
                ))}
                {analysis.strengths.length > 0 && (
                  <div className="text-green-400 flex items-center justify-center gap-2 mt-4">
                    <span>Strengths:</span>
                    <span className="font-semibold">{analysis.strengths[0]}</span>
                  </div>
                )}
                {analysis.needs.length > 0 && totalPlayers < 8 && (
                  <div className="text-yellow-400 flex items-center justify-center gap-2">
                    <span>Still needs:</span>
                    <span className="font-semibold">{analysis.needs[0]}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SLIDE 5: Team Rating */}
          {currentSlide === 4 && (
            <div className="animate-scale-in py-8 text-center">
              <h2 className="text-2xl font-bold text-white mb-6">SQUAD RATING</h2>
              <div
                className="inline-block w-32 h-32 rounded-full flex items-center justify-center mb-4"
                style={{
                  background: `conic-gradient(${team.color} ${analysis.rating * 10}%, transparent 0%)`,
                }}
              >
                <div className="w-28 h-28 rounded-full bg-black/80 flex flex-col items-center justify-center">
                  <span className="text-4xl font-black text-white">{analysis.rating}</span>
                  <span className="text-xs text-white/60">/10</span>
                </div>
              </div>
              <div
                className="text-2xl font-bold mb-4"
                style={{ color: team.color }}
              >
                {analysis.summary}
              </div>
              <div className="text-white/60 text-sm">
                Captain {captainName}&apos;s vision coming together!
              </div>
            </div>
          )}
        </div>

        {/* Skip button */}
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(onComplete, 300);
          }}
          className="absolute bottom-4 right-4 text-white/50 hover:text-white text-sm transition-colors"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
