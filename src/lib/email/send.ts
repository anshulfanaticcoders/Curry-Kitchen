import "server-only";

import { Resend } from "resend";
import type { TransactionalEmail } from "@/lib/email/templates";
import { getAdminSettings } from "@/lib/server/admin";

let client: Resend | null = null;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  return (client ??= new Resend(process.env.RESEND_API_KEY));
}

// Never throws: a mail outage (or a missing RESEND_API_KEY before launch) must
// not break signup, checkout, or admin actions that trigger emails.
export async function sendTransactionalEmail({
  to,
  email,
  idempotencyKey,
}: {
  to: string | string[];
  email: TransactionalEmail;
  idempotencyKey?: string;
}): Promise<{ sent: boolean }> {
  const resend = getResend();

  if (!resend) {
    console.error("[email] RESEND_API_KEY missing, email NOT sent:", email.subject, to);
    return { sent: false };
  }

  // The Resend sandbox sender only delivers to the account owner, so customers
  // would silently receive nothing. Production must use a verified domain.
  if (!process.env.MAIL_FROM && process.env.NODE_ENV === "production") {
    console.error("[email] MAIL_FROM missing in production, email NOT sent:", email.subject, to);
    return { sent: false };
  }

  try {
    const { error } = await resend.emails.send(
      {
        from: process.env.MAIL_FROM ?? "Curry Kitchen <onboarding@resend.dev>",
        replyTo: process.env.MAIL_REPLY_TO,
        to,
        subject: email.subject,
        text: email.text,
        html: email.html,
      },
      idempotencyKey ? { idempotencyKey } : undefined,
    );

    if (error) {
      console.error("[email] send failed:", email.subject, error);
      return { sent: false };
    }

    return { sent: true };
  } catch (error) {
    console.error("[email] send failed:", email.subject, error);
    return { sent: false };
  }
}

export async function getAdminAlertEmail(): Promise<string> {
  if (process.env.ADMIN_ALERT_EMAIL) return process.env.ADMIN_ALERT_EMAIL;

  const settings = await getAdminSettings();
  return settings.supportEmail || "currykitcheninc@gmail.com";
}
