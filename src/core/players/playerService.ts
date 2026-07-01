/**
 * Player service — framework-agnostic data access for the `players` table.
 *
 * `players` is shared community data (spec §11): readable + insertable by any
 * signed-in user. We dedupe on `mlb_person_id` and REUSE the matching row so
 * OOP tendency counts aggregate across users correctly (spec §10, §13).
 */

import type { AppSupabaseClient } from "../auth/authService";
import type { Player, PlayerInsert } from "../types/database";
import type { PersonType } from "../types/database";
import type { ServiceResult } from "../profiles/profileService";

export async function findOrCreatePlayer(
  client: AppSupabaseClient,
  params: {
    mlbPersonId: number | null;
    fullName: string;
    team: string | null; // TeamCode
    personType: PersonType;
    position: string | null;
    jerseyNumber: number | null;
  }
): Promise<ServiceResult<Player>> {
  if (params.mlbPersonId != null) {
    const { data, error } = await client
      .from("players")
      .select("*")
      .eq("mlb_person_id", params.mlbPersonId)
      .maybeSingle();

    if (error) return { ok: false, error: error.message };
    if (data) return { ok: true, data };
  }

  const insert: PlayerInsert = {
    full_name: params.fullName,
    team: params.team,
    person_type: params.personType,
    position: params.position,
    jersey_number: params.jerseyNumber,
    mlb_person_id: params.mlbPersonId,
  };

  const { data, error } = await client
    .from("players")
    .insert(insert)
    .select("*")
    .single();

  if (error) {
    // Concurrent insert of the same person → unique violation. Re-fetch the
    // winner so both callers converge on one row.
    if (error.code === "23505" && params.mlbPersonId != null) {
      const retry = await client
        .from("players")
        .select("*")
        .eq("mlb_person_id", params.mlbPersonId)
        .maybeSingle();
      if (retry.data) return { ok: true, data: retry.data };
    }
    return { ok: false, error: error.message };
  }
  return { ok: true, data };
}
