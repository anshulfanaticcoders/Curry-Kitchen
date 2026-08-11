import { db } from "@/lib/db";
import { sendTransactionalEmail } from "@/lib/email/send";
import {
  createRenewalReminderEmail,
  createSubscriptionEndedEmail,
} from "@/lib/email/templates";
import { getAdminSettings } from "@/lib/server/admin";

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
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const reminderCutoff = new Date(now.getTime() + REMINDER_LEAD_DAYS * 24 * 60 * 60 * 1000);

  let remindersSent = 0;
  let expired = 0;

  if (settings.packageReminderEmails) {
    const endingSoon = await db.customerPackage.findMany({
      where: {
        status: "ACTIVE",
        reminderEmailSentAt: null,
        endDate: { gte: now, lte: reminderCutoff },
      },
      include: { customer: true, package: true },
    });

    for (const customerPackage of endingSoon) {
      if (!customerPackage.customer?.email || !customerPackage.endDate) continue;

      const { sent } = await sendTransactionalEmail({
        to: customerPackage.customer.email,
        email: createRenewalReminderEmail({
          customerName: customerPackage.customer.name,
          planName: customerPackage.package.name,
          endDate: customerPackage.endDate,
        }),
        idempotencyKey: `renewal-reminder/${customerPackage.id}`,
      });

      // Only stamp on success so packages stay eligible while the Resend key
      // is missing or the API is down.
      if (sent) {
        await db.customerPackage.update({
          where: { id: customerPackage.id },
          data: { reminderEmailSentAt: new Date() },
        });
        remindersSent += 1;
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

  for (const customerPackage of pastEnd) {
    // The EXPIRED transition is the dedupe for the ended email: flip first so a
    // retried cron run never emails the same package twice.
    await db.customerPackage.update({
      where: { id: customerPackage.id },
      data: { status: "EXPIRED" },
    });
    expired += 1;

    if (
      settings.packageCompletedEmails &&
      customerPackage.customer?.email &&
      customerPackage.endDate
    ) {
      await sendTransactionalEmail({
        to: customerPackage.customer.email,
        email: createSubscriptionEndedEmail({
          customerName: customerPackage.customer.name,
          planName: customerPackage.package.name,
          endDate: customerPackage.endDate,
        }),
        idempotencyKey: `subscription-ended/${customerPackage.id}`,
      });
    }
  }

  return Response.json({ remindersSent, expired });
}
