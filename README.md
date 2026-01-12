# 🏏 DraftCast - Live Auction Broadcast Platform

A real-time auction display board for cricket player auctions. Viewers on mobile/desktop see live updates as players are auctioned to teams.

**Current Event**: LRCC + Super 11 Premier League 2026

## Live URLs

- **Landing Page**: https://draftcast.app
- **Tournament Management**: https://draftcast.app/tournaments
- **Create Tournament**: https://draftcast.app/tournaments/new
- **Public Auction**: https://draftcast.app/lrccsuper11
- **Admin Panel**: https://draftcast.app/lrccsuper11/admin (PIN: 2237)
- **All Players**: https://draftcast.app/lrccsuper11/players
- **Broadcast Mode**: https://draftcast.app/lrccsuper11/broadcast
- **Intelligence Panel**: https://draftcast.app/lrccsuper11/intelligence (Password: boomgaard)
- **GitHub**: https://github.com/aapka4u/lrcc-super11-auction

## Features

### Tournament Management (NEW!)
- **Tournament Dashboard** (`/tournaments`): Browse all published tournaments with search and filtering
- **Create Tournament** (`/tournaments/new`): 5-step wizard to create new tournaments:
  1. Basic Information (name, slug, sport)
  2. Details (dates, location, description)
  3. Security (admin PIN with strength indicator)
  4. Theme (colors, logo)
  5. Review & Submit
- **Tournament View** (`/tournaments/[slug]`): Public tournament details page
- **Auto-save Drafts**: Form progress automatically saved to localStorage
- **Slug Availability Check**: Real-time validation of tournament IDs
- **Mobile-First Design**: Fully responsive with touch-friendly controls

### Auction Features
- **Landing Page** (`/`): DraftCast platform landing with active events
- **Public Display** (`/lrccsuper11`): Shows live auction status, team rosters building up
- **Broadcast Mode** (`/lrccsuper11/broadcast`): Full-screen display for big screens/projectors
- **Admin Console** (`/lrccsuper11/admin`): PIN-protected control panel with two tabs:
  - **Auction Control**: Start bidding, enter sold price, assign to teams
  - **Player Profiles**: Upload player images (max 1MB), add CricHeroes profile links
- **Budget Tracking**:
  - Real-time budget display for each team
  - Max bid calculation (ensures teams can afford remaining picks)
  - Sold prices tracked and displayed in admin
- **Players Page** (`/lrccsuper11/players`): Browse all 48 players with filtering and search
- **Player Roles**: Visual role indicators with icons:
  - 🏏 Batsman
  - 🎯 Bowler
  - ⚡ All-rounder
  - 🧤 WK-Batsman
- **Pause/Resume**: Admin can pause auction with custom message and duration
- **Joker Card**: Each team has one joker to claim a player at base price
- **Intelligence Panel**: Bid predictions, threat analysis, strategic recommendations
- **Super11 Constraint**: Each team must have 3 Super11 players (tracked in intelligence)
- **Auto-refresh**: Updates every 1-2 seconds
- **Mobile-friendly**: Works on all devices
- **Price Validation**: All bids must be multiples of ₹100

## Quick Deploy (30 minutes)

### Step 1: Push to GitHub

```bash
# Create a new repo on GitHub, then:
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/auction-app.git
git push -u origin main
```

### Step 2: Deploy to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Click **Deploy** (no configuration needed)
4. Wait for deployment (~2 minutes)

### Step 3: Add Vercel KV Storage

1. In your Vercel dashboard, go to your project
2. Click **Storage** tab
3. Click **Create Database** → Select **KV**
4. Name it `auction-kv` → Click **Create**
5. Click **Connect** to link it to your project
6. **Redeploy** your project (Settings → Deployments → ... → Redeploy)

### Step 4: Test It!

- **Public view**: `https://your-app.vercel.app`
- **Tournament management**: `https://your-app.vercel.app/tournaments`
- **Admin panel**: `https://your-app.vercel.app/lrccsuper11/admin`
- **Admin PIN**: `2237`

## How to Use

### Creating a Tournament

1. Go to `/tournaments/new`
2. Fill out the 5-step wizard:
   - **Step 1**: Enter tournament name (slug auto-generates), select sport
   - **Step 2**: Add dates, location, description (optional)
   - **Step 3**: Set admin PIN (strength indicator shows security level)
   - **Step 4**: Choose theme colors and upload logo (optional)
   - **Step 5**: Review and submit
3. Your draft is auto-saved every 30 seconds
4. After creation, you'll be redirected to the admin panel

### Admin Workflow (During Auction):

1. Open `/lrccsuper11/admin` on your phone/laptop
2. Enter PIN: `2237`
3. **Select player** from dropdown → Click "Start Auction"
4. Viewers now see "🔴 LIVE: [Player Name]"
5. **Enter the sold price** in the input field
6. **Select the winning team** (teams that can't afford the price are disabled)
7. Viewers see "✅ SOLD: [Player] → Team X"
8. Click "Continue to Next Player"
9. Repeat!

### Budget Rules:
- Each team must have 8 players total (Captain + Vice-Captain + 6 auction picks)
- Star Players have base price ₹2,500, League Players ₹1,000
- Teams cannot bid more than their "max bid" (calculated to ensure they can buy remaining players)
- Admin sees max bid and remaining budget for each team in real-time

### For Viewers (the 36 players):

1. Open the main URL on their phone
2. See live updates automatically
3. No action needed

## Data

All player and team data is pre-configured:

- **6 Teams** with Captain & Vice-Captain (12 team leaders)
- **36 Players** in auction pool (6 Star Players / 30 League Players)
- **48 Total Players** (12 team leaders + 36 auction pool)
- **Star Players**: Bir, Puneet, Tushar, Akash, Ajinkya, Sayed Saadat
- **Clubs**: LRCC (30 players) and Super11 (18 players)

## Teams

| Team | Captain | Vice-Captain | Budget |
|------|---------|--------------|--------|
| Team Sree & Naveen | Sree | Naveen | ₹11,500 |
| LRCC Super Domin8ers | Sathish | Mehul Lalith | ₹11,500 |
| Team Rohit & Praveen | Rohit | Praveen | ₹11,500 |
| Octo-Pace | Rajul | Kathir | ₹11,500 |
| Team Vaibhav & Sasi | Vaibhav | Sasi | ₹11,500 |
| Team Murali & Paddy | Murali | KP Paddy | **₹12,500** |

## Troubleshooting

### "Failed to fetch state"
- Check if Vercel KV is connected (Storage tab in Vercel dashboard)
- Redeploy after connecting KV

### Admin page not working
- Make sure you're using the correct PIN for your tournament
- Clear browser cache and try again

### Changes not appearing
- Page auto-refreshes every 1-2 seconds
- If stuck, manually refresh the page

### Tournament creation fails
- Check slug availability (must be unique)
- Ensure PIN is at least 4 characters
- Verify all required fields are filled

## Platform

Built on modern web technologies with cloud-hosted infrastructure.

## API Endpoints

### Tournament Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/tournaments` | GET | List all published tournaments |
| `/api/tournaments` | POST | Create new tournament |
| `/api/tournaments/[tournamentId]` | GET | Get tournament details |
| `/api/tournaments/[tournamentId]` | PUT | Update tournament (admin) |
| `/api/tournaments/[tournamentId]` | DELETE | Delete tournament (admin) |

### Auction Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/[tournamentId]/state` | GET | Get current auction state |
| `/api/[tournamentId]/state` | POST | Update auction state (admin actions) |
| `/api/[tournamentId]/players` | GET | Get all players with profiles |
| `/api/[tournamentId]/players` | POST | Update player profile (admin) |
| `/api/[tournamentId]/teams` | GET | Get all teams |
| `/api/[tournamentId]/teams` | POST | Update team (admin) |

### Legacy Endpoints (LRCC)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/state` | GET | Get current auction state (teams, budgets, rosters) |
| `/api/state` | POST | Update auction state (admin actions: START, SOLD, UNSOLD, PAUSE, RESET) |
| `/api/players` | GET | Get all players with profile data (images, CricHeroes links) |
| `/api/players` | POST | Update player profile (admin) |
| `/api/players` | DELETE | Remove player profile field (admin) |
| `/health` | GET | Health check endpoint |

## Project Structure

```
app/
├── page.tsx                    # DraftCast landing page
├── layout.tsx                  # Root layout with metadata
├── health/page.tsx             # Health check endpoint
├── tournaments/                # Tournament management (NEW!)
│   ├── page.tsx                # Tournament dashboard/list
│   ├── new/page.tsx            # Create tournament wizard
│   └── [slug]/page.tsx         # Tournament public view
├── lrccsuper11/               # LRCC + Super 11 event
│   ├── page.tsx                # Public auction display
│   ├── admin/page.tsx          # Admin control panel
│   ├── broadcast/page.tsx      # Full-screen broadcast display
│   ├── intelligence/page.tsx   # Bid prediction panel
│   └── players/page.tsx        # All players list
└── api/
    ├── tournaments/             # Tournament management API
    │   ├── route.ts            # List/create tournaments
    │   └── [tournamentId]/route.ts # Tournament CRUD
    ├── [tournamentId]/         # Scoped tournament APIs
    │   ├── state/route.ts      # Auction state
    │   ├── players/route.ts    # Player management
    │   └── teams/route.ts      # Team management
    ├── state/route.ts           # Legacy auction state API
    └── players/route.ts         # Legacy player profiles API

components/
├── TournamentCard.tsx           # Tournament card component (NEW!)
├── TournamentCardSkeleton.tsx  # Loading skeleton (NEW!)
├── CreateTournamentWizard.tsx  # Tournament creation wizard (NEW!)
├── FloatingActionButton.tsx    # Mobile FAB component (NEW!)
├── Toast.tsx                   # Toast notifications (NEW!)
├── ErrorBoundary.tsx           # Error boundary component
├── AuctionStatus.tsx           # Live auction status display
├── TeamCard.tsx                # Team roster card with budgets
├── TeamTeaser.tsx              # Team reveal teaser animation
├── TeamStoryVideo.tsx          # Team story video generation
└── IntelligencePanel.tsx       # Bid prediction and strategy

hooks/
├── useTournamentDraft.ts       # Draft auto-save hook (NEW!)
├── useSlugAvailability.ts     # Slug availability check (NEW!)
└── usePinStrength.ts           # PIN strength calculator (NEW!)

lib/
├── api/
│   └── tournaments.ts          # Tournament API client (NEW!)
├── utils/
│   └── share.ts                # Share utilities (NEW!)
├── schemas.ts                  # Zod validation schemas
├── form-validation.ts          # Form validation utilities (NEW!)
├── swr-config.ts               # SWR configuration (NEW!)
├── data.ts                     # Player & team data, calculateMaxBid()
├── types.ts                    # TypeScript interfaces, BASE_PRICES, TEAM_SIZE
├── intelligence.ts             # Bid prediction algorithms
├── tournament-types.ts         # Tournament type definitions (NEW!)
├── tournament-storage.ts       # Tournament storage helpers (NEW!)
├── tournament-auth.ts          # Tournament authentication (NEW!)
├── tournament-lifecycle.ts    # Tournament lifecycle management (NEW!)
└── tournament-validation.ts    # Tournament validation (NEW!)
```

## Local Development

```bash
npm install
npm run dev
```

Note: For local dev, you'll need to link Vercel KV:
```bash
vercel link
vercel env pull
```

## Testing

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

## Build & Deploy

```bash
npm run build        # Check for errors
git add . && git commit -m "message"
git push             # Auto-deploys to Vercel
```

## Reset Auction Data

In admin panel: Danger Zone → Reset Entire Auction (type "RESET")

Or via API:
```bash
curl -X POST https://draftcast.app/api/state \
  -H "Content-Type: application/json" \
  -d '{"pin":"2237","action":"RESET","confirmReset":true}'
```

---

**Good luck with the auction! 🏏**
