import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      {/* Hero Section */}
      <div className="text-center max-w-2xl">
        {/* Logo/Title */}
        <div className="mb-8">
          <h1 className="text-5xl md:text-7xl font-black text-white mb-4 tracking-tight">
            Draft<span className="text-blue-500">Cast</span>
          </h1>
          <p className="text-xl md:text-2xl text-slate-400 font-medium">
            Live Auction Broadcast Platform
          </p>
        </div>

        {/* Description */}
        <p className="text-slate-500 mb-12 text-lg">
          Real-time broadcast for sports drafts and auctions.
          Keep your audience engaged with live updates.
        </p>

        {/* Event Links */}
        <div className="space-y-4">
          <h2 className="text-sm uppercase tracking-wider text-slate-600 font-semibold mb-4">
            Active Events
          </h2>

          <Link
            href="/lrccsuper11"
            className="block glass rounded-xl p-6 hover:bg-slate-800/90 transition-all group border border-slate-700 hover:border-blue-500/50"
          >
            <div className="flex items-center justify-between">
              <div className="text-left">
                <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">
                  LRCC Super 11 League 2026
                </h3>
                <p className="text-slate-500 text-sm mt-1">
                  Cricket Auction • Parkwijk Utrecht
                </p>
              </div>
              <div className="text-3xl group-hover:translate-x-2 transition-transform">
                →
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-8 text-center text-slate-600 text-sm">
        <p>Powered by DraftCast</p>
      </footer>
    </main>
  );
}
