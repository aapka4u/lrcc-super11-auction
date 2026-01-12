'use client';

import Link from 'next/link';
import { TournamentIndexEntry, TournamentStatus } from '@/lib/tournament-types';
import Image from 'next/image';

interface TournamentCardProps {
  tournament: TournamentIndexEntry;
  showStatus?: boolean;
  showActions?: boolean;
  onClick?: () => void;
  variant?: 'default' | 'compact' | 'featured';
}

function getStatusBadge(status: TournamentStatus, published: boolean) {
  if (!published) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-500/20 border border-slate-500/30 text-slate-400 text-xs font-semibold">
        Draft
      </span>
    );
  }

  switch (status) {
    case 'active':
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          Live
        </span>
      );
    case 'completed':
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/20 border border-green-500/30 text-green-400 text-xs font-semibold">
          Completed
        </span>
      );
    case 'lobby':
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-400 text-xs font-semibold">
          Upcoming
        </span>
      );
    default:
      return null;
  }
}

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
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function TournamentCard({
  tournament,
  showStatus = true,
  showActions = false,
  onClick,
  variant = 'default',
}: TournamentCardProps) {
  const cardContent = (
    <div
      className={`
        glass-elevated rounded-2xl p-4 md:p-6 border border-slate-700/50 
        hover:border-blue-500/50 transition-all duration-300
        group cursor-pointer
        ${variant === 'featured' ? 'ring-2 ring-blue-500/30' : ''}
        ${variant === 'compact' ? 'p-3' : ''}
      `}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`View tournament: ${tournament.name}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      <div className="flex items-start gap-4">
        {/* Logo */}
        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 flex-shrink-0 flex items-center justify-center overflow-hidden">
          {tournament.logo ? (
            <Image
              src={tournament.logo}
              alt={`${tournament.name} logo`}
              width={64}
              height={64}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-xl font-bold text-white/80">
              {getInitials(tournament.name)}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title and Status */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="text-lg md:text-xl font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-2">
              {tournament.name}
            </h3>
            {showStatus && getStatusBadge(tournament.status, tournament.published)}
          </div>

          {/* Metadata */}
          <div className="space-y-1 text-sm text-slate-400">
            {tournament.sport && (
              <div className="flex items-center gap-1">
                <span>🏏</span>
                <span>{tournament.sport}</span>
              </div>
            )}
            {tournament.location && (
              <div className="flex items-center gap-1">
                <span>📍</span>
                <span className="truncate">{tournament.location}</span>
              </div>
            )}
            {tournament.startDate && (
              <div className="flex items-center gap-1">
                <span>📅</span>
                <span>{formatDate(tournament.startDate)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Arrow */}
        <div className="text-2xl text-slate-600 group-hover:text-blue-400 group-hover:translate-x-1 transition-all flex-shrink-0">
          →
        </div>
      </div>
    </div>
  );

  if (onClick) {
    return cardContent;
  }

  return (
    <Link href={`/tournaments/${tournament.id}`} className="block">
      {cardContent}
    </Link>
  );
}
