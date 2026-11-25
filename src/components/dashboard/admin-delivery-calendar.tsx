"use client";

import { Ban, CalendarDays, CalendarOff, CalendarRange, Check, CheckCheck, ChevronLeft, ChevronRight, CircleAlert, Clock3, Flag, Gift, Info, PackageCheck, Pause, X, type LucideIcon } from "lucide-react";
import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { AdminCalendarDayEditor } from "@/components/dashboard/admin-calendar-day-editor";
import { calendarPurchaseLabel, formatCalendarDate } from "@/lib/admin-calendar-view";
import { calendarMonthCells, calendarRangeDateEligible, MAX_CALENDAR_SELECTION, selectCalendarRange, shiftCalendarMonth, toggleCalendarDate } from "@/lib/admin-calendar-selection";
import type { AdminCalendarData } from "@/lib/calendar-management-types";
import { addDays, dateToInput, inputToDate } from "@/lib/package-schedule";
import type { CalendarEvent, CalendarEventType, CustomerCalendarData } from "@/lib/types";
import { cn } from "@/lib/utils";
import styles from "./admin-delivery-calendar.module.css";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const STATES: Record<CalendarEventType | "elapsed", { label: string; icon: LucideIcon; tone: string }> = {
  delivery: { label: "Scheduled", icon: CalendarDays, tone: "scheduled" },
  "delivery-completed": { label: "Delivered", icon: CheckCheck, tone: "delivered" },
  "delivery-missed": { label: "Not delivered", icon: CircleAlert, tone: "missed" },
  "delivery-unallocated": { label: "Delivered, awaiting renewal", icon: Clock3, tone: "pending" },
  "delivery-complimentary": { label: "Complimentary", icon: Gift, tone: "delivered" },
  "delivery-cancelled": { label: "Cancelled", icon: Ban, tone: "muted" },
  holiday: { label: "Kitchen holiday", icon: CalendarOff, tone: "holiday" },
  pause: { label: "Paused", icon: Pause, tone: "holiday" },
  "package-start": { label: "Package starts", icon: Flag, tone: "neutral" },
  "package-end": { label: "Package ends", icon: PackageCheck, tone: "neutral" },
  elapsed: { label: "Elapsed, not confirmed", icon: Clock3, tone: "elapsed" },
};
const PRIORITY: CalendarEventType[] = ["delivery-missed", "delivery-unallocated", "delivery-complimentary", "delivery-completed", "delivery", "delivery-cancelled", "holiday", "pause", "package-start", "package-end"];
const monthFormat = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
const shortDateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const dayFormat = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

function eventState(event: CalendarEvent) { return STATES[event.completion === "elapsed" ? "elapsed" : event.type]; }

export function AdminDeliveryCalendar({ data, adminData, adminPackageId, renewalPending = false, initialDate, busy = false, onBusyChange }: {
  data: CustomerCalendarData; adminData: AdminCalendarData; adminPackageId?: string;
  renewalPending?: boolean; initialDate?: string; busy?: boolean; onBusyChange?: (busy: boolean) => void;
}) {
  const initial = initialDate ?? adminData.today;
  const [month, setMonth] = useState(() => shiftCalendarMonth(initial, 0));
  const [focusedDate, setFocusedDate] = useState(initial);
  const [selectedDates, setSelectedDates] = useState<string[]>([initial]);
  const [mode, setMode] = useState<"dates" | "range">("dates");
  const [range, setRange] = useState({ from: "", to: "" });
  const [anchor, setAnchor] = useState<string | null>(null);
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const monthsRef = useRef<HTMLDivElement>(null);
  const selectionContext = { data: adminData, packageId: adminPackageId, renewalPending };
  const packageInfo = data.packages[0];
  const purchase = adminData.state.packages.find((item) => item.id === adminPackageId);
  const selectedKey = selectedDates[0] ?? focusedDate;
  const nextMonth = shiftCalendarMonth(month, 1);
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of data.events) map.set(event.date, [...(map.get(event.date) ?? []), event]);
    return map;
  }, [data.events]);
  const legend = useMemo(() => {
    const items = new Map<string, (typeof STATES)[CalendarEventType]>();
    for (const event of data.events) {
      if (["package-start", "package-end"].includes(event.type)) continue;
      const state = eventState(event);
      items.set(state.label, state);
    }
    return [...items.values()];
  }, [data.events]);
  const hoverRange = anchor && hoverDate ? [anchor, hoverDate].sort() : null;

  function navigate(value: string) {
    setMonth(shiftCalendarMonth(value, 0));
    setFocusedDate(value);
    setHoverDate(null);
  }

  function applyRange(from = range.from, to = range.to) {
    if (busy) return;
    const result = selectCalendarRange(selectionContext, from, to);
    setSelectedDates(result.dates);
    setError(result.error);
    setNotice(result.excluded ? `${result.excluded} ${result.excluded === 1 ? "date excluded" : "dates excluded"} from this range.` : null);
    setAnchor(null);
    setHoverDate(null);
    if (!result.error) {
      setMode("dates");
      navigate(result.dates[0]);
    }
  }

  function clickDate(date: string) {
    if (busy) return;
    setFocusedDate(date);
    setError(null);
    setNotice(null);
    if (mode === "range") {
      if (!anchor) {
        setAnchor(date);
        setRange({ from: date, to: "" });
        setSelectedDates([]);
      } else {
        const [from, to] = [anchor, date].sort();
        setRange({ from, to });
        applyRange(from, to);
      }
    } else {
      if (selectedDates.length >= MAX_CALENDAR_SELECTION && !selectedDates.includes(date)) {
        setError(`Select up to ${MAX_CALENDAR_SELECTION} dates at a time.`);
        return;
      }
      setSelectedDates((current) => toggleCalendarDate(current, date));
    }
  }

  function editRange(field: "from" | "to", value: string) {
    setRange((current) => ({ ...current, [field]: value }));
    setSelectedDates([]);
    setAnchor(null);
    setHoverDate(null);
    setNotice(null);
    setError(null);
  }

  function dayKeyDown(event: KeyboardEvent<HTMLButtonElement>, date: string) {
    const offsets: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    let target: string;
    if (event.key in offsets) target = dateToInput(addDays(inputToDate(date), offsets[event.key]));
    else if (event.key === "Home" || event.key === "End") target = dateToInput(addDays(inputToDate(date), (event.key === "End" ? 6 : 0) - inputToDate(date).getUTCDay()));
    else return;
    event.preventDefault();
    setFocusedDate(target);
    const button = monthsRef.current?.querySelector<HTMLButtonElement>(`[data-date="${target}"]`);
    if (!button || !button.getClientRects().length) setMonth(shiftCalendarMonth(target, 0));
    requestAnimationFrame(() => monthsRef.current?.querySelector<HTMLButtonElement>(`[data-date="${target}"]`)?.focus());
  }

  return <section className={styles.root} aria-label="Delivery calendar" aria-busy={busy}>
    <div className={styles.layout}>
      <div className={styles.calendar}>
        <header className={styles.header}>
          <div>
            <h2>Delivery calendar</h2>
            <p>{renewalPending ? "Without renewal" : purchase?.name} {purchase ? <span className={styles.reference}>{calendarPurchaseLabel(adminData.state.packages, adminPackageId)}</span> : null}</p>
          </div>
          <div className={styles.navigation}>
            <button type="button" disabled={busy} title="Previous month" aria-label="Previous month" onClick={() => navigate(shiftCalendarMonth(month, -1))}><ChevronLeft size={18} /></button>
            <button type="button" disabled={busy} className={styles.todayButton} onClick={() => navigate(adminData.today)}>Today</button>
            <button type="button" disabled={busy} title="Next month" aria-label="Next month" onClick={() => navigate(nextMonth)}><ChevronRight size={18} /></button>
          </div>
        </header>

        <div className={styles.toolbar}>
          <div className={styles.modes} role="group" aria-label="Date selection mode">
            <button type="button" aria-pressed={mode === "dates"} disabled={busy} onClick={() => { setMode("dates"); setAnchor(null); setHoverDate(null); }}><Check size={16} />Dates</button>
            <button type="button" aria-pressed={mode === "range"} disabled={busy} onClick={() => { setMode("range"); setAnchor(null); setSelectedDates([]); setError(null); setNotice(null); }}><CalendarRange size={16} />Date range</button>
          </div>
          <div className={styles.selectionCount}>
            <span role="status">{anchor ? "Choose range end" : `${selectedDates.length} selected`}</span>
            <button type="button" disabled={busy || !selectedDates.length && !anchor && !range.from && !range.to} title="Clear selection" aria-label="Clear selection" onClick={() => { setSelectedDates([]); setRange({ from: "", to: "" }); setAnchor(null); setHoverDate(null); setError(null); setNotice(null); }}><X size={16} /></button>
          </div>
        </div>

        {mode === "range" ? <form className={styles.rangeForm} onSubmit={(event) => { event.preventDefault(); applyRange(); }}>
          <label>From<input type="date" required disabled={busy} value={range.from} max="9999-12-31" onChange={(event) => editRange("from", event.target.value)} /></label>
          <label>To<input type="date" required disabled={busy} value={range.to} min={range.from || undefined} max="9999-12-31" onChange={(event) => editRange("to", event.target.value)} /></label>
          <button type="submit" disabled={busy || !range.from || !range.to}><Check size={16} />Select range</button>
        </form> : null}
        {error ? <p className={styles.error} role="alert"><CircleAlert size={16} />{error}</p> : null}
        {notice ? <p className={styles.notice} role="status">{notice}<span className={styles.hint} tabIndex={0} aria-label="Ranges exclude future dates, off days, kitchen holidays, pauses, protected dates and dates outside this purchase."><Info size={15} /><span role="tooltip">Future dates, off days, holidays, pauses, protected dates and dates outside this purchase are excluded.</span></span></p> : null}

        <div className={styles.monthContainer}>
          <div ref={monthsRef} className={styles.months} key={month} onMouseLeave={() => setHoverDate(null)}>
            {[month, nextMonth].map((value, monthIndex) => <div key={value} className={cn(styles.month, monthIndex === 1 && styles.secondMonth)} role="group" aria-label={monthFormat.format(inputToDate(value))}>
              <h3>{monthFormat.format(inputToDate(value))}</h3>
              <div className={styles.days}>
                {WEEKDAYS.map((day) => <span className={styles.weekday} key={day}>{day}</span>)}
                {calendarMonthCells(value).map((date, index) => {
                  if (!date) return <span key={`empty-${index}`} className={styles.blank} aria-hidden="true" />;
                  const events = eventsByDay.get(date) ?? [];
                  const primary = PRIORITY.map((type) => events.find((event) => event.type === type)).find(Boolean);
                  const state = primary ? eventState(primary) : null;
                  const offDay = !data.deliveryWeekdays.includes(inputToDate(date).getUTCDay());
                  const selected = selectedDates.includes(date);
                  const preview = Boolean(hoverRange && date >= hoverRange[0] && date <= hoverRange[1] && calendarRangeDateEligible(selectionContext, date));
                  const label = events.length ? events.map((event) => eventState(event).label).join(", ") : offDay ? "Off day" : "No delivery scheduled";
                  return <button type="button" key={date} data-date={date} data-tone={state?.tone ?? (offDay ? "off" : "neutral")} disabled={busy}
                    className={cn(styles.day, selected && styles.selected, preview && styles.rangePreview, anchor === date && styles.anchor)}
                    aria-label={`${date}: ${label}`} aria-pressed={selected} aria-current={date === adminData.today ? "date" : undefined}
                    title={`${formatCalendarDate(date)}: ${label}`} tabIndex={date === focusedDate ? 0 : -1}
                    onClick={() => clickDate(date)} onKeyDown={(event) => dayKeyDown(event, date)}
                    onFocus={() => { setFocusedDate(date); if (anchor) setHoverDate(date); }} onMouseEnter={() => { if (anchor) setHoverDate(date); }}>
                    <span className={styles.dayNumber}>{inputToDate(date).getUTCDate()}</span>
                    <span className={styles.dayMarker} aria-hidden="true">{state ? <state.icon size={13} /> : offDay ? <span className={styles.offMark} /> : null}</span>
                    {selected ? <Check size={11} className={styles.selectedMark} aria-hidden="true" /> : null}
                  </button>;
                })}
              </div>
            </div>)}
          </div>
        </div>

        <footer className={styles.calendarFooter}>
          <div className={styles.legend}>{legend.map((state) => <span key={state.label} data-tone={state.tone}><state.icon size={14} />{state.label}</span>)}<span><span className={styles.offMark} />Off day</span></div>
          {packageInfo && !renewalPending ? <p className={styles.balance}><span><strong>{packageInfo.completedDays}</strong> delivered</span><span><strong>{packageInfo.remainingDays}</strong> remaining</span>{purchase?.startDate ? <span className={styles.period}>{shortDateFormat.format(inputToDate(purchase.startDate))}{purchase.endDate ? ` - ${shortDateFormat.format(inputToDate(purchase.endDate))}` : ""}</span> : null}</p> : null}
        </footer>
      </div>

      <aside className={styles.actions} aria-label="Selected delivery dates">
        <div className={styles.actionHeading}>
          <span className={styles.actionIcon}><CalendarDays size={20} /></span>
          <div><h3>{selectedDates.length === 1 ? dayFormat.format(inputToDate(selectedKey)) : `${selectedDates.length} dates selected`}</h3>
            {selectedDates.length > 1 ? <p>{formatCalendarDate(selectedDates[0])} - {formatCalendarDate(selectedDates.at(-1)!)}</p> : <p>{renewalPending ? "Renewal pending" : purchase?.name}</p>}
          </div>
        </div>
        {selectedDates.length === 1 ? <div className={styles.dayDetails}>{(eventsByDay.get(selectedKey) ?? []).map((event, index) => {
          const state = eventState(event);
          return <p key={index} data-tone={state.tone}><state.icon size={16} /><span>{state.label}{event.type === "holiday" || event.type === "pause" ? <small>{event.label}</small> : null}</span></p>;
        })}</div> : null}
        <AdminCalendarDayEditor key={`${data.customerId}-${adminData.state.revision}-${adminPackageId}-${renewalPending}`}
          date={selectedKey} dates={selectedDates} data={adminData} packageId={adminPackageId} renewalPending={renewalPending} onBusyChange={onBusyChange} />
      </aside>
    </div>
  </section>;
}
