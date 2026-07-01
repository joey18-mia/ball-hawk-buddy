import Link from "next/link";

/**
 * Placeholder surface for features not yet built in the current milestone.
 * Keeps the home buttons routing to a real page instead of a dead link.
 */
export default function ComingSoon({
  title,
  blurb,
  milestone,
}: {
  title: string;
  blurb: string;
  milestone: string;
}) {
  return (
    <main className="stack-screen">
      <div className="card">
        <h2>{title}</h2>
        <p className="muted">{blurb}</p>
        <span className="pill">{milestone}</span>
        <Link className="btn secondary" href="/">
          Back home
        </Link>
      </div>
    </main>
  );
}
