import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const templateSource = join(root, "..", "src", "lib", "email", "templates.ts");
const environmentExample = join(root, "..", ".env.example");

assert.ok(existsSync(templateSource), "email templates module should exist");

const outputDirectory = mkdtempSync(join(tmpdir(), "currykitchen-email-"));
const compile = spawnSync(
  process.execPath,
  [
    "./node_modules/typescript/bin/tsc",
    templateSource,
    "--module",
    "nodenext",
    "--moduleResolution",
    "nodenext",
    "--target",
    "es2022",
    "--outDir",
    outputDirectory,
  ],
  { cwd: join(root, ".."), encoding: "utf8" },
);

assert.equal(compile.status, 0, compile.stderr || "email templates should compile");

const compiledModule = readFileSync(join(outputDirectory, "templates.js"), "utf8");
const templates = await import(
  `data:text/javascript;base64,${Buffer.from(compiledModule).toString("base64")}`,
);

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
]) {
  assert.equal(typeof templates[name], "function", `${name} should be exported`);
}

const order = templates.createOrderConfirmationEmail({
  customerName: "Asha Patel",
  orderNumber: "CK-123456",
  planNames: ["Monthly Family Tiffin"],
  total: 149.5,
  currency: "USD",
  startDate: new Date("2026-08-10T12:00:00.000Z"),
});

assert.match(order.subject, /CK-123456/);
assert.match(order.html, /Asha Patel/);
assert.match(order.html, /Monthly Family Tiffin/);
assert.match(order.text, /\$149\.50/);

const admin = templates.createAdminOrderAlertEmail({
  customerName: "Asha Patel",
  customerEmail: "asha@example.com",
  orderNumber: "CK-123456",
  planNames: ["Monthly Family Tiffin"],
  total: 149.5,
  currency: "USD",
  dashboardUrl: "https://currykitchen.example/admin/orders",
});

assert.match(admin.html, /asha@example\.com/);
assert.match(admin.html, /admin\/orders/);

const renewal = templates.createRenewalReminderEmail({
  customerName: "Asha Patel",
  planName: "Monthly Family Tiffin",
  endDate: new Date("2026-08-31T12:00:00.000Z"),
  renewUrl: "https://currykitchen.example/packages",
});

assert.match(renewal.subject, /renewal reminder/i);
assert.match(renewal.html, /Monthly Family Tiffin/);

const ended = templates.createSubscriptionEndedEmail({
  customerName: "Asha Patel",
  planName: "Monthly Family Tiffin",
  endDate: new Date("2026-08-31T12:00:00.000Z"),
  renewUrl: "https://currykitchen.example/packages",
});

assert.match(ended.subject, /ended/i);
assert.match(ended.html, /Renew your plan/);

const escaped = templates.createOrderConfirmationEmail({
  customerName: 'Asha <script>alert("unsafe")</script>',
  orderNumber: "CK-123456",
  planNames: ["Monthly Family Tiffin"],
  total: 149.5,
  currency: "USD",
  startDate: new Date("2026-08-10T12:00:00.000Z"),
});
assert.doesNotMatch(escaped.html, /<script>/i, "dynamic HTML must be escaped");
assert.match(escaped.html, /&lt;script&gt;/i, "escaped HTML should remain readable");
assert.match(escaped.text, /<script>/i, "plain text should preserve the customer’s name");

const signup = templates.createAdminNewSignupEmail({
  name: "Asha Patel",
  email: "asha@example.com",
  phone: "+1 555 010 2030",
});

assert.match(signup.subject, /new customer signup/i);
assert.match(signup.html, /asha@example\.com/);
assert.match(signup.html, /admin\/customers/);

const zelle = templates.createZelleOrderReceivedEmail({
  customerName: "Asha Patel",
  orderNumber: "CK-123456",
  planNames: ["Monthly Family Tiffin"],
  total: 149.5,
  currency: "USD",
});

assert.match(zelle.subject, /zelle/i);
assert.match(zelle.text, /\$149\.50/);

const zelleAdmin = templates.createAdminZelleOrderAlertEmail({
  customerName: "Asha Patel",
  customerEmail: "asha@example.com",
  orderNumber: "CK-123456",
  planNames: ["Monthly Family Tiffin"],
  total: 149.5,
  currency: "USD",
});

assert.match(zelleAdmin.subject, /awaiting payment/i);
assert.match(zelleAdmin.html, /admin\/payments/);

const approved = templates.createVerificationApprovedEmail({
  customerName: "Asha Patel",
  verificationType: "MILITARY",
});

assert.match(approved.subject, /verified/i);
assert.match(approved.html, /military/);

const rejected = templates.createVerificationRejectedEmail({
  customerName: "Asha Patel",
  verificationType: "STUDENT",
  adminNote: 'ID expired <script>alert("unsafe")</script>',
});

assert.match(rejected.subject, /could not verify/i);
assert.doesNotMatch(rejected.html, /<script>/i, "admin note must be escaped");
assert.match(rejected.html, /&lt;script&gt;/i, "escaped admin note should remain readable");

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

console.log("✓ transactional email templates render dynamic order and subscription data");
