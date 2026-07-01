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

### WP0 — Home screen + route stubs
- [ ] Replace the placeholder `src/app/page.tsx` body with the **4-button grid**
      (Game Mode primary; Enrich / Tendencies / Gallery secondary).
- [ ] Stub pages so buttons route: `src/app/enrich/page.tsx`,
      `src/app/tendencies/page.tsx`, `src/app/gallery/page.tsx` — each a simple
      "coming soon (Milestone 3 / Phase 2)" card.
- [ ] Add mobile-first styles for the button grid + tiles in `globals.css`.

### WP1 — MLB Stats API core module (`src/core/mlb/`)
Base URL: `https://statsapi.mlb.com/api/v1/` (free, no key).
- [ ] `teamIds.ts` — `TeamCode → mlbTeamId` map (+ reverse), covering all 30.
- [ ] `mlbClient.ts` — pure `fetch` wrappers:
  - [ ] `getScheduleForDate(date)` and/or `getScheduleForTeam(teamId, date)`
        → `[{ gamePk, gameDate, home{code,name,id}, away{...}, venue }]`.
  - [ ] `getActiveRoster(teamId)` → `[{ mlbPersonId, fullName, jerseyNumber,
        position, personType }]` (player vs. coaching/other staff implied by the
        roster endpoint used).
  - [ ] `headshotUrl(mlbPersonId)` — content.mlb.com headshot URL builder.
- [ ] `types.ts` — `MlbGame`, `MlbPerson`, etc.
- [ ] Defensive parsing + timeouts (stadium signal); never throw into the UI.

### WP2 — Game Mode check-in (`/game`)
- [ ] `src/core/games/gameService.ts` — `findOrCreateGame(client, {...})`
      (dedupe on `user_id` + `mlb_game_pk`).
- [ ] `src/lib/checkin.ts` — persist the active check-in (game context + both
      cached rosters) to localStorage/IndexedDB so catches inherit it.
- [ ] `/game` page: fetch today's schedule for the user's `home_team`; show
      one-tap confirm ("You're at: Marlins vs. Mets — confirm").
- [ ] Fallback UI: pick from today's full slate / search when the suggestion is
      wrong or there's no home-team game.
- [ ] On confirm: cache rosters for both teams + show the two Game Mode buttons
      (**Catch**, **Scouting**). Scouting = Phase 2 → stub/disabled for now.

### WP3 — Catch flow, Step 1 "How" (`/game/catch`)
- [ ] 4–5 big tap targets: Home Run, Foul Ball, Toss-up, Batting Practice, Other.
      One tap advances to Who. No scrolling, no thinking.

### WP4 — Catch flow, Step 2 "Who" (roster picker)
- [ ] Full-width search bar: **contains** match (`includes`), case-insensitive,
      **also matches jersey number**.
- [ ] Grid of tiles for both teams' active rosters (from the cached check-in).
- [ ] Tile = name + **jersey badge** + **team-abbrev chip** + headshot;
      **render colored initials immediately, lazy-load headshot on top**.
- [ ] Tile border = team color via `resolveMatchupColors` / `borderForTeam`
      (already in `teamColors.ts`).
- [ ] **Skip tile last**, fixed gray, "?" — logs a catch with `player_id = null`.
- [ ] On pick: build the catch payload (acquisition_type, occurred_at = now,
      person info or null) and hand to the offline queue (WP5).

### WP5 — Offline queue + background sync
- [ ] `src/lib/offline/catchQueue.ts` — IndexedDB store of pending catches
      (catch payload + cached game/person context needed to sync).
- [ ] `enqueueCatch()` called by the Who step; UI confirms instantly ("Logged").
- [ ] `flushQueue(client)` — for each pending catch: `findOrCreateGame` →
      `findOrCreatePlayer` (by `mlb_person_id`, null for Skip) → insert `ball`;
      remove from queue on success, keep + backoff on failure.
- [ ] Flush triggers: `online` event, `visibilitychange` (foreground), short
      timer while app open, and on app load.
- [ ] `src/core/players/playerService.ts` — `findOrCreatePlayer(...)`.
- [ ] `src/core/balls/ballService.ts` — `insertBall(...)`.
- [ ] **Progressive enhancement:** register a Background Sync tag in `sw.js`
      where supported (guarded; no-op on iOS).
- [ ] UI: small pending-sync indicator (e.g. "2 catches waiting to sync").

### WP6 — Tutorial sentence
- [ ] One-line "I caught a ___ from ___" shown on check-in.
- [ ] Default ON; dismissible; stays dismissed after first view (localStorage
      flag), so veterans don't see it.

### WP7 — Polish & test
- [ ] Manual offline test (DevTools → Network → Offline): log catches offline,
      go online, confirm they appear in Supabase with correct game/player reuse.
- [ ] Weak-signal headshot test (initials show, image lazy-loads, no broken img).
- [ ] `npm run build` clean; commit per work package.

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
