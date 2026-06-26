"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { updatePassword } from "@/core/auth/authService";
import { validatePassword } from "@/core/auth/validation";

export default function UpdatePasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);
  const [done, setDone] = useState(false);

  // The reset link establishes a recovery session via /auth/callback. Confirm
  // we actually have one before letting the user submit.
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        setError("This reset link is invalid or has expired. Request a new one.");
      }
      setReady(true);
    });
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const passErr = validatePassword(password);
    if (passErr) {
      setError(passErr);
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    const supabase = getSupabaseBrowserClient();
    const result = await updatePassword(supabase, { password });
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error ?? "Could not update password.");
      return;
    }
    setDone(true);
    setTimeout(() => {
      router.replace("/");
      router.refresh();
    }, 1200);
  }

  if (done) {
    return (
      <div className="card">
        <h2>Password updated</h2>
        <div className="alert success">Taking you to the app…</div>
      </div>
    );
  }

  return (
    <form className="card" onSubmit={onSubmit} noValidate>
      <h2>Set a new password</h2>

      {error ? <div className="alert error">{error}</div> : null}

      <div className="field">
        <label htmlFor="password">New password</label>
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
        <label htmlFor="confirm">Confirm password</label>
        <input
          id="confirm"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
      </div>

      <button className="btn" type="submit" disabled={submitting || !ready}>
        {submitting ? "Saving…" : "Update password"}
      </button>
    </form>
  );
}
