import { MetadataRoute } from 'next';
import { ALL_PLAYERS } from '@/lib/data';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://draftcast.app';
  
  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/lrccsuper11`,
      lastModified: new Date(),
      changeFrequency: 'always',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/lrccsuper11/players`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/lrccsuper11/broadcast`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.7,
    },
    // Dynamic player pages
    ...ALL_PLAYERS.map(player => ({
      url: `${baseUrl}/lrccsuper11/player/${player.id}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
  ];
}
