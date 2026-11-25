import { calendarPackageEditable } from "@/lib/admin-calendar-view";
import type { AdminCalendarData } from "@/lib/calendar-management-types";
import { addDays, dateToInput, inputToDate } from "@/lib/package-schedule";

export const MAX_CALENDAR_SELECTION = 62;
const INACTIVE_DAYS = ["CANCELLED", "PAUSED", "PENDING_PAYMENT"];

export type CalendarSelectionContext = {
  data: AdminCalendarData;
  packageId?: string;
  renewalPending?: boolean;
};

export function calendarRangeDateEligible(context: CalendarSelectionContext, date: string) {
  const { data, packageId, renewalPending } = context;
  const { state, today } = data;
  const item = state.packages.find((plan) => plan.id === packageId);
  if (date > today || (packageId && !item) || (!renewalPending && (!item || !calendarPackageEditable(item)))) return false;
  const value = inputToDate(date);
  if (!state.deliveryWeekdays.includes(value.getUTCDay())) return false;
  if (state.holidays.some((range) => date >= range.startDate && date <= range.endDate)) return false;
  if (!item) return Boolean(renewalPending);
  if (item.pauses.some((range) => ["ACTIVE", "APPROVED", "ENDED"].includes(range.status)
    && date >= range.startDate && date <= range.endDate)) return false;
  const days = item.days.filter((day) => day.date === date && !INACTIVE_DAYS.includes(day.status));
  if (days.some((day) => item.protectedDayIds.includes(day.id))) return false;

  if (renewalPending) {
    if (days.some((day) => day.status !== "DECLINED")) return false;
    const recorded = state.manualDeliveries.some((record) => record.sourcePackageId === item.id
      && record.date === date && record.treatment === "AWAITING_RENEWAL" && record.status !== "CANCELLED");
    return recorded || !item.endDate || date > item.endDate || !calendarPackageEditable(item);
  }

  if (item.startDate && date < item.startDate || item.endDate && date > item.endDate) return false;
  // A range selects recorded dates only; it must not silently create paid deliveries.
  return days.length === 1;
}

export function selectCalendarRange(context: CalendarSelectionContext, from: string, to: string): {
  dates: string[]; excluded: number; error: string | null;
} {
  const fail = (error: string) => ({ dates: [], excluded: 0, error });
  let start: Date;
  let end: Date;
  try { start = inputToDate(from); end = inputToDate(to); }
  catch { return fail("Enter a valid From and To date."); }
  if (from > to) return fail("To must be on or after From.");
  if ((end.getTime() - start.getTime()) / 86400000 >= 366) return fail("Choose a range of no more than one year.");
  const dates: string[] = [];
  let excluded = 0;
  for (let cursor = start; cursor <= end; cursor = addDays(cursor, 1)) {
    const date = dateToInput(cursor);
    if (calendarRangeDateEligible(context, date)) dates.push(date);
    else excluded++;
    if (dates.length > MAX_CALENDAR_SELECTION) return fail(`Select up to ${MAX_CALENDAR_SELECTION} delivery dates at a time.`);
  }
  return { dates, excluded, error: dates.length ? null : "No eligible delivery dates in this range. Check the package dates and schedule status." };
}

export function toggleCalendarDate(dates: string[], date: string) {
  if (dates.includes(date)) return dates.filter((value) => value !== date);
  return dates.length < MAX_CALENDAR_SELECTION ? [...dates, date].sort() : dates;
}

export function calendarMonthCells(month: string): Array<string | null> {
  const first = inputToDate(`${month.slice(0, 7)}-01`);
  return Array.from({ length: 42 }, (_, index) => {
    const value = addDays(first, index - first.getUTCDay());
    return value.getUTCMonth() === first.getUTCMonth() ? dateToInput(value) : null;
  });
}

export function shiftCalendarMonth(month: string, offset: number) {
  const value = inputToDate(`${month.slice(0, 7)}-01`);
  value.setUTCMonth(value.getUTCMonth() + offset);
  return dateToInput(value);
}
