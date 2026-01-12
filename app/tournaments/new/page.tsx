'use client';

import { lazy, Suspense } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import Link from 'next/link';

// Lazy load wizard for code splitting
const CreateTournamentWizard = lazy(() => 
  import('@/components/CreateTournamentWizard').then(mod => ({ default: mod.CreateTournamentWizard }))
);

function WizardSkeleton() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="glass-elevated rounded-2xl p-8 border border-white/20 animate-pulse">
        <div className="h-8 bg-white/10 rounded-lg mb-6 w-1/3" />
        <div className="space-y-4">
          <div className="h-12 bg-white/10 rounded-xl" />
          <div className="h-12 bg-white/10 rounded-xl" />
          <div className="h-12 bg-white/10 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export default function CreateTournamentPage() {
  return (
    <ErrorBoundary>
      <div className="min-h-screen py-8 px-4 md:px-6">
        {/* Header */}
        <div className="max-w-2xl mx-auto mb-8">
          <Link
            href="/tournaments"
            className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors mb-4"
          >
            ← Back to Tournaments
          </Link>
          <h1 className="text-3xl md:text-4xl font-black text-white mb-2">
            Create Tournament
          </h1>
          <p className="text-white/60">
            Set up your auction in just a few steps
          </p>
        </div>

        {/* Wizard */}
        <Suspense fallback={<WizardSkeleton />}>
          <CreateTournamentWizard />
        </Suspense>
      </div>
    </ErrorBoundary>
  );
}
