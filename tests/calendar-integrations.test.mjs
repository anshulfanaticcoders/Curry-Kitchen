import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import { z } from "zod";

const instant = "2026-10-19T20:00:00Z"; // Monday, before the Pacific delivery window closes.
class Clock extends Date {
  constructor(...args) { super(...(args.length ? args : [instant])); }
  static now() { return new Date(instant).getTime(); }
}
const codeCache = new Map();
function load(path, dependencies = {}, ModuleClock = Clock) {
  if (!codeCache.has(path)) codeCache.set(path, ts.transpileModule(
    readFileSync(new URL(path, import.meta.url), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
  ).outputText);
  const exports = {};
  new Function("require", "exports", "Date", codeCache.get(path))((id) => {
    assert.ok(Object.hasOwn(dependencies, id), `Unexpected dependency: ${id}`);
    return dependencies[id];
  }, exports, ModuleClock);
  return exports;
}
const schedule = load("../src/lib/package-schedule.ts");
const date = schedule.inputToDate;
const rules = { deliveryWeekdays: [1, 2, 3, 4, 5], deliveryWindow: "10:00 AM - 6:00 PM" };

// A transactional fixture, never a Prisma client: only these in-memory tables
// can be read or written. Relation filters and projections mirror the queries
// used by the integration entry points; operations are recorded for lock checks.
function fixture() {
  let currentInstant = instant;
  class FixtureClock extends Date {
    constructor(...args) { super(...(args.length ? args : [currentInstant])); }
    static now() { return new Date(currentInstant).getTime(); }
  }
  const loadAtTime = (path, dependencies = {}) => load(path, dependencies, FixtureClock);
  const state = {
    customer: [{ id: "c1", userId: "u1", name: "Customer", email: "test@example.test", calendarRevision: 0 }],
    package: [{ id: "plan", name: "Lunch", category: { requiresVerification: false }, items: [] }],
    customerPackage: [{ id: "p1", customerId: "c1", orderId: "o1", packageId: "plan", quantity: 2,
      status: "ACTIVE", totalDeliveryDays: 5, usedDeliveryDays: 0, unrepresentedUsedDays: 0, customerPauseUsed: false,
      startDate: date("2026-10-19"), endDate: date("2026-10-23"), reminderEmailSentAt: null, createdAt: new Clock() }],
    order: [{ id: "o1", orderNumber: "CK-1", customerId: "c1", status: "ACCEPTED", foodPreferences: "", allergies: "" }],
    payment: [{ id: "pay1", orderId: "o1", status: "PAID" }],
    packageDeliveryDay: [], pauseRequest: [], businessHoliday: [], holidayDeliveryCredit: [],
    studentVerification: [], auditLog: [], notification: [], orderItem: [], address: [], manualDelivery: [],
  };
  const trace = [];
  let nextId = 1;
  let transaction = 0;
  let queue = Promise.resolve();
  const hooks = {};
  function relation(table, row, key) {
    const one = (name, id) => ({ table: name, rows: state[name].filter((item) => item.id === id), many: false });
    const many = (name, foreignKey, id = row.id) => ({ table: name, rows: state[name].filter((item) => item[foreignKey] === id), many: true });
    if (key === "customer") return one("customer", row.customerId);
    if (key === "order") return one("order", row.orderId);
    if (key === "package") return one("package", row.packageId);
    if (key === "customerPackage") return one("customerPackage", row.customerPackageId);
    if (key === "businessHoliday") return one("businessHoliday", row.businessHolidayId);
    if (key === "deliveryDays") return many("packageDeliveryDay", "customerPackageId");
    if (key === "pauseRequests") return many("pauseRequest", "customerPackageId");
    if (key === "holidayCredits") return many("holidayDeliveryCredit", "customerPackageId");
    if (key === "credits") return many("holidayDeliveryCredit", "businessHolidayId");
    if (key === "customerPackages") return many("customerPackage", "orderId");
    if (key === "packages") return many("customerPackage", "customerId");
    if (key === "payments") return many("payment", "orderId");
    if (key === "studentVerifications") return many("studentVerification", table === "order" ? "orderId" : "customerId");
    if (key === "addresses") return many("address", "customerId");
    return null;
  }
  const equal = (a, b) => a instanceof Date || b instanceof Date ? a?.getTime?.() === b?.getTime?.() : a === b;
  function matches(table, row, where = {}) {
    return Object.entries(where).every(([key, value]) => {
      if (value === undefined) return true;
      if (key === "OR") return value.some((item) => matches(table, row, item));
      if (key === "AND") return value.every((item) => matches(table, row, item));
      const related = relation(table, row, key);
      if (related) return value.some ? related.rows.some((item) => matches(related.table, item, value.some))
        : related.rows.some((item) => matches(related.table, item, value));
      const actual = row[key];
      if (value && typeof value === "object" && !(value instanceof Date)) {
        return Object.entries(value).every(([op, expected]) => {
          if (op === "in") return expected.includes(actual);
          if (op === "notIn") return !expected.includes(actual);
          if (op === "not") return !equal(actual, expected);
          if (op === "gte") return actual >= expected;
          if (op === "lte") return actual <= expected;
          if (op === "gt") return actual > expected;
          if (op === "lt") return actual < expected;
          throw new Error(`Unhandled fixture operator: ${op}`);
        });
      }
      return equal(actual, value);
    });
  }
  function project(table, row, args = {}) {
    const result = args.select ? {} : structuredClone(row);
    for (const [key, spec] of Object.entries(args.select ?? args.include ?? {})) {
      if (!spec) continue;
      const related = relation(table, row, key);
      result[key] = related ? (related.many
        ? query(related.table, spec === true ? {} : spec, related.rows)
        : query(related.table, spec === true ? {} : spec, related.rows)[0] ?? null)
        : structuredClone(row[key]);
    }
    return result;
  }
  function query(table, args = {}, rows = state[table]) {
    const found = rows.filter((row) => matches(table, row, args.where));
    for (const order of (Array.isArray(args.orderBy) ? [...args.orderBy].reverse() : [args.orderBy])) {
      if (!order) continue;
      const [key, direction] = Object.entries(order)[0];
      found.sort((a, b) => (a[key] > b[key] ? 1 : a[key] < b[key] ? -1 : 0) * (direction === "desc" ? -1 : 1));
    }
    return found.slice(0, args.take ?? found.length).map((row) => project(table, row, args));
  }
  const db = {};
  for (const table of Object.keys(state)) {
    db[table] = {};
    for (const operation of ["findUnique", "findFirst", "findMany", "create", "createMany", "update", "updateMany", "deleteMany"]) {
      db[table][operation] = async (args = {}) => {
        trace.push({ table, operation, args: structuredClone(args), transaction });
        if (operation.startsWith("find")) {
          const rows = query(table, args);
          return operation === "findMany" ? rows : rows[0] ?? null;
        }
        if (operation.startsWith("create")) {
          const rows = (Array.isArray(args.data) ? args.data : [args.data]).map((data) => ({
            id: `new-${nextId++}`, createdAt: new FixtureClock(), status: "ACTIVE", ...structuredClone(data),
          }));
          state[table].push(...rows);
          return operation === "createMany" ? { count: rows.length } : project(table, rows[0], args);
        }
        const rows = state[table].filter((row) => matches(table, row, args.where));
        if (operation === "deleteMany") {
          state[table] = state[table].filter((row) => !rows.includes(row));
          return { count: rows.length };
        }
        if (operation === "update" && !rows.length) throw new Error(`Missing ${table}`);
        for (const row of rows) for (const [key, value] of Object.entries(args.data)) {
          if (value === undefined) continue;
          row[key] = value?.increment !== undefined ? row[key] + value.increment : structuredClone(value);
        }
        if (table === "customer" && args.data.calendarRevision) await hooks.onLock?.(args.where.id, state);
        return operation === "updateMany" ? { count: rows.length } : project(table, rows[0], args);
      };
    }
  }
  db.$transaction = (callback, options) => {
    assert.equal(typeof callback, "function", "Schedule writes require an interactive transaction");
    assert.equal(options?.isolationLevel, "ReadCommitted");
    const run = queue.then(async () => {
      const before = structuredClone(state);
      transaction += 1;
      trace.push({ operation: "transaction", options, transaction });
      try { return await callback(db); } catch (error) { Object.assign(state, before); throw error; }
    });
    queue = run.catch(() => {});
    return run;
  };
  const emails = [];
  const dependencies = {
    "server-only": {}, zod: { z }, "@prisma/client": {}, "next/cache": { revalidatePath() {} },
    "@/lib/db": { db }, "@/lib/package-schedule": loadAtTime("../src/lib/package-schedule.ts"),
    "@/lib/business-rules": { getBusinessRules: async () => rules },
    "@/lib/auth": { getCurrentSession: async () => ({ user: { id: "u1", role: "ADMIN" } }) },
    "@/lib/action-result": { ok: (data, message) => ({ success: true, data, message }), fail: (error) => ({ success: false, error }) },
    "@/lib/app-url": {}, "@/lib/custom-package": {}, "@/lib/package-cart": { MAX_CUSTOM_ITEM_QUANTITY: 100 },
    "@/lib/order-totals": {}, "@/lib/server/coupons": {}, "@/lib/stripe": {},
    "@/lib/mock-data": {}, "@/lib/page-backgrounds": {}, "@/lib/seo-core.mjs": {},
    "@/lib/email/template-overrides": {}, "@/lib/email/template-registry": {},
    "@/lib/server/data-source": { hasDatabaseUrl: () => true, shouldUseMockData: () => false },
    "@/lib/server/admin": { getAdminSettings: async () => ({ packageReminderEmails: true, packageCompletedEmails: true }) },
    "@/lib/email/notifications": { sendOrderPaidEmails: async () => emails.push("paid"), sendVerificationDecisionEmail: async () => emails.push("verified") },
    "@/lib/email/templates": Object.fromEntries(["createOrderCancelledEmail", "createPauseExpiryReminderEmail", "createRenewalReminderEmail", "createSubscriptionEndedEmail"].map((key) => [key, async (value) => value])),
    "@/lib/email/send": { sendTransactionalEmail: async (value) => { emails.push(value); await hooks.onEmail?.(value, state); return { sent: true }; } },
  };
  dependencies["@/lib/server/calendar-lock"] = loadAtTime("../src/lib/server/calendar-lock.ts", dependencies);
  const adjustments = loadAtTime("../src/lib/server/delivery-schedule-adjustments.ts", dependencies);
  dependencies["@/lib/server/delivery-schedule-adjustments"] = adjustments;
  const pauses = loadAtTime("../src/lib/server/package-pause.ts", dependencies);
  dependencies["@/lib/server/package-pause"] = pauses;
  const checkout = loadAtTime("../src/lib/server/checkout.ts", dependencies);
  dependencies["@/lib/server/checkout"] = checkout;
  const admin = loadAtTime("../src/lib/actions/admin.ts", dependencies);
  const catalog = loadAtTime("../src/lib/server/catalog.ts", dependencies);
  const cron = loadAtTime("../src/app/api/cron/package-emails/route.ts", dependencies);
  const day = (id, dayDate, status = "PREPARING", customerPackageId = "p1") => {
    const row = { id, customerPackageId, deliveryDate: date(dayDate), status, menuSummary: "Lunch", deliveryWindow: rules.deliveryWindow };
    state.packageDeliveryDay.push(row);
    return row;
  };
  return { state, db, hooks, trace, emails, day, adjustments, pauses, checkout, admin, catalog, cron,
    setNow: (value) => { currentInstant = value; } };
}

function assertLockedFreshReads(s) {
  for (const event of s.trace.filter((item) => item.operation === "transaction")) {
    const operations = s.trace.filter((item) => item.transaction === event.transaction && item.operation !== "transaction");
    const lock = operations.findIndex((item) => item.table === "customer" && item.operation === "update");
    assert.ok(lock >= 0, "Transaction should lock its calendar");
    for (const operation of operations.slice(0, lock)) {
      assert.equal(operation.table, "customerPackage");
      assert.deepEqual(operation.args.select, { customerId: true }, "Only owner lookup may precede lock");
    }
  }
}

test("admin pause preserves sparse usage, delivered/missed/holiday history and today's outbound day", async () => {
  const s = fixture();
  s.state.customerPackage[0].usedDeliveryDays = 3;
  s.day("delivered", "2026-10-16", "DELIVERED");
  s.day("holiday-original", "2026-10-21", "CANCELLED");
  s.day("missed", "2026-10-22", "DECLINED");
  s.day("outbound", "2026-10-19", "OUT_FOR_DELIVERY");
  s.day("today", "2026-10-19");
  s.day("future", "2026-10-23");
  const result = await s.pauses.pausePackage({ customerPackageId: "p1" });
  assert.equal(result.remainingDays, 2);
  assert.equal(s.state.customerPackage[0].usedDeliveryDays, 3);
  assert.equal(s.state.customerPackage[0].unrepresentedUsedDays, 2);
  assert.deepEqual(s.state.packageDeliveryDay.map((day) => day.status), ["DELIVERED", "CANCELLED", "DECLINED", "OUT_FOR_DELIVERY", "PAUSED", "PAUSED"]);
  assertLockedFreshReads(s);
});

test("resume subtracts retained outbound credit and preserves customer pause and holiday references", async () => {
  const s = fixture();
  s.state.customerPackage[0].usedDeliveryDays = 3;
  s.day("delivered", "2026-10-16", "DELIVERED");
  s.day("outbound", "2026-10-19", "OUT_FOR_DELIVERY");
  s.day("holiday-original", "2026-10-21", "CANCELLED");
  s.day("pending", "2026-10-23");
  s.state.pauseRequest.push({ id: "scheduled", customerPackageId: "p1", status: "ACTIVE", startDate: date("2026-10-20"), endDate: date("2026-10-20"), createdAt: date("2026-10-01") });
  s.state.businessHoliday.push({ id: "h1", status: "ACTIVE", startDate: date("2026-10-21"), endDate: date("2026-10-21") });
  await s.pauses.pausePackage({ customerPackageId: "p1" });
  await s.pauses.resumePackage("p1");
  assert.equal(s.state.pauseRequest.find((row) => row.id === "scheduled").status, "ACTIVE");
  assert.equal(s.state.packageDeliveryDay.find((row) => row.id === "holiday-original").status, "CANCELLED");
  const generated = s.state.packageDeliveryDay.filter((row) => row.id.startsWith("new-"));
  assert.deepEqual(generated.map((row) => schedule.dateToInput(row.deliveryDate)), ["2026-10-22"]);
  assert.equal(s.state.customerPackage[0].usedDeliveryDays, 3);
  assertLockedFreshReads(s);
});

test("pause sees status committed while waiting on the calendar lock", async () => {
  const s = fixture();
  s.hooks.onLock = () => { s.state.customerPackage[0].status = "CANCELLED"; };
  await assert.rejects(s.pauses.pausePackage({ customerPackageId: "p1" }), /Only an active/);
  assert.equal(s.trace.some((row) => row.table === "packageDeliveryDay" && row.operation === "updateMany"), false);
});

test("sparse history plus an outbound day elapsed while paused consumes its credit on resume", async () => {
  const s = fixture();
  s.state.customerPackage[0].usedDeliveryDays = 3;
  s.day("historic-row", "2026-10-16", "DELIVERED");
  s.day("outbound", "2026-10-19", "OUT_FOR_DELIVERY");
  s.day("future", "2026-10-21");
  await s.pauses.pausePackage({ customerPackageId: "p1" });
  assert.equal(s.state.customerPackage[0].unrepresentedUsedDays, 2);
  s.setNow("2026-10-20T20:00:00Z");
  assert.equal((await s.catalog.getCustomerPackageSummaries())[0].usedDeliveryDays, 4);
  const result = await s.pauses.resumePackage("p1");
  assert.equal(result.remainingDays, 1);
  assert.equal(s.state.customerPackage[0].usedDeliveryDays, 4);
  assert.equal(s.state.customerPackage[0].unrepresentedUsedDays, 2);
  assert.equal(s.state.packageDeliveryDay.filter((row) => row.status === "PREPARING").length, 1);
  assertLockedFreshReads(s);
});

test("resume preserves a manual missed-day counter decrease without reviving sparse historical usage", async () => {
  const s = fixture();
  s.state.customerPackage[0].usedDeliveryDays = 3;
  const corrected = s.day("historic-row", "2026-10-16", "DELIVERED");
  s.day("outbound", "2026-10-19", "OUT_FOR_DELIVERY");
  await s.pauses.pausePackage({ customerPackageId: "p1" });
  s.setNow("2026-10-20T20:00:00Z");
  // The parent planner persists offset + elapsedAfter: 2 + 1, down from 4.
  corrected.status = "DECLINED";
  s.state.customerPackage[0].usedDeliveryDays = 3;
  s.day("manual-makeup", "2026-10-21");
  const result = await s.pauses.resumePackage("p1");
  assert.equal(result.remainingDays, 2);
  assert.equal(s.state.customerPackage[0].usedDeliveryDays, 3);
  assert.equal(s.state.customerPackage[0].unrepresentedUsedDays, 2);
  assert.equal(s.state.packageDeliveryDay.filter((row) => row.status === "PREPARING").length, 2);
  assert.equal(corrected.status, "DECLINED");
});

test("pause does not shrink a persisted historical offset when more rows have elapsed", async () => {
  const s = fixture();
  Object.assign(s.state.customerPackage[0], { usedDeliveryDays: 3, unrepresentedUsedDays: 2 });
  s.day("historic-row", "2026-10-15", "DELIVERED");
  s.day("newly-elapsed", "2026-10-16");
  await s.pauses.pausePackage({ customerPackageId: "p1" });
  assert.equal(s.state.customerPackage[0].usedDeliveryDays, 4);
  assert.equal(s.state.customerPackage[0].unrepresentedUsedDays, 2);
});

async function scheduledPauseFixture() {
  const s = fixture();
  s.day("original", "2026-10-20");
  s.day("normal", "2026-10-21");
  await s.adjustments.scheduleCustomerPause({ customerPackageId: "p1", requestedByUserId: "u1", startDateInput: "2026-10-20", endDateInput: "2026-10-20" });
  return s;
}

test("pause reset retires only recorded replacements, never a newer manual make-up", async () => {
  const s = await scheduledPauseFixture();
  const snapshot = s.state.auditLog[0].metadata;
  s.day("manual-makeup", "2026-10-30");
  await s.adjustments.resetScheduledCustomerPause("p1");
  assert.equal(s.state.packageDeliveryDay.find((row) => row.id === "manual-makeup").status, "PREPARING");
  assert.equal(s.state.packageDeliveryDay.find((row) => row.id === snapshot.replacements[0].id).status, "CANCELLED");
  assert.equal(s.state.packageDeliveryDay.find((row) => row.id === "original").status, "PREPARING");
  assert.equal(schedule.dateToInput(s.state.customerPackage[0].endDate), "2026-10-30");
  assert.equal(s.trace.some((row) => row.operation === "deleteMany"), false);
  assertLockedFreshReads(s);
});

for (const change of ["DELIVERED", "DECLINED", "moved", "missing-provenance"]) {
  test(`pause reset safely rejects ${change} replacement/provenance`, async () => {
    const s = await scheduledPauseFixture();
    const replacement = s.state.packageDeliveryDay.find((row) => row.id === s.state.auditLog[0].metadata.replacements[0].id);
    if (change === "missing-provenance") s.state.auditLog = [];
    else if (change === "moved") replacement.deliveryDate = date("2026-10-30");
    else replacement.status = change;
    const before = structuredClone(s.state.packageDeliveryDay);
    await assert.rejects(s.adjustments.resetScheduledCustomerPause("p1"), /manually/);
    assert.deepEqual(s.state.packageDeliveryDay, before);
  });
}

async function holidayFixture() {
  const s = fixture();
  s.day("original", "2026-10-20");
  const result = await s.adjustments.createKitchenHoliday({ name: "Closed", startDateInput: "2026-10-20", endDateInput: "2026-10-20", createdByUserId: "u1" });
  return { ...s, holidayId: result.id };
}

test("holiday creation excludes missed, completed and outbound days and locks only eligible owners", async () => {
  const s = fixture();
  s.state.customer.push({ id: "historical", calendarRevision: 0 });
  s.state.customerPackage.push({ ...s.state.customerPackage[0], id: "old", customerId: "historical", status: "EXPIRED" });
  for (const status of ["DECLINED", "DELIVERED", "OUT_FOR_DELIVERY", "PENDING_PAYMENT"]) s.day(status, "2026-10-20", status);
  s.day("eligible", "2026-10-20");
  const result = await s.adjustments.createKitchenHoliday({ name: "Closed", startDateInput: "2026-10-20", endDateInput: "2026-10-20", createdByUserId: "u1" });
  assert.equal(result.creditedDeliveries, 1);
  for (const status of ["DECLINED", "DELIVERED", "OUT_FOR_DELIVERY", "PENDING_PAYMENT"]) assert.equal(s.state.packageDeliveryDay.find((row) => row.id === status).status, status);
  assert.equal(s.state.customer.find((row) => row.id === "historical").calendarRevision, 0);
  assert.equal(s.trace.find((row) => row.operation === "transaction").options.timeout, 30_000);
  assertLockedFreshReads(s);
});

test("holiday cancellation retains original/replacement/credit history", async () => {
  const s = await holidayFixture();
  const credit = s.state.holidayDeliveryCredit[0];
  await s.adjustments.cancelKitchenHoliday(s.holidayId);
  assert.equal(s.state.packageDeliveryDay.find((row) => row.id === credit.originalDeliveryDayId).status, "PREPARING");
  assert.equal(s.state.packageDeliveryDay.find((row) => row.id === credit.replacementDeliveryDayId).status, "CANCELLED");
  assert.equal(s.state.holidayDeliveryCredit.length, 1);
  assert.equal(s.state.businessHoliday[0].status, "ARCHIVED");
  assertLockedFreshReads(s);
});

for (const change of ["DELIVERED", "DECLINED", "OUT_FOR_DELIVERY", "moved", "missing", "paused-package"]) {
  test(`holiday undo refuses a ${change} replacement/package without restoring originals`, async () => {
    const s = await holidayFixture();
    const replacement = s.state.packageDeliveryDay.find((row) => row.id === s.state.holidayDeliveryCredit[0].replacementDeliveryDayId);
    if (change === "moved") replacement.deliveryDate = date("2026-10-30");
    else if (change === "missing") s.state.packageDeliveryDay = s.state.packageDeliveryDay.filter((row) => row !== replacement);
    else if (change === "paused-package") s.state.customerPackage[0].status = "PAUSED";
    else replacement.status = change;
    await assert.rejects(s.adjustments.cancelKitchenHoliday(s.holidayId), /manually/);
    assert.equal(s.state.packageDeliveryDay.find((row) => row.id === "original").status, "CANCELLED");
    assert.equal(s.state.businessHoliday[0].status, "ACTIVE");
  });
}

test("order cancellation preserves delivered, missed, elapsed and outbound rows", async () => {
  const s = fixture();
  s.day("delivered", "2026-10-19", "DELIVERED");
  s.day("missed", "2026-10-16", "DECLINED");
  s.day("elapsed", "2026-10-16");
  s.day("outbound", "2026-10-19", "OUT_FOR_DELIVERY");
  s.day("future", "2026-10-20");
  const result = await s.admin.cancelOrderAction("o1");
  assert.equal(result.success, true, result.error);
  assert.deepEqual(s.state.packageDeliveryDay.map((row) => row.status), ["DELIVERED", "DECLINED", "PREPARING", "OUT_FOR_DELIVERY", "CANCELLED"]);
  assertLockedFreshReads(s);
});

test("concurrent payment activation is idempotent and ignored unpaid history never suppresses a schedule", async () => {
  const s = fixture();
  s.state.order[0].status = "PENDING_PAYMENT";
  s.state.customerPackage[0].status = "PENDING_PAYMENT";
  s.state.payment[0].status = "PENDING";
  s.state.manualDelivery.push({ id: "unallocated", customerId: "c1", packageDeliveryDayId: null, deliveryDate: date("2026-10-19") });
  s.day("ignored", "2026-10-20", "PENDING_PAYMENT");
  await Promise.all([s.checkout.markOrderPaidAndActivate("o1"), s.checkout.markOrderPaidAndActivate("o1")]);
  assert.equal(s.state.packageDeliveryDay.filter((row) => row.status === "PREPARING").length, 5);
  assert.equal(s.emails.length, 1);
  assert.equal(schedule.dateToInput(s.state.customerPackage[0].startDate), "2026-10-19", "Keep original activation start-date policy");
  assertLockedFreshReads(s);
});

test("payment activation fresh-reads a cancellation made while waiting on the lock", async () => {
  const s = fixture();
  s.state.order[0].status = "PENDING_PAYMENT";
  s.state.customerPackage[0].status = "PENDING_PAYMENT";
  s.hooks.onLock = () => { s.state.order[0].status = "DECLINED"; };
  await s.checkout.markOrderPaidAndActivate("o1");
  assert.equal(s.state.packageDeliveryDay.length, 0);
  assert.equal(s.emails.length, 0);
});

test("activation persists historical offset and counts generated days already elapsed", async () => {
  const s = fixture();
  s.state.order[0].status = "PENDING_PAYMENT";
  Object.assign(s.state.customerPackage[0], { status: "PENDING_PAYMENT", usedDeliveryDays: 2, startDate: date("2026-10-16") });
  await s.checkout.markOrderPaidAndActivate("o1");
  assert.equal(s.state.customerPackage[0].unrepresentedUsedDays, 2);
  assert.equal(s.state.customerPackage[0].usedDeliveryDays, 3);
  assert.equal(s.state.packageDeliveryDay.length, 3);
  s.setNow("2026-10-21T20:00:00Z");
  assert.equal((await s.catalog.getCustomerPackageSummaries())[0].usedDeliveryDays, 5);
});

test("multi-customer activation locks each owner once in sorted order", async () => {
  const s = fixture();
  s.state.order[0].status = "PENDING_PAYMENT";
  s.state.customerPackage[0].status = "PENDING_PAYMENT";
  s.state.customer.push({ id: "c0", calendarRevision: 0 });
  s.state.customerPackage.push({ ...s.state.customerPackage[0], id: "p2", customerId: "c0" });
  await s.checkout.markOrderPaidAndActivate("o1");
  assert.deepEqual(s.trace.filter((row) => row.table === "customer" && row.operation === "update").map((row) => row.args.where.id), ["c0", "c1"]);
});

test("approval before payment does not strand a later paid student package", async () => {
  const s = fixture();
  s.state.customerPackage[0].status = "PENDING_PAYMENT";
  s.state.order[0].status = "PENDING_PAYMENT";
  s.state.payment[0].status = "PENDING";
  s.state.package[0].category.requiresVerification = true;
  s.state.studentVerification.push({ id: "v1", customerId: "c1", orderId: "o1", status: "PENDING" });
  assert.equal((await s.admin.approveStudentVerificationAction("v1")).success, true);
  assert.equal(s.state.packageDeliveryDay.length, 0);
  await s.checkout.markOrderPaidAndActivate("o1");
  assert.equal(s.state.customerPackage[0].status, "ACTIVE");
  assert.equal(s.state.packageDeliveryDay.length, 5);
});

for (const paid of [true, false]) {
  test(`student approval ${paid ? "allocates only remaining" : "does not allocate unpaid"} credits`, async () => {
    const s = fixture();
    s.state.customerPackage[0].status = "PENDING_STUDENT_VERIFICATION";
    s.state.customerPackage[0].usedDeliveryDays = 2;
    s.state.payment[0].status = paid ? "PAID" : "PENDING";
    s.state.studentVerification.push({ id: "v1", customerId: "c1", orderId: "o1", status: "PENDING" });
    s.day("manual", "2026-10-16", "DELIVERED");
    const result = await s.admin.approveStudentVerificationAction("v1");
    assert.equal(result.success, true, result.error);
    assert.equal(s.state.packageDeliveryDay.filter((row) => row.status === "PREPARING").length, paid ? 3 : 0);
    assert.equal(s.state.packageDeliveryDay[0].status, "DELIVERED");
    assert.equal(s.state.customerPackage[0].usedDeliveryDays, 2);
    assert.equal(s.state.customerPackage[0].unrepresentedUsedDays, paid ? 1 : 0);
    assertLockedFreshReads(s);
  });
}

test("student approval rechecks cancellation under lock", async () => {
  const s = fixture();
  s.state.studentVerification.push({ id: "v1", customerId: "c1", orderId: "o1", status: "PENDING" });
  s.hooks.onLock = () => { s.state.order[0].status = "CANCELLED"; };
  const result = await s.admin.approveStudentVerificationAction("v1");
  assert.equal(result.success, false);
  assert.match(result.error, /cancelled/);
  assert.equal(s.state.studentVerification[0].status, "PENDING");
});

test("packing shows active packages for the next eligible date with explicit quantity/status", async () => {
  const s = fixture();
  s.day("missed", "2026-10-19", "DECLINED");
  s.day("unpaid", "2026-10-19", "PENDING_PAYMENT");
  s.day("next", "2026-10-20");
  s.state.customerPackage.push({ ...s.state.customerPackage[0], id: "later" }, { ...s.state.customerPackage[0], id: "paused", status: "PAUSED" });
  s.day("later-day", "2026-10-21", "PREPARING", "later");
  s.day("paused-day", "2026-10-19", "PREPARING", "paused");
  const result = await s.catalog.getAdminPackagingRecord("c1");
  assert.deepEqual(result.packages.map((row) => [row.id, row.quantity, row.status]), [["p1", 2, "Active"]]);
  const upcoming = await s.catalog.getUpcomingDeliveries();
  assert.deepEqual(upcoming.map((row) => row.id), ["next", "later-day"]);
});

test("packing progress includes sparse history plus newly elapsed rows", async () => {
  const s = fixture();
  Object.assign(s.state.customerPackage[0], { usedDeliveryDays: 2, unrepresentedUsedDays: 2 });
  s.day("elapsed", "2026-10-16");
  s.day("next", "2026-10-20");
  const result = await s.catalog.getAdminPackagingRecord("c1");
  assert.equal(result.packages[0].deliveryProgress, "3 of 5 delivery days used");
});

const cronRequest = () => new Request("https://test.invalid/cron", { headers: { authorization: "Bearer fixture-secret" } });
async function runCron(s) {
  const previous = process.env.CRON_SECRET;
  process.env.CRON_SECRET = "fixture-secret";
  try { return await (await s.cron.GET(cronRequest())).json(); }
  finally { if (previous === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = previous; }
}

test("cron does not expire a package whose end date was extended under its lock", async () => {
  const s = fixture();
  s.state.customerPackage[0].endDate = date("2026-10-16");
  s.hooks.onLock = () => { s.state.customerPackage[0].endDate = date("2026-10-30"); };
  const result = await runCron(s);
  assert.equal(result.expired, 0);
  assert.equal(s.state.customerPackage[0].status, "ACTIVE");
  assertLockedFreshReads(s);
});

test("cron expiration deduplicates and includes the actual end date in the email key", async () => {
  const s = fixture();
  s.state.customerPackage[0].endDate = date("2026-10-16");
  assert.equal((await runCron(s)).expired, 1);
  assert.equal((await runCron(s)).expired, 0);
  assert.equal(s.emails.length, 1);
  assert.match(s.emails[0].idempotencyKey, /subscription-ended\/p1\/2026-10-16T18:00:00.000Z$/);
});

test("renewal reminder never stamps an end date changed while email is in flight", async () => {
  const s = fixture();
  s.state.customerPackage[0].endDate = date("2026-10-21");
  s.hooks.onEmail = () => { s.state.customerPackage[0].endDate = date("2026-10-30"); };
  const result = await runCron(s);
  assert.equal(result.remindersSent, 0);
  assert.equal(s.state.customerPackage[0].reminderEmailSentAt, null);
  assert.match(s.emails[0].idempotencyKey, /renewal-reminder\/p1\/2026-10-21T18:00:00.000Z$/);
});

test("cron does not expire a package resumed while waiting on the pause lock", async () => {
  const s = fixture();
  s.state.customerPackage[0].status = "PAUSED";
  s.state.pauseRequest.push({ id: "pause", customerPackageId: "p1", status: "ACTIVE", startDate: date("2026-09-01"), endDate: date("2026-10-16"), createdAt: date("2026-09-01") });
  s.hooks.onLock = () => { s.state.customerPackage[0].status = "ACTIVE"; s.state.customerPackage[0].endDate = date("2026-10-30"); };
  assert.equal((await runCron(s)).pausesExpired, 0);
  assert.equal(s.state.customerPackage[0].status, "ACTIVE");
});

test("pause reminder does not stamp after a pause deadline changes in flight", async () => {
  const s = fixture();
  s.state.customerPackage[0].status = "PAUSED";
  s.state.pauseRequest.push({ id: "pause", customerPackageId: "p1", status: "ACTIVE", startDate: date("2026-09-22"), endDate: date("2026-10-22"), createdAt: date("2026-09-22") });
  s.hooks.onEmail = () => { s.state.pauseRequest[0].endDate = date("2026-10-30"); };
  const result = await runCron(s);
  assert.equal(result.pauseRemindersSent, 0);
  assert.equal(s.state.customerPackage[0].reminderEmailSentAt, null);
  assert.match(s.emails[0].idempotencyKey, /pause-reminder\/p1\/pause\/2026-10-22T18:00:00.000Z$/);
});

test("pause expiry ends only the admin pause, retaining scheduled pause references", async () => {
  const s = fixture();
  s.state.customerPackage[0].status = "PAUSED";
  s.state.pauseRequest.push(
    { id: "scheduled", customerPackageId: "p1", status: "ACTIVE", startDate: date("2026-10-20"), endDate: date("2026-10-21"), createdAt: date("2026-09-01") },
    { id: "admin", customerPackageId: "p1", status: "ACTIVE", startDate: date("2026-09-16"), endDate: date("2026-10-16"), createdAt: date("2026-09-16") },
  );
  assert.equal((await runCron(s)).pausesExpired, 1);
  assert.equal(s.state.pauseRequest[0].status, "ACTIVE");
  assert.equal(s.state.pauseRequest[1].status, "ENDED");
  assert.match(s.emails[0].idempotencyKey, /pause-expired\/p1\/admin\/2026-10-16T18:00:00.000Z$/);
});

test("pause reminder uses persisted historical offset for newly elapsed outbound deliveries", async () => {
  const s = fixture();
  Object.assign(s.state.customerPackage[0], { status: "PAUSED", usedDeliveryDays: 3, unrepresentedUsedDays: 2 });
  s.day("historic", "2026-10-15", "DELIVERED");
  s.day("elapsed-outbound", "2026-10-16", "OUT_FOR_DELIVERY");
  s.state.pauseRequest.push({ id: "pause", customerPackageId: "p1", status: "ACTIVE", startDate: date("2026-09-22"), endDate: date("2026-10-22"), createdAt: date("2026-09-22") });
  assert.equal((await runCron(s)).pauseRemindersSent, 1);
  assert.equal(s.emails[0].email.remainingDays, 1);
});

test("cron expiry persists usage with the existing historical offset", async () => {
  const s = fixture();
  Object.assign(s.state.customerPackage[0], { usedDeliveryDays: 3, unrepresentedUsedDays: 2, endDate: date("2026-10-16") });
  s.day("historic", "2026-10-15", "DELIVERED");
  s.day("elapsed-outbound", "2026-10-16", "OUT_FOR_DELIVERY");
  assert.equal((await runCron(s)).expired, 1);
  assert.equal(s.state.customerPackage[0].usedDeliveryDays, 4);
  assert.equal(s.state.customerPackage[0].unrepresentedUsedDays, 2);
});
