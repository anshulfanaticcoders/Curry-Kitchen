# Dashboard Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make every customer and admin dashboard screen database-backed, actionable, and clear about successful, failed, loading, and empty states.

**Architecture:** Protected dashboard loaders must never substitute mock records for live data. Persist business-wide controls through the existing `Setting` model, customer communication preferences through a dedicated relation, and SEO records through their own admin-managed model. Mutations remain server actions with authorization, validation, audit logging where applicable, revalidation, and one shared bottom-right Sonner convention.

**Tech Stack:** Next.js App Router, React 19, Prisma/MySQL, NextAuth, Zod, Sonner, Tailwind v4.

---

### Task 1: Establish reliable feedback and interaction primitives

**Files:**
- Modify: `src/components/providers/app-providers.tsx`
- Modify: `src/components/dashboard/interactive.tsx`
- Modify: `src/components/dashboard/confirm-action-button.tsx`
- Test: `tests/dashboard-interactions.test.mjs`

**Steps:**
1. Write failing static-contract tests for a bottom-right Sonner toaster, pending action feedback, and disabled controls while a mutation runs.
2. Change the shared Sonner position from `top-right` to `bottom-right` and give error/success messages consistent close controls and duration.
3. Make reusable tabs, drawers, toggles, and confirmation dialogs keyboard-safe; use `type="button"` for non-submit actions and ensure pending states cannot be double-triggered.
4. Add a reusable empty-state component for tables and dashboard cards, with an optional productive next action.
5. Run the targeted test and ESLint verification.

### Task 2: Remove mock data from protected dashboard paths

**Files:**
- Modify: `src/lib/server/catalog.ts`
- Modify: `src/lib/server/admin.ts`
- Modify: dashboard and admin pages that consume these loaders
- Test: `tests/dashboard-data-source.test.mjs`

**Steps:**
1. Write failing tests proving protected data functions do not return `mock-data` values when the database is unavailable or empty.
2. Split marketing demo fallback behavior from authenticated dashboard behavior; dashboard loaders return real rows or explicit empty/unavailable results only.
3. Add route-level error and loading boundaries for admin and customer dashboard segments so an unavailable database is not misrepresented as “no records.”
4. Keep intentional empty states for genuinely empty tables, profiles without an address, and customers without orders.
5. Run focused tests and type-check affected loader call sites.

### Task 3: Make customer notifications and preferences persistent

**Files:**
- Modify: `prisma/schema.prisma`
- Create: migration under `prisma/migrations/`
- Modify: `prisma/seed.mjs`
- Modify: `src/lib/actions/customer.ts`
- Modify: `src/lib/server/catalog.ts`
- Modify: `src/components/dashboard/notifications-client.tsx`
- Modify: `src/components/dashboard/customer-profile-client.tsx`
- Test: `tests/customer-dashboard-actions.test.mjs`

**Steps:**
1. Write failing tests that require notification read actions to call server actions and customer communication choices to be persisted instead of local toggle state.
2. Add the smallest customer-preferences model required for email receipt and SMS update choices; create an additive migration and seed defaults.
3. Add validated, authenticated customer actions for changing preferences, reusing the existing notification read actions.
4. Replace optimistic-only notification updates with pending-safe server actions, then refresh from the database after success.
5. Add empty notification UI and a “view packages” path where appropriate.
6. Run tests, Prisma validation/generation, and lint.

### Task 4: Persist business settings and replace non-functional toggles

**Files:**
- Modify: `src/lib/server/admin.ts`
- Modify: `src/lib/actions/admin.ts`
- Modify: `src/components/dashboard/admin-settings-client.tsx`
- Modify: `src/lib/types.ts`
- Test: `tests/admin-settings.test.mjs`

**Steps:**
1. Write failing tests for settings form fields and notification toggles submitting through one authenticated server action.
2. Read/write the existing `Setting` JSON records for business, delivery, order rules, and notification preferences.
3. Replace local `Toggle` state with controlled settings fields that save, show pending feedback, and revalidate the dashboard.
4. Preserve delivery-zone CRUD while adding true empty states and pending labels to its forms.
5. Run targeted tests and lint.

### Task 5: Make the SEO dashboard true CRUD

**Files:**
- Modify: `prisma/schema.prisma`
- Create: migration under `prisma/migrations/`
- Modify: `prisma/seed.mjs`
- Modify: `src/lib/server/admin.ts`
- Modify: `src/lib/actions/admin.ts`
- Replace: `src/app/admin/seo/page.tsx`
- Create: `src/components/dashboard/admin-seo-client.tsx`
- Test: `tests/admin-seo.test.mjs`

**Steps:**
1. Write a failing test proving the SEO page no longer imports `seoEntries` from mock data and submits title, description, path, and indexing state to a server action.
2. Add a dedicated SEO record model with unique path, meta content, index status, timestamps, migration, and seed records.
3. Implement an authenticated upsert/archive action with validation, audit logging, and path revalidation.
4. Replace the static page with a database-loaded client manager: create, edit, archive, preview, loading and empty states.
5. Run targeted tests, Prisma validation/generation, and lint.

### Task 6: Complete admin operational controls and exports

**Files:**
- Modify: `src/lib/server/catalog.ts`
- Modify: `src/lib/types.ts`
- Modify: `src/components/dashboard/admin-customers-client.tsx`
- Modify: `src/components/dashboard/admin-orders-client.tsx`
- Modify: `src/app/admin/payments/page.tsx`
- Create: protected CSV export route(s) under `src/app/api/admin/`
- Test: `tests/admin-operations.test.mjs`

**Steps:**
1. Write failing tests for valid protected export endpoints, no self-referential “Export CSV” links, and customer pause/resume controls tied to a real customer package id.
2. Extend loader DTOs with the operational identifiers required by existing authorized actions, without exposing them to customers.
3. Wire admin pause/resume actions into customer details with confirmation, pending feedback, refresh, and a useful no-active-package state.
4. Replace placeholder export controls with authenticated CSV responses for orders and payments.
5. Make dashboard-shell notification access route-aware; remove or replace any button that has no working destination.
6. Run focused tests and verify response headers/content for exports.

### Task 7: Verify all dashboard routes and production behavior

**Files:**
- Modify or create: `src/app/admin/loading.tsx`, `src/app/admin/error.tsx`, `src/app/dashboard/loading.tsx`, `src/app/dashboard/error.tsx`
- Test: `tests/dashboard-routes.test.mjs`

**Steps:**
1. Add a dashboard route inventory test covering admin/customer pages, CRUD actions, exports, loading boundaries, error boundaries, and known action links.
2. Run all feature tests, Prisma validation/generation, ESLint, TypeScript, and a production build.
3. Apply migrations against an available MySQL instance without destructive flags; exercise representative admin and customer flows in a browser.
4. Fix all Critical/Important review findings before declaring the dashboard pass complete.
