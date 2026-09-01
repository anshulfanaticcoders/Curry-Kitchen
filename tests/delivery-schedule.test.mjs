import assert from "node:assert/strict";
import test from "node:test";

const {
  buildPackageScheduleAvailability,
  calculateDeliveryDates,
  inputToDate,
  packageStartDateIssue,
} = await import("../src/lib/package-schedule.ts");

const keys = (dates) => dates.map((date) => date.toISOString().slice(0, 10));

test("skips an inclusive kitchen holiday range without losing paid delivery days", () => {
  const dates = calculateDeliveryDates(
    5,
    inputToDate("2026-09-01"),
    [1, 2, 3, 4, 5],
    [{ startDate: inputToDate("2026-09-02"), endDate: inputToDate("2026-09-03") }],
  );

  assert.deepEqual(keys(dates), [
    "2026-09-01",
    "2026-09-04",
    "2026-09-07",
    "2026-09-08",
    "2026-09-09",
  ]);
});

test("skips weekends, holidays, and occupied dates while preserving the requested count", () => {
  const dates = calculateDeliveryDates(
    3,
    inputToDate("2026-09-05"),
    [1, 2, 3, 4, 5],
    [
      { startDate: inputToDate("2026-09-07"), endDate: inputToDate("2026-09-07") },
      { startDate: inputToDate("2026-09-08"), endDate: inputToDate("2026-09-08") },
    ],
  );

  assert.deepEqual(keys(dates), ["2026-09-09", "2026-09-10", "2026-09-11"]);
  assert.equal(dates.length, 3);
});

test("blocks a holiday start date and suggests the first available delivery day", () => {
  const holidays = [
    {
      id: "labor-day",
      name: "Labour Day",
      startDate: "2026-09-10",
      endDate: "2026-09-12",
      note: "Kitchen closed.",
    },
  ];
  const availability = buildPackageScheduleAvailability({
    now: new Date("2026-09-09T12:00:00.000Z"),
    deliveryWeekdays: [1, 2, 3, 4, 5],
    orderCutoff: "Noon",
    orderCutoffPassed: false,
    holidays,
  });

  assert.equal(availability.earliestStartDate, "2026-09-14");
  assert.match(
    packageStartDateIssue(
      "2026-09-10",
      availability.deliveryWeekdays,
      availability.holidays,
      "2026-09-10",
    ),
    /Labour Day.*Sep 14, 2026/,
  );
});

test("moves the earliest start forward after the daily order cutoff", () => {
  const availability = buildPackageScheduleAvailability({
    now: new Date("2026-09-08T18:00:00.000Z"),
    deliveryWeekdays: [1, 2, 3, 4, 5],
    orderCutoff: "Noon",
    orderCutoffPassed: true,
    holidays: [],
  });

  assert.equal(availability.earliestStartDate, "2026-09-10");
});
