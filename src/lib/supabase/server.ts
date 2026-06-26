import "server-only";

/**
 * Server-side Supabase client for Server Components / Route Handlers.
 * Still uses the anon key — auth is carried via the user's cookies, and RLS
 * enforces access. The service-role key is never used.
 */

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/core/types/database";
import type { AppSupabaseClient } from "@/core/auth/authService";

export async function getSupabaseServerClient(): Promise<AppSupabaseClient> {
  const cookieStore = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component; cookie writes are handled by the
          // middleware-refreshed session instead. Safe to ignore here.
        }
      },
    },
  });
}
