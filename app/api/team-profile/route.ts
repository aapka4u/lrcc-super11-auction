import { storage as kv } from '@/lib/storage';
import { NextRequest, NextResponse } from 'next/server';
import { TEAMS } from '@/lib/data';

const TEAM_PROFILES_KEY = 'team:profiles';

interface TeamProfile {
  logo?: string;
  updatedAt?: number;
}

// GET - fetch all team profiles
export async function GET() {
  try {
    const profiles = await kv.get<Record<string, TeamProfile>>(TEAM_PROFILES_KEY) || {};
    return NextResponse.json(profiles);
  } catch (error) {
    console.error('Failed to fetch team profiles:', error);
    return NextResponse.json({});
  }
}

// POST - update team profile (logo upload) - No authentication required
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { teamId, logo } = body;

    // Validate team exists
    const team = TEAMS.find(t => t.id === teamId);
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Validate logo size (base64 string)
    if (logo && logo.length > 1.5 * 1024 * 1024) { // ~1MB after base64 encoding
      return NextResponse.json({ error: 'Logo must be less than 1MB' }, { status: 400 });
    }

    // Get existing profiles
    const profiles = await kv.get<Record<string, TeamProfile>>(TEAM_PROFILES_KEY) || {};

    // Update team profile
    profiles[teamId] = {
      ...profiles[teamId],
      logo,
      updatedAt: Date.now(),
    };

    // Save to KV
    await kv.set(TEAM_PROFILES_KEY, profiles);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update team profile:', error);
    return NextResponse.json({ error: 'Update failed. Please try again' }, { status: 500 });
  }
}
