"use client";

import { AlertTriangle, Check, Eye, History, Loader2, Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Field, Input, Select, Textarea } from "@/components/dashboard/primitives";
import { applyCalendarChangeAction, previewCalendarChangeAction } from "@/lib/actions/calendar";
import type { AdminCalendarData, CalendarChangeInput, CalendarChangePreview } from "@/lib/calendar-management-types";
import { BUSINESS_TIME_ZONE } from "@/lib/package-schedule";

const ACTIONS: { value: CalendarChangeInput["action"]; label: string }[] = [
  { value: "record-delivery", label: "Record a delivery" },
  { value: "mark-delivered", label: "Mark package day delivered" },
  { value: "mark-missed", label: "Mark package day missed" },
  { value: "reschedule", label: "Reschedule a package day" },
  { value: "assign-delivery", label: "Change manual delivery treatment" },
  { value: "void-delivery", label: "Void a manual delivery" },
  { value: "undo", label: "Undo last eligible change" },
];

const TREATMENTS = {
  AWAITING_RENEWAL: "Awaiting renewal",
  PACKAGE: "Counts toward package",
  COMPLIMENTARY: "Complimentary",
  VOIDED: "Voided",
};

const controlClass = "min-w-0 rounded-lg disabled:cursor-not-allowed disabled:opacity-60";
const selectClass = `${controlClass} appearance-auto pr-3`;
const buttonClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-ink/15 px-4 py-2 text-sm font-bold transition hover:bg-frost focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-50";

function formatDate(value: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

export function AdminCalendarDayEditor({ date, data }: { date: string; data: AdminCalendarData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const inFlight = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [draft, setDraft] = useState({
    action: "record-delivery" as CalendarChangeInput["action"],
    packageId: "", deliveryDayId: "", manualDeliveryId: "",
    actualDate: date, targetDate: date,
    treatment: "AWAITING_RENEWAL" as NonNullable<CalendarChangeInput["treatment"]>,
    label: "", quantity: "1", reason: "", acknowledgeConflict: false,
  });
  const [review, setReview] = useState<{ input: CalendarChangeInput; preview: CalendarChangePreview } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | undefined>();

  const isRecord = draft.action === "record-delivery";
  const isAssign = draft.action === "assign-delivery";
  const isUndo = draft.action === "undo";
  const isPackageDay = ["mark-delivered", "mark-missed", "reschedule"].includes(draft.action);
  const needsPackage = isPackageDay || ((isRecord || isAssign) && draft.treatment === "PACKAGE");
  const needsManual = isAssign || draft.action === "void-delivery";
  const lastUndoable = data.history.find((change) => change.canUndo);
  const packages = data.state.packages.filter((plan) => plan.paid
    && ["ACTIVE", "EXPIRED", "PAUSED"].includes(plan.status)
    && (isPackageDay ? plan.days.some((day) => day.date === date) : plan.status !== "PAUSED"));
  const selectedPackage = packages.find((plan) => plan.id === draft.packageId);
  const days = selectedPackage?.days.filter((day) => day.date === date) ?? [];
  const manualDeliveries = data.state.manualDeliveries.filter((delivery) =>
    delivery.date === date && delivery.treatment !== "VOIDED" && (!isAssign || delivery.treatment !== "PACKAGE"));
  const manualDelivery = manualDeliveries.find((delivery) => delivery.id === draft.manualDeliveryId);
  const selectedDay = days.find((day) => day.id === draft.deliveryDayId);
  const valid = draft.reason.trim().length >= 5
    && (!needsPackage || selectedPackage)
    && (!isPackageDay || (selectedDay && (draft.action !== "reschedule" || !selectedPackage?.protectedDayIds.includes(selectedDay.id))))
    && (!needsManual || manualDelivery)
    && (!isUndo || lastUndoable)
    && (!isRecord || (draft.actualDate && draft.label.trim() && Number.isInteger(Number(draft.quantity)) && Number(draft.quantity) > 0 && Number(draft.quantity) <= 50))
    && (draft.action !== "reschedule" || draft.targetDate);

  function updateDraft(values: Partial<typeof draft>) {
    setDraft((current) => ({ ...current, ...values }));
    setReview(null);
    setError(null);
    setFieldErrors(undefined);
  }

  function previewChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!valid || inFlight.current) return;
    const input: CalendarChangeInput = {
      customerId: data.state.customerId,
      action: draft.action,
      date: isRecord ? draft.actualDate : date,
      reason: draft.reason.trim(),
      ...(isUndo ? { changeId: lastUndoable!.id } : { acknowledgeConflict: draft.acknowledgeConflict }),
      ...(needsPackage ? { packageId: draft.packageId } : {}),
      ...(isPackageDay ? { deliveryDayId: draft.deliveryDayId } : {}),
      ...(needsManual ? { manualDeliveryId: draft.manualDeliveryId } : {}),
      ...(draft.action === "reschedule" ? { targetDate: draft.targetDate } : {}),
      ...((isRecord || isAssign) ? { treatment: draft.treatment } : {}),
      ...(isRecord ? { label: draft.label.trim(), quantity: Number(draft.quantity) } : {}),
    };
    inFlight.current = true;
    setReview(null);
    setError(null);
    setFieldErrors(undefined);
    startTransition(async () => {
      try {
        const result = await previewCalendarChangeAction(input);
        if (result.ok) {
          setReview({ input, preview: result.data });
        } else {
          setError(result.error);
          setFieldErrors(result.fieldErrors);
        }
      } catch {
        setError("Preview could not be loaded. Check your connection and try again. No changes were saved.");
      } finally {
        inFlight.current = false;
      }
    });
  }

  function confirmChange() {
    if (!review || inFlight.current) return;
    inFlight.current = true;
    setError(null);
    startTransition(async () => {
      try {
        const result = await applyCalendarChangeAction(review.input, review.preview.fingerprint);
        setReview(null);
        if (result.ok) {
          toast.success(result.message ?? "Calendar updated.");
          setDraft((current) => ({ ...current, reason: "", acknowledgeConflict: false }));
          router.refresh();
        } else {
          setError(result.error);
          setFieldErrors(result.fieldErrors);
        }
      } catch {
        setReview(null);
        setError("The change could not be confirmed. Refresh the calendar and check its history before trying again.");
      } finally {
        inFlight.current = false;
      }
    });
  }

  return (
    <section className="min-w-0 border-t border-ink/10 pt-5" aria-label="Manage selected day">
      <h3 className="text-base font-extrabold">Manage delivery</h3>
      <form ref={formRef} onSubmit={previewChange} className="mt-4" aria-busy={pending}>
        <fieldset disabled={pending} className="grid min-w-0 gap-4">
          <Field label="Action">
            <Select value={draft.action} className={selectClass} onChange={(event) => updateDraft({
              action: event.target.value as CalendarChangeInput["action"], packageId: "", deliveryDayId: "", manualDeliveryId: "", acknowledgeConflict: false,
            })}>
              {ACTIONS.map((action) => <option key={action.value} value={action.value} disabled={action.value === "undo" && !lastUndoable}>{action.label}</option>)}
            </Select>
          </Field>

          {needsManual ? (
            <Field label="Manual delivery">
              <Select required value={draft.manualDeliveryId} className={selectClass} onChange={(event) => updateDraft({ manualDeliveryId: event.target.value })}>
                <option value="">Choose a delivery</option>
                {manualDeliveries.map((delivery) => (
                  <option key={delivery.id} value={delivery.id}>
                    {delivery.label} / {formatDate(delivery.date)} / {delivery.quantity} tiffins / {TREATMENTS[delivery.treatment]} / #{delivery.id.slice(-6)}
                  </option>
                ))}
              </Select>
              {!manualDeliveries.length ? <span className="text-sm text-ink/65">No eligible manual deliveries on this date.</span> : null}
            </Field>
          ) : null}

          {isRecord ? (
            <>
              <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <Field label="Actual delivery date">
                  <Input type="date" required max={data.today} value={draft.actualDate} className={controlClass} onChange={(event) => updateDraft({ actualDate: event.target.value })} />
                </Field>
                <Field label="Quantity (tiffins)">
                  <Input type="number" min={1} max={50} step={1} required value={draft.quantity} className={controlClass} onChange={(event) => updateDraft({ quantity: event.target.value })} />
                </Field>
              </div>
              <Field label="Delivery label">
                <Input required maxLength={150} value={draft.label} className={controlClass} onChange={(event) => updateDraft({ label: event.target.value })} />
              </Field>
            </>
          ) : null}

          {isRecord || isAssign ? (
              <Field label="Treatment">
                <Select value={draft.treatment} className={selectClass} onChange={(event) => updateDraft({
                  treatment: event.target.value as NonNullable<CalendarChangeInput["treatment"]>, packageId: "", deliveryDayId: "",
                })}>
                  <option value="AWAITING_RENEWAL">Awaiting renewal</option>
                  <option value="PACKAGE">Counts toward package</option>
                  <option value="COMPLIMENTARY">Complimentary</option>
                </Select>
              </Field>
          ) : null}

          {needsPackage ? (
            <>
              <Field label="Package">
                <Select required value={draft.packageId} className={selectClass} onChange={(event) => updateDraft({ packageId: event.target.value, deliveryDayId: "" })}>
                  <option value="">Choose a package</option>
                  {packages.map((plan) => (
                    <option key={plan.id} value={plan.id}>{plan.name} / {formatDate(plan.startDate)} / {plan.quantity} tiffins / {plan.status.replaceAll("_", " ")} / #{plan.id.slice(-6)}</option>
                  ))}
                </Select>
                {!packages.length ? <span className="text-sm text-ink/65">{isPackageDay ? "No package delivery days on this date." : "No paid packages available."}</span> : null}
              </Field>
              {isPackageDay ? <Field label="Package delivery day">
                <Select required disabled={!selectedPackage} value={draft.deliveryDayId} className={selectClass} onChange={(event) => updateDraft({ deliveryDayId: event.target.value })}>
                  <option value="">Choose a specific delivery day</option>
                  {days.map((day) => (
                    <option key={day.id} value={day.id} disabled={draft.action === "reschedule" && selectedPackage?.protectedDayIds.includes(day.id)}>{formatDate(day.date)} / {selectedPackage?.quantity} tiffins / {day.status.replaceAll("_", " ")} / #{day.id.slice(-6)}{selectedPackage?.protectedDayIds.includes(day.id) ? " / Protected adjustment" : ""}</option>
                  ))}
                </Select>
                {selectedPackage && !days.length ? <span className="text-sm text-ink/65">No eligible delivery days in this package.</span> : null}
              </Field> : null}
              {selectedDay ? (
                <p className="break-words text-sm text-ink/70">
                  {selectedPackage?.name}: {formatDate(selectedDay.date)}, {selectedPackage?.quantity} tiffins.
                  {selectedDay.menuSummary ? ` ${selectedDay.menuSummary}` : ""}
                </p>
              ) : null}
            </>
          ) : null}

          {draft.action === "reschedule" ? (
            <Field label="New delivery date">
              <Input type="date" required value={draft.targetDate} className={controlClass} onChange={(event) => updateDraft({ targetDate: event.target.value })} />
            </Field>
          ) : null}

          {isUndo && lastUndoable ? <p className="break-words text-sm text-ink/70">Undo: {lastUndoable.summary}</p> : null}

          <Field label={isUndo ? "Reason for undo (required)" : "Reason (required)"}>
            <Textarea required minLength={5} maxLength={500} value={draft.reason} className={controlClass} onChange={(event) => updateDraft({ reason: event.target.value })} />
          </Field>

          {!isUndo ? (
            <label className="flex min-h-11 cursor-pointer items-start gap-3 py-2 text-sm leading-5 text-ink/75">
              <input type="checkbox" checked={draft.acknowledgeConflict} onChange={(event) => updateDraft({ acknowledgeConflict: event.target.checked })} className="mt-0.5 size-5 shrink-0 accent-ink" />
              <span>I acknowledge any off-day, kitchen holiday, package pause, or existing-delivery conflict.</span>
            </label>
          ) : null}

          <button type="submit" disabled={!valid || pending} className={buttonClass}>
            {pending ? <Loader2 size={17} className="shrink-0 animate-spin" aria-hidden="true" /> : <Eye size={17} className="shrink-0" aria-hidden="true" />}
            {pending ? "Please wait" : "Preview change"}
          </button>
        </fieldset>
      </form>

      {error ? (
        <div role="alert" className="mt-4 break-words border-t border-chili/25 pt-3 text-sm text-chili">
          <p className="font-bold">{error}</p>
          {fieldErrors ? <ul className="mt-2 list-inside list-disc">{Object.entries(fieldErrors).flatMap(([field, messages]) => messages.map((message, index) => <li key={`${field}-${index}`}>{message}</li>))}</ul> : null}
        </div>
      ) : null}

      {review ? (
        <section className="mt-5 min-w-0 border-t border-ink/15 pt-5" aria-label="Change preview" aria-live="polite">
          <h4 className="font-extrabold">Review change</h4>
          <p className="mt-2 break-words text-sm leading-6">{review.preview.summary}</p>
          {review.preview.warnings.length ? (
            <ul className="mt-3 grid gap-2 text-sm text-amber-800">
              {review.preview.warnings.map((warning, index) => (
                <li key={index} className="flex items-start gap-2"><AlertTriangle size={17} className="mt-0.5 shrink-0" aria-hidden="true" /><span className="break-words">{warning}</span></li>
              ))}
            </ul>
          ) : null}
          {review.preview.balances.length ? review.preview.balances.map((balance) => (
            <div key={balance.packageId} className="mt-4 min-w-0 border-t border-ink/10 pt-3">
              <p className="break-words text-sm font-extrabold">{balance.name}</p>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-left text-xs tabular-nums">
                  <caption className="sr-only">Package balance changes for {balance.name}</caption>
                  <thead><tr><th scope="col" className="py-2 pr-2">Balance</th><th scope="col" className="p-2">Before</th><th scope="col" className="py-2 pl-2">After</th></tr></thead>
                  <tbody className="text-ink/75">
                    <tr><th scope="row" className="py-2 pr-2 font-medium">Completed days</th><td className="p-2">{balance.beforeCompleted}</td><td className="py-2 pl-2 font-bold">{balance.afterCompleted}</td></tr>
                    <tr><th scope="row" className="py-2 pr-2 font-medium">Remaining days</th><td className="p-2">{balance.beforeRemaining}</td><td className="py-2 pl-2 font-bold">{balance.afterRemaining}</td></tr>
                    <tr><th scope="row" className="py-2 pr-2 font-medium">End date</th><td className="p-2">{formatDate(balance.beforeEnd)}</td><td className="py-2 pl-2 font-bold">{formatDate(balance.afterEnd)}</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          )) : <p className="mt-3 text-sm text-ink/65">No package balance changes.</p>}
          {review.preview.warnings.length > 0 && !review.input.acknowledgeConflict ? <p className="mt-3 text-sm font-bold text-amber-800">Conflict acknowledgement is required.</p> : null}
          <button type="button" disabled={pending || (review.preview.warnings.length > 0 && !review.input.acknowledgeConflict)} onClick={confirmChange} className={`${buttonClass} mt-4 w-full border-ink bg-ink text-white hover:bg-ink/85`}>
            {pending ? <Loader2 size={17} className="shrink-0 animate-spin" aria-hidden="true" /> : <Check size={17} className="shrink-0" aria-hidden="true" />}
            {pending ? "Saving change" : "Confirm change"}
          </button>
        </section>
      ) : null}

      <section className="mt-6 border-t border-ink/10 pt-5" aria-label="Calendar change history">
        <h3 className="flex items-center gap-2 text-base font-extrabold"><History size={18} aria-hidden="true" />Recent changes</h3>
        {data.history.length ? (
          <ol className="mt-3 divide-y divide-ink/10">
            {data.history.map((change) => (
              <li key={change.id} className="min-w-0 py-3 text-sm">
                <p className="break-words font-bold">{change.summary}</p>
                <p className="mt-1 whitespace-pre-wrap break-words text-ink/75">{change.reason}</p>
                <p className="mt-1 break-words text-xs leading-5 text-ink/65">{change.actor} / <time dateTime={change.createdAt}>{new Intl.DateTimeFormat("en-US", {
                  dateStyle: "medium", timeStyle: "short", timeZone: BUSINESS_TIME_ZONE,
                }).format(new Date(change.createdAt))}</time> Pacific</p>
                {change.id === lastUndoable?.id ? (
                  <button type="button" disabled={pending} className={`${buttonClass} mt-2`} onClick={() => {
                    updateDraft({ action: "undo", reason: "", acknowledgeConflict: false });
                    formRef.current?.querySelector("textarea")?.focus();
                  }}><Undo2 size={16} aria-hidden="true" />Undo change</button>
                ) : null}
              </li>
            ))}
          </ol>
        ) : <p className="mt-3 text-sm text-ink/65">No calendar changes recorded.</p>}
      </section>
    </section>
  );
}
