/**
 * Human labels for enrichment enum fields — used by the Enrich form.
 */

import type {
  BallBrand,
  BallCondition,
  BallLocation,
  BallSpeciality,
  SnagMethod,
} from "../types/database";

function titleCaseWords(s: string): string {
  return s
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export const LOCATION_OPTIONS: { value: BallLocation; label: string }[] = [
  { value: "left_field", label: "Left field" },
  { value: "left_center", label: "Left-center" },
  { value: "center_field", label: "Center field" },
  { value: "right_center", label: "Right-center" },
  { value: "right_field", label: "Right field" },
  { value: "foul_territory_1b", label: "Foul territory (1B)" },
  { value: "foul_territory_3b", label: "Foul territory (3B)" },
  { value: "behind_plate", label: "Behind the plate" },
  { value: "bullpen", label: "Bullpen" },
  { value: "concourse", label: "Concourse" },
  { value: "other", label: "Other" },
];

export const SPECIALITY_OPTIONS: { value: BallSpeciality; label: string }[] = [
  { value: "city_connect", label: "City Connect" },
  { value: "practice_ball", label: "Practice ball" },
  { value: "milestone", label: "Milestone" },
  { value: "commemorative", label: "Commemorative" },
  { value: "spring_training", label: "Spring training" },
  { value: "all_star", label: "All-Star" },
  { value: "postseason", label: "Postseason" },
  { value: "walk_off", label: "Walk-off" },
  { value: "no_hitter_game", label: "No-hitter game" },
];

export const SNAG_METHOD_OPTIONS: { value: SnagMethod; label: string }[] = [
  { value: "glove", label: "Glove" },
  { value: "bare_hand", label: "Bare hand" },
  { value: "after_bounce", label: "After bounce" },
  { value: "handed_to_me", label: "Handed to me" },
  { value: "traded_for", label: "Traded for" },
];

export const CONDITION_OPTIONS: { value: BallCondition; label: string }[] = [
  { value: "mint", label: "Mint" },
  { value: "game_marks", label: "Game marks" },
  { value: "scuffed", label: "Scuffed" },
];

export const BRAND_OPTIONS: { value: BallBrand; label: string }[] = [
  { value: "official_mlb", label: "Official MLB" },
  { value: "official_mlb_special", label: "Official MLB — Special" },
  { value: "bp_ball", label: "BP ball" },
  { value: "unknown", label: "Unknown" },
];

/** Speciality tags apply only to special-edition MLB game balls. */
export function ballBrandRevealsSpeciality(
  brand: BallBrand | string | null | undefined
): boolean {
  return brand === "official_mlb_special" || brand === "commemorative_stamped";
}

export function locationLabel(value: BallLocation): string {
  return LOCATION_OPTIONS.find((o) => o.value === value)?.label ?? titleCaseWords(value);
}
