import assert from "node:assert/strict";
import test from "node:test";

const {
  belowMinimumItems,
  customDeliveryDayCount,
  customPackageName,
  priceCustomPackage,
  validateCustomPackageSelections,
} = await import("../src/lib/custom-package.ts");

// Prices from the client's "Final Updated Packages 2026" sheet.
const catalogue = [
  { id: "roti", categoryId: "breads", categoryName: "Breads", categoryDescription: "", categoryRequired: true, quantityControl: "COUNTER", name: "Roti", description: "", imageUrl: "", unitLabel: "roti", pricePerUnit: 0.6, minQuantity: 2, sortOrder: 1 },
  { id: "rice", categoryId: "rice", categoryName: "Rice", categoryDescription: "", categoryRequired: false, quantityControl: "INPUT", name: "Rice", description: "", imageUrl: "", unitLabel: "oz", pricePerUnit: 0.2, minQuantity: 4, sortOrder: 2 },
  { id: "sabzi", categoryId: "sabzi", categoryName: "Sabzi", categoryDescription: "", categoryRequired: true, quantityControl: "INPUT", name: "Sabzi", description: "", imageUrl: "", unitLabel: "oz", pricePerUnit: 0.9, minQuantity: 6, sortOrder: 3 },
  { id: "dal", categoryId: "dal", categoryName: "Dal", categoryDescription: "", categoryRequired: true, quantityControl: "INPUT", name: "Dal", description: "", imageUrl: "", unitLabel: "oz", pricePerUnit: 0.8, minQuantity: 6, sortOrder: 4 },
  { id: "dal-tadka", categoryId: "dal", categoryName: "Dal", categoryDescription: "", categoryRequired: true, quantityControl: "INPUT", name: "Dal tadka", description: "", imageUrl: "", unitLabel: "oz", pricePerUnit: 0.9, minQuantity: 8, sortOrder: 5 },
  { id: "raita", categoryId: "sides", categoryName: "Sides", categoryDescription: "", categoryRequired: false, quantityControl: "INPUT", name: "Raita", description: "", imageUrl: "", unitLabel: "oz", pricePerUnit: 0.2, minQuantity: 4, sortOrder: 6 },
  { id: "salad", categoryId: "sides", categoryName: "Sides", categoryDescription: "", categoryRequired: false, quantityControl: "INPUT", name: "Salad", description: "", imageUrl: "", unitLabel: "serving", pricePerUnit: 0.1, minQuantity: 1, sortOrder: 7 },
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

test("requires one dish from each required category, not every variant", () => {
  const missing = validateCustomPackageSelections([{ itemId: "roti", quantity: 2 }], catalogue);
  assert.deepEqual(missing.filter((item) => item.type === "category").map((item) => item.name), ["Sabzi", "Dal"]);
  assert.deepEqual(validateCustomPackageSelections(smallPackage, catalogue), []);
  assert.deepEqual(validateCustomPackageSelections([{ itemId: "roti", quantity: 2 }, { itemId: "sabzi", quantity: 6 }, { itemId: "dal-tadka", quantity: 8 }], catalogue), []);
});

test("still flags a selected dish below its own admin-defined minimum", () => {
  const failures = belowMinimumItems([{ itemId: "raita", quantity: 2 }], catalogue);
  assert.deepEqual(failures.map((item) => item.id), ["raita"]);
});

test("custom packages use the admin-defined monthly delivery count", () => {
  assert.equal(customDeliveryDayCount(21), 21);
  assert.equal(customDeliveryDayCount(24), 24);
});

// The name becomes the Stripe line item on the customer's card receipt.
test("names the package after its contents and caps the length", () => {
  const pricing = priceCustomPackage(smallPackage, catalogue, 21);
  const name = customPackageName(pricing);

  assert.match(name, /^Custom monthly tiffin — /);
  assert.ok(name.includes("2 roti"), name);
  assert.ok(!name.includes("roti roti"), name);
  assert.ok(name.includes("6 oz dal"), name);
  assert.ok(name.length <= 120);
});
