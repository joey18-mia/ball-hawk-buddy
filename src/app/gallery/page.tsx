import Link from "next/link";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getProfile } from "@/core/profiles/profileService";
import { listBallsForUser } from "@/core/balls/ballService";
import {
  acquisitionTint,
  howLabel,
  sentenceFromContext,
} from "@/core/balls/ballDisplay";

export default async function GalleryPage() {
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

  return (
    <main className="stack-screen">
      <header className="home-header">
        <Link className="btn ghost" href="/">
          ‹ Home
        </Link>
        <span className="name">Gallery</span>
        <span style={{ width: 48 }} />
      </header>

      {!ballsResult.ok ? (
        <div className="card">
          <div className="alert error">
            {ballsResult.error ?? "Couldn't load your collection."}
          </div>
        </div>
      ) : catches.length === 0 ? (
        <div className="card">
          <h2>Your trophy case is empty</h2>
          <p className="muted">
            Log catches in Game Mode, or add a few you already have — your grid
            fills in as you go.
          </p>
          <Link className="btn" href="/game">
            Game Mode
          </Link>
        </div>
      ) : (
        <>
          <p className="gallery-count muted">
            {catches.length} {catches.length === 1 ? "catch" : "catches"}
          </p>
          <div className="gallery-grid">
            {catches.map(({ ball, game, player }) => {
              const tint = acquisitionTint(ball.acquisition_type);
              return (
                <Link
                  key={ball.id}
                  className="gallery-tile"
                  href={`/gallery/${ball.id}`}
                  aria-label={sentenceFromContext(ball, game, player)}
                >
                  <div
                    className="ball-icon"
                    style={{ backgroundColor: tint }}
                    title={howLabel(ball.acquisition_type)}
                  >
                    <span className="ball-icon-seam" aria-hidden />
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </main>
  );
}
