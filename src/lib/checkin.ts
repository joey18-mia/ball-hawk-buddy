"use client";

/**
 * Active check-in state (browser-only). When a user checks into a game, we cache
 * the game context + both teams' rosters here so every catch this session
 * inherits the game/time for free (spec §3) and the Who picker works offline
 * even on dead stadium signal — the rosters were fetched at check-in.
 */

import type { MlbPerson } from "@/core/mlb/types";
import type { TeamCode } from "@/core/teams/teamColors";

export interface ActiveCheckin {
  /** Supabase games.id (created at check-in while online). */
  gameId: string;
  gamePk: number | null;
  gameDate: string; // YYYY-MM-DD
  homeCode: TeamCode;
  awayCode: TeamCode;
  homeName: string;
  awayName: string;
  venue: string | null;
  /** Both teams' people, merged; each carries its own teamCode. */
  roster: MlbPerson[];
  checkedInAt: string; // ISO
}

const KEY = "bhb_active_checkin";

export function saveCheckin(c: ActiveCheckin) {
  try {
    localStorage.setItem(KEY, JSON.stringify(c));
  } catch {
    // Storage unavailable (private mode) — check-in just won't persist.
  }
}

export function loadCheckin(): ActiveCheckin | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ActiveCheckin) : null;
  } catch {
    return null;
  }
}

export function clearCheckin() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

/** True when the check-in is for today's calendar date (local). */
export function isCheckinForToday(c: ActiveCheckin, todayIso: string): boolean {
  return c.gameDate === todayIso;
}
