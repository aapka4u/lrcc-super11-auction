import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Broadcast Mode - LRCC Super 11 League 2026 | DraftCast',
  description: 'Full-screen broadcast display for the LRCC + Super 11 Premier League 2026 live auction. Perfect for projectors and large displays.',
  alternates: {
    canonical: 'https://draftcast.app/lrccsuper11/broadcast',
  },
  openGraph: {
    title: 'Broadcast Mode - LRCC Super 11 League 2026',
    description: 'Full-screen broadcast display for the LRCC + Super 11 Premier League 2026 live auction',
    url: 'https://draftcast.app/lrccsuper11/broadcast',
    siteName: 'DraftCast',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'LRCC Super 11 League 2026 - Broadcast Mode',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Broadcast Mode - LRCC Super 11 League 2026',
    description: 'Full-screen broadcast display for the LRCC + Super 11 Premier League 2026 live auction',
    images: ['/og-image.png'],
  },
};

export default function BroadcastLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
