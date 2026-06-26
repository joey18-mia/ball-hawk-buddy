import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Handles the redirect target for email confirmation and password-reset links.
 *
 * Supabase can deliver the auth link in two shapes depending on project email
 * templates / flow type:
 *   1. PKCE  -> `?code=...`            (exchangeCodeForSession)
 *   2. OTP   -> `?token_hash=...&type=recovery|signup|...` (verifyOtp)
 * We support both so confirmation and password-reset links work regardless of
 * which template the project uses. On success we send the user to `next`
 * (e.g. /onboarding or /update-password).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";

  const supabase = await getSupabaseServerClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error("[auth/callback] exchangeCodeForSession failed:", {
      message: error.message,
      status: error.status,
      code: error.code,
    });
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error("[auth/callback] verifyOtp failed:", {
      message: error.message,
      status: error.status,
      code: error.code,
    });
  } else {
    console.error("[auth/callback] no code or token_hash present in callback URL");
  }

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent("Auth link is invalid or expired.")}`
  );
}
