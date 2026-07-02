/**
 * Ball service — framework-agnostic data access for the `balls` table (the core
 * object: the "sentence"). Game Mode sets only the core fields; every
 * enrichment field is left null for the Enrich flow later. RLS makes balls
 * owner-only (spec §11).
 */

import type { AppSupabaseClient } from "../auth/authService";
import type {
  AcquisitionType,
  Ball,
  BallBrand,
  BallCondition,
  BallInsert,
  BallLocation,
  BallSpeciality,
  Game,
  Player,
  SnagMethod,
} from "../types/database";
import type { Database } from "../types/database";
import type { ServiceResult } from "../profiles/profileService";

export interface BallWithContext {
  ball: Ball;
  game: Game;
  player: Player | null;
}

type BallRowJoined = Ball & {
  games: Game;
  players: Player | null;
};

function mapJoined(row: BallRowJoined): BallWithContext {
  const { games, players, ...ball } = row;
  return { ball: ball as Ball, game: games, player: players };
}

export async function listBallsForUser(
  client: AppSupabaseClient,
  userId: string
): Promise<ServiceResult<BallWithContext[]>> {
  const { data, error } = await client
    .from("balls")
    .select("*, games (*), players (*)")
    .eq("user_id", userId)
    .order("occurred_at", { ascending: false });

  if (error) return { ok: false, error: error.message };
  // Nested joins work at runtime; our hand-written Database type has no
  // Relationships block, so supabase-js types the select as SelectQueryError.
  const rows = (data ?? []) as unknown as BallRowJoined[];
  return { ok: true, data: rows.map(mapJoined) };
}

export async function getBallWithContext(
  client: AppSupabaseClient,
  ballId: string,
  userId: string
): Promise<ServiceResult<BallWithContext>> {
  const { data, error } = await client
    .from("balls")
    .select("*, games (*), players (*)")
    .eq("id", ballId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Catch not found." };
  return { ok: true, data: mapJoined(data as unknown as BallRowJoined) };
}

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
  // Game Mode writes ONLY the core "sentence" fields. Enrichment columns are
  // deliberately omitted (not sent as null) so capture doesn't depend on those
  // columns existing yet; they default to null and get filled in Enrich mode.
  const insert: BallInsert = {
    user_id: params.userId,
    game_id: params.gameId,
    player_id: params.playerId,
    acquisition_type: params.acquisitionType,
    occurred_at: params.occurredAt,
  };

  const { data, error } = await client
    .from("balls")
    .insert(insert)
    .select("*")
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, data };
}

export interface BallEnrichmentPatch {
  playerId?: string | null;
  location?: BallLocation | null;
  speciality?: BallSpeciality[] | null;
  notes?: string | null;
  snagMethod?: SnagMethod | null;
  ballCondition?: BallCondition | null;
  ballBrand?: BallBrand | null;
  kept?: boolean | null;
  noPlayerResolved?: boolean;
}

export async function updateBall(
  client: AppSupabaseClient,
  ballId: string,
  userId: string,
  patch: BallEnrichmentPatch
): Promise<ServiceResult<Ball>> {
  const update: Database["public"]["Tables"]["balls"]["Update"] = {};
  if (patch.playerId !== undefined) update.player_id = patch.playerId;
  if (patch.location !== undefined) update.location = patch.location;
  if (patch.speciality !== undefined) update.speciality = patch.speciality;
  if (patch.notes !== undefined) update.notes = patch.notes?.trim() || null;
  if (patch.snagMethod !== undefined) update.snag_method = patch.snagMethod;
  if (patch.ballCondition !== undefined) update.ball_condition = patch.ballCondition;
  if (patch.ballBrand !== undefined) update.ball_brand = patch.ballBrand;
  if (patch.kept !== undefined) update.kept = patch.kept;
  if (patch.noPlayerResolved !== undefined) {
    update.no_player_resolved = patch.noPlayerResolved;
  }

  const { data, error } = await client
    .from("balls")
    .update(update)
    .eq("id", ballId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, data };
}
