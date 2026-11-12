import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import { z } from "zod";
function load(path, dependencies = {}) {
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  new Function("require", "exports", code)((id) => { assert.ok(Object.hasOwn(dependencies, id), id); return dependencies[id]; }, exports);
  return exports;
}
const schedule = load("../src/lib/package-schedule.ts");
const planner = load("../src/lib/calendar-management.ts", { zod: { z }, "@/lib/package-schedule": schedule });
const view = load("../src/lib/admin-calendar-view.ts", { "@/lib/calendar-management": planner });
const item = { id: "a", status: "ACTIVE", paid: true, verificationStatus: "APPROVED", orderStatus: "ACCEPTED", usedDeliveryDays: 0, days: [], pauses: [], protectedDayIds: [] };

test("purchase calendar shows only the selected purchase, retaining shared kitchen holidays", () => {
  const calendar = { packages: [{ id: "a", name: "Small Package" }, { id: "b", name: "Small Package" }], events: [
    { packageId: "a", type: "delivery" }, { packageId: "b", type: "delivery" },
    { packageId: "a", manualDeliveryId: "pending-a", type: "delivery-unallocated" },
    { packageId: "b", manualDeliveryId: "pending-b", type: "delivery-unallocated" }, { type: "holiday" },
  ] };
  const original = structuredClone(calendar);
  assert.deepEqual(view.purchaseCalendar(calendar, item).events, [calendar.events[0], calendar.events[4]]);
  assert.deepEqual(view.purchaseCalendar(calendar, item, true).events, [calendar.events[2], calendar.events[4]]);
  assert.deepEqual(view.purchaseCalendar(calendar, item).packages.map((entry) => entry.id), ["a"]);
  assert.deepEqual(calendar, original);
});

test("payment, approval and schedule readiness remain separate states", () => {
  for (const [fields, label, editable] of [
    [{}, "Active", true], [{ status: "EXPIRED" }, "Ended", true], [{ status: "PAUSED" }, "Paused", true],
    [{ paid: false }, "Awaiting payment", false], [{ orderStatus: "CANCELLED" }, "Cancelled", false],
    [{ verificationStatus: "PENDING" }, "Awaiting verification", false], [{ verificationStatus: "REJECTED" }, "Verification rejected", false],
    [{ status: "PENDING_STUDENT_VERIFICATION" }, "Needs schedule review", false],
  ]) {
    assert.equal(view.calendarPackageStatus({ ...item, ...fields }), label);
    assert.equal(view.calendarPackageEditable({ ...item, ...fields }), editable);
  }
});

test("delivery dates are calendar dates, not Pacific-converted timestamps", () => {
  assert.equal(view.formatCalendarDate("2026-10-12"), "Oct 12, 2026");
  assert.equal(view.formatCalendarDate(null), "Not scheduled");
});

test("identical packages in one order have stable distinct labels in every sort order", () => {
  const purchases = [
    { ...item, id: "second", orderId: "order-a", orderNumber: "CK-1" },
    { ...item, id: "first", orderId: "order-a", orderNumber: "CK-1" },
    { ...item, id: "other", orderId: "order-b", orderNumber: "CK-2" },
  ];
  assert.equal(view.calendarPurchaseLabel(purchases, "first"), "CK-1 / Item 1");
  assert.equal(view.calendarPurchaseLabel([...purchases].reverse(), "second"), "CK-1 / Item 2");
  assert.equal(view.calendarPurchaseLabel(purchases, "other"), "CK-2");
  assert.equal(view.calendarPurchaseLabel(purchases, null), "Previous purchase not recorded");
  assert.equal(view.calendarPurchaseLabel([{ ...item, id: "legacy" }], "legacy"), "legacy");
});
