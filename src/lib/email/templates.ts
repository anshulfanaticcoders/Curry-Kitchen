export type TransactionalEmail = {
  subject: string;
  text: string;
  html: string;
};

type OrderConfirmationInput = {
  customerName: string;
  orderNumber: string;
  planNames: string[];
  total: number;
  currency: string;
  startDate: Date;
};

type AdminOrderAlertInput = {
  customerName: string;
  customerEmail: string;
  orderNumber: string;
  planNames: string[];
  total: number;
  currency: string;
  dashboardUrl?: string;
};

type SubscriptionLifecycleInput = {
  customerName: string;
  planName: string;
  endDate: Date;
  renewUrl?: string;
};

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };

    return entities[character];
  });
}

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
  }).format(value);
}

function route(path: string) {
  return new URL(path, appUrl).toString();
}

function emailLayout({
  heading,
  intro,
  content,
  cta,
}: {
  heading: string;
  intro: string;
  content: string;
  cta?: { label: string; url: string };
}) {
  const button = cta
    ? `<p style="margin:28px 0 8px"><a href="${escapeHtml(cta.url)}" style="display:inline-block;border-radius:999px;background:#d95d39;color:#fffaf2;padding:12px 20px;font-weight:700;text-decoration:none">${escapeHtml(cta.label)}</a></p>`
    : "";

  return `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#fff7ed;color:#29231e;font-family:Arial,sans-serif;line-height:1.55">
    <main style="max-width:620px;margin:0 auto;padding:28px 16px">
      <section style="overflow:hidden;border:1px solid #ead8c6;border-radius:20px;background:#fffdf9">
        <header style="padding:24px 28px;background:#2f5d50;color:#fffaf2">
          <p style="margin:0 0 4px;font-size:14px;font-weight:700;letter-spacing:.08em;text-transform:uppercase">Curry Kitchen</p>
          <h1 style="margin:0;font-family:Georgia,serif;font-size:28px;line-height:1.2">${escapeHtml(heading)}</h1>
        </header>
        <div style="padding:28px">
          <p style="margin-top:0">${escapeHtml(intro)}</p>
          ${content}
          ${button}
        </div>
      </section>
      <p style="margin:18px 8px 0;color:#6a625b;font-size:12px">You received this service update from Curry Kitchen.</p>
    </main>
  </body>
</html>`;
}

function planList(planNames: string[]) {
  return `<ul style="margin:16px 0;padding-left:20px">${planNames
    .map((plan) => `<li>${escapeHtml(plan)}</li>`)
    .join("")}</ul>`;
}

export function createOrderConfirmationEmail(input: OrderConfirmationInput): TransactionalEmail {
  const total = formatMoney(input.total, input.currency);
  const startDate = formatDate(input.startDate);
  const plans = input.planNames.join(", ");
  const orderUrl = route("/dashboard/orders");

  return {
    subject: `Order confirmed — ${input.orderNumber}`,
    text: `Hi ${input.customerName},\n\nYour Curry Kitchen order ${input.orderNumber} is confirmed.\nPlans: ${plans}\nTotal paid: ${total}\nFirst delivery: ${startDate}\n\nView your orders: ${orderUrl}`,
    html: emailLayout({
      heading: "Your order is confirmed",
      intro: `Hi ${input.customerName}, thank you for choosing Curry Kitchen. Your payment has been received.`,
      content: `<p><strong>Order:</strong> ${escapeHtml(input.orderNumber)}<br><strong>Total paid:</strong> ${escapeHtml(total)}<br><strong>First delivery:</strong> ${escapeHtml(startDate)}</p><p style="margin-bottom:0"><strong>Your plan${input.planNames.length === 1 ? "" : "s"}</strong></p>${planList(input.planNames)}`,
      cta: { label: "View your orders", url: orderUrl },
    }),
  };
}

export function createAdminOrderAlertEmail(input: AdminOrderAlertInput): TransactionalEmail {
  const total = formatMoney(input.total, input.currency);
  const plans = input.planNames.join(", ");
  const dashboardUrl = input.dashboardUrl ?? route("/admin/orders");

  return {
    subject: `New paid order — ${input.orderNumber}`,
    text: `New paid Curry Kitchen order ${input.orderNumber}.\nCustomer: ${input.customerName} (${input.customerEmail})\nPlans: ${plans}\nTotal: ${total}\n\nOpen admin orders: ${dashboardUrl}`,
    html: emailLayout({
      heading: "A new order is paid",
      intro: `${input.customerName} has completed checkout.`,
      content: `<p><strong>Order:</strong> ${escapeHtml(input.orderNumber)}<br><strong>Customer:</strong> ${escapeHtml(input.customerName)}<br><strong>Email:</strong> ${escapeHtml(input.customerEmail)}<br><strong>Total:</strong> ${escapeHtml(total)}</p><p style="margin-bottom:0"><strong>Plans</strong></p>${planList(input.planNames)}`,
      cta: { label: "Open admin orders", url: dashboardUrl },
    }),
  };
}

export function createRenewalReminderEmail(
  input: SubscriptionLifecycleInput,
): TransactionalEmail {
  const endDate = formatDate(input.endDate);
  const renewUrl = input.renewUrl ?? route("/packages");

  return {
    subject: "Your Curry Kitchen renewal reminder",
    text: `Hi ${input.customerName},\n\nYour ${input.planName} plan ends on ${endDate}. Renew now to keep your tiffin deliveries going.\n\nRenew your plan: ${renewUrl}`,
    html: emailLayout({
      heading: "Time to renew your plan",
      intro: `Hi ${input.customerName}, your ${input.planName} plan ends on ${endDate}.`,
      content: "<p>Renew now to keep your tiffin deliveries going without a break.</p>",
      cta: { label: "Renew your plan", url: renewUrl },
    }),
  };
}

export function createSubscriptionEndedEmail(
  input: SubscriptionLifecycleInput,
): TransactionalEmail {
  const endDate = formatDate(input.endDate);
  const renewUrl = input.renewUrl ?? route("/packages");

  return {
    subject: "Your Curry Kitchen plan has ended",
    text: `Hi ${input.customerName},\n\nYour ${input.planName} plan ended on ${endDate}. Renew whenever you are ready for more home-style meals.\n\nRenew your plan: ${renewUrl}`,
    html: emailLayout({
      heading: "Your plan has ended",
      intro: `Hi ${input.customerName}, your ${input.planName} plan ended on ${endDate}.`,
      content: "<p>Whenever you are ready for more home-style meals, choose a new plan and we will take care of the rest.</p>",
      cta: { label: "Renew your plan", url: renewUrl },
    }),
  };
}

type AdminNewSignupInput = {
  name: string;
  email: string;
  phone?: string;
};

type ZelleOrderReceivedInput = {
  customerName: string;
  orderNumber: string;
  planNames: string[];
  total: number;
  currency: string;
};

type AdminZelleOrderAlertInput = ZelleOrderReceivedInput & {
  customerEmail: string;
};

type VerificationDecisionInput = {
  customerName: string;
  verificationType: "STUDENT" | "MILITARY";
  adminNote?: string;
};

function verificationLabel(type: VerificationDecisionInput["verificationType"]) {
  return type === "MILITARY" ? "military" : "student";
}

export function createAdminNewSignupEmail(input: AdminNewSignupInput): TransactionalEmail {
  const customersUrl = route("/admin/customers");
  const phoneLine = input.phone ? `\nPhone: ${input.phone}` : "";
  const phoneHtml = input.phone ? `<br><strong>Phone:</strong> ${escapeHtml(input.phone)}` : "";

  return {
    subject: `New customer signup — ${input.name}`,
    text: `A new customer just created a Curry Kitchen account.\n\nName: ${input.name}\nEmail: ${input.email}${phoneLine}\n\nOpen admin customers: ${customersUrl}`,
    html: emailLayout({
      heading: "A new customer signed up",
      intro: `${input.name} just created an account.`,
      content: `<p><strong>Name:</strong> ${escapeHtml(input.name)}<br><strong>Email:</strong> ${escapeHtml(input.email)}${phoneHtml}</p>`,
      cta: { label: "Open admin customers", url: customersUrl },
    }),
  };
}

export function createZelleOrderReceivedEmail(input: ZelleOrderReceivedInput): TransactionalEmail {
  const total = formatMoney(input.total, input.currency);
  const plans = input.planNames.join(", ");
  const ordersUrl = route("/dashboard/orders");

  return {
    subject: `Order received — complete your Zelle payment for ${input.orderNumber}`,
    text: `Hi ${input.customerName},\n\nWe received your Curry Kitchen order ${input.orderNumber}.\nPlans: ${plans}\nAmount due: ${total}\n\nSend your Zelle transfer for ${total} to activate your plan. We will confirm your payment and start your deliveries.\n\nView your orders: ${ordersUrl}`,
    html: emailLayout({
      heading: "We received your order",
      intro: `Hi ${input.customerName}, your order is saved and waiting on your Zelle transfer.`,
      content: `<p><strong>Order:</strong> ${escapeHtml(input.orderNumber)}<br><strong>Amount due:</strong> ${escapeHtml(total)}</p><p>Send your Zelle transfer for <strong>${escapeHtml(total)}</strong> to activate your plan. We confirm payments during business hours and your deliveries start right after.</p><p style="margin-bottom:0"><strong>Your plan${input.planNames.length === 1 ? "" : "s"}</strong></p>${planList(input.planNames)}`,
      cta: { label: "View your orders", url: ordersUrl },
    }),
  };
}

export function createAdminZelleOrderAlertEmail(
  input: AdminZelleOrderAlertInput,
): TransactionalEmail {
  const total = formatMoney(input.total, input.currency);
  const plans = input.planNames.join(", ");
  const paymentsUrl = route("/admin/payments");

  return {
    subject: `Zelle order awaiting payment — ${input.orderNumber}`,
    text: `A Zelle order is waiting for payment confirmation.\n\nOrder: ${input.orderNumber}\nCustomer: ${input.customerName} (${input.customerEmail})\nPlans: ${plans}\nAmount: ${total}\n\nMark it paid once the transfer arrives: ${paymentsUrl}`,
    html: emailLayout({
      heading: "Zelle order awaiting payment",
      intro: `${input.customerName} placed an order and will pay by Zelle.`,
      content: `<p><strong>Order:</strong> ${escapeHtml(input.orderNumber)}<br><strong>Customer:</strong> ${escapeHtml(input.customerName)}<br><strong>Email:</strong> ${escapeHtml(input.customerEmail)}<br><strong>Amount:</strong> ${escapeHtml(total)}</p><p>Once the transfer arrives, mark the payment as paid to activate the plan.</p><p style="margin-bottom:0"><strong>Plans</strong></p>${planList(input.planNames)}`,
      cta: { label: "Open admin payments", url: paymentsUrl },
    }),
  };
}

export function createVerificationApprovedEmail(
  input: VerificationDecisionInput,
): TransactionalEmail {
  const label = verificationLabel(input.verificationType);
  const ordersUrl = route("/dashboard/orders");

  return {
    subject: "You're verified — your Curry Kitchen plan is active",
    text: `Hi ${input.customerName},\n\nYour ${label} verification is approved and your plan is now active. Your delivery schedule is ready in your dashboard.\n\nView your orders: ${ordersUrl}`,
    html: emailLayout({
      heading: "Your verification is approved",
      intro: `Hi ${input.customerName}, your ${label} verification is approved and your plan is now active.`,
      content: "<p>Your delivery schedule is ready in your dashboard. We look forward to serving you.</p>",
      cta: { label: "View your orders", url: ordersUrl },
    }),
  };
}

export function createVerificationRejectedEmail(
  input: VerificationDecisionInput,
): TransactionalEmail {
  const label = verificationLabel(input.verificationType);
  const ordersUrl = route("/dashboard/orders");
  const noteText = input.adminNote ? `\nReason: ${input.adminNote}` : "";
  const noteHtml = input.adminNote
    ? `<p><strong>Reason:</strong> ${escapeHtml(input.adminNote)}</p>`
    : "";

  return {
    subject: "We could not verify your Curry Kitchen plan",
    text: `Hi ${input.customerName},\n\nWe could not approve your ${label} verification.${noteText}\n\nPlease reply to this email or upload a clearer ID so we can activate your plan.\n\nView your orders: ${ordersUrl}`,
    html: emailLayout({
      heading: "We could not verify your ID",
      intro: `Hi ${input.customerName}, we could not approve your ${label} verification.`,
      content: `${noteHtml}<p>Please reply to this email or upload a clearer ID so we can activate your plan.</p>`,
      cta: { label: "View your orders", url: ordersUrl },
    }),
  };
}
