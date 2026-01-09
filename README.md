# 🏏 DraftCast - Live Auction Broadcast Platform

A real-time auction display board for cricket player auctions. Viewers on mobile/desktop see live updates as players are auctioned to teams.

**Current Event**: LRCC + Super 11 Premier League 2026

## Live URLs

- **Landing Page**: https://draftcast.app
- **Public Auction**: https://draftcast.app/lrccsuper11
- **Admin Panel**: https://draftcast.app/lrccsuper11/admin (PIN: 2237)
- **All Players**: https://draftcast.app/lrccsuper11/players
- **Broadcast Mode**: https://draftcast.app/lrccsuper11/broadcast
- **GitHub**: https://github.com/aapka4u/lrcc-super11-auction

## Features

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
- **Auto-refresh**: Updates every 2 seconds
- **Mobile-friendly**: Works on all devices

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
- **Admin panel**: `https://your-app.vercel.app/admin`
- **Admin PIN**: `2237`

## How to Use (During Auction)

### Admin Workflow:

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
| Team Sathish & Mehul | Sathish | Mehul Lalith | ₹11,500 |
| Team Rohit & Praveen | Rohit | Praveen | ₹11,500 |
| Team Rajul & Kathir | Rajul | Kathir | ₹11,500 |
| Team Vaibhav & Sasi | Vaibhav | Sasi | ₹11,500 |
| Team Murali & Paddy | Murali | KP Paddy | ₹12,500 |

## Troubleshooting

### "Failed to fetch state"
- Check if Vercel KV is connected (Storage tab in Vercel dashboard)
- Redeploy after connecting KV

### Admin page not working
- Make sure you're using PIN: `2237`
- Clear browser cache and try again

### Changes not appearing
- Page auto-refreshes every 2 seconds
- If stuck, manually refresh the page

## Tech Stack

- Next.js 14 (App Router)
- Vercel KV via Upstash Redis (persistent storage)
- Tailwind CSS (glass morphism dark theme)
- TypeScript

## API Endpoints

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
├── page.tsx              # DraftCast landing page
├── layout.tsx            # Root layout with metadata
├── health/page.tsx       # Health check endpoint
├── lrccsuper11/          # LRCC + Super 11 event
│   ├── page.tsx          # Public auction display
│   ├── admin/page.tsx    # Admin control panel
│   ├── broadcast/page.tsx # Full-screen broadcast display
│   └── players/page.tsx  # All players list
└── api/
    ├── state/route.ts    # Auction state API (GET/POST)
    └── players/route.ts  # Player profiles API

components/
├── AuctionStatus.tsx     # Live auction status display
├── TeamCard.tsx          # Team roster card with budgets
├── TeamTeaser.tsx        # Team reveal teaser animation
└── TeamStoryVideo.tsx    # Team story video generation

lib/
├── data.ts               # Player & team data, calculateMaxBid()
└── types.ts              # TypeScript interfaces, BASE_PRICES, TEAM_SIZE
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

---

**Good luck with the auction! 🏏**
