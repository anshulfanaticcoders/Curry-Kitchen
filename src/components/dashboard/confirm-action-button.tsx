"use client";

import { Loader2, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ActionResult = Promise<{ ok: boolean; message?: string; error?: string }>;

export function ConfirmActionButton({
  label,
  title,
  description,
  confirmLabel = "Delete",
  action,
  className,
  icon,
}: {
  label: string;
  title: string;
  description: string;
  confirmLabel?: string;
  action: () => ActionResult;
  className?: string;
  icon?: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      const result = await action();

      if (result.ok) {
        toast.success(result.message ?? "Deleted.");
        setOpen(false);
        router.refresh();
        return;
      }

      toast.error("Action failed", {
        description: result.error ?? "Please try again.",
      });
    });
  }

  return (
    <>
      <button
        type="button"
        aria-label={label}
        onClick={() => setOpen(true)}
        className={cn(
          "grid size-9 place-items-center rounded-button border border-ink/10 text-ink/60 transition hover:border-masala/40 hover:text-masala",
          className,
        )}
      >
        {icon ?? <Trash2 size={16} />}
      </button>

      {open ? (
        <div className="fixed inset-0 z-[80] grid place-items-center px-4">
          <button
            type="button"
            aria-label="Close delete confirmation"
            className="absolute inset-0 bg-ink/60 backdrop-blur-sm"
            onClick={() => (pending ? undefined : setOpen(false))}
          />
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            aria-describedby="confirm-dialog-description"
            className="relative w-full max-w-md rounded-lg border border-masala/20 bg-white p-5 shadow-[0_32px_120px_rgba(7,7,7,0.34)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-masala">
                  Confirm action
                </p>
                <h2 id="confirm-dialog-title" className="mt-2 font-display text-2xl font-black">
                  {title}
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close"
                disabled={pending}
                onClick={() => setOpen(false)}
                className="grid size-9 place-items-center rounded-button border border-ink/10 text-ink/60 transition hover:text-ink disabled:opacity-50"
              >
                <X size={17} />
              </button>
            </div>
            <p id="confirm-dialog-description" className="mt-3 text-sm leading-6 text-ink/62">
              {description}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button type="button" variant="secondary" disabled={pending} onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="button" disabled={pending} onClick={confirm}>
                {pending ? <Loader2 className="animate-spin" size={18} /> : null}
                {pending ? "Working" : confirmLabel}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
