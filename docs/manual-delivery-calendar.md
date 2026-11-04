# Manual delivery calendar

## Admin workflow

Open **Customers > customer > calendar** and select a date. **Select dates** enables a batch selection.

- Choose the paid **Package**, then **Delivered** or **Not delivered**. One confirmation shows the changed balance and end date. There is no treatment selector or required free-text reason.
- **Delivery dates** opens the start/end inputs. These update real scheduled rows, skip normal off days, holidays and pauses, and retain completed/dispatched deliveries and protected credits. An allowance change requires explicit acknowledgement; the original purchased allowance is preserved. It never edits the amount paid.
- **Not delivered** preserves the original day as missed and gives one make-up day after the existing schedule. Repeating the same correction cannot create extra credits.
- **Renewal pending** records or schedules admin-authorized meals before payment, using a previous paid package as the meal reference. If there are multiple packages, **Meals from** identifies the correct one. This does not extend the expired paid package or create a paid order.
- After renewal, select the new paid package and use **Include in this package** for earlier deliveries. Existing dates are matched; otherwise unused future days move to the actual delivery dates. Compatible future pending dates are merged and listed in the confirmation. Nothing is automatically allocated during checkout.
- **Activity** keeps the audit history and an eligible **Undo**, out of the everyday controls.

Example: the old package ends Friday. Admin delivers Monday and Tuesday before payment and marks those dates Delivered under Renewal pending. The customer buys a 21-delivery package normally. Admin includes those two earlier meals: the new package shows 2 delivered and 19 remaining. The old package and payment receipt are unchanged.

Off-day or closure conflicts on an actual delivery require acknowledgement. Future dates cannot be marked Delivered or Not delivered. Paid-but-unverified, unpaid and cancelled packages cannot receive allocations. A mismatched quantity or ambiguous duplicate requires review, not an automatic guess. Resume a paused package before using the simplified paid-package controls. Batches are limited to 62 dates and date ranges to 366 calendar days.

The most recent manual edit can be undone only if the relevant calendar still matches the saved state and no affected replacement has elapsed. Otherwise record a new correction. History retains the admin, timestamp, generated action reason, and before/after state; customers see the delivery result and an in-app notification, not private admin notes.

Existing automatic past-day completion remains in place for ordinary checkout schedules. Newly created manual schedule rows require explicit delivery confirmation, even after their date passes. Historic usage without individual day rows is preserved. Allocations never silently consume an unresolved past manual row.

Scheduled renewal-pending meals appear in the customer calendar, upcoming deliveries and packing slip, with their pending-renewal label. Current closures and delivery weekdays still apply. When a paid delivery overlaps, packing shows the paid meal once with a review warning instead of silently doubling the quantity.

## Deployment

Migrations: the existing `20261019000000_manual_delivery_calendar`, followed by `20261104000000_simple_customer_calendar`.

The earlier migration adds revision tracking, sparse historical usage and manual delivery records. The new additive migration adds `customer_packages.purchasedDeliveryDays`, `package_delivery_days.requiresConfirmation`, and manual delivery `status`/`sourcePackageId`. Existing scheduled days retain automatic completion; legacy manual records default to Delivered. Neither migration rewrites existing payments, prices or delivery dates. Back up the database and test against a staging copy before production rollout. This change has not been applied to the live database by the coding task.

The existing Docker entrypoint runs `prisma migrate deploy` before serving traffic unless `SKIP_MIGRATIONS=1`. The new app code requires the migration; do not deploy it with migrations skipped. Do not run `db push`, reset, or seed against production. Keep the persistent uploads mount unchanged.

## Verification

Automated planner and transaction-fixture tests cover allocation, duplicate/replayed changes, authorization, rollback, undo, and customer visibility. Fixtures do not substitute for a staging MySQL check.

Before live rollout, verify on staging:

1. Record two earlier deliveries awaiting renewal; confirm no payment or package balance changes.
2. Renew through the normal payment flow, then include both earlier deliveries in one confirmation. Two credits are consumed and the final two scheduled days move to those actual dates. Repeat the request and confirm it cannot deduct twice.
3. Check the admin calendar, customer calendar, upcoming deliveries, packing quantity/date, and notification.
4. Mark a delivery missed; check the make-up date and retained entitlement through pause/resume and holidays.
5. Preview in two tabs, save in one, and confirm the stale tab is rejected.
6. Confirm an eligible undo restores the schedule and retains audit history.
7. Verify unpaid/unverified packages and non-admin requests cannot use the controls.
8. Schedule a bounded renewal-pending period before payment. Verify packing and upcoming deliveries, then renew with overlapping dates and confirm no duplicate meal is listed.
9. Edit the paid start/end dates, confirm any allowance warning, and verify the original purchase allowance and receipt are unchanged. Backdated new rows must not be automatically reported as delivered.
10. Confirm a past unconfirmed manual day survives customer pause and does not trigger a false package-completed email. Verify holiday/pause replacement rows retain their confirmation requirement.
11. Check single selection, multiple selection, date inputs, warning acknowledgement and keyboard operation on desktop and narrow mobile screens.

Legacy scheduled pauses without saved row provenance cannot be automatically reset: guessing which future rows to remove could consume the wrong credits. These cases require an explicit operational review.
