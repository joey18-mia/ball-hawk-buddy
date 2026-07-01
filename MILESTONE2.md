# Milestone 2 — Game Mode Capture (plan & tracker)

> Scope source: `STATUS.md` "Next up (Milestone 2)" + `ballhawk-build-spec.md` §3,
> §7, §12. This milestone builds the **capture half** of spec Phase 1. Gallery and
> Enrich are intentionally **deferred to Milestone 3** (only stubbed here so the
> home buttons route somewhere).

## Goal
A signed-in user can: open the app → tap **Game Mode** → confirm today's game in
one tap → log catches as **How → Who** in ~2 taps each → and have those catches
**save offline at the stadium and sync when the connection returns.**

## Definition of done
- [ ] Home screen shows the 4 buttons (Game Mode, Enrich, Tendencies, Gallery).
- [ ] Game Mode check-in auto-suggests today's home-team game (one-tap confirm),
      with a fallback to pick from today's slate.
- [ ] Catch flow logs `How → Who` with the roster picker (search, team-color
      tiles, jersey/abbrev/initials-then-headshot, Skip tile).
- [ ] A catch logged **offline** is queued locally and **syncs automatically**
      when back online (verified with DevTools offline mode).
- [ ] The dismissible tutorial sentence shows on check-in and stays dismissed.
- [ ] `npm run build` passes clean (TypeScript + lint), no schema changes needed.

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

### WP7 — Polish & test
- [ ] Manual offline test (DevTools → Network → Offline): log catches offline,
      go online, confirm they appear in Supabase with correct game/player reuse.
- [ ] Weak-signal headshot test (initials show, image lazy-loads, no broken img).
<!-- - [ ] `npm run build` clean; commit per work package. -->

---

## Out of scope (later milestones)
- **Gallery** (icon grid → sentence view → corner Enrich) — Milestone 3.
- **Enrich Past Catches** (completeness queue, HR skip-resolution) — Milestone 3.
- **Tendencies / Scouting / OOP ranking** — Phase 2 (spec §6).
- **Friends / verification** — Phase 3.
- **Photos** — deferred (spec §8).

## Suggested commit cadence
One commit per work package (WP0 … WP7), pushed after each, so progress is
tracked granularly (not just at release). Tag the milestone when WP7 passes.
