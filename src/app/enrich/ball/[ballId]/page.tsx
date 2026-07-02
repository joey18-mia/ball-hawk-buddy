import { notFound, redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getProfile } from "@/core/profiles/profileService";
import { getBallWithContext } from "@/core/balls/ballService";
import { getActiveRoster } from "@/core/mlb/mlbClient";
import type { MlbPerson } from "@/core/mlb/types";
import type { TeamCode } from "@/core/teams/teamColors";
import EnrichBallForm from "./EnrichBallForm";

export default async function EnrichBallPage({
  params,
  searchParams,
}: {
  params: Promise<{ ballId: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { ballId } = await params;
  const { from } = await searchParams;
  const supabase = await getSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profileResult = await getProfile(supabase, user.id);
  if (!profileResult.ok || !profileResult.data) {
    redirect("/onboarding");
  }

  const result = await getBallWithContext(supabase, ballId, user.id);
  if (!result.ok || !result.data) notFound();

  const { ball, game, player } = result.data;
  const backHref =
    from === "gallery" ? `/gallery/${ball.id}` : `/enrich/game/${game.id}`;

  let roster: MlbPerson[] | null = null;
  const homeCode = game.home_team as TeamCode;
  const awayCode = game.away_team as TeamCode;
  if (game.mlb_game_pk != null) {
    try {
      const [homeRoster, awayRoster] = await Promise.all([
        getActiveRoster(homeCode),
        getActiveRoster(awayCode),
      ]);
      roster = [...homeRoster, ...awayRoster];
    } catch {
      roster = null;
    }
  }

  return (
    <EnrichBallForm
      userId={user.id}
      ball={ball}
      game={game}
      player={player}
      roster={roster}
      homeCode={homeCode}
      backHref={backHref}
    />
  );
}
