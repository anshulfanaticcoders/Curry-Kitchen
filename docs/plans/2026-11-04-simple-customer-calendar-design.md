# Simple customer calendar

Approved scope: leave checkout and payment unchanged. Admin selects dates, marks
Delivered or Not delivered, and edits delivery start/end dates. Remove the generic
action/treatment form. One confirmation shows the real schedule/balance effect.

Deliveries before renewal belong to the customer, not the expired paid package.
An admin can schedule a bounded pending-renewal period using an existing package
as its meal reference. Scheduled days never imply delivery. On renewal, the admin
explicitly includes earlier deliveries in the paid package; allocation consumes
unused days once and merges matching future pending rows without duplicating meals.

Manual date changes update actual rows. Preserve completed delivery history,
payments and original purchased allowance. Explicit allowance changes are shown
before saving. Existing automatic completion remains unchanged for ordinary
checkout schedules; manually created dates require confirmation.

Use the existing customer lock, preview fingerprint, transaction, audit and
notification infrastructure. Batch edits are atomic. Reject stale requests,
ambiguous records, future completion and conflicting protected adjustments.
Keep holiday/pause provenance and historical usage. No live database edits.

Verify planner and transactional fixtures, customer/packing visibility, unchanged
checkout, duplicate/replay protection, correction, date editing, and desktop/mobile
keyboard interaction. An additive migration must be verified on staging before
production. Fixtures do not replace a real MySQL integration check.
