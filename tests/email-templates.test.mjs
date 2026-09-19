import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const root = dirname(fileURLToPath(import.meta.url));
const templateSource = join(root, "..", "src", "lib", "email", "templates.ts");
const registrySource = join(root, "..", "src", "lib", "email", "template-registry.ts");
const environmentExample = join(root, "..", ".env.example");

assert.ok(existsSync(templateSource), "email templates module should exist");

const source = readFileSync(templateSource, "utf8");
for (const name of [
  "createOrderConfirmationEmail",
  "createAdminOrderAlertEmail",
  "createRenewalReminderEmail",
  "createSubscriptionEndedEmail",
  "createAdminNewSignupEmail",
  "createZelleOrderReceivedEmail",
  "createAdminZelleOrderAlertEmail",
  "createVerificationApprovedEmail",
  "createVerificationRejectedEmail",
  "createPauseExpiryReminderEmail",
  "createOrderCancelledEmail",
  "createContactMessageEmail",
]) {
  assert.match(source, new RegExp(`export function ${name}\\b`), `${name} should be exported`);
}

assert.match(source, /getEmailTemplateOverrides/);
assert.match(source, /getAdminSettings/);
assert.match(source, /return render\("orderConfirmation"/);
assert.match(source, /return render\("pauseExpiryReminder"/);

const { EMAIL_TEMPLATES, renderEmailTemplate } = await import(pathToFileURL(registrySource));
for (const id of [
  "orderConfirmation",
  "adminOrderAlert",
  "renewalReminder",
  "subscriptionEnded",
  "adminNewSignup",
  "zelleOrderReceived",
  "adminZelleOrderAlert",
  "verificationApproved",
  "verificationRejected",
  "pauseExpiryReminder",
  "orderCancelled",
  "contactMessage",
]) {
  assert.ok(EMAIL_TEMPLATES[id], `${id} should be registered`);
}

const order = renderEmailTemplate({
  id: "orderConfirmation",
  variables: {
    customerName: 'Asha <script>alert("unsafe")</script>',
    orderNumber: "CK-123456",
    plans: "Monthly Family Tiffin",
    total: "$149.50",
    startDate: "August 10, 2026",
  },
  ctaUrl: "https://currykitcheninc.com/dashboard/orders",
});

assert.match(order.subject, /CK-123456/);
assert.match(order.html, /Monthly Family Tiffin/);
assert.match(order.text, /\$149\.50/);
assert.doesNotMatch(order.html, /<script>/i, "dynamic HTML must be escaped");
assert.match(order.html, /&lt;script&gt;/i, "escaped HTML should remain readable");
assert.match(order.text, /<script>/i, "plain text should preserve the customer name");

// Exercise the same saved-settings loader used by both previews and real sends.
let settings = {
  businessName: "Curry Kitchen Inc", supportEmail: "support@example.com", phone: "555-1234",
  deliveryWindowStart: "10:00", deliveryWindowEnd: "18:00",
  deliveryDays: "Monday - Friday", serviceAreas: "San Diego",
  orderCutoff: "20:00", enableCheckoutPauses: true,
};
const registry = await import(pathToFileURL(registrySource));
const schedule = await import(pathToFileURL(join(root, "..", "src", "lib", "package-schedule.ts")));
let overrides = {};
const dependencies = {
  "server-only": {},
  "@/lib/app-url": { getAppUrl: () => "https://currykitcheninc.com" },
  "@/lib/email/template-overrides": { getEmailTemplateOverrides: async () => overrides },
  "@/lib/email/template-registry": registry,
  "@/lib/server/admin": { getAdminSettings: async () => settings },
  "@/lib/package-schedule": schedule,
};
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const templates = {};
new Function("require", "exports", compiled)((id) => {
  assert.ok(Object.hasOwn(dependencies, id), `Unexpected dependency ${id}`);
  return dependencies[id];
}, templates);

for (const [start, end, expected] of [
  ["10:00", "18:00", "10:00 AM - 6:00 PM Pacific Time"],
  ["11:30", "17:45", "11:30 AM - 5:45 PM Pacific Time"],
]) {
  settings = { ...settings, deliveryWindowStart: start, deliveryWindowEnd: end };
  const brand = await templates.getEmailBrand();
  assert.equal(brand.deliveryWindow, expected);
  const preview = renderEmailTemplate({
    id: "orderConfirmation", variables: EMAIL_TEMPLATES.orderConfirmation.variables, brand,
    ctaUrl: "https://currykitcheninc.com/dashboard/orders",
  });
  const sent = await templates.createOrderConfirmationEmail({
    customerName: "Test Customer", orderNumber: "CK-TEST", planNames: ["Monthly Tiffin"],
    total: 100, currency: "USD", startDate: new Date("2026-09-21T18:00:00Z"),
  });
  for (const email of [preview, sent]) {
    assert.ok(email.text.includes(expected), "email body uses saved delivery times");
    assert.ok(email.html.includes(expected), "HTML and footer use saved delivery times");
    assert.ok(!email.html.includes("8:00 AM"), "old sample hours must not leak into the email");
  }
}

const actual = {
  customerName: "Actual Customer", name: "Actual Customer", customerEmail: "actual@example.com",
  email: "actual@example.com", phone: "555-9876", orderNumber: "CK-ACTUAL",
  planNames: ["Actual Package"], planName: "Actual Package", total: 234.56, currency: "USD",
  startDate: new Date("2026-09-21T18:00:00Z"), endDate: new Date("2026-10-21T18:00:00Z"),
  resumeBy: new Date("2026-09-25T18:00:00Z"), remainingDays: 7,
  verificationType: "MILITARY", adminNote: "Actual review note", reason: "Actual cancellation reason",
  message: "Actual message <script>unsafe</script>",
};
const builders = {
  orderConfirmation: "createOrderConfirmationEmail", zelleOrderReceived: "createZelleOrderReceivedEmail",
  orderCancelled: "createOrderCancelledEmail", verificationApproved: "createVerificationApprovedEmail",
  verificationRejected: "createVerificationRejectedEmail", renewalReminder: "createRenewalReminderEmail",
  subscriptionEnded: "createSubscriptionEndedEmail", pauseExpiryReminder: "createPauseExpiryReminderEmail",
  adminNewSignup: "createAdminNewSignupEmail", adminOrderAlert: "createAdminOrderAlertEmail",
  adminZelleOrderAlert: "createAdminZelleOrderAlertEmail", contactMessage: "createContactMessageEmail",
};
assert.deepEqual(Object.keys(builders).sort(), Object.keys(EMAIL_TEMPLATES).sort());

for (const [start, end, cutoff, pauses] of [
  ["10:00", "18:00", "20:00", true], ["09:30", "17:15", "19:30", false],
]) {
  settings = { ...settings, businessName: "Configured Kitchen Inc.", supportEmail: "configured@example.com",
    phone: "555-1234", serviceAreas: "Configured Area", deliveryDays: "Tuesday - Friday",
    deliveryWindowStart: start, deliveryWindowEnd: end, orderCutoff: cutoff, enableCheckoutPauses: pauses };
  const brand = await templates.getEmailBrand();
  assert.equal(brand.businessName, settings.businessName, "preserve the configured business name exactly");
  assert.equal(brand.orderCutoff, `${schedule.formatOrderCutoff(cutoff)} Pacific Time`);
  assert.equal(brand.pausePolicy.includes("one customer-scheduled pause"), pauses);

  for (const [id, builder] of Object.entries(builders)) {
    const sent = await templates[builder](actual);
    const preview = renderEmailTemplate({ id, variables: EMAIL_TEMPLATES[id].variables, brand,
      ctaUrl: `https://currykitcheninc.com${EMAIL_TEMPLATES[id].ctaPath}` });
    for (const email of [sent, preview]) {
      for (const key of ["businessName", "supportEmail", "phone", "serviceAreas", "deliveryDays", "deliveryWindow"]) {
        assert.ok(email.text.includes(brand[key]), `${id}: text uses current ${key}`);
        assert.ok(email.html.includes(brand[key]), `${id}: HTML uses current ${key}`);
      }
      assert.doesNotMatch(email.html, /8:00 AM|11:00 AM|\{\{\w+\}\}/);
    }
    assert.doesNotMatch(sent.text, /Priya|CK-482913-201|\$189\.00|Monthly Veg Tiffin/,
      `${id}: sample preview data must not enter actual sends`);
    assert.doesNotMatch(sent.html, /<script>/);
    assert.ok(sent.text.includes("Actual"), `${id}: real customer data is present`);

    // Admin-written copy stays intact, while its variables remain settings-backed.
    overrides = { [id]: { body: `Custom wording\n${Object.keys(brand).map((key) => `{{${key}}}`).join("\n")}` } };
    const customized = await templates[builder](actual);
    assert.ok(customized.text.includes("Custom wording"));
    for (const [key, value] of Object.entries(brand)) {
      assert.ok(customized.text.includes(key === "phone" && id === "adminNewSignup" ? actual.phone : value),
        `${id}: custom copy resolves ${key}`);
    }
    overrides = {};
  }
}
const signup = await templates.createAdminNewSignupEmail(actual);
assert.ok(signup.text.includes(`Phone: ${actual.phone}`), "signup body shows customer phone, not business phone");
const confirmation = await templates.createOrderConfirmationEmail(actual);
assert.match(confirmation.text, /September 21, 2026/, "delivery dates use Pacific time, not the host timezone");
const unscheduled = await templates.createOrderConfirmationEmail({ ...actual, startDate: null });
assert.match(unscheduled.text, /Not yet scheduled/);
const defaultCopy = Object.values(EMAIL_TEMPLATES).map(({ defaults }) => JSON.stringify(defaults)).join("\n");
assert.doesNotMatch(defaultCopy, /30 days|Three days left|5.10 business days|under a minute|non-veg/);
assert.match(EMAIL_TEMPLATES.orderCancelled.defaults.body, /does not confirm that a refund has been issued/);
assert.match(EMAIL_TEMPLATES.renewalReminder.defaults.heading, /\{\{endDate\}\}/);

// No network: verify recipient/reply routing through a mocked mail transport.
const originalEnv = { ...process.env };
const deliveries = [];
try {
  process.env.RESEND_API_KEY = "test-only";
  process.env.MAIL_FROM = "Configured Kitchen <mail@example.com>";
  delete process.env.MAIL_REPLY_TO;
  const senderSource = readFileSync(join(root, "..", "src", "lib", "email", "send.ts"), "utf8");
  const senderCode = ts.transpileModule(senderSource, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const sender = {};
  const senderDependencies = { "server-only": {}, "@/lib/server/admin": dependencies["@/lib/server/admin"],
    resend: { Resend: class { emails = { send: async (payload, options) => {
      deliveries.push({ payload, options }); return { error: null };
    } }; } } };
  new Function("require", "exports", senderCode)((id) => {
    assert.ok(Object.hasOwn(senderDependencies, id), `Unexpected sender dependency ${id}`);
    return senderDependencies[id];
  }, sender);
  const input = { to: actual.email, email: confirmation, idempotencyKey: "test/order" };
  assert.deepEqual(await sender.sendTransactionalEmail(input), { sent: true });
  assert.equal(deliveries.at(-1).payload.replyTo, settings.supportEmail);
  process.env.MAIL_REPLY_TO = "configured-replies@example.com";
  await sender.sendTransactionalEmail(input);
  assert.equal(deliveries.at(-1).payload.replyTo, process.env.MAIL_REPLY_TO);
  await sender.sendTransactionalEmail({ ...input, replyTo: actual.email });
  assert.equal(deliveries.at(-1).payload.replyTo, actual.email, "contact replies go to the sender");
  assert.equal(deliveries.at(-1).payload.from, process.env.MAIL_FROM);
  assert.deepEqual(deliveries.at(-1).options, { idempotencyKey: "test/order" });
} finally {
  for (const key of ["RESEND_API_KEY", "MAIL_FROM", "MAIL_REPLY_TO"]) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
}
const contactSource = readFileSync(join(root, "..", "src", "lib", "actions", "contact.ts"), "utf8");
assert.match(contactSource, /replyTo: email/);

const editor = readFileSync(join(root, "..", "src", "components", "dashboard", "admin-email-templates-client.tsx"), "utf8");
const page = readFileSync(join(root, "..", "src", "app", "admin", "emails", "page.tsx"), "utf8");
assert.match(page, /getEmailBrand\(\)/);
assert.match(page, /brand=\{brand\}/);
assert.match(editor, /brand: resolvedBrand/);
assert.match(editor, /Object.entries\(\{ \.\.\.resolvedBrand, \.\.\.definition.variables \}\)/);

const environment = readFileSync(environmentExample, "utf8");
for (const name of [
  "RESEND_API_KEY",
  "MAIL_FROM",
  "MAIL_REPLY_TO",
  "ADMIN_ALERT_EMAIL",
  "CRON_SECRET",
]) {
  assert.match(environment, new RegExp(`^${name}=`, "m"), `${name} should be documented`);
}
assert.doesNotMatch(environment, /^NEXT_PUBLIC_RESEND_/m, "Resend credentials must remain private");

console.log("✓ transactional email registry renders dynamic, escaped content");
