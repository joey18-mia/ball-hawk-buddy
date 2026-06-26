import type { Metadata } from "next";
import Brand from "@/components/Brand";
import UpdatePasswordForm from "./UpdatePasswordForm";

export const metadata: Metadata = { title: "Set new password" };

export default function UpdatePasswordPage() {
  return (
    <main className="auth-screen">
      <Brand />
      <UpdatePasswordForm />
    </main>
  );
}
