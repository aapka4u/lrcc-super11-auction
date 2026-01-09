# Admin Panel Redesign Plan - DraftCast

## Goal
Make the admin panel intuitive, fast, and focused on the main task: running the auction smoothly.

## Current Problems

1. **Wrong Information Hierarchy**: Pause Control is prominent (2nd section) but rarely used
2. **No Sidebar**: Everything stacked vertically, hard to find secondary actions
3. **No Random Mode**: Only manual selection, slows down auction
4. **No Unsold Tracking**: Can't re-auction unsold players
5. **No Joker Card**: Missing feature for team flexibility
6. **Scattered Controls**: Main auction flow buried in multiple sections

## New Structure

### Layout: Sidebar + Main Content

```
┌─────────────────────────────────────────────┐
│  Header: Status Badge + Logout              │
├──────────┬──────────────────────────────────┤
│          │  MAIN AUCTION CONTROL            │
│ SIDEBAR  │  ┌────────────────────────────┐ │
│          │  │ Step 1: Select Player      │ │
│ ⏸️ Pause │  │ [Random] [Manual]          │ │
│ 🔊 Sound │  │                            │ │
│ 👥 Teams │  │ Step 2: Enter Price       │ │
│ 📸 Profiles│ │ Step 3: Select Team        │ │
│ ⚠️ Danger│  └────────────────────────────┘ │
│          │                                  │
│          │  CURRENT STATUS (small)          │
└──────────┴──────────────────────────────────┘
```

## Implementation Phases

### Phase 1: Layout Restructure (Critical)
**Goal**: Reorganize UI to prioritize main auction flow

1. **Sidebar Component**
   - Fixed left sidebar (200px desktop, collapsible mobile)
   - Navigation items: Pause, Soundboard, Teams, Profiles, Danger Zone
   - Collapsible sections for Teams
   - Active state indicators

2. **Main Content Area**
   - Right side takes remaining space
   - Single prominent "Auction Control" card
   - Current status badge (small, top-right)
   - Clean, focused layout

3. **Move Pause to Sidebar**
   - Remove from main content
   - Compact pause/resume button in sidebar
   - Full pause form in sidebar (collapsible)

### Phase 2: Auction Control Redesign (Critical)
**Goal**: Single, clear auction flow

1. **Single Auction Control Card**
   - Wizard-like flow showing current step
   - Large, prominent buttons
   - Clear visual hierarchy

2. **Step 1: Player Selection (IDLE/SOLD state)**
   - Mode toggle: [Random] [Manual]
   - Random button: Auto-picks next player
   - Manual dropdown: Organized by category
   - Show counts: Star (3), League (12), Unsold (2)

3. **Step 2: Price & Team (LIVE state)**
   - Large price input
   - Team selection grid (prominent)
   - Joker Card button
   - Unsold button

4. **Step 3: Continue (SOLD state)**
   - Large "Continue to Next Player" button
   - Quick stats summary

### Phase 3: New Features (High Priority)
**Goal**: Add missing functionality

1. **Random Selection Mode**
   - Auto-pick logic: Star → League → Unsold
   - Visual indicator: "Random Mode: ON"
   - One-click to start auction

2. **Unsold Players Category**
   - Track unsold players in KV state
   - Show in dropdown as separate category
   - Allow re-auctioning
   - Count badge: "Unsold (3)"

3. **Joker Card Feature**
   - Button in LIVE state
   - Marks player as "joker" in state
   - Team can claim at base price
   - Visual badge on player card

### Phase 4: Sidebar Enhancements (Polish)
**Goal**: Organize secondary actions

1. **Team Rosters in Sidebar**
   - Collapsible section
   - Compact view: Team name, count, budget
   - Expand shows full roster
   - Quick access without leaving main flow

2. **Soundboard in Sidebar**
   - Compact sound buttons
   - Quick access during auction

3. **Profiles Tab**
   - Keep in sidebar navigation
   - Full-screen when active

## Technical Changes

### State Updates Needed

1. **Add to AuctionState (lib/types.ts)**
   ```typescript
   unsoldPlayers?: string[];  // Player IDs that were unsold
   jokerPlayerId?: string | null;  // Current joker player
   randomMode?: boolean;  // Is random mode enabled
   ```

2. **API Updates (app/api/state/route.ts)**
   - Handle UNSOLD: Add to unsoldPlayers array
   - Handle JOKER: Set jokerPlayerId, allow base price claim
   - Handle RANDOM: Return random player based on rules

### Component Structure

```
app/lrccsuper11/admin/page.tsx
├── Sidebar Component
│   ├── Pause Control
│   ├── Soundboard
│   ├── Team Rosters (collapsible)
│   ├── Profiles Tab
│   └── Danger Zone
└── Main Content
    ├── Current Status Badge
    └── Auction Control Card
        ├── Step 1: Player Selection
        ├── Step 2: Price & Team
        └── Step 3: Continue
```

## Success Criteria

✅ Main auction flow is front and center
✅ Pause is in sidebar (secondary action)
✅ Random mode works (Star → League → Unsold)
✅ Unsold players tracked and re-auctionable
✅ Joker card feature works
✅ Sidebar organizes all secondary actions
✅ Mobile responsive (sidebar collapses)
✅ Faster auction flow (less clicks)

## Implementation Order

1. **Task 1**: Sidebar layout structure
2. **Task 2**: Single auction control card
3. **Task 3**: Move pause to sidebar
4. **Task 4**: Random selection mode
5. **Task 5**: Unsold players category
6. **Task 6**: Joker card feature
7. **Task 7**: Collapsible team rosters

## Testing Checklist

- [ ] Sidebar shows/hides correctly on mobile
- [ ] Random mode picks Star → League → Unsold correctly
- [ ] Unsold players appear in dropdown
- [ ] Joker card marks player correctly
- [ ] Team can claim joker at base price
- [ ] Pause works from sidebar
- [ ] All existing functionality preserved
- [ ] No regressions in auction flow
