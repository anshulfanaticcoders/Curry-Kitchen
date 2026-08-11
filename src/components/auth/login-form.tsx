"use client";

import { Loader2, LogIn } from "lucide-react";
import { getSession, signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/auth/password-input";
import { safeCallbackUrl } from "@/components/auth/safe-callback-url";

export function LoginForm() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email"));
    const password = String(formData.get("password"));

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      toast.error("Sign in failed", {
        description: "Check your email and password.",
      });
      return;
    }

    const session = await getSession();
    const fallbackUrl = session?.user.role === "ADMIN" ? "/admin" : "/dashboard";
    const callbackUrl = safeCallbackUrl(searchParams.get("callbackUrl"));

    toast.success("Signed in");
    window.location.assign(callbackUrl ?? fallbackUrl);
  }

  return (
    <form className="grid gap-5" onSubmit={handleSubmit}>
      <label className="grid gap-2 text-sm font-bold text-ink/80">
        Email address
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="youremail@yourdomain.com"
          className="h-12 rounded-lg border border-[#e7eaf3] bg-[#f1f4fc] px-4 text-[15px] font-medium text-ink outline-none transition placeholder:text-ink/35 focus:border-saffron focus:bg-white focus:ring-4 focus:ring-saffron/10"
        />
      </label>
      <label className="grid gap-2 text-sm font-bold text-ink/80">
        Password
        <PasswordInput
          name="password"
          required
          autoComplete="current-password"
          placeholder="Enter your password"
          className="h-12 rounded-lg border border-[#e7eaf3] bg-[#f1f4fc] px-4 text-[15px] font-medium text-ink outline-none transition placeholder:text-ink/35 focus:border-saffron focus:bg-white focus:ring-4 focus:ring-saffron/10"
        />
      </label>
      <Button type="submit" disabled={loading} className="mt-2 h-12 w-full rounded-lg text-[15px] shadow-[0_12px_24px_rgba(255,122,26,0.22)]">
        {loading ? <Loader2 className="animate-spin" size={18} /> : <LogIn size={18} />}
        {loading ? "Signing in" : "Sign in"}
      </Button>
    </form>
  );
}
