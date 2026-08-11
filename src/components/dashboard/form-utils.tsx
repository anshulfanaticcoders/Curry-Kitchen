"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useTransition } from "react";
import { toast } from "sonner";
import { Button, ButtonLink } from "@/components/ui/button";

type ActionResult = Promise<{ ok: boolean; message?: string; error?: string }>;

// Single submit helper for every admin form page: runs the server action,
// toasts the outcome, and navigates back to the list on success.
export function useAdminFormSubmit(backHref: string) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>, action: (formData: FormData) => ActionResult) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await action(formData);

      if (result.ok) {
        toast.success(result.message ?? "Saved.");
        router.push(backHref);
        router.refresh();
        return;
      }

      toast.error("Save failed", {
        description: result.error ?? "Please check the fields and try again.",
      });
    });
  }

  return { submit, pending };
}

export function FormActions({
  pending,
  backHref,
  submitLabel,
}: {
  pending: boolean;
  backHref: string;
  submitLabel: string;
}) {
  return (
    <div className="flex items-center justify-end gap-3 border-t border-ink/8 pt-5">
      <ButtonLink href={backHref} variant="secondary">
        Cancel
      </ButtonLink>
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" size={18} /> : null}
        {submitLabel}
      </Button>
    </div>
  );
}

// Standard chrome for an admin add/edit page: back link, heading, white panel.
export function AdminFormShell({
  backHref,
  backLabel,
  title,
  description,
  children,
}: {
  backHref: string;
  backLabel: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="max-w-5xl">
      <Link
        href={backHref}
        className="text-sm font-bold text-ink/55 transition hover:text-ink"
      >
        ← {backLabel}
      </Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-black leading-tight tracking-tight">{title}</h1>
          {description ? <p className="mt-2 text-sm leading-6 text-ink/58">{description}</p> : null}
        </div>
      </div>
      <div className="mt-6 rounded-2xl border border-ink/6 bg-white p-6 shadow-[0_10px_36px_rgba(7,7,7,0.05)] md:p-8">
        {children}
      </div>
    </div>
  );
}
