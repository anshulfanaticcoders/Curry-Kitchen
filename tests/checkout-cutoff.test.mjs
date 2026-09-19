import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import { z } from "zod";
import * as schedule from "../src/lib/package-schedule.ts";
import { MAX_CUSTOM_ITEM_QUANTITY } from "../src/lib/package-cart.ts";

// Execute the real checkout entry point with a fixed server clock and read-only
// database doubles. Reaching catalog lookup proves the schedule gate passed.
function loadModule(path, dependencies, Clock = Date) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const exports = {};
  new Function("require", "exports", "Date", outputText)((id) => {
    assert.ok(Object.hasOwn(dependencies, id), `Unexpected dependency: ${id}`);
    return dependencies[id];
  }, exports, Clock);
  return exports;
}

const rules = loadModule("../src/lib/business-rules.ts", {
  "server-only": {}, "@/lib/db": {}, "@/lib/package-schedule": schedule,
});

function checkoutAt(instant, holidays = []) {
  class Clock extends Date {
    constructor(...args) { super(...(args.length ? args : [instant])); }
    static now() { return new Date(instant).getTime(); }
  }
  let catalogReached = false;
  const gatePassed = new Error("Schedule accepted; stop before order creation");
  const tx = {
    setting: { findUnique: async () => ({ value: { orderCutoff: "8 PM", deliveryWindowStart: "10:00", deliveryWindowEnd: "18:00" } }) },
    businessHoliday: { findMany: async () => holidays },
    package: { findMany: async () => { catalogReached = true; throw gatePassed; } },
  };
  const checkout = loadModule("../src/lib/server/checkout.ts", {
    "@prisma/client": {}, zod: { z },
    "@/lib/app-url": { getAppUrl: () => "http://localhost:3000" },
    "@/lib/auth": { getCurrentSession: async () => ({ user: { id: "customer-1" } }) },
    "@/lib/business-rules": { ...rules, isAfterOrderCutoff: schedule.isAfterOrderCutoff },
    "@/lib/db": { db: { $transaction: async (callback) => callback(tx) } },
    "@/lib/email/notifications": {}, "@/lib/package-schedule": schedule,
    "@/lib/custom-package": {}, "@/lib/package-cart": { MAX_CUSTOM_ITEM_QUANTITY },
    "@/lib/order-totals": {}, "@/lib/server/coupons": {},
    "@/lib/server/data-source": { shouldUseMockData: () => false },
    "@/lib/stripe": {}, "@/lib/server/delivery-schedule-adjustments": {},
  }, Clock);
  return { ...checkout, gatePassed, catalogReached: () => catalogReached };
}

const payload = (kind, startDate, paymentMethod) => ({
  items: [kind === "custom"
    ? { kind, cadence: "MONTHLY", items: [{ itemId: "dal", quantity: 8 }], startDate }
    : { kind, packageId: "regular", startDate }],
  customer: { name: "Test Customer", email: "test@example.com" },
  address: { line1: "123 Test Street", city: "San Diego", postalCode: "92101" },
  paymentMethod,
});

for (const kind of ["plan", "custom"]) {
  for (const paymentMethod of ["CREDIT_CARD", "DEBIT_CARD", "APPLE_PAY", "ZELLE"]) {
    test(`${kind}/${paymentMethod}: server rejects tomorrow at 8 PM before any catalog or payment writes`, async () => {
      const checkout = checkoutAt("2026-09-22T03:00:00Z");
      await assert.rejects(checkout.createCheckoutOrder(payload(kind, "2026-09-22", paymentMethod)), (error) => {
        assert.equal(error.code, "START_DATE_UNAVAILABLE");
        assert.equal(error.statusCode, 409);
        return true;
      });
      assert.equal(checkout.catalogReached(), false);
    });
  }
  for (const [instant, startDate] of [["2026-09-22T02:59:59Z", "2026-09-22"], ["2026-09-22T03:00:00Z", "2026-09-23"]]) {
    test(`${kind}: valid date ${startDate} passes server gate at ${instant}`, async () => {
      const checkout = checkoutAt(instant);
      await assert.rejects(checkout.createCheckoutOrder(payload(kind, startDate, "ZELLE")), (error) => error === checkout.gatePassed);
      assert.equal(checkout.catalogReached(), true);
    });
  }
}

test("server rejects a newly added holiday even if a stale browser offers it", async () => {
  const checkout = checkoutAt("2026-09-22T02:00:00Z", [{
    id: "holiday", name: "Kitchen closed", startDate: schedule.inputToDate("2026-09-22"), endDate: schedule.inputToDate("2026-09-23"), note: null,
  }]);
  await assert.rejects(checkout.createCheckoutOrder(payload("plan", "2026-09-22", "ZELLE")), { code: "START_DATE_UNAVAILABLE" });
  assert.equal(checkout.catalogReached(), false);
});
