import { z } from "zod";
import { addDays, businessDateInput, calculateDeliveryDates, dateToInput, inputToDate, isDeliveryDayElapsed } from "@/lib/package-schedule";
import type { CalendarBalanceChange, CalendarChangeInput, CalendarManagementState, ManagedDeliveryDay, ManagedPackage, ManualDeliveryRecord } from "@/lib/calendar-management-types";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  try { inputToDate(value); return true; } catch { return false; }
}, "Choose a valid calendar date.");
export const calendarChangeSchema = z.object({
  customerId: z.string().min(1).max(100),
  action: z.enum(["mark-delivered", "mark-missed", "reschedule", "record-delivery", "assign-delivery", "void-delivery", "undo", "set-delivered", "set-not-delivered", "set-dates", "apply-renewal"]),
  date: dateSchema,
  packageId: z.string().max(100).optional(), deliveryDayId: z.string().max(100).optional(), manualDeliveryId: z.string().max(100).optional(),
  targetDate: dateSchema.optional(), changeId: z.string().max(100).optional(),
  treatment: z.enum(["AWAITING_RENEWAL", "COMPLIMENTARY", "PACKAGE"]).optional(),
  label: z.string().trim().max(150).optional(), quantity: z.number().int().min(1).max(50).optional(),
  reason: z.string().trim().min(5, "Add a reason of at least 5 characters.").max(500),
  acknowledgeConflict: z.boolean().optional(),
  dates: z.array(dateSchema).min(1).max(62).optional(),
  startDate: dateSchema.optional(), endDate: dateSchema.optional(), sourcePackageId: z.string().max(100).optional(),
  manualDeliveryIds: z.array(z.string().min(1).max(100)).min(1).max(62).optional(),
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
      ...(old.totalDeliveryDays !== item.totalDeliveryDays ? { beforeTotal: old.totalDeliveryDays, afterTotal: item.totalDeliveryDays } : {}),
      beforeRemaining: Math.max(old.totalDeliveryDays - beforeCompleted, 0),
      afterRemaining: Math.max(item.totalDeliveryDays - afterCompleted, 0), beforeEnd: old.endDate, afterEnd: item.endDate }];
  });
}

export function canRestoreCalendarSchedule(item: ManagedPackage) {
  return item.status === "PENDING_STUDENT_VERIFICATION" && item.paid
    && item.verificationStatus === "APPROVED" && item.orderStatus !== "CANCELLED"
    && item.orderStatus !== "DECLINED" && item.orderStatus !== "PENDING_PAYMENT"
    && item.usedDeliveryDays === 0 && !(item.unrepresentedUsedDays ?? 0)
    && !item.days.some(isCountableCalendarDay) && !item.protectedDayIds.length
    && !item.pauses.some((pause) => ["ACTIVE", "APPROVED"].includes(pause.status));
}

function packageFor(state: CalendarManagementState, id?: string, restoreSchedule = false) {
  const item = state.packages.find((entry) => entry.id === id);
  if (!item) throw new Error("Choose one of this customer's packages.");
  if (!item.paid || ["CANCELLED", "DECLINED", "PENDING_PAYMENT"].includes(item.orderStatus ?? "")
    || ["PENDING", "REJECTED"].includes(item.verificationStatus ?? "")
    || (!["ACTIVE", "EXPIRED", "PAUSED"].includes(item.status) && !(restoreSchedule && canRestoreCalendarSchedule(item)))) {
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
  let id = "new:makeup";
  for (let suffix = 2; item.days.some((day) => day.id === id); suffix++) id = `new:makeup-${suffix}`;
  item.days.push({ id, date: dateToInput(date), status: "PREPARING", menuSummary: original.menuSummary, deliveryWindow: state.deliveryWindow,
    ...(original.requiresConfirmation ? { requiresConfirmation: true } : {}) });
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
    && !calendarDayElapsed({ ...day, requiresConfirmation: false }, now) && !item.protectedDayIds.includes(day.id)
    && !state.manualDeliveries.some((entry) => entry.packageDeliveryDayId === day.id))
    .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id))[0];
  if (!candidate || calendarCompletedDays(item, now) >= item.totalDeliveryDays) {
    throw new Error("This package has no unused, unprotected delivery day available. To record a meal supplied before payment, select Without renewal.");
  }
  candidate.date = record.date;
  candidate.status = "DELIVERED";
  record.treatment = "PACKAGE";
  record.packageDeliveryDayId = candidate.id;
  if (!item.startDate || record.date < item.startDate) item.startDate = record.date;
}

export function manualDeliveryStatus(record: ManualDeliveryRecord) {
  return record.status ?? "DELIVERED";
}

function renewalSource(state: CalendarManagementState, id?: string) {
  const source = state.packages.find((item) => item.id === id);
  if (!source) throw new Error("Choose one of this customer's packages.");
  // This identifies the previous meal and quantity, not a payment entitlement.
  return source;
}

function dateRange(start?: string, end?: string) {
  if (!start || !end || start > end) throw new Error("Choose a start date on or before the end date.");
  const dates: string[] = [];
  for (let cursor = inputToDate(start); dateToInput(cursor) <= end; cursor = addDays(cursor, 1)) {
    if (dates.length >= 366) throw new Error("Choose a delivery period of no more than one year.");
    dates.push(dateToInput(cursor));
  }
  return dates;
}

function pendingOn(state: CalendarManagementState, date: string, sourceId?: string | null) {
  const records = state.manualDeliveries.filter((record) => record.date === date
    && record.treatment === "AWAITING_RENEWAL"
    && (sourceId === undefined || (record.sourcePackageId ?? null) === sourceId)
    && manualDeliveryStatus(record) !== "CANCELLED");
  if (records.length > 1) throw new Error(`${date} has multiple earlier deliveries. Select the individual delivery records to include.`);
  return records[0];
}

function checkUnpaidDay(state: CalendarManagementState, source: ManagedPackage | undefined, date: string) {
  if (source?.days.some((day) => day.date === date && isCountableCalendarDay(day))
    || state.manualDeliveries.some((record) => record.date === date && record.treatment === "PACKAGE"
      && (record.sourcePackageId ?? null) === (source?.id ?? null))) {
    throw new Error(`${date} already belongs to a package. Select that purchase to correct its delivery.`);
  }
}

function addPending(state: CalendarManagementState, source: ManagedPackage | undefined, date: string, status: string) {
  const record: ManualDeliveryRecord = { id: `new:manual-${source?.id ?? "unassigned"}-${date}`, date, label: source?.name ?? "Tiffin",
    quantity: source?.quantity ?? 1, treatment: "AWAITING_RENEWAL", packageDeliveryDayId: null,
    sourcePackageId: source?.id ?? null, status };
  state.manualDeliveries.push(record);
  return record;
}

function setDeliveryDates(state: CalendarManagementState, input: CalendarChangeInput, now: Date, warnings: string[]) {
  const range = dateRange(input.startDate, input.endDate);
  const item = input.packageId ? packageFor(state, input.packageId, true) : undefined;
  const source = !item ? renewalSource(state, input.sourcePackageId) : undefined;
  const dates = range.filter((date) => !conflicts(state, date, item ?? source).length);
  if (!dates.length && item?.status !== "PAUSED") throw new Error("This period has no available delivery days.");
  if (!item) {
    if (!source) throw new Error("Choose a previous paid package.");
    for (const record of state.manualDeliveries) {
      if (record.treatment !== "AWAITING_RENEWAL" || record.sourcePackageId !== source.id) continue;
      if (!dates.includes(record.date) && manualDeliveryStatus(record) === "PREPARING") record.status = "CANCELLED";
    }
    for (const date of dates) {
      checkUnpaidDay(state, source, date);
      const record = pendingOn(state, date, source.id);
      if (!record) addPending(state, source, date, "PREPARING");
      else if (manualDeliveryStatus(record) === "CANCELLED") record.status = "PREPARING";
    }
    return `Set renewal-pending deliveries from ${dates[0]} to ${dates.at(-1)}. No payment or paid package changed. Earlier completed deliveries stay recorded.`;
  }
  item.startDate = range[0];
  item.endDate = range[range.length - 1];
  if (item.status === "PAUSED") {
    return `Set the paused package period to ${item.startDate} through ${item.endDate}. Deliveries stay paused. Resuming will schedule the remaining meals separately.`;
  }
  if (item.totalDeliveryDays > 0 && item.usedDeliveryDays >= item.totalDeliveryDays && !item.days.some(isCountableCalendarDay)) {
    return `Set ${item.name} from ${item.startDate} to ${item.endDate}. All meals were already counted without individual delivery dates. Only the period changes; no meals or credits are added.`;
  }
  if (canRestoreCalendarSchedule(item)) {
    item.status = "ACTIVE";
    warnings.push("This restores the paid, approved package's schedule. No past delivery is confirmed automatically and no payment changes. Confirm the original delivery period before saving.");
  }
  // Measure legacy usage before changing rows. Removing an assumed delivery
  // must not turn it into an untraceable, permanently used credit.
  const legacyUsage = Math.max(item.unrepresentedUsedDays ?? 0, item.usedDeliveryDays - item.days.filter((day) => calendarDayElapsed(day, now)).length);
  let confirmedOutside = 0;
  let assumedRemoved = 0;
  const retainedDates: string[] = [];
  for (const day of item.days) {
    if (!isCountableCalendarDay(day)) continue;
    if (day.status === "DELIVERED") {
      if (!range.includes(day.date)) confirmedOutside++;
      continue;
    }
    if (day.status === "OUT_FOR_DELIVERY" || item.protectedDayIds.includes(day.id)
      || state.manualDeliveries.some((record) => record.packageDeliveryDayId === day.id && record.treatment === "PACKAGE")) {
      if (!range.includes(day.date)) retainedDates.push(day.date);
      continue;
    }
    if (!dates.includes(day.date) && !(range.includes(day.date) && calendarDayElapsed(day, now))) {
      if (calendarDayElapsed(day, now)) assumedRemoved++;
      day.status = "CANCELLED";
    }
  }
  if (confirmedOutside) warnings.push(`Confirmed deliveries outside the new period: ${confirmedOutside}. They stay in the history and still count toward this package.`);
  if (retainedDates.length) warnings.push(`These dates stay on the calendar outside the new period because they are dispatched or linked to a delivery adjustment: ${retainedDates.sort().join(", ")}.`);
  if (assumedRemoved) warnings.push(`Past scheduled days removed: ${assumedRemoved}. These were counted automatically, not confirmed, and will no longer count as delivered.`);
  for (const date of dates) {
    if (item.days.some((day) => day.date === date && day.status !== "CANCELLED")) continue;
    if (pendingOn(state, date, item.id)) throw new Error(`Include the earlier delivery on ${date} in this package before changing its dates.`);
    item.days.push({ id: `new:scheduled-${item.id}-${date}`, date, status: "PREPARING", menuSummary: item.name,
      deliveryWindow: state.deliveryWindow, requiresConfirmation: true });
  }
  const total = legacyUsage + item.days.filter(isCountableCalendarDay).length;
  if (total !== item.totalDeliveryDays) {
    warnings.push(`This changes the delivery allowance from ${item.totalDeliveryDays} to ${total}. The payment amount will not change.`);
    item.purchasedDeliveryDays ??= item.totalDeliveryDays;
    item.totalDeliveryDays = total;
  }
  return `Set ${item.name} from ${item.startDate} to ${item.endDate}. Confirmed deliveries and payment records are unchanged.`;
}

function includeRenewalRecord(state: CalendarManagementState, item: ManagedPackage, record: ManualDeliveryRecord, now: Date, warnings: string[]) {
  if (record.quantity !== item.quantity) throw new Error(`The earlier delivery contains ${record.quantity} tiffins; this package covers ${item.quantity}. Choose a matching package.`);
  if (record.label !== item.name) warnings.push(`Earlier meals were recorded as "${record.label}". Confirm they belong to "${item.name}".`);
  const existing = item.days.filter((day) => day.date === record.date && isCountableCalendarDay(day));
  if (existing.length > 1) throw new Error(`${record.date} has multiple package deliveries. Resolve them before including this meal.`);
  if (existing[0]) {
    if (state.manualDeliveries.some((other) => other.id !== record.id && other.packageDeliveryDayId === existing[0].id)) {
      throw new Error(`${record.date} has already been counted toward this package.`);
    }
    record.packageDeliveryDayId = existing[0].id;
    record.treatment = "PACKAGE";
    if (manualDeliveryStatus(record) === "DELIVERED") existing[0].status = "DELIVERED";
    return;
  }
  assignRecord(state, record, item, now);
  for (const previous of item.days.filter((day) => day.date === record.date && day.status === "DECLINED")) previous.status = "CANCELLED";
  const moved = item.days.find((day) => day.id === record.packageDeliveryDayId)!;
  if (manualDeliveryStatus(record) !== "DELIVERED") {
    moved.status = "PREPARING";
    moved.requiresConfirmation = true;
  }
}

function planSimpleChange(before: CalendarManagementState, input: CalendarChangeInput, now: Date) {
  const after = structuredClone(before);
  const warnings: string[] = [];
  const today = businessDateInput(now);
  if (input.action === "set-dates") {
    const summary = setDeliveryDates(after, input, now, warnings);
    return finishCalendarPlan(before, after, now, warnings, summary, input.packageId);
  }
  const chosenRecords = input.manualDeliveryIds?.map((id) => {
    const record = after.manualDeliveries.find((entry) => entry.id === id && entry.treatment === "AWAITING_RENEWAL"
      && manualDeliveryStatus(entry) === "DELIVERED");
    if (!record) throw new Error("An earlier delivery has changed or was already included. Refresh and select it again.");
    return record;
  });
  if (chosenRecords && input.action !== "apply-renewal") throw new Error("Earlier delivery selections are only used when including meals in a renewal.");
  if (chosenRecords && new Set(input.manualDeliveryIds).size !== chosenRecords.length) throw new Error("Select each earlier delivery only once.");
  const dates = chosenRecords ? chosenRecords.map((record) => record.date) : [...new Set(input.dates ?? [input.date])].sort();
  if (dates.some((date) => date > today)) throw new Error("Future dates cannot be marked Delivered or Not delivered.");
  const item = input.packageId ? packageFor(after, input.packageId) : undefined;
  if (item?.status === "PAUSED" && input.action === "apply-renewal") throw new Error("Resume this package before including earlier deliveries.");
  const source = input.sourcePackageId ? renewalSource(after, input.sourcePackageId) : undefined;
  const outsidePackage = !item && (Boolean(source) || input.treatment === "AWAITING_RENEWAL");
  let changes = 0;
  const allocatedRecords: ManualDeliveryRecord[] = [];
  for (const [index, date] of dates.entries()) {
    if (input.action === "set-delivered" || input.action === "apply-renewal") warnings.push(...conflicts(after, date, item ?? source));
    // A paid calendar edit never consumes or changes another purchase's pending meal.
    const pending = input.action === "apply-renewal" ? chosenRecords?.[index] ?? pendingOn(after, date)
      : outsidePackage ? pendingOn(after, date, source?.id ?? null) : undefined;
    if (input.action === "apply-renewal") {
      if (!item || !pending || manualDeliveryStatus(pending) !== "DELIVERED") throw new Error(`${date} has no earlier delivered meal waiting to be included.`);
      includeRenewalRecord(after, item, pending, now, warnings);
      allocatedRecords.push(pending);
      changes++;
      continue;
    }
    if (outsidePackage) {
      const status = input.action === "set-delivered" ? "DELIVERED" : "DECLINED";
      checkUnpaidDay(after, source, date);
      if (pending) {
        if (manualDeliveryStatus(pending) !== status) { pending.status = status; changes++; }
      } else {
        addPending(after, source, date, status);
        changes++;
      }
      continue;
    }
    if (!item) throw new Error("Choose a package.");
    const matching = item.days.filter((day) => day.date === date && isCountableCalendarDay(day));
    if (matching.length > 1) throw new Error(`${date} has multiple deliveries in this package. Resolve them before changing this day.`);
    const day = matching[0];
    if (input.action === "set-not-delivered") {
      if (day) {
        markMissed(after, item, day, now);
        changes++;
      }
    } else if (day) {
      if (day.status !== "DELIVERED") { day.status = "DELIVERED"; changes++; }
    } else {
      if (pendingOn(after, date, item.id)) throw new Error(`An earlier delivery on ${date} is waiting for renewal. Include that record explicitly instead of recording it twice.`);
      const previous = item.days.find((entry) => entry.date === date && entry.status === "DECLINED");
      const record = addPending(after, item, date, "DELIVERED");
      includeRenewalRecord(after, item, record, now, warnings);
      // Keep one visible calendar row for a corrected missed delivery.
      if (previous) previous.status = "CANCELLED";
      changes++;
    }
  }
  if (!changes) throw new Error("These dates already have that status. No changes are needed.");
  let merged = 0;
  if (input.action === "apply-renewal" && item) {
    const sources = new Set(allocatedRecords.map((record) => record.sourcePackageId));
    const future = after.manualDeliveries.filter((record) => record.treatment === "AWAITING_RENEWAL"
      && manualDeliveryStatus(record) === "PREPARING" && record.date > today && record.sourcePackageId && sources.has(record.sourcePackageId));
    for (const record of future) {
      if (conflicts(after, record.date, item).length) throw new Error(`${record.date} is no longer available. Adjust the renewal-pending dates first.`);
      includeRenewalRecord(after, item, record, now, warnings);
      merged++;
    }
  }
  const summary = input.action === "apply-renewal"
    ? `Included ${changes} earlier ${changes === 1 ? "delivery" : "deliveries"} in ${item!.name}.${merged ? ` Also included ${merged} scheduled renewal-pending ${merged === 1 ? "date" : "dates"}.` : ""} No payment changed.`
    : `Marked ${changes} ${changes === 1 ? "date" : "dates"} ${input.action === "set-delivered" ? "Delivered" : "Not delivered"}.${item ? " Package balance updated." : " Renewal pending; no paid package changed."}`;
  return finishCalendarPlan(before, after, now, warnings, summary);
}

export function planCalendarChange(before: CalendarManagementState, rawInput: CalendarChangeInput, now = new Date()) {
  const input = calendarChangeSchema.parse(rawInput);
  if (input.customerId !== before.customerId) throw new Error("Customer does not match this calendar.");
  if (input.packageId && input.sourcePackageId) throw new Error("Choose either a paid purchase or meals before renewal, not both.");
  if (input.packageId && input.treatment === "AWAITING_RENEWAL" && ["set-delivered", "set-not-delivered"].includes(input.action)) {
    throw new Error("Choose either a paid purchase or meals before renewal, not both.");
  }
  if (input.action === "undo") throw new Error("Undo requires the saved change history.");
  if (["set-delivered", "set-not-delivered", "set-dates", "apply-renewal"].includes(input.action)) return planSimpleChange(before, input, now);
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

  return finishCalendarPlan(before, after, now, warnings, summary);
}

function finishCalendarPlan(before: CalendarManagementState, after: CalendarManagementState, now: Date, warnings: string[], summary: string, explicitPeriodId?: string) {
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
      if (item.id !== explicitPeriodId) {
        // Only a schedule change can move the boundary. Confirming a meal must
        // not snap a manually chosen weekend end back to the last weekday.
        const linkedDays = new Set(before.manualDeliveries.filter((record) => record.treatment === "PACKAGE").map((record) => record.packageDeliveryDayId));
        const outsideDates = new Map(old.days.filter((day) => old.endDate && day.date > old.endDate
          && (day.status === "DELIVERED" || day.status === "OUT_FOR_DELIVERY" || old.protectedDayIds.includes(day.id) || linkedDays.has(day.id)))
          .map((day) => [day.id, day.date]));
        const lastScheduled = (plan: ManagedPackage) => plan.days.filter((day) => isCountableCalendarDay(day) && outsideDates.get(day.id) !== day.date)
          .map((day) => day.date).sort().at(-1);
        const previousLast = lastScheduled(old);
        const nextLast = lastScheduled(item);
        if (nextLast && (!old.endDate || nextLast !== previousLast && (previousLast === old.endDate || nextLast > old.endDate))) item.endDate = nextLast;
      }
      if (item.days.some((day) => isCountableCalendarDay(day) && !calendarDayElapsed(day, now))) item.status = "ACTIVE";
    }
  }
  return { after, summary, warnings: [...new Set(warnings)], balances: calendarBalances(before, after, now) };
}
