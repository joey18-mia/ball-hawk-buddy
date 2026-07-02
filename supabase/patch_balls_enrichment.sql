-- Ball Hawk Buddy — reconcile the live `balls` table with schema.sql.
--
-- Why: an earlier version of the table was created WITHOUT the enrichment /
-- resolution columns. `create table if not exists` in schema.sql is a no-op on
-- an existing table, so those columns never got added — sync failed with
-- "Could not find the 'ball_brand' column of 'balls' in the schema cache".
--
-- This adds any missing columns idempotently (safe to re-run). Game Mode
-- capture doesn't need these, but the Enrich flow (Milestone 3) does.
-- Run once in the Supabase SQL editor.

alter table public.balls add column if not exists location       text;
alter table public.balls add column if not exists speciality     text[];
alter table public.balls add column if not exists notes          text;
alter table public.balls add column if not exists snag_method    text;
alter table public.balls add column if not exists ball_condition text;
alter table public.balls add column if not exists ball_brand     text;
alter table public.balls add column if not exists kept           boolean;

alter table public.balls
  add column if not exists no_player_resolved boolean not null default false;
alter table public.balls
  add column if not exists is_authenticated   boolean not null default false;

-- Force PostgREST to refresh its schema cache immediately (otherwise it can
-- take a minute to notice the new columns).
notify pgrst, 'reload schema';
