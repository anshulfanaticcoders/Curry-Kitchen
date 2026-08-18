import "server-only";

import { db } from "@/lib/db";

export type BusinessRules = {
  maintenanceMode: boolean;
  acceptWeeklyTrials: boolean;
  enableCheckoutPauses: boolean;
  deliveryWeekdays: number[];
  deliveryWindow: string;
  orderCutoff: string;
};

const defaultRules: BusinessRules = {
  maintenanceMode: false,
  acceptWeeklyTrials: true,
  enableCheckoutPauses: true,
  deliveryWeekdays: [1, 2, 3, 4, 5],
  deliveryWindow: "8:00 AM - 11:00 AM",
  orderCutoff: "Noon",
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
  return typeof value === "string" && /^\d{2}:\d{2}$/.test(value) ? value : fallback;
}

function formatTime(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

export function businessRulesFromValue(value: unknown): BusinessRules {
  const candidate = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const start = timeLabel(candidate.deliveryWindowStart, "08:00");
  const end = timeLabel(candidate.deliveryWindowEnd, "11:00");
  return {
    maintenanceMode:
      typeof candidate.maintenanceMode === "boolean"
        ? candidate.maintenanceMode
        : defaultRules.maintenanceMode,
    acceptWeeklyTrials: typeof candidate.acceptWeeklyTrials === "boolean" ? candidate.acceptWeeklyTrials : defaultRules.acceptWeeklyTrials,
    enableCheckoutPauses: typeof candidate.enableCheckoutPauses === "boolean" ? candidate.enableCheckoutPauses : defaultRules.enableCheckoutPauses,
    deliveryWeekdays: deliveryWeekdaysFromText(candidate.deliveryDays),
    deliveryWindow: `${formatTime(start)} - ${formatTime(end)}`,
    orderCutoff: typeof candidate.orderCutoff === "string" ? candidate.orderCutoff : defaultRules.orderCutoff,
  };
}

export async function getBusinessRules(): Promise<BusinessRules> {
  try {
    const setting = await db.setting.findUnique({ where: { key: "admin_settings" } });
    return businessRulesFromValue(setting?.value);
  } catch { return defaultRules; }
}

export function isAfterOrderCutoff(cutoff: string, now = new Date()) {
  const hourMinute = cutoff === "Noon" ? [12, 0] : cutoff === "9:00 AM" ? [9, 0] : cutoff === "3:00 PM" ? [15, 0] : [12, 0];
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);
  return hour * 60 + minute >= hourMinute[0] * 60 + hourMinute[1];
}
