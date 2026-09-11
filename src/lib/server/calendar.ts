import "server-only";

import { getBusinessRules } from "@/lib/business-rules";
import { db } from "@/lib/db";
import type { CustomerCalendarData } from "@/lib/types";

function toDateKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
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
        packages: {
          where: { status: { notIn: ["PENDING_PAYMENT", "CANCELLED"] } },
          include: {
            package: { select: { name: true } },
            deliveryDays: { orderBy: { deliveryDate: "asc" } },
            pauseRequests: { where: { status: { in: ["APPROVED", "ACTIVE", "ENDED"] } } },
            holidayCredits: { include: { businessHoliday: true } },
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
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

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
      cursor.setDate(cursor.getDate() + 1);
      guard += 1;
    }
  }

  for (const customerPackage of customer.packages) {
    const planName = customerPackage.package.name;
    const countableDeliveryDays = customerPackage.deliveryDays
      .filter((day) => !["CANCELLED", "PAUSED"].includes(day.status))
      .sort((left, right) => left.deliveryDate.getTime() - right.deliveryDate.getTime());
    const elapsedDeliveryDays = countableDeliveryDays.filter(
      (day) => day.status === "DELIVERED" || day.deliveryDate < today,
    ).length;
    const completedDays = Math.max(customerPackage.usedDeliveryDays, elapsedDeliveryDays);
    const completedDayIds = new Set(
      countableDeliveryDays.slice(0, completedDays).map((day) => day.id),
    );
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
      const paused = day.status === "PAUSED" || day.status === "CANCELLED";
      const completed =
        day.status === "DELIVERED" || completedDayIds.has(day.id);
      const coveredByPause = customerPackage.pauseRequests.some(
        (pause) => day.deliveryDate >= pause.startDate && day.deliveryDate <= pause.endDate,
      );
      if (!holidayCredit && paused && coveredByPause) continue;

      events.push({
        date: toDateKey(day.deliveryDate),
        type: holidayCredit
          ? "holiday"
          : paused
            ? "pause"
            : completed
              ? "delivery-completed"
              : "delivery",
        label: holidayCredit
          ? `${holidayCredit.businessHoliday.name} — kitchen closed; delivery moved to ${formatFullDate(holidayCredit.replacementDeliveryDate)}`
          : paused
            ? `${planName} — delivery paused`
            : completed
              ? `${planName} — delivered`
              : `${planName} — morning delivery`,
      });
    }

    for (const pause of customerPackage.pauseRequests) {
      // Expand the scheduled pause range into per-day markers.
      const cursor = new Date(pause.startDate);
      cursor.setHours(0, 0, 0, 0);
      const end = new Date(pause.endDate);
      end.setHours(0, 0, 0, 0);
      let guard = 0;

      while (cursor <= end && guard < 62) {
        events.push({
          date: toDateKey(cursor),
          type: "pause",
          label: `${planName} paused${pause.reason ? ` — ${pause.reason}` : ""}`,
        });
        cursor.setDate(cursor.getDate() + 1);
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
        (day) =>
          day.status === "DELIVERED" ||
          (day.deliveryDate < today && !["CANCELLED", "PAUSED"].includes(day.status)),
      ).length;
      const usedDays = Math.max(customerPackage.usedDeliveryDays, elapsedDays);
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
