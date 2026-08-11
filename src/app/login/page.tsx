import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: false } };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  const registerHref = callbackUrl
    ? `/register?callbackUrl=${encodeURIComponent(callbackUrl)}`
    : "/register";

  return (
    <AuthCard
      title="Welcome back!"
      description="Sign in to manage your deliveries, weekly menu, and account."
      footer={
        <>
          New customer?{" "}
          <Link href={registerHref} className="font-black text-masala hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <Suspense fallback={<div className="h-40 rounded-lg bg-ivory" />}>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
