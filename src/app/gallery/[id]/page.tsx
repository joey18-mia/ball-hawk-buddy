import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getProfile } from "@/core/profiles/profileService";
import { getBallWithContext } from "@/core/balls/ballService";
import {
  acquisitionTint,
  formatShortDate,
  hasUnresolvedSkip,
  howLabel,
  sentenceFromContext,
} from "@/core/balls/ballDisplay";

export default async function GalleryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await getSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profileResult = await getProfile(supabase, user.id);
  if (!profileResult.ok || !profileResult.data) {
    redirect("/onboarding");
  }

  const result = await getBallWithContext(supabase, id, user.id);
  if (!result.ok || !result.data) {
    notFound();
  }

  const { ball, game, player } = result.data;
  const sentence = sentenceFromContext(ball, game, player);
  const tint = acquisitionTint(ball.acquisition_type);
  const skipped = hasUnresolvedSkip(ball);

  return (
    <main className="stack-screen">
      <header className="home-header">
        <Link className="btn ghost" href="/gallery">
          ‹ Gallery
        </Link>
        <span className="name">Catch</span>
        <span style={{ width: 48 }} />
      </header>

      <div className="card gallery-detail">
        <Link
          className="enrich-corner"
          href={`/enrich/ball/${ball.id}?from=gallery`}
          title="Enrich this catch"
        >
          Enrich
        </Link>

        <div
          className="ball-icon ball-icon-lg"
          style={{ backgroundColor: tint }}
        >
          <span className="ball-icon-seam" aria-hidden />
        </div>

        <span className="pill">{howLabel(ball.acquisition_type)}</span>
        <h2 className="gallery-sentence">{sentence}</h2>

        {player ? (
          <p className="muted">From {player.full_name}</p>
        ) : skipped ? (
          <p className="muted">Player skipped — add one in Enrich</p>
        ) : null}

        <p className="muted gallery-meta">
          {game.venue ? `${game.venue} · ` : ""}
          {formatShortDate(game.game_date)}
        </p>
      </div>
    </main>
  );
}
