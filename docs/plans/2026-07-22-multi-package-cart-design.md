# Multi-package cart design

## Confirmed rules

- One signed-in customer owns the order and one delivery address is shared by the order.
- Every package is an independent cart line with its own add-ons, quantity, and start date.
- At least one eligible active add-on is required for every package.
- Start dates must be tomorrow or later in the Curry Kitchen business timezone, and weekend starts are unavailable.
- The same package can appear more than once when its configuration differs.

## Interaction model

The packages page uses a configure-then-add flow. Selecting a card opens its configuration in the sticky right rail. The customer chooses add-ons, quantity, and start date before adding the package. After a successful add, the rail switches to a compact cart view with Edit and Remove actions, an Add another package command, and a persistent checkout total.

Checkout reviews every package separately, then collects one delivery address and one payment. Student or military verification appears only when at least one selected package requires it. Server validation recalculates package eligibility, add-on ownership, dates, tax, delivery charges, and totals before creating the order.

## Data ownership

`OrderItem` owns the package start date. `OrderAddon` references the exact `OrderItem` it customizes. `CustomerPackage` references its originating order item and stores quantity without multiplying package duration. This keeps package tracking, pausing, activation, and delivery-day generation independent for every purchased plan.
