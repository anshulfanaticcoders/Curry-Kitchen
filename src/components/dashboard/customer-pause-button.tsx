"use client";

import { CalendarRange, Loader2, PauseCircle, PlayCircle, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Field, Input, Textarea } from "@/components/dashboard/primitives";
import { Button } from "@/components/ui/button";
import { requestCustomerPauseAction, resumeCustomerPackageAction } from "@/lib/actions/customer";

function addInputDays(value: string, days: number) {
  if (!value) return "";
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function CustomerPauseButton({
  packageId,
  canSelfPause,
  customerPauseUsed,
  status,
  earliestPauseDate,
  scheduledPause,
}: {
  packageId?: string;
  canSelfPause: boolean;
  customerPauseUsed: boolean;
  status: string;
  earliestPauseDate: string;
  scheduledPause?: { startDate: string; endDate: string };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState(earliestPauseDate);
  const [endDate, setEndDate] = useState(earliestPauseDate);
  const isPaused = status === "Paused";
  const maxEndDate = useMemo(() => addInputDays(startDate, 13), [startDate]);
  const disabled = !packageId || pending || (!isPaused && !canSelfPause);
  const label = !packageId
    ? "No active package"
    : isPaused
      ? "Resume delivery"
      : scheduledPause
        ? `Pause scheduled: ${scheduledPause.startDate}`
        : customerPauseUsed
          ? "Pause already used"
          : status !== "Active"
            ? `Cannot pause: ${status}`
            : "Schedule pause";

  function resumeLegacyPause() {
    if (!packageId) return;
    startTransition(async () => {
      const result = await resumeCustomerPackageAction(packageId);
      if (result.ok) {
        toast.success(result.message ?? "Package resumed.");
        router.refresh();
      } else {
        toast.error("Resume failed", { description: result.error });
      }
    });
  }

  function schedulePause(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!packageId) return;
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await requestCustomerPauseAction(
        packageId,
        String(formData.get("startDate") ?? ""),
        String(formData.get("endDate") ?? ""),
        String(formData.get("reason") ?? ""),
      );
      if (result.ok) {
        toast.success(result.message ?? "Pause scheduled.");
        setOpen(false);
        router.refresh();
      } else {
        toast.error("Pause could not be scheduled", { description: result.error });
      }
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        disabled={disabled}
        onClick={() => (isPaused ? resumeLegacyPause() : setOpen(true))}
        className="w-full justify-start disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? (
          <Loader2 className="animate-spin" size={18} />
        ) : isPaused ? (
          <PlayCircle size={18} />
        ) : (
          <PauseCircle size={18} />
        )}
        {pending ? "Working" : label}
      </Button>

      {open ? (
        <div className="fixed inset-0 z-[90] grid place-items-center px-4">
          <button
            type="button"
            aria-label="Close pause dialog"
            className="absolute inset-0 bg-ink/65 backdrop-blur-sm"
            onClick={() => (pending ? undefined : setOpen(false))}
          />
          <form
            onSubmit={schedulePause}
            className="relative w-full max-w-lg rounded-lg border border-ink/10 bg-white p-6 shadow-[0_32px_120px_rgba(7,7,7,0.34)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-masala">
                  <CalendarRange size={16} /> One-time pause
                </p>
                <h2 className="mt-2 font-display text-2xl font-black">Choose your pause dates</h2>
                <p className="mt-2 text-sm leading-6 text-ink/58">
                  Select up to 14 calendar days. Missed delivery days move to the end of your package automatically.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close"
                disabled={pending}
                onClick={() => setOpen(false)}
                className="grid size-9 shrink-0 place-items-center rounded-button border border-ink/10 text-ink/60"
              >
                <X size={17} />
              </button>
            </div>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <Field label="Pause from">
                <Input
                  name="startDate"
                  type="date"
                  min={earliestPauseDate}
                  value={startDate}
                  onChange={(event) => {
                    const value = event.target.value;
                    setStartDate(value);
                    if (!endDate || endDate < value || endDate > addInputDays(value, 13)) setEndDate(value);
                  }}
                  required
                />
              </Field>
              <Field label="Pause until" hint="Maximum 14 calendar days">
                <Input
                  name="endDate"
                  type="date"
                  min={startDate}
                  max={maxEndDate}
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  required
                />
              </Field>
              <Field label="Reason (optional)" className="sm:col-span-2">
                <Textarea name="reason" maxLength={300} placeholder="Travel, family plans, or another reason" />
              </Field>
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t border-ink/8 pt-5">
              <Button type="button" variant="secondary" disabled={pending} onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? <Loader2 className="animate-spin" size={18} /> : <CalendarRange size={18} />}
                {pending ? "Scheduling" : "Confirm pause"}
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
