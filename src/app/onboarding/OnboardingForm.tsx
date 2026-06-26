"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  createProfile,
  getProfile,
  isUsernameAvailable,
} from "@/core/profiles/profileService";
import { validateUsername } from "@/core/auth/validation";
import { TEAM_LIST } from "@/core/teams/teamColors";
import {
  clearPendingProfile,
  loadPendingProfile,
} from "@/lib/pendingProfile";

export default function OnboardingForm() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [homeTeam, setHomeTeam] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) {
        router.replace("/login");
        return;
      }

      // Already onboarded? Skip straight to the app.
      const existing = await getProfile(supabase, user.id);
      if (existing.ok && existing.data) {
        clearPendingProfile();
        router.replace("/");
        router.refresh();
        return;
      }

      setUserId(user.id);
      const pending = loadPendingProfile();
      if (pending) {
        setUsername(pending.username ?? "");
        setDisplayName(pending.displayName ?? "");
        setHomeTeam(pending.homeTeam ?? "");
      }
      setLoading(false);
    })();
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!userId) return;

    const usernameErr = validateUsername(username);
    if (usernameErr) {
      setError(usernameErr);
      return;
    }

    setSubmitting(true);
    const supabase = getSupabaseBrowserClient();

    const avail = await isUsernameAvailable(supabase, username);
    if (avail.ok && avail.data === false) {
      setSubmitting(false);
      setError("That username is already taken.");
      return;
    }

    const result = await createProfile(supabase, {
      userId,
      username,
      displayName: displayName || null,
      homeTeam: homeTeam || null,
    });
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error ?? "Could not save your profile.");
      return;
    }

    clearPendingProfile();
    router.replace("/");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="card">
        <div className="spinner-screen">Loading…</div>
      </div>
    );
  }

  return (
    <form className="card" onSubmit={onSubmit} noValidate>
      <h2>Pick your username</h2>

      {error ? <div className="alert error">{error}</div> : null}

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
      </div>

      <button className="btn" type="submit" disabled={submitting}>
        {submitting ? "Saving…" : "Enter Ball Hawk"}
      </button>
    </form>
  );
}
