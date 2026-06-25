import Link from "next/link";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <AuthCard
      title="Sign in"
      description="Use a seeded account or your registered customer account."
      footer={
        <>
          New customer?{" "}
          <Link href="/register" className="font-black text-masala hover:underline">
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
