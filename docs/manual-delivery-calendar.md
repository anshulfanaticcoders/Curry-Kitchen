# Manual delivery calendar

## Admin workflow

Open **Customers > customer > calendar**, select a date, then use **Manage delivery**.

- **Record a delivery** records the actual date and number of tiffins. Choose awaiting renewal, complimentary, or a paid package.
- **Awaiting renewal** is a delivery record, not an invoice or payment. It does not consume package days until an admin explicitly assigns it.
- **Counts toward package** moves one unused scheduled day to the actual delivery date. It consumes one delivery-day credit, not one credit per tiffin. The recorded quantity must match the package's tiffins per day.
- **Mark package day delivered** confirms an existing day without creating another credit or delivery.
- **Mark package day missed** retains the original entry and adds one make-up day after the existing schedule, skipping closures, pauses, and off days. Paused packages hold that credit until resumed.
- **Reschedule** moves an unstarted upcoming day without changing the purchased entitlement.
- **Void** corrects a mistaken manual record, returning an assigned credit if applicable.

Every change requires a reason, a fresh impact preview, and confirmation. Off-day or closure conflicts on an actual delivery require acknowledgement. Future dates cannot be recorded as already delivered. Unpaid, unverified, and cancelled packages cannot be charged.

The most recent manual edit can be undone only if the relevant calendar still matches the saved state and no affected replacement has elapsed. Otherwise record a new correction. History retains the admin, timestamp, reason, and before/after state; customers see the delivery result and an in-app notification, not private admin notes.

Existing automatic past-day completion remains in place. An admin can explicitly mark a missed day to correct it. Historic usage without individual day rows is preserved.

## Deployment

Migration: `20261019000000_manual_delivery_calendar`.

It adds `customers.calendarRevision`, `customer_packages.unrepresentedUsedDays` (for preserving sparse historical usage), and `manual_deliveries`; it does not rewrite existing orders, payments, prices, or delivery dates. Back up the database and test against a staging copy before production rollout. This change has not been applied to the live database by the coding task.

The existing Docker entrypoint runs `prisma migrate deploy` before serving traffic unless `SKIP_MIGRATIONS=1`. The new app code requires the migration; do not deploy it with migrations skipped. Do not run `db push`, reset, or seed against production. Keep the persistent uploads mount unchanged.

## Verification

Automated planner and transaction-fixture tests cover allocation, duplicate/replayed changes, authorization, rollback, undo, and customer visibility. Fixtures do not substitute for a staging MySQL check.

Before live rollout, verify on staging:

1. Record two earlier deliveries awaiting renewal; confirm no payment or package balance changes.
2. Renew through the normal payment flow, then assign each earlier delivery. Two credits are consumed and the final two scheduled days move to those actual dates.
3. Check the admin calendar, customer calendar, upcoming deliveries, packing quantity/date, and notification.
4. Mark a delivery missed; check the make-up date and retained entitlement through pause/resume and holidays.
5. Preview in two tabs, save in one, and confirm the stale tab is rejected.
6. Confirm an eligible undo restores the schedule and retains audit history.
7. Verify unpaid/unverified packages and non-admin requests cannot use the controls.

Legacy scheduled pauses without saved row provenance cannot be automatically reset: guessing which future rows to remove could consume the wrong credits. These cases require an explicit operational review.
