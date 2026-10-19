import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import { buildOrderReceipt, receiptCents, receiptStatus } from "../src/lib/order-receipt.ts";

function load(path, dependencies) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports = {};
  new Function("require", "exports", code)((id) => {
    assert.ok(Object.hasOwn(dependencies, id), `Unexpected dependency ${id}`);
    return dependencies[id];
  }, exports);
  return exports;
}

function source(overrides = {}) {
  return {
    orderNumber: "CK-TEST-100", status: "ACCEPTED", createdAt: new Date("2026-10-19T18:00:00Z"),
    subtotal: "120.00", discountAmount: "10.00", deliveryFee: "20.00", taxAmount: "11.38", total: "141.38",
    guestName: null, guestEmail: null, customer: { name: "Test customer", email: "test@example.test" },
    items: [
      { id: "i1", quantity: 2, unitPrice: "50.00", total: "100.00", package: { name: "Weekly tiffin", price: "999.99" }, legacyComplimentary: [] },
      { id: "i2", quantity: 1, unitPrice: "20.00", total: "20.00", package: { name: "Custom tiffin" }, legacyComplimentary: [] },
    ],
    legacyAddons: [],
    payments: [{ id: "p1", method: "STRIPE", status: "PAID", amount: "141.38", currency: "USD", stripePaymentId: "pi_test_saved", stripeSessionId: null, createdAt: new Date("2026-10-19T18:01:00Z") }],
    ...overrides,
  };
}

test("saved Decimal charges retain exact cents and ignore current package pricing", () => {
  const receipt = buildOrderReceipt(source());
  assert.deepEqual(receipt.amounts, { subtotal: 12000, discount: 1000, delivery: 2000, tax: 1138, total: 14138 });
  assert.equal(receipt.items[0].unitPrice, 5000);
  assert.equal(receipt.items[0].quantity, 2);
  assert.equal(receipt.items[0].total, 10000);
  assert.equal(receipt.paymentStatus, "Paid");
  assert.equal(receipt.title, "Payment receipt");
  assert.deepEqual(receipt.warnings, []);
});

test("money parser preserves zero, cents and missing values without inventing zero", () => {
  for (const [value, expected] of [["0", 0], ["0.01", 1], ["1.2", 120], ["99999999.99", 9999999999], ["-1.23", -123], [null, null], [undefined, null], ["1.234", null], ["invalid", null], [Infinity, null]]) {
    assert.equal(receiptCents(value), expected);
  }
  assert.equal(receiptCents({ toString: () => "12.34" }), 1234);
});

test("old add-ons are counted once and complimentary items are not charged", () => {
  const order = source({ subtotal: "125.00", total: "146.38" });
  order.payments[0].amount = "146.38";
  order.legacyAddons = [{ id: "addon1", quantity: 1, unitPrice: "5", total: "5" }];
  order.items[0].legacyComplimentary = [{ name: "Salad" }];
  const receipt = buildOrderReceipt(order);
  assert.equal(receipt.items.length, 3);
  assert.match(receipt.items[2].name, /name not recorded/);
  assert.deepEqual(receipt.items[0].complimentary, ["Salad"]);
  assert.deepEqual(receipt.warnings, []);
});

test("pending, failed, absent and refunded payments are never labelled paid", () => {
  for (const [status, label] of [["PENDING", "Pending payment"], ["FAILED", "Payment failed"], ["REFUNDED", "Refund recorded"]]) {
    const order = source();
    order.payments[0].status = status;
    const receipt = buildOrderReceipt(order);
    assert.equal(receipt.paymentStatus, label);
    assert.equal(receipt.title, "Order summary");
    if (status === "REFUNDED") assert.ok(receipt.warnings.some((warning) => /exact refunded amount is not stored/.test(warning)));
  }
  assert.equal(buildOrderReceipt(source({ payments: [] })).paymentStatus, "Not recorded");
});

test("failed and pending attempts do not inflate a successful payment", () => {
  const order = source();
  order.payments.push({ ...order.payments[0], id: "p2", status: "FAILED" }, { ...order.payments[0], id: "p3", status: "PENDING" });
  const receipt = buildOrderReceipt(order);
  assert.equal(receipt.paymentStatus, "Paid");
  assert.equal(receipt.payments.length, 3);
  assert.deepEqual(receipt.warnings, []);
});

test("partial, excess, foreign currency and missing payments require reconciliation", () => {
  const partial = source();
  partial.payments[0].amount = "100";
  assert.equal(buildOrderReceipt(partial).paymentStatus, "Partially paid");
  partial.payments[0].amount = "200";
  assert.equal(buildOrderReceipt(partial).paymentStatus, "Needs review");
  for (const patch of [{ currency: "CAD" }, { amount: null }, { amount: "-1" }]) {
    const order = source();
    Object.assign(order.payments[0], patch);
    assert.equal(buildOrderReceipt(order).paymentStatus, "Needs review");
    assert.equal(buildOrderReceipt(order).title, "Order summary");
  }
});

test("inconsistent and incomplete saved records are shown unchanged with warnings", () => {
  const mismatch = buildOrderReceipt(source({ total: "150.00", taxAmount: null }));
  assert.equal(mismatch.amounts.tax, null);
  assert.equal(mismatch.amounts.total, 15000);
  assert.ok(mismatch.warnings.some((warning) => /missing amounts/.test(warning)));
  const order = source({ total: "150.00" });
  order.items[0].quantity = 3;
  order.items[0].total = "99";
  const receipt = buildOrderReceipt(order);
  assert.ok(receipt.warnings.some((warning) => /breakdown/.test(warning)));
  assert.ok(receipt.warnings.some((warning) => /subtotal/.test(warning)));
  assert.ok(receipt.warnings.some((warning) => /quantity and unit price/.test(warning)));
  assert.equal(receipt.items[0].total, 9900);
});

test("zero delivery, tax and discounts are valid recorded amounts", () => {
  const order = source({ deliveryFee: 0, taxAmount: 0, discountAmount: 0, total: 120 });
  order.payments[0].amount = 120;
  assert.deepEqual(buildOrderReceipt(order).warnings, []);
});

function serviceSetup() {
  const control = { session: { user: { role: "ADMIN" } }, result: source(), query: null, calls: 0, failure: false };
  const service = load("../src/lib/server/order-receipt.ts", {
    "server-only": {},
    "@/lib/auth": { getCurrentSession: async () => control.session },
    "@/lib/db": { db: { order: { findUnique: async (query) => { control.calls++; control.query = query; if (control.failure) throw new Error("Internal database detail"); return control.result; } } } },
    "@/lib/order-receipt": { buildOrderReceipt },
  });
  const route = load("../src/app/api/admin/orders/[orderNumber]/receipt/route.ts", { "@/lib/server/order-receipt": service });
  const get = (number = "CK-TEST-100") => route.GET(new Request("http://localhost/api/admin/orders/test/receipt"), { params: Promise.resolve({ orderNumber: number }) });
  return { control, ...service, get };
}

test("anonymous and customer sessions cannot read receipts or query orders", async () => {
  for (const [session, status] of [[null, 401], [{ user: { role: "CUSTOMER" } }, 403]]) {
    const s = serviceSetup();
    s.control.session = session;
    const response = await s.get();
    assert.equal(response.status, status);
    assert.equal(s.control.calls, 0);
    assert.match(response.headers.get("cache-control"), /no-store/);
  }
});

test("receipt query is order-specific, read-only and excludes current price/settings", async () => {
  const s = serviceSetup();
  const response = await s.get();
  assert.equal(response.status, 200);
  assert.deepEqual(s.control.query.where, { orderNumber: "CK-TEST-100" });
  assert.deepEqual(s.control.query.select.items.select.package.select, { name: true });
  assert.ok(s.control.query.select.payments);
  assert.ok(s.control.query.select.legacyAddons);
  const data = await response.json();
  assert.equal(data.payments[0].reference, "pi_test_saved");
  assert.equal(data.amounts.total, 14138);
  assert.match(response.headers.get("cache-control"), /private, no-store/);
  assert.match(response.headers.get("x-robots-tag"), /noindex/);
});

test("unknown and malformed order requests return explicit errors", async () => {
  const s = serviceSetup();
  assert.equal((await s.get("")).status, 400);
  assert.equal((await s.get("x".repeat(192))).status, 400);
  assert.equal(s.control.calls, 0);
  s.control.result = null;
  assert.equal((await s.get()).status, 404);
});

test("database outages do not become fabricated receipts or expose database errors", async () => {
  const s = serviceSetup();
  s.control.failure = true;
  const original = console.error;
  console.error = () => {};
  try {
    const response = await s.get();
    assert.equal(response.status, 503);
    const body = await response.text();
    assert.match(body, /try again/);
    assert.ok(!body.includes("Internal database detail"));
  } finally { console.error = original; }
});

test("receipt markup contains exact charges, status and escaped customer content", () => {
  const view = load("../src/components/dashboard/order-receipt-view.tsx", {
    "react/jsx-runtime": jsxRuntime,
    "@/lib/order-receipt": { receiptStatus },
    "./order-receipt.module.css": { default: {} },
  });
  const order = source({ customer: { name: "<script>alert(1)</script>", email: "test@example.test" } });
  order.payments[0].status = "PENDING";
  const html = renderToStaticMarkup(view.OrderReceiptView({ receipt: buildOrderReceipt(order) }));
  for (const text of ["Order summary", "Pending payment", "Delivery charges", "Tax", "$11.38", "$141.38", "-$10.00", "Quantity: 2", "pi_test_saved"]) assert.ok(html.includes(text), text);
  assert.ok(!html.includes("<script>"));
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(!html.includes("999.99"));
});
