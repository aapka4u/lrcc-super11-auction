import { Metadata } from 'next';
import { Suspense } from 'react';
import { ALL_PLAYERS } from '@/lib/data';
import PlayerProfile from './PlayerProfile';

function PlayerProfileLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white/50">Loading player...</p>
      </div>
    </div>
  );
}

interface PageProps {
  params: { id: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const player = ALL_PLAYERS.find(p => p.id === params.id);

  if (!player) {
    return {
      title: 'Player Not Found - LRCC Super 11',
      description: 'This player could not be found.',
    };
  }

  const roleEmojiMap: Record<string, string> = {
    Batsman: '🏏',
    Bowler: '🎯',
    'All-rounder': '⚡',
    'WK-Batsman': '🧤',
  };
  const roleEmoji = player.role ? roleEmojiMap[player.role] || '🏏' : '🏏';
  const roleText = player.role || 'Player';

  const title = `${player.name} - LRCC Super 11 Auction`;
  const description = `${roleEmoji} ${roleText} from ${player.club}. Check out ${player.name}'s profile in the LRCC + Super 11 Premier League 2026 auction!`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://draftcast.app/lrccsuper11/player/${params.id}`,
      siteName: 'DraftCast',
      images: [
        {
          url: '/og-image.png',
          width: 1200,
          height: 630,
          alt: `${player.name} - LRCC Super 11 Auction`,
        },
      ],
      locale: 'en_US',
      type: 'profile',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/og-image.png'],
    },
  };
}

export async function generateStaticParams() {
  return ALL_PLAYERS.map((player) => ({
    id: player.id,
  }));
}

export default function PlayerPage() {
  return (
    <Suspense fallback={<PlayerProfileLoader />}>
      <PlayerProfile />
    </Suspense>
  );
}
