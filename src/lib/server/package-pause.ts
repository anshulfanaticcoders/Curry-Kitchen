import "server-only";

import { getBusinessRules } from "@/lib/business-rules";
import { db } from "@/lib/db";
import { calculateDeliveryDates, nextEligiblePackageStartDate } from "@/lib/package-schedule";

// A package is a bundle of delivery-day credits. Pausing freezes the unused
// credits; resuming spends them from the next delivery day onward. Remaining
// credits stay valid for PAUSE_WINDOW_DAYS — after that the package expires.
export const PAUSE_WINDOW_DAYS = 30;

export function pauseDeadline(from = new Date()) {
  return new Date(from.getTime() + PAUSE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
}

// Freeze the package: record how many delivery days were actually used, drop
// the now-stale future schedule, and open a pause with a 30-day resume window.
export async function pausePackage({
  customerPackageId,
  requestedByUserId,
  reason,
  adminNote,
}: {
  customerPackageId: string;
  requestedByUserId?: string;
  reason?: string;
  adminNote?: string;
}) {
  const now = new Date();
  const customerPackage = await db.customerPackage.findUnique({
    where: { id: customerPackageId },
    include: { deliveryDays: true },
  });

  if (!customerPackage) throw new Error("Package was not found.");
  if (customerPackage.status !== "ACTIVE") {
    throw new Error("Only an active package can be paused.");
  }

  const usedDeliveryDays = customerPackage.deliveryDays.filter(
    (day) => day.status !== "CANCELLED" && day.deliveryDate < now,
  ).length;

  await db.$transaction([
    db.customerPackage.update({
      where: { id: customerPackageId },
      data: { status: "PAUSED", usedDeliveryDays },
    }),
    // Future delivery days are regenerated on resume, so remove them now to
    // keep the calendar and packing views honest while paused.
    db.packageDeliveryDay.deleteMany({
      where: { customerPackageId, deliveryDate: { gte: now } },
    }),
    db.pauseRequest.create({
      data: {
        customerPackageId,
        requestedByUserId,
        status: "ACTIVE",
        startDate: now,
        endDate: pauseDeadline(now),
        reason,
        adminNote,
      },
    }),
  ]);

  return {
    remainingDays: Math.max(customerPackage.totalDeliveryDays - usedDeliveryDays, 0),
    resumeBy: pauseDeadline(now),
  };
}

// Reactivate the package: spend the remaining credits starting from the next
// eligible delivery day and rebuild the schedule + end date around them.
export async function resumePackage(customerPackageId: string) {
  const rules = await getBusinessRules();
  const customerPackage = await db.customerPackage.findUnique({
    where: { id: customerPackageId },
    include: { package: true },
  });

  if (!customerPackage) throw new Error("Package was not found.");
  if (customerPackage.status !== "PAUSED") {
    throw new Error("Only a paused package can be resumed.");
  }

  const remainingDays = Math.max(
    customerPackage.totalDeliveryDays - customerPackage.usedDeliveryDays,
    0,
  );

  if (!remainingDays) {
    await db.$transaction([
      db.customerPackage.update({
        where: { id: customerPackageId },
        data: { status: "EXPIRED" },
      }),
      db.pauseRequest.updateMany({
        where: { customerPackageId, status: "ACTIVE" },
        data: { status: "ENDED", endDate: new Date() },
      }),
    ]);
    return { remainingDays: 0, startDate: null, endDate: null };
  }

  const startDate = nextEligiblePackageStartDate(new Date(), rules.deliveryWeekdays);
  const deliveryDates = calculateDeliveryDates(remainingDays, startDate, rules.deliveryWeekdays);

  await db.$transaction([
    db.customerPackage.update({
      where: { id: customerPackageId },
      data: {
        status: "ACTIVE",
        // A package that never delivered anything effectively starts now.
        ...(customerPackage.usedDeliveryDays === 0 ? { startDate } : {}),
        endDate: deliveryDates.at(-1) ?? null,
        // Resuming clears the renewal-reminder stamp so the cron can remind
        // about the recomputed end date.
        reminderEmailSentAt: null,
      },
    }),
    db.packageDeliveryDay.createMany({
      data: deliveryDates.map((deliveryDate) => ({
        customerPackageId,
        deliveryDate,
        status: "PREPARING",
        menuSummary: customerPackage.package.name,
        deliveryWindow: rules.deliveryWindow,
      })),
    }),
    db.pauseRequest.updateMany({
      where: { customerPackageId, status: "ACTIVE" },
      data: { status: "ENDED", endDate: new Date() },
    }),
  ]);

  return { remainingDays, startDate, endDate: deliveryDates.at(-1) ?? null };
}
