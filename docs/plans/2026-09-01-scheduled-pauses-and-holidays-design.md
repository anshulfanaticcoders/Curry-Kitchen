# Scheduled Pauses and Kitchen Holidays

## Customer pause

A customer can use one pause per purchased package. They choose an inclusive start and end date, up to 14 calendar days. The range must begin on or after the next available delivery date and must contain at least one scheduled delivery.

The affected delivery-day records are cancelled immediately and the same number of replacement delivery dates are appended after the package's existing schedule. The package remains active because its future schedule already represents automatic resumption. A `PauseRequest` records the range for the dashboard calendar and audit history.

## Kitchen holiday

An admin can add a kitchen closure covering one or more dates. Every future, undelivered package delivery inside that range is cancelled and replaced after its package's current end date. The adjustment does not consume the customer's pause.

`BusinessHoliday` stores the closure. `HolidayDeliveryCredit` is an idempotent ledger connecting the original delivery to its replacement. Cancelling a future holiday restores the original dates and removes unused replacements; holidays with elapsed or delivered dates cannot be reversed automatically.

Upcoming closures are part of the shared package-start availability contract. Package selection, the persistent cart, checkout, and the final server transaction all use the same delivery weekdays, order cutoff, earliest start date, and active holiday ranges. The customer sees the closure name and dates before choosing a start date; an outdated cart date is marked for attention rather than silently shifted.

When an already-paid package is affected, the dashboard shows the closure and credited delivery count. The calendar labels the original date as a kitchen holiday and identifies the replacement date, so the customer can distinguish a business closure from their one personal pause.

## Invariants

- Purchased delivery counts never change.
- Weekends, configured non-delivery weekdays, other holidays, and occupied delivery dates are skipped when creating replacements.
- Tax, payments, and order totals are unaffected.
- All schedule updates run in database transactions.
- Start-date rules are revalidated from current database state when an order is created.
- Holiday cancellation is blocked when a later holiday or an active customer pause depends on its replacement dates.
- Customers receive in-app notifications for pause schedules, holiday credits, and holiday cancellations.
