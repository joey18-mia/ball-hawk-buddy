# Ball Hawk Buddy

Mobile-first, installable **PWA** for baseball fans who snag balls at MLB games.
Log a ball in ~2 taps at the stadium, enrich it later from the couch.

Built with **Next.js + TypeScript + Supabase**, deployed to **Vercel**. No
separate mobile codebase — "Add to Home Screen" is the launch app.

> This repo is being built in phases. **Milestone 1 (Foundation)** is complete:
> PWA scaffold, Supabase wiring, and email/password auth with profile + unique
> username. Game Mode, Gallery, and Enrich follow in later milestones.

## Architecture

Business logic is kept **framework-agnostic** and separate from React UI so a
future Expo/React Native app can reuse it:

```
src/
  core/                  # framework-agnostic logic (no React/Next imports)
    types/database.ts    # DB types mirroring the SQL schema (spec §10)
    auth/                # auth service + pure validation
    profiles/            # profile data access
    teams/teamColors.ts  # the provided team-color asset (tile borders)
  lib/                   # Next.js-specific glue
    supabase/            # browser/server clients + middleware (anon key only)
    pendingProfile.ts
  components/            # shared React UI
  app/                   # Next.js App Router routes (UI only)
public/
  manifest.webmanifest   # PWA manifest
  sw.js                  # service worker (app shell now; offline queue in M2)
  icons/                 # SVG app icons
supabase/
  schema.sql             # Phase 1 tables + RLS (spec §10/§11)
```

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create a Supabase project**, then run `supabase/schema.sql` in the Supabase
   SQL editor (creates the Phase 1 tables + RLS). You can also use your own SQL —
   the TypeScript types in `src/core/types/database.ts` mirror this schema.

3. **Configure environment**

   ```bash
   cp .env.local.example .env.local
   ```

   Fill in from Supabase → Project Settings → API:

   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (the **anon/public** key — never the
     service-role key)
   - `NEXT_PUBLIC_SITE_URL` (e.g. `http://localhost:3000` in dev)

   In Supabase → Authentication → URL Configuration, add
   `http://localhost:3000/auth/callback` (and your Vercel URL) as a redirect URL.

4. **Run it**

   ```bash
   npm run dev
   ```

   Open http://localhost:3000 → you'll be routed to log in / sign up.

## Auth flow

- **Sign up** collects email, password, and a unique username (+ optional
  display name / home team). With email confirmation enabled, the profile row is
  created right after the user confirms and lands on `/onboarding`.
- **Login** and **password reset** (request link → set new password) are wired.
- A Supabase **anon key** is the only credential the browser ever sees. The
  service-role key is not used anywhere in this app.

## PWA notes

- Installable via the manifest + service worker. The SW currently caches the app
  shell; the **offline Catch queue** with background sync arrives in Milestone 2.
- The service worker is disabled in `next dev` to avoid stale-cache confusion —
  test install/offline against a production build (`npm run build && npm start`).
- Icons are SVG for crispness and zero binary churn. If you want pixel-perfect
  iOS home-screen icons, drop `icon-192.png` / `icon-512.png` into `public/icons`
  and add them back to the manifest.
