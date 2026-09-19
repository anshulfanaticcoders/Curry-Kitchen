// Shared by the server (real sends) and the admin editor (live preview), so
// keep this file free of server-only imports.

export type TransactionalEmail = {
  subject: string;
  text: string;
  html: string;
};

export type EmailTemplateFields = {
  subject: string;
  heading: string;
  intro: string;
  body: string;
  ctaLabel: string;
};

export type EmailTemplateDefinition = {
  label: string;
  description: string;
  audience: "customer" | "admin";
  ctaPath: string;
  // Placeholder name -> sample value used by the admin preview.
  variables: Record<string, string>;
  defaults: EmailTemplateFields;
};

// Business details available in every template. Sends and previews use saved
// admin settings; these defaults apply when settings are unavailable.
export type EmailBrand = {
  businessName: string;
  supportEmail: string;
  phone: string;
  deliveryWindow: string;
  deliveryDays: string;
  serviceAreas: string;
  orderCutoff: string;
  pausePolicy: string;
};

export const DEFAULT_EMAIL_BRAND: EmailBrand = {
  businessName: "Curry Kitchen",
  supportEmail: "currykitcheninc@gmail.com",
  phone: "(858) 599-1613",
  deliveryWindow: "10:00 AM - 6:00 PM Pacific Time",
  deliveryDays: "Monday - Friday",
  serviceAreas: "San Diego, Chula Vista, La Jolla",
  orderCutoff: "8:00 PM Pacific Time",
  pausePolicy: "Check your dashboard for available pause options or contact our team for help.",
};

export const EMAIL_BRAND_VARIABLE_NAMES = Object.keys(DEFAULT_EMAIL_BRAND) as Array<keyof EmailBrand>;

const CUSTOMER_FOOTER =
  "Questions? Reply to this email or call **{{phone}}** — a real person from our kitchen will get back to you.";

export const EMAIL_TEMPLATES = {
  orderConfirmation: {
    label: "Order confirmation",
    description: "Sent to the customer once payment is confirmed.",
    audience: "customer",
    ctaPath: "/dashboard/orders",
    variables: {
      customerName: "Priya",
      orderNumber: "CK-482913-201",
      plans: "Monthly Veg Tiffin",
      total: "$189.00",
      startDate: "September 2, 2026",
    },
    defaults: {
      subject: "Order confirmed — {{orderNumber}}",
      heading: "Thank you for your order",
      intro:
        "Hi {{customerName}}, thank you for choosing {{businessName}}. Your payment has been received. Check your dashboard for package activation and delivery status.",
      body: `**Order:** {{orderNumber}}
**Plan:** {{plans}}
**Total paid:** {{total}}
**First delivery:** {{startDate}}

**What happens next**
Every meal is cooked fresh in our kitchen on the morning of delivery and arrives between {{deliveryWindow}} on your scheduled days ({{deliveryDays}}). Your dashboard shows your delivery calendar once the package is active.

New orders for next-day delivery must be placed before {{orderCutoff}}, subject to delivery days and kitchen holidays.

**Travelling or need a break?**
{{pausePolicy}}

${CUSTOMER_FOOTER}`,
      ctaLabel: "View your orders",
    },
  },
  zelleOrderReceived: {
    label: "Zelle order received",
    description: "Sent to the customer when they choose Zelle and the order is waiting for payment.",
    audience: "customer",
    ctaPath: "/dashboard/orders",
    variables: {
      customerName: "Priya",
      orderNumber: "CK-482913-201",
      plans: "Monthly Veg Tiffin",
      total: "$189.00",
    },
    defaults: {
      subject: "Order received — complete your Zelle payment for {{orderNumber}}",
      heading: "One step left: send your Zelle payment",
      intro:
        "Hi {{customerName}}, we have saved your order. Payment confirmation is required before your deliveries can be activated.",
      body: `**Order:** {{orderNumber}}
**Plan:** {{plans}}
**Amount due:** {{total}}

**How to pay**
Open your banking app, choose Zelle, and send **{{total}}** to **{{supportEmail}}**. Put your order number **{{orderNumber}}** in the memo so we can match it quickly.

Your order remains pending until our team confirms payment. Check your dashboard for payment, verification, and delivery status.

${CUSTOMER_FOOTER}`,
      ctaLabel: "View your orders",
    },
  },
  orderCancelled: {
    label: "Order cancelled",
    description: "Sent to the customer when an admin cancels their order.",
    audience: "customer",
    ctaPath: "/dashboard/orders",
    variables: {
      customerName: "Priya",
      orderNumber: "CK-482913-201",
      reason: "Delivery address is outside our service area.",
    },
    defaults: {
      subject: "Your {{businessName}} order {{orderNumber}} was cancelled",
      heading: "Your order has been cancelled",
      intro: "Hi {{customerName}}, we are sorry — order {{orderNumber}} has been cancelled.",
      body: `**Order:** {{orderNumber}}
**Reason:** {{reason}}

**About refunds**
If you already paid, contact our team with your order number to confirm refund eligibility and processing status. This cancellation email does not confirm that a refund has been issued.

We currently deliver across {{serviceAreas}}. If you think this was a mistake or would like to place a new order, we would love to hear from you.

${CUSTOMER_FOOTER}`,
      ctaLabel: "View your orders",
    },
  },
  verificationApproved: {
    label: "Verification approved",
    description: "Sent to the customer when their student or military ID is approved.",
    audience: "customer",
    ctaPath: "/dashboard/orders",
    variables: { customerName: "Priya", verificationType: "student" },
    defaults: {
      subject: "Your {{businessName}} verification is approved",
      heading: "You are verified. Welcome aboard!",
      intro:
        "Hi {{customerName}}, your {{verificationType}} ID has been approved. Check your dashboard for your package's activation and payment status.",
      body: `**What happens next**
Your dashboard shows your delivery schedule once the package is active. Meals are cooked fresh each morning and delivered between {{deliveryWindow}} on your scheduled days.

**Your next package**
Available plans, current prices, and verification requirements are shown when you place a new order.

${CUSTOMER_FOOTER}`,
      ctaLabel: "View your orders",
    },
  },
  verificationRejected: {
    label: "Verification rejected",
    description: "Sent to the customer when their student or military ID could not be approved.",
    audience: "customer",
    ctaPath: "/dashboard/orders",
    variables: {
      customerName: "Priya",
      verificationType: "student",
      adminNote: "The ID photo is too blurry to read.",
    },
    defaults: {
      subject: "We could not verify your {{businessName}} plan",
      heading: "We need a clearer look at your ID",
      intro: "Hi {{customerName}}, we could not approve your {{verificationType}} verification yet.",
      body: `**Reason:** {{adminNote}}

**How to fix it**
Contact our team with your order details for help submitting a clear, well-lit photo of your current {{verificationType}} ID. Make sure your name, the issuing institution, and the expiry date are readable.

Our team will review the updated information and notify you of the decision. Check your dashboard for the latest status.

${CUSTOMER_FOOTER}`,
      ctaLabel: "View your orders",
    },
  },
  renewalReminder: {
    label: "Renewal reminder",
    description: "Sent to the customer three days before their plan ends.",
    audience: "customer",
    ctaPath: "/packages",
    variables: { customerName: "Priya", planName: "Monthly Veg Tiffin", endDate: "September 30, 2026" },
    defaults: {
      subject: "Your {{planName}} ends {{endDate}} — renew to keep deliveries going",
      heading: "Your plan ends on {{endDate}}",
      intro: "Hi {{customerName}}, your {{planName}} plan ends on {{endDate}}.",
      body: `**Plan:** {{planName}}
**Last delivery:** {{endDate}}

**Plan your next delivery**
Choose from the available packages and select your next start date during checkout. Order before {{orderCutoff}} for next-day delivery, subject to delivery days and kitchen holidays.

**Need a break instead?**
No problem. You can come back any time; your account and history stay exactly where you left them.

${CUSTOMER_FOOTER}`,
      ctaLabel: "Renew your plan",
    },
  },
  subscriptionEnded: {
    label: "Plan ended",
    description: "Sent to the customer once their plan has finished.",
    audience: "customer",
    ctaPath: "/packages",
    variables: { customerName: "Priya", planName: "Monthly Veg Tiffin", endDate: "September 30, 2026" },
    defaults: {
      subject: "Your {{businessName}} plan has ended",
      heading: "Thank you for eating with us",
      intro: "Hi {{customerName}}, your {{planName}} plan finished on {{endDate}}.",
      body: `It has been a pleasure cooking for you. Every tiffin was made fresh the morning it reached your door, and we hope it tasted like home.

**Ready for more?**
Choose from the currently available packages whenever you are ready, then select an eligible start date during checkout.

**Tell us how we did**
Reply to this email with anything you loved or anything we could do better. We read every message.

${CUSTOMER_FOOTER}`,
      ctaLabel: "Browse plans",
    },
  },
  pauseExpiryReminder: {
    label: "Pause expiry reminder",
    description: "Sent to the customer a few days before a paused plan's saved days expire.",
    audience: "customer",
    ctaPath: "/dashboard",
    variables: {
      customerName: "Priya",
      planName: "Monthly Veg Tiffin",
      remainingDays: "4 delivery days",
      resumeBy: "September 18, 2026",
    },
    defaults: {
      subject: "Your {{planName}} pause ends {{resumeBy}}",
      heading: "Your saved meals are waiting",
      intro:
        "Hi {{customerName}}, your {{planName}} is still paused and you have {{remainingDays}} saved.",
      body: `**Plan:** {{planName}}
**Saved:** {{remainingDays}}
**Resume by:** {{resumeBy}}

**How to resume**
Open your dashboard and tap Resume. Deliveries restart on the next scheduled day and your saved meals are used first.

The resume deadline for this package is **{{resumeBy}}**. Resume before that date or contact our team for help with your remaining meals.

${CUSTOMER_FOOTER}`,
      ctaLabel: "Resume my package",
    },
  },
  adminNewSignup: {
    label: "New signup alert",
    description: "Sent to the admin alert address when a customer creates an account.",
    audience: "admin",
    ctaPath: "/admin/customers",
    variables: { name: "Priya Sharma", email: "priya@example.com", phone: "(858) 555-0134" },
    defaults: {
      subject: "New customer signup — {{name}}",
      heading: "A new customer signed up",
      intro: "{{name}} just created an account on the website.",
      body: `**Name:** {{name}}
**Email:** {{email}}
**Phone:** {{phone}}

They have not ordered yet. Open the customer record to view details or reach out with a welcome note.`,
      ctaLabel: "Open customer list",
    },
  },
  adminOrderAlert: {
    label: "Paid order alert",
    description: "Sent to the admin alert address when payment is confirmed.",
    audience: "admin",
    ctaPath: "/admin/orders",
    variables: {
      customerName: "Priya Sharma",
      customerEmail: "priya@example.com",
      orderNumber: "CK-482913-201",
      plans: "Monthly Veg Tiffin",
      total: "$189.00",
    },
    defaults: {
      subject: "New paid order — {{orderNumber}} ({{total}})",
      heading: "New paid order",
      intro: "Payment has been confirmed for {{customerName}}'s order.",
      body: `**Order:** {{orderNumber}}
**Customer:** {{customerName}}
**Email:** {{customerEmail}}
**Plan:** {{plans}}
**Total:** {{total}}

Check the order for package activation, delivery dates, and any outstanding verification. Packing labels are available from the customer page.`,
      ctaLabel: "Open order",
    },
  },
  adminZelleOrderAlert: {
    label: "Zelle order alert",
    description: "Sent to the admin alert address when a Zelle order is waiting for payment.",
    audience: "admin",
    ctaPath: "/admin/payments",
    variables: {
      customerName: "Priya Sharma",
      customerEmail: "priya@example.com",
      orderNumber: "CK-482913-201",
      plans: "Monthly Veg Tiffin",
      total: "$189.00",
    },
    defaults: {
      subject: "Zelle order awaiting payment — {{orderNumber}} ({{total}})",
      heading: "Zelle payment to confirm",
      intro: "{{customerName}} placed an order and will pay by Zelle.",
      body: `**Order:** {{orderNumber}}
**Customer:** {{customerName}}
**Email:** {{customerEmail}}
**Plan:** {{plans}}
**Amount expected:** {{total}}

Check your Zelle account for **{{total}}** with memo **{{orderNumber}}**. Once it arrives, mark the payment as paid and review any outstanding verification before delivery.`,
      ctaLabel: "Open payments",
    },
  },
  contactMessage: {
    label: "Contact form message",
    description: "Sent to the admin alert address when someone submits the website contact form.",
    audience: "admin",
    ctaPath: "/admin",
    variables: {
      name: "Priya Sharma",
      email: "priya@example.com",
      message: "Hi! Do you deliver to Carlsbad on weekends?",
    },
    defaults: {
      subject: "Website message from {{name}}",
      heading: "New website message",
      intro: "{{name}} sent a message through the contact form.",
      body: `**Name:** {{name}}
**Email:** {{email}}

**Message**
{{message}}

Reply directly to this email to answer {{name}}.`,
      ctaLabel: "",
    },
  },
} satisfies Record<string, EmailTemplateDefinition>;

export type EmailTemplateId = keyof typeof EMAIL_TEMPLATES;

export const EMAIL_TEMPLATE_IDS = Object.keys(EMAIL_TEMPLATES) as EmailTemplateId[];

export const EMAIL_TEMPLATE_FIELD_NAMES = [
  "subject",
  "heading",
  "intro",
  "body",
  "ctaLabel",
] as const satisfies ReadonlyArray<keyof EmailTemplateFields>;

export function isEmailTemplateId(value: unknown): value is EmailTemplateId {
  return typeof value === "string" && value in EMAIL_TEMPLATES;
}

export function escapeHtml(value: string) {
  const entities: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  };

  return value.replace(/[&<>'"]/g, (character) => entities[character]);
}

// Replaces {{name}} placeholders. A line whose placeholders all resolve to an
// empty value is dropped, so optional details ("Phone: {{phone}}") disappear
// cleanly instead of leaving a dangling label.
export function fillPlaceholders(template: string, variables: Record<string, string>) {
  return template
    .split("\n")
    .flatMap((line) => {
      let placeholders = 0;
      let filled = 0;
      const output = line.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, name: string) => {
        placeholders += 1;
        const value = variables[name] ?? "";
        if (value) filled += 1;
        return value;
      });

      return placeholders > 0 && filled === 0 ? [] : [output];
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ---------------------------------------------------------------------------
// HTML rendering. Table-based layout with inline styles so it survives Gmail,
// Outlook and Apple Mail. Fonts match the website (Plus Jakarta Sans for
// headings, IBM Plex Sans for body) and fall back to system sans-serif in
// clients that block web fonts.
// ---------------------------------------------------------------------------

const FONT_BODY = "'IBM Plex Sans','Plus Jakarta Sans',-apple-system,'Segoe UI',Helvetica,Arial,sans-serif";
const FONT_DISPLAY = "'Plus Jakarta Sans','IBM Plex Sans',-apple-system,'Segoe UI',Helvetica,Arial,sans-serif";
const FONT_LINK =
  "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap";

const COLOR = {
  ink: "#070707",
  charcoal: "#1b1b1b",
  saffron: "#ff7a1a",
  cream: "#f5f4f0",
  white: "#ffffff",
  rose: "#fff0e6",
  line: "#e9e7e1",
  muted: "#6b6b6b",
  faint: "#9a9a9a",
};

function inlineHtml(text: string) {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, `<strong style="color:${COLOR.ink};font-weight:700">$1</strong>`)
    .replace(/\n/g, "<br>");
}

const DETAIL_ROW = /^\*\*([^*]+?):\*\*\s*(.+)$/;

// A paragraph made only of "**Label:** value" lines becomes a detail card.
function detailTable(rows: Array<[string, string]>) {
  const cells = rows
    .map(
      ([label, value], index) => `
        <tr>
          <td style="padding:${index === 0 ? "0" : "10px"} 0 0;font-family:${FONT_BODY};font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${COLOR.muted};vertical-align:top;width:38%">${escapeHtml(label)}</td>
          <td style="padding:${index === 0 ? "0" : "10px"} 0 0 12px;font-family:${FONT_BODY};font-size:15px;font-weight:600;color:${COLOR.ink};vertical-align:top">${inlineHtml(value)}</td>
        </tr>`,
    )
    .join("");

  return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px;border-collapse:separate;border:1px solid ${COLOR.line};border-left:4px solid ${COLOR.saffron};border-radius:14px;background:${COLOR.cream}">
        <tr><td style="padding:18px 20px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${cells}</table></td></tr>
      </table>`;
}

function bodyHtml(body: string) {
  return body
    .split(/\n\s*\n/)
    .filter(Boolean)
    .map((paragraph) => {
      const lines = paragraph.split("\n");
      const rows = lines.map((line) => line.match(DETAIL_ROW));
      if (rows.length > 0 && rows.every(Boolean)) {
        return detailTable(rows.map((match) => [match![1].trim(), match![2].trim()]));
      }
      return `<p style="margin:0 0 18px;font-family:${FONT_BODY};font-size:16px;line-height:1.65;color:${COLOR.charcoal}">${inlineHtml(paragraph)}</p>`;
    })
    .join("");
}

function emailLayout({
  heading,
  intro,
  content,
  cta,
  siteUrl,
  brand,
}: {
  heading: string;
  intro: string;
  content: string;
  cta?: { label: string; url: string };
  siteUrl: string;
  brand: EmailBrand;
}) {
  const button = cta
    ? `
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 6px">
            <tr>
              <td style="border-radius:999px;background:${COLOR.saffron}">
                <a href="${escapeHtml(cta.url)}" style="display:inline-block;padding:15px 30px;font-family:${FONT_DISPLAY};font-size:15px;font-weight:800;letter-spacing:.01em;color:${COLOR.ink};text-decoration:none;border-radius:999px">${escapeHtml(cta.label)} &rarr;</a>
              </td>
            </tr>
          </table>`
    : "";

  const preheader = escapeHtml(intro.replace(/\*\*/g, "").slice(0, 140));
  const domain = siteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${escapeHtml(heading)}</title>
  <link href="${FONT_LINK}" rel="stylesheet">
  <style>
    @import url('${FONT_LINK}');
    body { margin:0; padding:0; -webkit-text-size-adjust:100%; }
    a { color:${COLOR.saffron}; }
    @media (max-width:600px) {
      .shell { padding:16px 10px !important; }
      .pad { padding-left:24px !important; padding-right:24px !important; }
      .hero { padding:32px 24px 28px !important; }
      h1 { font-size:26px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:${COLOR.cream};font-family:${FONT_BODY};color:${COLOR.charcoal}">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLOR.cream}">
    <tr>
      <td class="shell" align="center" style="padding:32px 16px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px">

          <tr>
            <td align="center" style="padding:0 0 18px">
              <a href="${escapeHtml(siteUrl)}" style="font-family:${FONT_DISPLAY};font-size:13px;font-weight:800;letter-spacing:.22em;text-transform:uppercase;color:${COLOR.ink};text-decoration:none">${escapeHtml(brand.businessName)}</a>
            </td>
          </tr>

          <tr>
            <td style="border-radius:24px;overflow:hidden;background:${COLOR.white};border:1px solid ${COLOR.line}">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td class="hero" style="padding:40px 40px 34px;background:${COLOR.ink};border-radius:24px 24px 0 0">
                    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                      <td style="width:34px;height:4px;background:${COLOR.saffron};border-radius:999px;font-size:0;line-height:0">&nbsp;</td>
                    </tr></table>
                    <p style="margin:16px 0 10px;font-family:${FONT_BODY};font-size:12px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:${COLOR.saffron}">Homemade Indian Tiffin</p>
                    <h1 style="margin:0;font-family:${FONT_DISPLAY};font-size:30px;line-height:1.2;font-weight:800;letter-spacing:-.02em;color:${COLOR.white}">${escapeHtml(heading)}</h1>
                  </td>
                </tr>
                <tr>
                  <td class="pad" style="padding:34px 40px 12px">
                    ${intro ? `<p style="margin:0 0 22px;font-family:${FONT_BODY};font-size:17px;line-height:1.6;color:${COLOR.ink}">${inlineHtml(intro)}</p>` : ""}
                    ${content}
                    ${button}
                  </td>
                </tr>
                <tr>
                  <td class="pad" style="padding:22px 40px 34px">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr><td style="height:1px;background:${COLOR.line};font-size:0;line-height:0">&nbsp;</td></tr>
                    </table>
                    <p style="margin:22px 0 0;font-family:${FONT_BODY};font-size:13px;line-height:1.7;color:${COLOR.muted}">
                      <strong style="color:${COLOR.ink}">${escapeHtml(brand.businessName)}</strong><br>
                      Fresh tiffin delivered ${escapeHtml(brand.deliveryDays)}, ${escapeHtml(brand.deliveryWindow)}<br>
                      Serving ${escapeHtml(brand.serviceAreas)}<br>
                      <a href="mailto:${escapeHtml(brand.supportEmail)}" style="color:${COLOR.ink};text-decoration:none">${escapeHtml(brand.supportEmail)}</a> &nbsp;·&nbsp; <a href="tel:${escapeHtml(brand.phone.replace(/[^\d+]/g, ""))}" style="color:${COLOR.ink};text-decoration:none">${escapeHtml(brand.phone)}</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:22px 12px 0">
              <p style="margin:0;font-family:${FONT_BODY};font-size:12px;line-height:1.6;color:${COLOR.faint}">
                You are receiving this service email because you have an account or order with ${escapeHtml(brand.businessName)}.<br>
                <a href="${escapeHtml(siteUrl)}" style="color:${COLOR.faint};text-decoration:underline">${escapeHtml(domain)}</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function renderEmailTemplate({
  id,
  variables,
  ctaUrl,
  fields,
  brand,
}: {
  id: EmailTemplateId;
  variables: Record<string, string>;
  ctaUrl: string;
  fields?: Partial<EmailTemplateFields>;
  brand?: Partial<EmailBrand>;
}): TransactionalEmail {
  const resolvedBrand: EmailBrand = { ...DEFAULT_EMAIL_BRAND, ...brand };
  const allVariables = { ...resolvedBrand, ...variables };
  const resolved = { ...EMAIL_TEMPLATES[id].defaults, ...fields };
  const subject = fillPlaceholders(resolved.subject, allVariables).replace(/\s+/g, " ");
  const heading = fillPlaceholders(resolved.heading, allVariables);
  const intro = fillPlaceholders(resolved.intro, allVariables);
  const body = fillPlaceholders(resolved.body, allVariables);
  const ctaLabel = fillPlaceholders(resolved.ctaLabel, allVariables);
  const cta = ctaLabel ? { label: ctaLabel, url: ctaUrl } : undefined;
  const plain = (value: string) => value.replace(/\*\*(.+?)\*\*/g, "$1");
  let siteUrl = ctaUrl;
  try {
    siteUrl = new URL(ctaUrl).origin;
  } catch {
    // Keep the raw value when it is not an absolute URL (e.g. a preview).
  }

  return {
    subject: plain(subject),
    text: [
      plain(intro),
      plain(body),
      cta ? `${cta.label}: ${cta.url}` : "",
      `${resolvedBrand.businessName} · ${resolvedBrand.supportEmail} · ${resolvedBrand.phone}`,
      `Delivery: ${resolvedBrand.deliveryDays}, ${resolvedBrand.deliveryWindow}. Serving ${resolvedBrand.serviceAreas}.`,
    ]
      .filter(Boolean)
      .join("\n\n"),
    html: emailLayout({ heading, intro, content: bodyHtml(body), cta, siteUrl, brand: resolvedBrand }),
  };
}
