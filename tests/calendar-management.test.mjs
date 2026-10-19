import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import { z } from "zod";

function load(path, dependencies) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  new Function("require", "exports", code)((id) => {
    assert.ok(Object.hasOwn(dependencies, id), `Unexpected dependency ${id}`);
    return dependencies[id];
  }, exports);
  return exports;
}

// Keep the production date rules, but permit no server, database, or transport imports.
const schedule = load("../src/lib/package-schedule.ts", {});
const { calendarChangeSchema, calendarCompletedDays, calendarDayElapsed, isCountableCalendarDay, planCalendarChange } = load(
  "../src/lib/calendar-management.ts",
  { zod: { z }, "@/lib/package-schedule": schedule },
);
const NOW = new Date("2026-09-18T19:00:00Z");
const WINDOW = "10:00 AM - 6:00 PM";

function day(id, date, status = "PREPARING") {
  return { id, date, status, menuSummary: "Dal and rice", deliveryWindow: WINDOW };
}

function packageFixture(overrides = {}) {
  return {
    id: "package-1", name: "Monthly tiffin", status: "ACTIVE", paid: true, quantity: 1,
    totalDeliveryDays: 3, usedDeliveryDays: 0, startDate: "2026-09-21", endDate: "2026-09-23",
    customerPauseUsed: false, pauses: [], protectedDayIds: [],
    days: [day("day-first", "2026-09-21"), day("day-middle", "2026-09-22"), day("day-last", "2026-09-23")],
    ...overrides,
  };
}

function manual(overrides = {}) {
  return {
    id: "manual-1", date: "2026-09-17", label: "Regular tiffin", quantity: 1,
    treatment: "AWAITING_RENEWAL", packageDeliveryDayId: null, ...overrides,
  };
}

function stateFixture(overrides = {}) {
  return {
    customerId: "customer-1", revision: 7, packages: [packageFixture()], manualDeliveries: [],
    holidays: [], deliveryWeekdays: [1, 2, 3, 4, 5], deliveryWindow: WINDOW, ...overrides,
  };
}

function input(overrides = {}) {
  return {
    customerId: "customer-1", action: "assign-delivery", date: "2026-09-17",
    packageId: "package-1", manualDeliveryId: "manual-1", treatment: "PACKAGE",
    reason: "Correct the kitchen delivery record.", ...overrides,
  };
}

function plan(state, change, now = NOW) {
  const before = structuredClone(state);
  const originalInput = structuredClone(change);
  try {
    return planCalendarChange(state, change, now);
  } finally {
    assert.deepEqual(state, before, "planning must not mutate the input state, including on failure");
    assert.deepEqual(change, originalInput, "planning must not mutate its input command");
  }
}

function assignedFixture(overrides = {}) {
  return stateFixture({
    packages: [packageFixture({
      usedDeliveryDays: 1, startDate: "2026-09-17",
      days: [day("served", "2026-09-17", "DELIVERED"), day("day-middle", "2026-09-22"), day("day-last", "2026-09-23")],
      ...overrides,
    })],
    manualDeliveries: [manual({ treatment: "PACKAGE", packageDeliveryDayId: "served" })],
  });
}

for (const [label, overrides] of [
  ["unpaid", { paid: false }],
  ["awaiting payment", { status: "PENDING_PAYMENT" }],
  ["unverified", { status: "PENDING_STUDENT_VERIFICATION" }],
  ["cancelled", { status: "CANCELLED" }],
]) {
  test(`${label} packages cannot receive assignments or direct delivery edits`, () => {
    const state = stateFixture({
      packages: [packageFixture({ days: [day("selected", "2026-09-17")], ...overrides })],
      manualDeliveries: [manual()],
    });
    for (const action of ["assign-delivery", "record-delivery", "mark-delivered", "mark-missed", "reschedule"]) {
      assert.throws(() => plan(state, input({ action, deliveryDayId: "selected", targetDate: "2026-09-22", label: "Extra tiffin", quantity: 1 })), /paid, verified/);
    }
  });
}

test("customer identity, stale row/date selection, and undo history are guarded", () => {
  const state = stateFixture({ manualDeliveries: [manual()] });
  assert.throws(() => plan(state, input({ customerId: "another-customer" })), /Customer does not match/);
  assert.throws(() => plan(state, input({ packageId: "another-package" })), /this customer's packages/);
  assert.throws(() => plan(state, input({ action: "mark-delivered", deliveryDayId: "day-first" })), /delivery has changed/);
  assert.throws(() => plan(state, input({ date: "2026-09-16" })), /manual delivery is no longer available/);
  assert.throws(() => plan(state, input({ action: "undo", changeId: "change-1" })), /saved change history/);
});

for (const action of ["mark-delivered", "mark-missed", "record-delivery", "assign-delivery", "void-delivery"]) {
  test(`${action} rejects a future Pacific date, even when UTC is already that date`, () => {
    const state = stateFixture({ manualDeliveries: [manual({ date: "2026-09-19" })] });
    assert.throws(() => plan(state, input({ action, date: "2026-09-19", label: "Tiffin", quantity: 1 }), new Date("2026-09-19T02:00:00Z")), /future date/);
  });
}

test("today can be explicitly confirmed before the window ends without a second completion", () => {
  const state = stateFixture({ packages: [packageFixture({ days: [day("today", "2026-09-18"), day("next", "2026-09-21")] })] });
  assert.equal(calendarDayElapsed(state.packages[0].days[0], NOW), false);
  const result = plan(state, input({ action: "mark-delivered", date: "2026-09-18", deliveryDayId: "today" }));
  assert.equal(result.after.packages[0].days[0].status, "DELIVERED");
  assert.equal(result.after.packages[0].usedDeliveryDays, 1);
  assert.equal(calendarCompletedDays(result.after.packages[0], new Date("2026-09-19T02:00:00Z")), 1);
  assert.throws(() => plan(result.after, input({ action: "mark-delivered", date: "2026-09-18", deliveryDayId: "today" })), /already confirmed/);
});

test("assigning a pre-renewal meal consumes exactly one existing entitlement and preserves other packages", () => {
  const other = packageFixture({ id: "package-2", name: "Second package", days: [day("other-day", "2026-09-24")] });
  const state = stateFixture({ packages: [packageFixture(), other], manualDeliveries: [manual()] });
  const result = plan(state, input());
  const item = result.after.packages[0];
  assert.equal(item.days.length, 3);
  assert.equal(item.totalDeliveryDays, 3);
  assert.equal(item.usedDeliveryDays, 1);
  assert.deepEqual(item.days.map(({ id, date, status }) => ({ id, date, status })), [
    { id: "day-first", date: "2026-09-21", status: "PREPARING" },
    { id: "day-middle", date: "2026-09-22", status: "PREPARING" },
    { id: "day-last", date: "2026-09-17", status: "DELIVERED" },
  ]);
  assert.deepEqual(result.after.manualDeliveries, [manual({ treatment: "PACKAGE", packageDeliveryDayId: "day-last" })]);
  assert.deepEqual(result.after.packages[1], other);
  assert.equal(result.after.revision, state.revision);
  assert.equal(item.startDate, "2026-09-17");
  assert.equal(item.endDate, "2026-09-22");
  assert.deepEqual(result.balances, [{
    packageId: "package-1", name: "Monthly tiffin", beforeCompleted: 0, afterCompleted: 1,
    beforeRemaining: 3, afterRemaining: 2, beforeEnd: "2026-09-23", afterEnd: "2026-09-22",
  }]);
  assert.throws(() => plan(result.after, input()), /already counts toward a package/);
});

test("recording directly against a package also consumes one day and cannot be confirmed twice", () => {
  const result = plan(stateFixture(), input({ action: "record-delivery", label: "Earlier tiffin", quantity: 1 }));
  const record = result.after.manualDeliveries[0];
  assert.equal(record.treatment, "PACKAGE");
  assert.equal(record.packageDeliveryDayId, "day-last");
  assert.equal(result.after.packages[0].days.length, 3);
  assert.equal(calendarCompletedDays(result.after.packages[0], NOW), 1);
  assert.throws(() => plan(result.after, input({ action: "mark-delivered", deliveryDayId: record.packageDeliveryDayId })), /already confirmed/);
});

test("two earlier meals consume distinct existing days without increasing purchased entitlement", () => {
  const state = stateFixture({ manualDeliveries: [manual(), manual({ id: "manual-2", date: "2026-09-16" })] });
  const first = plan(state, input());
  const second = plan(first.after, input({ manualDeliveryId: "manual-2", date: "2026-09-16" }));
  const item = second.after.packages[0];
  assert.equal(item.totalDeliveryDays, 3);
  assert.equal(item.days.length, 3);
  assert.equal(item.usedDeliveryDays, 2);
  assert.equal(item.days.filter((entry) => entry.status === "PREPARING").length, 1);
  assert.equal(new Set(second.after.manualDeliveries.map((record) => record.packageDeliveryDayId)).size, 2);
  assert.equal(second.balances[0].beforeRemaining, 2);
  assert.equal(second.balances[0].afterRemaining, 1);
  assert.equal(item.startDate, "2026-09-16");
  assert.equal(item.endDate, "2026-09-21");
});

test("assignment adds one consumed day while preserving usage missing from the row history", () => {
  const state = stateFixture({ packages: [packageFixture({
    totalDeliveryDays: 4, usedDeliveryDays: 2, startDate: "2026-09-01",
    days: [day("past", "2026-09-15", "DELIVERED"), day("next", "2026-09-21"), day("last", "2026-09-22")],
  })], manualDeliveries: [manual()] });
  const result = plan(state, input());
  const item = result.after.packages[0];
  assert.equal(item.totalDeliveryDays, 4);
  assert.equal(item.usedDeliveryDays, 3);
  assert.equal(item.days.length, 3);
  assert.equal(item.startDate, "2026-09-01");
  assert.equal(result.balances[0].beforeRemaining, 2);
  assert.equal(result.balances[0].afterRemaining, 1);
});

test("sparse historical usage survives elapsed deliveries and later missed-day corrections", () => {
  const state = stateFixture({ packages: [packageFixture({
    totalDeliveryDays: 8, usedDeliveryDays: 6, unrepresentedUsedDays: 0,
    startDate: "2026-09-01", endDate: "2026-09-22",
    days: [day("next", "2026-09-21"), day("last", "2026-09-22")],
  })], manualDeliveries: [manual()] });
  const assigned = plan(state, input());
  const item = assigned.after.packages[0];
  assert.equal(item.unrepresentedUsedDays, 6);
  assert.equal(item.usedDeliveryDays, 7);
  assert.equal(assigned.balances[0].afterRemaining, 1);

  const afterDelivery = new Date("2026-09-22T02:00:00Z");
  assert.equal(calendarDayElapsed(item.days.find((entry) => entry.id === "next"), afterDelivery), true);
  assert.equal(calendarCompletedDays(item, afterDelivery), 8, "six historical days plus the manual and elapsed scheduled deliveries");
  assert.equal(item.usedDeliveryDays, 7, "a read must not need to refresh the stored usage counter");

  const missed = plan(assigned.after, input({ action: "mark-missed", date: "2026-09-21", deliveryDayId: "next" }), afterDelivery);
  const corrected = missed.after.packages[0];
  assert.equal(corrected.unrepresentedUsedDays, 6);
  assert.equal(corrected.usedDeliveryDays, 7);
  assert.equal(missed.balances[0].beforeCompleted, 8);
  assert.equal(missed.balances[0].afterCompleted, 7);
  assert.equal(missed.balances[0].beforeRemaining, 0);
  assert.equal(missed.balances[0].afterRemaining, 1);
  assert.equal(corrected.totalDeliveryDays, 8);
  assert.deepEqual(corrected.days.at(-1), day("new:makeup", "2026-09-22"));
  assert.equal(calendarCompletedDays(corrected, new Date("2026-09-23T02:00:00Z")), 8);
  assert.equal(calendarCompletedDays(corrected, new Date("2026-10-01T19:00:00Z")), 8, "the manual link and declined original must not count twice");
});

for (const treatment of ["AWAITING_RENEWAL", "COMPLIMENTARY"]) {
  test(`${treatment} records do not charge a package and can be voided without changing balances`, () => {
    const state = stateFixture();
    const recorded = plan(state, input({ action: "record-delivery", treatment, label: "Extra meal", quantity: 2 }));
    assert.deepEqual(recorded.after.packages, state.packages);
    assert.deepEqual(recorded.balances, []);
    assert.equal(recorded.after.manualDeliveries[0].quantity, 2);
    assert.equal(recorded.after.manualDeliveries[0].packageDeliveryDayId, null);
    const voided = plan(recorded.after, input({ action: "void-delivery", manualDeliveryId: recorded.after.manualDeliveries[0].id }));
    assert.deepEqual(voided.after.packages, state.packages);
    assert.deepEqual(voided.balances, []);
    assert.equal(voided.after.manualDeliveries[0].treatment, "VOIDED");
    assert.throws(() => plan(voided.after, input({ manualDeliveryId: voided.after.manualDeliveries[0].id })), /no longer available/);
  });
}

test("complimentary and awaiting-renewal treatments can be changed without charging, but a linked meal cannot", () => {
  const state = stateFixture({ manualDeliveries: [manual()] });
  const complimentary = plan(state, input({ treatment: "COMPLIMENTARY" }));
  const awaiting = plan(complimentary.after, input({ treatment: "AWAITING_RENEWAL" }));
  assert.deepEqual(awaiting.after, state);
  assert.deepEqual(complimentary.balances, []);
  assert.deepEqual(awaiting.balances, []);
  assert.throws(() => plan(state, input({ treatment: "AWAITING_RENEWAL" })), /already has that treatment/);
  assert.throws(() => plan(assignedFixture(), input({ treatment: "COMPLIMENTARY" })), /already counts toward a package/);
});

test("duplicate active manual entries are rejected case-insensitively; voided entries do not block corrections", () => {
  const change = input({ action: "record-delivery", label: "  REGULAR TIFFIN  ", quantity: 1, treatment: "COMPLIMENTARY" });
  assert.throws(() => plan(stateFixture({ manualDeliveries: [manual()] }), change), /matching delivery is already recorded/);
  const result = plan(stateFixture({ manualDeliveries: [manual({ treatment: "VOIDED" })] }), change);
  assert.equal(result.after.manualDeliveries.filter((record) => record.treatment !== "VOIDED").length, 1);
});

test("an existing package day blocks assignment but a separate extra meal produces a warning without a charge", () => {
  const state = stateFixture({
    packages: [packageFixture({ days: [day("served", "2026-09-17", "DELIVERED"), day("next", "2026-09-21")] })],
    manualDeliveries: [manual()],
  });
  assert.throws(() => plan(state, input()), /already has a delivery on that date/);
  const result = plan(state, input({ action: "record-delivery", label: "Separate extra meal", quantity: 1, treatment: "AWAITING_RENEWAL" }));
  assert.match(result.warnings.join(" "), /separate extra delivery/);
  assert.deepEqual(result.after.packages, state.packages);
});

test("exhausted entitlements and paused packages cannot accept pre-renewal assignments", () => {
  for (const overrides of [{ usedDeliveryDays: 3 }, { days: [] }]) {
    assert.throws(() => plan(stateFixture({ packages: [packageFixture(overrides)], manualDeliveries: [manual()] }), input()), /no unused, unprotected delivery day/);
  }
  assert.throws(() => plan(stateFixture({ packages: [packageFixture({ status: "PAUSED" })], manualDeliveries: [manual()] }), input()), /Resume this package/);
});

test("a missed day gets one make-up after weekends, holidays and pauses while retaining sparse historical usage", () => {
  const state = stateFixture({
    packages: [packageFixture({
      totalDeliveryDays: 9, usedDeliveryDays: 6, startDate: "2026-09-01", endDate: "2026-09-25",
      days: [day("past-a", "2026-09-16", "DELIVERED"), day("past-b", "2026-09-17", "DELIVERED"),
        day("next-a", "2026-09-21"), day("next-b", "2026-09-22"), day("next-c", "2026-09-25"),
        day("missed-later", "2026-10-30", "DECLINED"), day("unpaid-later", "2026-11-02", "PENDING_PAYMENT")],
      pauses: [{ startDate: "2026-09-30", endDate: "2026-09-30", status: "ACTIVE" }],
    })],
    holidays: [{ name: "Kitchen closure", startDate: "2026-09-28", endDate: "2026-09-29" }],
  });
  const change = input({ action: "mark-missed", deliveryDayId: "past-b" });
  const result = plan(state, change);
  const item = result.after.packages[0];
  assert.equal(item.days.find((entry) => entry.id === "past-b").status, "DECLINED");
  assert.deepEqual(item.days.at(-1), day("new:makeup", "2026-10-01"));
  assert.equal(item.days.length, state.packages[0].days.length + 1);
  assert.equal(item.totalDeliveryDays, 9);
  assert.equal(item.usedDeliveryDays, 5, "four unrepresented historical days plus the surviving delivered row");
  assert.equal(item.endDate, "2026-10-01");
  assert.equal(result.balances[0].beforeRemaining, 3);
  assert.equal(result.balances[0].afterRemaining, 4);
  assert.throws(() => plan(result.after, change), /already paused, cancelled, or marked not delivered/);
});

test("correcting an elapsed preparing day credits it once without losing unrepresented historical usage", () => {
  const state = stateFixture({ packages: [packageFixture({
    totalDeliveryDays: 8, usedDeliveryDays: 6,
    days: [day("elapsed", "2026-09-17"), day("next-a", "2026-09-21"), day("next-b", "2026-09-22")],
  })] });
  const result = plan(state, input({ action: "mark-missed", deliveryDayId: "elapsed" }));
  assert.equal(result.after.packages[0].usedDeliveryDays, 5);
  assert.equal(result.balances[0].afterRemaining, 3);
  assert.equal(result.after.packages[0].days.at(-1).status, "PREPARING");
});

test("confirming an already elapsed preparing day does not count it a second time", () => {
  const state = stateFixture({ packages: [packageFixture({ usedDeliveryDays: 2, days: [day("elapsed", "2026-09-17"), day("next", "2026-09-21")] })] });
  const result = plan(state, input({ action: "mark-delivered", deliveryDayId: "elapsed" }));
  assert.equal(result.after.packages[0].usedDeliveryDays, 2);
  assert.equal(result.balances[0].beforeRemaining, result.balances[0].afterRemaining);
});

test("missing an expired package day reactivates it, while a paused package keeps the credit unscheduled", () => {
  for (const status of ["EXPIRED", "PAUSED"]) {
    const state = stateFixture({ packages: [packageFixture({ status, totalDeliveryDays: 1, usedDeliveryDays: 1,
      startDate: "2026-09-17", endDate: "2026-09-17", days: [day("served", "2026-09-17", "DELIVERED")],
    })] });
    const result = plan(state, input({ action: "mark-missed", deliveryDayId: "served" }));
    const item = result.after.packages[0];
    assert.equal(item.usedDeliveryDays, 0);
    assert.equal(result.balances[0].afterRemaining, 1);
    assert.equal(item.status, status === "PAUSED" ? "PAUSED" : "ACTIVE");
    assert.equal(item.days.length, status === "PAUSED" ? 1 : 2);
    assert.equal(item.endDate, status === "PAUSED" ? "2026-09-17" : "2026-09-21");
  }
});

test("voiding an assigned manual meal unlinks it, preserves history, and returns exactly one credit", () => {
  const state = assignedFixture();
  const result = plan(state, input({ action: "void-delivery" }));
  const item = result.after.packages[0];
  assert.equal(item.days.find((entry) => entry.id === "served").status, "DECLINED");
  assert.equal(item.days.at(-1).date, "2026-09-24");
  assert.equal(item.days.filter(isCountableCalendarDay).length, 3);
  assert.equal(item.totalDeliveryDays, 3);
  assert.equal(item.usedDeliveryDays, 0);
  assert.deepEqual(result.after.manualDeliveries, [manual({ treatment: "VOIDED" })]);
  assert.equal(result.balances[0].afterRemaining - result.balances[0].beforeRemaining, 1);
});

test("marking a linked day missed also voids and unlinks its manual delivery", () => {
  const result = plan(assignedFixture(), input({ action: "mark-missed", deliveryDayId: "served" }));
  assert.deepEqual(result.after.manualDeliveries, [manual({ treatment: "VOIDED" })]);
  assert.equal(result.after.packages[0].usedDeliveryDays, 0);
});

for (const status of ["DECLINED", "PENDING_PAYMENT", "CANCELLED", "PAUSED"]) {
  test(`${status} rows are not counted or directly confirmed/missed again`, () => {
    const selected = day("selected", "2026-09-17", status);
    assert.equal(isCountableCalendarDay(selected), false);
    assert.equal(calendarDayElapsed(selected, NOW), false);
    const state = stateFixture({ packages: [packageFixture({ days: [selected] })] });
    for (const action of ["mark-delivered", "mark-missed"]) {
      assert.throws(() => plan(state, input({ action, deliveryDayId: "selected" })), /credited or cancelled|already paused, cancelled, or marked not delivered/);
    }
  });
}

test("rescheduling an upcoming day preserves credits and identity while updating its end date", () => {
  const state = stateFixture();
  const result = plan(state, input({ action: "reschedule", date: "2026-09-23", deliveryDayId: "day-last", targetDate: "2026-09-24" }));
  assert.deepEqual(result.after.packages[0].days.at(-1), day("day-last", "2026-09-24"));
  assert.equal(result.after.packages[0].days.length, 3);
  assert.equal(result.after.packages[0].totalDeliveryDays, 3);
  assert.equal(result.after.packages[0].usedDeliveryDays, 0);
  assert.equal(result.after.packages[0].endDate, "2026-09-24");
  assert.equal(result.balances[0].beforeRemaining, result.balances[0].afterRemaining);
});

for (const [label, targetDate, overrides, message] of [
  ["today", "2026-09-18", {}, /after today/],
  ["past", "2026-09-17", {}, /after today/],
  ["same date", "2026-09-21", {}, /different delivery date/],
  ["occupied date", "2026-09-22", {}, /already has a delivery/],
  ["weekend", "2026-09-26", {}, /normal delivery weekdays/],
  ["holiday", "2026-09-24", { holidays: [{ name: "Closure", startDate: "2026-09-24", endDate: "2026-09-24" }] }, /kitchen holiday/],
  ["pause", "2026-09-24", { packages: [packageFixture({ pauses: [{ startDate: "2026-09-24", endDate: "2026-09-24", status: "APPROVED" }] })] }, /pause period/],
]) {
  test(`rescheduling rejects ${label}, even with conflict acknowledgement`, () => {
    assert.throws(() => plan(stateFixture(overrides), input({ action: "reschedule", date: "2026-09-21", deliveryDayId: "day-first", targetDate, acknowledgeConflict: true })), message);
  });
}

test("missed and unpaid rows do not reserve a future rescheduling date", () => {
  for (const status of ["DECLINED", "PENDING_PAYMENT"]) {
    const state = stateFixture({ packages: [packageFixture({ days: [day("move", "2026-09-21"), day("excluded", "2026-09-22", status)] })] });
    const result = plan(state, input({ action: "reschedule", date: "2026-09-21", deliveryDayId: "move", targetDate: "2026-09-22" }));
    assert.equal(result.after.packages[0].days.filter((entry) => entry.date === "2026-09-22" && isCountableCalendarDay(entry)).length, 1);
    assert.equal(result.after.packages[0].days[1].status, status);
  }
});

test("rescheduling cannot move delivered, in-flight, elapsed, or paused-package deliveries", () => {
  for (const [status, date, packageStatus] of [
    ["DELIVERED", "2026-09-17", "ACTIVE"], ["OUT_FOR_DELIVERY", "2026-09-18", "ACTIVE"],
    ["PREPARING", "2026-09-17", "ACTIVE"], ["PREPARING", "2026-09-21", "PAUSED"],
  ]) {
    const state = stateFixture({ packages: [packageFixture({ status: packageStatus, days: [day("selected", date, status)] })] });
    assert.throws(() => plan(state, input({ action: "reschedule", date, deliveryDayId: "selected", targetDate: "2026-09-24" })), /Only an upcoming, unstarted delivery/);
  }
});

test("moving the first unstarted delivery earlier updates the package start boundary", () => {
  const state = stateFixture({ packages: [packageFixture({ totalDeliveryDays: 2, startDate: "2026-09-22", endDate: "2026-09-24",
    days: [day("first", "2026-09-22"), day("last", "2026-09-24")],
  })] });
  const result = plan(state, input({ action: "reschedule", date: "2026-09-22", deliveryDayId: "first", targetDate: "2026-09-21" }));
  assert.equal(result.after.packages[0].startDate, "2026-09-21");
  assert.equal(result.after.packages[0].endDate, "2026-09-24");
});

test("matching quantity consumes one delivery day, not one credit per tiffin", () => {
  const state = stateFixture({ packages: [packageFixture({ quantity: 2 })], manualDeliveries: [manual({ quantity: 2 })] });
  const result = plan(state, input());
  assert.equal(result.after.packages[0].quantity, 2);
  assert.equal(result.after.packages[0].totalDeliveryDays, 3);
  assert.equal(result.after.packages[0].usedDeliveryDays, 1);
  assert.equal(result.balances[0].afterRemaining, 2);
  assert.equal(result.after.manualDeliveries[0].quantity, 2);
});

test("assignment and direct package recording reject a quantity mismatch", () => {
  const state = stateFixture({ packages: [packageFixture({ quantity: 2 })], manualDeliveries: [manual()] });
  assert.throws(() => plan(state, input()), /recorded quantity must match/);
  assert.throws(() => plan(state, input({ action: "record-delivery", label: "Separate tiffin", quantity: 3 })), /recorded quantity must match/);
});

test("command validation rejects invalid dates, quantities, and missing audit reasons", () => {
  for (const date of ["2026-02-30", "2026-13-01", "not-a-date"]) assert.equal(calendarChangeSchema.safeParse(input({ date })).success, false);
  for (const quantity of [0, -1, 1.5, 51]) assert.equal(calendarChangeSchema.safeParse(input({ action: "record-delivery", quantity })).success, false);
  for (const reason of ["", "    ", "tiny"]) assert.equal(calendarChangeSchema.safeParse(input({ reason })).success, false);
  assert.throws(() => plan(stateFixture(), input({ action: "record-delivery" })), /meal\/package name, quantity/);
});

for (const action of ["mark-delivered", "mark-missed"]) {
  test(`${action} can correct a protected countable make-up day without changing its date provenance`, () => {
    const original = day("original", "2026-09-16", "CANCELLED");
    const state = stateFixture({ packages: [packageFixture({
      totalDeliveryDays: 1, startDate: "2026-09-16", endDate: "2026-09-18",
      protectedDayIds: ["original", "replacement"],
      days: [original, day("replacement", "2026-09-18")],
    })], holidays: [{ name: "Kitchen closure", startDate: "2026-09-16", endDate: "2026-09-16" }] });
    const result = plan(state, input({ action, date: "2026-09-18", deliveryDayId: "replacement" }));
    const item = result.after.packages[0];
    assert.deepEqual(item.days[0], original);
    assert.deepEqual(item.days[1], day("replacement", "2026-09-18", action === "mark-delivered" ? "DELIVERED" : "DECLINED"));
    assert.deepEqual(item.protectedDayIds, state.packages[0].protectedDayIds);
    assert.equal(item.totalDeliveryDays, 1);
    assert.equal(item.usedDeliveryDays, action === "mark-delivered" ? 1 : 0);
    assert.equal(item.days.filter(isCountableCalendarDay).length, 1);
    assert.equal(item.days.length, action === "mark-delivered" ? 2 : 3);
    if (action === "mark-missed") assert.deepEqual(item.days.at(-1), day("new:makeup", "2026-09-21"));
  });

  test(`${action} still rejects a protected cancelled original rather than restoring a second entitlement`, () => {
    const state = stateFixture({ packages: [packageFixture({
      totalDeliveryDays: 1, protectedDayIds: ["original", "replacement"],
      days: [day("original", "2026-09-17", "CANCELLED"), day("replacement", "2026-09-21")],
    })] });
    assert.throws(() => plan(state, input({ action, deliveryDayId: "original" })), /credited or cancelled|already paused, cancelled, or marked not delivered/);
  });
}

test("rescheduling cannot change the date provenance of a protected upcoming row", () => {
  const state = stateFixture({ packages: [packageFixture({ protectedDayIds: ["day-first"] })] });
  assert.throws(() => plan(state, input({ action: "reschedule", date: "2026-09-21", deliveryDayId: "day-first", targetDate: "2026-09-24" })), /holiday or scheduled-pause adjustment/);
});

test("assignment skips protected rows and rejects a package with no unprotected candidate", () => {
  const state = stateFixture({ packages: [packageFixture({ protectedDayIds: ["day-last"] })], manualDeliveries: [manual()] });
  const result = plan(state, input());
  assert.equal(result.after.manualDeliveries[0].packageDeliveryDayId, "day-middle");
  assert.deepEqual(result.after.packages[0].days.at(-1), state.packages[0].days.at(-1));
  state.packages[0].protectedDayIds = state.packages[0].days.map((entry) => entry.id);
  assert.throws(() => plan(state, input()), /no unused, unprotected delivery day/);
  assert.throws(() => plan(state, input({ action: "record-delivery", label: "Separate meal", quantity: 1 })), /no unused, unprotected delivery day/);
});

test("voiding a linked protected delivery corrects its status without deleting or moving its row", () => {
  const state = assignedFixture({ protectedDayIds: ["served"] });
  const result = plan(state, input({ action: "void-delivery" }));
  const item = result.after.packages[0];
  assert.deepEqual(item.days[0], day("served", "2026-09-17", "DECLINED"));
  assert.deepEqual(item.protectedDayIds, ["served"]);
  assert.deepEqual(result.after.manualDeliveries, [manual({ treatment: "VOIDED" })]);
  assert.deepEqual(item.days.at(-1), day("new:makeup", "2026-09-24"));
  assert.equal(item.usedDeliveryDays, 0);
  assert.equal(item.totalDeliveryDays, 3);
  assert.equal(result.balances[0].afterRemaining - result.balances[0].beforeRemaining, 1);
});

test("historical holiday/weekend confirmations return warnings rather than silently changing delivery dates", () => {
  const state = stateFixture({
    packages: [packageFixture({ days: [day("selected", "2026-09-13")] })],
    holidays: [{ name: "Kitchen holiday", startDate: "2026-09-13", endDate: "2026-09-13" }],
  });
  const result = plan(state, input({ action: "mark-delivered", date: "2026-09-13", deliveryDayId: "selected" }));
  assert.equal(result.after.packages[0].days[0].date, "2026-09-13");
  assert.equal(result.after.packages[0].days[0].status, "DELIVERED");
  assert.equal(result.warnings.length, 2);
  assert.match(result.warnings.join(" "), /normal delivery weekdays/);
  assert.match(result.warnings.join(" "), /kitchen holiday/);
});
