import assert from "node:assert/strict";
import test from "node:test";

const { calculateOrderTotals } = await import("../src/lib/order-totals.ts");

test("adds delivery before calculating tax", () => {
  assert.deepEqual(
    calculateOrderTotals({ subtotal: 100, deliveryFee: 30, taxRate: 0.0875 }),
    {
      discountedSubtotal: 100,
      taxableAmount: 130,
      taxAmount: 11.38,
      total: 141.38,
    },
  );
});
