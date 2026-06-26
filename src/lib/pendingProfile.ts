"use client";

/**
 * Tiny client-only helper to carry the user's chosen username/display/home team
 * from signup to onboarding. Needed because when email confirmation is enabled
 * there is no session at signup time, so the profile row (which RLS gates on
 * auth.uid()) can only be inserted after the user confirms and lands logged in.
 */

const KEY = "bhb_pending_profile";

export interface PendingProfile {
  username: string;
  displayName: string | null;
  homeTeam: string | null;
}

export function savePendingProfile(p: PendingProfile) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // Storage may be unavailable (private mode); onboarding will prompt anew.
  }
}

export function loadPendingProfile(): PendingProfile | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PendingProfile) : null;
  } catch {
    return null;
  }
}

export function clearPendingProfile() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
