/**
 * Auth service — framework-agnostic business logic.
 *
 * Every function takes a Supabase client instance, so this module has zero
 * dependency on Next.js, React, or any browser global. A future Expo/RN app can
 * import these exact functions and pass its own client.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";

export type AppSupabaseClient = SupabaseClient<Database>;

export interface AuthResult {
  ok: boolean;
  /** Human-readable, UI-safe message on failure. */
  error?: string;
  /** true when signup succeeded but the user must confirm their email first. */
  needsEmailConfirmation?: boolean;
  userId?: string;
}

function toMessage(error: { message: string } | null, fallback: string): string {
  return error?.message ?? fallback;
}

export async function signUpWithEmail(
  client: AppSupabaseClient,
  params: { email: string; password: string; emailRedirectTo?: string }
): Promise<AuthResult> {
  const { data, error } = await client.auth.signUp({
    email: params.email.trim(),
    password: params.password,
    options: params.emailRedirectTo
      ? { emailRedirectTo: params.emailRedirectTo }
      : undefined,
  });

  if (error) {
    return { ok: false, error: toMessage(error, "Could not create account.") };
  }

  // When email confirmation is enabled, there is no active session yet.
  const needsEmailConfirmation = !data.session;
  return {
    ok: true,
    needsEmailConfirmation,
    userId: data.user?.id,
  };
}

export async function signInWithEmail(
  client: AppSupabaseClient,
  params: { email: string; password: string }
): Promise<AuthResult> {
  const { data, error } = await client.auth.signInWithPassword({
    email: params.email.trim(),
    password: params.password,
  });

  if (error) {
    return { ok: false, error: toMessage(error, "Invalid email or password.") };
  }
  return { ok: true, userId: data.user?.id };
}

export async function sendPasswordReset(
  client: AppSupabaseClient,
  params: { email: string; redirectTo: string }
): Promise<AuthResult> {
  const { error } = await client.auth.resetPasswordForEmail(params.email.trim(), {
    redirectTo: params.redirectTo,
  });
  if (error) {
    return { ok: false, error: toMessage(error, "Could not send reset email.") };
  }
  return { ok: true };
}

/** Used on the "set a new password" screen reached from the reset email link. */
export async function updatePassword(
  client: AppSupabaseClient,
  params: { password: string }
): Promise<AuthResult> {
  const { error } = await client.auth.updateUser({ password: params.password });
  if (error) {
    return { ok: false, error: toMessage(error, "Could not update password.") };
  }
  return { ok: true };
}

export async function signOut(client: AppSupabaseClient): Promise<AuthResult> {
  const { error } = await client.auth.signOut();
  if (error) {
    return { ok: false, error: toMessage(error, "Could not sign out.") };
  }
  return { ok: true };
}
