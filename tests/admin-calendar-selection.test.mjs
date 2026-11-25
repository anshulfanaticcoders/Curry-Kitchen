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
const selection = load("../src/lib/admin-calendar-selection.ts", { "@/lib/admin-calendar-view": view, "@/lib/package-schedule": schedule });

function fixture() {
  const days = Array.from({ length: 22 }, (_, index) => {
    const date = schedule.dateToInput(schedule.addDays(schedule.inputToDate("2026-10-26"), index));
    return { id: date, date, status: "PREPARING" };
  });
  const item = { id: "oct", name: "Small", paid: true, status: "ACTIVE", verificationStatus: "APPROVED", orderStatus: "ACCEPTED",
    startDate: "2026-10-26", endDate: "2026-11-16", days, protectedDayIds: [], pauses: [] };
  return { packageId: "oct", data: { today: "2026-11-12", state: {
    packages: [item, { ...structuredClone(item), id: "nov" }], manualDeliveries: [], holidays: [], deliveryWeekdays: [1, 2, 3, 4, 5],
  } } };
}

test("cross-month range is inclusive, excludes weekends/future days and never mutates packages", () => {
  const context = fixture();
  const original = structuredClone(context);
  const result = selection.selectCalendarRange(context, "2026-10-29", "2026-11-16");
  assert.deepEqual(result.dates, ["2026-10-29", "2026-10-30", "2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06", "2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12"]);
  assert.equal(result.excluded, 8);
  assert.deepEqual(context, original);
});

test("range excludes holidays, pauses, protected adjustments, inactive and ambiguous dates", () => {
  const context = fixture();
  const item = context.data.state.packages[0];
  context.data.state.holidays = [{ startDate: "2026-11-02", endDate: "2026-11-03" }];
  item.pauses = [{ startDate: "2026-11-04", endDate: "2026-11-04", status: "ENDED" }];
  item.protectedDayIds = ["2026-11-05"];
  item.days.find((day) => day.date === "2026-11-06").status = "CANCELLED";
  item.days.find((day) => day.date === "2026-11-09").status = "PAUSED";
  item.days.find((day) => day.date === "2026-11-10").status = "PENDING_PAYMENT";
  item.days.push({ id: "duplicate", date: "2026-11-11", status: "PREPARING" });
  assert.deepEqual(selection.selectCalendarRange(context, "2026-11-02", "2026-11-12").dates, ["2026-11-12"]);
});

test("a range never selects another purchase's dates or dates outside this period", () => {
  const context = fixture();
  context.data.state.packages[0].days = context.data.state.packages[0].days.filter((day) => day.date !== "2026-11-02");
  context.data.state.packages[0].endDate = "2026-11-04";
  assert.deepEqual(selection.selectCalendarRange(context, "2026-11-02", "2026-11-05").dates, ["2026-11-03", "2026-11-04"]);
});

test("recorded delivered and missed dates remain selectable for corrections", () => {
  const context = fixture();
  context.data.state.packages[0].days[0].status = "DELIVERED";
  context.data.state.packages[0].days[1].status = "DECLINED";
  assert.equal(selection.selectCalendarRange(context, "2026-10-26", "2026-10-27").dates.length, 2);
});

test("unpaid, unverified, cancelled and unrestored packages are excluded", () => {
  for (const change of [{ paid: false }, { verificationStatus: "PENDING" }, { status: "PENDING_STUDENT_VERIFICATION" }, { orderStatus: "CANCELLED" }]) {
    const context = fixture();
    Object.assign(context.data.state.packages[0], change);
    assert.match(selection.selectCalendarRange(context, "2026-10-26", "2026-11-02").error, /No eligible/);
  }
  const context = fixture();
  context.packageId = "missing";
  assert.equal(selection.selectCalendarRange(context, "2026-10-26", "2026-10-26").dates.length, 0);
});

test("range validates empty, invalid and reversed dates without selecting anything", () => {
  for (const [from, to] of [["", ""], ["2026-02-30", "2026-03-02"], ["2026-11-04", "2026-11-01"], ["2026-01-01", "2027-02-01"]]) {
    const result = selection.selectCalendarRange(fixture(), from, to);
    assert.ok(result.error);
    assert.deepEqual(result.dates, []);
  }
});

test("range and individual selection respect the existing 62-date bulk limit", () => {
  const context = fixture();
  context.renewalPending = true;
  context.data.today = "2027-08-01";
  const result = selection.selectCalendarRange(context, "2027-01-01", "2027-07-01");
  assert.match(result.error, /62/);
  assert.deepEqual(result.dates, []);
  const dates = Array.from({ length: 62 }, (_, i) => schedule.dateToInput(schedule.addDays(schedule.inputToDate("2027-01-01"), i)));
  assert.deepEqual(selection.toggleCalendarDate(dates, "2027-07-01"), dates);
  assert.equal(selection.toggleCalendarDate(dates, dates[0]).length, 61);
});

test("individual exceptions are sorted, reversible and do not mutate the input", () => {
  const dates = ["2026-10-30", "2026-11-02"];
  assert.deepEqual(selection.toggleCalendarDate(dates, "2026-10-29"), ["2026-10-29", ...dates]);
  assert.deepEqual(selection.toggleCalendarDate(dates, "2026-11-02"), ["2026-10-30"]);
  assert.deepEqual(dates, ["2026-10-30", "2026-11-02"]);
});

test("renewal ranges select past days after the source period without consuming other packages", () => {
  const context = fixture();
  context.renewalPending = true;
  context.data.state.packages[0].endDate = "2026-10-30";
  context.data.state.packages[0].days = context.data.state.packages[0].days.filter((day) => day.date <= "2026-10-30");
  context.data.state.manualDeliveries = [{ sourcePackageId: "nov", date: "2026-10-29", treatment: "AWAITING_RENEWAL" }];
  assert.deepEqual(selection.selectCalendarRange(context, "2026-10-29", "2026-11-02").dates, ["2026-11-02"]);
});

test("without-renewal ranges work before a first purchase, but cannot select another customer's purchase", () => {
  const context = fixture();
  context.renewalPending = true;
  context.data.state.packages = [];
  delete context.packageId;
  assert.deepEqual(selection.selectCalendarRange(context, "2026-11-06", "2026-11-09").dates, ["2026-11-06", "2026-11-09"]);
  assert.deepEqual(selection.selectCalendarRange({ ...context, packageId: "foreign" }, "2026-11-06", "2026-11-09").dates, []);
  assert.deepEqual(selection.selectCalendarRange({ ...context, renewalPending: false }, "2026-11-06", "2026-11-09").dates, []);
});

test("month grids always have six rows, handle leap days and cross years", () => {
  assert.equal(selection.calendarMonthCells("2028-02-01").length, 42);
  assert.ok(selection.calendarMonthCells("2028-02-01").includes("2028-02-29"));
  assert.equal(selection.calendarMonthCells("2026-02-01").filter(Boolean).length, 28);
  assert.equal(selection.calendarMonthCells("2026-11-01")[0], "2026-11-01");
  assert.equal(selection.shiftCalendarMonth("2026-12-31", 1), "2027-01-01");
  assert.equal(selection.shiftCalendarMonth("2027-01-01", -1), "2026-12-01");
});
