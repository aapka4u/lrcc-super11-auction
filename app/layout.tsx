import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LRCC + Super 11 Premier League 2026',
  description: 'Live Auction Display Board',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
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
