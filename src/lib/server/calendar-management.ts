import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { Prisma, type OrderStatus, type CustomerPackageStatus } from "@prisma/client";
import { getCurrentSession } from "@/lib/auth";
import { businessRulesFromValue } from "@/lib/business-rules";
import { calendarBalances, calendarDayElapsed, planCalendarChange, stableCalendarJson } from "@/lib/calendar-management";
import type { AdminCalendarData, CalendarChangeInput, CalendarManagementState } from "@/lib/calendar-management-types";
import { db } from "@/lib/db";
import { businessDateInput, dateToInput, inputToDate } from "@/lib/package-schedule";
import { lockCustomerCalendar } from "@/lib/server/calendar-lock";

type Client = Prisma.TransactionClient;
type ChangeMetadata = {
  summary: string; reason: string; packageIds: string[];
  before: CalendarManagementState; after: CalendarManagementState;
};

export async function requireCalendarAdmin() {
  const session = await getCurrentSession();
  if (session?.user.role !== "ADMIN") throw new Error("Admin access is required.");
  return session.user;
}

function canonical(state: CalendarManagementState) {
  const copy = structuredClone(state);
  copy.packages.sort((a, b) => a.id.localeCompare(b.id));
  for (const item of copy.packages) {
    item.days.sort((a, b) => a.id.localeCompare(b.id));
    item.protectedDayIds.sort();
    item.pauses.sort((a, b) => stableCalendarJson(a).localeCompare(stableCalendarJson(b)));
  }
  copy.manualDeliveries.sort((a, b) => a.id.localeCompare(b.id));
  copy.holidays.sort((a, b) => stableCalendarJson(a).localeCompare(stableCalendarJson(b)));
  return copy;
}
function stateKey(state: CalendarManagementState) { return stableCalendarJson(canonical(state)); }
function metadata(value: Prisma.JsonValue | null): ChangeMetadata | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (!value.before || !value.after || typeof value.summary !== "string" || typeof value.reason !== "string") return null;
  return value as unknown as ChangeMetadata;
}

export async function loadCalendarManagementState(client: Client, customerId: string): Promise<CalendarManagementState> {
  const customer = await client.customer.findUnique({ where: { id: customerId }, include: {
    manualDeliveries: true,
    packages: { include: {
      package: { select: { name: true } }, order: { include: { payments: true } },
      deliveryDays: true, pauseRequests: true,
      holidayCredits: { where: { businessHoliday: { status: "ACTIVE" } } },
    } },
  } });
  if (!customer) throw new Error("Customer was not found.");
  const setting = await client.setting.findUnique({ where: { key: "admin_settings" } });
  const rules = businessRulesFromValue(setting?.value);
  const holidays = await client.businessHoliday.findMany({ where: { status: "ACTIVE" } });
  const pauseIds = customer.packages.flatMap((item) => item.pauseRequests
    .filter((pause) => ["APPROVED", "ACTIVE"].includes(pause.status)).map((pause) => pause.id));
  const provenance = pauseIds.length ? await client.auditLog.findMany({ where: {
    action: "pause.scheduled", entity: "pause_request", entityId: { in: pauseIds },
  } }) : [];
  const pauseDays = new Map<string, string[]>();
  for (const log of provenance) {
    const info = log.metadata as { originals?: { id: string }[]; replacements?: { id: string }[] } | null;
    if (log.entityId && Array.isArray(info?.originals) && Array.isArray(info?.replacements)) {
      pauseDays.set(log.entityId, [...info.originals, ...info.replacements].map((day) => day.id));
    }
  }
  return canonical({ customerId, revision: customer.calendarRevision,
    deliveryWeekdays: rules.deliveryWeekdays, deliveryWindow: rules.deliveryWindow,
    holidays: holidays.map((holiday) => ({ name: holiday.name, startDate: dateToInput(holiday.startDate), endDate: dateToInput(holiday.endDate) })),
    manualDeliveries: customer.manualDeliveries.map((record) => ({ id: record.id, date: dateToInput(record.deliveryDate),
      label: record.label, quantity: record.quantity, treatment: record.treatment, packageDeliveryDayId: record.packageDeliveryDayId })),
    packages: customer.packages.map((item) => ({ id: item.id, name: item.package.name, status: item.status,
      quantity: item.quantity, totalDeliveryDays: item.totalDeliveryDays, usedDeliveryDays: item.usedDeliveryDays,
      unrepresentedUsedDays: item.unrepresentedUsedDays ?? 0,
      startDate: item.startDate ? dateToInput(item.startDate) : null, endDate: item.endDate ? dateToInput(item.endDate) : null,
      paid: item.order.payments.some((payment) => payment.status === "PAID"), customerPauseUsed: item.customerPauseUsed,
      days: item.deliveryDays.map((day) => ({ id: day.id, date: dateToInput(day.deliveryDate), status: day.status,
        menuSummary: day.menuSummary, deliveryWindow: day.deliveryWindow })),
      pauses: item.pauseRequests.map((pause) => ({ startDate: dateToInput(pause.startDate), endDate: dateToInput(pause.endDate), status: pause.status })),
      protectedDayIds: [...new Set([
        ...item.holidayCredits.flatMap((credit) => [credit.originalDeliveryDayId, credit.replacementDeliveryDayId]),
        ...item.pauseRequests.flatMap((pause) => pauseDays.get(pause.id) ?? []),
      ])],
    })),
  });
}

function undoPlan(state: CalendarManagementState, change: ChangeMetadata, now: Date) {
  if (stateKey(state) !== stateKey(change.after)) throw new Error("The calendar has changed since this edit. Use a new correction instead of undo.");
  for (const item of state.packages) {
    const old = change.before.packages.find((entry) => entry.id === item.id)!;
    for (const day of item.days) {
      const original = old.days.find((entry) => entry.id === day.id);
      if (stableCalendarJson(day) === stableCalendarJson(original)) continue;
      // Undo must not remove a make-up delivery that has subsequently elapsed.
      if (day.status === "OUT_FOR_DELIVERY" || (day.status !== "DELIVERED" && calendarDayElapsed(day, now))) {
        throw new Error("An affected delivery has already started or elapsed. Record a new correction instead.");
      }
      if (original && original.date !== day.date && original.status !== "DELIVERED" && calendarDayElapsed(original, now)) {
        throw new Error("The original delivery date has already elapsed. Record a new correction instead.");
      }
    }
  }
  const after = structuredClone(change.before);
  after.revision = state.revision;
  for (const item of after.packages) {
    const current = state.packages.find((entry) => entry.id === item.id)!;
    if (stableCalendarJson(item) === stableCalendarJson(current)) continue;
    // Capturing previously unrepresented history is not an editable delivery.
    // Keep that baseline even when undo restores the earlier schedule.
    item.unrepresentedUsedDays = Math.max(item.unrepresentedUsedDays ?? 0, current.unrepresentedUsedDays ?? 0);
    item.usedDeliveryDays = Math.max(item.usedDeliveryDays,
      item.unrepresentedUsedDays + item.days.filter((day) => calendarDayElapsed(day, now)).length);
  }
  return { after, summary: `Undid: ${change.summary}`, warnings: [], balances: calendarBalances(state, after, now) };
}

async function prepare(client: Client, state: CalendarManagementState, input: CalendarChangeInput, now: Date) {
  let plan: ReturnType<typeof planCalendarChange>;
  if (input.action === "undo") {
    const log = await client.auditLog.findFirst({ where: { entity: "customer_calendar", entityId: input.customerId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
    const saved = log && metadata(log.metadata);
    if (!log || log.id !== input.changeId || log.action !== "calendar.changed" || !saved) throw new Error("Only the latest unchanged calendar edit can be undone.");
    plan = undoPlan(state, saved, now);
  } else plan = planCalendarChange(state, input, now);
  const fingerprint = createHash("sha256").update(stableCalendarJson({
    input, before: canonical(state), after: canonical(plan.after), summary: plan.summary,
    warnings: plan.warnings, balances: plan.balances,
  })).digest("hex");
  return { ...plan, fingerprint };
}

export async function previewCalendarChange(input: CalendarChangeInput) {
  await requireCalendarAdmin();
  const state = await loadCalendarManagementState(db, input.customerId);
  const { after: _after, ...preview } = await prepare(db, state, input, new Date());
  void _after;
  return preview;
}

export async function getAdminCalendarData(customerId: string): Promise<AdminCalendarData> {
  await requireCalendarAdmin();
  const state = await loadCalendarManagementState(db, customerId);
  const logs = await db.auditLog.findMany({ where: { entity: "customer_calendar", entityId: customerId },
    include: { user: { select: { name: true } } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 30 });
  const now = new Date();
  return { state, today: businessDateInput(now), history: logs.flatMap((log, index) => {
    const saved = metadata(log.metadata);
    if (!saved) return [];
    let canUndo = false;
    if (index === 0 && log.action === "calendar.changed") {
      try { undoPlan(state, saved, now); canUndo = true; } catch { /* A later change makes reversal unsafe. */ }
    }
    return [{ id: log.id, summary: saved.summary, reason: saved.reason,
      actor: log.user?.name || "Administrator", createdAt: log.createdAt.toISOString(), canUndo }];
  }) };
}

async function persist(client: Client, before: CalendarManagementState, after: CalendarManagementState) {
  // Allocate identifiers before saving relations; previews use stable placeholders.
  const ids = new Map<string, string>();
  for (const item of after.packages) for (const day of item.days) if (day.id.startsWith("new:")) ids.set(day.id, randomUUID());
  for (const record of after.manualDeliveries) if (record.id.startsWith("new:")) ids.set(record.id, randomUUID());
  for (const item of after.packages) for (const day of item.days) day.id = ids.get(day.id) ?? day.id;
  for (const record of after.manualDeliveries) {
    record.id = ids.get(record.id) ?? record.id;
    if (record.packageDeliveryDayId) record.packageDeliveryDayId = ids.get(record.packageDeliveryDayId) ?? record.packageDeliveryDayId;
  }
  // Release links before an undo removes a newly created delivery day.
  for (const record of before.manualDeliveries) {
    const next = after.manualDeliveries.find((entry) => entry.id === record.id);
    if (!next) await client.manualDelivery.delete({ where: { id: record.id } });
    else if (next.packageDeliveryDayId !== record.packageDeliveryDayId) {
      await client.manualDelivery.update({ where: { id: record.id }, data: { packageDeliveryDayId: null } });
    }
  }
  for (const item of after.packages) {
    const old = before.packages.find((entry) => entry.id === item.id)!;
    if (stableCalendarJson(old) === stableCalendarJson(item)) continue;
    for (const day of item.days) {
      const original = old.days.find((entry) => entry.id === day.id);
      if (stableCalendarJson(original) === stableCalendarJson(day)) continue;
      const data = { deliveryDate: inputToDate(day.date), status: day.status as OrderStatus, menuSummary: day.menuSummary, deliveryWindow: day.deliveryWindow };
      if (original) await client.packageDeliveryDay.update({ where: { id: day.id }, data });
      else await client.packageDeliveryDay.create({ data: { ...data, id: day.id, customerPackageId: item.id } });
    }
    const removed = old.days.filter((day) => !item.days.some((entry) => entry.id === day.id)).map((day) => day.id);
    if (removed.length) await client.packageDeliveryDay.deleteMany({ where: { id: { in: removed }, customerPackageId: item.id } });
    await client.customerPackage.update({ where: { id: item.id }, data: {
      status: item.status as CustomerPackageStatus, usedDeliveryDays: item.usedDeliveryDays, unrepresentedUsedDays: item.unrepresentedUsedDays ?? 0,
      startDate: item.startDate ? inputToDate(item.startDate) : null,
      endDate: item.endDate ? inputToDate(item.endDate) : null, reminderEmailSentAt: null,
    } });
  }
  for (const record of after.manualDeliveries) {
    const old = before.manualDeliveries.find((entry) => entry.id === record.id);
    if (stableCalendarJson(old) === stableCalendarJson(record)) continue;
    const data = { deliveryDate: inputToDate(record.date), label: record.label, quantity: record.quantity,
      treatment: record.treatment, packageDeliveryDayId: record.packageDeliveryDayId };
    if (old) await client.manualDelivery.update({ where: { id: record.id }, data });
    else await client.manualDelivery.create({ data: { ...data, id: record.id, customerId: after.customerId } });
  }
}

export async function applyCalendarChange(input: CalendarChangeInput, fingerprint: string) {
  const admin = await requireCalendarAdmin();
  return db.$transaction(async (tx) => {
    await lockCustomerCalendar(tx, input.customerId);
    const before = await loadCalendarManagementState(tx, input.customerId);
    before.revision -= 1;
    const plan = await prepare(tx, before, input, new Date());
    if (plan.fingerprint !== fingerprint) throw new Error("The calendar or delivery balance changed. Review a fresh preview before saving.");
    if (plan.warnings.length && !input.acknowledgeConflict) throw new Error("Confirm the listed delivery conflicts before saving.");
    await persist(tx, before, plan.after);
    plan.after.revision = before.revision + 1;
    const change: ChangeMetadata = { before: canonical(before), after: canonical(plan.after),
      summary: plan.summary, reason: input.reason, packageIds: plan.balances.map((balance) => balance.packageId) };
    await tx.auditLog.create({ data: { userId: admin.id, action: input.action === "undo" ? "calendar.undone" : "calendar.changed",
      entity: "customer_calendar", entityId: input.customerId, metadata: JSON.parse(JSON.stringify(change)) as Prisma.InputJsonValue } });
    const customer = await tx.customer.findUniqueOrThrow({ where: { id: input.customerId }, select: { userId: true } });
    if (customer.userId) await tx.notification.create({ data: { userId: customer.userId, type: "SYSTEM",
      title: "Delivery calendar updated", body: [plan.summary, ...plan.balances.map((balance) =>
        `${balance.name}: ${balance.afterRemaining} deliveries remaining${balance.afterEnd ? `; ends ${balance.afterEnd}` : ""}.`)].join(" ") } });
    return { customerId: input.customerId };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 15000 });
}
