import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as crypto from "node:crypto";
import test from "node:test";
import ts from "typescript";
import { z } from "zod";
import * as schedule from "../src/lib/package-schedule.ts";

function load(path, dependencies, Clock = Date) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  new Function("require", "exports", "Date", code)((id) => {
    assert.ok(Object.hasOwn(dependencies, id), `Unexpected dependency ${id}`);
    return dependencies[id];
  }, exports, Clock);
  return exports;
}

const planner = load("../src/lib/calendar-management.ts", { zod: { z }, "@/lib/package-schedule": schedule });
const rules = load("../src/lib/business-rules.ts", { "server-only": {}, "@/lib/db": {}, "@/lib/package-schedule": schedule });
function setup() {
  let instant = "2026-09-21T16:00:00Z";
  class Clock extends Date { constructor(...args) { super(...(args.length ? args : [instant])); } }
  const state = {
    customer: { id: "c1", userId: "u1", calendarRevision: 0 },
    packages: [{ id: "p1", customerId: "c1", package: { name: "Regular tiffin" }, order: { payments: [{ status: "PAID", amount: 100 }] },
      status: "ACTIVE", quantity: 1, totalDeliveryDays: 5, usedDeliveryDays: 0, startDate: schedule.inputToDate("2026-09-21"),
      endDate: schedule.inputToDate("2026-09-25"), customerPauseUsed: false, pauseRequests: [], holidayCredits: [] }],
    days: [21, 22, 23, 24, 25].map((day) => ({ id: `d${day}`, customerPackageId: "p1", deliveryDate: schedule.inputToDate(`2026-09-${day}`),
      status: "PREPARING", menuSummary: "Regular meal", deliveryWindow: "10:00 AM - 6:00 PM" })),
    manual: [], audits: [], notifications: [], holidays: [],
  };
  const control = { role: "ADMIN", failNotification: false };
  const matches = (row, where) => Object.entries(where ?? {}).every(([key, value]) => {
    if (typeof value === "object" && value !== null) {
      if (value.in) return value.in.includes(row[key]);
    }
    return row[key] === value;
  });
  const find = (rows, where) => rows.find((row) => matches(row, where));
  const table = (name) => ({
    create: async ({ data }) => { const row = { id: crypto.randomUUID(), ...structuredClone(data) }; state[name].push(row); return row; },
    update: async ({ where, data }) => { const row = find(state[name], where); assert.ok(row, `${name} update target`); Object.assign(row, structuredClone(data)); return row; },
    delete: async ({ where }) => { state[name] = state[name].filter((row) => !matches(row, where)); },
    deleteMany: async ({ where }) => { state[name] = state[name].filter((row) => !matches(row, where)); },
  });
  const logs = (where) => state.audits.filter((row) => matches(row, where)).toReversed();
  let queue = Promise.resolve();
  const db = {
    customer: {
      findUnique: async ({ where }) => where.id !== state.customer.id ? null : structuredClone({ ...state.customer,
        manualDeliveries: state.manual, packages: state.packages.map((item) => ({ ...item, deliveryDays: state.days.filter((day) => day.customerPackageId === item.id) })) }),
      findUniqueOrThrow: async () => state.customer,
      update: async ({ where, data }) => { assert.equal(where.id, "c1"); state.customer.calendarRevision += data.calendarRevision.increment; },
    },
    setting: { findUnique: async () => ({ value: { deliveryWindowStart: "10:00", deliveryWindowEnd: "18:00" } }) },
    businessHoliday: { findMany: async () => structuredClone(state.holidays) },
    packageDeliveryDay: table("days"), customerPackage: table("packages"), manualDelivery: table("manual"),
    auditLog: {
      findFirst: async ({ where }) => structuredClone(logs(where)[0] ?? null),
      findMany: async ({ where }) => structuredClone(logs(where)),
      create: async ({ data }) => { const row = { ...structuredClone(data), id: `audit-${state.audits.length + 1}`, createdAt: new Clock(), user: { name: "Owner" } }; state.audits.push(row); return row; },
    },
    notification: { create: async ({ data }) => { if (control.failNotification) throw new Error("Notification database failure"); state.notifications.push(data); } },
    $transaction(fn) {
      const result = queue.then(async () => { const before = structuredClone(state); try { return await fn(db); } catch (error) { Object.assign(state, before); throw error; } });
      queue = result.catch(() => {});
      return result;
    },
  };
  const locks = load("../src/lib/server/calendar-lock.ts", { "server-only": {} });
  const service = load("../src/lib/server/calendar-management.ts", {
    "server-only": {}, "node:crypto": crypto, "@prisma/client": { Prisma: { TransactionIsolationLevel: { ReadCommitted: "ReadCommitted" } } },
    "@/lib/auth": { getCurrentSession: async () => control.role ? { user: { id: "admin1", role: control.role } } : null },
    "@/lib/business-rules": rules, "@/lib/calendar-management": planner, "@/lib/db": { db },
    "@/lib/package-schedule": schedule, "@/lib/server/calendar-lock": locks,
  }, Clock);
  const publicCalendar = load("../src/lib/server/calendar.ts", { "server-only": {}, "@/lib/db": { db },
    "@/lib/business-rules": { getBusinessRules: async () => rules.businessRulesFromValue({}) }, "@/lib/package-schedule": schedule }, Clock);
  const apply = async (input) => {
    const preview = await service.previewCalendarChange(input);
    await service.applyCalendarChange(input, preview.fingerprint);
    return preview;
  };
  return { ...service, ...publicCalendar, state, control, apply, setTime: (value) => { instant = value; } };
}
const record = (date = "2026-09-18", treatment = "AWAITING_RENEWAL") => ({ customerId: "c1", action: "record-delivery", date,
  label: "Regular meal", quantity: 1, treatment, ...(treatment === "PACKAGE" ? { packageId: "p1" } : {}), reason: "Private operator note" });

test("record unpaid deliveries, then allocate two against renewal without changing payments or entitlement", async () => {
  const s = setup();
  await s.apply(record("2026-09-17"));
  await s.apply(record("2026-09-18"));
  assert.equal(s.state.packages[0].usedDeliveryDays, 0);
  for (const delivery of [...s.state.manual]) await s.apply({ customerId: "c1", action: "assign-delivery", date: schedule.dateToInput(delivery.deliveryDate),
    manualDeliveryId: delivery.id, treatment: "PACKAGE", packageId: "p1", reason: "Apply to paid renewal" });
  assert.equal(s.state.packages[0].usedDeliveryDays, 2);
  assert.equal(s.state.packages[0].totalDeliveryDays, 5);
  assert.equal(s.state.days.length, 5);
  assert.equal(s.state.days.filter((day) => day.status === "PREPARING").length, 3);
  assert.equal(schedule.dateToInput(s.state.packages[0].endDate), "2026-09-23");
  assert.deepEqual(s.state.packages[0].order.payments, [{ status: "PAID", amount: 100 }]);
  assert.equal(s.state.audits.length, 4);
  assert.equal(s.state.notifications.length, 4);
  assert.ok(!JSON.stringify(s.state.notifications).includes("Private operator note"));
});

test("customers and anonymous requests cannot read admin state, preview, or apply changes", async () => {
  const s = setup();
  for (const role of ["CUSTOMER", null]) {
    s.control.role = role;
    await assert.rejects(s.getAdminCalendarData("c1"), /Admin access/);
    await assert.rejects(s.previewCalendarChange(record()), /Admin access/);
    await assert.rejects(s.applyCalendarChange(record(), "a".repeat(64)), /Admin access/);
  }
  assert.equal(s.state.customer.calendarRevision, 0);
  assert.equal(s.state.manual.length, 0);
});

test("stale, altered, and replayed previews cannot modify the calendar twice", async () => {
  const s = setup();
  const input = record();
  const preview = await s.previewCalendarChange(input);
  await assert.rejects(s.applyCalendarChange({ ...input, quantity: 2 }, preview.fingerprint), /fresh preview/);
  assert.equal(s.state.customer.calendarRevision, 0);
  await s.applyCalendarChange(input, preview.fingerprint);
  await assert.rejects(s.applyCalendarChange(input, preview.fingerprint), /matching delivery|fresh preview/);
  assert.equal(s.state.manual.length, 1);
  assert.equal(s.state.customer.calendarRevision, 1);
});

test("concurrent competing confirmations serialize and only one stale revision succeeds", async () => {
  const s = setup();
  const first = record("2026-09-17"), second = record("2026-09-18");
  const a = await s.previewCalendarChange(first), b = await s.previewCalendarChange(second);
  const results = await Promise.allSettled([s.applyCalendarChange(first, a.fingerprint), s.applyCalendarChange(second, b.fingerprint)]);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(s.state.audits.length, 1);
  assert.equal(s.state.customer.calendarRevision, 1);
});

test("a later holiday invalidates a preview, and off-day delivery requires explicit acknowledgement", async () => {
  const s = setup();
  const input = record("2026-09-19");
  const preview = await s.previewCalendarChange(input);
  assert.ok(preview.warnings.length);
  await assert.rejects(s.applyCalendarChange(input, preview.fingerprint), /Confirm.*conflicts/);
  await s.apply({ ...input, acknowledgeConflict: true });
  const freshInput = record("2026-09-18");
  const freshPreview = await s.previewCalendarChange(freshInput);
  s.state.holidays.push({ name: "Closure", startDate: schedule.inputToDate("2026-09-18"), endDate: schedule.inputToDate("2026-09-18") });
  await assert.rejects(s.applyCalendarChange(freshInput, freshPreview.fingerprint), /fresh preview/);
});

test("notification or audit failure rolls back deliveries, counters, and revision", async () => {
  const s = setup();
  const before = structuredClone(s.state);
  const input = record("2026-09-18", "PACKAGE");
  const preview = await s.previewCalendarChange(input);
  s.control.failNotification = true;
  await assert.rejects(s.applyCalendarChange(input, preview.fingerprint), /Notification database/);
  assert.deepEqual(s.state, before);
});

test("undo restores the exact unused schedule and keeps both audit entries", async () => {
  const s = setup();
  const originalDates = s.state.days.map((day) => day.deliveryDate.toISOString());
  await s.apply(record("2026-09-18", "PACKAGE"));
  const data = await s.getAdminCalendarData("c1");
  assert.equal(data.history[0].canUndo, true);
  await s.apply({ customerId: "c1", action: "undo", date: "2026-09-18", changeId: data.history[0].id, reason: "Correct mistaken delivery" });
  assert.equal(s.state.packages[0].usedDeliveryDays, 0);
  assert.equal(s.state.manual.length, 0);
  assert.deepEqual(s.state.days.map((day) => day.deliveryDate.toISOString()), originalDates);
  assert.equal(s.state.audits.length, 2);
  assert.equal(s.state.audits[1].action, "calendar.undone");
  assert.equal((await s.getAdminCalendarData("c1")).history[0].canUndo, false);
});

test("undo survives database JSON object-key normalization", async () => {
  const s = setup();
  await s.apply(record("2026-09-18", "PACKAGE"));
  const reorder = (value) => Array.isArray(value) ? value.map(reorder)
    : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).reverse().map(([key, item]) => [key, reorder(item)])) : value;
  s.state.audits[0].metadata = reorder(s.state.audits[0].metadata);
  const data = await s.getAdminCalendarData("c1");
  assert.equal(data.history[0].canUndo, true);
  await s.apply({ customerId: "c1", action: "undo", date: "2026-09-18", changeId: data.history[0].id, reason: "Undo after JSON roundtrip" });
  assert.equal(s.state.packages[0].usedDeliveryDays, 0);
  assert.equal(s.state.days.filter((day) => day.status === "PREPARING").length, 5);
});

test("persisted sparse-history offset survives time advancement and later missed-day corrections", async () => {
  const s = setup();
  s.state.packages[0].totalDeliveryDays = 8;
  s.state.packages[0].usedDeliveryDays = 6;
  s.state.days = s.state.days.slice(0, 2);
  s.state.packages[0].endDate = schedule.inputToDate("2026-09-22");
  await s.apply(record("2026-09-18", "PACKAGE"));
  assert.equal(s.state.packages[0].unrepresentedUsedDays, 6);
  s.setTime("2026-09-23T16:00:00Z");
  const calendar = await s.getCustomerCalendarData("c1");
  assert.equal(calendar.packages[0].completedDays, 8);
  assert.equal(calendar.packages[0].remainingDays, 0);
  const preview = await s.apply({ customerId: "c1", action: "mark-missed", date: "2026-09-21", packageId: "p1", deliveryDayId: "d21", reason: "Correct missed final meal" });
  assert.equal(preview.balances[0].beforeCompleted, 8);
  assert.equal(preview.balances[0].afterRemaining, 1);
  assert.equal(s.state.packages[0].usedDeliveryDays, 7);
  assert.equal(s.state.packages[0].unrepresentedUsedDays, 6);
});

test("undo retains discovered historical usage when an unaffected day elapses after preview", async () => {
  const s = setup();
  s.state.packages[0].totalDeliveryDays = 8;
  s.state.packages[0].usedDeliveryDays = 6;
  s.state.days = s.state.days.filter((day) => ["d21", "d25"].includes(day.id));
  await s.apply(record("2026-09-18", "PACKAGE"));
  s.setTime("2026-09-22T16:00:00Z");
  const history = (await s.getAdminCalendarData("c1")).history;
  assert.equal(history[0].canUndo, true);
  const preview = await s.apply({ customerId: "c1", action: "undo", date: "2026-09-18", changeId: history[0].id, reason: "Undo incorrect early delivery" });
  assert.equal(preview.balances[0].beforeCompleted, 8);
  assert.equal(preview.balances[0].afterCompleted, 7);
  assert.equal(preview.balances[0].afterRemaining, 1);
  assert.equal(s.state.packages[0].unrepresentedUsedDays, 6);
  assert.equal(s.state.packages[0].usedDeliveryDays, 7);
  s.setTime("2026-09-28T16:00:00Z");
  assert.equal((await s.getCustomerCalendarData("c1")).packages[0].completedDays, 8);
});

test("undo cannot remove an elapsed make-up delivery", async () => {
  const s = setup();
  await s.apply({ customerId: "c1", action: "mark-missed", date: "2026-09-21", packageId: "p1", deliveryDayId: "d21", reason: "Delivery did not happen" });
  const changeId = s.state.audits[0].id;
  s.setTime("2026-09-29T16:00:00Z");
  await assert.rejects(s.previewCalendarChange({ customerId: "c1", action: "undo", date: "2026-09-21", changeId, reason: "Attempt unsafe reversal" }), /started or elapsed/);
  assert.equal((await s.getAdminCalendarData("c1")).history[0].canUndo, false);
});

test("customer calendar shows exact delivered dates, missed days, and unallocated meals without private audit notes", async () => {
  const s = setup();
  await s.apply(record("2026-09-18", "PACKAGE"));
  await s.apply(record("2026-09-17"));
  await s.apply({ customerId: "c1", action: "mark-missed", date: "2026-09-21", packageId: "p1", deliveryDayId: "d21", reason: "Private operational explanation" });
  const calendar = await s.getCustomerCalendarData("c1");
  assert.ok(calendar.events.some((event) => event.date === "2026-09-18" && event.type === "delivery-completed"));
  assert.ok(calendar.events.some((event) => event.date === "2026-09-21" && event.type === "delivery-missed"));
  assert.ok(calendar.events.some((event) => event.date === "2026-09-17" && event.type === "delivery-unallocated"));
  assert.ok(!calendar.events.some((event) => event.date === "2026-09-22" && event.type === "delivery-completed"));
  assert.ok(!JSON.stringify(calendar).includes("Private"));
});
