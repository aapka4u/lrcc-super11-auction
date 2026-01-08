# 🏏 LRCC + Super 11 Premier League 2026 - Live Auction Display

A real-time auction display board for cricket player auctions. Viewers on mobile/desktop see live updates as players are auctioned to teams.

## Features

- **Public Display** (`/`): Shows live auction status, team rosters building up
- **Admin Console** (`/admin`): PIN-protected control panel
- **Auto-refresh**: Updates every 2 seconds
- **Mobile-friendly**: Works on all devices
- **No prices shown**: Only player names and team assignments visible publicly

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

1. Open `/admin` on your phone/laptop
2. Enter PIN: `2237`
3. **Select player** from dropdown → Click "Start Auction"
4. Viewers now see "🔴 LIVE: [Player Name]"
5. When sold → Click the winning team button
6. Viewers see "✅ SOLD: [Player] → Team X"
7. Click "Continue to Next Player"
8. Repeat!

### For Viewers (the 36 players):

1. Open the main URL on their phone
2. See live updates automatically
3. No action needed

## Data

All player and team data is pre-configured:

- **6 Teams** with Captain & Vice-Captain
- **36 Players** in auction pool (6 A+ / 30 Base)
- **A+ Players**: Bir, Puneet, Tushar, Akash, Ajinkya, Sayed Saadat

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
- Vercel KV (Redis storage)
- Tailwind CSS
- TypeScript

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
