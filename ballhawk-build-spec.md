# Ball Hawk — Project Build Specification (v2)

> **How to use this document:** Paste this whole file into Cursor or Claude Code as the project spec. It's written so an AI coding agent can scaffold the app, set up the database, and build features in phases. **Build Phase 1 completely and confirm it works before starting Phase 2.** Where a decision is left open, the doc states a recommended default — follow the default unless told otherwise.

---

## 1. What we're building

**Ball Hawk** is a mobile-first web app for baseball fans who attend games to snag baseballs — home runs, fouls, toss-ups from players and staff, batting-practice balls. Users log the balls they catch, the app builds **player tendency data** (who gives up the most balls, and how), and that data helps users decide who to target and where to sit at the next game.

**The product is built around two ideas:**

1. **Capture should be near-instant in the moment**, then enriched later at leisure. A fan who just caught a ball, on bad stadium signal, should log it in ~2 taps. Details that take thought are added afterward, from the couch.
2. **The data model is a sentence:** *"I caught a `[how]` from `[who]`."* That sentence is both the capture flow and the teaching device.

**Primary use context:** phone, at the stadium, on weak signal. Anything that makes a user stop and think during capture is a field that won't get filled — which produces *bad* data, not more data.

---

## 2. Information architecture (the whole app at a glance)

**Home screen — 4 buttons:**

| Button | Purpose |
|---|---|
| **Game Mode** | At-the-game capture. Fast. |
| **Enrich Past Catches** | Add optional detail to catches logged earlier. The couch surface. |
| **Tendencies** | League-wide player data + player profiles. The "study" surface. |
| **Gallery** | Visual grid of your collection. |

**Inside Game Mode — 2 buttons only:**

| Button | Purpose |
|---|---|
| **Catch** | Log a ball: How → Who. |
| **Scouting** | Same data engine as Tendencies, auto-scoped to the game you're at. |

That's the entire structure. Everything below details these surfaces.

---

## 3. Game Mode

### Check-in (entering Game Mode)
On entering Game Mode, auto-suggest **today's game** using the MLB Stats API schedule + the user's home team, shown as a one-tap confirm ("You're at: Marlins vs. Mets — confirm"). If wrong or it's not a home-team game, let them pick from today's slate or search. **Every catch logged this session inherits that game and an automatic timestamp** — zero per-ball cost for game and time.

### Catch flow — `Caught → How → Who`
This order is deliberate: you know *how* you got the ball instantly and with certainty; *who* sometimes takes a beat. Front-loading the certain, easy tap protects the most important data (the "how") and builds momentum before the harder "who" step.

**Step 1 — How** (one tap, 4–5 big buttons): `Home Run`, `Foul Ball`, `Toss-up`, `Batting Practice`, `Other`. Big targets, no scrolling, no thinking.

**Step 2 — Who** (the roster picker):
- **Full-width search bar at the top.** Search uses **"contains" matching, not prefix** — typing `ssi` returns `Owen Caissie`. Implementation: `name.toLowerCase().includes(query.toLowerCase())`. **Also match on jersey number** — typing `22` jumps to #22.
- **Below it, a grid of tappable tiles** — every player and staff member on the **active rosters of both teams** in the checked-in game (pulled from the MLB Stats API). The search bar filters this grid live.
- **Each tile shows:** the person's name, **jersey number badge**, a **team-abbreviation chip** (e.g. `MIA` / `NYM`), and a headshot. **Render colored initials immediately, lazy-load the headshot on top** — on bad signal you still get a recognizable, tappable tile instead of a broken image.
- **Tile border = team color**, resolved so the two teams never clash (see §3.1).
- **Player-vs-staff is captured implicitly** by which roster list the person is in — no extra tap. Store `person_type` accordingly.

**The "Skip" tile** (the escape for when there's no clear person — a scramble home run, a foul off the concourse, or "I'll figure it out later"):
- It's a **tile in the grid like any other**, placed **last**, so it sits far from the search bar (misclick protection) and you scroll past everyone to reach it.
- **Gray border, white fill, gray "?"** — the only colorless tile in a grid of team-colored ones, so it reads instantly as "none of these." Label: **"Skip"**.
- Skipping is valid and non-destructive: the catch logs fine as *"I caught a home run @ the game"* with no player. It just won't feed any player's tendency data until resolved in Enrich (§5). **We never want users guessing a name to finish the flow — a guessed player poisons the tendency engine.**

### 3.1 Team color resolution (so two blue teams don't look identical)
- **Hardcode a color map for all 30 MLB teams** (ordered palette: primary, secondary, tertiary). Do *not* pull colors from the MLB API — it doesn't serve them reliably. 30 teams is a one-time static map.
- Home team takes its primary. Away team takes the **first color in its palette far enough from the home color** on the hue wheel. (Marlins home → blue; Mets primary is also blue → clash → fall to Mets secondary, orange.)
- The **team-abbreviation chip on every tile is the guarantee**: it disambiguates even when two teams are unavoidably similar, and it covers colorblind users (~8% of men; red-green most common). Color is the fast glance; the chip is the certainty.
- The **Skip tile is fixed gray** — never computed — so it can't collide with any team color, and gray semantically reads as "no team."

### 3.2 Tutorial
A one-line guided version of the sentence — *"I caught a ___ from ___"* — shown on check-in. **Default on, dismissible**, and off by default once a user has seen it / for veterans. Teaching the sentence teaches the data model without anyone realizing it.

### Scouting (the 2nd Game Mode button)
Same data engine as Tendencies (§6), but **auto-scoped to the game you're checked into** — it ranks just the ~50 people in this matchup by **OOP count** (§6) so you can decide who to target and where to sit *right now*. "Scouting" is the forward-looking, at-the-game framing of the same numbers Tendencies shows.

---

## 4. Gallery

A visual grid of your collection — **one tile per catch**.
- Each tile is a **ball icon, tinted/marked by `how` (acquisition type)** so a wall of toss-ups looks different from a wall of home runs. (A grid of identical balls is boring; a grid where you can see your *mix* is a trophy case.)
- Tapping a tile opens the catch in **sentence form** — *"Toss-up from Owen Caissie · Marlins vs. Mets · Jun 8"* — the same language used at capture.
- The individual-catch view has a **small "Enrich" button in a corner**, so a user browsing who notices a missing detail can jump straight into enrichment without going to the dedicated mode.
- **Built photo-shaped from day one:** the icon occupies the slot a photo would. If we add photos later (see §8), pictures drop into the existing layout with no redesign.

---

## 5. Enrich Past Catches

**Concept:** Game Mode intentionally captures only `how` + `who` (+ auto game/time). **Everything else is optional data added later that improves Scouting/Tendencies.** "Enrichment" is the tracked, guided, dismissible process of fleshing out those thin records. It is *not* a generic edit screen — the app tracks what's incomplete and helps close it.

**Copy:** *"Some catches still need enrichment."* (Gentle invitation, never a guilt badge — the user did exactly the right thing in the moment.) **This prompt lives in Enrich Mode only — never in Game Mode**, which stays a blank fast-capture canvas.

**Three mechanisms:**

1. **Completeness state per catch.** A Game Mode catch is "logged but thin." The app knows which optional fields are empty and — most importantly — whether the `who` is a real player or an **unresolved Skip**. The unresolved Skip is the *only* thing genuinely worth resolving (it affects attribution); optional details are pure bonus and should never nag.

2. **Gentle surfacing, game-grouped.** Show recent games with a quiet line like *"Sunday vs. Mets · 4 balls · add details."* Highlight unresolved Skips as the priority.

3. **Game-scoped, assisted completion.** You were in one section all game, so **set location once for all catches in that game**, then tweak the one foul you ran down the line. For a **skipped home run, the app calls the MLB Stats API** (it has wifi/time now, unlike Game Mode) and offers *"Here's who homered that day: Lindor (T3), Alonso (B6)"* — resolving a skip becomes a one-tap recognition ("oh right, Alonso!") instead of a memory test. (Home runs are clean to look up; fouls are ambiguous, so we don't guess those.)

**Closing out (keeps the queue honest):** every catch has two ways to "finish":
- **Add detail / assign a player**, or
- **Mark "no known player / good enough"** — permanently resolves it and removes it from the queue.

Without that permanent close-out, the queue fills with un-completable junk (the scramble homer you'll never identify) and users stop trusting the count.

**Also reachable** per-catch from Gallery's corner "Enrich" button.

**Backfill at signup:** the worst first impression is an empty trophy case. Onboarding nudges new users to *"add a few catches you already have"* — using the same `Caught → How → Who` flow, unhurried. Their collection feels real on day one, and it doubles as the gentlest tutorial.

---

## 6. Tendencies & player profiles

**Tendencies** is a **league-wide, searchable directory of players/staff.** Tapping any player opens their **profile** — which is the *detail view inside Tendencies*, not a separate mode. The profile is reachable by tapping a player **anywhere**: a catch in Gallery, a row in Scouting, a row in Tendencies. One destination, many doors.

**Default ranking = OOP (Out-Of-Park) count, descending.**
- **OOP = every ball attributed to that player that ended up in a fan's hands — all acquisition types** (home runs, fouls, toss-ups, BP). It's the count of "balls this person has put into the stands/fans' hands," which is exactly the scouting signal.
- **Counts are aggregated across all users** (community data), so the sample is large enough to mean something. "Marsee: 15" means the community has logged 15 of his balls.
- Example: Marsee 15, Caissie 10, Stowers 8 → list order **JM, OC, KS**.

**A player profile shows:**
- Total OOP count (the headline number).
- Breakdown by `how` (toss-up rate, HR count, foul count, BP count).
- Common **locations** their balls end up (from enriched data — feeds "where do I sit").
- Recent activity (last games balls were logged from them).

This is a **computed view/query over `balls` grouped by `player_id`** — no separate table needed.

**Phasing of Tendencies features:**
- **Phase 2:** league-wide directory + profiles + OOP ranking + an optional **area filter** (pick the home teams/parks you frequent → show those teams + their current visitors; e.g. in Florida: Rays + Marlins + whoever's in town).
- **Phase 3:** filter Tendencies/Scouting by acquisition type (toss-up leaders vs. HR leaders vs. all) and other deeper breakdowns.

---

## 7. Recommended tech stack

Two goals shape this: (a) lowest ops/cost for a first website, and (b) **the stated plan to build native iOS + Android apps later.** Goal (b) is the deciding factor.

### Backbone (do not substitute): Supabase
[Supabase](https://supabase.com) provides the **database, user authentication, and (later) file storage** in one managed service with a generous free tier. It's hosted PostgreSQL + auth + storage, and its **Row Level Security (RLS)** enforces the "friends can see my stuff, strangers can't" rules at the database level. Critically, **the Supabase backend stays identical across web and future mobile apps** — you build it once and every client (web, iOS, Android) talks to the same backend with the same SDK.

### Frontend: a PWA built in Next.js + TypeScript (no app stores at launch)

**Launch delivery model = Progressive Web App (PWA).** There is no separate native app at launch. The website *is* the app: users **"add to home screen"** and get an app-like, installable, offline-tolerant experience. This is the simplest, cheapest path for a first product — one codebase, no app-store fees ($99/yr Apple, $25 Google), no app-review delays, instant updates — and for an app that's "tap to log a ball + browse lists," a PWA does everything needed.

- **Build it as:** **Next.js on Vercel** (free tier, automatic HTTPS, push-to-deploy), configured as a PWA — web app manifest (name, icons, theme color, `display: standalone`) and a service worker for installability + offline support. AI tools generate Next.js + Supabase + PWA setup reliably.
- **Offline matters for Game Mode specifically:** at the stadium on weak signal, the `Catch` flow must work offline — queue catches locally and **sync to Supabase when the connection returns.** This is the one place offline is non-negotiable; Enrich/Tendencies/Gallery assume wifi. (See §12 — this is Phase 1, because the offline PWA *is* the launch app.)

**The grow-later path (only if/when you want App Store + Play Store presence):** rebuild the UI in **Expo / React Native**, reusing the **same Supabase backend, same auth, same TypeScript types, and shared business logic.** Nothing on the backend changes — you only re-skin the client. This is why the choice below matters.

**Why React/TypeScript and not Python/Flask** (even though Python is the developer's strong suit): a Flask backend works for the website but does **not** carry to native mobile — you'd end up maintaining a Python backend and a separately-built mobile app in another language. Staying in **React/TypeScript** means the PWA → Expo migration reuses one language, one backend, and most logic. It's the single decision that prevents throwing work away if the project grows into app stores.

> **Decision for the AI agent:** build a **PWA with Next.js + Vercel + Supabase + TypeScript**. Make it installable (manifest + service worker) and make the **Game Mode `Catch` flow work offline with background sync.** Structure business logic (data access, types, tendency/OOP calculations) in **framework-agnostic modules separate from UI components**, so a future Expo/React Native app can reuse them. Do **not** build a separate mobile codebase now.

### Supporting services
- **Email** (signup confirmation, password reset): start with Supabase's built-in email; move to **Resend** (free 3,000/mo) for production reliability.
- **MLB Stats API** (free, no key): base `https://statsapi.mlb.com/api/v1/`. Used for the schedule (check-in auto-suggest), active rosters + headshots + jersey numbers (the Who picker), and "who homered that day" (Enrich skip-resolution).

### Photos: cut for now (see §8)
No image storage in this build → **no Cloudflare R2 / storage costs at all** right now. Gallery is built photo-shaped so they can be added later without redesign.

---

## 8. Photos — deliberately deferred

Photos are cut from this build. Reasoning: storage + bandwidth is the one feature that creates a monthly bill, and there's no reason to pay for it before there are users.

What this changes:
- **Gallery** uses tinted ball icons in the slot a photo would occupy — so adding photos later is a drop-in, not a redesign.
- **Friend verification** (Phase 3) can't rely on a photo, so it becomes *"a friend who was checked into the same game vouches for your catch"* — arguably stronger proof than a photo anyway, since shared presence is harder to fake.

**When photos are added later:** compress/resize client-side before upload (target ~200–400 KB), store the **file in object storage and only the URL in the database** (never image bytes in Postgres), and use **Cloudflare R2** (storage ~$0.015/GB/mo, **zero egress fees** — serving images is free, which keeps costs predictable).

---

## 9. Cost & spend breakdown

### Upfront (one-time)
| Item | Where | Cost |
|---|---|---|
| Domain name | Cloudflare Registrar / Porkbun / Namecheap | **$10–18/year** (`.com` ~$10–12; `.app`/`.dev` ~$14–18) |

**That's the only required spend to launch.**

### Running cost
| Service | Free tier | First paid tier |
|---|---|---|
| **Supabase** | 500 MB DB, 50k monthly active users, 5 GB bandwidth | $25/mo (Pro) |
| **Vercel** | Hobby tier (plenty for a small app) | $20/mo (Pro) |
| **Resend** (email) | 3,000 emails/mo | $20/mo |
| **MLB Stats API** | Free | — |

**Bottom line:** ~**$12 to launch** (domain only), **$0/month** until real usage. Without photos, the first real bill is much further out and DB-driven (~$25/mo Supabase Pro) rather than storage-driven.

---

## 9a. Branding & visual polish (pre-domain)

**When:** After Phase 1 features work end-to-end (Milestones 1–3), **before** buying a domain and pointing production traffic at the app. This is the last “make it feel real” pass — not a blocker for building features.

**Why not earlier:** Functional placeholders (tinted ball icons, system fonts, default PWA icons) are enough to develop and test. Custom assets are expensive to redo if UX still moves.

**Scope of the branding pass:**
- **Gallery tile icons** — replace the interim tinted-ball circles with a cohesive set of acquisition-type icons (home run, foul, toss-up, BP, other). Prefer **one custom set from your designer** (5–6 icons, single stroke/style, works at ~64px on navy). Stock stick-figure packs are OK as a *temporary* dev placeholder only; mixed stock sources look worse than simple colored balls and dilute the trophy-case feel.
- **App icon + PWA manifest** — home-screen icon, splash, theme colors aligned to brand.
- **Typography / color refinement** — optional tightening of the navy palette, accent usage, button weights (keep mobile tap targets).
- **Copy pass** — tutorial, empty states, Enrich invitation tone (already spec’d; polish wording).
- **Domain purchase** — register only after the above (see §9 upfront cost). Deploy to Vercel with `NEXT_PUBLIC_SITE_URL` updated; Supabase redirect URLs for prod.

**Explicitly deferred past branding:** player headshots (MLB API), photos (§8), Tendencies/Scouting art.

**Gallery icon note (interim vs. final):** §4 describes tinted balls as the *layout* placeholder (photo-shaped slot). The tint-only circles are implementation placeholders until the branding pass delivers proper per-`how` icons — same grid, swap assets.

---

## 10. Data model

PostgreSQL via Supabase. `auth.users` is managed by Supabase Auth; everything else is `public` schema. **Apply Row Level Security on every table** (§11).

### `profiles` (1:1 with auth.users)
`id` (uuid PK, FK auth.users) · `username` (unique) · `display_name` · `home_team` (nullable) · `privacy` (enum `public`/`friends_only`/`private`, default `friends_only`) · `created_at`

### `games` (one row per game a user attended / checked into)
`id` (uuid PK) · `user_id` (FK profiles) · `game_date` · `home_team` · `away_team` · `venue` · `mlb_game_pk` (bigint, nullable — links to MLB Stats API) · `section` (text, nullable — set during enrichment, applies to the game's catches by default) · `notes` (nullable) · `created_at`

### `players` (people balls come from — players & staff; reused across catches)
`id` (uuid PK) · `full_name` · `team` (nullable) · `person_type` (enum `player`/`coaching_staff`/`other_staff`) · `position` (nullable) · `jersey_number` (int, nullable) · `mlb_person_id` (bigint, nullable) · `created_at`
> When logging Who, autocomplete against existing `players` and the MLB roster; **reuse the matching row** so OOP counts aggregate correctly.

### `balls` (the core object) — the sentence
**Core (set in Game Mode):**
`id` (uuid PK) · `user_id` (FK profiles — the collector) · `game_id` (FK games) · `player_id` (FK players, **nullable** = an unresolved Skip) · `acquisition_type` (enum `home_run`/`foul_ball`/`toss_up`/`batting_practice`/`other` — the **How**) · `occurred_at` (timestamptz, **auto-set** at capture) · `created_at`

**Enrichment fields (ALL optional — pure scouting/tendency fuel, never required):**
`location` (enum/text: `left_field`/`left_center`/`center_field`/`right_center`/`right_field`/`foul_territory_1b`/`foul_territory_3b`/`behind_plate`/`bullpen`/`concourse`/`other`) · `speciality` (text[] multi-select: `city_connect`/`practice_ball`/`milestone`/`commemorative`/`spring_training`/`all_star`/`postseason`/`walk_off`/`no_hitter_game`) · `notes` (text) · `snag_method` (enum `glove`/`bare_hand`/`after_bounce`/`handed_to_me`/`traded_for`) · `ball_condition` (enum `mint`/`game_marks`/`scuffed`) · `ball_brand` (enum `official_mlb`/`bp_ball`/`commemorative_stamped`/`unknown`) · `kept` (boolean — kept vs. gave away/traded)

**Resolution flags (drive the enrichment queue):**
`no_player_resolved` (boolean, default false — set true when a user marks an unresolved Skip as "no known player," removing it from the queue permanently) · `is_authenticated` (boolean, default false — set when a friend verifies; Phase 3)

> **"Needs enrichment" definition:** a catch surfaces in the queue primarily if it's an **unresolved Skip** (`player_id IS NULL AND no_player_resolved = false`). Optional fields being empty is an *invitation* to add detail, never a nag.

### Phase 3 social tables
- **`friendships`**: `id` · `requester_id` · `addressee_id` · `status` (`pending`/`accepted`/`blocked`) · `created_at` · `accepted_at` · unique on the unordered pair.
- **`game_checkins`** (friends checking each other in): `id` · `game_id` · `user_id` (checked-in person) · `checked_in_by` (the friend) · `created_at`.
- **`verifications`** (friend vouches a catch — presence-based, not photo): `id` · `ball_id` · `reviewer_id` (must be an accepted friend) · `status` (`verified`/`disputed`) · `comment` (nullable) · `created_at`.

---

## 11. Security & privacy

- **RLS on every table**, default-deny then add policies:
  - A user can read/write **their own** rows.
  - **`players` and aggregated tendency data are readable by all signed-in users** (shared community data).
  - **Phase 3:** accepted friends can read each other's `games`/`balls` per the owner's `privacy`; friend-only actions (check-ins, verifications) are enforced in RLS, not just UI.
  - `public` profiles/collections readable by anyone only when `privacy = 'public'`.
- Keep secrets server-side; the browser only ever sees the Supabase **anon** key. **Never expose the service-role key client-side.**

---

## 12. Build phases

**Phase 1 — MVP (the capture-and-complete loop):**
**Installable PWA** (manifest + service worker, "add to home screen") · **offline `Catch` flow with background sync** (the launch app lives or dies on this) · Auth (signup/login/reset) + profile · Game Mode check-in · **Catch flow** (`How → Who` with the roster picker, team-color tiles, jersey/abbrev/initials-then-headshot, Skip tile) · **Gallery** (icon grid → sentence view → corner Enrich) · **Enrich Past Catches** (completeness tracking, game-scoped completion, MLB-API HR skip-resolution, permanent close-out) · backfill-at-signup · tutorial sentence.

**Phase 2 — Player intelligence:**
**Tendencies** directory + **player profiles** + **OOP ranking** · **Scouting** (game-scoped Tendencies, 2nd Game Mode button) · Tendencies **area filter**.

**Phase 3 — Social + depth:**
**Friends** (request/accept) · friend **check-ins** · presence-based **verification** + authenticity badge · acquisition-type **filters** on Tendencies/Scouting (toss-up vs. HR leaders) · deeper breakdowns.

---

## 13. Notes for the AI coding agent

- **Build Phase 1 fully and confirm it works** before Phase 2+.
- **Mobile-first.** Assume phone + bad stadium signal. The `Catch` flow must be ~2 taps; nothing competes for attention on the Game Mode canvas.
- **Order is `Caught → How → Who`** — do not reorder.
- **Who-search is "contains," not prefix**, and also matches jersey number.
- **Render colored initials first, lazy-load headshots** so the picker works on weak signal.
- **All enrichment fields are optional** — never block saving a catch; never require a player (no guessed names).
- **Hardcode the 30-team color map**; resolve away-team color against home-team color; Skip tile is fixed gray.
- **Reuse existing `players` rows on match** so OOP aggregates correctly.
- **Default Tendencies/Scouting sort: OOP count descending**, where OOP = all balls attributed to a player, aggregated across all users.
- **Apply RLS from the start**; community/player data readable by signed-in users, personal data private (friend access in Phase 3).
- **TypeScript end-to-end**, with data/logic in framework-agnostic modules separate from UI, to enable a future Expo/React Native migration without rewriting logic.
- **Stack:** an installable **PWA** built with **Next.js + Vercel + Supabase**. **No separate mobile codebase, no app stores at launch** — "add to home screen" is the launch app. The **Game Mode `Catch` flow must work offline and sync when back online.** No image storage in this build.
