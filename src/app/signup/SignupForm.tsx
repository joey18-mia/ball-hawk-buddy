"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { signUpWithEmail } from "@/core/auth/authService";
import {
  validateEmail,
  validatePassword,
  validateUsername,
} from "@/core/auth/validation";
import { isUsernameAvailable } from "@/core/profiles/profileService";
import { TEAM_LIST } from "@/core/teams/teamColors";
import { savePendingProfile } from "@/lib/pendingProfile";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (typeof window !== "undefined" ? window.location.origin : "");

export default function SignupForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [homeTeam, setHomeTeam] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const fieldErr =
      validateEmail(email) ||
      validatePassword(password) ||
      validateUsername(username);
    if (fieldErr) {
      setError(fieldErr);
      return;
    }

    setSubmitting(true);
    const supabase = getSupabaseBrowserClient();

    // Best-effort early uniqueness check (DB constraint is the real guard).
    const avail = await isUsernameAvailable(supabase, username);
    if (avail.ok && avail.data === false) {
      setSubmitting(false);
      setError("That username is already taken.");
      return;
    }

    const result = await signUpWithEmail(supabase, {
      email,
      password,
      emailRedirectTo: `${SITE_URL}/auth/callback?next=/onboarding`,
    });

    if (!result.ok) {
      setSubmitting(false);
      setError(result.error ?? "Could not create account.");
      return;
    }

    // Profile row is created once a session exists (RLS needs auth.uid()).
    // Stash the chosen values so /onboarding can finish the job.
    savePendingProfile({
      username,
      displayName: displayName || null,
      homeTeam: homeTeam || null,
    });

    setSubmitting(false);

    if (result.needsEmailConfirmation) {
      setConfirmSent(true);
      return;
    }

    router.replace("/onboarding");
    router.refresh();
  }

  if (confirmSent) {
    return (
      <div className="card">
        <h2>Check your email</h2>
        <div className="alert success">
          We sent a confirmation link to <strong>{email}</strong>. Tap it to
          finish creating your account, then pick your username.
        </div>
        <Link className="btn secondary" href="/login">
          Back to log in
        </Link>
      </div>
    );
  }

  return (
    <>
      <form className="card" onSubmit={onSubmit} noValidate>
        <h2>Create your account</h2>

        {error ? <div className="alert error">{error}</div> : null}

        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <span className="hint">At least 8 characters.</span>
        </div>

        <div className="field">
          <label htmlFor="username">Username</label>
          <input
            id="username"
            type="text"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="ballhawk22"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <span className="hint">Unique. Letters, numbers, underscores.</span>
        </div>

        <div className="field">
          <label htmlFor="displayName">Display name (optional)</label>
          <input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="homeTeam">Home team (optional)</label>
          <select
            id="homeTeam"
            value={homeTeam}
            onChange={(e) => setHomeTeam(e.target.value)}
          >
            <option value="">Choose later</option>
            {TEAM_LIST.map((t) => (
              <option key={t.code} value={t.code}>
                {t.name}
              </option>
            ))}
          </select>
          <span className="hint">
            Used to auto-suggest today&apos;s game at check-in.
          </span>
        </div>

        <button className="btn" type="submit" disabled={submitting}>
          {submitting ? "Creating…" : "Create account"}
        </button>
      </form>

      <div className="auth-links">
        <span>Already have an account?</span>
        <Link href="/login">Log in</Link>
      </div>
    </>
  );
}
