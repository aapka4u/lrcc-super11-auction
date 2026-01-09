# CLAUDE.md - Project Context for AI Assistants

This file provides comprehensive context about **DraftCast** - a live auction broadcast platform, currently hosting the LRCC + Super 11 Premier League 2026 event.

## Project Overview

A real-time cricket player auction display system for a local cricket league. The auctioneer uses an admin panel to control the auction flow, while viewers (the 48 players) watch live updates on their devices.

### Live URLs
- **Landing Page**: https://draftcast.app
- **Public Auction**: https://draftcast.app/lrccsuper11
- **Admin Panel**: https://draftcast.app/lrccsuper11/admin (PIN: 2237)
- **All Players**: https://draftcast.app/lrccsuper11/players
- **Broadcast Mode**: https://draftcast.app/lrccsuper11/broadcast (full-screen display)
- **GitHub**: https://github.com/aapka4u/lrcc-super11-auction

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Vercel KV (Upstash Redis)
- **Styling**: Tailwind CSS with glass morphism dark theme
- **Language**: TypeScript
- **Deployment**: Vercel

## Project Structure

```
app/
├── page.tsx              # DraftCast landing page
├── layout.tsx            # Root layout with metadata
├── health/page.tsx       # Health check endpoint
├── lrccsuper11/          # LRCC + Super 11 event
│   ├── page.tsx          # Public auction display (main viewer page)
│   ├── admin/page.tsx    # Admin control panel (PIN protected)
│   ├── broadcast/page.tsx # Full-screen broadcast display
│   └── players/page.tsx  # All players list with search/filter
└── api/
    ├── state/route.ts    # Main auction state API (GET/POST)
    └── players/route.ts  # Player profiles API (images, CricHeroes links)

components/
├── AuctionStatus.tsx     # Live auction status display (IDLE/LIVE/SOLD/PAUSED)
├── TeamCard.tsx          # Team roster card with budget info
├── TeamTeaser.tsx        # Team reveal teaser animation
└── TeamStoryVideo.tsx    # Team story video generation

lib/
├── data.ts               # Player & team static data, calculateMaxBid()
└── types.ts              # TypeScript interfaces, BASE_PRICES, TEAM_SIZE
```

## Key Data Structures

### Teams (6 total)
Each team has a captain and vice-captain already assigned (not in auction pool).

| Team | Captain | Vice-Captain | Budget |
|------|---------|--------------|--------|
| Team Sree & Naveen | Sree | Naveen | 11,500 |
| Team Sathish & Mehul | Sathish | Mehul Lalith | 11,500 |
| Team Rohit & Praveen | Rohit | Praveen | 11,500 |
| Team Rajul & Kathir | Rajul | Kathir | 11,500 |
| Team Vaibhav & Sasi | Vaibhav | Sasi | 11,500 |
| Team Murali & Paddy | Murali | KP Paddy | **12,500** |

### Players
- **12 Team Leaders**: Captains and Vice-Captains (in `TEAM_LEADERS` array, not auctioned)
- **36 Auction Pool**: 6 Star Players + 30 League Players (in `PLAYERS` array)
- **48 Total Players**: Combined in `ALL_PLAYERS` array

### Player Categories & Base Prices
```typescript
// lib/types.ts
export const BASE_PRICES = {
  APLUS: 2500,      // Star Players (premium tier)
  BASE: 1000,       // League Players (standard tier)
  CAPTAIN: 0,       // Pre-assigned
  VICE_CAPTAIN: 0,  // Pre-assigned
} as const;

export const TEAM_SIZE = 8; // Total players per team (including C & VC)
```

### Player Roles (with icons)
- 🏏 Batsman
- 🎯 Bowler
- ⚡ All-rounder
- 🧤 WK-Batsman

### Availability Types
- `full` - Available for all matches
- `till_11` - Available till 11 AM only
- `till_12` - Available till 12 noon only
- `tentative` - Attendance uncertain

## Auction State Machine

```typescript
// lib/types.ts
export type AuctionStatus = 'IDLE' | 'LIVE' | 'SOLD' | 'PAUSED';

export interface AuctionState {
  status: AuctionStatus;
  currentPlayerId: string | null;
  soldToTeamId: string | null;
  rosters: Record<string, string[]>;      // teamId -> playerIds
  soldPlayers: string[];                   // playerIds that have been sold
  soldPrices: Record<string, number>;      // playerId -> sold price
  teamSpent: Record<string, number>;       // teamId -> total spent
  lastUpdate: number;
  pauseMessage?: string;
  pauseUntil?: number;
}
```

### State Transitions
1. **IDLE** → Admin selects player → **LIVE**
2. **LIVE** → Admin marks sold with price → **SOLD**
3. **LIVE** → Admin marks unsold → **IDLE**
4. **SOLD** → Admin clears → **IDLE**
5. **Any** → Admin pauses → **PAUSED**
6. **PAUSED** → Admin unpauses → Previous state

## Budget & Bidding Rules

### Max Bid Calculation
Teams cannot bid more than what would leave them unable to buy remaining players at base price.

```typescript
// lib/data.ts
export const calculateMaxBid = (
  teamId: string,
  teamSpent: number,
  rosterSize: number,      // Current roster (excluding C and VC)
  remainingAplusCount: number,
  remainingBaseCount: number
): number => {
  const team = TEAMS.find(t => t.id === teamId);
  if (!team) return 0;

  const remainingBudget = team.budget - teamSpent;
  const playersStillNeeded = (TEAM_SIZE - 2) - rosterSize; // -2 for C and VC

  if (playersStillNeeded <= 0) return 0; // Team is full

  // Reserve minimum for remaining players at base price
  const reserveForFuturePlayers = (playersStillNeeded - 1) * BASE_PRICES.BASE;
  return Math.max(0, remainingBudget - reserveForFuturePlayers);
};
```

### Validation Rules (enforced in API)
1. Sold price must be >= base price for player's category
2. Sold price must be <= team's max bid
3. Team roster cannot exceed TEAM_SIZE - 2 (6 auction picks)
4. Player cannot be sold twice

## API Endpoints

### GET /api/state
Returns public auction state including:
- Current status and player
- All teams with rosters, budgets, max bids
- Sold prices for each player

### POST /api/state
Admin actions (requires PIN):
- `VERIFY` - Check PIN validity
- `START_AUCTION` - Put player up for bidding
- `SOLD` - Mark player sold (requires teamId, soldPrice)
- `UNSOLD` - Skip player
- `CLEAR` - Ready for next player
- `PAUSE` - Pause auction (optional message, duration)
- `UNPAUSE` - Resume auction
- `RESET` - Full reset (requires confirmReset: true)

### GET /api/players
Returns all players with profile data (images, CricHeroes links)

### POST /api/players
Update player profile (requires PIN):
- Upload image (base64 or URL, max 1MB)
- Add CricHeroes profile URL

### DELETE /api/players
Remove player profile field (requires PIN)

## KV Storage Keys

```typescript
const STATE_KEY = 'auction:state';      // AuctionState object
const PROFILES_KEY = 'player:profiles'; // Record<playerId, PlayerProfile>
```

## Environment Variables

```
ADMIN_PIN=2237              # Admin panel access
KV_REST_API_URL=...         # Vercel KV (auto-set when connected)
KV_REST_API_TOKEN=...       # Vercel KV (auto-set when connected)
```

## Common Development Tasks

### Local Development
```bash
npm install
vercel link          # Link to Vercel project
vercel env pull      # Pull KV credentials
npm run dev
```

### Build & Deploy
```bash
npm run build        # Check for errors
git add . && git commit -m "message"
git push             # Auto-deploys to Vercel
```

### Reset Auction Data
In admin panel: Danger Zone → Reset Entire Auction (type "RESET")

Or via API:
```bash
curl -X POST https://draftcast.app/api/state \
  -H "Content-Type: application/json" \
  -d '{"pin":"2237","action":"RESET","confirmReset":true}'
```

## UI Components Details

### AuctionStatus.tsx
Displays different states:
- **IDLE**: "Waiting for Auctioneer" message
- **LIVE**: Player card with image, role, category, "Waiting for bid..."
- **SOLD**: Player card with "SOLD" stamp, team colors, sold animation
- **PAUSED**: Pause message with optional countdown

### TeamCard.tsx
Shows team information:
- Team color badge
- Captain and Vice-Captain with images
- Roster players with role icons
- Budget bar (spent vs remaining)
- Max bid indicator

### Admin Page Features
- **Auction Tab**: Control auction flow, set prices, assign to teams
- **Profiles Tab**: Upload player images, add CricHeroes links
- **Soundboard**: Sold hammer and new player sound effects
- **Pause Control**: Custom message, optional duration
- **Team Rosters**: Budget bars, spent amounts, max bid limits

## Player Image Handling

Images are stored in KV as base64 strings or external URLs. The flow:
1. Admin uploads image in Profiles tab (max 1MB)
2. Saved to `player:profiles` in KV
3. `/api/state` merges profiles with static player data
4. Components display image or fall back to initials

## Important Implementation Notes

1. **Player Lookup**: Use `findPlayer()` helper in route.ts - searches both PLAYERS and TEAM_LEADERS arrays
2. **Profile Merging**: Always merge KV profile data with static player data for images
3. **Budget Calculation**: The GET endpoint calculates and returns maxBid for each team in real-time
4. **Auto-refresh**: Public page polls every 2 seconds, admin every 2 seconds
5. **Non-null assertions**: API route uses `state!` in callbacks where TypeScript can't infer non-null

## Troubleshooting

### "Failed to fetch state"
- Check Vercel KV connection in dashboard
- Redeploy after connecting KV

### Player images not showing
- Verify profile saved in admin Profiles tab
- Check `/api/players` returns image data
- Ensure `findPlayer()` searches both arrays

### Budget validation errors
- Admin can see max bid for each team in real-time
- Error messages explain why bid was rejected

### Build errors
- Run `npm run build` locally before pushing
- Check for TypeScript errors in API routes
