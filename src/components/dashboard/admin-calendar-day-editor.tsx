"use client";

import { AlertTriangle, CalendarRange, Check, ChevronDown, History, Loader2, Undo2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Field, Input } from "@/components/dashboard/primitives";
import { applyCalendarChangeAction, previewCalendarChangeAction } from "@/lib/actions/calendar";
import { calendarPackageEditable, calendarPackageStatus, calendarPurchaseLabel, formatCalendarDate as formatDate } from "@/lib/admin-calendar-view";
import { canRestoreCalendarSchedule } from "@/lib/calendar-management";
import type { AdminCalendarData, CalendarChangeInput, CalendarChangePreview } from "@/lib/calendar-management-types";
import { calculateDeliveryDates, dateToInput, inputToDate } from "@/lib/package-schedule";

const buttonClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-ink/20 px-3 py-2 text-sm font-bold transition hover:bg-frost focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-50";
const controlClass = "min-w-0 w-full rounded-lg text-sm text-ink";

export function AdminCalendarDayEditor({ date, dates = [date], data, packageId, renewalPending = false, onBusyChange }: {
  date: string; dates?: string[]; data: AdminCalendarData; packageId?: string; renewalPending?: boolean; onBusyChange?: (busy: boolean) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const inFlight = useRef(false);
  const reviewRef = useRef<HTMLDivElement>(null);
  const selectedPackage = data.state.packages.find((plan) => plan.id === packageId);
  const restoreSchedule = Boolean(selectedPackage && canRestoreCalendarSchedule(selectedPackage));
  const records = data.state.manualDeliveries.filter((record) => record.treatment === "AWAITING_RENEWAL");
  const earlier = records.filter((record) => (!record.status || record.status === "DELIVERED") && record.date <= data.today);
  const [earlierIds, setEarlierIds] = useState<string[]>([]);
  function initialPeriod() {
    const plan = selectedPackage;
    const manualDates = records.filter((record) => record.sourcePackageId === plan?.id && !["DECLINED", "CANCELLED"].includes(record.status ?? "DELIVERED"))
      .map((record) => record.date).sort();
    if (renewalPending) return { start: manualDates[0] ?? date, end: manualDates.at(-1) ?? date };
    const start = plan?.startDate ?? date;
    const end = plan?.endDate ?? (plan && restoreSchedule ? dateToInput(calculateDeliveryDates(Math.max(plan.totalDeliveryDays, 1),
      inputToDate(start), data.state.deliveryWeekdays, data.state.holidays.map((holiday) => ({ startDate: inputToDate(holiday.startDate), endDate: inputToDate(holiday.endDate) }))).at(-1)!) : start);
    return { start, end };
  }
  const [period, setPeriod] = useState(initialPeriod);
  const selectionKey = `${packageId}:${renewalPending}:${dates.join(",")}`;
  const [savedReview, setReview] = useState<{ input: CalendarChangeInput; preview: CalendarChangePreview; selectionKey: string } | null>(null);
  const review = savedReview?.selectionKey === selectionKey ? savedReview : null;
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pastDates = dates.length > 0 && dates.every((value) => value <= data.today);
  const available = Boolean(selectedPackage && calendarPackageEditable(selectedPackage));

  function clearReview() { setReview(null); setError(null); setAcknowledged(false); }

  function prepare(action: CalendarChangeInput["action"], selectedDates = dates) {
    if (inFlight.current) return;
    loadPreview({
      customerId: data.state.customerId, action, date,
      ...(action === "set-dates" ? {} : { dates: selectedDates }),
      ...(renewalPending ? { sourcePackageId: selectedPackage?.id } : { packageId: selectedPackage?.id }),
      ...(action === "apply-renewal" ? { manualDeliveryIds: earlierIds } : {}),
      ...(action === "set-dates" ? { startDate: period.start, endDate: period.end } : {}),
      reason: action === "set-dates" ? "Admin updated delivery dates." : action === "apply-renewal" ? "Admin included earlier deliveries in renewal."
        : action === "set-delivered" ? "Admin confirmed delivery." : "Admin corrected a delivery as not delivered.",
      acknowledgeConflict: true,
    });
  }

  function loadPreview(input: CalendarChangeInput) {
    if (inFlight.current) return;
    inFlight.current = true;
    onBusyChange?.(true);
    clearReview();
    startTransition(async () => {
      try {
        const result = await previewCalendarChangeAction(input);
        if (result.ok) {
          setReview({ input, preview: result.data, selectionKey });
          requestAnimationFrame(() => reviewRef.current?.focus());
        } else setError(result.error);
      } catch { setError("Could not review this change. Nothing was saved. Please try again."); }
      finally { inFlight.current = false; onBusyChange?.(false); }
    });
  }

  function save() {
    if (!review || inFlight.current || (review.preview.warnings.length > 0 && !acknowledged)) return;
    inFlight.current = true;
    onBusyChange?.(true);
    setError(null);
    startTransition(async () => {
      try {
        const result = await applyCalendarChangeAction(review.input, review.preview.fingerprint);
        setReview(null);
        if (result.ok) { toast.success("Delivery calendar updated."); router.refresh(); }
        else setError(result.error);
      } catch { setReview(null); setError("Could not confirm the save. Refresh the calendar before trying again."); }
      finally { inFlight.current = false; onBusyChange?.(false); }
    });
  }

  return (
    <section className="min-w-0 border-t border-ink/10 pt-5" aria-label="Manage deliveries" aria-busy={pending}>
      <fieldset disabled={pending} className="grid min-w-0 gap-4">
        <p className="break-words text-sm font-semibold text-ink/80">{selectedPackage ? calendarPurchaseLabel(data.state.packages, selectedPackage.id) : "No purchase selected"}{renewalPending ? " / Renewal pending" : ""}</p>
        {!available ? <p role="status" className="text-sm leading-6 text-amber-900">{restoreSchedule
          ? "Payment received and ID approved. The delivery schedule needs review; past meals are not confirmed."
          : `${selectedPackage ? calendarPackageStatus(selectedPackage) : "Select a purchase"}. Calendar changes are unavailable until this purchase is paid, verified and ready to schedule.`}</p> : null}
        <div className="grid grid-cols-2 gap-2">
          <button type="button" disabled={!available || !pastDates} className={`${buttonClass} border-ink bg-ink text-white hover:bg-ink/85`} onClick={() => prepare("set-delivered")}>
            <Check size={18} className="shrink-0" aria-hidden="true" />Delivered
          </button>
          <button type="button" disabled={!available || !pastDates} className={buttonClass} onClick={() => prepare("set-not-delivered")}>
            <X size={18} className="shrink-0" aria-hidden="true" />Not delivered
          </button>
        </div>
        {!pastDates ? <p className="text-sm text-ink/75">{dates.length ? "Future deliveries are scheduled, not completed." : "No dates selected."}</p> : null}
        {selectedPackage?.status === "PAUSED" ? <p className="text-sm text-amber-900">Paused. Recorded past deliveries can be corrected; resume before rescheduling.</p> : null}
        <details className="border-t border-ink/10 pt-4" open={restoreSchedule || undefined}>
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-bold [&::-webkit-details-marker]:hidden">
            <CalendarRange size={18} aria-hidden="true" />Edit dates<ChevronDown size={16} className="ml-auto" aria-hidden="true" />
          </summary>
          <div className="mt-3 grid gap-3">
            <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <Field label="Start date"><Input type="date" required value={period.start} className={controlClass} onChange={(event) => { setPeriod({ ...period, start: event.target.value }); clearReview(); }} /></Field>
              <Field label="End date"><Input type="date" required min={period.start} value={period.end} className={controlClass} onChange={(event) => { setPeriod({ ...period, end: event.target.value }); clearReview(); }} /></Field>
            </div>
            <button type="button" disabled={(!available && !restoreSchedule) || !period.start || !period.end || period.start > period.end || selectedPackage?.status === "PAUSED" && !renewalPending} className={buttonClass} onClick={() => prepare("set-dates")}>Review dates</button>
          </div>
        </details>
        {!renewalPending && available && earlier.length > 0 ? (
          <details className="border-t border-ink/10 pt-4" aria-label="Earlier deliveries">
            <summary className="min-h-11 cursor-pointer text-sm font-bold">{earlier.length} earlier {earlier.length === 1 ? "delivery" : "deliveries"} awaiting renewal</summary>
            <div className="my-3 grid max-h-48 gap-1 overflow-y-auto">
              {earlier.map((record) => <label key={record.id} className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
                <input type="checkbox" checked={earlierIds.includes(record.id)} className="size-5 shrink-0 accent-ink" onChange={(event) => {
                  setEarlierIds((current) => event.target.checked ? [...new Set([...current, record.id])] : current.filter((value) => value !== record.id)); clearReview();
                }} /><span>{formatDate(record.date)}<span className="block break-words text-xs leading-5 text-ink/75">{record.label} / {record.quantity} tiffin{record.quantity === 1 ? "" : "s"}<br />{calendarPurchaseLabel(data.state.packages, record.sourcePackageId)}</span></span>
              </label>)}
            </div>
            <button type="button" className={`${buttonClass} w-full`} disabled={!earlierIds.length || selectedPackage?.status === "PAUSED"} onClick={() => prepare("apply-renewal", earlier.filter((record) => earlierIds.includes(record.id)).map((record) => record.date))}>Include in this purchase</button>
          </details>
        ) : null}
      </fieldset>

      {pending ? <p role="status" className="mt-4 flex items-center gap-2 text-sm font-bold"><Loader2 size={16} className="animate-spin" aria-hidden="true" />Please wait</p> : null}
      {error ? <p role="alert" className="mt-4 break-words text-sm font-bold leading-6 text-chili">{error}</p> : null}
      {review ? (
        <div ref={reviewRef} tabIndex={-1} className="mt-5 border-t border-ink/15 pt-5 focus:outline-none" aria-label="Confirm calendar change" role="region">
          <h3 className="font-extrabold">Confirm change</h3>
          <p className="mt-1 break-words text-sm font-bold">{review.input.action === "undo" ? "Customer calendar / undo last change" : `${selectedPackage?.name} / ${calendarPurchaseLabel(data.state.packages, selectedPackage?.id)}`}</p>
          <p className="mt-2 break-words text-sm leading-6">{review.preview.summary}</p>
          {review.input.action !== "set-dates" ? <p className="mt-2 text-sm text-ink/75">{(review.input.dates ?? [review.input.date]).map(formatDate).join(", ")}</p> : null}
          {review.preview.balances.map((balance) => <dl key={balance.packageId} className="mt-3 grid grid-cols-[1fr_auto] gap-x-3 gap-y-2 border-t border-ink/10 pt-3 text-sm tabular-nums">
            <dt className="col-span-2 break-words font-bold">{balance.name} / {calendarPurchaseLabel(data.state.packages, balance.packageId)}</dt>
            <dt>Delivered</dt><dd className="text-right font-bold">{balance.beforeCompleted} to {balance.afterCompleted}</dd>
            <dt>Remaining</dt><dd className="text-right font-bold">{balance.beforeRemaining} to {balance.afterRemaining}</dd>
            <dt>End date</dt><dd className="text-right font-bold">{formatDate(balance.beforeEnd)} to {formatDate(balance.afterEnd)}</dd>
            {balance.beforeTotal !== undefined ? <><dt>Delivery allowance</dt><dd className="text-right font-bold">{balance.beforeTotal} to {balance.afterTotal}</dd></> : null}
          </dl>)}
          {review.preview.warnings.length > 0 ? <div className="mt-4 text-sm leading-6 text-amber-900">
            {review.preview.warnings.map((warning) => <p key={warning} className="mb-2 flex items-start gap-2"><AlertTriangle size={17} className="mt-1 shrink-0" aria-hidden="true" /><span>{warning}</span></p>)}
            <label className="flex min-h-11 cursor-pointer items-center gap-3 font-bold"><input type="checkbox" checked={acknowledged} disabled={pending} className="size-5 shrink-0 accent-ink" onChange={(event) => setAcknowledged(event.target.checked)} />Confirm these adjustments</label>
          </div> : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" disabled={pending || (review.preview.warnings.length > 0 && !acknowledged)} onClick={save} className={`${buttonClass} flex-1 border-ink bg-ink text-white hover:bg-ink/85`}><Check size={17} aria-hidden="true" />Confirm</button>
            <button type="button" disabled={pending} onClick={clearReview} className={buttonClass}>Cancel</button>
          </div>
        </div>
      ) : null}
      <details className="mt-5 border-t border-ink/10 pt-3">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-bold [&::-webkit-details-marker]:hidden"><History size={17} aria-hidden="true" />Customer activity<ChevronDown size={16} className="ml-auto" aria-hidden="true" /></summary>
        {data.history.length ? <ol className="divide-y divide-ink/10">{data.history.map((change) => <li key={change.id} className="py-3 text-sm leading-6">
          <p>{change.summary}</p><p className="text-xs text-ink/70">{change.actor} / {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Los_Angeles" }).format(new Date(change.createdAt))} Pacific</p>
          {change.canUndo ? <button type="button" disabled={pending} className={`${buttonClass} mt-2`} onClick={() => loadPreview({ customerId: data.state.customerId, action: "undo", date, changeId: change.id, reason: "Admin undid the previous calendar change." })}><Undo2 size={16} aria-hidden="true" />Undo</button> : null}
        </li>)}</ol> : <p className="py-3 text-sm text-ink/70">No manual changes yet.</p>}
      </details>
    </section>
  );
}
