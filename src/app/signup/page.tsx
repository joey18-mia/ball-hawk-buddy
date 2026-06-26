import type { Metadata } from "next";
import Brand from "@/components/Brand";
import SignupForm from "./SignupForm";

export const metadata: Metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <main className="auth-screen">
      <Brand tagline="Start your trophy case." />
      <SignupForm />
    </main>
  );
}
