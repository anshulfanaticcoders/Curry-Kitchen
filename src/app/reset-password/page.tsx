import Link from "next/link";
import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { ResetPasswordForm } from "@/components/auth/password-recovery-forms";

export const metadata: Metadata = { title: "Reset password", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default function ResetPasswordPage() {
  return (
    <AuthCard title="A fresh start" description="Choose a new password for your Curry Kitchen account."
      footer={<Link href="/login" className="inline-flex min-h-11 items-center font-bold text-masala hover:underline">Back to sign in</Link>}>
      <ResetPasswordForm />
    </AuthCard>
  );
}
