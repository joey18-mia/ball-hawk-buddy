# Milestone 2 — Game Mode Capture (plan & tracker)

> Scope source: `STATUS.md` "Next up (Milestone 2)" + `ballhawk-build-spec.md` §3,
> §7, §12. This milestone builds the **capture half** of spec Phase 1. Gallery and
> Enrich are intentionally **deferred to Milestone 3** (only stubbed here so the
> home buttons route somewhere).

## Goal
A signed-in user can: open the app → tap **Game Mode** → confirm today's game in
one tap → log catches as **How → Who** in ~2 taps each → and have those catches
**save offline at the stadium and sync when the connection returns.**

---

## Status snapshot (as of Jul 2, 2026) — START HERE next session

**Working (verified in browser):**
- Home 4-button screen → Game Mode.
- Check-in: auto-suggest / slate fallback → confirm → rosters cached.
- Catch flow end-to-end **online**: How → Who (search, team-color tiles, Skip) →
  "Logged" confirmation → **catch enqueues and SYNCS to Supabase** (verified: a
  `balls` row lands; `[sync] done — synced=1` in console).
- Weak-signal headshots: initials render immediately, headshot lazy-loads on top
  (verified under Slow 3G) — no broken-image icons.
- Full production build is clean; all WPs (WP0–WP6) built, committed, and pushed.

**Fixed this session (Jul 2):**
- **Sync was silently failing** — the pill hung at "Syncing 1 catch…" forever.
  Root cause: the live `balls` table is **missing the enrichment columns**
  (created from an older schema; `create table if not exists` can't add columns),
  and `insertBall` was sending `ball_brand`/etc. as null → PostgREST error
  "Could not find the 'ball_brand' column …". Fix: `insertBall` now writes ONLY
  the 5 core fields; enrichment fields are optional on the `BallInsert` type.
  Added `[sync]` console diagnostics (kept) so future sync failures are visible.
  Also added `supabase/patch_balls_enrichment.sql` (idempotent `ADD COLUMN IF NOT
  EXISTS`) to bring the live table up to spec for the M3 Enrich flow.
- (Jul 1) "Check in first" bug: check-in stored the MLB **UTC** `gameDate` which
  can roll to the next day for night games, failing the local `todayIso()` check.
  Fix: store the **local** date at check-in (`src/app/game/CheckIn.tsx`).

**ACTION NEEDED (user):**
- Run `supabase/patch_balls_enrichment.sql` in the Supabase SQL editor so the
  `balls` table matches `schema.sql` (not needed for capture; needed for M3).

**OPEN — real offline round-trip still unverified:**
- Logging a catch **while offline in `next dev`** kicks you off the page. This is
  a dev-mode limitation, NOT a sync bug: `/game/catch` is a server component
  behind auth (needs a server round-trip) and `next dev` doesn't precache the app
  shell in the service worker. The queue-first sync mechanism itself is verified
  online. **To truly validate stadium-offline, test a production build**
  (`npm run build && npm start`, SW active): go offline on `/game/catch`, log a
  catch (should queue → "1 catch waiting · offline"), go online, confirm it syncs.
  If prod also can't hold the route offline, that's a real gap to design for
  (client-side session check / SW navigation fallback for the catch route).

**How to run:** `npm run dev` → http://localhost:3000. Build must be run with the
sandbox disabled on this Windows machine (see `STATUS.md`).

---

## Definition of done
- [x] Home screen shows the 4 buttons (Game Mode, Enrich, Tendencies, Gallery).
- [x] Game Mode check-in auto-suggests today's home-team game (one-tap confirm),
      with a fallback to pick from today's slate.
- [x] Catch flow logs `How → Who` with the roster picker (search, team-color
      tiles, jersey/abbrev/initials-then-headshot, Skip tile).
- [~] A catch logged **offline** is queued locally and **syncs automatically**
      when back online. Online sync **verified** (row lands in Supabase); true
      offline round-trip needs a **production-build** test (see Status snapshot —
      dev mode can't serve the auth-gated catch route offline).
- [x] The dismissible tutorial sentence shows on check-in and stays dismissed.
- [x] `npm run build` passes clean (TypeScript + lint), no schema changes needed.

---

## Key decisions & assumptions
- **No DB schema changes.** `games`, `players`, `balls` already exist with RLS.
- **`home_team` is a `TeamCode`** (e.g. `"MIA"`), per onboarding. We need a
  `TeamCode → MLB Stats API team id` map (Marlins=146, Mets=121, …).
- **Check-in needs network; in-game catching does not.** The schedule + both
  rosters are fetched at check-in and **cached locally**, so the Who picker and
  Catch flow work offline during the game. (Matches spec: offline is for the
  Catch flow specifically; Enrich/Tendencies/Gallery assume wifi.)
- **Offline strategy = IndexedDB queue + flush triggers**, with the Background
  Sync API as progressive enhancement only. Rationale: the Background Sync API
  isn't supported on iOS Safari, and this is an installable PWA targeting iOS.
  Baseline that works everywhere: queue in IndexedDB, flush on `online` event,
  on app foreground (`visibilitychange`), and on a short retry timer while open.
- **Always queue-first.** Even when online, a catch is written to the local queue
  first, then flushed — so the capture tap never blocks on the network and the
  online/offline paths are identical (no race, no divergent code).
- **Reuse rows on sync** (spec): dedupe `games` by `(user_id, mlb_game_pk)` and
  `players` by `mlb_person_id`, so OOP counts aggregate correctly later.
- **Framework-agnostic core** stays UI-free under `src/core/` for the future Expo
  app; browser-only bits (IndexedDB, service worker) live under `src/lib/`.

---

## Work packages (ordered by dependency)

### WP0 — Home screen + route stubs ✅
- [x] Replace the placeholder `src/app/page.tsx` body with the **4-button grid**
      (Game Mode hero; Enrich / Tendencies / Gallery secondary).
- [x] Stub pages so buttons route: `src/app/enrich/page.tsx`,
      `src/app/tendencies/page.tsx`, `src/app/gallery/page.tsx` (+ a temporary
      `src/app/game/page.tsx` stub, replaced in WP2) via a shared
      `ComingSoon` component.
- [x] Add mobile-first styles for the button grid + tiles in `globals.css`.

### WP1 — MLB Stats API core module (`src/core/mlb/`) ✅
Base URL: `https://statsapi.mlb.com/api/v1/` (free, no key). Response shapes
verified against the live API.
- [x] `teamIds.ts` — `TeamCode ↔ mlbTeamId` map, covering all 30.
- [x] `mlbClient.ts` — pure `fetch` wrappers:
  - [x] `getScheduleForDate(date)` + `getScheduleForTeam(team, date)`
        → `MlbGame[]` with home/away resolved to our `TeamCode`.
  - [x] `getActiveRoster(team)` → `MlbPerson[]` (active players + coaches
        merged; `person_type` implied by list; coaches best-effort).
  - [x] `headshotUrl(mlbPersonId)` — img.mlbstatic.com headshot builder.
  - [x] `todayIso(timeZone?)` helper for the check-in date.
- [x] `types.ts` — `MlbGame`, `MlbPerson`, `MlbTeamRef`.
- [x] Defensive parsing + 8s timeout (stadium signal); errors as `MlbApiError`.

### WP2 — Game Mode check-in (`/game`) ✅
- [x] `src/core/games/gameService.ts` — `findOrCreateGame(client, {...})`
      (dedupe on `user_id` + `mlb_game_pk`).
- [x] `src/lib/checkin.ts` — persist the active check-in (game context + both
      cached rosters) to localStorage so catches inherit it + work offline.
- [x] `/game` page (server) → `CheckIn` client component: auto-suggest today's
      home-team game with one-tap confirm ("You're at: … — confirm").
- [x] Fallback UI: pick from today's full slate when the suggestion is wrong or
      there's no home-team game; graceful empty/error/retry states.
- [x] On confirm: cache both rosters + show the two Game Mode buttons
      (**Catch** → `/game/catch`, **Scouting** disabled = Phase 2). Resume an
      existing same-day check-in; "check into a different game" to reset.
- [x] Verified MLB API sends `Access-Control-Allow-Origin: *` (no CORS proxy).

### WP3 — Catch flow, Step 1 "How" (`/game/catch`) ✅
- [x] `/game/catch` server page (auth gate + userId) → `CatchFlow` client
      component with `how → who` step state; guards "check in first".
- [x] 5 big tap targets: Home Run, Foul Ball, Toss-up, Batting Practice, Other.
      One tap advances to Who. Back nav between steps. (Who step is a placeholder
      until WP4.)

### WP4 — Catch flow, Step 2 "Who" (roster picker) ✅
- [x] Full-width search bar: **contains** match (`includes`), case-insensitive,
      **also matches jersey number**.
- [x] Grid of tiles for both teams' active rosters (from the cached check-in),
      home team first then alphabetical.
- [x] Tile = name + **jersey badge** + **team-abbrev chip** + headshot;
      **colored initials render immediately, headshot lazy-loads on top** with an
      `onError` fallback (readable text color computed per team color).
- [x] Tile border = team color via `borderForTeam` (already in `teamColors.ts`).
- [x] **Skip tile last**, fixed gray, "?" — commits a catch with no player.
- [x] On pick/skip: `commit()` shows the sentence confirmation; the actual
      offline-queue enqueue is wired in WP5. (Also fixed a WP2 lint nit:
      set-state-in-effect for localStorage hydration.)

### WP5 — Offline queue + background sync ✅
- [x] `src/lib/offline/catchQueue.ts` — IndexedDB store of pending catches
      (catch payload + cached game/person context needed to sync) + a
      `bhb:queue-changed` event so the UI reacts.
- [x] `enqueueCatch()` called by the Who step (queue-first, even when online);
      UI confirms instantly with the sentence.
- [x] `flushQueue(client)` (`src/lib/offline/sync.ts`) — per pending catch:
      ensure game → `findOrCreatePlayer` (by `mlb_person_id`, null for Skip) →
      `insertBall`; remove on success, bump attempts on failure. Guarded against
      re-entrancy and offline.
- [x] Flush triggers via `SyncManager` (mounted in layout): `online`,
      `visibilitychange`, 30s interval, mount, and SW `bhb:flush` messages.
- [x] `src/core/players/playerService.ts` — `findOrCreatePlayer(...)` (dedupe +
      race-safe re-fetch on unique violation).
- [x] `src/core/balls/ballService.ts` — `insertBall(...)`.
- [x] **Progressive enhancement:** `requestBackgroundSync()` registers a sync tag
      where supported; `sw.js` `sync` handler messages open clients to flush
      (no-op on iOS, where the in-app triggers cover it).
- [x] UI: `SyncManager` pill — "Syncing N catches…" / "N waiting · offline".
- Note: end-to-end offline behavior gets verified in WP7 (DevTools offline).

### WP6 — Tutorial sentence ✅
- [x] One-line "I caught a ___ from ___" shown on the checked-in screen
      (`TutorialLine`).
- [x] Default ON; dismissible (×); stays dismissed after first view
      (localStorage flag via `src/lib/tutorial.ts`), so veterans don't see it.

### WP7 — Polish & test (MOSTLY DONE)
- [x] `npm run build` clean (all 14 routes compile, TypeScript + eslint clean).
- [x] Online capture flow works end-to-end in the browser (through "Logged").
- [x] **Sync flush completes** — verified the `balls` row lands in Supabase
      (`[sync] done — synced=1`). Fixed the `ball_brand` schema-cache error by
      trimming `insertBall` to core fields (see Fixed this session).
- [x] Weak-signal headshot test — initials show, headshot lazy-loads on top,
      no broken images (verified under Slow 3G).
- [ ] **Offline round-trip on a PRODUCTION build** (`npm run build && npm start`):
      dev mode can't serve the auth-gated `/game/catch` route offline, so this
      must be validated against the SW-precached prod build. Deferred by choice —
      see Status snapshot "OPEN" item. Sync mechanism itself is verified online.

---

## Roadmap / future plans

### Finish Milestone 2 (immediate)
1. Confirm/fix offline sync completion (open item above).
2. Complete WP7 offline + weak-signal tests.
3. Final WP7 commit; optionally tag the milestone.

### Milestone 3 — the rest of spec Phase 1 (capture-and-complete loop)
- **Gallery** (spec §4): icon grid, one tile per catch tinted by `how`; tap →
  sentence view; corner **Enrich** button. Built photo-shaped for later photos.
- **Enrich Past Catches** (spec §5): completeness state per catch; gentle
  game-grouped surfacing; prioritize **unresolved Skips**; game-scoped assisted
  completion incl. **MLB "who homered that day"** skip-resolution; permanent
  close-out ("no known player / good enough"). Reachable from Gallery too.
- **Backfill at signup** (spec §5): onboarding nudge to add a few past catches
  via the same How → Who flow.

### Phase 2 — Player intelligence (spec §6)
- **Tendencies** league-wide directory + **player profiles**.
- **OOP ranking** (all balls attributed to a player, aggregated across users) —
  a computed view/query over `balls` grouped by `player_id`.
- **Scouting** (2nd Game Mode button): game-scoped Tendencies for the ~50 people
  in the current matchup.
- Tendencies **area filter**.

### Phase 3 — Social + depth (spec §12)
- **Friends** (request/accept), friend **check-ins**, presence-based
  **verification** + authenticity badge. Needs the Phase 3 tables
  (`friendships`, `game_checkins`, `verifications`) + RLS — not yet in the schema.
- Acquisition-type **filters** on Tendencies/Scouting; deeper breakdowns.

### Deferred
- **Photos** (spec §8) — no image storage in this build; Gallery is built
  photo-shaped so they drop in later (Cloudflare R2 when added).

## Tech debt / notes for later
- MLB API is fetched **directly from the browser** (CORS-open). Fine for now; a
  server route could add caching/rate-limit protection later.
- `game_date` now stores the **local** check-in date (`todayIso()`), matching the
  schedule query. Revisit if we ever need the venue-local date precisely.
- The offline queue has no max-attempts cap; a permanently-failing item retries
  forever. Consider a cap + surfaced error once sync is confirmed working.

## Commit cadence
One commit per work package (WP0 … WP7), pushed after each. Tag the milestone
when WP7 passes. (WP0–WP6 + the check-in date fix are committed & pushed.)
