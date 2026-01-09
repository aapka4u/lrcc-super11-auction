import Link from 'next/link';

export default function Home() {
  // Structured data for SEO
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "DraftCast",
    "description": "Real-time broadcast platform for sports drafts and auctions",
    "url": "https://draftcast.app",
    "applicationCategory": "SportsApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 md:p-8 relative overflow-hidden">
      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      {/* Decorative background orbs */}
      <div className="absolute top-1/4 -left-32 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl animate-breathe" />
      <div className="absolute bottom-1/4 -right-32 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl animate-breathe" style={{ animationDelay: '1.5s' }} />

      {/* Hero Section */}
      <div className="text-center max-w-2xl relative z-10">

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

        {/* Event Links */}
        <div className="animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <h2 className="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-4 flex items-center justify-center gap-2">
            <span className="w-8 h-px bg-slate-700" />
            Active Events
            <span className="w-8 h-px bg-slate-700" />
          </h2>

          <Link
            href="/lrccsuper11"
            className="block glass-elevated rounded-2xl p-5 md:p-6 hover:scale-[1.02] transition-all duration-300 group border border-slate-700/50 hover:border-blue-500/50 relative overflow-hidden"
          >
            {/* Gradient hover effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="relative flex items-center justify-between gap-4">
              <div className="text-left flex-1">
                {/* Live badge */}
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

      {/* Footer */}
      <footer className="absolute bottom-6 md:bottom-8 text-center animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
        <p className="text-slate-600 text-sm">
          Powered by <span className="text-slate-500 font-medium">DraftCast</span>
        </p>
      </footer>
    </main>
  );
}
