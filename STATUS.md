# Ball Hawk Buddy — Project Status

> **Master tracker for milestones:** `MILESTONE2.md` (capture — done) ·
> `MILESTONE3.md` (Gallery + Enrich — in progress) · `ballhawk-build-spec.md`
> (full spec + §9a branding-before-domain).

## Current Status (as of Jul 2, 2026)

- **Milestone 1 (Foundation): ✅ Complete** — auth, onboarding, PWA scaffold,
  Supabase + RLS, framework-agnostic core. Verified end-to-end (Jun 26).
- **Milestone 2 (Game Mode capture): ✅ Complete** — home screen, check-in,
  How → Who catch flow, offline queue + sync to Supabase, tutorial line. Online
  sync verified; weak-signal headshots verified. True offline round-trip on a
  production build deferred (see `MILESTONE2.md`).
- **Milestone 3 (Gallery + Enrich): 🔄 In progress** — Gallery shipped (WP0–WP2);
  Enrich shell + game-grouped list built (WP3, uncommitted). Per-catch enrich
  form (WP4+) not started.

**Run locally:** `npm run dev` → http://localhost:3000  
**Build note:** on this Windows machine, `npm run build` must run with the sandbox
disabled (see fix log below).

---

## What's built

### Milestone 1 — Foundation
- PWA scaffold (Next.js 16 + TypeScript, manifest, service worker, installable).
- Supabase wiring (browser + SSR clients, `proxy.ts` session refresh + gating).
- Framework-agnostic core under `src/core/` (types, auth, profiles, team colors).
- Auth UI: signup, login, password reset, onboarding.
- Reference SQL: `supabase/schema.sql` (Phase 1 tables + RLS).

### Milestone 2 — Game Mode capture
- **Home:** 4-button grid (Game Mode, Enrich, Tendencies stub, Gallery).
- **Game Mode check-in:** MLB schedule auto-suggest, slate fallback, roster cache
  in localStorage for offline Who picker during the game.
- **Catch flow:** How → Who (search, team-color tiles, initials-then-headshot,
  Skip tile); queue-first IndexedDB → Supabase sync via `SyncManager`.
- **Tutorial:** dismissible one-liner on check-in.
- **Core modules:** `src/core/mlb/`, `games/`, `players/`, `balls/` (insert),
  `src/lib/offline/` (queue + sync).

### Milestone 3 — Gallery + Enrich (partial)
- **Gallery (committed):** `/gallery` tinted ball-icon grid → `/gallery/[id]`
  sentence detail + corner Enrich link. Read layer: `listBallsForUser`,
  `getBallWithContext`, `ballDisplay.ts`.
- **Enrich (WP3, pending commit):** `/enrich` game-grouped queue with gentle
  copy + skip highlighting; `/enrich/game/[gameId]` catch list for a game.
- **DB patch applied:** `supabase/patch_balls_enrichment.sql` run in Supabase
  (enrichment columns on `balls` for M3 Enrich forms).

### Not built yet
- Enrich per-catch form, HR skip resolution (MLB API), close-out, game-scoped
  location, backfill-at-signup (M3 WP4–WP8).
- Tendencies, Scouting, OOP ranking (Phase 2).
- Friends, verification (Phase 3).
- Photos, custom Gallery icons / branding pass (pre-domain — spec §9a).

---

## Key fix log

| Date | Issue | Fix |
|------|-------|-----|
| Jun 26 | Supabase `.insert()` typed as `never[]` | Convert table `Row` shapes from `interface` to `type` aliases. |
| Jun 26 | Password-reset links: `pkce_code_verifier_not_found` | Auth callback accepts `token_hash` + OTP; email templates use OTP format; Resend SMTP. |
| Jul 1 | Catch screen: "check in first" after check-in | Store local `todayIso()` at check-in, not MLB UTC `gameDate`. |
| Jul 2 | Sync pill stuck: "Syncing 1 catch…" | Live `balls` table missing enrichment columns; `insertBall` now sends only 5 core fields. Added `[sync]` diagnostics + `patch_balls_enrichment.sql`. |

---

## Next up

1. **Commit + continue M3:** WP4 per-catch enrich form (`/enrich?ball=…`), then
   HR skip resolution, close-out, game-scoped location, backfill nudge.
2. **Branding pass (pre-domain):** custom Gallery acquisition icons, PWA icon,
   copy polish — see `ballhawk-build-spec.md` §9a.
3. **Optional:** production-build offline round-trip test for catch sync.

---

## Environment

- **Supabase:** live project configured; `.env.local` has URL + anon key +
  `NEXT_PUBLIC_SITE_URL=http://localhost:3000`.
- **GitHub:** `origin/main` — push after each work-package commit.
- **Email:** Resend custom SMTP for auth templates.
