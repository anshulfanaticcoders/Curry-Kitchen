import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import * as icons from "lucide-react";
import ts from "typescript";
import * as customPackage from "../src/lib/custom-package.ts";
import * as schedule from "../src/lib/package-schedule.ts";
import { MAX_CUSTOM_ITEM_QUANTITY } from "../src/lib/package-cart.ts";

const source = readFileSync(new URL("../src/components/sections/custom-package-builder.tsx", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
});
const dependencies = {
  react: React,
  "react/jsx-runtime": jsxRuntime,
  "next/navigation": { useRouter: () => ({}) },
  sonner: { toast: {} },
  "lucide-react": icons,
  "@/components/providers/package-cart-provider": { usePackageCart: () => ({ items: [], hydrated: false }) },
  "@/components/ui/button": { Button: props => React.createElement("button", props) },
  "@/components/schedule/holiday-availability-notice": { HolidayAvailabilityNotice: () => null },
  "@/components/schedule/use-live-availability": { useLiveAvailability: value => value },
  "@/lib/custom-package": customPackage,
  "@/lib/package-cart": { MAX_CUSTOM_ITEM_QUANTITY },
  "@/lib/package-schedule": schedule,
  "@/lib/utils": { formatCurrency: value => `$${value.toFixed(2)}` },
  "./custom-package-builder.module.css": { default: new Proxy({}, { get: (_, key) => key }) },
};
const exports = {};
new Function("require", "exports", outputText)(id => {
  assert.ok(Object.hasOwn(dependencies, id), `Unexpected dependency: ${id}`);
  return dependencies[id];
}, exports);

const items = ["Dal", "Rice", "Breads", "Sabzi", "Sides", "Sides"].map((category, index) => ({
  id: `item-${index}`, categoryId: category, categoryName: category,
  categoryDescription: "", categoryRequired: ["Dal", "Breads", "Sabzi"].includes(category),
  quantityControl: "INPUT", name: `Dish ${index}`, description: "", imageUrl: `/admin-photo-${index}.webp`,
  unitLabel: "oz", pricePerUnit: 1.23, minQuantity: 2, sortOrder: index,
}));
const availability = { earliestStartDate: "2026-09-23", deliveryWeekdays: [1, 2, 3, 4, 5], holidays: [], orderCutoff: "19:30", deliveryWindow: "10:15 AM - 5:45 PM" };
const render = (overrides = {}) => renderToStaticMarkup(React.createElement(exports.CustomPackageBuilder, {
  items, config: { customMonthlyDays: 22 }, availability, ...overrides,
}));

test("visual grid renders all admin items together and keeps requirements beside category labels", () => {
  const html = render();
  assert.equal((html.match(/<article /g) ?? []).length, 6);
  assert.match(html, /class="categoryHeading"><span>Dal<\/span><span class="requirement"/);
  assert.match(html, /aria-pressed="true" aria-controls="custom-item-grid">All/);
  assert.doesNotMatch(html, /\$1\.23/);
  assert.match(html, /src="\/admin-photo-0.webp"/);
  assert.match(html, /aria-label="Increase Dish 0"/);
  assert.match(html, /aria-label="Dish 0 quantity in oz"/);
});

test("summary uses configured delivery days, delivery window and cutoff", () => {
  const html = render();
  assert.match(html, /22 delivery days/);
  assert.match(html, /After 7:30 PM: order for the day after tomorrow/);
  assert.match(html, /Delivery: 10:15 AM - 5:45 PM/);
  assert.match(html, /role="tooltip" class="tooltip" hidden=""/);
  assert.match(html, /Pacific Time/);
  assert.doesNotMatch(html, /8:00 PM/);
});

test("missing admin images use a neutral placeholder, not invented dish photos", () => {
  const html = render({ items: [{ ...items[0], imageUrl: "" }] });
  assert.match(html, /class="imagePlaceholder"/);
  assert.doesNotMatch(html, /<img /);
});

test("empty catalog retains the unavailable state", () => {
  const html = render({ items: [] });
  assert.match(html, /Custom packages are not available yet/);
  assert.doesNotMatch(html, /<article /);
});
