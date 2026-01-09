import type { Metadata } from 'next';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export const metadata: Metadata = {
  title: 'LRCC Super 11 League 2026 - Live Auction',
  description: 'Watch the live cricket player auction for LRCC + Super 11 Premier League 2026. Real-time bidding, team rosters, and more!',
  alternates: {
    canonical: 'https://draftcast.app/lrccsuper11',
  },
  openGraph: {
    title: 'LRCC Super 11 League 2026 - Live Auction',
    description: 'Watch the live cricket player auction for LRCC + Super 11 Premier League 2026. Real-time bidding, team rosters, and more!',
    url: 'https://draftcast.app/lrccsuper11',
    siteName: 'DraftCast',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'LRCC Super 11 League 2026 - Live Auction',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LRCC Super 11 League 2026 - Live Auction',
    description: 'Watch the live cricket player auction for LRCC + Super 11 Premier League 2026',
    images: ['/og-image.png'],
  },
};

export default function LRCCSuper11Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}
