import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  return (
    <AuthCard
      title="Create account"
      description="Save your package history, payment records, pause status, and repurchase flow."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-black text-masala hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthCard>
  );
}
