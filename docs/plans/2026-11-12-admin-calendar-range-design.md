# Admin Calendar: Two Months and Range Selection

Approved scope: modernize the customer-detail admin calendar only. Do not change
checkout, customer-facing calendar behavior, payment, scheduling rules, or live data.

## Interaction

- Show consecutive months when the calendar has room; show one month on phones.
- Keep one selected purchase and its order reference visible throughout.
- Dates mode toggles individual dates. Date range mode accepts From/To inputs or
  two endpoint clicks. Completing a range returns to Dates mode for exceptions.
- Month navigation and Today change the visible month without clearing selection.
- Selecting a different purchase resets selection. No selection saves anything.
- Bulk ranges include eligible past/today delivery dates only. Exclude off days,
  holidays, pauses, protected adjustments, other purchases and future dates.
- Before-renewal ranges can record eligible days after the source purchase ends;
  they never consume another purchase or allocate pending meals automatically.
- Preserve existing Delivered / Not delivered preview, confirmation and revision
  checks. Keep package period changes in a separate Edit package dates disclosure.
- Clearly explain why an unreviewed schedule cannot yet be marked delivered.

## Visual Direction

Operate mode: compact white calendar, restrained orange selection, green confirmed
deliveries, neutral off days, clear dark labels, and a compact action rail. No new
dashboard-wide theme. Use existing fonts and Lucide icons. Keep all controls
keyboard accessible, visible focus states, and readable on narrow screens.

Motion: 180-220ms month continuity, date-selection and confirmation feedback. No
page-load choreography or looping decoration. Reduced motion removes movement.

## Local Verification

Unit-test range validation, cross-month/year boundaries, leap days, selection
limits, eligibility and purchase isolation. Run existing calendar/service tests,
lint, type checking and a production build with a disabled database URL. Exercise
desktop, tablet and mobile with synthetic data and in-memory actions, including
bulk saves, stale previews, exceptions and purchase switches. No live writes.
