import { Suspense } from "react";
import type { Metadata } from "next";
import Brand from "@/components/Brand";
import LoginForm from "./LoginForm";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <main className="auth-screen">
      <Brand tagline="Log every ball you snag — in two taps." />
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
