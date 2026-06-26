// teamColors.ts
// Hardcoded MLB team color palettes + tile-border resolution for Ball Hawk.
// Colors are the official/near-official brand values; verify any you care about
// pixel-perfectly, but these are accurate enough to render distinct tiles.
//
// Each palette is ORDERED (primary, secondary, tertiary...). The home team uses
// its primary; the away team uses the first color in ITS palette that is far
// enough from the home color on the hue wheel, so two "blue" teams never clash.

export type TeamCode =
  | "BAL" | "BOS" | "NYY" | "TBR" | "TOR"
  | "CWS" | "CLE" | "DET" | "KCR" | "MIN"
  | "HOU" | "LAA" | "ATH" | "SEA" | "TEX"
  | "ATL" | "MIA" | "NYM" | "PHI" | "WSN"
  | "CHC" | "CIN" | "MIL" | "PIT" | "STL"
  | "ARI" | "COL" | "LAD" | "SDP" | "SFG";

export interface Team {
  code: TeamCode;
  name: string;
  palette: string[]; // ordered, hex
}

export const TEAMS: Record<TeamCode, Team> = {
  // AL East
  BAL: { code: "BAL", name: "Baltimore Orioles",    palette: ["#DF4601", "#000000", "#FFFFFF"] },
  BOS: { code: "BOS", name: "Boston Red Sox",       palette: ["#BD3039", "#0C2340", "#FFFFFF"] },
  NYY: { code: "NYY", name: "New York Yankees",     palette: ["#0C2340", "#C4CED4", "#FFFFFF"] },
  TBR: { code: "TBR", name: "Tampa Bay Rays",       palette: ["#092C5C", "#8FBCE6", "#F5D130"] },
  TOR: { code: "TOR", name: "Toronto Blue Jays",    palette: ["#134A8E", "#E8291C", "#1D2D5C"] },

  // AL Central
  CWS: { code: "CWS", name: "Chicago White Sox",    palette: ["#27251F", "#C4CED4", "#FFFFFF"] },
  CLE: { code: "CLE", name: "Cleveland Guardians",  palette: ["#0C2340", "#E31937", "#FFFFFF"] },
  DET: { code: "DET", name: "Detroit Tigers",       palette: ["#0C2340", "#FA4616", "#FFFFFF"] },
  KCR: { code: "KCR", name: "Kansas City Royals",   palette: ["#004687", "#BD9B60", "#FFFFFF"] },
  MIN: { code: "MIN", name: "Minnesota Twins",      palette: ["#002B5C", "#D31145", "#B9975B"] },

  // AL West
  HOU: { code: "HOU", name: "Houston Astros",       palette: ["#002D62", "#EB6E1F", "#F4911E"] },
  LAA: { code: "LAA", name: "Los Angeles Angels",   palette: ["#BA0021", "#003263", "#C4CED4"] },
  ATH: { code: "ATH", name: "Athletics",            palette: ["#003831", "#EFB21E", "#FFFFFF"] },
  SEA: { code: "SEA", name: "Seattle Mariners",     palette: ["#0C2C56", "#005C5C", "#C4CED4"] },
  TEX: { code: "TEX", name: "Texas Rangers",        palette: ["#003278", "#C0111F", "#FFFFFF"] },

  // NL East
  ATL: { code: "ATL", name: "Atlanta Braves",       palette: ["#13274F", "#CE1141", "#EAAA00"] },
  MIA: { code: "MIA", name: "Miami Marlins",        palette: ["#000000", "#00A3E0", "#EF3340"] },
  NYM: { code: "NYM", name: "New York Mets",        palette: ["#002D72", "#FF5910", "#FFFFFF"] },
  PHI: { code: "PHI", name: "Philadelphia Phillies",palette: ["#E81828", "#002D72", "#FFFFFF"] },
  WSN: { code: "WSN", name: "Washington Nationals", palette: ["#AB0003", "#14225A", "#FFFFFF"] },

  // NL Central
  CHC: { code: "CHC", name: "Chicago Cubs",         palette: ["#0E3386", "#CC3433", "#FFFFFF"] },
  CIN: { code: "CIN", name: "Cincinnati Reds",      palette: ["#C6011F", "#000000", "#FFFFFF"] },
  MIL: { code: "MIL", name: "Milwaukee Brewers",    palette: ["#12284B", "#FFC52F", "#FFFFFF"] },
  PIT: { code: "PIT", name: "Pittsburgh Pirates",   palette: ["#FDB827", "#27251F", "#FFFFFF"] },
  STL: { code: "STL", name: "St. Louis Cardinals",  palette: ["#C41E3A", "#0C2340", "#FEDB00"] },

  // NL West
  ARI: { code: "ARI", name: "Arizona Diamondbacks", palette: ["#A71930", "#30CED8", "#E3D4AD"] },
  COL: { code: "COL", name: "Colorado Rockies",     palette: ["#33006F", "#C4CED4", "#000000"] },
  LAD: { code: "LAD", name: "Los Angeles Dodgers",  palette: ["#005A9C", "#EF3E42", "#FFFFFF"] },
  SDP: { code: "SDP", name: "San Diego Padres",     palette: ["#2F241D", "#FFC425", "#FFFFFF"] },
  SFG: { code: "SFG", name: "San Francisco Giants", palette: ["#FD5A1E", "#27251F", "#FFFFFF"] },
};

// The Skip tile is a FIXED neutral gray — never computed, never a brand color,
// so it can't collide with any team and reads as "no team / none of these."
export const SKIP_BORDER = "#9CA3AF"; // gray-400
export const SKIP_FILL = "#FFFFFF";

// ---- Color distance helpers ----------------------------------------------

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

// Simple perceptual-ish distance (weighted Euclidean in RGB). Good enough to
// tell "these two borders look the same" from "these are clearly different."
function colorDistance(a: string, b: string): number {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  const rMean = (r1 + r2) / 2;
  const dr = r1 - r2, dg = g1 - g2, db = b1 - b2;
  return Math.sqrt(
    (2 + rMean / 256) * dr * dr +
    4 * dg * dg +
    (2 + (255 - rMean) / 256) * db * db
  );
}

const MIN_SEPARATION = 120; // tune: higher = stricter "must look different"

/**
 * Resolve the two tile-border colors for a matchup.
 * Home keeps its primary. Away picks the first palette color far enough from
 * home's color; if none qualifies (rare), it falls back to its last palette
 * entry (usually white) which still contrasts against a colored home border.
 */
export function resolveMatchupColors(home: TeamCode, away: TeamCode) {
  const homeColor = TEAMS[home].palette[0];
  const awayPalette = TEAMS[away].palette;

  let awayColor =
    awayPalette.find((c) => colorDistance(c, homeColor) >= MIN_SEPARATION) ??
    awayPalette[awayPalette.length - 1];

  return { homeColor, awayColor };
}

/** Convenience: border color for any single person tile given their team. */
export function borderForTeam(team: TeamCode, matchupHome: TeamCode): string {
  if (team === matchupHome) return TEAMS[matchupHome].palette[0];
  const { awayColor } = resolveMatchupColors(matchupHome, team);
  return awayColor;
}
