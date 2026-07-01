"use client";

/**
 * Tracks whether the user has dismissed the one-line capture tutorial. Default
 * ON (spec §3.2), dismissible, and stays dismissed afterward so veterans don't
 * keep seeing it.
 */

const KEY = "bhb_tutorial_dismissed";

export function isTutorialDismissed(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissTutorial() {
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    // ignore
  }
}
