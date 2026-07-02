# Milestone 3 — Gallery + Enrich (plan & tracker)

> Scope source: `ballhawk-build-spec.md` §4, §5, §12 Phase 1 remainder.
> Milestone 2 (Game Mode capture + sync) is **done** — this milestone completes
> the **capture-and-complete loop** before Phase 2 (Tendencies / Scouting).
>
> **New chat?** Pair with `STATUS.md` — START HERE section has the handoff.
> Work packages below are the implementation checklist.

## START HERE — M3 handoff

| WP | Status | What |
|----|--------|------|
| WP0–WP2 | ✅ | Gallery grid + detail (`/gallery`, `/gallery/[id]`) |
| WP3 | ✅ | Enrich shell — game-grouped queue (`/enrich`, `/enrich/game/[id]`) |
| WP4 | ✅ | Per-catch form (`/enrich/ball/[ballId]`), `updateBall`, speciality gating |
| **WP5** | **NEXT** | HR skip assist — MLB homers list for skipped HRs |
| WP6 | pending | Permanent close-out (`no_player_resolved`) |
| WP7 | pending | Game-scoped location bulk-set |
| WP8 | pending | Backfill nudge at signup |
| WP9 | pending | `npm run build` + manual QA |

**Key files (WP4):** `src/app/enrich/ball/[ballId]/`, `src/core/balls/ballService.ts`
(`updateBall`), `src/core/balls/enrichFieldLabels.ts`, `src/core/balls/ballDisplay.ts`.

**Do not start WP5 until asked** — user preference as of Jul 2 commit.

---

## Goal
A signed-in user can browse their collection in **Gallery** (tinted ball grid →
sentence detail → corner Enrich), then use **Enrich Past Catches** to add optional
detail, resolve skipped players (with MLB HR assist), or permanently close out
catches — plus a gentle **backfill nudge** at signup so day one isn't empty.

## Definition of done
- [x] Gallery grid: one tile per catch, tinted by `how`; tap → sentence view.
- [x] Gallery detail: catch sentence + small corner **Enrich** button (links to
      Enrich flow for that ball).
- [x] Enrich mode: game-grouped list; gentle copy; unresolved Skips prioritized.
- [x] Per-catch enrichment: update optional fields (`location`, `speciality`,
      `notes`, `snag_method`, `ball_condition`, `ball_brand`, `kept`). Speciality
      only when ball type = **Official MLB — Special**.
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
- **Speciality tags** apply only when `ball_brand = official_mlb_special` (UI:
  “Official MLB — Special”). Other ball types do not show or require speciality.
- **Player profiles (Phase 2)** are out of scope; Gallery shows player name as
  text only (no link to Tendencies yet).
- **Photos deferred** (spec §8) — tiles are photo-shaped ball icons; custom
  per-`how` icons come in the branding pass (spec §9a).
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
- [x] Small corner **Enrich** button → `/enrich/ball/<id>`.
- [x] Back nav to grid.

### WP3 — Enrich shell + game-grouped list (`/enrich`) ✅
- [x] Replace stub; auth gate.
- [x] Gentle header copy (*"Some catches still need enrichment."*).
- [x] Game-grouped rows: *"Sunday vs. Mets · 4 balls · add details"*; highlight
      games with unresolved Skips.
- [x] `/enrich/game/[gameId]` — catch list for a game.
- [x] Stack-screen spacing (`gap: 14px`) between header card and catch list.

### WP4 — Per-catch enrich form ✅
- [x] Route: `/enrich/ball/[ballId]` (+ `/enrich?ball=` redirect).
- [x] Form: location, snag method, condition, ball type, kept, notes.
- [x] **Speciality checkboxes only when ball type = Official MLB — Special**
      (`official_mlb_special`); cleared on save for other types.
- [x] Assign player for skips via roster fetch (when game has `mlb_game_pk`).
- [x] Gallery Enrich link returns to catch detail on back; game list returns to
      game view.
- [x] `updateBall` in `ballService.ts`; `enrichFieldLabels.ts`.

### WP5 — HR skip resolution (MLB API) ← **NEXT**
- [ ] `getHomeRunsForGame(gamePk)` in `mlbClient.ts` (boxscore / play-by-play).
- [ ] UI: skipped **home run** → offer homers list → one-tap assign player
      (instead of scrolling full roster).

### WP6 — Permanent close-out
- [ ] "No known player / good enough" → set `no_player_resolved = true`.
- [ ] Removes catch from enrichment queue (completeness helper respects flag).

### WP7 — Game-scoped location
- [ ] In Enrich game view: set `location` once → bulk-update all balls in that
      game for this user (with per-catch override still available in WP4).

### WP8 — Backfill at signup
- [ ] Post-onboarding nudge (dismissible): *"Add a few catches you already have"*
      → lightweight backfill flow (no live check-in required).

### WP9 — Polish & test
- [ ] `npm run build` clean.
- [ ] Manual: Gallery → Enrich → save field → Supabase row updates; enrich queue
      shrinks correctly.

---

## Out of scope (Phase 2+)
- Tendencies directory, player profiles, OOP ranking, Scouting.
- Friends, verification, photos.

## Commit cadence
One commit per work package (WP0 … WP9), pushed after each.

## Status snapshot (Jul 2, 2026)

**Committed + pushed:** WP0–WP4.  
**Next when ready:** WP5 HR skip assist (see WP5 section above).

---

## After Milestone 3
- **Branding pass** before domain (spec §9a): custom Gallery acquisition icons,
  PWA icon, copy polish.
- **Phase 2:** Tendencies, player profiles, OOP ranking, Scouting.
