import { storage as kv } from '@/lib/storage';
import { NextRequest, NextResponse } from 'next/server';
import { PlayerProfile } from '@/lib/types';
import { ALL_PLAYERS } from '@/lib/data';

const PROFILES_KEY = 'player:profiles';

// POST: Self-upload photo with name verification (no PIN required)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { playerId, playerName, verificationName, image } = body;

    // Validate required fields
    if (!playerId || !verificationName || !image) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate player exists
    const player = ALL_PLAYERS.find(p => p.id === playerId);
    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    // Verify name matches (case-insensitive, allow first name only)
    const inputName = verificationName.trim().toLowerCase();
    const actualName = player.name.toLowerCase();
    const firstName = actualName.split(' ')[0];

    if (inputName !== actualName && inputName !== firstName) {
      return NextResponse.json({ error: 'Name verification failed' }, { status: 403 });
    }

    // Validate image (must be base64 data URL)
    if (!image.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Invalid image format' }, { status: 400 });
    }

    // Check image size (rough estimate - base64 is ~33% larger than original)
    // 1MB limit = ~1.33MB base64
    const base64Size = image.length * 0.75; // Approximate original size
    if (base64Size > 1024 * 1024) {
      return NextResponse.json({ error: 'Image too large (max 1MB)' }, { status: 400 });
    }

    // Get current profiles
    const profiles = await kv.get<Record<string, PlayerProfile>>(PROFILES_KEY) || {};

    // Update profile with new image
    profiles[playerId] = {
      playerId,
      image: image,
      cricHeroesUrl: profiles[playerId]?.cricHeroesUrl,
      updatedAt: Date.now(),
    };

    // Save back to KV
    await kv.set(PROFILES_KEY, profiles);

    return NextResponse.json({
      success: true,
      message: 'Photo updated successfully'
    });
  } catch (error) {
    console.error('Error in self-upload:', error);
    return NextResponse.json({ error: 'Upload failed. Please try again' }, { status: 500 });
  }
}
