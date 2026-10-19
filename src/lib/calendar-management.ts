import { z } from "zod";
import { addDays, businessDateInput, calculateDeliveryDates, dateToInput, inputToDate, isDeliveryDayElapsed } from "@/lib/package-schedule";
import type { CalendarBalanceChange, CalendarChangeInput, CalendarManagementState, ManagedDeliveryDay, ManagedPackage, ManualDeliveryRecord } from "@/lib/calendar-management-types";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  try { inputToDate(value); return true; } catch { return false; }
}, "Choose a valid calendar date.");
export const calendarChangeSchema = z.object({
  customerId: z.string().min(1).max(100),
  action: z.enum(["mark-delivered", "mark-missed", "reschedule", "record-delivery", "assign-delivery", "void-delivery", "undo"]),
  date: dateSchema,
  packageId: z.string().max(100).optional(), deliveryDayId: z.string().max(100).optional(), manualDeliveryId: z.string().max(100).optional(),
  targetDate: dateSchema.optional(), changeId: z.string().max(100).optional(),
  treatment: z.enum(["AWAITING_RENEWAL", "COMPLIMENTARY", "PACKAGE"]).optional(),
  label: z.string().trim().max(150).optional(), quantity: z.number().int().min(1).max(50).optional(),
  reason: z.string().trim().min(5, "Add a reason of at least 5 characters.").max(500),
  acknowledgeConflict: z.boolean().optional(),
});

export function isCountableCalendarDay(day: { status: string }) {
  return !["CANCELLED", "PAUSED", "DECLINED", "PENDING_PAYMENT"].includes(day.status);
}
export function calendarDayElapsed(day: ManagedDeliveryDay, now: Date) {
  return isDeliveryDayElapsed({ ...day, deliveryDate: inputToDate(day.date) }, now);
}
export function calendarCompletedDays(item: ManagedPackage, now: Date) {
  return Math.max(item.usedDeliveryDays, (item.unrepresentedUsedDays ?? 0) + item.days.filter((day) => calendarDayElapsed(day, now)).length);
}
// Database JSON values are semantic objects; their key ordering is not stable.
export function stableCalendarJson(value: unknown): string {
  return JSON.stringify(value, (_key, item: unknown) => {
    if (item && typeof item === "object" && !Array.isArray(item)) {
      return Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b)));
    }
    return item;
  });
}
export function calendarBalances(before: CalendarManagementState, after: CalendarManagementState, now: Date): CalendarBalanceChange[] {
  return after.packages.flatMap((item) => {
    const old = before.packages.find((entry) => entry.id === item.id)!;
    if (stableCalendarJson(old) === stableCalendarJson(item)) return [];
    const beforeCompleted = calendarCompletedDays(old, now);
    const afterCompleted = calendarCompletedDays(item, now);
    return [{ packageId: item.id, name: item.name, beforeCompleted, afterCompleted,
      beforeRemaining: Math.max(old.totalDeliveryDays - beforeCompleted, 0),
      afterRemaining: Math.max(item.totalDeliveryDays - afterCompleted, 0), beforeEnd: old.endDate, afterEnd: item.endDate }];
  });
}

function packageFor(state: CalendarManagementState, id?: string) {
  const item = state.packages.find((entry) => entry.id === id);
  if (!item) throw new Error("Choose one of this customer's packages.");
  if (!item.paid || !["ACTIVE", "EXPIRED", "PAUSED"].includes(item.status)) {
    throw new Error("Choose a paid, verified package. Unpaid deliveries can be recorded as awaiting renewal.");
  }
  return item;
}
function dayFor(item: ManagedPackage, id: string | undefined, date: string) {
  const day = item.days.find((entry) => entry.id === id && entry.date === date);
  if (!day) throw new Error("This delivery has changed. Refresh the calendar and select it again.");
  return day;
}
function recordFor(state: CalendarManagementState, id: string | undefined, date: string) {
  const record = state.manualDeliveries.find((entry) => entry.id === id && entry.date === date && entry.treatment !== "VOIDED");
  if (!record) throw new Error("This manual delivery is no longer available. Refresh the calendar.");
  return record;
}
function assertEditableDay(item: ManagedPackage, day: ManagedDeliveryDay) {
  if (item.protectedDayIds.includes(day.id)) {
    throw new Error("This delivery belongs to a holiday or scheduled-pause adjustment. Resolve that adjustment before editing this date.");
  }
}
function conflicts(state: CalendarManagementState, date: string, item?: ManagedPackage) {
  const messages: string[] = [];
  if (!state.deliveryWeekdays.includes(inputToDate(date).getUTCDay())) messages.push(`${date} is outside the normal delivery weekdays.`);
  for (const holiday of state.holidays) {
    if (holiday.startDate <= date && date <= holiday.endDate) messages.push(`${date} is a kitchen holiday: ${holiday.name}.`);
  }
  if (item?.pauses.some((pause) => ["ACTIVE", "APPROVED", "ENDED"].includes(pause.status) && pause.startDate <= date && date <= pause.endDate)) {
    messages.push(`${date} is within this package's pause period.`);
  }
  return messages;
}
function futureDateAllowed(state: CalendarManagementState, item: ManagedPackage, date: string, now: Date, exceptId?: string) {
  if (date <= businessDateInput(now)) throw new Error("Choose an upcoming delivery date after today.");
  const warnings = conflicts(state, date, item);
  if (warnings.length) throw new Error(`${warnings.join(" ")} Choose an available delivery day.`);
  if (item.days.some((day) => day.id !== exceptId && day.date === date && isCountableCalendarDay(day))) {
    throw new Error("This package already has a delivery on that date.");
  }
}
function addMakeup(state: CalendarManagementState, item: ManagedPackage, original: ManagedDeliveryDay, now: Date) {
  if (item.status === "PAUSED") return;
  const afterDate = [businessDateInput(now), ...item.days.filter(isCountableCalendarDay).map((day) => day.date)].sort().at(-1)!;
  const ranges = [...state.holidays, ...item.pauses.filter((pause) => ["ACTIVE", "APPROVED"].includes(pause.status))]
    .map((range) => ({ startDate: inputToDate(range.startDate), endDate: inputToDate(range.endDate) }));
  const [date] = calculateDeliveryDates(1, addDays(inputToDate(afterDate), 1), state.deliveryWeekdays, ranges);
  if (!date) throw new Error("No make-up delivery date is available. Check delivery settings.");
  item.days.push({ id: "new:makeup", date: dateToInput(date), status: "PREPARING", menuSummary: original.menuSummary, deliveryWindow: state.deliveryWindow });
  if (item.status === "EXPIRED") item.status = "ACTIVE";
}
function markMissed(state: CalendarManagementState, item: ManagedPackage, day: ManagedDeliveryDay, now: Date) {
  if (!isCountableCalendarDay(day)) throw new Error("This delivery is already paused, cancelled, or marked not delivered.");
  day.status = "DECLINED";
  for (const record of state.manualDeliveries.filter((entry) => entry.packageDeliveryDayId === day.id)) {
    record.treatment = "VOIDED";
    record.packageDeliveryDayId = null;
  }
  addMakeup(state, item, day, now);
}
function assignRecord(state: CalendarManagementState, record: ManualDeliveryRecord, item: ManagedPackage, now: Date) {
  if (item.status === "PAUSED") throw new Error("Resume this package before assigning an earlier delivery to it.");
  if (record.quantity !== item.quantity) throw new Error(`This package covers ${item.quantity} tiffin(s) per delivery. The recorded quantity must match.`);
  if (item.days.some((day) => day.date === record.date && isCountableCalendarDay(day))) {
    throw new Error("This package already has a delivery on that date. Mark the existing delivery instead of counting it twice.");
  }
  const candidate = item.days.filter((day) => day.status === "PREPARING"
    && !calendarDayElapsed(day, now) && !item.protectedDayIds.includes(day.id)
    && !state.manualDeliveries.some((entry) => entry.packageDeliveryDayId === day.id))
    .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id))[0];
  if (!candidate || calendarCompletedDays(item, now) >= item.totalDeliveryDays) {
    throw new Error("This package has no unused, unprotected delivery day available. Choose another paid package or leave this delivery awaiting renewal.");
  }
  candidate.date = record.date;
  candidate.status = "DELIVERED";
  record.treatment = "PACKAGE";
  record.packageDeliveryDayId = candidate.id;
  if (!item.startDate || record.date < item.startDate) item.startDate = record.date;
}

export function planCalendarChange(before: CalendarManagementState, rawInput: CalendarChangeInput, now = new Date()) {
  const input = calendarChangeSchema.parse(rawInput);
  if (input.customerId !== before.customerId) throw new Error("Customer does not match this calendar.");
  if (input.action === "undo") throw new Error("Undo requires the saved change history.");
  const after = structuredClone(before);
  const warnings: string[] = [];
  const today = businessDateInput(now);
  let summary = "";

  if (["mark-delivered", "mark-missed", "record-delivery", "assign-delivery", "void-delivery"].includes(input.action) && input.date > today) {
    throw new Error("A future date cannot be recorded as delivered or missed.");
  }
  if (["mark-delivered", "mark-missed", "reschedule"].includes(input.action)) {
    const item = packageFor(after, input.packageId);
    const day = dayFor(item, input.deliveryDayId, input.date);
    if (input.action === "reschedule") assertEditableDay(item, day);
    if (input.action === "mark-delivered") {
      if (day.status === "DELIVERED") throw new Error("This delivery is already confirmed.");
      if (!isCountableCalendarDay(day)) throw new Error("This date has already been credited or cancelled. Record an extra delivery and explicitly assign an unused day instead.");
      warnings.push(...conflicts(after, day.date, item));
      day.status = "DELIVERED";
      summary = `Confirmed ${item.name} delivered on ${day.date}.`;
    } else if (input.action === "mark-missed") {
      markMissed(after, item, day, now);
      summary = `Marked ${item.name} not delivered on ${day.date}. ${item.status === "PAUSED" ? "The delivery credit stays saved until resume." : "A make-up delivery has been added."}`;
    } else {
      if (item.status === "PAUSED" || day.status !== "PREPARING" || calendarDayElapsed(day, now)) throw new Error("Only an upcoming, unstarted delivery on an active package can be rescheduled.");
      if (!input.targetDate) throw new Error("Choose a new delivery date.");
      if (day.date === input.targetDate) throw new Error("Choose a different delivery date.");
      futureDateAllowed(after, item, input.targetDate, now, day.id);
      day.date = input.targetDate;
      const firstDate = item.days.filter(isCountableCalendarDay).map((entry) => entry.date).sort()[0];
      if (firstDate && (calendarCompletedDays(item, now) === 0 || !item.startDate || firstDate < item.startDate)) item.startDate = firstDate;
      summary = `Moved ${item.name} from ${input.date} to ${input.targetDate}.`;
    }
  } else if (input.action === "record-delivery") {
    if (!input.label || !input.quantity || !input.treatment) throw new Error("Enter the meal/package name, quantity, and how this delivery should be counted.");
    if (after.manualDeliveries.some((record) => record.date === input.date && record.label.toLowerCase() === input.label!.toLowerCase()
      && record.treatment !== "VOIDED" && record.quantity === input.quantity)) {
      throw new Error("A matching delivery is already recorded for this date. Select that entry instead.");
    }
    const record: ManualDeliveryRecord = { id: "new:manual", date: input.date, label: input.label, quantity: input.quantity,
      treatment: input.treatment, packageDeliveryDayId: null };
    const item = input.treatment === "PACKAGE" ? packageFor(after, input.packageId) : undefined;
    warnings.push(...conflicts(after, input.date, item));
    if (!item && after.packages.some((plan) => plan.days.some((day) => day.date === input.date && isCountableCalendarDay(day)))) {
      warnings.push("A package delivery already exists on this date. Confirm this is a separate extra delivery.");
    }
    if (item) assignRecord(after, record, item, now);
    after.manualDeliveries.push(record);
    summary = `Recorded ${record.quantity} tiffin(s) delivered on ${input.date}: ${record.label}. ${record.treatment === "PACKAGE" ? "Counted toward the selected package." : record.treatment === "COMPLIMENTARY" ? "Complimentary; package balance unchanged." : "Awaiting renewal; no package charged."}`;
  } else if (input.action === "assign-delivery") {
    const record = recordFor(after, input.manualDeliveryId, input.date);
    if (record.packageDeliveryDayId) throw new Error("This delivery already counts toward a package.");
    if (input.treatment === "COMPLIMENTARY" || input.treatment === "AWAITING_RENEWAL") {
      if (record.treatment === input.treatment) throw new Error("This delivery already has that treatment.");
      record.treatment = input.treatment;
      summary = `${record.label} on ${record.date} is now ${input.treatment === "COMPLIMENTARY" ? "complimentary" : "awaiting renewal"}. Package balances are unchanged.`;
    } else if (input.treatment === "PACKAGE") {
      const item = packageFor(after, input.packageId);
      warnings.push(...conflicts(after, record.date, item));
      assignRecord(after, record, item, now);
      summary = `Applied the delivery on ${record.date} to ${item.name}. One unused delivery day has been consumed, not added.`;
    } else throw new Error("Choose how to count this delivery.");
  } else if (input.action === "void-delivery") {
    const record = recordFor(after, input.manualDeliveryId, input.date);
    if (record.packageDeliveryDayId) {
      const item = after.packages.find((plan) => plan.days.some((day) => day.id === record.packageDeliveryDayId));
      if (!item) throw new Error("The assigned package is missing. Refresh the calendar.");
      packageFor(after, item.id);
      markMissed(after, item, item.days.find((day) => day.id === record.packageDeliveryDayId)!, now);
    }
    record.treatment = "VOIDED";
    record.packageDeliveryDayId = null;
    summary = `Voided the manual delivery on ${record.date}. Any assigned package day is credited back; the correction remains in history.`;
  }

  // Preserve historical usage that has no individual rows, while allowing a
  // real manual correction to reduce usage. Do not blindly discard legacy data.
  for (const item of after.packages) {
    const old = before.packages.find((entry) => entry.id === item.id)!;
    if (stableCalendarJson(old) === stableCalendarJson(item)) continue;
    const legacyUsage = Math.max(old.unrepresentedUsedDays ?? 0, old.usedDeliveryDays - old.days.filter((day) => calendarDayElapsed(day, now)).length);
    item.unrepresentedUsedDays = legacyUsage;
    item.usedDeliveryDays = legacyUsage + item.days.filter((day) => calendarDayElapsed(day, now)).length;
    if (item.usedDeliveryDays > item.totalDeliveryDays && item.usedDeliveryDays > calendarCompletedDays(old, now)) {
      throw new Error("This change would exceed the package's purchased deliveries.");
    }
    if (item.status !== "PAUSED") {
      item.endDate = item.days.filter(isCountableCalendarDay).map((day) => day.date).sort().at(-1) ?? old.endDate;
      if (item.days.some((day) => isCountableCalendarDay(day) && !calendarDayElapsed(day, now))) item.status = "ACTIVE";
    }
  }
  return { after, summary, warnings: [...new Set(warnings)], balances: calendarBalances(before, after, now) };
}
