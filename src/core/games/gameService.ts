/**
 * Game service — framework-agnostic data access for the `games` table.
 *
 * A "game" is one row per game a user checked into. We dedupe on
 * (`user_id`, `mlb_game_pk`) so re-checking into the same game — or syncing
 * offline catches later — reuses the existing row instead of duplicating it.
 * RLS (spec §11) makes games owner-only.
 */

import type { AppSupabaseClient } from "../auth/authService";
import type { Game, GameInsert } from "../types/database";
import type { ServiceResult } from "../profiles/profileService";

export async function findOrCreateGame(
  client: AppSupabaseClient,
  params: {
    userId: string;
    gameDate: string; // YYYY-MM-DD
    homeTeam: string; // TeamCode
    awayTeam: string; // TeamCode
    venue?: string | null;
    mlbGamePk?: number | null;
  }
): Promise<ServiceResult<Game>> {
  if (params.mlbGamePk != null) {
    const { data, error } = await client
      .from("games")
      .select("*")
      .eq("user_id", params.userId)
      .eq("mlb_game_pk", params.mlbGamePk)
      .maybeSingle();

    if (error) return { ok: false, error: error.message };
    if (data) return { ok: true, data };
  }

  const insert: GameInsert = {
    user_id: params.userId,
    game_date: params.gameDate,
    home_team: params.homeTeam,
    away_team: params.awayTeam,
    venue: params.venue ?? null,
    mlb_game_pk: params.mlbGamePk ?? null,
    section: null,
    notes: null,
  };

  const { data, error } = await client
    .from("games")
    .insert(insert)
    .select("*")
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, data };
}
