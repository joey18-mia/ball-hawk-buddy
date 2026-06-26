"use client";

import { useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { sendPasswordReset } from "@/core/auth/authService";
import { validateEmail } from "@/core/auth/validation";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (typeof window !== "undefined" ? window.location.origin : "");

export default function ResetForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const emailErr = validateEmail(email);
    if (emailErr) {
      setError(emailErr);
      return;
    }

    setSubmitting(true);
    const supabase = getSupabaseBrowserClient();
    const result = await sendPasswordReset(supabase, {
      email,
      redirectTo: `${SITE_URL}/auth/callback?next=/update-password`,
    });
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error ?? "Could not send reset email.");
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="card">
        <h2>Check your email</h2>
        <div className="alert success">
          If an account exists for <strong>{email}</strong>, a password reset
          link is on its way.
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
        <h2>Reset your password</h2>

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

        <button className="btn" type="submit" disabled={submitting}>
          {submitting ? "Sending…" : "Send reset link"}
        </button>
      </form>

      <div className="auth-links">
        <Link href="/login">Back to log in</Link>
        <Link href="/signup">Create account</Link>
      </div>
    </>
  );
}
