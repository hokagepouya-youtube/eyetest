@AGENTS.md

# BayernRate — FC Bayern Munich Player Rating Site

## Project Overview
A community website where users rate FC Bayern Munich players after each match on a scale of 1–10. Admins manually enter lineups after each game. All registered users can submit ratings and view community averages. A Player Hub tab shows individual player rating history visualized as a graph.

## Tech Stack
- **Framework:** Next.js 16 (App Router, Turbopack)
- **Database + Auth:** Supabase (PostgreSQL + Row Level Security + email/password auth)
- **Styling:** Tailwind CSS + shadcn/ui components
- **Charts:** Recharts (player rating history graphs)
- **Deployment:** Vercel (planned)

## Project Structure
```
app/
  page.tsx                        # Tab 1: Latest match ratings (home page)
  layout.tsx                      # Root layout with Navigation and Toaster
  auth/
    login/page.tsx                # Email + password login
    register/page.tsx             # User registration
  players/
    page.tsx                      # Tab 2: Player hub grid (all Bayern players)
    [playerId]/page.tsx           # Individual player rating history + graph
  admin/
    page.tsx                      # Admin dashboard (match list)
    matches/new/page.tsx          # Create a new match
    lineups/[matchId]/page.tsx    # Enter lineup for a match
components/
  Navigation.tsx                  # Top nav bar with auth state
  MatchHeader.tsx                 # Match info banner (opponent, date, score)
  PlayerCard.tsx                  # Player rating card with 1-10 buttons
  ManagerCard.tsx                 # Manager rating card
  RatingGraph.tsx                 # Recharts dual-line graph (user vs community avg)
lib/
  supabase/
    client.ts                     # Browser Supabase client
    server.ts                     # Server component Supabase client
  types.ts                        # TypeScript types matching DB schema
proxy.ts                          # Next.js 16 proxy (replaces middleware.ts) — protects /admin routes
supabase/
  schema.sql                      # Full DB schema, RLS policies, Bayern squad seed data
```

## Database Tables
- `profiles` — extends Supabase auth users; has `is_admin` boolean
- `players` — Bayern Munich squad (name, position, squad_number, photo_url)
- `managers` — team manager (currently Vincent Kompany)
- `matches` — match records (opponent, date, competition, score, manager_id)
- `match_lineups` — per-match player roles: `starter`, `sub_in`, or `unused`
- `player_ratings` — one rating per user per player per match (1–10)
- `manager_ratings` — one rating per user per match for the manager (1–10)

## Key Conventions
- All server pages use `lib/supabase/server.ts`; all client components use `lib/supabase/client.ts`
- Community averages are computed in-app by fetching all ratings and averaging — no stored aggregates
- The latest match is always the most recent by `date DESC LIMIT 1`
- Admin access is gated by `profiles.is_admin = true`, enforced in `proxy.ts` and checked client-side in Navigation
- `proxy.ts` is Next.js 16's replacement for `middleware.ts` — the exported function must be named `proxy`

## Environment Variables
Stored in `.env.local` (not committed):
```
NEXT_PUBLIC_SUPABASE_URL=https://<project-id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

## Local Development
```bash
npm run dev       # Start dev server at localhost:3000
npm run build     # Production build check
```

## Setup (first time)
1. Create a Supabase project at supabase.com
2. Run `supabase/schema.sql` in the Supabase SQL Editor
3. Fill in `.env.local` with the Project URL and anon key
4. Register on the site, then set `is_admin = true` in Supabase Table Editor → profiles

## Planned Future Features
- More detailed match stats per player
- Season leaderboard / top-rated players
- Comment/reaction system per match
