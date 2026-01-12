# CLAUDE.md - Project Context for AI Assistants

This file provides comprehensive context about **DraftCast** - a live auction broadcast platform, currently hosting the LRCC + Super 11 Premier League 2026 event.

## Project Overview

A real-time cricket player auction display system for a local cricket league. The auctioneer uses an admin panel to control the auction flow, while viewers (the 48 players) watch live updates on their devices.

**NEW**: Multi-tournament support with tournament management UI for creating and managing multiple tournaments.

### Live URLs
- **Landing Page**: https://draftcast.app
- **Tournament Dashboard**: https://draftcast.app/tournaments
- **Create Tournament**: https://draftcast.app/tournaments/new
- **Public Auction**: https://draftcast.app/lrccsuper11
- **Admin Panel**: https://draftcast.app/lrccsuper11/admin (PIN: 2237)
- **All Players**: https://draftcast.app/lrccsuper11/players
- **Broadcast Mode**: https://draftcast.app/lrccsuper11/broadcast (full-screen display)
- **Intelligence Panel**: https://draftcast.app/lrccsuper11/intelligence (Password: boomgaard)
- **GitHub**: https://github.com/aapka4u/lrcc-super11-auction

### Team Pages (Public - No Auth Required)
| Team | Team Page | Team Card |
|------|-----------|-----------|
| Team Sree & Naveen | /lrccsuper11/team/team_sree_naveen | /lrccsuper11/team/team_sree_naveen/card |
| LRCC Super Domin8ers | /lrccsuper11/team/team_sathish_mehul | /lrccsuper11/team/team_sathish_mehul/card |
| Team Rohit & Praveen | /lrccsuper11/team/team_rohit_praveen | /lrccsuper11/team/team_rohit_praveen/card |
| Octo-Pace | /lrccsuper11/team/team_rajul_kathir | /lrccsuper11/team/team_rajul_kathir/card |
| Team Vaibhav & Sasi | /lrccsuper11/team/team_vaibhav_sasi | /lrccsuper11/team/team_vaibhav_sasi/card |
| Team Murali & Paddy | /lrccsuper11/team/team_murali_paddy | /lrccsuper11/team/team_murali_paddy/card |

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Vercel KV (Upstash Redis)
- **Styling**: Tailwind CSS with glass morphism dark theme
- **Language**: TypeScript
- **Deployment**: Vercel
- **Data Fetching**: SWR for client-side data fetching
- **Validation**: Zod for runtime schema validation

## Project Structure

```
app/
├── page.tsx                    # DraftCast landing page (updated with tournament links)
├── layout.tsx                  # Root layout with metadata
├── health/page.tsx             # Health check endpoint
├── tournaments/                # Tournament management (NEW!)
│   ├── page.tsx                # Tournament dashboard/list with search
│   ├── new/page.tsx            # Create tournament wizard (5-step form)
│   └── [slug]/page.tsx         # Tournament public view page
├── lrccsuper11/               # LRCC + Super 11 event (legacy)
│   ├── page.tsx                # Public auction display (main viewer page)
│   ├── admin/page.tsx          # Admin control panel (PIN protected)
│   ├── broadcast/page.tsx       # Full-screen broadcast display
│   ├── intelligence/page.tsx   # Bid prediction intelligence panel
│   ├── players/page.tsx        # All players list with search/filter
│   ├── player/[id]/            # Individual player profile page
│   │   ├── page.tsx            # Player page with metadata
│   │   └── PlayerProfile.tsx   # Player profile component with photo upload
│   └── team/[teamId]/          # Team pages (public, no auth)
│       ├── page.tsx            # Team page with roster, logo upload, share options
│       └── card/page.tsx      # Shareable team card
└── api/
    ├── tournaments/            # Tournament management API (NEW!)
    │   ├── route.ts            # GET (list), POST (create)
    │   └── [tournamentId]/route.ts # GET, PUT, DELETE (CRUD operations)
    ├── [tournamentId]/         # Scoped tournament APIs (NEW!)
    │   ├── state/route.ts      # Tournament-specific auction state
    │   ├── players/route.ts    # Tournament-specific player management
    │   └── teams/route.ts      # Tournament-specific team management
    ├── state/route.ts           # Legacy auction state API (GET/POST)
    ├── players/route.ts         # Legacy player profiles API
    ├── players/self-upload/route.ts # Player self-upload photo (no auth)
    └── team-profile/route.ts   # Team logo upload API (no auth)

components/
├── TournamentCard.tsx           # Tournament card with status badge (NEW!)
├── TournamentCardSkeleton.tsx  # Loading skeleton for tournament cards (NEW!)
├── CreateTournamentWizard.tsx  # 5-step tournament creation wizard (NEW!)
├── FloatingActionButton.tsx    # Mobile-first FAB component (NEW!)
├── Toast.tsx                   # Toast notification system (NEW!)
├── ErrorBoundary.tsx           # Error boundary for graceful error handling
├── AuctionStatus.tsx           # Live auction status display (IDLE/LIVE/SOLD/PAUSED)
├── TeamCard.tsx                # Team roster card with budget info
├── TeamTeaser.tsx              # Team reveal teaser animation
├── TeamStoryVideo.tsx          # Team story video generation
└── IntelligencePanel.tsx      # Auction bid prediction and strategy recommendations

hooks/
├── useTournamentDraft.ts       # Auto-save draft functionality (NEW!)
├── useSlugAvailability.ts     # Real-time slug availability checking (NEW!)
└── usePinStrength.ts           # PIN strength calculator (NEW!)

lib/
├── api/
│   └── tournaments.ts          # Tournament API client functions (NEW!)
├── utils/
│   └── share.ts                # Share/copy utilities (NEW!)
├── schemas.ts                  # Zod schemas for validation
├── form-validation.ts          # Form validation utilities (NEW!)
├── swr-config.ts               # SWR configuration (NEW!)
├── data.ts                     # Player & team static data, calculateMaxBid()
├── types.ts                    # TypeScript interfaces, BASE_PRICES, TEAM_SIZE
├── intelligence.ts             # Bid prediction engine, role gap analysis
├── tournament-types.ts         # Tournament type definitions (NEW!)
├── tournament-storage.ts       # Tournament storage helpers (NEW!)
├── tournament-auth.ts          # Tournament authentication (JWT, PIN hashing) (NEW!)
├── tournament-lifecycle.ts    # Tournament lifecycle management (NEW!)
└── tournament-validation.ts   # Tournament validation utilities (NEW!)
```

## Tournament Management (NEW!)

### Tournament Creation Flow

1. **Landing Page** (`/`) → Shows featured tournaments + CTAs
2. **Tournament Dashboard** (`/tournaments`) → Browse/search all tournaments
3. **Create Tournament** (`/tournaments/new`) → 5-step wizard:
   - Step 1: Basic Info (name, slug, sport)
   - Step 2: Details (dates, location, description)
   - Step 3: Security (admin PIN with strength indicator)
   - Step 4: Theme (colors, logo)
   - Step 5: Review & Submit
4. **Tournament View** (`/tournaments/[slug]`) → Public tournament page

### Tournament Wizard Features

- **Auto-save Drafts**: Form progress saved to localStorage every 30 seconds
- **Slug Auto-generation**: Automatically generates slug from tournament name
- **Real-time Slug Validation**: Checks availability as you type (debounced 500ms)
- **PIN Strength Indicator**: Visual feedback on PIN security
- **Smart Defaults**: Pre-filled sensible defaults (sport: Cricket, dates, etc.)
- **Mobile-First Design**: Touch-friendly controls, safe area padding
- **Error Handling**: Inline validation, toast notifications, rate limit handling

### Tournament API Endpoints

#### GET /api/tournaments
Returns list of published tournaments (for discovery):
```typescript
{
  tournaments: TournamentIndexEntry[];
  count: number;
}
```

#### POST /api/tournaments
Create new tournament:
```typescript
{
  slug: string;           // Unique tournament ID
  name: string;           // Tournament name
  description?: string;
  adminPin: string;       // 4-20 characters
  sport?: string;
  location?: string;
  startDate?: number;     // Timestamp
  endDate?: number;       // Timestamp
  logo?: string;          // HTTPS URL
  theme?: {
    primaryColor: string;  // Hex color
    secondaryColor: string; // Hex color
  };
  settings?: TournamentSettings;
}
```

#### GET /api/tournaments/[tournamentId]
Get tournament details (public info only, unless authenticated):
```typescript
{
  tournament: Tournament;
}
```

#### PUT /api/tournaments/[tournamentId]
Update tournament (requires admin auth):
```typescript
{
  name?: string;
  description?: string;
  published?: boolean;
  // ... other fields
}
```

#### DELETE /api/tournaments/[tournamentId]
Delete tournament (requires admin auth, only if draft status)

### Tournament Storage Keys

```typescript
const TOURNAMENT_CONFIG_KEY = `tournament:${tournamentId}:config`;
const TOURNAMENT_STATE_KEY = `tournament:${tournamentId}:state`;
const TOURNAMENT_INDEX_KEY = 'tournament:index';
const TOURNAMENT_PLAYERS_KEY = `tournament:${tournamentId}:players`;
const TOURNAMENT_TEAMS_KEY = `tournament:${tournamentId}:teams`;
```

## Key Data Structures

### Tournament Types

```typescript
export type TournamentStatus = 'draft' | 'lobby' | 'active' | 'completed' | 'archived';

export interface Tournament {
  id: string;                    // User-defined slug
  name: string;
  description?: string;
  status: TournamentStatus;
  published: boolean;
  createdAt: number;
  updatedAt: number;
  lastActivityAt: number;
  expiresAt: number;             // createdAt + 90 days
  settings: TournamentSettings;
  adminPinHash: string;         // Hashed PIN
  sport?: string;
  location?: string;
  startDate?: number;
  endDate?: number;
  logo?: string;
  theme?: TournamentTheme;
  archived: boolean;
}

export interface TournamentIndexEntry {
  id: string;
  name: string;
  status: TournamentStatus;
  published: boolean;
  sport?: string;
  location?: string;
  startDate?: number;
  logo?: string;
  createdAt: number;
}
```

### Teams (6 total)
Each team has a captain and vice-captain already assigned (not in auction pool).

| Team | Captain | Vice-Captain | Budget |
|------|---------|--------------|--------|
| Team Sree & Naveen | Sree | Naveen | 11,500 |
| LRCC Super Domin8ers | Sathish | Mehul Lalith | 11,500 |
| Team Rohit & Praveen | Rohit | Praveen | 11,500 |
| Octo-Pace | Rajul | Kathir | 11,500 |
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
3. Sold price must be a multiple of ₹100
4. Sold price must be > 0
5. Team roster cannot exceed TEAM_SIZE - 2 (6 auction picks)
6. Player cannot be sold twice (idempotent check prevents double-click issues)

### Super11 Constraint
Each team must have exactly 3 Super11 players:
- 1 from Captain/Vice-Captain (already assigned)
- 2 from auction pool
- Intelligence panel tracks this and warns when constraint is at risk

## API Endpoints

### Tournament Management APIs

#### GET /api/tournaments
Returns published tournaments for discovery:
- No authentication required
- Returns `TournamentIndexEntry[]` (limited fields)

#### POST /api/tournaments
Create new tournament:
- Rate limited (5 per hour per IP)
- Requires `CreateTournamentInput` schema
- Returns tournament + master admin token

#### GET /api/tournaments/[tournamentId]
Get tournament details:
- Public tournaments: Returns limited info
- Draft tournaments: Requires admin auth
- Returns full `Tournament` object

#### PUT /api/tournaments/[tournamentId]
Update tournament:
- Requires admin authentication (PIN, session token, or master token)
- Only draft tournaments can be fully modified
- Published tournaments have limited editable fields

#### DELETE /api/tournaments/[tournamentId]
Delete tournament:
- Requires admin authentication
- Only draft tournaments can be deleted
- Soft delete (archives tournament)

### Scoped Tournament APIs

#### GET /api/[tournamentId]/state
Get tournament-specific auction state (replaces legacy `/api/state`)

#### POST /api/[tournamentId]/state
Update tournament-specific auction state (admin actions)

#### GET /api/[tournamentId]/players
Get tournament-specific players

#### POST /api/[tournamentId]/players
Update tournament-specific player profiles

#### GET /api/[tournamentId]/teams
Get tournament-specific teams

#### POST /api/[tournamentId]/teams
Update tournament-specific teams

### Legacy APIs (LRCC)

#### GET /api/state
Returns public auction state including:
- Current status and player
- All teams with rosters, budgets, max bids
- Sold prices for each player

#### POST /api/state
Admin actions (requires PIN):
- `VERIFY` - Check PIN validity
- `START_AUCTION` - Put player up for bidding
- `SOLD` - Mark player sold (requires teamId, soldPrice - must be multiple of 100)
- `UNSOLD` - Skip player (marks as unsold, can be re-auctioned)
- `CLEAR` - Ready for next player
- `PAUSE` - Pause auction (optional message, duration)
- `UNPAUSE` - Resume auction
- `JOKER` - Activate joker card for a team (one per team, claims at base price)
- `RESET` - Full reset (requires confirmReset: true)

#### GET /api/players
Returns all players with profile data (images, CricHeroes links)

#### POST /api/players
Update player profile (requires PIN):
- Upload image (base64 or URL, max 1MB)
- Add CricHeroes profile URL

#### DELETE /api/players
Remove player profile field (requires PIN)

#### POST /api/players/self-upload
Player self-upload photo (NO authentication required):
- Upload image (base64, max 1MB)
- Just needs playerId and image
- Anyone can upload photos for any player

#### POST /api/team-profile
Team logo upload (NO authentication required):
- Upload team logo (base64, max 1MB)
- Just needs teamId and logo
- Anyone can upload logos for any team

## KV Storage Keys

```typescript
// Legacy
const STATE_KEY = 'auction:state';      // AuctionState object
const PROFILES_KEY = 'player:profiles'; // Record<playerId, PlayerProfile>
const TEAM_PROFILES_KEY = 'team:profiles'; // Record<teamId, { logo?: string }>

// Tournament Management
const TOURNAMENT_CONFIG_KEY = `tournament:${tournamentId}:config`;
const TOURNAMENT_STATE_KEY = `tournament:${tournamentId}:state`;
const TOURNAMENT_INDEX_KEY = 'tournament:index';
const TOURNAMENT_PLAYERS_KEY = `tournament:${tournamentId}:players`;
const TOURNAMENT_TEAMS_KEY = `tournament:${tournamentId}:teams`;
```

## Environment Variables

```
ADMIN_PIN=2237              # Legacy admin panel access
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

### Testing
```bash
npm test             # Run all tests
npm run test:watch   # Watch mode
npm run test:coverage # Coverage report
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

### Landing Page (app/page.tsx)
- Modern glassmorphism design with animated background orbs
- Gradient text for "DraftCast" branding
- "LIVE TODAY" pulsing badge on active events
- Staggered fade-in animations
- **NEW**: Fetches tournaments dynamically from API
- **NEW**: "Browse All Tournaments" and "Create Tournament" CTAs
- **NEW**: Shows up to 3 featured tournaments
- Logo in `public/logo.png` used for favicon

### Tournament Management UI (NEW!)

#### Tournament Dashboard (`/tournaments`)
- Responsive grid layout (1 column mobile, 2 tablet, 3 desktop)
- Search bar with real-time filtering
- Loading skeletons during fetch
- Empty state with CTA
- Floating Action Button (FAB) for "Create Tournament"
- Pull-to-refresh support (mobile)

#### Create Tournament Wizard (`/tournaments/new`)
- **Step 1**: Basic Info
  - Tournament name (auto-generates slug)
  - Slug with real-time availability check
  - Sport dropdown
- **Step 2**: Details
  - Start/end dates (date pickers)
  - Location input
  - Description textarea
- **Step 3**: Security
  - Admin PIN input (password field)
  - PIN strength indicator (weak/medium/strong)
  - Visual feedback and suggestions
- **Step 4**: Theme
  - Color preset selection (5 presets)
  - Logo URL input (optional)
- **Step 5**: Review
  - Summary of all inputs
  - Edit links to go back
  - Submit button

**Features**:
- Auto-save drafts every 30 seconds
- Draft recovery banner on return
- Real-time validation with inline errors
- Toast notifications for success/errors
- Mobile-first design with safe area padding
- Keyboard navigation support
- Progress indicator

#### Tournament View (`/tournaments/[slug]`)
- Tournament header with logo
- Status badge (Draft/Live/Completed)
- Metadata (sport, location, dates)
- Action buttons:
  - View Auction (if published)
  - Admin Panel
  - Share (Web Share API + clipboard fallback)

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
- **Auth Persistence**: Login state saved to localStorage (no re-login on refresh)

## Player Image Handling

Images are stored in KV as base64 strings or external URLs. The flow:
1. Anyone can upload image via player page or admin Profiles tab (max 1MB)
2. Saved to `player:profiles` in KV
3. `/api/state` merges profiles with static player data via `mergeProfile()`
4. Components display image or fall back to initials

**Self-Upload**: Players can upload their own photos at `/lrccsuper11/player/[id]?upload=true` - no verification required.

## Team Page Features

Team pages are **public with no authentication**:

### Team Page (`/lrccsuper11/team/[teamId]`)
- Team header with logo (uploadable by anyone)
- Squad list with players sorted by role (Batsmen → WK → All-rounders → Bowlers)
- Player names are clickable links to player profiles
- Camera icons for quick photo upload access
- "Share Your Team" section with:
  - **Team Story**: 15-second animated video with confetti
  - **Team Card**: Static shareable card

### Team Card (`/lrccsuper11/team/[teamId]/card`)
- Shareable team card with squad list
- Share button for WhatsApp

### Privacy Notes
- **Prices are hidden** on public pages (team page, player page, team card)
- Only admin panel shows sold prices
- Budget information removed from public team pages (auction is over)

## Important Implementation Notes

1. **Player Lookup**: Use `findPlayer()` helper in route.ts - searches both PLAYERS and TEAM_LEADERS arrays
2. **Profile Merging**: Always merge KV profile data with static player data for images
3. **Budget Calculation**: The GET endpoint calculates and returns maxBid for each team in real-time (rounded to nearest 100)
4. **Auto-refresh**: Public page polls every 1 second, admin every 2 seconds
5. **Non-null assertions**: API route uses `state!` in callbacks where TypeScript can't infer non-null
6. **Price Rounding**: All prices must be multiples of ₹100 (enforced in API and UI)
7. **Idempotency**: SOLD action checks if player already in roster to prevent double-click issues
8. **Tournament Authentication**: Uses JWT tokens (session/master) or PIN verification
9. **Tournament Lifecycle**: Draft → Published → Active → Completed → Archived
10. **Rate Limiting**: Tournament creation limited to 5 per hour per IP
11. **Slug Validation**: Must be lowercase, alphanumeric + hyphens, 3-50 chars, unique
12. **Mobile-First**: All new UI components follow mobile-first design principles
13. **Accessibility**: ARIA labels, keyboard navigation, screen reader support
14. **Touch Targets**: Minimum 44px height for all interactive elements
15. **Safe Areas**: iPhone notch/home indicator padding using CSS env() variables

## Intelligence Panel

The intelligence panel (`/lrccsuper11/intelligence`) provides real-time bid predictions:

### Features
- **Bid Likelihood**: Predicts which teams will bid on current player (0-100%)
- **Role Gap Analysis**: Shows which roles each team needs
- **Super11 Tracking**: Warns when teams are at risk of not meeting 3-Super11 constraint
- **Strategic Recommendations**: BID/PUSH/WAIT/SKIP actions with walk-away prices
- **Threat Detection**: Highlights teams in MUST GET mode
- **Simple/Detailed Modes**: Mobile-optimized simple mode vs full analysis

### Password
- Password: `boomgaard`
- Persists in localStorage (no re-login on refresh)
- Accessible via dedicated URL only (removed from admin sidebar)

### Key Algorithms (lib/intelligence.ts)
- `calculateBidLikelihood()`: Weighs role need, budget, scarcity, Super11 constraint
- `calculateStrategicRecommendation()`: Game-theoretic PUSH strategy for non-interested players
- `analyzeRoleGaps()`: Identifies missing roles per team
- `analyzeClubGaps()`: Tracks Super11 requirement (3 per team)

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

### Tournament creation fails
- Check slug availability (must be unique)
- Ensure PIN meets strength requirements (4+ chars)
- Verify all required fields are filled
- Check rate limit (5 per hour per IP)

### Tournament not found
- Verify tournament is published (draft tournaments require auth)
- Check tournament hasn't expired (90 days from creation)
- Ensure correct tournament ID/slug
