'use client';

export function TournamentCardSkeleton() {
  return (
    <div className="glass-elevated rounded-2xl p-4 md:p-6 border border-slate-700/50 animate-pulse">
      <div className="flex items-start gap-4">
        {/* Logo skeleton */}
        <div className="w-16 h-16 rounded-xl bg-white/10 flex-shrink-0" />
        
        {/* Content skeleton */}
        <div className="flex-1 min-w-0">
          {/* Title skeleton */}
          <div className="h-6 bg-white/10 rounded-lg mb-2 w-3/4" />
          
          {/* Status badge skeleton */}
          <div className="h-5 bg-white/10 rounded-full w-20 mb-3" />
          
          {/* Metadata skeleton */}
          <div className="space-y-2">
            <div className="h-4 bg-white/10 rounded w-1/2" />
            <div className="h-4 bg-white/10 rounded w-2/3" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function TournamentCardSkeletonList({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <TournamentCardSkeleton key={i} />
      ))}
    </>
  );
}
