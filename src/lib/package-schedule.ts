export const BUSINESS_TIME_ZONE = "America/Los_Angeles";

export type ScheduleDateRange = { startDate: Date; endDate: Date };

export type PublicBusinessHoliday = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  note: string;
};

export type PackageScheduleAvailability = {
  earliestStartDate: string;
  deliveryWeekdays: number[];
  holidays: PublicBusinessHoliday[];
  orderCutoff: string;
};

export function businessDateInput(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return `${year}-${month}-${day}`;
}

export function inputToDate(value: string, hour = 18) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    throw new Error("Choose a valid package start date.");
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day, hour, 0, 0));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error("Choose a valid package start date.");
  }

  return date;
}

export function dateToInput(value: Date) {
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function addDays(value: Date, days: number) {
  const date = new Date(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

export function isDeliveryDay(value: Date, deliveryWeekdays: number[]) {
  return deliveryWeekdays.includes(value.getUTCDay());
}

function isExcludedDate(value: Date, excludedRanges: ScheduleDateRange[]) {
  const time = value.getTime();
  return excludedRanges.some(
    (range) => time >= range.startDate.getTime() && time <= range.endDate.getTime(),
  );
}

export function holidayForInputDate(value: string, holidays: PublicBusinessHoliday[]) {
  return holidays.find((holiday) => value >= holiday.startDate && value <= holiday.endDate);
}

export function formatInputDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

export function nextAvailablePackageStartInput(
  fromInput: string,
  deliveryWeekdays: number[],
  holidays: PublicBusinessHoliday[],
) {
  let cursor = inputToDate(fromInput);

  for (let guard = 0; guard < 370; guard += 1) {
    const input = dateToInput(cursor);
    if (isDeliveryDay(cursor, deliveryWeekdays) && !holidayForInputDate(input, holidays)) {
      return input;
    }
    cursor = addDays(cursor, 1);
  }

  throw new Error("No delivery start date is currently available.");
}

export function buildPackageScheduleAvailability({
  now = new Date(),
  deliveryWeekdays,
  orderCutoff,
  orderCutoffPassed,
  holidays,
}: {
  now?: Date;
  deliveryWeekdays: number[];
  orderCutoff: string;
  orderCutoffPassed: boolean;
  holidays: PublicBusinessHoliday[];
}): PackageScheduleAvailability {
  let earliest = nextEligiblePackageStartDate(now, deliveryWeekdays);

  if (orderCutoffPassed) {
    earliest = addDays(earliest, 1);
  }

  return {
    earliestStartDate: nextAvailablePackageStartInput(
      dateToInput(earliest),
      deliveryWeekdays,
      holidays,
    ),
    deliveryWeekdays,
    holidays,
    orderCutoff,
  };
}

export function nextEligiblePackageStartDate(from = new Date(), deliveryWeekdays = [1, 2, 3, 4, 5]) {
  let cursor = inputToDate(businessDateInput(from));
  cursor = addDays(cursor, 1);

  while (!isDeliveryDay(cursor, deliveryWeekdays)) {
    cursor = addDays(cursor, 1);
  }

  return cursor;
}

export function nextEligiblePackageStartInput(from = new Date(), deliveryWeekdays = [1, 2, 3, 4, 5]) {
  return dateToInput(nextEligiblePackageStartDate(from, deliveryWeekdays));
}

export function validatePackageStartInput(value: string, deliveryWeekdays = [1, 2, 3, 4, 5], now = new Date()) {
  const date = inputToDate(value);
  const earliestDate = dateToInput(nextEligiblePackageStartDate(now, deliveryWeekdays));

  if (value < earliestDate) {
    throw new Error("Start date must be the next available delivery day or later.");
  }

  if (!isDeliveryDay(date, deliveryWeekdays)) {
    throw new Error("Choose a configured delivery day for your package start.");
  }

  return date;
}

export function packageStartDateIssue(
  value: string,
  deliveryWeekdays = [1, 2, 3, 4, 5],
  holidays: PublicBusinessHoliday[] = [],
  earliestStartDate = nextEligiblePackageStartInput(undefined, deliveryWeekdays),
) {
  try {
    const date = inputToDate(value);

    if (value < earliestStartDate) {
      return `Choose ${formatInputDate(earliestStartDate)} or later.`;
    }

    if (!isDeliveryDay(date, deliveryWeekdays)) {
      return "Choose a configured delivery day for your package start.";
    }

    const holiday = holidayForInputDate(value, holidays);
    if (holiday) {
      const nextStart = nextAvailablePackageStartInput(
        dateToInput(addDays(inputToDate(holiday.endDate), 1)),
        deliveryWeekdays,
        holidays,
      );
      return `Kitchen closed for ${holiday.name}, ${formatInputDate(holiday.startDate)}–${formatInputDate(holiday.endDate)}. Choose ${formatInputDate(nextStart)} or later.`;
    }

    return "";
  } catch (error) {
    return error instanceof Error ? error.message : "Choose a valid package start date.";
  }
}

export function calculateDeliveryDates(
  totalDays: number,
  startDate: Date,
  deliveryWeekdays = [1, 2, 3, 4, 5],
  excludedRanges: ScheduleDateRange[] = [],
) {
  const dates: Date[] = [];
  const cursor = new Date(startDate);
  cursor.setUTCHours(18, 0, 0, 0);

  while (dates.length < totalDays) {
    if (isDeliveryDay(cursor, deliveryWeekdays) && !isExcludedDate(cursor, excludedRanges)) {
      dates.push(new Date(cursor));
    }

    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}
