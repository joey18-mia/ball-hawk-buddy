# Milestone 3 — Gallery + Enrich (plan & tracker)

> Scope source: `ballhawk-build-spec.md` §4, §5, §12 Phase 1 remainder.
> Milestone 2 (Game Mode capture + sync) is **done** — this milestone completes
> the **capture-and-complete loop** before Phase 2 (Tendencies / Scouting).

## Goal
A signed-in user can browse their collection in **Gallery** (tinted ball grid →
sentence detail → corner Enrich), then use **Enrich Past Catches** to add optional
detail, resolve skipped players (with MLB HR assist), or permanently close out
catches — plus a gentle **backfill nudge** at signup so day one isn't empty.

## Definition of done
- [ ] Gallery grid: one tile per catch, tinted by `how`; tap → sentence view.
- [ ] Gallery detail: catch sentence + small corner **Enrich** button (links to
      Enrich flow for that ball).
- [ ] Enrich mode: game-grouped list; gentle copy; unresolved Skips prioritized.
- [ ] Per-catch enrichment: update optional fields (`location`, `speciality`,
      `notes`, `snag_method`, `ball_condition`, `ball_brand`, `kept`).
- [ ] Skip resolution: for skipped **home runs**, MLB API offers who homered that
      day → one-tap assign.
- [ ] Close-out: mark `no_player_resolved` — permanently removes from queue.
- [ ] Game-scoped location: set once per game, apply to all catches in that game.
- [ ] Backfill at signup: onboarding nudge to log a few past catches (same How →
      Who flow, unhurried).
- [ ] `npm run build` passes clean.

---

## Key decisions & assumptions
- **No new tables.** Completeness is derived from existing `balls` columns +
  `no_player_resolved`. Enrichment columns exist after running
  `supabase/patch_balls_enrichment.sql` (done Jul 2).
- **Gallery / Enrich assume wifi** (spec §7) — no offline queue needed here.
- **Player profiles (Phase 2)** are out of scope; Gallery shows player name as
  text only (no link to Tendencies yet).
- **Photos deferred** (spec §8) — tiles are photo-shaped ball icons; pictures
  drop in later without layout changes.
- **Framework-agnostic core** stays under `src/core/`; pages under `src/app/`.

---

## Work packages (ordered by dependency)

### WP0 — Ball read service + display helpers ✅
- [x] `listBallsForUser(client, userId)` — balls + joined `games` + `players`,
      newest first.
- [x] `getBallWithContext(client, ballId, userId)` — single catch for detail view
      (RLS-scoped via user_id).
- [x] `ballDisplay.ts` — how labels, acquisition tints, sentence formatter,
      short date, completeness / needs-enrichment helpers.

### WP1 — Gallery grid (`/gallery`) ✅
- [x] Replace `ComingSoon` stub with auth-gated server page.
- [x] Responsive icon grid; each tile = tinted ball icon (photo-shaped slot).
- [x] Empty state when no catches yet (link to Game Mode + backfill hint).
- [x] Mobile-first styles in `globals.css`.

### WP2 — Gallery detail (`/gallery/[id]`) ✅
- [x] Sentence view matching capture language.
- [x] Small corner **Enrich** button → `/enrich?ball=<id>` (wired in WP4).
- [x] Back nav to grid.

### WP3 — Enrich shell + game-grouped list (`/enrich`) ✅
- [x] Replace stub; auth gate.
- [x] Gentle header copy (*"Some catches still need enrichment."*).
- [x] Game-grouped rows: *"Sunday vs. Mets · 4 balls · add details"*; highlight
      games with unresolved Skips.
- [x] `/enrich/game/[gameId]` — catch list for a game (links to per-catch form in WP4).

### WP4 — Per-catch enrich form
- [ ] Route: `/enrich/[ballId]` (or query param from Gallery).
- [ ] Form for optional enrichment fields + assign player (reuse roster when
      game has `mlb_game_pk` + date, else manual skip close-out only).
- [ ] `updateBall` in `ballService.ts`.

### WP5 — HR skip resolution (MLB API)
- [ ] `getHomeRunsForGame(gamePk)` in `mlbClient.ts` (boxscore / play-by-play).
- [ ] UI: skipped HR → offer homers list → one-tap assign player.

### WP6 — Permanent close-out
- [ ] "No known player / good enough" → set `no_player_resolved = true`.
- [ ] Removes catch from enrichment queue (completeness helper respects flag).

### WP7 — Game-scoped location
- [ ] In Enrich game view: set `location` once → bulk-update all balls in that
      game for this user (with per-catch override still available in WP4).

### WP8 — Backfill at signup
- [ ] Post-onboarding nudge (dismissible): *"Add a few catches you already have"*
      → `/game/catch` in backfill mode (no check-in required) OR lightweight
      manual game picker — TBD during implementation.

### WP9 — Polish & test
- [ ] `npm run build` clean.
- [ ] Manual: Gallery with 0 / 1 / many catches; detail → Enrich link; enrich a
      field and confirm Supabase update.

---

## Out of scope (Phase 2+)
- Tendencies directory, player profiles, OOP ranking, Scouting.
- Friends, verification, photos.

## Commit cadence
One commit per work package (WP0 … WP9), pushed after each.

## Status snapshot
**Jul 2, 2026** — Gallery committed (`467d0bc`). WP3 Enrich shell built (uncommitted).
Next: WP4 per-catch enrich form.
