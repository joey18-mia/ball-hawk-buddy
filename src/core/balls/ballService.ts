/**
 * Ball service — framework-agnostic data access for the `balls` table (the core
 * object: the "sentence"). Game Mode sets only the core fields; every
 * enrichment field is left null for the Enrich flow later. RLS makes balls
 * owner-only (spec §11).
 */

import type { AppSupabaseClient } from "../auth/authService";
import type { AcquisitionType, Ball, BallInsert } from "../types/database";
import type { ServiceResult } from "../profiles/profileService";

export async function insertBall(
  client: AppSupabaseClient,
  params: {
    userId: string;
    gameId: string;
    playerId: string | null; // null = unresolved Skip
    acquisitionType: AcquisitionType;
    occurredAt: string; // ISO timestamp captured at tap time
  }
): Promise<ServiceResult<Ball>> {
  const insert: BallInsert = {
    user_id: params.userId,
    game_id: params.gameId,
    player_id: params.playerId,
    acquisition_type: params.acquisitionType,
    occurred_at: params.occurredAt,
    // Enrichment fields — all optional, filled later in Enrich mode.
    location: null,
    speciality: null,
    notes: null,
    snag_method: null,
    ball_condition: null,
    ball_brand: null,
    kept: null,
  };

  const { data, error } = await client
    .from("balls")
    .insert(insert)
    .select("*")
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, data };
}
