"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { Card } from "@/components/dashboard/primitives";
import type { CalendarEvent, CalendarEventType, CustomerCalendarData } from "@/lib/types";
import { cn } from "@/lib/utils";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const EVENT_STYLES: Record<CalendarEventType, { dot: string; chip: string; label: string }> = {
  delivery: { dot: "bg-saffron", chip: "bg-rose text-masala", label: "Delivery scheduled" },
  delivered: { dot: "bg-leaf", chip: "bg-mint text-leaf", label: "Delivered" },
  pause: { dot: "bg-amber-400", chip: "bg-amber-50 text-amber-700", label: "Paused" },
  "package-start": { dot: "bg-ink", chip: "bg-ink text-white", label: "Package starts" },
  "package-end": { dot: "bg-masala", chip: "bg-rose text-masala", label: "Package ends" },
};

function toDateKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function DashboardCalendar({ data }: { data: CustomerCalendarData }) {
  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);
  const [monthCursor, setMonthCursor] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selectedKey, setSelectedKey] = useState(() => toDateKey(today));

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

  return (
    <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-display text-2xl font-black tracking-tight">{monthLabel}</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1))}
              aria-label="Previous month"
              className="grid size-10 place-items-center rounded-xl border border-ink/10 text-ink/60 transition hover:border-saffron/50 hover:text-ink"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => {
                setMonthCursor(new Date(today.getFullYear(), today.getMonth(), 1));
                setSelectedKey(toDateKey(today));
              }}
              className="h-10 rounded-xl border border-ink/10 px-4 text-sm font-extrabold text-ink/70 transition hover:border-saffron/50 hover:text-ink"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1))}
              aria-label="Next month"
              className="grid size-10 place-items-center rounded-xl border border-ink/10 text-ink/60 transition hover:border-saffron/50 hover:text-ink"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-7 gap-1.5">
          {WEEKDAY_LABELS.map((label) => (
            <p key={label} className="pb-2 text-center text-[11px] font-black uppercase tracking-[0.12em] text-ink/40">
              {label}
            </p>
          ))}
          {cells.map((cell, index) => {
            if (!cell) return <span key={`blank-${index}`} />;

            const events = eventsByDay.get(cell.key) ?? [];
            const isToday = cell.key === toDateKey(today);
            const isSelected = cell.key === selectedKey;
            const isOffDay = !data.deliveryWeekdays.includes(cell.date.getDay());
            const hasPause = events.some((event) => event.type === "pause");
            const uniqueTypes = Array.from(new Set(events.map((event) => event.type))).slice(0, 3);

            return (
              <button
                key={cell.key}
                type="button"
                onClick={() => setSelectedKey(cell.key)}
                className={cn(
                  "relative grid aspect-square place-items-center rounded-xl border text-sm font-extrabold transition",
                  isSelected
                    ? "border-saffron bg-saffron text-white shadow-[0_10px_24px_rgba(255,122,26,0.35)]"
                    : hasPause
                      ? "border-amber-200 bg-amber-50 text-amber-800 hover:border-amber-300"
                      : isOffDay
                        ? "border-transparent bg-frost text-ink/35 hover:border-ink/10"
                        : "border-ink/8 bg-white text-ink/75 hover:border-saffron/45",
                  isToday && !isSelected ? "ring-2 ring-saffron/45" : "",
                )}
              >
                {cell.date.getDate()}
                {uniqueTypes.length ? (
                  <span className="absolute bottom-1.5 flex gap-1">
                    {uniqueTypes.map((type) => (
                      <span
                        key={type}
                        className={cn(
                          "size-1.5 rounded-full",
                          isSelected ? "bg-white" : EVENT_STYLES[type].dot,
                        )}
                      />
                    ))}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 border-t border-ink/8 pt-5">
          {(Object.keys(EVENT_STYLES) as CalendarEventType[]).map((type) => (
            <span key={type} className="inline-flex items-center gap-2 text-xs font-bold text-ink/55">
              <span className={cn("size-2 rounded-full", EVENT_STYLES[type].dot)} />
              {EVENT_STYLES[type].label}
            </span>
          ))}
          <span className="inline-flex items-center gap-2 text-xs font-bold text-ink/55">
            <span className="size-2 rounded-full bg-ink/15" />
            Off day (no delivery)
          </span>
        </div>
      </Card>

      <div className="grid content-start gap-4">
        <Card className="p-6">
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-ink/40">Selected day</p>
          <p className="mt-2 font-display text-xl font-black tracking-tight">
            {new Intl.DateTimeFormat("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            }).format(selectedDate)}
          </p>
          <div className="mt-4 grid gap-2.5">
            {selectedEvents.length ? (
              selectedEvents.map((event, index) => (
                <div
                  key={`${event.date}-${index}`}
                  className={cn(
                    "flex items-start gap-3 rounded-xl px-4 py-3 text-sm font-bold",
                    EVENT_STYLES[event.type].chip,
                  )}
                >
                  <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", EVENT_STYLES[event.type].dot)} />
                  {event.label}
                </div>
              ))
            ) : (
              <div className="flex items-center gap-3 rounded-xl bg-frost px-4 py-3 text-sm font-bold text-ink/50">
                <CalendarDays size={16} />
                {selectedIsOffDay ? "Off day — no deliveries scheduled." : "Nothing scheduled on this day."}
              </div>
            )}
          </div>
        </Card>

        {data.packages.length ? (
          <Card className="p-6">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-ink/40">Plans on this calendar</p>
            <div className="mt-3 grid gap-2">
              {data.packages.map((plan, index) => (
                <div key={`${plan.name}-${index}`} className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-extrabold">{plan.name}</span>
                  <span className="rounded-full bg-frost px-3 py-1 text-xs font-black text-ink/55">{plan.status}</span>
                </div>
              ))}
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
