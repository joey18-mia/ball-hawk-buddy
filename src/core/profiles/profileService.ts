/**
 * Profile service — framework-agnostic data access for the `profiles` table.
 *
 * RLS assumption (spec §11): a user can read/write their own profile row;
 * username uniqueness is enforced by a UNIQUE constraint in the DB.
 */

import type { AppSupabaseClient } from "../auth/authService";
import type { Profile, ProfileInsert } from "../types/database";
import { normalizeUsername } from "../auth/validation";

export interface ServiceResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

/**
 * Best-effort availability check. The DB UNIQUE constraint is the real guard
 * (this can race), but it gives instant feedback during signup.
 */
export async function isUsernameAvailable(
  client: AppSupabaseClient,
  username: string
): Promise<ServiceResult<boolean>> {
  const normalized = normalizeUsername(username);
  const { data, error } = await client
    .from("profiles")
    .select("id")
    .eq("username", normalized)
    .limit(1)
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true, data: data == null };
}

export async function getProfile(
  client: AppSupabaseClient,
  userId: string
): Promise<ServiceResult<Profile | null>> {
  const { data, error } = await client
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true, data };
}

/**
 * Create the 1:1 profile row for a freshly-signed-up user. Called right after
 * signup once a session exists. Username is stored normalized (lowercase).
 */
export async function createProfile(
  client: AppSupabaseClient,
  params: {
    userId: string;
    username: string;
    displayName?: string | null;
    homeTeam?: string | null;
  }
): Promise<ServiceResult<Profile>> {
  const insert: ProfileInsert = {
    id: params.userId,
    username: normalizeUsername(params.username),
    display_name: params.displayName ?? null,
    home_team: params.homeTeam ?? null,
  };

  const { data, error } = await client
    .from("profiles")
    .insert(insert)
    .select("*")
    .single();

  if (error) {
    const friendly =
      error.code === "23505"
        ? "That username is already taken."
        : error.message;
    return { ok: false, error: friendly };
  }
  return { ok: true, data };
}

export async function updateProfile(
  client: AppSupabaseClient,
  userId: string,
  patch: Partial<Pick<Profile, "display_name" | "home_team" | "privacy" | "username">>
): Promise<ServiceResult<Profile>> {
  const normalizedPatch = {
    ...patch,
    ...(patch.username ? { username: normalizeUsername(patch.username) } : {}),
  };

  const { data, error } = await client
    .from("profiles")
    .update(normalizedPatch)
    .eq("id", userId)
    .select("*")
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true, data };
}
