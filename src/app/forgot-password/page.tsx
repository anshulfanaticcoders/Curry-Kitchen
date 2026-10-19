import Link from "next/link";
import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { ForgotPasswordForm } from "@/components/auth/password-recovery-forms";

export const metadata: Metadata = { title: "Forgot password", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default function ForgotPasswordPage() {
  return (
    <AuthCard title="Forgot password?" description="Enter your account email and we'll send you a secure link to reset your password."
      footer={<Link href="/login" className="inline-flex min-h-11 items-center font-bold text-masala hover:underline">Back to sign in</Link>}>
      <ForgotPasswordForm />
    </AuthCard>
  );
}
