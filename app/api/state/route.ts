import { kv } from '@vercel/kv';
import { NextRequest, NextResponse } from 'next/server';
import { AuctionState } from '@/lib/types';
import { getInitialState, ADMIN_PIN, PLAYERS, TEAMS, getPlayerById, getTeamById } from '@/lib/data';

const STATE_KEY = 'auction:state';

// GET: Fetch current state (public)
export async function GET() {
  try {
    let state = await kv.get<AuctionState>(STATE_KEY);
    
    if (!state) {
      state = getInitialState();
      await kv.set(STATE_KEY, state);
    }

    // Build public response with team rosters
    const teamsWithRosters = TEAMS.map(team => ({
      ...team,
      roster: (state!.rosters[team.id] || [])
        .map(playerId => getPlayerById(playerId))
        .filter(Boolean),
    }));

    const currentPlayer = state.currentPlayerId 
      ? getPlayerById(state.currentPlayerId) 
      : null;
    
    const soldToTeam = state.soldToTeamId 
      ? getTeamById(state.soldToTeamId) 
      : null;

    return NextResponse.json({
      status: state.status,
      currentPlayer,
      soldToTeam,
      teams: teamsWithRosters,
      lastUpdate: state.lastUpdate,
      soldCount: state.soldPlayers.length,
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
