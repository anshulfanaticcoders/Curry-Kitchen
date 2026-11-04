import "server-only";
import { db } from "@/lib/db";
import { getBusinessRules } from "@/lib/business-rules";
import { businessDateInput, inputToDate, isDeliveryDayElapsed } from "@/lib/package-schedule";

// These are admin-authorized meals, never evidence of a paid order.
export async function getPendingRenewalDeliveries(customerId: string, now = new Date()) {
  const records = await db.manualDelivery.findMany({
    where: { customerId, treatment: "AWAITING_RENEWAL", status: "PREPARING",
      deliveryDate: { gte: inputToDate(businessDateInput(now), 0) } },
    include: { sourcePackage: { include: { package: { include: { items: { orderBy: { sortOrder: "asc" } } } },
      order: { select: { foodPreferences: true, allergies: true } } } } },
    orderBy: { deliveryDate: "asc" },
  });
  if (!records.length) return [];
  const rules = await getBusinessRules();
  const holidays = await db.businessHoliday.findMany({ where: { status: "ACTIVE" }, select: { startDate: true, endDate: true } });
  return records.filter((record) => record.sourcePackage?.customerId === customerId
    && rules.deliveryWeekdays.includes(record.deliveryDate.getUTCDay())
    && !holidays.some((holiday) => holiday.startDate <= record.deliveryDate && record.deliveryDate <= holiday.endDate)
    && !isDeliveryDayElapsed({ deliveryDate: record.deliveryDate, status: "PREPARING", deliveryWindow: rules.deliveryWindow }, now));
}
