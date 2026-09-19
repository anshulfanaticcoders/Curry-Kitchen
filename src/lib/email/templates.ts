import "server-only";

import { getAppUrl } from "@/lib/app-url";
import { getEmailTemplateOverrides } from "@/lib/email/template-overrides";
import {
  EMAIL_TEMPLATES,
  type EmailBrand,
  type EmailTemplateId,
  renderEmailTemplate,
  type TransactionalEmail,
} from "@/lib/email/template-registry";
import { getAdminSettings } from "@/lib/server/admin";
import { BUSINESS_TIME_ZONE, formatOrderCutoff } from "@/lib/package-schedule";

export type { TransactionalEmail } from "@/lib/email/template-registry";

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: BUSINESS_TIME_ZONE,
  }).format(value);
}

// "08:00" -> "8:00 AM"
function formatClock(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return value;
  const suffix = hours >= 12 ? "PM" : "AM";
  return `${hours % 12 || 12}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

// Business details from admin settings, used in the footer and as {{variables}}.
export async function getEmailBrand(): Promise<Partial<EmailBrand>> {
  try {
    const settings = await getAdminSettings();
    return {
      businessName: settings.businessName,
      supportEmail: settings.supportEmail,
      phone: settings.phone,
      deliveryWindow: `${formatClock(settings.deliveryWindowStart)} - ${formatClock(settings.deliveryWindowEnd)} Pacific Time`,
      deliveryDays: settings.deliveryDays,
      serviceAreas: settings.serviceAreas,
      orderCutoff: `${formatOrderCutoff(settings.orderCutoff)} Pacific Time`,
      pausePolicy: settings.enableCheckoutPauses
        ? "Eligible packages allow one customer-scheduled pause. Choose the available dates in your dashboard; affected deliveries move to the end of the package. Contact our team if you need help."
        : "Contact our team if you need to pause or adjust your delivery schedule.",
    };
  } catch {
    return {};
  }
}

// Admin edits (stored in the settings table) win over the built-in copy.
async function render(id: EmailTemplateId, variables: Record<string, string>): Promise<TransactionalEmail> {
  const [overrides, brand] = await Promise.all([getEmailTemplateOverrides(), getEmailBrand()]);

  return renderEmailTemplate({
    id,
    variables,
    ctaUrl: new URL(EMAIL_TEMPLATES[id].ctaPath, getAppUrl()).toString(),
    fields: overrides[id],
    brand,
  });
}

export function createOrderConfirmationEmail(input: {
  customerName: string;
  orderNumber: string;
  planNames: string[];
  total: number;
  currency: string;
  startDate: Date | null;
}) {
  return render("orderConfirmation", {
    customerName: input.customerName,
    orderNumber: input.orderNumber,
    plans: input.planNames.join(", "),
    total: formatMoney(input.total, input.currency),
    startDate: input.startDate ? formatDate(input.startDate) : "Not yet scheduled",
  });
}

export function createAdminOrderAlertEmail(input: {
  customerName: string;
  customerEmail: string;
  orderNumber: string;
  planNames: string[];
  total: number;
  currency: string;
}) {
  return render("adminOrderAlert", {
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    orderNumber: input.orderNumber,
    plans: input.planNames.join(", "),
    total: formatMoney(input.total, input.currency),
  });
}

type SubscriptionLifecycleInput = {
  customerName: string;
  planName: string;
  endDate: Date;
};

export function createRenewalReminderEmail(input: SubscriptionLifecycleInput) {
  return render("renewalReminder", {
    customerName: input.customerName,
    planName: input.planName,
    endDate: formatDate(input.endDate),
  });
}

export function createSubscriptionEndedEmail(input: SubscriptionLifecycleInput) {
  return render("subscriptionEnded", {
    customerName: input.customerName,
    planName: input.planName,
    endDate: formatDate(input.endDate),
  });
}

export function createAdminNewSignupEmail(input: { name: string; email: string; phone?: string }) {
  return render("adminNewSignup", {
    name: input.name,
    email: input.email,
    phone: input.phone ?? "",
  });
}

type ZelleOrderReceivedInput = {
  customerName: string;
  orderNumber: string;
  planNames: string[];
  total: number;
  currency: string;
};

export function createZelleOrderReceivedEmail(input: ZelleOrderReceivedInput) {
  return render("zelleOrderReceived", {
    customerName: input.customerName,
    orderNumber: input.orderNumber,
    plans: input.planNames.join(", "),
    total: formatMoney(input.total, input.currency),
  });
}

export function createAdminZelleOrderAlertEmail(
  input: ZelleOrderReceivedInput & { customerEmail: string },
) {
  return render("adminZelleOrderAlert", {
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    orderNumber: input.orderNumber,
    plans: input.planNames.join(", "),
    total: formatMoney(input.total, input.currency),
  });
}

type VerificationDecisionInput = {
  customerName: string;
  verificationType: "STUDENT" | "MILITARY";
  adminNote?: string;
};

function verificationVariables(input: VerificationDecisionInput) {
  return {
    customerName: input.customerName,
    verificationType: input.verificationType === "MILITARY" ? "military" : "student",
    adminNote: input.adminNote ?? "",
  };
}

export function createVerificationApprovedEmail(input: VerificationDecisionInput) {
  return render("verificationApproved", verificationVariables(input));
}

export function createVerificationRejectedEmail(input: VerificationDecisionInput) {
  return render("verificationRejected", verificationVariables(input));
}

export function createPauseExpiryReminderEmail(input: {
  customerName: string;
  planName: string;
  remainingDays: number;
  resumeBy: Date;
}) {
  return render("pauseExpiryReminder", {
    customerName: input.customerName,
    planName: input.planName,
    remainingDays: `${input.remainingDays} delivery ${input.remainingDays === 1 ? "day" : "days"}`,
    resumeBy: formatDate(input.resumeBy),
  });
}

export function createOrderCancelledEmail(input: {
  customerName: string;
  orderNumber: string;
  reason?: string;
}) {
  return render("orderCancelled", {
    customerName: input.customerName,
    orderNumber: input.orderNumber,
    reason: input.reason ?? "",
  });
}

export function createContactMessageEmail(input: { name: string; email: string; message: string }) {
  return render("contactMessage", input);
}
