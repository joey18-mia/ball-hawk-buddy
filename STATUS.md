# Ball Hawk Buddy — Project Status

## Current Status (as of Jun 26, 2026)
- **Milestone 1 (Foundation): Build verified** — `npm run build` passes (exit 0,
  TypeScript clean, all 9 routes compile). Note: build must be run with the
  sandbox disabled on this Windows machine (the default `workspace_readwrite`
  sandbox can't isolate the filesystem, so file-writing commands fail).
- `@supabase/ssr` upgraded to **0.12.0** (to align with `supabase-js` 2.108).
- `src/proxy.ts` renamed from `src/middleware.ts` (Next 16 convention).
- **Verified end-to-end against a live Supabase project** (Jun 26): schema run,
  `.env.local` configured, redirect URL added, and the full auth flow tested —
  **signup → email confirmation → login → password reset → set new password** all
  pass. Custom SMTP (Resend) is configured so email templates can use the
  `token_hash`/OTP link format.
- **Milestone 2 (Game Mode capture): NOT started** — now cleared to begin.

## What's built (Milestone 1)
- **PWA scaffold**: Next.js 16 + TypeScript, `manifest.webmanifest`, SVG icons,
  service worker (`public/sw.js`, app-shell caching) + client registrar.
- **Supabase wiring** (anon key only; service-role key never used): browser
  client, server (SSR) client, and `proxy.ts` session refresh + route gating.
- **Framework-agnostic core** (`src/core/`, no React/Next imports — reusable by a
  future Expo app):
  - `types/database.ts` — DB types mirroring spec §10.
  - `auth/` — auth service + pure validation.
  - `profiles/` — profile data access (create/get/update, username availability).
  - `teams/teamColors.ts` — the provided asset, used as-is.
- **Auth UI**: signup (email/password + unique username + optional display
  name/home team), login, password reset, set-new-password, onboarding.
- **Minimal authed home** (the full 4-button home is Milestone 2).
- **Reference SQL**: `supabase/schema.sql` (Phase 1 tables + RLS, spec §10/§11).

## Key fix log
- Build initially failed type-check: Supabase `.insert()` collapsed to `never[]`.
  Root cause: table `Row` shapes were `interface`s — interfaces lack an implicit
  index signature, so they failed Supabase's `GenericTable` constraint and the
  schema resolved to `never`. Fixed by converting `Row` shapes to `type` aliases,
  flattening `Insert` types, and using the canonical empty
  `Views`/`Functions`/`CompositeTypes` shape.
- Password-reset / email links failed with `pkce_code_verifier_not_found`. PKCE
  needs a client-stored verifier that isn't present when a link is opened from an
  email, so `exchangeCodeForSession` failed. Fixed by (a) hardening
  `src/app/auth/callback/route.ts` to log the real error and also accept
  `token_hash` + `type` links via `verifyOtp`, and (b) switching the Supabase
  email templates (reset + confirm) to the `token_hash` link format. Editing
  those templates requires custom SMTP, so Resend was configured (also removes
  the built-in email rate limit).

## Next up (Milestone 2 — do NOT start until confirmed)
Home screen (Game Mode / Enrich / Tendencies placeholder / Gallery) · Game Mode
check-in (MLB schedule auto-suggest) · Catch flow (How → Who roster picker, team
-color tiles, jersey/abbrev/initials-then-headshot, Skip tile) · **offline Catch
queue with background sync** · dismissible tutorial line.
