/**
 * Database types — framework-agnostic.
 *
 * These mirror the Postgres schema described in the build spec §10. They are
 * intentionally written by hand (rather than generated) so they stay readable
 * and reusable by any client (the Next.js PWA today, a future Expo app later).
 *
 * If you later run `supabase gen types typescript`, you can replace this file's
 * `Database` shape — the rest of the app imports the domain aliases at the
 * bottom, not the raw generated type, so swapping is low-risk.
 */

// ---- Enums (match the CHECK/enum constraints in the SQL schema) -------------

export type Privacy = "public" | "friends_only" | "private";

export type PersonType = "player" | "coaching_staff" | "other_staff";

/** The "How" — acquisition type. Set in Game Mode. */
export type AcquisitionType =
  | "home_run"
  | "foul_ball"
  | "toss_up"
  | "batting_practice"
  | "other";

/** Enrichment: where the ball ended up. */
export type BallLocation =
  | "left_field"
  | "left_center"
  | "center_field"
  | "right_center"
  | "right_field"
  | "foul_territory_1b"
  | "foul_territory_3b"
  | "behind_plate"
  | "bullpen"
  | "concourse"
  | "other";

/** Enrichment: multi-select speciality tags. */
export type BallSpeciality =
  | "city_connect"
  | "practice_ball"
  | "milestone"
  | "commemorative"
  | "spring_training"
  | "all_star"
  | "postseason"
  | "walk_off"
  | "no_hitter_game";

export type SnagMethod =
  | "glove"
  | "bare_hand"
  | "after_bounce"
  | "handed_to_me"
  | "traded_for";

export type BallCondition = "mint" | "game_marks" | "scuffed";

export type BallBrand =
  | "official_mlb"
  | "bp_ball"
  | "commemorative_stamped"
  | "unknown";

// ---- Table row shapes ------------------------------------------------------

// NOTE: these Row shapes are `type` aliases, not `interface`s, on purpose.
// supabase-js requires each table's Row/Insert/Update to satisfy
// `Record<string, unknown>`. Interfaces don't get an implicit index signature,
// so using `interface` here makes the client resolve the schema to `never`
// (and `.insert()` parameters collapse to `never[]`). Type aliases work.
export type ProfileRow = {
  id: string; // uuid, FK auth.users
  username: string; // unique
  display_name: string | null;
  home_team: string | null;
  privacy: Privacy;
  created_at: string;
};

export type GameRow = {
  id: string; // uuid
  user_id: string; // FK profiles
  game_date: string; // date
  home_team: string;
  away_team: string;
  venue: string | null;
  mlb_game_pk: number | null;
  section: string | null;
  notes: string | null;
  created_at: string;
};

export type PlayerRow = {
  id: string; // uuid
  full_name: string;
  team: string | null;
  person_type: PersonType;
  position: string | null;
  jersey_number: number | null;
  mlb_person_id: number | null;
  created_at: string;
};

export type BallRow = {
  id: string; // uuid
  user_id: string; // FK profiles (the collector)
  game_id: string; // FK games
  player_id: string | null; // FK players, null = unresolved Skip
  acquisition_type: AcquisitionType;
  occurred_at: string; // timestamptz, auto-set at capture

  // Enrichment fields (ALL optional)
  location: BallLocation | null;
  speciality: BallSpeciality[] | null;
  notes: string | null;
  snag_method: SnagMethod | null;
  ball_condition: BallCondition | null;
  ball_brand: BallBrand | null;
  kept: boolean | null;

  // Resolution flags (drive the enrichment queue)
  no_player_resolved: boolean;
  is_authenticated: boolean;

  created_at: string;
};

// ---- Supabase `Database` shape ---------------------------------------------
// Shape compatible with @supabase/supabase-js generics. This mirrors the
// canonical `supabase gen types typescript` output so the client's table
// resolution works (Insert/Update are FLAT object types — intersections like
// `Omit<Row,K> & Partial<...>` make supabase-js resolve the schema to `never`).
//
// `Prettify` flattens an intersection into a single object type with concrete
// keys, which cleanly satisfies supabase-js's `GenericTable` constraint.

type Prettify<T> = { [K in keyof T]: T[K] } & {};

type WithDefaults<Row, OptionalKeys extends keyof Row> = Prettify<
  Omit<Row, OptionalKeys> & Partial<Pick<Row, OptionalKeys>>
>;

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: WithDefaults<ProfileRow, "created_at" | "privacy">;
        Update: Partial<ProfileRow>;
        Relationships: [];
      };
      games: {
        Row: GameRow;
        Insert: WithDefaults<GameRow, "id" | "created_at">;
        Update: Partial<GameRow>;
        Relationships: [];
      };
      players: {
        Row: PlayerRow;
        Insert: WithDefaults<PlayerRow, "id" | "created_at">;
        Update: Partial<PlayerRow>;
        Relationships: [];
      };
      balls: {
        Row: BallRow;
        Insert: WithDefaults<
          BallRow,
          // Auto/defaulted columns + all enrichment fields (nullable, filled
          // later in Enrich mode) are optional on insert. Game Mode sends only
          // the core fields.
          | "id"
          | "created_at"
          | "no_player_resolved"
          | "is_authenticated"
          | "location"
          | "speciality"
          | "notes"
          | "snag_method"
          | "ball_condition"
          | "ball_brand"
          | "kept"
        >;
        Update: Partial<BallRow>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: {
      privacy: Privacy;
      person_type: PersonType;
      acquisition_type: AcquisitionType;
    };
    CompositeTypes: { [_ in never]: never };
  };
}

// ---- Convenience domain aliases (import these from app code) ----------------

export type Profile = ProfileRow;
export type Game = GameRow;
export type Player = PlayerRow;
export type Ball = BallRow;

export type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
export type GameInsert = Database["public"]["Tables"]["games"]["Insert"];
export type PlayerInsert = Database["public"]["Tables"]["players"]["Insert"];
export type BallInsert = Database["public"]["Tables"]["balls"]["Insert"];
