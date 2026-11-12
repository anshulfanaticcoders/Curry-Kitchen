"use client";

import { Ban, CalendarDays, CalendarOff, Check, CheckSquare, ChevronLeft, ChevronRight, CircleAlert, Clock3, Flag, Gift, PackageCheck, Pause, X, type LucideIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { AdminCalendarDayEditor } from "@/components/dashboard/admin-calendar-day-editor";
import { Card } from "@/components/dashboard/primitives";
import type { AdminCalendarData } from "@/lib/calendar-management-types";
import { businessDateInput } from "@/lib/package-schedule";
import type { CalendarEvent, CalendarEventType, CustomerCalendarData } from "@/lib/types";
import { cn } from "@/lib/utils";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const EVENT_STYLES: Record<CalendarEventType, { label: string; chip: string; fill: string; icon: LucideIcon }> = {
  delivery: { label: "Scheduled", chip: "bg-saffron/15 text-masala", fill: "border-saffron bg-saffron/20 text-masala", icon: CalendarDays },
  "delivery-completed": { label: "Delivered", chip: "bg-leaf/10 text-leaf", fill: "border-leaf bg-leaf text-white", icon: Check },
  "delivery-missed": { label: "Not delivered", chip: "bg-red-100 text-red-800", fill: "border-red-300 bg-red-100 text-red-800", icon: CircleAlert },
  "delivery-unallocated": { label: "Delivered / renewal pending", chip: "bg-sky-100 text-sky-800", fill: "border-sky-300 bg-sky-100 text-sky-800", icon: Clock3 },
  "delivery-complimentary": { label: "Complimentary", chip: "bg-teal-100 text-teal-800", fill: "border-teal-300 bg-teal-100 text-teal-800", icon: Gift },
  "delivery-cancelled": { label: "Cancelled / voided", chip: "bg-zinc-100 text-zinc-600", fill: "border-zinc-300 bg-zinc-100 text-zinc-600", icon: Ban },
  pause: { label: "Paused", chip: "bg-amber-50 text-amber-800", fill: "border-amber-200 bg-amber-100 text-amber-800", icon: Pause },
  holiday: { label: "Kitchen holiday", chip: "bg-rose text-masala", fill: "border-masala/30 bg-rose text-masala", icon: CalendarOff },
  "package-start": { label: "Package starts", chip: "bg-basil-soft text-basil", fill: "border-basil bg-basil text-white", icon: Flag },
  "package-end": { label: "Package ends", chip: "bg-chili-soft text-chili", fill: "border-chili bg-chili text-white", icon: PackageCheck },
};

const EVENT_PRIORITY: CalendarEventType[] = [
  "delivery-missed", "delivery-unallocated", "delivery-complimentary", "delivery-completed",
  "delivery", "delivery-cancelled", "holiday", "pause", "package-start", "package-end",
];

function toDateKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function DashboardCalendar({ data, adminData, adminPackageId, renewalPending = false, initialDate, busy = false, onBusyChange }: {
  data: CustomerCalendarData; adminData?: AdminCalendarData; adminPackageId?: string; renewalPending?: boolean;
  initialDate?: string; busy?: boolean; onBusyChange?: (busy: boolean) => void;
}) {
  const todayKey = adminData?.today ?? businessDateInput();
  const today = new Date(`${initialDate ?? todayKey}T00:00:00`);
  const [monthCursor, setMonthCursor] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selectedKey, setSelectedKey] = useState(initialDate ?? todayKey);
  const [multiple, setMultiple] = useState(false);
  const [selectedDates, setSelectedDates] = useState<string[]>([initialDate ?? todayKey]);
  const editingDates = multiple ? selectedDates : [selectedKey];

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of data.events) {
      const bucket = map.get(event.date) ?? [];
      bucket.push(event);
      map.set(event.date, bucket);
    }
    return map;
  }, [data.events]);

  const monthLabel = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(monthCursor);

  const cells = useMemo(() => {
    const year = monthCursor.getFullYear();
    const month = monthCursor.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const result: Array<{ key: string; date: Date } | null> = [];

    for (let blank = 0; blank < firstWeekday; blank += 1) result.push(null);
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(year, month, day);
      result.push({ key: toDateKey(date), date });
    }
    return result;
  }, [monthCursor]);

  const selectedEvents = eventsByDay.get(selectedKey) ?? [];
  const selectedDate = new Date(`${selectedKey}T00:00:00`);
  const selectedIsOffDay =
    !data.deliveryWeekdays.includes(selectedDate.getDay()) && selectedEvents.length === 0;
  const activePlan = data.packages.find((plan) => plan.status === "Active") ?? data.packages[0];
  function moveMonth(offset: number) {
    const next = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + offset, 1);
    setMonthCursor(next);
    if (adminData) {
      const key = toDateKey(next);
      setSelectedKey(key);
      setSelectedDates([key]);
    }
  }

  return (
    <div className="grid items-start gap-4 md:gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <Card className="min-w-0 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-display text-2xl font-black">{monthLabel}</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => moveMonth(-1)}
              aria-label="Previous month"
              title="Previous month"
              className="grid size-11 place-items-center rounded-lg border border-ink/10 text-ink/70 transition hover:border-saffron/50 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                const currentKey = todayKey;
                const currentDate = new Date(`${currentKey}T00:00:00`);
                setMonthCursor(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1));
                setSelectedKey(currentKey);
                setSelectedDates([currentKey]);
              }}
              className="min-h-11 rounded-lg border border-ink/10 px-4 text-sm font-extrabold text-ink/70 transition hover:border-saffron/50 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              Today
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => moveMonth(1)}
              aria-label="Next month"
              title="Next month"
              className="grid size-11 place-items-center rounded-lg border border-ink/10 text-ink/70 transition hover:border-saffron/50 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {adminData ? <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-b border-ink/10 pb-3">
          <button type="button" disabled={busy} aria-pressed={multiple} onClick={() => { setMultiple(!multiple); setSelectedDates([selectedKey]); }}
            className={cn("inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2", multiple ? "border-ink bg-ink text-white" : "border-ink/15 text-ink hover:bg-frost")}>
            <CheckSquare size={17} aria-hidden="true" />Select dates
          </button>
          {multiple ? <span className="text-sm font-bold text-ink/75" aria-live="polite">{selectedDates.length} selected</span> : null}
        </div> : null}

        {renewalPending ? <p className="mt-3 rounded-lg bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-900">Renewal pending / {activePlan?.name}</p> : activePlan?.status === "Paused" ? (
          <p className="mt-3 rounded-xl bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-800">
            {activePlan.name} · Paused — {activePlan.remainingDays} delivery{" "}
            {activePlan.remainingDays === 1 ? "day" : "days"} saved
            {activePlan.resumeBy ? ` · Resume by ${activePlan.resumeBy}` : ""}
          </p>
        ) : activePlan?.startDate && (!adminData || ["Active", "Ended"].includes(activePlan.status)) ? (
          <p className="mt-3 rounded-xl bg-frost px-4 py-2.5 text-sm font-bold text-ink/65">
            {activePlan.name} · Starts <span className="text-basil">{activePlan.startDate}</span>
            {activePlan.endDate ? (
              <>
                {" "}· Ends <span className="text-chili">{activePlan.endDate}</span>
              </>
            ) : null}
            {" "}· <span className="text-basil">{activePlan.completedDays} delivered</span>
            {" "}· {activePlan.remainingDays} delivery {activePlan.remainingDays === 1 ? "day" : "days"} left
          </p>
        ) : null}

        <div className="-mx-1 mt-5 overflow-x-auto p-1 sm:mt-6">
        <div className="grid min-w-0 grid-cols-7 gap-1 sm:gap-1.5">
          {WEEKDAY_LABELS.map((label) => (
            <p key={label} className="pb-2 text-center text-[11px] font-black uppercase text-ink/65">
              {label}
            </p>
          ))}
          {cells.map((cell, index) => {
            if (!cell) return <span key={`blank-${index}`} />;

            const events = eventsByDay.get(cell.key) ?? [];
            const isToday = cell.key === todayKey;
            const isSelected = multiple && adminData ? selectedDates.includes(cell.key) : cell.key === selectedKey;
            const isOffDay = !data.deliveryWeekdays.includes(cell.date.getDay());
            const primaryType = EVENT_PRIORITY.find((type) => events.some((event) => event.type === type));
            const style = primaryType ? EVENT_STYLES[primaryType] : undefined;
            const Marker = style?.icon ?? (isOffDay ? X : null);
            const fill = style?.fill ?? (isOffDay
              ? "border-transparent bg-chili-soft/60 text-chili/70"
              : "border-ink/8 bg-white text-ink/75 hover:border-saffron/45");

            return (
              <button
                key={cell.key}
                type="button"
                disabled={busy}
                onClick={() => {
                  setSelectedKey(cell.key);
                  if (multiple && adminData) setSelectedDates((current) => current.includes(cell.key) ? current.filter((date) => date !== cell.key) : [...current, cell.key].sort());
                }}
                aria-pressed={isSelected}
                aria-current={isToday ? "date" : undefined}
                aria-label={`${cell.key}: ${events.length ? events.map((event) => `${EVENT_STYLES[event.type].label}: ${event.label}`).join("; ") : isOffDay ? "Off day" : "Nothing scheduled"}`}
                className={cn(
                  "grid aspect-square min-h-11 w-full min-w-0 content-center justify-items-center gap-0.5 rounded-lg border text-sm font-extrabold transition focus-visible:outline-2 focus-visible:outline-offset-2",
                  fill,
                  isSelected ? "ring-2 ring-ink ring-offset-2" : "",
                  isToday && !isSelected ? "ring-2 ring-saffron/45 ring-offset-1" : "",
                )}
              >
                <span className="leading-5">{cell.date.getDate()}</span>
                <span className="flex h-3 items-center gap-0.5 text-[10px] leading-3" aria-hidden="true">
                  {Marker ? <Marker size={11} className="shrink-0" strokeWidth={2.5} /> : null}
                  {events.filter((event) => event.type.startsWith("delivery")).length > 1 ? <span>+{events.filter((event) => event.type.startsWith("delivery")).length - 1}</span> : null}
                </span>
              </button>
            );
          })}
        </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 border-t border-ink/8 pt-5">
          {Object.entries(EVENT_STYLES).filter(([type]) => data.events.some((event) => event.type === type)).map(([type, item]) => (
            <span key={type} className="inline-flex items-center gap-2 text-xs font-bold text-ink/70">
              <span className={cn("grid size-5 place-items-center rounded border", item.fill)}><item.icon size={12} aria-hidden="true" /></span>
              {item.label}
            </span>
          ))}
          <span className="inline-flex items-center gap-2 text-xs font-bold text-ink/70"><X size={14} className="text-chili/70" aria-hidden="true" />Off day</span>
        </div>
      </Card>

      <div className="grid min-w-0 content-start gap-4">
        <Card className="min-w-0 p-4 sm:p-6">
          <h2 className="font-display text-xl font-black">
            {multiple && adminData ? `${editingDates.length} dates selected` : new Intl.DateTimeFormat("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            }).format(selectedDate)}
          </h2>
          {multiple && adminData ? <p className="mt-3 text-sm leading-6 text-ink/75">{editingDates.map((date) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`))).join(", ") || "No dates selected"}</p> : <div className="mt-4 grid gap-2.5">
            {selectedEvents.length ? (
              selectedEvents.map((event, index) => {
                const style = EVENT_STYLES[event.type];
                return (
                <div
                  key={`${event.date}-${index}`}
                  className={cn(
                    "flex min-w-0 items-start gap-2 rounded-lg px-3 py-2 text-sm",
                    style.chip,
                  )}
                >
                  <style.icon size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                  <div className="min-w-0 break-words"><p className="font-extrabold">{adminData && event.completion === "elapsed" ? "Delivery window elapsed" : style.label}</p><p className="mt-0.5">{adminData && event.completion === "elapsed" ? "Counted by the delivery schedule; not manually confirmed." : event.label}</p></div>
                </div>
              );})
            ) : (
              <div className="flex items-center gap-3 rounded-xl bg-frost px-4 py-3 text-sm font-bold text-ink/50">
                <CalendarDays size={16} />
                {selectedIsOffDay ? "Off day — no deliveries." : "Nothing scheduled on this day."}
              </div>
            )}
          </div>}
          {adminData ? (
            <div className="mt-5">
              <AdminCalendarDayEditor key={`${data.customerId}-${adminData.state.revision}-${adminPackageId}-${renewalPending}`} date={selectedKey} dates={editingDates} data={adminData}
                packageId={adminPackageId} renewalPending={renewalPending} onBusyChange={onBusyChange} />
            </div>
          ) : null}
        </Card>

        {!adminData && data.packages.length ? (
          <Card className="p-4 sm:p-6">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-ink/40">Plans on this calendar</p>
            <div className="mt-3 grid gap-3">
              {data.packages.map((plan, index) => (
                <div key={`${plan.name}-${index}`} className="grid gap-1 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-extrabold">{plan.name}</span>
                    <span className="rounded-full bg-frost px-3 py-1 text-xs font-black text-ink/55">{plan.status}</span>
                  </div>
                  {plan.startDate ? (
                    <p className="text-xs font-bold text-ink/50">
                      <span className="text-basil">{plan.startDate}</span>
                      {plan.endDate ? (
                        <>
                          {" "}→ <span className="text-chili">{plan.endDate}</span>
                        </>
                      ) : null}
                    </p>
                  ) : null}
                  <p className="text-xs font-black text-leaf">
                    {plan.completedDays} delivered · {plan.remainingDays} remaining
                  </p>
                </div>
              ))}
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
