import type { TeamCode } from "@/core/teams/teamColors";
import type { PersonType } from "@/core/types/database";

/** A team as referenced by a schedule game. */
export interface MlbTeamRef {
  mlbId: number;
  /** Our internal code, resolved from `mlbId`. Null if not an MLB team we know. */
  code: TeamCode | null;
  name: string;
}

/** A single game from the schedule. */
export interface MlbGame {
  gamePk: number;
  gameDate: string; // ISO timestamp
  home: MlbTeamRef;
  away: MlbTeamRef;
  venue: string | null;
  /** e.g. "Preview" | "Live" | "Final" — from status.abstractGameState. */
  status: string | null;
}

/** A person on a team's roster (player or staff) — the Who picker's data. */
export interface MlbPerson {
  mlbPersonId: number;
  fullName: string;
  jerseyNumber: number | null;
  /** Position abbreviation, e.g. "SS", "P", or a coaching title. */
  position: string | null;
  personType: PersonType;
  /** Which team's roster this person is on. */
  teamCode: TeamCode;
}
