import "server-only";

import { db } from "@/lib/db";
import {
  createAdminNewSignupEmail,
  createAdminOrderAlertEmail,
  createAdminZelleOrderAlertEmail,
  createOrderConfirmationEmail,
  createVerificationApprovedEmail,
  createVerificationRejectedEmail,
  createZelleOrderReceivedEmail,
} from "@/lib/email/templates";
import { getAdminAlertEmail, sendTransactionalEmail } from "@/lib/email/send";
import { getAdminSettings } from "@/lib/server/admin";

type DecimalLike = { toNumber: () => number } | number | string;

function toNumber(value: DecimalLike) {
  if (typeof value === "object" && "toNumber" in value) {
    return value.toNumber();
  }

  return Number(value);
}

type PaidOrderForEmail = {
  id: string;
  orderNumber: string;
  total: DecimalLike;
  guestName: string | null;
  guestEmail: string | null;
  customer: { name: string; email: string } | null;
  customerPackages: Array<{ startDate: Date | null; package: { name: string } }>;
};

export async function notifyAdminNewSignup({
  userId,
  name,
  email,
  phone,
}: {
  userId: string;
  name: string;
  email: string;
  phone?: string;
}) {
  try {
    const adminEmail = await getAdminAlertEmail();
    await sendTransactionalEmail({
      to: adminEmail,
      email: createAdminNewSignupEmail({ name, email, phone }),
      idempotencyKey: `new-user/${userId}`,
    });
  } catch (error) {
    console.error("[email] signup alert failed", error);
  }
}

export async function sendOrderPaidEmails(order: PaidOrderForEmail) {
  try {
    const settings = await getAdminSettings();
    const customerName = order.customer?.name ?? order.guestName ?? "there";
    const customerEmail = order.customer?.email ?? order.guestEmail;
    const planNames = order.customerPackages.map((item) => item.package.name);
    const startDates = order.customerPackages
      .map((item) => item.startDate)
      .filter((date): date is Date => date instanceof Date)
      .sort((a, b) => a.getTime() - b.getTime());
    const total = toNumber(order.total);

    if (settings.orderConfirmationEmails && customerEmail) {
      await sendTransactionalEmail({
        to: customerEmail,
        email: createOrderConfirmationEmail({
          customerName,
          orderNumber: order.orderNumber,
          planNames,
          total,
          currency: settings.currency,
          startDate: startDates[0] ?? new Date(),
        }),
        idempotencyKey: `order-confirmation/${order.id}`,
      });
    }

    const adminEmail = await getAdminAlertEmail();
    await sendTransactionalEmail({
      to: adminEmail,
      email: createAdminOrderAlertEmail({
        customerName,
        customerEmail: customerEmail ?? "unknown",
        orderNumber: order.orderNumber,
        planNames,
        total,
        currency: settings.currency,
      }),
      idempotencyKey: `admin-order-alert/${order.id}`,
    });
  } catch (error) {
    console.error("[email] paid order emails failed", error);
  }
}

export async function sendZelleOrderEmails({
  orderId,
  orderNumber,
  customerName,
  customerEmail,
  planNames,
  total,
}: {
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  planNames: string[];
  total: number;
}) {
  try {
    const settings = await getAdminSettings();

    await sendTransactionalEmail({
      to: customerEmail,
      email: createZelleOrderReceivedEmail({
        customerName,
        orderNumber,
        planNames,
        total,
        currency: settings.currency,
      }),
      idempotencyKey: `zelle-received/${orderId}`,
    });

    const adminEmail = await getAdminAlertEmail();
    await sendTransactionalEmail({
      to: adminEmail,
      email: createAdminZelleOrderAlertEmail({
        customerName,
        customerEmail,
        orderNumber,
        planNames,
        total,
        currency: settings.currency,
      }),
      idempotencyKey: `zelle-admin-alert/${orderId}`,
    });
  } catch (error) {
    console.error("[email] zelle order emails failed", error);
  }
}

export async function sendVerificationDecisionEmail({
  verificationId,
  approved,
  adminNote,
}: {
  verificationId: string;
  approved: boolean;
  adminNote?: string;
}) {
  try {
    const verification = await db.studentVerification.findUnique({
      where: { id: verificationId },
      include: { customer: true },
    });

    if (!verification?.customer?.email) return;

    const input = {
      customerName: verification.customer.name,
      verificationType: verification.verificationType,
      adminNote,
    };

    await sendTransactionalEmail({
      to: verification.customer.email,
      email: approved
        ? createVerificationApprovedEmail(input)
        : createVerificationRejectedEmail(input),
      idempotencyKey: `verification-${approved ? "approved" : "rejected"}/${verificationId}`,
    });
  } catch (error) {
    console.error("[email] verification decision email failed", error);
  }
}
