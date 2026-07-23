const BUSINESS_TIME_ZONE = "America/Los_Angeles";

function businessDateInput(now = new Date()) {
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

function inputToDate(value: string, hour = 18) {
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

function dateToInput(value: Date) {
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function addDays(value: Date, days: number) {
  const date = new Date(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

function isWeekend(value: Date) {
  const day = value.getUTCDay();
  return day === 0 || day === 6;
}

export function nextEligiblePackageStartDate(from = new Date()) {
  let cursor = inputToDate(businessDateInput(from));
  cursor = addDays(cursor, 1);

  while (isWeekend(cursor)) {
    cursor = addDays(cursor, 1);
  }

  return cursor;
}

export function nextEligiblePackageStartInput(from = new Date()) {
  return dateToInput(nextEligiblePackageStartDate(from));
}

export function validatePackageStartInput(value: string) {
  const date = inputToDate(value);

  if (value <= businessDateInput()) {
    throw new Error("Start date must be tomorrow or later.");
  }

  if (isWeekend(date)) {
    throw new Error("Weekend delivery is off. Choose a Monday to Friday start date.");
  }

  return date;
}

export function packageStartDateIssue(value: string) {
  try {
    validatePackageStartInput(value);
    return "";
  } catch (error) {
    return error instanceof Error ? error.message : "Choose a valid package start date.";
  }
}

export function calculateDeliveryDates(totalDays: number, startDate: Date) {
  const dates: Date[] = [];
  const cursor = new Date(startDate);
  cursor.setUTCHours(18, 0, 0, 0);

  while (dates.length < totalDays) {
    if (!isWeekend(cursor)) {
      dates.push(new Date(cursor));
    }

    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}
