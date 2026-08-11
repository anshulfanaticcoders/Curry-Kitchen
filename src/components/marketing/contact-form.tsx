"use client";

import { useState, useTransition } from "react";
import { Send } from "lucide-react";
import { buttonStyles } from "@/components/ui/button";
import type { ActionResult } from "@/lib/action-result";
import { submitContactMessageAction } from "@/lib/actions/contact";

export function ContactForm() {
  const [result, setResult] = useState<ActionResult<undefined> | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const response = await submitContactMessageAction(formData);
      setResult(response);

      if (response.ok) {
        const form = document.getElementById("contact-form") as HTMLFormElement | null;
        form?.reset();
      }
    });
  }

  const fieldError = (field: string) =>
    result && !result.ok ? result.fieldErrors?.[field]?.[0] : undefined;

  return (
    <form
      id="contact-form"
      action={handleSubmit}
      className="rounded-lg border border-ink/10 bg-white p-7 shadow-soft"
    >
      <p className="text-sm font-black uppercase tracking-[0.18em] text-masala">
        Message Curry Kitchen
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-extrabold">
          Name
          <input
            name="name"
            required
            className="h-12 rounded-button border border-ink/10 bg-ivory px-4 outline-none transition focus:border-leaf"
          />
          {fieldError("name") ? (
            <span className="text-xs font-semibold text-masala">{fieldError("name")}</span>
          ) : null}
        </label>
        <label className="grid gap-2 text-sm font-extrabold">
          Email
          <input
            name="email"
            type="email"
            required
            className="h-12 rounded-button border border-ink/10 bg-ivory px-4 outline-none transition focus:border-leaf"
          />
          {fieldError("email") ? (
            <span className="text-xs font-semibold text-masala">{fieldError("email")}</span>
          ) : null}
        </label>
        <label className="grid gap-2 text-sm font-extrabold md:col-span-2">
          What can we help with?
          <textarea
            name="message"
            required
            className="min-h-32 rounded-button border border-ink/10 bg-ivory px-4 py-3 outline-none transition focus:border-leaf"
          />
          {fieldError("message") ? (
            <span className="text-xs font-semibold text-masala">{fieldError("message")}</span>
          ) : null}
        </label>
        <input
          type="text"
          name="company"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="hidden"
        />
      </div>
      <button type="submit" disabled={pending} className={buttonStyles("primary", "mt-5")}>
        <Send size={18} />
        {pending ? "Sending..." : "Send message"}
      </button>
      {result ? (
        <p
          className={`mt-4 text-sm font-semibold ${result.ok ? "text-leaf" : "text-masala"}`}
          role="status"
        >
          {result.ok ? (result.message ?? "Message sent.") : result.error}
        </p>
      ) : null}
    </form>
  );
}
