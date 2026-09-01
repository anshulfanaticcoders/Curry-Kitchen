import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

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
