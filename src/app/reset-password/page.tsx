import type { Metadata } from "next";
import Brand from "@/components/Brand";
import ResetForm from "./ResetForm";

export const metadata: Metadata = { title: "Reset password" };

export default function ResetPasswordPage() {
  return (
    <main className="auth-screen">
      <Brand tagline="We'll email you a reset link." />
      <ResetForm />
    </main>
  );
}
