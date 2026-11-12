# Customer calendar: purchase-scoped administration

Approved scope: fix multi-purchase isolation and simplify Admin > Customers.
No production data changes, database migrations, checkout changes, or automatic
historical reconciliation are part of this implementation.

## Working flow

1. Select an identifiable purchase (order number, start/end dates, quantity).
2. Its calendar, balances, receipt, dietary notes and package controls follow that selection.
3. Select dates and use Delivered, Not delivered, or Edit dates.
4. Review the exact purchase and balance changes before saving.

Packages from the same order also carry stable item numbers so identical
names and dates cannot make the selected purchase ambiguous.

All purchases remain visible, including ended and blocked purchases. Payment,
verification and scheduling are separate states. A paid, approved package with
no schedule is labelled Needs schedule review, not Awaiting verification.
An explicit date edit can restore an empty approved schedule after confirmation;
it does not invent historical delivery confirmations or change payments.

## Invariants

- Separate purchases can deliver on the same day.
- Date-only matching cannot change another purchase's manual meals.
- Earlier meals are allocated by record ID and exactly once, with quantity checks.
- Existing customer checkout, payment activation and automatic elapsed-day policy stay unchanged.
- Existing calendar locks, stale-preview protection, audit history and undo remain.
- Historical repairs are never run on page load or deploy.

## Verification

Use isolated in-memory fixtures for payment/verification order, multiple purchases,
same-day meals, paused/ended/blocked plans, missing historical schedules, renewal
allocation, holidays, stale tabs, retries and undo. Verify the actual components
at desktop and mobile sizes with synthetic data only; no production login or writes.

### Local results (2026-11-12)

- `node --test tests/*.test.mjs`: 273 passed, 0 failed.
- Targeted ESLint and TypeScript checks passed.
- Production build passed with DATABASE_URL forced to an unavailable loopback
  address and email/payment credentials disabled. Expected database-unavailable
  messages during prerendering are not a live database integration test.
- Actual customer-detail page and calendar components exercised in an isolated
  Next fixture with in-memory actions and synthetic purchases only.
- Browser checks: purchase switching, matching receipt, month/date synchronization,
  empty approved schedule restoration, Delivered / Not delivered, explicit renewal
  allocation, unpaid edit restrictions and before-renewal recording.
- Desktop, tablet (768px), mobile (390px) and narrow mobile (320px) inspected;
  no horizontal overflow observed. Temporary viewport overrides reset.
- A duplicate React key found during the check was fixed. The remaining observed
  hydration warning referred to browser-extension-injected `data-sharkid`
  attributes; application markup was not changed to suppress it.

## Rollout and existing records

No schema migration, automatic data repair, commit, push or deployment was performed.
Checkout and payment activation files are unchanged.

After an approved deployment, an admin can select an affected purchase labelled
Needs schedule review, check its original start/end dates under Edit dates, and
confirm the preview. Backdated days remain unconfirmed until the admin marks the
dates actually delivered. Do not assume that an old date proves a meal was delivered.

Meals recorded before renewal remain separate until the admin explicitly selects
the individual records and chooses Include in this purchase. Allocation checks
quantity, available allowance, stale previews and prior allocation. Other purchases
are not edited just because they share a delivery date.

A staging MySQL integration check remains advisable before rollout; local service
tests use in-memory transaction fixtures and do not prove real database lock timing.
