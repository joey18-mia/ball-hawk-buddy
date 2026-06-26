import type { Metadata } from "next";
import Brand from "@/components/Brand";
import OnboardingForm from "./OnboardingForm";

export const metadata: Metadata = { title: "Pick your username" };

export default function OnboardingPage() {
  return (
    <main className="auth-screen">
      <Brand tagline="One quick step to set up your collection." />
      <OnboardingForm />
    </main>
  );
}
