# Optional Package Customization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let customers add a package as-is from the selection modal or visit a dedicated page to optionally add extras before checkout.

**Architecture:** Keep the package card and selection modal as the first decision point. The modal retains plan details and start-date selection but removes all add-on controls; it can save a zero-add-on cart item or navigate to `/packages/customize`. A focused client component on that route reuses the same cart model and makes add-ons optional, so pricing and checkout use one source of truth.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Zod, Prisma, Tailwind CSS, Node's built-in test runner.

## Design decisions

1. **Recommended — explicit optional customization:** The plan modal shows “Add to cart”, “Proceed to payment”, and “Customize package”. This preserves the current modal experience while removing the forced add-on decision.
2. **Rejected — keep add-ons inside the modal but make them optional:** This technically removes the requirement but does not satisfy the requested cleaner first decision.
3. **Rejected — add default add-ons automatically:** Customers would still receive a customization they did not request and it obscures the base plan price.

An empty `addonIds` array now represents a valid, base-package purchase. Unknown add-on IDs remain invalid when a customer does customize.

### Task 1: Permit base-package cart items

**Files:**
- Create: `tests/package-cart.test.mjs`
- Modify: `src/lib/package-cart.ts`
- Modify: `src/components/providers/package-cart-provider.tsx`

**Step 1: Write the failing test**

```js
test('retains a package with no optional add-ons', async () => {
  const { parsePackageCart } = await import('../src/lib/package-cart.ts')
  assert.deepEqual(parsePackageCart(JSON.stringify([basePackage])), [basePackage])
})
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/package-cart.test.mjs`

Expected: FAIL because cart parsing rejects an empty `addonIds` array.

**Step 3: Write minimal implementation**

Allow an empty, well-formed add-on array in cart parsing and do not discard migrated catalog items merely because all optional add-ons are absent.

**Step 4: Run test to verify it passes**

Run: `node --test tests/package-cart.test.mjs`

Expected: PASS.

### Task 2: Split selection from customization

**Files:**
- Modify: `src/components/sections/package-experience.tsx`
- Create: `src/components/sections/package-customizer.tsx`
- Create: `src/app/(marketing)/packages/customize/page.tsx`

**Step 1: Write the failing test**

Extend the cart test with a base-package query round trip; use the browser flow after the code test because this project has no React test harness.

**Step 2: Run test to verify it fails**

Run: `node --test tests/package-cart.test.mjs`

Expected: FAIL while empty add-ons are rejected.

**Step 3: Write minimal implementation**

Remove add-on selectors and required-customization copy from the package modal. Its Customize action preserves plan, date, cart, and edit context in a `/packages/customize` URL. The new page presents the existing add-on choices as optional and saves the resulting item through `PackageCartProvider`.

**Step 4: Verify the browser behavior**

Run the development server and verify:

1. Select plan → modal contains no add-on controls.
2. Add to cart works with no add-ons.
3. Customize package opens `/packages/customize` and optional choices update the total.
4. Checkout accepts both base and customized packages.

### Task 3: Align checkout and API validation

**Files:**
- Modify: `src/components/checkout/checkout-flow.tsx`
- Modify: `src/lib/server/checkout.ts`
- Modify: `src/components/cart/package-cart-drawer.tsx`

**Step 1: Write/extend the failing test**

Use the existing base-package cart test as the regression boundary; checkout is verified with the application build and browser flow due to database and auth dependencies.

**Step 2: Write minimal implementation**

Treat zero eligible add-ons as valid, retain validation for supplied add-on IDs, permit zero add-ons in the Zod request schema, and skip order-addon insertion when there are no add-ons. Update customer-facing copy to describe add-ons as optional.

**Step 3: Run verification**

Run:

```bash
node --test tests/package-cart.test.mjs
npm run lint
npx tsc --noEmit
npm run build
```

Expected: each command exits successfully.

