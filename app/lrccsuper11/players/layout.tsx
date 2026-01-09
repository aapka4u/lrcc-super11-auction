import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'All Players - LRCC Super 11 League 2026 | DraftCast',
  description: 'Complete list of all players in the LRCC + Super 11 Premier League 2026 auction. View player profiles, roles, teams, and auction status.',
  alternates: {
    canonical: 'https://draftcast.app/lrccsuper11/players',
  },
  openGraph: {
    title: 'All Players - LRCC Super 11 League 2026',
    description: 'Complete list of all players in the LRCC + Super 11 Premier League 2026 auction',
    url: 'https://draftcast.app/lrccsuper11/players',
    siteName: 'DraftCast',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'LRCC Super 11 League 2026 - All Players',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'All Players - LRCC Super 11 League 2026',
    description: 'Complete list of all players in the LRCC + Super 11 Premier League 2026 auction',
    images: ['/og-image.png'],
  },
};

export default function PlayersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
