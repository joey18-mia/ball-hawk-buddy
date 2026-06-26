import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getProfile } from "@/core/profiles/profileService";
import SignOutButton from "@/components/SignOutButton";

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
  const greetingName = profile.display_name || profile.username;

  return (
    <main className="home">
      <header className="home-header">
        <div className="who">
          <span className="hello">Welcome to Ball Hawk Buddy</span>
          <span className="name">@{profile.username}</span>
        </div>
        <SignOutButton />
      </header>

      <div className="alert success">
        You&apos;re signed in, {greetingName}. Auth + profile setup is working.
      </div>

      <p className="placeholder-note">
        Next up (Milestone 2): the Game Mode home with Game Mode, Enrich,
        Tendencies, and Gallery — and the offline-capable Catch flow.
      </p>
    </main>
  );
}
