/**
 * Map between our internal `TeamCode` (used by the color map + profiles) and the
 * MLB Stats API's numeric team ids. The MLB API keys everything (schedule,
 * rosters) on these numeric ids, so we translate at the boundary and keep
 * `TeamCode` everywhere else in the app.
 */

import type { TeamCode } from "@/core/teams/teamColors";

export const TEAM_CODE_TO_MLB_ID: Record<TeamCode, number> = {
  // AL East
  BAL: 110,
  BOS: 111,
  NYY: 147,
  TBR: 139,
  TOR: 141,
  // AL Central
  CWS: 145,
  CLE: 114,
  DET: 116,
  KCR: 118,
  MIN: 142,
  // AL West
  HOU: 117,
  LAA: 108,
  ATH: 133,
  SEA: 136,
  TEX: 140,
  // NL East
  ATL: 144,
  MIA: 146,
  NYM: 121,
  PHI: 143,
  WSN: 120,
  // NL Central
  CHC: 112,
  CIN: 113,
  MIL: 158,
  PIT: 134,
  STL: 138,
  // NL West
  ARI: 109,
  COL: 115,
  LAD: 119,
  SDP: 135,
  SFG: 137,
};

const MLB_ID_TO_TEAM_CODE: Record<number, TeamCode> = Object.fromEntries(
  Object.entries(TEAM_CODE_TO_MLB_ID).map(([code, id]) => [id, code as TeamCode])
) as Record<number, TeamCode>;

export function mlbIdToTeamCode(id: number): TeamCode | null {
  return MLB_ID_TO_TEAM_CODE[id] ?? null;
}

export function teamCodeToMlbId(code: TeamCode): number {
  return TEAM_CODE_TO_MLB_ID[code];
}
