import "server-only";

import { db } from "@/lib/db";
import { DEFAULT_DELIVERY_WINDOW, DEFAULT_ORDER_CUTOFF, normalizeOrderCutoff } from "@/lib/package-schedule";
export { isAfterOrderCutoff } from "@/lib/package-schedule";

export type BusinessRules = {
  maintenanceMode: boolean;
  acceptWeeklyTrials: boolean;
  enableCheckoutPauses: boolean;
  deliveryWeekdays: number[];
  deliveryWindow: string;
  orderCutoff: string;
  customMonthlyDays: number;
};

const defaultRules: BusinessRules = {
  maintenanceMode: false,
  acceptWeeklyTrials: true,
  enableCheckoutPauses: true,
  deliveryWeekdays: [1, 2, 3, 4, 5],
  deliveryWindow: DEFAULT_DELIVERY_WINDOW,
  orderCutoff: DEFAULT_ORDER_CUTOFF,
  customMonthlyDays: 21,
};

const dayLookup: Record<string, number> = {
  sunday: 0, sun: 0, monday: 1, mon: 1, tuesday: 2, tue: 2, tues: 2,
  wednesday: 3, wed: 3, thursday: 4, thu: 4, thurs: 4, friday: 5, fri: 5,
  saturday: 6, sat: 6,
};

export function deliveryWeekdaysFromText(value: unknown) {
  if (typeof value !== "string") return defaultRules.deliveryWeekdays;
  const names = value.toLowerCase().match(/[a-z]+/g) ?? [];
  const resolved = names.map((name) => dayLookup[name]).filter((day): day is number => day !== undefined);
  if (!resolved.length) return defaultRules.deliveryWeekdays;
  if (resolved.length === 2 && /[-–—]|\bto\b/i.test(value)) {
    const days: number[] = [];
    for (let day = resolved[0]; ; day = (day + 1) % 7) { days.push(day); if (day === resolved[1]) break; }
    return days;
  }
  return [...new Set(resolved)].sort();
}

function timeLabel(value: unknown, fallback: string) {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : fallback;
}

function formatTime(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

export function businessRulesFromValue(value: unknown): BusinessRules {
  const candidate = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const start = timeLabel(candidate.deliveryWindowStart, "10:00");
  const end = timeLabel(candidate.deliveryWindowEnd, "18:00");
  return {
    maintenanceMode:
      typeof candidate.maintenanceMode === "boolean"
        ? candidate.maintenanceMode
        : defaultRules.maintenanceMode,
    acceptWeeklyTrials: typeof candidate.acceptWeeklyTrials === "boolean" ? candidate.acceptWeeklyTrials : defaultRules.acceptWeeklyTrials,
    enableCheckoutPauses: typeof candidate.enableCheckoutPauses === "boolean" ? candidate.enableCheckoutPauses : defaultRules.enableCheckoutPauses,
    deliveryWeekdays: deliveryWeekdaysFromText(candidate.deliveryDays),
    deliveryWindow: `${formatTime(start)} - ${formatTime(end)}`,
    orderCutoff: normalizeOrderCutoff(typeof candidate.orderCutoff === "string" ? candidate.orderCutoff : defaultRules.orderCutoff),
    customMonthlyDays:
      typeof candidate.customMonthlyDays === "number" &&
      Number.isInteger(candidate.customMonthlyDays) &&
      candidate.customMonthlyDays > 0
        ? candidate.customMonthlyDays
        : defaultRules.customMonthlyDays,
  };
}

export async function getBusinessRules(): Promise<BusinessRules> {
  try {
    const setting = await db.setting.findUnique({ where: { key: "admin_settings" } });
    return businessRulesFromValue(setting?.value);
  } catch { return defaultRules; }
}
