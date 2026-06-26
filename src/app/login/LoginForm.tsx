"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { signInWithEmail } from "@/core/auth/authService";
import { validateEmail } from "@/core/auth/validation";

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";
  const linkError = params.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(linkError);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const emailErr = validateEmail(email);
    const passErr = password ? null : "Password is required.";
    if (emailErr || passErr) {
      setError(emailErr ?? passErr);
      return;
    }

    setSubmitting(true);
    const supabase = getSupabaseBrowserClient();
    const result = await signInWithEmail(supabase, { email, password });
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error ?? "Could not log in.");
      return;
    }

    // Profile presence is enforced on the home route; just go there.
    router.replace(next);
    router.refresh();
  }

  return (
    <>
      <form className="card" onSubmit={onSubmit} noValidate>
        <h2>Welcome back</h2>

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
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button className="btn" type="submit" disabled={submitting}>
          {submitting ? "Logging in…" : "Log in"}
        </button>
      </form>

      <div className="auth-links">
        <Link href="/reset-password">Forgot password?</Link>
        <Link href="/signup">Create account</Link>
      </div>
    </>
  );
}
