import "server-only";

import { z } from "zod";
import { getBusinessRules, isAfterOrderCutoff } from "@/lib/business-rules";
import { db } from "@/lib/db";
import {
  addDays,
  buildPackageScheduleAvailability,
  businessDateInput,
  calculateDeliveryDates,
  dateToInput,
  inputToDate,
  isDeliveryDayElapsed,
  nextEligiblePackageStartInput,
  type PackageScheduleAvailability,
  type PublicBusinessHoliday,
  type ScheduleDateRange,
} from "@/lib/package-schedule";
import { lockCalendars, lockPackageCalendar } from "@/lib/server/calendar-lock";

export const MAX_CUSTOMER_PAUSE_DAYS = 14;
const uncountedStatuses = ["CANCELLED", "PAUSED", "DECLINED", "PENDING_PAYMENT"];
const movableStatuses = ["PAID", "ACCEPTED", "PREPARING"] as const;
const pauseDaySnapshot = z.object({
  id: z.string(), deliveryDate: z.string(), status: z.string(),
  menuSummary: z.string().nullable(), deliveryWindow: z.string(),
});
const pauseProvenance = z.object({ originals: z.array(pauseDaySnapshot).min(1), replacements: z.array(pauseDaySnapshot).min(1) });

function inclusiveCalendarDays(startDate: Date, endDate: Date) {
  return Math.floor((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1;
}

function dateRange(startDate: Date, endDate: Date): ScheduleDateRange {
  return { startDate, endDate };
}

function maxDate(dates: Date[]) {
  return dates.length ? new Date(Math.max(...dates.map((date) => date.getTime()))) : null;
}

function replacementDates({
  count,
  afterDate,
  deliveryWeekdays,
  holidays,
  occupiedDates,
}: {
  count: number;
  afterDate: Date;
  deliveryWeekdays: number[];
  holidays: ScheduleDateRange[];
  occupiedDates: Date[];
}) {
  const occupied = occupiedDates.map((date) => dateRange(date, date));
  return calculateDeliveryDates(
    count,
    addDays(afterDate, 1),
    deliveryWeekdays,
    [...holidays, ...occupied],
  );
}

async function activeHolidayRanges(
  client: Pick<typeof db, "businessHoliday">,
): Promise<ScheduleDateRange[]> {
  const holidays = await client.businessHoliday.findMany({
    where: { status: "ACTIVE" },
    select: { startDate: true, endDate: true },
  });
  return holidays.map((holiday) => dateRange(holiday.startDate, holiday.endDate));
}

export function getActiveHolidayDateRanges(client: Pick<typeof db, "businessHoliday"> = db) {
  return activeHolidayRanges(client);
}

function publicHoliday(holiday: {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  note: string | null;
}): PublicBusinessHoliday {
  return {
    id: holiday.id,
    name: holiday.name,
    startDate: dateToInput(holiday.startDate),
    endDate: dateToInput(holiday.endDate),
    note: holiday.note ?? "",
  };
}

export async function getPackageScheduleAvailability(
  now = new Date(),
): Promise<PackageScheduleAvailability> {
  const rules = await getBusinessRules();
  const today = inputToDate(businessDateInput(now));
  const holidays = await db.businessHoliday
    .findMany({
      where: { status: "ACTIVE", endDate: { gte: today } },
      orderBy: { startDate: "asc" },
      select: { id: true, name: true, startDate: true, endDate: true, note: true },
    })
    .catch(() => []);

  return buildPackageScheduleAvailability({
    now,
    deliveryWeekdays: rules.deliveryWeekdays,
    orderCutoff: rules.orderCutoff,
    deliveryWindow: rules.deliveryWindow,
    orderCutoffPassed: isAfterOrderCutoff(rules.orderCutoff, now),
    holidays: holidays.map(publicHoliday),
  });
}

export async function scheduleCustomerPause({
  customerPackageId,
  requestedByUserId,
  startDateInput,
  endDateInput,
  reason,
}: {
  customerPackageId: string;
  requestedByUserId: string;
  startDateInput: string;
  endDateInput: string;
  reason?: string;
}) {
  const rules = await getBusinessRules();
  const startDate = inputToDate(startDateInput);
  const endDate = inputToDate(endDateInput);
  const earliestStart = nextEligiblePackageStartInput(new Date(), rules.deliveryWeekdays);

  if (startDateInput < earliestStart) {
    throw new Error(`Pause must start on ${earliestStart} or later.`);
  }
  if (endDate < startDate) {
    throw new Error("Pause end date must be on or after its start date.");
  }
  if (inclusiveCalendarDays(startDate, endDate) > MAX_CUSTOMER_PAUSE_DAYS) {
    throw new Error(`A customer pause can be no longer than ${MAX_CUSTOMER_PAUSE_DAYS} calendar days.`);
  }

  return db.$transaction(async (tx) => {
    await lockPackageCalendar(tx, customerPackageId);
    const customerPackage = await tx.customerPackage.findUnique({
      where: { id: customerPackageId },
      include: { deliveryDays: true, pauseRequests: true, package: true },
    });

    if (!customerPackage) throw new Error("Package was not found.");
    if (customerPackage.status !== "ACTIVE") throw new Error("Only an active package can be scheduled for pause.");
    if (customerPackage.customerPauseUsed) throw new Error("This package has already used its one customer pause.");
    if (customerPackage.pauseRequests.some((pause) => ["ACTIVE", "APPROVED", "REQUESTED"].includes(pause.status))) {
      throw new Error("This package already has a pause scheduled.");
    }

    const affectedDays = customerPackage.deliveryDays
      .filter(
        (day) =>
          movableStatuses.some((status) => status === day.status) &&
          !isDeliveryDayElapsed(day) &&
          day.deliveryDate >= startDate &&
          day.deliveryDate <= endDate,
      )
      .sort((a, b) => a.deliveryDate.getTime() - b.deliveryDate.getTime());

    if (!affectedDays.length) {
      throw new Error("The selected range does not contain any scheduled delivery days.");
    }

    const latestScheduledDate = maxDate(customerPackage.deliveryDays.filter((day) => !uncountedStatuses.includes(day.status)).map((day) => day.deliveryDate)) ?? endDate;
    const holidays = await activeHolidayRanges(tx);
    const occupiedDates = customerPackage.deliveryDays
      .filter((day) => !affectedDays.some((affected) => affected.id === day.id) && !uncountedStatuses.includes(day.status))
      .map((day) => day.deliveryDate);
    const replacements = replacementDates({
      count: affectedDays.length,
      afterDate: latestScheduledDate,
      deliveryWeekdays: rules.deliveryWeekdays,
      holidays: [...holidays, dateRange(startDate, endDate)],
      occupiedDates,
    });
    const resumeDate = customerPackage.deliveryDays
      .filter(
        (day) =>
          !uncountedStatuses.includes(day.status) &&
          !isDeliveryDayElapsed(day) &&
          !affectedDays.some((affected) => affected.id === day.id) &&
          day.deliveryDate > endDate,
      )
      .sort((a, b) => a.deliveryDate.getTime() - b.deliveryDate.getTime())[0]?.deliveryDate ?? replacements[0];

    await tx.packageDeliveryDay.updateMany({
      where: { id: { in: affectedDays.map((day) => day.id) } },
      data: { status: "CANCELLED" },
    });
    const replacementRows = replacements.map((deliveryDate) => ({
      id: crypto.randomUUID(),
      customerPackageId,
      deliveryDate,
      status: "PREPARING" as const,
      menuSummary: customerPackage.package.name,
      deliveryWindow: rules.deliveryWindow,
    }));
    await tx.packageDeliveryDay.createMany({ data: replacementRows });
    const pause = await tx.pauseRequest.create({
      data: {
        customerPackageId,
        requestedByUserId,
        status: "ACTIVE",
        startDate,
        endDate,
        reason: reason?.trim() || "Customer scheduled a one-time pause.",
      },
    });
    await tx.auditLog.create({
      data: {
        userId: requestedByUserId, action: "pause.scheduled", entity: "pause_request", entityId: pause.id,
        metadata: {
          originals: affectedDays.map((day) => ({ id: day.id, deliveryDate: day.deliveryDate.toISOString(), status: day.status,
            menuSummary: day.menuSummary, deliveryWindow: day.deliveryWindow })),
          replacements: replacementRows.map((day) => ({ id: day.id, deliveryDate: day.deliveryDate.toISOString(), status: day.status,
            menuSummary: day.menuSummary, deliveryWindow: day.deliveryWindow })),
        },
      },
    });
    await tx.customerPackage.update({
      where: { id: customerPackageId },
      data: {
        customerPauseUsed: true,
        endDate: replacements.at(-1) ?? customerPackage.endDate,
        reminderEmailSentAt: null,
      },
    });

    return {
      creditedDays: affectedDays.length,
      startDate,
      endDate,
      resumeDate,
      packageEndDate: replacements.at(-1) ?? customerPackage.endDate,
    };
  }, { isolationLevel: "ReadCommitted" });
}

// Undo a customer's scheduled one-time pause so they can book it again with the
// right dates: restore the cancelled days, retire the recorded replacements,
// and give the package its pause back. Only allowed before the pause starts.
export async function resetScheduledCustomerPause(customerPackageId: string) {
  const today = inputToDate(businessDateInput());

  return db.$transaction(async (tx) => {
    await lockPackageCalendar(tx, customerPackageId);
    const customerPackage = await tx.customerPackage.findUnique({
      where: { id: customerPackageId },
      include: { deliveryDays: true, pauseRequests: true, customer: { select: { userId: true } } },
    });
    if (!customerPackage) throw new Error("Package was not found.");

    const pause = customerPackage.pauseRequests.find((request) => request.status === "ACTIVE");
    if (!pause || !customerPackage.customerPauseUsed) {
      throw new Error("This package has no scheduled customer pause to reset.");
    }
    if (customerPackage.status !== "ACTIVE") {
      throw new Error("Only an upcoming pause on an active package can be reset.");
    }
    if (dateToInput(pause.startDate) <= dateToInput(today)) {
      throw new Error("This pause has already started and must be adjusted manually.");
    }

    const provenance = await tx.auditLog.findFirst({
      where: { action: "pause.scheduled", entity: "pause_request", entityId: pause.id },
      orderBy: { createdAt: "desc" },
    });
    const parsed = pauseProvenance.safeParse(provenance?.metadata);
    if (!parsed.success) {
      throw new Error("This older pause has no delivery provenance and must be adjusted manually.");
    }
    const { originals: restoreDays, replacements } = parsed.data;
    const matchesSnapshot = (snapshot: z.infer<typeof pauseDaySnapshot>, status: string) => {
      const day = customerPackage.deliveryDays.find((candidate) => candidate.id === snapshot.id);
      return day && day.status === status && day.deliveryDate.toISOString() === snapshot.deliveryDate
        && day.menuSummary === snapshot.menuSummary && day.deliveryWindow === snapshot.deliveryWindow;
    };
    if (restoreDays.length !== replacements.length
      || !restoreDays.every((day) => matchesSnapshot(day, "CANCELLED"))
      || !replacements.every((day) => matchesSnapshot(day, "PREPARING"))) {
      throw new Error("This schedule no longer matches the pause and must be adjusted manually.");
    }
    const holidays = await activeHolidayRanges(tx);
    if (restoreDays.some((day) => holidays.some((holiday) => new Date(day.deliveryDate) >= holiday.startDate && new Date(day.deliveryDate) <= holiday.endDate))) {
      throw new Error("A kitchen holiday overlaps this pause. Cancel that holiday first or adjust manually.");
    }

    await tx.packageDeliveryDay.updateMany({
      where: { id: { in: replacements.map((day) => day.id) } },
      data: { status: "CANCELLED" },
    });
    await tx.packageDeliveryDay.updateMany({
      where: { id: { in: restoreDays.map((day) => day.id) } },
      data: { status: "PREPARING" },
    });
    await tx.pauseRequest.update({
      where: { id: pause.id },
      data: { status: "REJECTED", adminNote: "Reset by admin so the customer can schedule the pause again." },
    });

    const retiredIds = new Set(replacements.map((day) => day.id));
    const restoredIds = new Set(restoreDays.map((day) => day.id));
    const remainingDates = customerPackage.deliveryDays
      .filter((day) => !retiredIds.has(day.id) && (!uncountedStatuses.includes(day.status) || restoredIds.has(day.id)))
      .map((day) => day.deliveryDate);

    await tx.customerPackage.update({
      where: { id: customerPackageId },
      data: {
        customerPauseUsed: false,
        endDate: maxDate(remainingDates),
        reminderEmailSentAt: null,
      },
    });

    if (customerPackage.customer?.userId) {
      await tx.notification.create({
        data: {
          userId: customerPackage.customer.userId,
          type: "SYSTEM",
          title: "Pause reset",
          body: "Your scheduled pause was reset and your original delivery schedule is restored. You can schedule your pause again with the correct dates.",
        },
      });
    }

    return { restoredDays: restoreDays.length };
  }, { isolationLevel: "ReadCommitted" });
}

export async function createKitchenHoliday({
  name,
  startDateInput,
  endDateInput,
  note,
  createdByUserId,
}: {
  name: string;
  startDateInput: string;
  endDateInput: string;
  note?: string;
  createdByUserId: string;
}) {
  const rules = await getBusinessRules();
  const startDate = inputToDate(startDateInput);
  const endDate = inputToDate(endDateInput);

  if (startDateInput < businessDateInput()) throw new Error("A kitchen holiday cannot start in the past.");
  if (endDate < startDate) throw new Error("Holiday end date must be on or after its start date.");

  // Include pending packages: payment activation can make them eligible while
  // this operation is waiting for a calendar lock.
  const calendarOwners = await db.customerPackage.findMany({
    where: { status: { in: ["ACTIVE", "PAUSED", "PENDING_PAYMENT", "PENDING_STUDENT_VERIFICATION"] } },
    select: { customerId: true },
  });
  const customerIds = [...new Set(calendarOwners.map((item) => item.customerId).filter((id): id is string => Boolean(id)))];
  return db.$transaction(async (tx) => {
    await lockCalendars(tx, customerIds);
    const overlap = await tx.businessHoliday.findFirst({
      where: {
        status: "ACTIVE",
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
    });
    if (overlap) throw new Error(`This range overlaps “${overlap.name}”. Edit or cancel that holiday first.`);

    const holiday = await tx.businessHoliday.create({
      data: { name: name.trim(), startDate, endDate, note: note?.trim() || null, createdByUserId },
    });
    const affectedDays = await tx.packageDeliveryDay.findMany({
      where: {
        deliveryDate: { gte: startDate, lte: endDate },
        status: { in: [...movableStatuses] },
        customerPackage: { status: "ACTIVE", customerId: { in: customerIds } },
      },
      include: {
        customerPackage: {
          include: { deliveryDays: true, package: true, customer: true },
        },
      },
      orderBy: { deliveryDate: "asc" },
    });
    const byPackage = new Map<string, typeof affectedDays>();
    for (const day of affectedDays) {
      if (isDeliveryDayElapsed(day)) continue;
      const group = byPackage.get(day.customerPackageId) ?? [];
      group.push(day);
      byPackage.set(day.customerPackageId, group);
    }
    const holidays = [...(await activeHolidayRanges(tx)), dateRange(startDate, endDate)];

    for (const [customerPackageId, days] of byPackage) {
      const customerPackage = days[0].customerPackage;
      const latestScheduledDate = maxDate(customerPackage.deliveryDays.filter((day) => !uncountedStatuses.includes(day.status)).map((day) => day.deliveryDate)) ?? endDate;
      const occupiedDates = customerPackage.deliveryDays
        .filter((day) => !uncountedStatuses.includes(day.status) && !days.some((affected) => affected.id === day.id))
        .map((day) => day.deliveryDate);
      const pauses = await tx.pauseRequest.findMany({
        where: { customerPackageId, status: { in: ["ACTIVE", "APPROVED", "REQUESTED"] } },
        select: { startDate: true, endDate: true },
      });
      const replacements = replacementDates({
        count: days.length,
        afterDate: latestScheduledDate,
        deliveryWeekdays: rules.deliveryWeekdays,
        holidays: [...holidays, ...pauses],
        occupiedDates,
      });

      for (const [index, day] of days.entries()) {
        const replacement = await tx.packageDeliveryDay.create({
          data: {
            customerPackageId,
            deliveryDate: replacements[index],
            status: "PREPARING",
            menuSummary: day.menuSummary ?? customerPackage.package.name,
            deliveryWindow: day.deliveryWindow,
          },
        });
        await tx.packageDeliveryDay.update({
          where: { id: day.id },
          data: { status: "CANCELLED", menuSummary: `Kitchen holiday: ${holiday.name}` },
        });
        await tx.holidayDeliveryCredit.create({
          data: {
            businessHolidayId: holiday.id,
            customerPackageId,
            originalDeliveryDayId: day.id,
            replacementDeliveryDayId: replacement.id,
            originalDeliveryDate: day.deliveryDate,
            replacementDeliveryDate: replacement.deliveryDate,
            originalMenuSummary: day.menuSummary,
          },
        });
      }

      await tx.customerPackage.update({
        where: { id: customerPackageId },
        data: { endDate: replacements.at(-1), reminderEmailSentAt: null },
      });
      if (customerPackage.customer?.userId) {
        await tx.notification.create({
          data: {
            userId: customerPackage.customer.userId,
            type: "SYSTEM",
            title: "Kitchen holiday — deliveries moved",
            body: `${holiday.name} affects ${days.length} delivery ${days.length === 1 ? "day" : "days"}. The same number has been added to the end of your package, so you receive every delivery you paid for.${holiday.note ? ` ${holiday.note}` : ""}`,
          },
        });
      }
    }

    return { id: holiday.id, affectedPackages: byPackage.size,
      creditedDeliveries: [...byPackage.values()].reduce((total, days) => total + days.length, 0) };
  }, { isolationLevel: "ReadCommitted", timeout: 30_000 });
}

export async function cancelKitchenHoliday(holidayId: string) {
  const today = inputToDate(businessDateInput());

  const calendarOwners = await db.customerPackage.findMany({
    where: { holidayCredits: { some: { businessHolidayId: holidayId } } },
    select: { customerId: true },
  });
  const customerIds = [...new Set(calendarOwners.map((item) => item.customerId).filter((id): id is string => Boolean(id)))];
  return db.$transaction(async (tx) => {
    await lockCalendars(tx, customerIds);
    const holiday = await tx.businessHoliday.findUnique({
      where: { id: holidayId },
      include: { credits: true },
    });
    if (!holiday) throw new Error("Kitchen holiday was not found.");
    if (holiday.status !== "ACTIVE") throw new Error("This kitchen holiday is already inactive.");
    if (holiday.startDate < today) throw new Error("A holiday that has already started cannot be cancelled automatically.");

    const dayIds = holiday.credits.flatMap((credit) => [credit.originalDeliveryDayId, credit.replacementDeliveryDayId]);
    const deliveryDays = await tx.packageDeliveryDay.findMany({ where: { id: { in: dayIds } } });
    const daysById = new Map(deliveryDays.map((day) => [day.id, day]));
    for (const credit of holiday.credits) {
      const original = daysById.get(credit.originalDeliveryDayId);
      const replacement = daysById.get(credit.replacementDeliveryDayId);
      if (!original || !replacement || original.status !== "CANCELLED" || replacement.status !== "PREPARING"
        || original.customerPackageId !== credit.customerPackageId || replacement.customerPackageId !== credit.customerPackageId
        || original.deliveryDate.getTime() !== credit.originalDeliveryDate.getTime()
        || replacement.deliveryDate.getTime() !== credit.replacementDeliveryDate.getTime()
        || isDeliveryDayElapsed(replacement)) {
        throw new Error("This holiday schedule has changed or has delivery activity and must be adjusted manually.");
      }
    }

    const packageIds = Array.from(new Set(holiday.credits.map((credit) => credit.customerPackageId)));
    const affectedPackages = await tx.customerPackage.findMany({
      where: { id: { in: packageIds } },
      select: { id: true, status: true, customerId: true, customer: { select: { userId: true } } },
    });
    if (affectedPackages.length !== packageIds.length || affectedPackages.some((item) => item.status !== "ACTIVE"
      || !customerIds.some((id) => id === item.customerId))) {
      throw new Error("An affected package is no longer active. Adjust its schedule manually.");
    }
    const replacementIds = holiday.credits.map((credit) => credit.replacementDeliveryDayId);
    const chainedHolidayCredit = await tx.holidayDeliveryCredit.findFirst({
      where: {
        originalDeliveryDayId: { in: replacementIds },
        businessHolidayId: { not: holidayId },
        businessHoliday: { status: "ACTIVE" },
      },
      include: { businessHoliday: { select: { name: true } } },
    });
    if (chainedHolidayCredit) {
      throw new Error(`This schedule is also affected by ${chainedHolidayCredit.businessHoliday.name}. Cancel the later holiday first.`);
    }

    const overlappingPause = await tx.pauseRequest.findFirst({
      where: {
        customerPackageId: { in: packageIds },
        status: "ACTIVE",
        startDate: { lte: holiday.endDate },
        endDate: { gte: holiday.startDate },
      },
    });
    if (overlappingPause) {
      throw new Error("A customer pause overlaps this closure. Adjust that package schedule before cancelling the holiday.");
    }

    for (const credit of holiday.credits) {
      await tx.packageDeliveryDay.update({
        where: { id: credit.originalDeliveryDayId },
        data: { status: "PREPARING", menuSummary: credit.originalMenuSummary },
      });
      await tx.packageDeliveryDay.update({ where: { id: credit.replacementDeliveryDayId }, data: { status: "CANCELLED" } });
    }
    await tx.businessHoliday.update({ where: { id: holidayId }, data: { status: "ARCHIVED" } });

    const affectedPackageById = new Map(affectedPackages.map((item) => [item.id, item]));

    for (const customerPackageId of packageIds) {
      const remainingDays = await tx.packageDeliveryDay.findMany({
        where: { customerPackageId, status: { notIn: ["CANCELLED", "PAUSED", "DECLINED", "PENDING_PAYMENT"] } },
        orderBy: { deliveryDate: "desc" },
        take: 1,
      });
      await tx.customerPackage.update({
        where: { id: customerPackageId },
        data: { endDate: remainingDays[0]?.deliveryDate ?? null, reminderEmailSentAt: null },
      });
      const userId = affectedPackageById.get(customerPackageId)?.customer?.userId;
      if (userId) {
        await tx.notification.create({
          data: {
            userId,
            type: "SYSTEM",
            title: "Kitchen holiday cancelled",
            body: `${holiday.name} was cancelled. Your original delivery schedule has been restored.`,
          },
        });
      }
    }

    return { id: holidayId, restoredDeliveries: holiday.credits.length };
  }, { isolationLevel: "ReadCommitted", timeout: 30_000 });
}

export function scheduledResumeInput(endDateInput: string, deliveryWeekdays: number[]) {
  const date = inputToDate(endDateInput);
  let cursor = addDays(date, 1);
  while (!deliveryWeekdays.includes(cursor.getUTCDay())) cursor = addDays(cursor, 1);
  return dateToInput(cursor);
}
