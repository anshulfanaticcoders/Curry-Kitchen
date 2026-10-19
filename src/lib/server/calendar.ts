import "server-only";

import { getBusinessRules } from "@/lib/business-rules";
import { db } from "@/lib/db";
import { dateToInput, isDeliveryDayElapsed } from "@/lib/package-schedule";
import type { CustomerCalendarData } from "@/lib/types";

function toDateKey(date: Date) {
  return dateToInput(date);
}

function packageStatusLabel(status: string) {
  if (status === "ACTIVE") return "Active";
  if (status === "PAUSED") return "Paused";
  if (status === "EXPIRED") return "Ended";
  if (status === "PENDING_STUDENT_VERIFICATION") return "Awaiting verification";
  if (status === "PENDING_PAYMENT") return "Awaiting payment";
  return "Cancelled";
}

function formatFullDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

// Every dated event for one customer's packages: deliveries, pauses, and
// package start/end boundaries. Off days are derived client-side from
// deliveryWeekdays so every non-delivery weekday is marked, not just stored rows.
export async function getCustomerCalendarData(
  customerId: string,
): Promise<CustomerCalendarData | null> {
  const [customer, rules, activeHolidays] = await Promise.all([
    db.customer.findUnique({
      where: { id: customerId },
      include: {
        manualDeliveries: { where: { treatment: { in: ["AWAITING_RENEWAL", "COMPLIMENTARY"] } } },
        packages: {
          where: { status: { not: "PENDING_PAYMENT" } },
          include: {
            package: { select: { name: true } },
            deliveryDays: { orderBy: { deliveryDate: "asc" } },
            pauseRequests: { where: { status: { in: ["APPROVED", "ACTIVE", "ENDED"] } } },
            holidayCredits: { where: { businessHoliday: { status: "ACTIVE" } }, include: { businessHoliday: true } },
          },
        },
      },
    }),
    getBusinessRules(),
    db.businessHoliday.findMany({
      where: { status: "ACTIVE" },
      select: { name: true, startDate: true, endDate: true },
    }),
  ]);

  if (!customer) return null;

  const events: CustomerCalendarData["events"] = [];
  const now = new Date();

  for (const record of customer.manualDeliveries) {
    events.push({
      date: toDateKey(record.deliveryDate),
      type: record.treatment === "COMPLIMENTARY" ? "delivery-complimentary" : "delivery-unallocated",
      label: `${record.label} (${record.quantity} tiffin${record.quantity === 1 ? "" : "s"}) - delivered; ${record.treatment === "COMPLIMENTARY" ? "complimentary" : "awaiting renewal"}`,
    });
  }

  // Mark every active kitchen-holiday date as closed, even when this customer
  // has no delivery scheduled on it — the whole kitchen is off that day.
  for (const holiday of activeHolidays) {
    const cursor = new Date(holiday.startDate);
    let guard = 0;

    while (cursor <= holiday.endDate && guard < 62) {
      events.push({
        date: toDateKey(cursor),
        type: "holiday",
        label: `${holiday.name} — kitchen closed`,
      });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
      guard += 1;
    }
  }

  for (const customerPackage of customer.packages) {
    const planName = customerPackage.package.name;
    const holidayCreditByOriginalDay = new Map(
      customerPackage.holidayCredits.map((credit) => [credit.originalDeliveryDayId, credit]),
    );

    if (customerPackage.startDate) {
      events.push({
        date: toDateKey(customerPackage.startDate),
        type: "package-start",
        label: `${planName} starts`,
      });
    }

    if (customerPackage.endDate) {
      events.push({
        date: toDateKey(customerPackage.endDate),
        type: "package-end",
        label: `${planName} ends`,
      });
    }

    for (const day of customerPackage.deliveryDays) {
      const holidayCredit = holidayCreditByOriginalDay.get(day.id);
      const replacement = holidayCredit ? customerPackage.deliveryDays.find((entry) => entry.id === holidayCredit.replacementDeliveryDayId) : undefined;
      const paused = day.status === "PAUSED" || day.status === "CANCELLED";
      const completed = isDeliveryDayElapsed(day, now);
      const coveredByPause = customerPackage.pauseRequests.some(
        (pause) => day.deliveryDate >= pause.startDate && day.deliveryDate <= pause.endDate,
      );
      if (!holidayCredit && paused && coveredByPause) continue;
      const cancelled = day.status === "CANCELLED" && !holidayCredit && !coveredByPause;
      const missed = day.status === "DECLINED";

      events.push({
        date: toDateKey(day.deliveryDate),
        type: completed
          ? "delivery-completed"
          : missed
            ? "delivery-missed"
            : cancelled
              ? "delivery-cancelled"
              : holidayCredit
          ? "holiday"
          : paused
            ? "pause"
            : completed
              ? "delivery-completed"
              : "delivery",
        label: completed
          ? `${planName} - delivered`
          : missed
            ? `${planName} - not delivered; package credit retained`
            : cancelled
              ? `${planName} - delivery cancelled`
              : holidayCredit
          ? `${holidayCredit.businessHoliday.name} — kitchen closed; ${replacement && ["DECLINED", "PAUSED", "CANCELLED"].includes(replacement.status) ? "delivery credit retained in the updated schedule" : `delivery moved to ${formatFullDate(replacement?.deliveryDate ?? holidayCredit.replacementDeliveryDate)}`}`
          : paused
            ? `${planName} — delivery paused`
            : completed
              ? `${planName} — delivered`
              : `${planName} — ${day.deliveryWindow} Pacific Time`,
      });
    }

    for (const pause of customerPackage.pauseRequests) {
      // Expand the scheduled pause range into per-day markers.
      const cursor = new Date(pause.startDate);
      cursor.setUTCHours(0, 0, 0, 0);
      const end = new Date(pause.endDate);
      end.setUTCHours(0, 0, 0, 0);
      let guard = 0;

      while (cursor <= end && guard < 62) {
        events.push({
          date: toDateKey(cursor),
          type: "pause",
          label: `${planName} paused${pause.reason ? ` — ${pause.reason}` : ""}`,
        });
        cursor.setUTCDate(cursor.getUTCDate() + 1);
        guard += 1;
      }
    }
  }

  return {
    customerId: customer.id,
    customerName: customer.name,
    deliveryWeekdays: rules.deliveryWeekdays,
    packages: customer.packages.map((customerPackage) => {
      const elapsedDays = customerPackage.deliveryDays.filter(
        (day) => isDeliveryDayElapsed(day, now),
      ).length;
      const usedDays = Math.max(customerPackage.usedDeliveryDays, (customerPackage.unrepresentedUsedDays ?? 0) + elapsedDays);
      const activePause = customerPackage.pauseRequests.find(
        (pause) => pause.status === "ACTIVE",
      );

      return {
        name: customerPackage.package.name,
        status: packageStatusLabel(customerPackage.status),
        startDate: customerPackage.startDate ? formatFullDate(customerPackage.startDate) : null,
        endDate: customerPackage.endDate ? formatFullDate(customerPackage.endDate) : null,
        completedDays: usedDays,
        totalDeliveryDays: customerPackage.totalDeliveryDays,
        remainingDays: Math.max(customerPackage.totalDeliveryDays - usedDays, 0),
        resumeBy:
          customerPackage.status === "PAUSED" && activePause
            ? formatFullDate(activePause.endDate)
            : null,
      };
    }),
    events,
  };
}
