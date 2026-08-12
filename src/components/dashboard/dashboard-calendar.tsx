"use client";

import { CalendarDays, ChevronLeft, ChevronRight, Pause, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Card } from "@/components/dashboard/primitives";
import type { CalendarEvent, CalendarEventType, CustomerCalendarData } from "@/lib/types";
import { cn } from "@/lib/utils";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const EVENT_CHIPS: Record<CalendarEventType, string> = {
  delivery: "bg-rose text-masala",
  pause: "bg-amber-50 text-amber-700",
  "package-start": "bg-basil-soft text-basil",
  "package-end": "bg-chili-soft text-chili",
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
  const activePlan = data.packages.find((plan) => plan.status === "Active") ?? data.packages[0];

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

        {activePlan?.status === "Paused" ? (
          <p className="mt-3 rounded-xl bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-800">
            {activePlan.name} · Paused — {activePlan.remainingDays} delivery{" "}
            {activePlan.remainingDays === 1 ? "day" : "days"} saved
            {activePlan.resumeBy ? ` · Resume by ${activePlan.resumeBy}` : ""}
          </p>
        ) : activePlan?.startDate ? (
          <p className="mt-3 rounded-xl bg-frost px-4 py-2.5 text-sm font-bold text-ink/65">
            {activePlan.name} · Starts <span className="text-basil">{activePlan.startDate}</span>
            {activePlan.endDate ? (
              <>
                {" "}· Ends <span className="text-chili">{activePlan.endDate}</span>
              </>
            ) : null}
            {" "}· {activePlan.remainingDays} delivery {activePlan.remainingDays === 1 ? "day" : "days"} left
          </p>
        ) : null}

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
            const isStart = events.some((event) => event.type === "package-start");
            const isEnd = events.some((event) => event.type === "package-end");
            const hasPause = events.some((event) => event.type === "pause");
            const hasDelivery = events.some((event) => event.type === "delivery");

            // Fill colors carry meaning: green start, red end, saffron delivery,
            // amber pause, faded red cross for off days.
            const fill = isStart
              ? "border-basil bg-basil text-white"
              : isEnd
                ? "border-chili bg-chili text-white"
                : hasPause
                  ? "border-amber-200 bg-amber-100 text-amber-800"
                  : hasDelivery
                    ? "border-saffron bg-saffron text-white"
                    : isOffDay
                      ? "border-transparent bg-chili-soft/60 text-chili/45"
                      : "border-ink/8 bg-white text-ink/75 hover:border-saffron/45";

            return (
              <button
                key={cell.key}
                type="button"
                onClick={() => setSelectedKey(cell.key)}
                className={cn(
                  "relative grid aspect-square place-items-center rounded-xl border text-sm font-extrabold transition",
                  fill,
                  isSelected ? "ring-2 ring-ink ring-offset-2" : "",
                  isToday && !isSelected ? "ring-2 ring-saffron/45 ring-offset-1" : "",
                )}
              >
                {cell.date.getDate()}
                {isOffDay && !isStart && !isEnd && !hasDelivery && !hasPause ? (
                  <X size={11} className="absolute bottom-1.5 text-chili/50" strokeWidth={3} />
                ) : null}
                {hasPause ? (
                  <Pause size={11} className="absolute bottom-1.5 text-amber-700" strokeWidth={3} />
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 border-t border-ink/8 pt-5">
          {[
            { swatch: "bg-basil", label: "Package starts" },
            { swatch: "bg-chili", label: "Package ends" },
            { swatch: "bg-saffron", label: "Delivery day" },
            { swatch: "bg-amber-300", label: "Paused" },
            { swatch: "bg-chili-soft border border-chili/30", label: "Off day (no delivery)" },
          ].map((item) => (
            <span key={item.label} className="inline-flex items-center gap-2 text-xs font-bold text-ink/55">
              <span className={cn("size-2.5 rounded-full", item.swatch)} />
              {item.label}
            </span>
          ))}
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
                    "rounded-xl px-4 py-3 text-sm font-bold",
                    EVENT_CHIPS[event.type],
                  )}
                >
                  {event.label}
                </div>
              ))
            ) : (
              <div className="flex items-center gap-3 rounded-xl bg-frost px-4 py-3 text-sm font-bold text-ink/50">
                <CalendarDays size={16} />
                {selectedIsOffDay ? "Off day — no deliveries." : "Nothing scheduled on this day."}
              </div>
            )}
          </div>
        </Card>

        {data.packages.length ? (
          <Card className="p-6">
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
                </div>
              ))}
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
