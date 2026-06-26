"use client";

/**
 * Browser Supabase client. Uses ONLY the public anon key (spec §11) — the
 * service-role key is never referenced anywhere in this app.
 */

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/core/types/database";
import type { AppSupabaseClient } from "@/core/auth/authService";

let browserClient: AppSupabaseClient | undefined;

export function getSupabaseBrowserClient(): AppSupabaseClient {
  if (browserClient) return browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "Copy .env.local.example to .env.local and fill in your Supabase values."
    );
  }

  browserClient = createBrowserClient<Database>(url, anonKey);
  return browserClient;
}
