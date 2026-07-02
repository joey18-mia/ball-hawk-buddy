import Link from "next/link";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getProfile } from "@/core/profiles/profileService";
import { listBallsForUser } from "@/core/balls/ballService";
import {
  buildEnrichGameGroups,
  formatGameDayLabel,
  formatMatchup,
} from "@/core/balls/ballDisplay";

export default async function EnrichPage({
  searchParams,
}: {
  searchParams: Promise<{ ball?: string }>;
}) {
  const { ball: ballId } = await searchParams;
  if (ballId) redirect(`/enrich/ball/${ballId}`);

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
  const catches = ballsResult.ok ? (ballsResult.data ?? []) : [];
  const groups = buildEnrichGameGroups(catches);
  const totalQueue = groups.reduce((n, g) => n + g.queue.length, 0);
  const totalSkips = groups.reduce((n, g) => n + g.skipCount, 0);

  return (
    <main className="stack-screen">
      <header className="home-header">
        <Link className="btn ghost" href="/">
          ‹ Home
        </Link>
        <span className="name">Enrich</span>
        <span style={{ width: 48 }} />
      </header>

      {!ballsResult.ok ? (
        <div className="card">
          <div className="alert error">
            {ballsResult.error ?? "Couldn't load your catches."}
          </div>
        </div>
      ) : catches.length === 0 ? (
        <div className="card">
          <h2>No catches yet</h2>
          <p className="muted">
            Log a few in Game Mode first — then come back here to add optional
            detail when you have time.
          </p>
          <Link className="btn" href="/game">
            Game Mode
          </Link>
        </div>
      ) : groups.length === 0 ? (
        <div className="card">
          <span className="pill ok">All caught up</span>
          <h2>Nothing needs enrichment</h2>
          <p className="muted">
            You did exactly the right thing in the moment. Optional details are
            always welcome — browse your collection anytime.
          </p>
          <Link className="btn secondary" href="/gallery">
            Gallery
          </Link>
        </div>
      ) : (
        <>
          <div className="card enrich-intro">
            <p className="enrich-lede">
              Some catches still need enrichment.
            </p>
            <p className="muted enrich-sub">
              {totalQueue} {totalQueue === 1 ? "catch" : "catches"} across{" "}
              {groups.length} {groups.length === 1 ? "game" : "games"}
              {totalSkips > 0
                ? ` · ${totalSkips} skipped ${totalSkips === 1 ? "player" : "players"} to resolve`
                : ""}
            </p>
          </div>

          <ul className="enrich-game-list">
            {groups.map((group) => {
              const matchup = formatMatchup(
                group.game.home_team,
                group.game.away_team
              );
              const day = formatGameDayLabel(group.game.game_date);
              const ballWord =
                group.catches.length === 1 ? "ball" : "balls";
              return (
                <li key={group.game.id}>
                  <Link
                    className={`enrich-game-row${group.skipCount > 0 ? " has-skip" : ""}`}
                    href={`/enrich/game/${group.game.id}`}
                  >
                    <span className="enrich-game-day">{day}</span>
                    <span className="enrich-game-matchup">{matchup}</span>
                    <span className="enrich-game-meta">
                      {group.catches.length} {ballWord}
                      {group.skipCount > 0 ? (
                        <span className="enrich-skip-badge">
                          · {group.skipCount} skip
                          {group.skipCount === 1 ? "" : "s"}
                        </span>
                      ) : (
                        " · add details"
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </main>
  );
}
