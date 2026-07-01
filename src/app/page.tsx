import Link from "next/link";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getProfile } from "@/core/profiles/profileService";
import SignOutButton from "@/components/SignOutButton";

const NAV = [
  {
    href: "/enrich",
    title: "Enrich",
    subtitle: "Add detail to past catches",
  },
  {
    href: "/tendencies",
    title: "Tendencies",
    subtitle: "Who gives up the most balls",
  },
  {
    href: "/gallery",
    title: "Gallery",
    subtitle: "Your collection",
  },
];

export default async function HomePage() {
  const supabase = await getSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware already gates this, but guard defensively.
  if (!user) redirect("/login");

  const profileResult = await getProfile(supabase, user.id);
  if (!profileResult.ok || !profileResult.data) {
    redirect("/onboarding");
  }

  const profile = profileResult.data;

  return (
    <main className="home">
      <header className="home-header">
        <div className="who">
          <span className="hello">Ball Hawk Buddy</span>
          <span className="name">@{profile.username}</span>
        </div>
        <SignOutButton />
      </header>

      <nav className="home-nav">
        <Link className="tile-btn hero" href="/game">
          <span className="tile-title">Game Mode</span>
          <span className="tile-sub">Check in and log catches — fast</span>
        </Link>

        <div className="home-grid">
          {NAV.map((item) => (
            <Link key={item.href} className="tile-btn" href={item.href}>
              <span className="tile-title">{item.title}</span>
              <span className="tile-sub">{item.subtitle}</span>
            </Link>
          ))}
        </div>
      </nav>
    </main>
  );
}
