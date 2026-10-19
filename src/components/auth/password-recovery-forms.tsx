"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { CheckCircle2, KeyRound, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/auth/password-input";

const inputClass = "h-12 w-full min-w-0 rounded-lg border border-[#d7dde6] bg-[#f1f4fc] px-4 text-base font-medium text-ink outline-none transition placeholder:text-ink/50 focus:border-saffron focus:bg-white focus:ring-4 focus:ring-saffron/10";
const linkClass = "inline-flex min-h-11 items-center font-bold text-masala underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-masala";

async function submitRecovery(path: string, body: Record<string, string>) {
  const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(result.error || "Something went wrong. Please try again.");
  return result;
}

export function ForgotPasswordForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();
    setError("");
    setLoading(true);
    try {
      const result = await submitRecovery("/api/auth/forgot-password", { email });
      setMessage(result.message);
    } catch (error) {
      setError(error instanceof Error && error.message !== "Failed to fetch" ? error.message : "Unable to connect. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  if (message) return (
    <div className="grid gap-4 text-center" role="status">
      <Mail className="mx-auto text-masala" size={32} aria-hidden="true" />
      <h2 className="text-xl font-bold text-ink">Check your email</h2>
      <p className="text-sm leading-6 text-ink/80">{message}</p>
      <button type="button" onClick={() => setMessage("")} className={`${linkClass} justify-self-center`}>Try another email</button>
    </div>
  );

  return (
    <form className="grid gap-5" onSubmit={handleSubmit} aria-busy={loading}>
      <label className="grid gap-2 text-sm font-bold text-ink/80">
        Email address
        <input name="email" type="email" required maxLength={254} autoComplete="email" placeholder="youremail@yourdomain.com" className={inputClass} aria-describedby={error ? "recovery-error" : undefined} />
      </label>
      {error ? <p id="recovery-error" role="alert" className="text-sm leading-6 text-red-700">{error}</p> : null}
      <Button type="submit" disabled={loading} className="h-12 w-full rounded-lg text-base">
        {loading ? <Loader2 className="animate-spin" size={18} aria-hidden="true" /> : <Mail size={18} aria-hidden="true" />}
        {loading ? "Sending request..." : "Send reset link"}
      </Button>
    </form>
  );
}

function subscribeToResetLink(callback: () => void) {
  window.addEventListener("hashchange", callback);
  window.addEventListener("popstate", callback);
  return () => {
    window.removeEventListener("hashchange", callback);
    window.removeEventListener("popstate", callback);
  };
}

function readResetToken() {
  const value = new URLSearchParams(window.location.hash.slice(1)).get("token") ?? "";
  return /^[a-zA-Z0-9_-]{1,100}\.[a-f0-9]{64}$/.test(value) ? value : "";
}

export function ResetPasswordForm() {
  const token = useSyncExternalStore(subscribeToResetLink, readResetToken, () => null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || loading) return;
    const data = new FormData(event.currentTarget);
    const password = String(data.get("password") ?? "");
    const confirmPassword = String(data.get("confirmPassword") ?? "");
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await submitRecovery("/api/auth/reset-password", { token, password, confirmPassword });
      window.history.replaceState(null, "", window.location.pathname);
      setSuccess(true);
    } catch (error) {
      setError(error instanceof Error && error.message !== "Failed to fetch" ? error.message : "Unable to connect. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) return (
    <div className="grid gap-4 text-center" role="status">
      <CheckCircle2 className="mx-auto text-green-700" size={36} aria-hidden="true" />
      <h2 className="text-xl font-bold text-ink">Password updated</h2>
      <p className="text-sm leading-6 text-ink/80">Your previous sessions are signed out. Sign in with your new password.</p>
      <Link href="/login" className={`${linkClass} justify-self-center`}>Sign in</Link>
    </div>
  );
  if (token === null) return <p role="status" className="text-center text-sm text-ink/80">Loading reset link...</p>;
  if (!token) return (
    <div className="grid gap-4 text-center">
      <p role="alert" className="text-sm leading-6 text-ink/80">This reset link is missing or invalid. Request a new link to continue.</p>
      <Link href="/forgot-password" className={`${linkClass} justify-self-center`}>Request a new reset link</Link>
    </div>
  );

  return (
    <form className="grid gap-5" onSubmit={handleSubmit} aria-busy={loading}>
      <label className="grid gap-2 text-sm font-bold text-ink/80">
        New password
        <PasswordInput name="password" required minLength={8} maxLength={72} autoComplete="new-password" className={`${inputClass} pr-12`} aria-describedby="password-guidance" />
      </label>
      <p id="password-guidance" className="-mt-3 text-sm leading-6 text-ink/70">Use at least 8 characters. Choose a password you do not use elsewhere.</p>
      <label className="grid gap-2 text-sm font-bold text-ink/80">
        Confirm new password
        <PasswordInput name="confirmPassword" required minLength={8} maxLength={72} autoComplete="new-password" className={`${inputClass} pr-12`} aria-describedby={error ? "reset-error" : undefined} />
      </label>
      {error ? <div><p id="reset-error" role="alert" className="text-sm leading-6 text-red-700">{error}</p><Link href="/forgot-password" className={`${linkClass} mt-1 text-sm`}>Request a new reset link</Link></div> : null}
      <Button type="submit" disabled={loading} className="h-12 w-full rounded-lg text-base">
        {loading ? <Loader2 className="animate-spin" size={18} aria-hidden="true" /> : <KeyRound size={18} aria-hidden="true" />}
        {loading ? "Updating password..." : "Reset password"}
      </Button>
    </form>
  );
}
