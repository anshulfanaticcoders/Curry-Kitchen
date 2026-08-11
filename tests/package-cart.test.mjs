import assert from "node:assert/strict";
import test from "node:test";

const { packageCartQuery, parsePackageCart } = await import("../src/lib/package-cart.ts");

const basePackage = {
  lineId: "base-plan",
  packageId: "regular-tiffin",
  addonIds: [],
  startDate: "2026-08-03",
};

test("retains a package with no optional add-ons", () => {
  assert.deepEqual(parsePackageCart(JSON.stringify([basePackage])), [basePackage]);
});

test("round-trips a base package through the checkout query", () => {
  assert.deepEqual(parsePackageCart(decodeURIComponent(packageCartQuery([basePackage]))), [basePackage]);
});
