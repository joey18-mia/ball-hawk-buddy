import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getProfile } from "@/core/profiles/profileService";
import { listBallsForUser } from "@/core/balls/ballService";
import {
  buildEnrichGameGroups,
  formatGameDayLabel,
  formatMatchup,
  hasUnresolvedSkip,
  howLabel,
  sentenceFromContext,
} from "@/core/balls/ballDisplay";

/** Game-scoped enrich list — per-catch form lands in WP4. */
export default async function EnrichGamePage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  const supabase = await getSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profileResult = await getProfile(supabase, user.id);
  if (!profileResult.ok || !profileResult.data) {
    redirect("/onboarding");
  }

  const ballsResult = await listBallsForUser(supabase, user.id);
  if (!ballsResult.ok) notFound();

  const groups = buildEnrichGameGroups(ballsResult.data ?? []);
  const group = groups.find((g) => g.game.id === gameId);
  if (!group) notFound();

  const matchup = formatMatchup(group.game.home_team, group.game.away_team);
  const day = formatGameDayLabel(group.game.game_date);

  return (
    <main className="stack-screen">
      <header className="home-header">
        <Link className="btn ghost" href="/enrich">
          ‹ Enrich
        </Link>
        <span className="name">{matchup}</span>
        <span style={{ width: 48 }} />
      </header>

      <div className="card">
        <p className="muted">{day}</p>
        <h2>Add details</h2>
        <p className="muted enrich-sub">Pick a catch to add optional detail.</p>
      </div>

      <ul className="enrich-catch-list">
        {group.queue.map(({ ball, game, player }) => (
          <li key={ball.id}>
            <Link
              className={`enrich-catch-row${hasUnresolvedSkip(ball) ? " has-skip" : ""}`}
              href={`/enrich/ball/${ball.id}`}
            >
              <span className="pill">{howLabel(ball.acquisition_type)}</span>
              <span className="enrich-catch-sentence">
                {sentenceFromContext(ball, game, player)}
              </span>
              {hasUnresolvedSkip(ball) ? (
                <span className="enrich-skip-badge">Skipped player</span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
