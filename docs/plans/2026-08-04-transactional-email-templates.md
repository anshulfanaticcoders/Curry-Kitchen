# Transactional Email Templates Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Prepare provider-neutral, data-driven transactional email templates for order confirmations and subscription lifecycle messages, ready for Hostinger SMTP configuration.

**Architecture:** Keep all presentational email content in a server-only TypeScript module with explicit typed inputs and HTML/text output. Do not send email, require secrets, or mutate orders in this phase. Delivery and scheduled jobs will be added only after the Hostinger mailbox is active and its SMTP credentials can be tested.

**Tech Stack:** Next.js 16 App Router, TypeScript, Node.js tests, Hostinger SMTP (configuration only).

### Task 1: Define template behavior with a failing test

**Files:**
- Create: `tests/email-templates.test.mjs`
- Create: `src/lib/email/templates.ts`

**Step 1: Write the failing test**

Add a Node test that requires four typed template exports: `createOrderConfirmationEmail`, `createAdminOrderAlertEmail`, `createRenewalReminderEmail`, and `createSubscriptionEndedEmail`. Assert that each template uses dynamic customer/order/plan data and returns both a subject and text/HTML body.

**Step 2: Run test to verify it fails**

Run: `node tests/email-templates.test.mjs`

Expected: FAIL because the email template module does not exist.

**Step 3: Implement the minimal template module**

Create a server-only module that escapes interpolated HTML, formats money/date values, exposes compact typed input contracts, and renders the four named templates. Keep all route URLs based on `NEXT_PUBLIC_APP_URL` with an explicit localhost fallback.

**Step 4: Run test to verify it passes**

Run: `node tests/email-templates.test.mjs`

Expected: PASS.

### Task 2: Document secret configuration without exposing credentials

**Files:**
- Modify: `.env.example`
- Modify: `tests/email-templates.test.mjs`

**Step 1: Write the failing test**

Extend the email test to require documented private SMTP variables and to reject a `NEXT_PUBLIC_` SMTP variable.

**Step 2: Run test to verify it fails**

Run: `node tests/email-templates.test.mjs`

Expected: FAIL because SMTP configuration is not documented.

**Step 3: Implement the minimal configuration documentation**

Add commented, non-secret placeholders for `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM`, `MAIL_REPLY_TO`, and `ADMIN_ALERT_EMAIL`. State that they are server-only and are filled after creating the Hostinger mailbox.

**Step 4: Run test to verify it passes**

Run: `node tests/email-templates.test.mjs`

Expected: PASS.

### Task 3: Verify template safety and project type-checking

**Files:**
- Test: `tests/email-templates.test.mjs`
- Test: `src/lib/email/templates.ts`

**Step 1: Add a failing escape test**

Assert that a customer name containing HTML characters is escaped in the HTML output while remaining human-readable in the text output.

**Step 2: Run test to verify it fails**

Run: `node tests/email-templates.test.mjs`

Expected: FAIL before escaping is implemented.

**Step 3: Implement/adjust escaping**

Use one small escaping helper for every dynamic value interpolated into HTML.

**Step 4: Run focused verification**

Run: `node tests/email-templates.test.mjs && npx tsc --noEmit && npx eslint src/lib/email/templates.ts`

Expected: templates test passes; compiler and lint surface no new email-template errors.

### Task 4: Handoff for Hostinger SMTP test

**Files:**
- Modify: `docs/plans/2026-08-04-transactional-email-templates.md`

**Step 1: Document the exact next inputs**

Add the mailbox address, SMTP host/port choice, password, final app URL, and admin recipient as the only production setup inputs required tomorrow.

**Step 2: Confirm no secret is committed**

Run: `git status --short`

Expected: only source, test, documentation, and example environment configuration are changed; no `.env` file is listed.

## Hostinger SMTP test handoff

Recommended purchase: **Hostinger KVM 2 VPS** for the application and database, plus **one Hostinger Mail Starter mailbox**. VPS and Mail are separate products; do not rely on a free mailbox being bundled with the VPS.

Before the SMTP implementation and live test, create `orders@yourdomain.com` in hPanel and configure these private production environment values on the VPS:

```env
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
SMTP_HOST="smtp.hostinger.com"
SMTP_PORT="465"
SMTP_USER="orders@yourdomain.com"
SMTP_PASSWORD="the-mailbox-password"
MAIL_FROM="Curry Kitchen <orders@yourdomain.com>"
MAIL_REPLY_TO="orders@yourdomain.com"
ADMIN_ALERT_EMAIL="the-admin-recipient@yourdomain.com"
```

Never commit these values or send `SMTP_PASSWORD` in chat. In hPanel, confirm the email service is **Hostinger Mail** before using the shown SMTP host and port; if the plan displays Titan instead, use the configuration hPanel provides. Confirm the domain-email DNS check is green before the live test.

The next implementation phase adds a mail transport, a persistent delivery log, webhook delivery for paid orders, and a protected scheduler for renewal and ended-plan notices. The templates created in this phase are intentionally pure: they do not send messages until that provider phase is configured and tested.
