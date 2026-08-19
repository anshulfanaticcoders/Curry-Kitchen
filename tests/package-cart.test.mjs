import assert from "node:assert/strict";
import test from "node:test";

const { packageCartQuery, parsePackageCart } = await import("../src/lib/package-cart.ts");

const basePackage = {
  kind: "plan",
  lineId: "base-plan",
  packageId: "regular-tiffin",
  startDate: "2026-08-03",
};

const customPackage = {
  kind: "custom",
  lineId: "custom-plan",
  cadence: "MONTHLY",
  items: [
    { itemId: "roti", quantity: 2 },
    { itemId: "dal", quantity: 6 },
  ],
  startDate: "2026-08-03",
};

test("retains a fixed plan line", () => {
  assert.deepEqual(parsePackageCart(JSON.stringify([basePackage])), [basePackage]);
});

test("round-trips a base package through the checkout query", () => {
  assert.deepEqual(parsePackageCart(decodeURIComponent(packageCartQuery([basePackage]))), [basePackage]);
});

// A custom line losing its fields on a round-trip is the silent-data-loss
// failure mode: the customer would land on checkout with an empty cart.
test("round-trips a custom line without dropping its items", () => {
  assert.deepEqual(
    parsePackageCart(decodeURIComponent(packageCartQuery([customPackage]))),
    [customPackage],
  );
});

test("keeps plan and custom lines side by side", () => {
  const cart = [basePackage, customPackage];
  assert.deepEqual(parsePackageCart(decodeURIComponent(packageCartQuery(cart))), cart);
});

test("drops a line that is neither a plan nor a custom build", () => {
  const orphan = { lineId: "orphan", startDate: "2026-08-03" };
  assert.deepEqual(parsePackageCart(JSON.stringify([orphan])), []);
});

test("drops a custom line with a non-integer or out-of-range quantity", () => {
  const fractional = { ...customPackage, items: [{ itemId: "dal", quantity: 1.5 }] };
  const negative = { ...customPackage, items: [{ itemId: "dal", quantity: -1 }] };
  const huge = { ...customPackage, items: [{ itemId: "dal", quantity: 1000 }] };

  assert.deepEqual(parsePackageCart(JSON.stringify([fractional])), []);
  assert.deepEqual(parsePackageCart(JSON.stringify([negative])), []);
  assert.deepEqual(parsePackageCart(JSON.stringify([huge])), []);
});

test("strips zero-quantity items from a custom line", () => {
  const withZero = {
    ...customPackage,
    items: [...customPackage.items, { itemId: "raita", quantity: 0 }],
  };

  assert.deepEqual(parsePackageCart(JSON.stringify([withZero])), [customPackage]);
});
