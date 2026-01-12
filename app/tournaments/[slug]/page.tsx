'use client';

import { useParams } from 'next/navigation';
import { SWRConfig } from 'swr';
import { swrConfig } from '@/lib/swr-config';
import { getTournament } from '@/lib/api/tournaments';
import { Tournament } from '@/lib/tournament-types';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { TournamentCardSkeleton } from '@/components/TournamentCardSkeleton';
import { useToast, ToastContainer } from '@/components/Toast';
import { shareTournament, getTournamentUrl } from '@/lib/utils/share';
import useSWR from 'swr';
import Link from 'next/link';
import Image from 'next/image';

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(timestamp?: number): string {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function getStatusBadge(status: Tournament['status'], published: boolean) {
  if (!published) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-500/20 border border-slate-500/30 text-slate-400 text-sm font-semibold">
        Draft
      </span>
    );
  }

  switch (status) {
    case 'active':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-semibold">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          Live Now
        </span>
      );
    case 'completed':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/20 border border-green-500/30 text-green-400 text-sm font-semibold">
          Completed
        </span>
      );
    case 'lobby':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-400 text-sm font-semibold">
          Upcoming
        </span>
      );
    default:
      return null;
  }
}

function TournamentViewContent() {
  const params = useParams();
  const slug = (params?.slug as string) || '';
  const toastHook = useToast();
  const { toasts, dismissToast } = toastHook;

  const { data, error, isLoading } = useSWR<{ tournament: Tournament }>(
    slug ? `/api/tournaments/${slug}` : null,
    async () => {
      const tournament = await getTournament(slug);
      if (!tournament) {
        throw new Error('Tournament not found');
      }
      return { tournament };
    }
  );

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-8">
        <TournamentCardSkeleton />
      </div>
    );
  }

  if (error || !data?.tournament) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="glass-elevated rounded-2xl p-8 border border-red-500/30 text-center max-w-md">
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="text-2xl font-bold text-white mb-2">Tournament Not Found</h1>
          <p className="text-white/60 mb-6">
            The tournament you're looking for doesn't exist or has been removed.
          </p>
          <Link
            href="/tournaments"
            className="min-h-[44px] inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Browse tournaments"
          >
            Browse Tournaments
          </Link>
        </div>
      </div>
    );
  }

  const tournament = data.tournament;

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <div className="glass-elevated border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-8">
          <Link
            href="/tournaments"
            className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors mb-6"
          >
            ← Back to Tournaments
          </Link>

          <div className="flex items-start gap-6">
            {/* Logo */}
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 flex-shrink-0 flex items-center justify-center overflow-hidden">
              {tournament.logo ? (
                <Image
                  src={tournament.logo}
                  alt={`${tournament.name} logo`}
                  width={96}
                  height={96}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-3xl font-bold text-white/80">
                  {getInitials(tournament.name)}
                </span>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4 mb-3">
                <h1 className="text-3xl md:text-4xl font-black text-white">
                  {tournament.name}
                </h1>
                {getStatusBadge(tournament.status, tournament.published)}
              </div>

              {tournament.description && (
                <p className="text-white/70 mb-4">{tournament.description}</p>
              )}

              <div className="flex flex-wrap gap-4 text-sm text-white/60">
                {tournament.sport && (
                  <div className="flex items-center gap-2">
                    <span>🏏</span>
                    <span>{tournament.sport}</span>
                  </div>
                )}
                {tournament.location && (
                  <div className="flex items-center gap-2">
                    <span>📍</span>
                    <span>{tournament.location}</span>
                  </div>
                )}
                {tournament.startDate && (
                  <div className="flex items-center gap-2">
                    <span>📅</span>
                    <span>{formatDate(tournament.startDate)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-8">
        <div className="glass-elevated rounded-2xl p-6 border border-white/20">
          <h2 className="text-xl font-bold text-white mb-4">Tournament Actions</h2>
          <div className="flex flex-wrap gap-4">
            {tournament.published ? (
              <Link
                href={`/${tournament.id}`}
                className="min-h-[44px] px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-xl font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="View auction"
              >
                View Auction
              </Link>
            ) : (
              <div className="px-6 py-3 bg-slate-500/20 text-slate-400 rounded-xl font-semibold">
                Tournament Not Published
              </div>
            )}
            <Link
              href={`/tournaments/${tournament.id}/admin`}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl font-semibold transition-colors"
            >
              Admin Panel
            </Link>
            <button
              onClick={async () => {
                const url = getTournamentUrl(tournament.id);
                const success = await shareTournament(url, tournament.name);
                if (success) {
                  toastHook.success('Tournament link copied to clipboard!');
                } else {
                  toastHook.error('Failed to share tournament');
                }
              }}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl font-semibold transition-colors"
            >
              Share
            </button>
          </div>
        </div>
      </div>

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default function TournamentPage() {
  return (
    <SWRConfig value={swrConfig}>
      <ErrorBoundary>
        <TournamentViewContent />
      </ErrorBoundary>
    </SWRConfig>
  );
}
