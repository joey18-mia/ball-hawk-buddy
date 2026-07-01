/**
 * MLB Stats API client — framework-agnostic (pure fetch, no React/Next).
 *
 * Base: https://statsapi.mlb.com/api/v1/ (free, no key). Used for the check-in
 * schedule, the Who-picker rosters, and headshots. All calls are defensive:
 * they time out on weak signal and parse loosely, since the shape can vary and
 * a broken field must never crash the capture flow.
 */

import type { TeamCode } from "@/core/teams/teamColors";
import type { PersonType } from "@/core/types/database";
import { mlbIdToTeamCode, teamCodeToMlbId } from "./teamIds";
import type { MlbGame, MlbPerson, MlbTeamRef } from "./types";

const BASE = "https://statsapi.mlb.com/api/v1";
const DEFAULT_TIMEOUT_MS = 8000;

export class MlbApiError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "MlbApiError";
  }
}

async function fetchJson(url: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new MlbApiError(`MLB API responded ${res.status} for ${url}`);
    }
    return await res.json();
  } catch (err) {
    if (err instanceof MlbApiError) throw err;
    throw new MlbApiError(`MLB API request failed for ${url}`, err);
  } finally {
    clearTimeout(timer);
  }
}

// ---- small safe accessors -------------------------------------------------

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}
function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}
function asString(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}
function asNumber(v: unknown): number | null {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) {
    return Number(v);
  }
  return null;
}

/** Today's date as YYYY-MM-DD in the given timezone (defaults to local). */
export function todayIso(timeZone?: string): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date()); // en-CA yields YYYY-MM-DD
}

// ---- schedule -------------------------------------------------------------

function parseTeamRef(raw: unknown): MlbTeamRef {
  const team = asRecord(asRecord(raw).team);
  const mlbId = asNumber(team.id) ?? 0;
  return {
    mlbId,
    code: mlbId ? mlbIdToTeamCode(mlbId) : null,
    name: asString(team.name) ?? "Unknown",
  };
}

function parseGames(json: unknown): MlbGame[] {
  const dates = asArray(asRecord(json).dates);
  const games: MlbGame[] = [];
  for (const d of dates) {
    for (const g of asArray(asRecord(d).games)) {
      const game = asRecord(g);
      const teams = asRecord(game.teams);
      const gamePk = asNumber(game.gamePk);
      if (gamePk == null) continue;
      games.push({
        gamePk,
        gameDate: asString(game.gameDate) ?? "",
        home: parseTeamRef(teams.home),
        away: parseTeamRef(teams.away),
        venue: asString(asRecord(game.venue).name),
        status: asString(asRecord(game.status).abstractGameState),
      });
    }
  }
  return games;
}

/** All MLB games on a given date (YYYY-MM-DD). */
export async function getScheduleForDate(date: string): Promise<MlbGame[]> {
  const json = await fetchJson(`${BASE}/schedule?sportId=1&date=${date}`);
  return parseGames(json);
}

/** Games for a specific team on a date — used for the home-team auto-suggest. */
export async function getScheduleForTeam(
  team: TeamCode,
  date: string
): Promise<MlbGame[]> {
  const teamId = teamCodeToMlbId(team);
  const json = await fetchJson(
    `${BASE}/schedule?sportId=1&teamId=${teamId}&date=${date}`
  );
  return parseGames(json);
}

// ---- rosters --------------------------------------------------------------

function parsePlayers(json: unknown, teamCode: TeamCode): MlbPerson[] {
  return asArray(asRecord(json).roster).flatMap((entry) => {
    const e = asRecord(entry);
    const person = asRecord(e.person);
    const id = asNumber(person.id);
    if (id == null) return [];
    return [
      {
        mlbPersonId: id,
        fullName: asString(person.fullName) ?? "Unknown",
        jerseyNumber: asNumber(e.jerseyNumber),
        position: asString(asRecord(e.position).abbreviation),
        personType: "player" as PersonType,
        teamCode,
      },
    ];
  });
}

function parseCoaches(json: unknown, teamCode: TeamCode): MlbPerson[] {
  return asArray(asRecord(json).roster).flatMap((entry) => {
    const e = asRecord(entry);
    const person = asRecord(e.person);
    const id = asNumber(person.id);
    if (id == null) return [];
    return [
      {
        mlbPersonId: id,
        fullName: asString(person.fullName) ?? "Unknown",
        jerseyNumber: asNumber(e.jerseyNumber),
        position: asString(e.title) ?? asString(asRecord(e.job).title),
        personType: "coaching_staff" as PersonType,
        teamCode,
      },
    ];
  });
}

/**
 * Active roster + coaching staff for a team, merged. `person_type` is implied
 * by which list a person came from (spec §3). Coaches are best-effort: if that
 * call fails we still return the players.
 */
export async function getActiveRoster(team: TeamCode): Promise<MlbPerson[]> {
  const teamId = teamCodeToMlbId(team);

  const playersJson = await fetchJson(
    `${BASE}/teams/${teamId}/roster?rosterType=active`
  );
  const players = parsePlayers(playersJson, team);

  let coaches: MlbPerson[] = [];
  try {
    const coachesJson = await fetchJson(`${BASE}/teams/${teamId}/coaches`);
    coaches = parseCoaches(coachesJson, team);
  } catch {
    // Coaching staff is a bonus; never block the picker on it.
  }

  return [...players, ...coaches];
}

// ---- headshots ------------------------------------------------------------

/**
 * Headshot URL for a person. Rendered lazily on top of colored initials, so a
 * slow/failed load still leaves a recognizable, tappable tile (spec §3).
 */
export function headshotUrl(mlbPersonId: number, size = 180): string {
  return `https://img.mlbstatic.com/mlb-photos/image/upload/w_${size},q_auto:good/v1/people/${mlbPersonId}/headshot/67/current`;
}
