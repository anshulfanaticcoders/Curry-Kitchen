# Admin order receipts

Approved scope: a read-only receipt drawer on the customer detail page and in
Orders, with a customer order selector and browser Print / Save as PDF.

Use saved Order and OrderItem amounts, including historical add-on records.
Never use current package prices, delivery settings, or tax settings to rebuild
past charges. Show recorded payment attempts from the selected order only.
Pending, failed, refunded, missing, or inconsistent data must not imply payment
was received. Tax percentages and exact refund amounts are not stored, so do not
invent them. Package labels may reflect the current catalogue.

Load each receipt on demand from an admin-authorized, non-cacheable endpoint.
Reuse the same presentation for customer history and Orders. A native modal
dialog supplies keyboard containment and Escape dismissal. Print styles isolate
the receipt from dashboard content and remove scrolling constraints.

No database migration, checkout changes, payment writes, or delivery changes.
Verify financial mapping, old add-ons, payment states, authorization, error
handling, desktop/mobile layout, and printing. Local database availability limits
end-to-end verification; use clearly identified fixtures for browser checks.
