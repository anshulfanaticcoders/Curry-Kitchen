export const BUSINESS_TIME_ZONE = "America/Los_Angeles";
export const DEFAULT_ORDER_CUTOFF = "20:00";
export const DEFAULT_DELIVERY_WINDOW = "10:00 AM - 6:00 PM";

export function normalizeOrderCutoff(value: string) {
  if (value.trim().toLowerCase() === "noon") return "12:00";
  const clock = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
  if (clock) return `${clock[1]}:${clock[2]}`;
  const label = /^(0?[1-9]|1[0-2])(?::([0-5]\d))?\s*(AM|PM)$/i.exec(value.trim());
  if (!label) return DEFAULT_ORDER_CUTOFF;
  const hour = Number(label[1]) % 12 + (label[3].toUpperCase() === "PM" ? 12 : 0);
  return `${String(hour).padStart(2, "0")}:${label[2] ?? "00"}`;
}

export function formatOrderCutoff(value: string) {
  const [hour, minute] = normalizeOrderCutoff(value).split(":").map(Number);
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`;
}

export function isAfterOrderCutoff(cutoff: string, now = new Date()) {
  const [cutoffHour, cutoffMinute] = normalizeOrderCutoff(cutoff).split(":").map(Number);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TIME_ZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(now);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);
  return hour * 60 + minute >= cutoffHour * 60 + cutoffMinute;
}

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
  deliveryWindow?: string;
  nextDayOrderingClosed?: boolean;
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

export function isDeliveryDayElapsed(day: { deliveryDate: Date; status: string; deliveryWindow?: string }, now = new Date()) {
  if (["CANCELLED", "PAUSED", "DECLINED", "PENDING_PAYMENT"].includes(day.status)) return false;
  if (day.status === "DELIVERED") return true;
  const date = dateToInput(day.deliveryDate);
  const today = businessDateInput(now);
  if (date !== today) return date < today;
  const windowEnd = day.deliveryWindow?.split(/\s+[-–]\s+/)[1] ?? "6:00 PM";
  return isAfterOrderCutoff(windowEnd, now);
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
  deliveryWindow = DEFAULT_DELIVERY_WINDOW,
}: {
  now?: Date;
  deliveryWeekdays: number[];
  orderCutoff: string;
  orderCutoffPassed?: boolean;
  holidays: PublicBusinessHoliday[];
  deliveryWindow?: string;
}): PackageScheduleAvailability {
  const cutoffPassed = orderCutoffPassed ?? isAfterOrderCutoff(orderCutoff, now);
  // Close tomorrow first, then skip non-delivery days and kitchen holidays.
  const earliest = addDays(inputToDate(businessDateInput(now)), cutoffPassed ? 2 : 1);

  return {
    earliestStartDate: nextAvailablePackageStartInput(
      dateToInput(earliest),
      deliveryWeekdays,
      holidays,
    ),
    deliveryWeekdays,
    holidays,
    orderCutoff,
    deliveryWindow,
    nextDayOrderingClosed: cutoffPassed,
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
      return `This start date is no longer available. Choose ${formatInputDate(earliestStartDate)} or later; the next-day order cutoff and kitchen schedule apply.`;
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
