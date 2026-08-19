import assert from "node:assert/strict";
import test from "node:test";

const {
  customDeliveryDayCount,
  customPackageName,
  missingRequiredItems,
  priceCustomPackage,
} = await import("../src/lib/custom-package.ts");

// Prices from the client's "Final Updated Packages 2026" sheet.
const catalogue = [
  { id: "roti", name: "Roti", unitLabel: "roti", pricePerUnit: 0.6, required: true, sortOrder: 1 },
  { id: "rice", name: "Rice", unitLabel: "oz", pricePerUnit: 0.2, required: false, sortOrder: 2 },
  { id: "sabzi", name: "Sabzi", unitLabel: "oz", pricePerUnit: 0.9, required: true, sortOrder: 3 },
  { id: "dal", name: "Dal", unitLabel: "oz", pricePerUnit: 0.8, required: true, sortOrder: 4 },
  { id: "raita", name: "Raita", unitLabel: "oz", pricePerUnit: 0.2, required: false, sortOrder: 5 },
  { id: "salad", name: "Salad", unitLabel: "serving", pricePerUnit: 0.1, required: false, sortOrder: 6 },
];

// Their "Small" monthly package: 2 roti, 6oz rice, 6oz dal, 6oz sabzi,
// 4oz raita, salad — which their own sheet costs at ~13.6 per day.
const smallPackage = [
  { itemId: "roti", quantity: 2 },
  { itemId: "rice", quantity: 6 },
  { itemId: "dal", quantity: 6 },
  { itemId: "sabzi", quantity: 6 },
  { itemId: "raita", quantity: 4 },
  { itemId: "salad", quantity: 1 },
];

test("reproduces the per-day cost from the client's package sheet", () => {
  const pricing = priceCustomPackage(smallPackage, catalogue, 21);

  assert.equal(pricing.perDay, 13.5);
  assert.equal(pricing.total, 283.5);
  assert.equal(pricing.deliveryDayCount, 21);
});

test("ignores unknown and zero-quantity selections", () => {
  const pricing = priceCustomPackage(
    [
      { itemId: "roti", quantity: 2 },
      { itemId: "ghost-item", quantity: 5 },
      { itemId: "dal", quantity: 0 },
    ],
    catalogue,
    1,
  );

  assert.equal(pricing.perDay, 1.2);
  assert.equal(pricing.lines.length, 1);
});

test("flags every mandatory item left at zero", () => {
  const missing = missingRequiredItems([{ itemId: "roti", quantity: 2 }], catalogue);

  assert.deepEqual(missing.map((item) => item.id), ["sabzi", "dal"]);
  assert.deepEqual(missingRequiredItems(smallPackage, catalogue), []);
});

test("weekly follows the kitchen's delivery weekdays, monthly uses the admin setting", () => {
  assert.equal(customDeliveryDayCount("WEEKLY", 5, 21), 5);
  assert.equal(customDeliveryDayCount("WEEKLY", 6, 21), 6);
  assert.equal(customDeliveryDayCount("MONTHLY", 5, 21), 21);
  assert.equal(customDeliveryDayCount("MONTHLY", 5, 24), 24);
});

// The name becomes the Stripe line item on the customer's card receipt.
test("names the package after its contents and caps the length", () => {
  const pricing = priceCustomPackage(smallPackage, catalogue, 21);
  const name = customPackageName("MONTHLY", pricing);

  assert.match(name, /^Custom Monthly tiffin — /);
  assert.ok(name.includes("2 roti"), name);
  assert.ok(!name.includes("roti roti"), name);
  assert.ok(name.includes("6 oz dal"), name);
  assert.ok(name.length <= 120);
});
