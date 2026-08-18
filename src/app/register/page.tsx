import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { RegisterForm } from "@/components/auth/register-form";
import { getBusinessRules } from "@/lib/business-rules";

export const metadata: Metadata = { title: "Create account", robots: { index: false, follow: false } };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const rules = await getBusinessRules();

  if (rules.maintenanceMode) {
    redirect("/");
  }

  const { callbackUrl } = await searchParams;
  const loginHref = callbackUrl
    ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
    : "/login";

  return (
    <AuthCard
      title="Create your account"
      description="Join Curry Kitchen to keep your weekly meals and delivery details in one place."
      footer={
        <>
          Already have an account?{" "}
          <Link href={loginHref} className="font-black text-masala hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <Suspense fallback={<div className="h-40 rounded-lg bg-ivory" />}>
        <RegisterForm />
      </Suspense>
    </AuthCard>
  );
}
