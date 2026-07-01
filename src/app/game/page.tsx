import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getProfile } from "@/core/profiles/profileService";
import CheckIn from "./CheckIn";

export default async function GameModePage() {
  const supabase = await getSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profileResult = await getProfile(supabase, user.id);
  if (!profileResult.ok || !profileResult.data) {
    redirect("/onboarding");
  }

  return <CheckIn userId={user.id} homeTeam={profileResult.data.home_team} />;
}
