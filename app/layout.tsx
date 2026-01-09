import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: 'DraftCast - Live Auction Broadcast',
  description: 'Real-time broadcast platform for sports drafts and auctions',
  metadataBase: new URL('https://draftcast.app'),
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
  alternates: {
    canonical: 'https://draftcast.app',
  },
  openGraph: {
    title: 'DraftCast - Live Auction Broadcast',
    description: 'Real-time broadcast platform for sports drafts and auctions',
    url: 'https://draftcast.app',
    siteName: 'DraftCast',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'DraftCast - Live Auction Broadcast Platform',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DraftCast - Live Auction Broadcast',
    description: 'Real-time broadcast platform for sports drafts and auctions',
    images: ['/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen text-white antialiased">
        {children}
      </body>
    </html>
  );
}
