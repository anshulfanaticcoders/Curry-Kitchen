import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPackageScheduleAvailability,
  DEFAULT_DELIVERY_WINDOW,
  DEFAULT_ORDER_CUTOFF,
  formatOrderCutoff,
  inputToDate,
  isAfterOrderCutoff,
  isDeliveryDayElapsed,
  normalizeOrderCutoff,
  packageStartDateIssue,
} from "../src/lib/package-schedule.ts";

const availabilityAt = (iso, overrides = {}) => buildPackageScheduleAvailability({
  now: new Date(iso), deliveryWeekdays: [1, 2, 3, 4, 5],
  holidays: [], orderCutoff: DEFAULT_ORDER_CUTOFF, ...overrides,
});

for (const [input, expected] of [
  ["20:00", "20:00"], ["8 PM", "20:00"], ["8:30 pm", "20:30"],
  ["Noon", "12:00"], ["12 AM", "00:00"], ["12 PM", "12:00"],
  ["9 AM", "09:00"], ["3 PM", "15:00"], ["invalid", "20:00"], ["25:70", "20:00"],
]) {
  test(`normalizes cutoff ${input}`, () => assert.equal(normalizeOrderCutoff(input), expected));
}

test("customer-facing cutoff is a readable time", () => {
  assert.equal(formatOrderCutoff("20:00"), "8:00 PM");
  assert.equal(formatOrderCutoff("00:00"), "12:00 AM");
});

for (const [name, before, boundary, tomorrow, afterTomorrow] of [
  ["PDT summer", "2026-09-22T02:59:59.999Z", "2026-09-22T03:00:00.000Z", "2026-09-22", "2026-09-23"],
  ["PST winter", "2026-12-08T03:59:59.999Z", "2026-12-08T04:00:00.000Z", "2026-12-08", "2026-12-09"],
]) {
  test(`${name}: tomorrow is allowed just before 8 PM, blocked exactly at 8 PM`, () => {
    const open = availabilityAt(before);
    const closed = availabilityAt(boundary);
    assert.equal(open.earliestStartDate, tomorrow);
    assert.equal(open.nextDayOrderingClosed, false);
    assert.equal(closed.earliestStartDate, afterTomorrow);
    assert.equal(closed.nextDayOrderingClosed, true);
    assert.equal(closed.deliveryWindow, DEFAULT_DELIVERY_WINDOW);
    assert.equal(packageStartDateIssue(tomorrow, open.deliveryWeekdays, [], open.earliestStartDate), "");
    assert.match(packageStartDateIssue(tomorrow, closed.deliveryWeekdays, [], closed.earliestStartDate), /no longer available/);
    assert.equal(packageStartDateIssue(afterTomorrow, closed.deliveryWeekdays, [], closed.earliestStartDate), "");
  });
}

for (const [name, instant, expected] of [
  ["Friday before cutoff", "2026-09-19T02:00:00Z", "2026-09-21"],
  ["Friday after cutoff still allows Monday", "2026-09-19T03:00:00Z", "2026-09-21"],
  ["Saturday after cutoff still allows Monday", "2026-09-20T03:00:00Z", "2026-09-21"],
  ["Sunday before cutoff allows Monday", "2026-09-21T02:59:59Z", "2026-09-21"],
  ["Sunday cutoff blocks Monday", "2026-09-21T03:00:00Z", "2026-09-22"],
  ["Pacific midnight allows ordering for the new tomorrow", "2026-09-22T07:00:00Z", "2026-09-23"],
  ["year boundary", "2026-12-31T04:00:00Z", "2027-01-01"],
]) {
  test(name, () => assert.equal(availabilityAt(instant).earliestStartDate, expected));
}

test("custom delivery weekdays and holiday ranges apply after the cutoff", () => {
  const holidays = [{ id: "closure", name: "Kitchen closure", startDate: "2026-09-20", endDate: "2026-09-22", note: "" }];
  assert.equal(availabilityAt("2026-09-20T03:00:00Z", { holidays }).earliestStartDate, "2026-09-23");
  assert.equal(availabilityAt("2026-09-20T02:59:59Z", { deliveryWeekdays: [0, 1, 2, 3, 4, 5, 6] }).earliestStartDate, "2026-09-20");
  assert.equal(availabilityAt("2026-09-20T03:00:00Z", { deliveryWeekdays: [0, 1, 2, 3, 4, 5, 6] }).earliestStartDate, "2026-09-21");
});

test("minute-precision admin cutoff and DST transitions use Pacific time", () => {
  assert.equal(isAfterOrderCutoff("20:30", new Date("2026-09-22T03:29:59Z")), false);
  assert.equal(isAfterOrderCutoff("20:30", new Date("2026-09-22T03:30:00Z")), true);
  assert.equal(isAfterOrderCutoff("20:00", new Date("2026-03-09T02:59:59Z")), false);
  assert.equal(isAfterOrderCutoff("20:00", new Date("2026-03-09T03:00:00Z")), true);
  assert.equal(isAfterOrderCutoff("20:00", new Date("2026-11-02T03:59:59Z")), false);
  assert.equal(isAfterOrderCutoff("20:00", new Date("2026-11-02T04:00:00Z")), true);
});

test("a stale open-tab snapshot is recalculated when the cutoff passes", () => {
  const old = availabilityAt("2026-09-22T02:59:59Z");
  const refreshed = buildPackageScheduleAvailability({ ...old, now: new Date("2026-09-22T03:00:00Z") });
  assert.equal(refreshed.earliestStartDate, "2026-09-23");
  assert.equal(refreshed.nextDayOrderingClosed, true);
});

test("today stays outstanding until 6 PM Pacific, not the stored date timestamp", () => {
  const day = { deliveryDate: inputToDate("2026-09-21"), status: "PREPARING", deliveryWindow: DEFAULT_DELIVERY_WINDOW };
  assert.equal(isDeliveryDayElapsed(day, new Date("2026-09-21T19:00:00Z")), false);
  assert.equal(isDeliveryDayElapsed(day, new Date("2026-09-22T00:59:59Z")), false);
  assert.equal(isDeliveryDayElapsed(day, new Date("2026-09-22T01:00:00Z")), true);
  assert.equal(isDeliveryDayElapsed({ ...day, status: "DELIVERED" }, new Date("2026-09-21T19:00:00Z")), true);
  for (const status of ["PAUSED", "CANCELLED", "DECLINED", "PENDING_PAYMENT"]) {
    assert.equal(isDeliveryDayElapsed({ ...day, status }, new Date("2026-09-23T19:00:00Z")), false);
  }
});
