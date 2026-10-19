import "server-only";

import { getBusinessRules } from "@/lib/business-rules";
import { db } from "@/lib/db";
import { calculateDeliveryDates, isDeliveryDayElapsed, nextEligiblePackageStartDate } from "@/lib/package-schedule";
import { lockPackageCalendar } from "@/lib/server/calendar-lock";
import { getActiveHolidayDateRanges } from "@/lib/server/delivery-schedule-adjustments";

// A package is a bundle of delivery-day credits. Pausing freezes the unused
// credits; resuming spends them from the next delivery day onward. Remaining
// credits stay valid for PAUSE_WINDOW_DAYS — after that the package expires.
export const PAUSE_WINDOW_DAYS = 30;

export function pauseDeadline(from = new Date()) {
  return new Date(from.getTime() + PAUSE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
}

// Freeze unused credits without removing delivery or adjustment history.
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
  return db.$transaction(async (tx) => {
    await lockPackageCalendar(tx, customerPackageId);
    const now = new Date();
    const customerPackage = await tx.customerPackage.findUnique({
      where: { id: customerPackageId },
      include: { deliveryDays: true },
    });

    if (!customerPackage) throw new Error("Package was not found.");
    if (customerPackage.status !== "ACTIVE") {
      throw new Error("Only an active package can be paused.");
    }

    const elapsedDays = customerPackage.deliveryDays.filter(
      (day) => isDeliveryDayElapsed(day, now),
    ).length;
    const unrepresentedUsedDays = Math.max(
      customerPackage.unrepresentedUsedDays ?? 0, customerPackage.usedDeliveryDays - elapsedDays,
    );
    const usedDeliveryDays = unrepresentedUsedDays + elapsedDays;
    const pendingIds = customerPackage.deliveryDays.filter(
      (day) => !["CANCELLED", "PAUSED", "DECLINED", "PENDING_PAYMENT", "DELIVERED", "OUT_FOR_DELIVERY"].includes(day.status)
        && !isDeliveryDayElapsed(day, now),
    ).map((day) => day.id);

    await tx.customerPackage.update({
      where: { id: customerPackageId },
      data: { status: "PAUSED", usedDeliveryDays, unrepresentedUsedDays, reminderEmailSentAt: null },
    });
    await tx.packageDeliveryDay.updateMany({
      where: { id: { in: pendingIds } },
      data: { status: "PAUSED" },
    });
    await tx.pauseRequest.create({
      data: {
        customerPackageId,
        requestedByUserId,
        status: "ACTIVE",
        startDate: now,
        endDate: pauseDeadline(now),
        reason,
        adminNote,
      },
    });

    return {
      remainingDays: Math.max(customerPackage.totalDeliveryDays - usedDeliveryDays, 0),
      resumeBy: pauseDeadline(now),
    };
  }, { isolationLevel: "ReadCommitted" });
}

// Reactivate the package: spend the remaining credits starting from the next
// eligible delivery day and rebuild the schedule + end date around them.
export async function resumePackage(customerPackageId: string) {
  const rules = await getBusinessRules();
  return db.$transaction(async (tx) => {
    await lockPackageCalendar(tx, customerPackageId);
    const now = new Date();
    const customerPackage = await tx.customerPackage.findUnique({
      where: { id: customerPackageId },
      include: { package: true, deliveryDays: true, pauseRequests: { orderBy: { createdAt: "desc" } } },
    });

    if (!customerPackage) throw new Error("Package was not found.");
    if (customerPackage.status !== "PAUSED") {
      throw new Error("Only a paused package can be resumed.");
    }

    const adminPause = customerPackage.pauseRequests.find((pause) => pause.status === "ACTIVE");
    if (!adminPause || adminPause.endDate < now) {
      throw new Error("The package pause window has ended.");
    }
    const elapsedDays = customerPackage.deliveryDays.filter((day) => isDeliveryDayElapsed(day, now)).length;
    const unrepresentedUsedDays = Math.max(
      customerPackage.unrepresentedUsedDays ?? 0, customerPackage.usedDeliveryDays - elapsedDays,
    );
    const usedDeliveryDays = unrepresentedUsedDays + elapsedDays;
    const remainingDays = Math.max(
      customerPackage.totalDeliveryDays - usedDeliveryDays,
      0,
    );

    if (!remainingDays) {
      await tx.customerPackage.update({
        where: { id: customerPackageId },
        data: { status: "EXPIRED", usedDeliveryDays, unrepresentedUsedDays },
      });
      await tx.pauseRequest.update({
        where: { id: adminPause.id },
        data: { status: "ENDED", endDate: now },
      });
      return { remainingDays: 0, startDate: null, endDate: null };
    }

    const retainedDays = customerPackage.deliveryDays.filter(
      (day) => !["CANCELLED", "PAUSED", "DECLINED", "PENDING_PAYMENT"].includes(day.status),
    );
    const outstandingDays = retainedDays.filter((day) => !isDeliveryDayElapsed(day, now));
    const holidayRanges = await getActiveHolidayDateRanges(tx);
    const scheduledPauses = customerPackage.pauseRequests.filter(
      (pause) => pause.id !== adminPause.id && ["ACTIVE", "APPROVED", "REQUESTED"].includes(pause.status),
    );
    const startDate = nextEligiblePackageStartDate(now, rules.deliveryWeekdays);
    const deliveryDates = calculateDeliveryDates(
      Math.max(remainingDays - outstandingDays.length, 0), startDate, rules.deliveryWeekdays,
      [...holidayRanges, ...scheduledPauses,
        ...retainedDays.map((day) => ({ startDate: day.deliveryDate, endDate: day.deliveryDate }))],
    );
    const effectiveStartDate = deliveryDates[0] ?? startDate;
    const endDates = [...retainedDays.map((day) => day.deliveryDate), ...deliveryDates];
    const endDate = endDates.length ? new Date(Math.max(...endDates.map((date) => date.getTime()))) : null;

    await tx.customerPackage.update({
      where: { id: customerPackageId },
      data: {
        status: "ACTIVE",
        usedDeliveryDays,
        unrepresentedUsedDays,
        // A package that never delivered anything effectively starts now.
        ...(usedDeliveryDays === 0 && !outstandingDays.length ? { startDate: effectiveStartDate } : {}),
        endDate,
        // Resuming clears the renewal-reminder stamp so the cron can remind
        // about the recomputed end date.
        reminderEmailSentAt: null,
      },
    });
    if (deliveryDates.length) await tx.packageDeliveryDay.createMany({
      data: deliveryDates.map((deliveryDate) => ({
        customerPackageId,
        deliveryDate,
        status: "PREPARING",
        menuSummary: customerPackage.package.name,
        deliveryWindow: rules.deliveryWindow,
      })),
    });
    await tx.pauseRequest.update({
      where: { id: adminPause.id },
      data: { status: "ENDED", endDate: now },
    });

    return { remainingDays, startDate: effectiveStartDate, endDate };
  }, { isolationLevel: "ReadCommitted" });
}
