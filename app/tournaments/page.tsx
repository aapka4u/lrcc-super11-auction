'use client';

import { useState, useMemo } from 'react';
import { SWRConfig } from 'swr';
import { swrConfig } from '@/lib/swr-config';
import { getTournaments } from '@/lib/api/tournaments';
import { TournamentCard } from '@/components/TournamentCard';
import { TournamentCardSkeletonList } from '@/components/TournamentCardSkeleton';
import { FloatingActionButton } from '@/components/FloatingActionButton';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { TournamentIndexEntry } from '@/lib/tournament-types';
import useSWR from 'swr';

function TournamentListContent() {
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data, error, isLoading, mutate } = useSWR<{ tournaments: TournamentIndexEntry[]; count: number }>(
    '/api/tournaments',
    async () => {
      const tournaments = await getTournaments();
      return { tournaments, count: tournaments.length };
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  // Filter tournaments by search query
  const filteredTournaments = useMemo(() => {
    if (!data?.tournaments) return [];
    if (!searchQuery.trim()) return data.tournaments;

    const query = searchQuery.toLowerCase();
    return data.tournaments.filter(
      (tournament) =>
        tournament.name.toLowerCase().includes(query) ||
        tournament.id.toLowerCase().includes(query) ||
        tournament.location?.toLowerCase().includes(query) ||
        tournament.sport?.toLowerCase().includes(query)
    );
  }, [data?.tournaments, searchQuery]);

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 glass-elevated border-b border-white/10 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-4">
          <h1 className="text-2xl md:text-3xl font-black text-white mb-4">
            Tournaments
          </h1>
          
          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tournaments..."
              className="w-full min-h-[48px] px-4 py-3 pl-10 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Search tournaments"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">🔍</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6">
        {isLoading && (
          <div className="space-y-4">
            <TournamentCardSkeletonList count={6} />
          </div>
        )}

        {error && (
          <div className="glass-elevated rounded-2xl p-8 border border-red-500/30 text-center">
            <p className="text-red-400 font-semibold mb-4">Failed to load tournaments</p>
            <p className="text-white/60 text-sm mb-6">
              {error instanceof Error ? error.message : 'An error occurred'}
            </p>
            <button
              onClick={() => mutate()}
              className="min-h-[44px] px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Retry loading tournaments"
            >
              Try Again
            </button>
          </div>
        )}

        {!isLoading && !error && filteredTournaments.length === 0 && (
          <div className="glass-elevated rounded-2xl p-12 border border-white/20 text-center">
            <div className="text-6xl mb-4">🏏</div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {searchQuery ? 'No tournaments found' : 'No tournaments yet'}
            </h2>
            <p className="text-white/60 mb-6">
              {searchQuery
                ? 'Try adjusting your search terms'
                : 'Be the first to create a tournament!'}
            </p>
            {!searchQuery && (
              <a
                href="/tournaments/new"
                className="min-h-[44px] inline-block px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-xl font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Create new tournament"
              >
                Create Tournament
              </a>
            )}
          </div>
        )}

        {!isLoading && !error && filteredTournaments.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTournaments.map((tournament) => (
              <TournamentCard key={tournament.id} tournament={tournament} />
            ))}
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <FloatingActionButton
        href="/tournaments/new"
        aria-label="Create new tournament"
      />
    </div>
  );
}

export default function TournamentsPage() {
  return (
    <SWRConfig value={swrConfig}>
      <ErrorBoundary>
        <TournamentListContent />
      </ErrorBoundary>
    </SWRConfig>
  );
}
