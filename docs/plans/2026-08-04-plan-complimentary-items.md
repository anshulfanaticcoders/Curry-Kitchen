# Plan Complimentary Items Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let admins manage a reusable complimentary-item catalog, assign any number of free items to each plan, and disclose those items in the customer’s plan-selection modal.

**Architecture:** Add a `ComplimentaryItem` catalog and `PackageComplimentaryItem` join table, mirroring the existing reusable add-on assignment pattern without prices or customer selection. The admin package editor assigns active catalog items to each plan; catalog reads send the assigned items to the storefront modal. Checkout snapshots assigned items onto order items so later plan edits do not change historical commitments.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Prisma/MySQL, Zod, Tailwind CSS, Node’s built-in test runner.

### Task 1: Add the complimentary-item data contract

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `prisma/seed.mjs`
- Modify: `src/lib/types.ts`
- Create: `tests/complimentary-items.test.mjs`

**Step 1: Write the failing test**

Add assertions that the schema has reusable complimentary-item and plan-assignment models, the public plan type has `complimentaryItems`, and the assignment selection is deduplicated.

**Step 2: Run the test to verify it fails**

Run: `node --test tests/complimentary-items.test.mjs`

Expected: FAIL because the complimentary-item contract does not exist.

**Step 3: Write the minimal implementation**

Create `ComplimentaryItem` and `PackageComplimentaryItem`, plus `OrderComplimentaryItem` for purchase snapshots. Add `complimentaryItems` and `complimentaryItemIds` to the shared plan/admin types and seed a reusable starter catalog (salad and curd) with plan-specific assignments.

**Step 4: Run the test to verify it passes**

Run: `node --test tests/complimentary-items.test.mjs`

Expected: PASS.

### Task 2: Add admin catalog management and plan assignment

**Files:**
- Modify: `src/lib/server/admin.ts`
- Modify: `src/lib/actions/admin.ts`
- Modify: `src/components/dashboard/admin-packages-client.tsx`

**Step 1: Extend the failing test**

Assert that the admin loader carries the catalog and selected assignment IDs, and the package action reads repeated `complimentaryItemIds` values.

**Step 2: Run the test to verify it fails**

Run: `node --test tests/complimentary-items.test.mjs`

Expected: FAIL because the management flow is absent.

**Step 3: Write the minimal implementation**

Load non-archived complimentary items beside add-ons. Add authenticated server actions to create, edit, and archive catalog items, and make `savePackageAction` replace a plan’s assignments with its submitted complimentary IDs. Add an admin tab for the catalog and an assignment checklist in the package editor.

**Step 4: Run the test to verify it passes**

Run: `node --test tests/complimentary-items.test.mjs`

Expected: PASS.

### Task 3: Disclose and snapshot plan complimentary items

**Files:**
- Modify: `src/lib/server/catalog.ts`
- Modify: `src/components/sections/package-experience.tsx`
- Modify: `src/lib/server/checkout.ts`

**Step 1: Extend the failing test**

Assert that public catalog mapping exposes only active assigned complimentary items, the selection modal renders a dedicated read-only section, and checkout creates complimentary snapshots from the plan rather than trusting customer input.

**Step 2: Run the test to verify it fails**

Run: `node --test tests/complimentary-items.test.mjs`

Expected: FAIL because neither disclosure nor snapshots exist.

**Step 3: Write the minimal implementation**

Fetch assigned active complimentary items with each public plan. Render them as “Complimentary with this plan” in the selection modal, distinct from included base food and optional paid add-ons. During checkout, fetch the same assignments server-side and create one `OrderComplimentaryItem` per item on the order item.

**Step 4: Run the test to verify it passes**

Run: `node --test tests/complimentary-items.test.mjs`

Expected: PASS.

### Task 4: Generate Prisma client and verify the flows

**Files:**
- Generated: Prisma client

**Step 1: Generate the Prisma client**

Run: `npx prisma generate`

**Step 2: Run focused verification**

Run:

```bash
node --test tests/*.test.mjs
npx eslint src/lib/types.ts src/lib/server/admin.ts src/lib/actions/admin.ts src/lib/server/catalog.ts src/lib/server/checkout.ts src/components/dashboard/admin-packages-client.tsx src/components/sections/package-experience.tsx tests/complimentary-items.test.mjs
```

**Step 3: Verify in the browser**

1. Admin creates or edits complimentary catalog items.
2. Admin selects several items for one plan and different items for another plan.
3. Customer selects each plan and sees only its complimentary items in the modal.
4. Optional paid add-ons remain exclusively on the customization page.
