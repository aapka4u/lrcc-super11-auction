import { kv } from '@vercel/kv';
import { NextRequest, NextResponse } from 'next/server';
import { AuctionState, Player, PlayerProfile } from '@/lib/types';
import { getInitialState, ADMIN_PIN, PLAYERS, TEAMS, TEAM_LEADERS, getTeamById } from '@/lib/data';

const STATE_KEY = 'auction:state';
const PROFILES_KEY = 'player:profiles';

// Helper to find player from both auction pool and team leaders
const findPlayer = (id: string): Player | undefined =>
  PLAYERS.find(p => p.id === id) || TEAM_LEADERS.find(p => p.id === id);

// Helper to merge player with profile image from KV
const mergeProfile = (player: Player, profiles: Record<string, PlayerProfile>): Player => ({
  ...player,
  image: profiles[player.id]?.image || player.image,
  cricHeroesUrl: profiles[player.id]?.cricHeroesUrl || player.cricHeroesUrl,
});

// GET: Fetch current state (public)
export async function GET() {
  try {
    // Fetch auction state and player profiles in parallel
    const [state, profiles] = await Promise.all([
      kv.get<AuctionState>(STATE_KEY),
      kv.get<Record<string, PlayerProfile>>(PROFILES_KEY),
    ]);

    let auctionState = state;
    if (!auctionState) {
      auctionState = getInitialState();
      await kv.set(STATE_KEY, auctionState);
    }

    const playerProfiles = profiles || {};

    // Build public response with team rosters and captain/VC player objects
    const teamsWithRosters = TEAMS.map(team => {
      // Find captain and VC player objects
      const captainPlayer = TEAM_LEADERS.find(p => p.teamId === team.id && p.category === 'CAPTAIN');
      const viceCaptainPlayer = TEAM_LEADERS.find(p => p.teamId === team.id && p.category === 'VICE_CAPTAIN');

      return {
        ...team,
        captainPlayer: captainPlayer ? mergeProfile(captainPlayer, playerProfiles) : undefined,
        viceCaptainPlayer: viceCaptainPlayer ? mergeProfile(viceCaptainPlayer, playerProfiles) : undefined,
        roster: (auctionState!.rosters[team.id] || [])
          .map(playerId => findPlayer(playerId))
          .filter((p): p is Player => p !== undefined)
          .map(p => mergeProfile(p, playerProfiles)),
      };
    });

    const currentPlayer = auctionState.currentPlayerId
      ? findPlayer(auctionState.currentPlayerId)
      : null;

    const soldToTeam = auctionState.soldToTeamId
      ? getTeamById(auctionState.soldToTeamId)
      : null;

    return NextResponse.json({
      status: auctionState.status,
      currentPlayer: currentPlayer ? mergeProfile(currentPlayer, playerProfiles) : null,
      soldToTeam,
      teams: teamsWithRosters,
      lastUpdate: auctionState.lastUpdate,
      soldCount: auctionState.soldPlayers.length,
      totalPlayers: PLAYERS.length,
    });
  } catch (error) {
    console.error('Error fetching state:', error);
    return NextResponse.json({ error: 'Failed to fetch state' }, { status: 500 });
  }
}

// POST: Update state (admin only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pin, action, playerId, teamId } = body;

    // Verify admin PIN
    if (pin !== ADMIN_PIN) {
      return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 });
    }

    let state = await kv.get<AuctionState>(STATE_KEY);
    if (!state) {
      state = getInitialState();
    }

    switch (action) {
      case 'START_AUCTION':
        // Set player as currently being auctioned
        if (!playerId) {
          return NextResponse.json({ error: 'Player ID required' }, { status: 400 });
        }
        state.status = 'LIVE';
        state.currentPlayerId = playerId;
        state.soldToTeamId = null;
        break;

      case 'SOLD':
        // Mark player as sold to a team
        if (!teamId || !state.currentPlayerId) {
          return NextResponse.json({ error: 'Team ID required' }, { status: 400 });
        }
        state.status = 'SOLD';
        state.soldToTeamId = teamId;
        state.rosters[teamId] = [...(state.rosters[teamId] || []), state.currentPlayerId];
        state.soldPlayers = [...state.soldPlayers, state.currentPlayerId];
        break;

      case 'UNSOLD':
        // Mark player as unsold (skip)
        if (state.currentPlayerId) {
          // Don't add to sold players, just clear
          state.status = 'IDLE';
          state.currentPlayerId = null;
          state.soldToTeamId = null;
        }
        break;

      case 'CLEAR':
        // Clear current auction, ready for next
        state.status = 'IDLE';
        state.currentPlayerId = null;
        state.soldToTeamId = null;
        break;

      case 'RESET':
        // Full reset
        state = getInitialState();
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    state.lastUpdate = Date.now();
    await kv.set(STATE_KEY, state);

    return NextResponse.json({ success: true, state });
  } catch (error) {
    console.error('Error updating state:', error);
    return NextResponse.json({ error: 'Failed to update state' }, { status: 500 });
  }
}
