"use client";

import { Loader2, UserPlus } from "lucide-react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/auth/password-input";
import { safeCallbackUrl } from "@/components/auth/safe-callback-url";

export function RegisterForm() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      name: String(formData.get("name")),
      email: String(formData.get("email")),
      phone: String(formData.get("phone") ?? ""),
      password: String(formData.get("password")),
    };

    const response = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = (await response.json()) as { ok: boolean; error?: string };

    if (!response.ok || !result.ok) {
      setLoading(false);
      toast.error("Registration failed", {
        description: result.error ?? "Please check the form and try again.",
      });
      return;
    }

    await signIn("credentials", {
      email: payload.email,
      password: payload.password,
      redirect: false,
    });

    const callbackUrl = safeCallbackUrl(searchParams.get("callbackUrl"));

    toast.success("Account created");
    window.location.assign(callbackUrl ?? "/dashboard");
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <label className="grid gap-2 text-sm font-bold text-ink/80">
        Full name
        <input
          name="name"
          required
          autoComplete="name"
          className="h-11 rounded-lg border border-[#e7eaf3] bg-[#f1f4fc] px-4 text-[15px] font-medium text-ink outline-none transition placeholder:text-ink/35 focus:border-saffron focus:bg-white focus:ring-4 focus:ring-saffron/10"
        />
      </label>
      <label className="grid gap-2 text-sm font-bold text-ink/80">
        Email address
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="h-11 rounded-lg border border-[#e7eaf3] bg-[#f1f4fc] px-4 text-[15px] font-medium text-ink outline-none transition placeholder:text-ink/35 focus:border-saffron focus:bg-white focus:ring-4 focus:ring-saffron/10"
        />
      </label>
      <label className="grid gap-2 text-sm font-bold text-ink/80">
        Phone
        <input
          name="phone"
          type="tel"
          autoComplete="tel"
          className="h-11 rounded-lg border border-[#e7eaf3] bg-[#f1f4fc] px-4 text-[15px] font-medium text-ink outline-none transition placeholder:text-ink/35 focus:border-saffron focus:bg-white focus:ring-4 focus:ring-saffron/10"
        />
      </label>
      <label className="grid gap-2 text-sm font-bold text-ink/80">
        Password
        <PasswordInput
          name="password"
          minLength={8}
          required
          autoComplete="new-password"
          className="h-11 rounded-lg border border-[#e7eaf3] bg-[#f1f4fc] px-4 text-[15px] font-medium text-ink outline-none transition placeholder:text-ink/35 focus:border-saffron focus:bg-white focus:ring-4 focus:ring-saffron/10"
        />
      </label>
      <Button type="submit" disabled={loading} className="mt-2 h-11 w-full rounded-lg text-[15px] shadow-[0_12px_24px_rgba(255,122,26,0.22)]">
        {loading ? <Loader2 className="animate-spin" size={18} /> : <UserPlus size={18} />}
        {loading ? "Creating account" : "Create account"}
      </Button>
    </form>
  );
}
