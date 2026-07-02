/**
 * Display + completeness helpers for balls — framework-agnostic (no React).
 * Used by Gallery and Enrich to render the same "sentence" language as capture.
 */

import { TEAMS, type TeamCode } from "../teams/teamColors";
import type { AcquisitionType, Ball, Game, Player } from "../types/database";

export const HOW_LABELS: Record<AcquisitionType, string> = {
  home_run: "Home Run",
  foul_ball: "Foul Ball",
  toss_up: "Toss-up",
  batting_practice: "Batting Practice",
  other: "Other",
};

/** Tile tint per acquisition type — distinct mix in the trophy-case grid. */
export const ACQUISITION_TINT: Record<AcquisitionType, string> = {
  home_run: "#d22d2d",
  foul_ball: "#6b8cae",
  toss_up: "#4ade80",
  batting_practice: "#ffb000",
  other: "#9fb3cd",
};

export function howLabel(type: AcquisitionType): string {
  return HOW_LABELS[type] ?? type;
}

export function acquisitionTint(type: AcquisitionType): string {
  return ACQUISITION_TINT[type] ?? ACQUISITION_TINT.other;
}

function teamDisplayName(code: string): string {
  const team = TEAMS[code as TeamCode];
  if (team) {
    const short = team.name.split(" ").pop();
    return short ?? team.name;
  }
  return code;
}

export function formatMatchup(homeTeam: string, awayTeam: string): string {
  return `${teamDisplayName(homeTeam)} vs. ${teamDisplayName(awayTeam)}`;
}

/** Short date for sentences — e.g. "Jun 8" from YYYY-MM-DD or ISO timestamp. */
export function formatShortDate(isoOrDate: string): string {
  const d = isoOrDate.includes("T")
    ? new Date(isoOrDate)
    : new Date(`${isoOrDate}T12:00:00`);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export interface BallSentenceInput {
  acquisitionType: AcquisitionType;
  playerName: string | null;
  homeTeam: string;
  awayTeam: string;
  gameDate: string;
}

/** Gallery / detail sentence — matches capture copy. */
export function formatBallSentence(input: BallSentenceInput): string {
  const how = howLabel(input.acquisitionType);
  const matchup = formatMatchup(input.homeTeam, input.awayTeam);
  const when = formatShortDate(input.gameDate);
  if (input.playerName) {
    return `${how} from ${input.playerName} · ${matchup} · ${when}`;
  }
  return `${how} · ${matchup} · ${when}`;
}

export function sentenceFromContext(
  ball: Ball,
  game: Game,
  player: Player | null
): string {
  return formatBallSentence({
    acquisitionType: ball.acquisition_type,
    playerName: player?.full_name ?? null,
    homeTeam: game.home_team,
    awayTeam: game.away_team,
    gameDate: game.game_date,
  });
}

/** Unresolved Skip — the only queue item that truly affects attribution. */
export function hasUnresolvedSkip(ball: Ball): boolean {
  return ball.player_id == null && !ball.no_player_resolved;
}

/** True when optional enrichment fields are all still empty. */
export function isThinEnrichment(ball: Ball): boolean {
  return (
    ball.location == null &&
    (ball.speciality == null || ball.speciality.length === 0) &&
    ball.notes == null &&
    ball.snag_method == null &&
    ball.ball_condition == null &&
    ball.ball_brand == null &&
    ball.kept == null
  );
}

/** Should this catch appear in the Enrich queue? */
export function needsEnrichment(ball: Ball): boolean {
  if (ball.no_player_resolved) return false;
  return hasUnresolvedSkip(ball) || isThinEnrichment(ball);
}

/** Priority for sorting within Enrich — Skips first. */
export function enrichPriority(ball: Ball): number {
  if (hasUnresolvedSkip(ball)) return 0;
  if (isThinEnrichment(ball)) return 1;
  return 2;
}

export interface BallWithContextLike {
  ball: Ball;
  game: Game;
  player: Player | null;
}

export interface EnrichGameGroup {
  game: Game;
  /** All catches in this game (newest first). */
  catches: BallWithContextLike[];
  /** Catches still in the enrichment queue. */
  queue: BallWithContextLike[];
  skipCount: number;
}

/** Group catches by game for the Enrich home list. Newest games first; games with
 *  unresolved Skips sort above games on the same date. */
export function buildEnrichGameGroups(
  items: BallWithContextLike[]
): EnrichGameGroup[] {
  const byGame = new Map<string, BallWithContextLike[]>();
  for (const item of items) {
    const list = byGame.get(item.game.id) ?? [];
    list.push(item);
    byGame.set(item.game.id, list);
  }

  const groups: EnrichGameGroup[] = [];
  for (const catches of byGame.values()) {
    const game = catches[0].game;
    const sorted = [...catches].sort(
      (a, b) =>
        enrichPriority(a.ball) - enrichPriority(b.ball) ||
        b.ball.occurred_at.localeCompare(a.ball.occurred_at)
    );
    const queue = sorted.filter((c) => needsEnrichment(c.ball));
    if (queue.length === 0) continue;
    groups.push({
      game,
      catches: sorted,
      queue,
      skipCount: queue.filter((c) => hasUnresolvedSkip(c.ball)).length,
    });
  }

  groups.sort((a, b) => {
    if (a.skipCount !== b.skipCount) return b.skipCount - a.skipCount;
    return b.game.game_date.localeCompare(a.game.game_date);
  });

  return groups;
}

/** Weekday + short date — e.g. "Sunday · Jun 8". */
export function formatGameDayLabel(gameDate: string): string {
  const d = new Date(`${gameDate}T12:00:00`);
  const weekday = d.toLocaleDateString(undefined, { weekday: "long" });
  return `${weekday} · ${formatShortDate(gameDate)}`;
}
