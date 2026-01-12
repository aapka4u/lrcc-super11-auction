'use client';

import Link from 'next/link';
import { SWRConfig } from 'swr';
import { swrConfig } from '@/lib/swr-config';
import { getTournaments } from '@/lib/api/tournaments';
import { TournamentCard } from '@/components/TournamentCard';
import { TournamentIndexEntry } from '@/lib/tournament-types';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import useSWR from 'swr';

function HomeContent() {
  const { data, isLoading } = useSWR<{ tournaments: TournamentIndexEntry[]; count: number }>(
    '/api/tournaments',
    async () => {
      const tournaments = await getTournaments();
      return { tournaments, count: tournaments.length };
    },
    {
      revalidateOnFocus: false,
    }
  );

  // Get featured tournaments (up to 3, published and active/lobby)
  const featuredTournaments = data?.tournaments
    .filter((t) => t.published && (t.status === 'active' || t.status === 'lobby'))
    .slice(0, 3) || [];

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 md:p-8 relative overflow-hidden">
      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            name: 'DraftCast',
            description: 'Real-time broadcast platform for sports drafts and auctions',
            url: 'https://draftcast.app',
            applicationCategory: 'SportsApplication',
            operatingSystem: 'Web',
            offers: {
              '@type': 'Offer',
              price: '0',
              priceCurrency: 'USD',
            },
          }),
        }}
      />

      {/* Decorative background orbs */}
      <div className="absolute top-1/4 -left-32 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl animate-breathe" />
      <div className="absolute bottom-1/4 -right-32 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl animate-breathe" style={{ animationDelay: '1.5s' }} />

      {/* Hero Section */}
      <div className="text-center max-w-4xl relative z-10 w-full">
        {/* Title */}
        <div className="mb-6 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <h1 className="text-5xl md:text-7xl font-black text-white mb-3 tracking-tight">
            Draft<span className="bg-gradient-to-r from-blue-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">Cast</span>
          </h1>
          <p className="text-xl md:text-2xl font-semibold bg-gradient-to-r from-slate-300 to-slate-400 bg-clip-text text-transparent">
            Live Auction Broadcast Platform
          </p>
        </div>

        {/* Description */}
        <p className="text-slate-600 mb-10 text-lg font-medium animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          Real-time broadcast for sports drafts and auctions.<br className="hidden md:block" />
          Keep your audience engaged with live updates.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <Link
            href="/tournaments"
            className="min-h-[44px] px-8 py-4 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl font-semibold transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Browse all tournaments"
          >
            Browse All Tournaments
          </Link>
          <Link
            href="/tournaments/new"
            className="min-h-[44px] px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-xl font-semibold transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Create new tournament"
          >
            Create Tournament
          </Link>
        </div>

        {/* Active Events */}
        <div className="animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
          <h2 className="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-4 flex items-center justify-center gap-2">
            <span className="w-8 h-px bg-slate-700" />
            Active Events
            <span className="w-8 h-px bg-slate-700" />
          </h2>

          {isLoading && (
            <div className="text-white/60 text-sm">Loading tournaments...</div>
          )}

          {!isLoading && featuredTournaments.length === 0 && (
            <div className="glass-elevated rounded-2xl p-6 border border-slate-700/50">
              <p className="text-white/60 mb-4">No active tournaments at the moment</p>
              <Link
                href="/tournaments/new"
                className="min-h-[44px] inline-block px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-xl font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Create first tournament"
              >
                Create First Tournament
              </Link>
            </div>
          )}

          {!isLoading && featuredTournaments.length > 0 && (
            <div className="space-y-4">
              {featuredTournaments.map((tournament) => (
                <TournamentCard key={tournament.id} tournament={tournament} variant="featured" />
              ))}
              {data && data.count > 3 && (
                <Link
                  href="/tournaments"
                  className="block text-center text-white/60 hover:text-white transition-colors mt-4"
                >
                  View all {data.count} tournaments →
                </Link>
              )}
            </div>
          )}

          {/* Legacy LRCC Link (keep for backward compatibility) */}
          <div className="mt-8">
            <Link
              href="/lrccsuper11"
              className="block glass-elevated rounded-2xl p-5 md:p-6 hover:scale-[1.02] transition-all duration-300 group border border-slate-700/50 hover:border-blue-500/50 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative flex items-center justify-between gap-4">
                <div className="text-left flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      LIVE TODAY
                    </span>
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold text-white group-hover:text-blue-400 transition-colors flex items-center gap-2">
                    <span>🏏</span>
                    LRCC Super 11 League 2026
                  </h3>
                  <p className="text-slate-400 text-sm mt-1.5">
                    Cricket Auction • Parkwijk Utrecht
                  </p>
                </div>
                <div className="text-3xl text-slate-600 group-hover:text-blue-400 group-hover:translate-x-1 transition-all">
                  →
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-6 md:bottom-8 text-center animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
        <p className="text-slate-600 text-sm">
          Powered by <span className="text-slate-500 font-medium">DraftCast</span>
        </p>
      </footer>
    </main>
  );
}

export default function Home() {
  return (
    <SWRConfig value={swrConfig}>
      <ErrorBoundary>
        <HomeContent />
      </ErrorBoundary>
    </SWRConfig>
  );
}
