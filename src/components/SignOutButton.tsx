"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { signOut } from "@/core/auth/authService";

export default function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    setBusy(true);
    const supabase = getSupabaseBrowserClient();
    await signOut(supabase);
    router.replace("/login");
    router.refresh();
  }

  return (
    <button className="btn ghost" onClick={onClick} disabled={busy}>
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
