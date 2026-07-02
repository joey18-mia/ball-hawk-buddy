# Ball Hawk Buddy — Project Status

> **Master tracker for milestones:** `MILESTONE2.md` (capture — done) ·
> `MILESTONE3.md` (Gallery + Enrich — in progress) · `ballhawk-build-spec.md`
> (full spec + §9a branding-before-domain).
>
> **New chat?** Read this file + `MILESTONE3.md` first — they are the source of
> truth for what's done and what's next. Do not rely on prior conversation context.

## START HERE — session handoff (Jul 2, 2026)

**Project:** Ball Hawk Buddy — PWA for logging baseballs at the stadium (Next.js 16,
Supabase, MLB Stats API). Mobile-first; offline catch queue is critical.

**Done:** M1 (auth/PWA) · M2 (Game Mode capture + sync) · M3 WP0–WP4 (Gallery +
Enrich per-catch form). All committed and pushed to `origin/main`.

**M3 WP4 highlights:** `/enrich/ball/[ballId]` form saves optional fields via
`updateBall`; speciality tags **only** when ball type = Official MLB — Special;
skip → assign player via MLB roster when game has `mlb_game_pk`.

**Next task (do not skip ahead):** **M3 WP5** — HR skip assist: MLB API lists who
homered that game → one-tap assign for skipped home runs. See `MILESTONE3.md` WP5.

**After M3:** WP6 close-out · WP7 game-scoped location · WP8 backfill nudge ·
WP9 polish/build · branding pass (spec §9a) · domain.

**Run:** `npm run dev` → http://localhost:3000 · `.env.local` required (gitignored).

---

## Current Status (as of Jul 2, 2026)

- **Milestone 1 (Foundation): ✅ Complete** — auth, onboarding, PWA scaffold,
  Supabase + RLS, framework-agnostic core. Verified end-to-end (Jun 26).
- **Milestone 2 (Game Mode capture): ✅ Complete** — home screen, check-in,
  How → Who catch flow, offline queue + sync to Supabase, tutorial line. Online
  sync verified; weak-signal headshots verified. True offline round-trip on a
  production build deferred (see `MILESTONE2.md`).
- **Milestone 3 (Gallery + Enrich): 🔄 In progress** — WP0–WP4 **done** (Gallery +
  Enrich shell + per-catch form). WP5–WP9 remain.

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
- **Enrich shell (committed):** `/enrich` game-grouped queue; `/enrich/game/[id]`
  catch list; skip highlighting; stack-screen spacing fix.
- **Per-catch enrich (WP4, committed):** `/enrich/ball/[ballId]` form —
  location, snag method, condition, ball type, kept, notes; roster-based player
  assign for skips; **speciality tags only when ball type = Official MLB —
  Special**; `updateBall` + `enrichFieldLabels.ts`.
- **DB patch applied:** `supabase/patch_balls_enrichment.sql` run in Supabase.

### Not built yet
- HR skip resolution (MLB “who homered”), permanent close-out, game-scoped
  location, backfill-at-signup (M3 WP5–WP8).
- M3 polish + clean production build (WP9).
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
| Jul 2 | Enrich game view: first catch cramped under header card | Added `gap: 14px` to `.stack-screen`. |

---

## Next up

1. **WP5 — HR skip assist:** MLB API “who homered that game” → one-tap assign for
   skipped home runs (`MILESTONE3.md` WP5).
2. **WP6 — Close-out:** “No known player / good enough” → `no_player_resolved`.
3. **WP7 — Game-scoped location:** set once per game, bulk-apply to all catches.
4. **WP8 — Backfill nudge** at signup; **WP9 — polish + `npm run build`**.
5. **Branding pass (pre-domain):** custom Gallery icons — spec §9a.

---

## Environment

- **Supabase:** live project configured; `.env.local` has URL + anon key +
  `NEXT_PUBLIC_SITE_URL=http://localhost:3000`.
- **GitHub:** `origin/main` — push after each work-package commit.
- **Email:** Resend custom SMTP for auth templates.
