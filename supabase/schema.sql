-- Ball Hawk Buddy — Phase 1 schema (spec §10) + RLS (spec §11)
-- Run this in the Supabase SQL editor. Safe to re-run (idempotent-ish).
--
-- The app's TypeScript types in src/core/types/database.ts mirror this exactly.
-- Phase 3 social tables (friendships / game_checkins / verifications) are
-- intentionally omitted here — not built in Phase 1.

-- ---- Enums ----------------------------------------------------------------

do $$ begin
  create type privacy as enum ('public', 'friends_only', 'private');
exception when duplicate_object then null; end $$;

do $$ begin
  create type person_type as enum ('player', 'coaching_staff', 'other_staff');
exception when duplicate_object then null; end $$;

do $$ begin
  create type acquisition_type as enum
    ('home_run', 'foul_ball', 'toss_up', 'batting_practice', 'other');
exception when duplicate_object then null; end $$;

-- ---- profiles (1:1 with auth.users) ---------------------------------------

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  username    text not null unique,
  display_name text,
  home_team   text,
  privacy     privacy not null default 'friends_only',
  created_at  timestamptz not null default now()
);

-- case-insensitive uniqueness for usernames
create unique index if not exists profiles_username_lower_idx
  on public.profiles (lower(username));

-- ---- games ----------------------------------------------------------------

create table if not exists public.games (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  game_date   date not null,
  home_team   text not null,
  away_team   text not null,
  venue       text,
  mlb_game_pk bigint,
  section     text,
  notes       text,
  created_at  timestamptz not null default now()
);
create index if not exists games_user_id_idx on public.games (user_id);

-- ---- players (shared community data) --------------------------------------

create table if not exists public.players (
  id            uuid primary key default gen_random_uuid(),
  full_name     text not null,
  team          text,
  person_type   person_type not null default 'player',
  position      text,
  jersey_number int,
  mlb_person_id bigint,
  created_at    timestamptz not null default now()
);
create unique index if not exists players_mlb_person_id_idx
  on public.players (mlb_person_id) where mlb_person_id is not null;

-- ---- balls (the core object) ----------------------------------------------

create table if not exists public.balls (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles (id) on delete cascade,
  game_id          uuid not null references public.games (id) on delete cascade,
  player_id        uuid references public.players (id) on delete set null,
  acquisition_type acquisition_type not null,
  occurred_at      timestamptz not null default now(),

  -- enrichment (all optional)
  location       text,
  speciality     text[],
  notes          text,
  snag_method    text,
  ball_condition text,
  ball_brand     text,
  kept           boolean,

  -- resolution flags
  no_player_resolved boolean not null default false,
  is_authenticated   boolean not null default false,

  created_at timestamptz not null default now()
);
create index if not exists balls_user_id_idx on public.balls (user_id);
create index if not exists balls_player_id_idx on public.balls (player_id);
create index if not exists balls_game_id_idx on public.balls (game_id);

-- ---- Row Level Security ---------------------------------------------------
-- Default-deny, then add policies (spec §11).

alter table public.profiles enable row level security;
alter table public.games    enable row level security;
alter table public.players  enable row level security;
alter table public.balls    enable row level security;

-- profiles: a user manages their own row; public profiles readable by anyone
-- signed in (friend access is Phase 3).
drop policy if exists profiles_select_self_or_public on public.profiles;
create policy profiles_select_self_or_public on public.profiles
  for select to authenticated
  using (id = auth.uid() or privacy = 'public');

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles
  for insert to authenticated
  with check (id = auth.uid());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- games: owner-only in Phase 1.
drop policy if exists games_owner_all on public.games;
create policy games_owner_all on public.games
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- players: shared community data — readable by all signed-in users, and any
-- signed-in user may add/reuse a player row (needed to attribute catches).
drop policy if exists players_select_all on public.players;
create policy players_select_all on public.players
  for select to authenticated using (true);

drop policy if exists players_insert_authenticated on public.players;
create policy players_insert_authenticated on public.players
  for insert to authenticated with check (true);

drop policy if exists players_update_authenticated on public.players;
create policy players_update_authenticated on public.players
  for update to authenticated using (true) with check (true);

-- balls: owner-only in Phase 1. (Aggregated tendency reads come in Phase 2 via
-- a SECURITY DEFINER view/function so counts can aggregate across users without
-- exposing each other's private rows.)
drop policy if exists balls_owner_all on public.balls;
create policy balls_owner_all on public.balls
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
