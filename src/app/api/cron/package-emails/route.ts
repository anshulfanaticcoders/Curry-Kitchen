import { db } from "@/lib/db";
import { sendTransactionalEmail } from "@/lib/email/send";
import {
  createPauseExpiryReminderEmail,
  createRenewalReminderEmail,
  createSubscriptionEndedEmail,
} from "@/lib/email/templates";
import { businessDateInput, inputToDate, isDeliveryDayElapsed } from "@/lib/package-schedule";
import { getAdminSettings } from "@/lib/server/admin";
import { lockPackageCalendar } from "@/lib/server/calendar-lock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REMINDER_LEAD_DAYS = 3;

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET) {
    return Response.json({ error: "CRON_SECRET is not configured." }, { status: 503 });
  }

  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const settings = await getAdminSettings();
  const now = new Date();
  const startOfToday = inputToDate(businessDateInput(now));
  const reminderCutoff = new Date(now.getTime() + REMINDER_LEAD_DAYS * 24 * 60 * 60 * 1000);
  const endedPauseCandidates = await db.pauseRequest.findMany({
    where: {
      status: "ACTIVE",
      endDate: { lt: startOfToday },
      customerPackage: { status: "ACTIVE" },
    },
    select: { id: true, customerPackageId: true },
  });
  let scheduledPausesEnded = 0;
  for (const pause of endedPauseCandidates) {
    const changed = await db.$transaction(async (tx) => {
      await lockPackageCalendar(tx, pause.customerPackageId);
      return tx.pauseRequest.updateMany({
        where: { id: pause.id, status: "ACTIVE", endDate: { lt: startOfToday }, customerPackage: { status: "ACTIVE" } },
        data: { status: "ENDED" },
      });
    }, { isolationLevel: "ReadCommitted" });
    scheduledPausesEnded += changed.count;
  }

  let remindersSent = 0;
  let expired = 0;

  if (settings.packageReminderEmails) {
    const endingSoon = await db.customerPackage.findMany({
      where: {
        status: "ACTIVE",
        reminderEmailSentAt: null,
        endDate: { gte: startOfToday, lte: reminderCutoff },
      },
      include: { customer: true, package: true },
    });

    for (const candidate of endingSoon) {
      const customerPackage = await db.$transaction(async (tx) => {
        await lockPackageCalendar(tx, candidate.id);
        return tx.customerPackage.findFirst({
          where: { id: candidate.id, status: "ACTIVE", reminderEmailSentAt: null,
            endDate: { gte: startOfToday, lte: reminderCutoff } },
          include: { customer: true, package: true },
        });
      }, { isolationLevel: "ReadCommitted" });
      if (!customerPackage?.customer?.email || !customerPackage.endDate) continue;
      const endDate = customerPackage.endDate;

      const { sent } = await sendTransactionalEmail({
        to: customerPackage.customer.email,
        email: await createRenewalReminderEmail({
          customerName: customerPackage.customer.name,
          planName: customerPackage.package.name,
          endDate: customerPackage.endDate,
        }),
        idempotencyKey: `renewal-reminder/${customerPackage.id}/${endDate.toISOString()}`,
      });

      // Only stamp on success so packages stay eligible while the Resend key
      // is missing or the API is down.
      if (sent) {
        const stamped = await db.$transaction(async (tx) => {
          await lockPackageCalendar(tx, customerPackage.id);
          return tx.customerPackage.updateMany({
            where: { id: customerPackage.id, status: "ACTIVE", endDate, reminderEmailSentAt: null },
            data: { reminderEmailSentAt: new Date() },
          });
        }, { isolationLevel: "ReadCommitted" });
        remindersSent += stamped.count;
      }
    }
  }

  const pastEnd = await db.customerPackage.findMany({
    where: {
      status: "ACTIVE",
      endDate: { lt: startOfToday },
    },
    include: { customer: true, package: true },
  });

  for (const candidate of pastEnd) {
    const customerPackage = await db.$transaction(async (tx) => {
      await lockPackageCalendar(tx, candidate.id);
      const current = await tx.customerPackage.findUnique({
        where: { id: candidate.id }, include: { customer: true, package: true, deliveryDays: true },
      });
      if (!current || current.status !== "ACTIVE" || !current.endDate || current.endDate >= startOfToday) return null;
      const elapsedDays = current.deliveryDays.filter((day) => isDeliveryDayElapsed(day, now)).length;
      const unrepresentedUsedDays = Math.max(current.unrepresentedUsedDays ?? 0, current.usedDeliveryDays - elapsedDays);
      const claimed = await tx.customerPackage.updateMany({
        where: { id: current.id, status: "ACTIVE", endDate: current.endDate },
        data: { status: "EXPIRED", unrepresentedUsedDays, usedDeliveryDays: unrepresentedUsedDays + elapsedDays },
      });
      return claimed.count ? current : null;
    }, { isolationLevel: "ReadCommitted" });
    if (!customerPackage) continue;
    expired += 1;

    if (
      settings.packageCompletedEmails &&
      customerPackage.customer?.email &&
      customerPackage.endDate
    ) {
      await sendTransactionalEmail({
        to: customerPackage.customer.email,
        email: await createSubscriptionEndedEmail({
          customerName: customerPackage.customer.name,
          planName: customerPackage.package.name,
          endDate: customerPackage.endDate,
        }),
        idempotencyKey: `subscription-ended/${customerPackage.id}/${customerPackage.endDate.toISOString()}`,
      });
    }
  }

  // Paused packages: remaining delivery days stay valid for 30 days from the
  // pause. Remind ~5 days before the window closes, expire once it has passed.
  let pauseRemindersSent = 0;
  let pausesExpired = 0;
  const pauseReminderCutoff = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

  const pausedPackages = await db.customerPackage.findMany({
    where: { status: "PAUSED" },
    include: {
      customer: true,
      package: true,
      pauseRequests: { where: { status: "ACTIVE" }, orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  for (const candidate of pausedPackages) {
    const result = await db.$transaction(async (tx) => {
      await lockPackageCalendar(tx, candidate.id);
      const current = await tx.customerPackage.findUnique({
        where: { id: candidate.id },
        include: { customer: true, package: true, deliveryDays: true,
          pauseRequests: { where: { status: "ACTIVE" }, orderBy: { createdAt: "desc" }, take: 1 } },
      });
      if (!current || current.status !== "PAUSED" || !current.pauseRequests[0]) return null;
      const pause = current.pauseRequests[0];
      if (pause.endDate < now) {
        const elapsedDays = current.deliveryDays.filter((day) => isDeliveryDayElapsed(day, now)).length;
        const unrepresentedUsedDays = Math.max(current.unrepresentedUsedDays ?? 0, current.usedDeliveryDays - elapsedDays);
        const claimed = await tx.customerPackage.updateMany({
          where: { id: current.id, status: "PAUSED", endDate: current.endDate },
          data: { status: "EXPIRED", unrepresentedUsedDays, usedDeliveryDays: unrepresentedUsedDays + elapsedDays },
        });
        if (!claimed.count) return null;
        await tx.pauseRequest.update({ where: { id: pause.id }, data: { status: "ENDED" } });
      }
      return current;
    }, { isolationLevel: "ReadCommitted" });
    if (!result) continue;
    const customerPackage = result;
    const pause = customerPackage.pauseRequests[0];
    if (!pause) continue;

    const usedDeliveryDays = Math.max(customerPackage.usedDeliveryDays,
      (customerPackage.unrepresentedUsedDays ?? 0) + customerPackage.deliveryDays.filter((day) => isDeliveryDayElapsed(day, now)).length);
    const remainingDays = Math.max(
      customerPackage.totalDeliveryDays - usedDeliveryDays,
      0,
    );

    if (pause.endDate < now) {
      pausesExpired += 1;

      if (settings.packageCompletedEmails && customerPackage.customer?.email) {
        await sendTransactionalEmail({
          to: customerPackage.customer.email,
          email: await createSubscriptionEndedEmail({
            customerName: customerPackage.customer.name,
            planName: customerPackage.package.name,
            endDate: pause.endDate,
          }),
          idempotencyKey: `pause-expired/${customerPackage.id}/${pause.id}/${pause.endDate.toISOString()}`,
        });
      }
      continue;
    }

    if (
      settings.packageReminderEmails &&
      customerPackage.customer?.email &&
      pause.endDate <= pauseReminderCutoff &&
      !customerPackage.reminderEmailSentAt
    ) {
      const { sent } = await sendTransactionalEmail({
        to: customerPackage.customer.email,
        email: await createPauseExpiryReminderEmail({
          customerName: customerPackage.customer.name,
          planName: customerPackage.package.name,
          remainingDays,
          resumeBy: pause.endDate,
        }),
        idempotencyKey: `pause-reminder/${customerPackage.id}/${pause.id}/${pause.endDate.toISOString()}`,
      });

      if (sent) {
        const stamped = await db.$transaction(async (tx) => {
          await lockPackageCalendar(tx, customerPackage.id);
          return tx.customerPackage.updateMany({
            where: { id: customerPackage.id, status: "PAUSED", endDate: customerPackage.endDate,
              reminderEmailSentAt: null, pauseRequests: { some: { id: pause.id, status: "ACTIVE", endDate: pause.endDate } } },
            data: { reminderEmailSentAt: new Date() },
          });
        }, { isolationLevel: "ReadCommitted" });
        pauseRemindersSent += stamped.count;
      }
    }
  }

  return Response.json({
    remindersSent,
    expired,
    pauseRemindersSent,
    pausesExpired,
    scheduledPausesEnded,
  });
}
