"use client";

import { Loader2, LogIn } from "lucide-react";
import { getSession, signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function LoginForm() {
  const router = useRouter();
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
    const callbackUrl = searchParams.get("callbackUrl");

    toast.success("Signed in");
    router.push(callbackUrl ?? fallbackUrl);
    router.refresh();
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <label className="grid gap-2 text-sm font-extrabold">
        Email
        <input
          name="email"
          type="email"
          required
          defaultValue="customer@currykitchen.test"
          className="h-12 rounded-button border border-ink/10 bg-ivory px-4 font-medium outline-none transition focus:border-saffron"
        />
      </label>
      <label className="grid gap-2 text-sm font-extrabold">
        Password
        <input
          name="password"
          type="password"
          required
          defaultValue="Password123!"
          className="h-12 rounded-button border border-ink/10 bg-ivory px-4 font-medium outline-none transition focus:border-saffron"
        />
      </label>
      <Button type="submit" disabled={loading} className="mt-2 w-full">
        {loading ? <Loader2 className="animate-spin" size={18} /> : <LogIn size={18} />}
        {loading ? "Signing in" : "Sign in"}
      </Button>
    </form>
  );
}
