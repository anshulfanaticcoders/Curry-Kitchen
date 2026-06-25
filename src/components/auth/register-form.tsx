"use client";

import { Loader2, UserPlus } from "lucide-react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function RegisterForm() {
  const router = useRouter();
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

    toast.success("Account created");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <label className="grid gap-2 text-sm font-extrabold">
        Name
        <input
          name="name"
          required
          className="h-12 rounded-button border border-ink/10 bg-ivory px-4 font-medium outline-none transition focus:border-saffron"
        />
      </label>
      <label className="grid gap-2 text-sm font-extrabold">
        Email
        <input
          name="email"
          type="email"
          required
          className="h-12 rounded-button border border-ink/10 bg-ivory px-4 font-medium outline-none transition focus:border-saffron"
        />
      </label>
      <label className="grid gap-2 text-sm font-extrabold">
        Phone
        <input
          name="phone"
          className="h-12 rounded-button border border-ink/10 bg-ivory px-4 font-medium outline-none transition focus:border-saffron"
        />
      </label>
      <label className="grid gap-2 text-sm font-extrabold">
        Password
        <input
          name="password"
          type="password"
          minLength={8}
          required
          className="h-12 rounded-button border border-ink/10 bg-ivory px-4 font-medium outline-none transition focus:border-saffron"
        />
      </label>
      <Button type="submit" disabled={loading} className="mt-2 w-full">
        {loading ? <Loader2 className="animate-spin" size={18} /> : <UserPlus size={18} />}
        {loading ? "Creating account" : "Create account"}
      </Button>
    </form>
  );
}
