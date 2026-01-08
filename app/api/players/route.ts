import { kv } from '@vercel/kv';
import { NextRequest, NextResponse } from 'next/server';
import { PlayerProfile } from '@/lib/types';
import { ADMIN_PIN, ALL_PLAYERS } from '@/lib/data';

const PROFILES_KEY = 'player:profiles';

// GET: Fetch all player profiles
export async function GET() {
  try {
    const profiles = await kv.get<Record<string, PlayerProfile>>(PROFILES_KEY) || {};

    // Merge static player data with dynamic profiles
    const playersWithProfiles = ALL_PLAYERS.map(player => ({
      ...player,
      image: profiles[player.id]?.image || player.image,
      cricHeroesUrl: profiles[player.id]?.cricHeroesUrl || player.cricHeroesUrl,
    }));

    return NextResponse.json({
      players: playersWithProfiles,
      profiles
    });
  } catch (error) {
    console.error('Error fetching player profiles:', error);
    return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 });
  }
}

// POST: Update a player profile (admin only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pin, playerId, image, cricHeroesUrl } = body;

    // Verify admin PIN
    if (pin !== ADMIN_PIN) {
      return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 });
    }

    // Validate player exists
    const playerExists = ALL_PLAYERS.find(p => p.id === playerId);
    if (!playerExists) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    // Get current profiles
    const profiles = await kv.get<Record<string, PlayerProfile>>(PROFILES_KEY) || {};

    // Update profile
    profiles[playerId] = {
      playerId,
      image: image || profiles[playerId]?.image,
      cricHeroesUrl: cricHeroesUrl !== undefined ? cricHeroesUrl : profiles[playerId]?.cricHeroesUrl,
      updatedAt: Date.now(),
    };

    // Save back to KV
    await kv.set(PROFILES_KEY, profiles);

    return NextResponse.json({
      success: true,
      profile: profiles[playerId]
    });
  } catch (error) {
    console.error('Error updating player profile:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}

// DELETE: Remove a player's image or profile data (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { pin, playerId, field } = body; // field can be 'image' or 'cricHeroesUrl' or 'all'

    // Verify admin PIN
    if (pin !== ADMIN_PIN) {
      return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 });
    }

    // Get current profiles
    const profiles = await kv.get<Record<string, PlayerProfile>>(PROFILES_KEY) || {};

    if (!profiles[playerId]) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (field === 'all') {
      delete profiles[playerId];
    } else if (field === 'image') {
      delete profiles[playerId].image;
    } else if (field === 'cricHeroesUrl') {
      delete profiles[playerId].cricHeroesUrl;
    }

    await kv.set(PROFILES_KEY, profiles);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting player profile:', error);
    return NextResponse.json({ error: 'Failed to delete profile' }, { status: 500 });
  }
}
