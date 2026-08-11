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

// Every dated event for one customer's packages: deliveries, pauses, and
// package start/end boundaries. Off days are derived client-side from
// deliveryWeekdays so every non-delivery weekday is marked, not just stored rows.
export async function getCustomerCalendarData(
  customerId: string,
): Promise<CustomerCalendarData | null> {
  const [customer, rules] = await Promise.all([
    db.customer.findUnique({
      where: { id: customerId },
      include: {
        packages: {
          where: { status: { notIn: ["PENDING_PAYMENT", "CANCELLED"] } },
          include: {
            package: { select: { name: true } },
            deliveryDays: { orderBy: { deliveryDate: "asc" } },
            pauseRequests: { where: { status: { in: ["APPROVED", "ACTIVE", "ENDED"] } } },
          },
        },
      },
    }),
    getBusinessRules(),
  ]);

  if (!customer) return null;

  const events: CustomerCalendarData["events"] = [];

  for (const customerPackage of customer.packages) {
    const planName = customerPackage.package.name;

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
      const delivered = day.status === "DELIVERED";
      const paused = day.status === "PAUSED" || day.status === "CANCELLED";
      events.push({
        date: toDateKey(day.deliveryDate),
        type: delivered ? "delivered" : paused ? "pause" : "delivery",
        label: paused
          ? `${planName} — delivery paused`
          : `${planName} — ${delivered ? "delivered" : `delivery ${day.deliveryWindow}`}`,
      });
    }

    for (const pause of customerPackage.pauseRequests) {
      // Expand the pause range into per-day markers (self-pauses are one week).
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
    packages: customer.packages.map((customerPackage) => ({
      name: customerPackage.package.name,
      status: packageStatusLabel(customerPackage.status),
    })),
    events,
  };
}
