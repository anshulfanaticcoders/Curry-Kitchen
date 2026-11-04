import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

function load(path, dependencies = {}) {
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  new Function("require", "exports", code)((id) => {
    assert.ok(Object.hasOwn(dependencies, id), `Unexpected import ${id}`);
    return dependencies[id];
  }, exports);
  return exports;
}
const query = load("../src/lib/admin-list-query.ts");
const filters = (q = "", page = "1", status = "all") => query.parseAdminListQuery({ q, page, status });

function fixture(role = "ADMIN") {
  const calls = [];
  const customers = Array.from({ length: 95 }, (_, i) => ({ id: `customer-${i}`, name: `Customer ${i}`,
    email: `customer${i}@example.test`, phone: `858555${String(i).padStart(4, "0")}`, joinedAt: new Date(2026, 0, i + 1),
    addresses: [], packages: [], orders: [] }));
  const orders = customers.map((customer, i) => ({ id: `order-${i}`, orderNumber: `CK-${String(i).padStart(4, "0")}`,
    customer, guestName: null, guestEmail: null, guestPhone: null, createdAt: customer.joinedAt, total: 100,
    status: "ACCEPTED", items: [], payments: [{ status: "PAID" }], allergies: "" }));
  function matches(row, where = {}) {
    return Object.entries(where).every(([key, value]) => {
      if (key === "OR") return value.some((entry) => matches(row, entry));
      const actual = row?.[key];
      if (value && typeof value === "object") {
        if ("contains" in value) return String(actual ?? "").toLowerCase().includes(value.contains.toLowerCase());
        if ("in" in value) return value.in.includes(actual);
        if ("notIn" in value) return !value.notIn.includes(actual);
        return actual != null && matches(actual, value);
      }
      return actual === value;
    });
  }
  let fail = false;
  const find = (table, rows) => async (args) => {
    calls.push({ table, ...args });
    if (fail) throw new Error("Connection refused");
    return rows.filter((row) => matches(row, args.where)).sort((a, b) =>
      (b.createdAt ?? b.joinedAt) - (a.createdAt ?? a.joinedAt) || b.id.localeCompare(a.id))
      .slice(args.skip, args.skip + args.take);
  };
  const catalog = load("../src/lib/server/catalog.ts", {
    "@/lib/mock-data": {}, "@/lib/auth": { getCurrentSession: async () => role ? { user: { role } } : null },
    "@/lib/db": { db: { order: { findMany: find("order", orders) }, customer: { findMany: find("customer", customers) } } },
    "@/lib/package-schedule": {}, "@/lib/server/pending-renewal-deliveries": {},
    "@/lib/server/data-source": { hasDatabaseUrl: () => true, shouldUseMockData: () => false },
    "@/lib/admin-list-query": query,
  });
  return { catalog, calls, orders, customers, fail: () => { fail = true; } };
}

test("search parameters are bounded, normalized and encoded as data in local URLs", () => {
  assert.deepEqual(filters("  Priya   Sharma  ", "0", "bad"), { q: "Priya Sharma", page: 1, status: "all" });
  for (const page of ["NaN", "1.5", "-1", "100001", "Infinity"]) assert.equal(filters("", page).page, 1);
  assert.equal(filters("x".repeat(150)).q.length, 120);
  assert.equal(query.parseAdminListQuery({ q: ["first", "second"], page: ["2", "3"] }).page, 2);
  const href = query.adminListHref("/admin/orders", filters("A&B + <x>", "2", "Cancelled"));
  assert.equal(new URL(href, "https://example.test").searchParams.get("q"), "A&B + <x>");
  assert.equal(query.adminListHref("/admin/customers", filters()), "/admin/customers");
});

test("order search finds old orders outside the initial 50 and carries the actual customer id", async () => {
  const s = fixture();
  assert.equal((await s.catalog.getAdminOrders()).length, 50);
  assert.ok(!(await s.catalog.getAdminOrders()).some((order) => order.id === "CK-0000"));
  for (const q of ["CK-0000", "customer0@example.test", "8585550000"]) {
    const matches = await s.catalog.getAdminOrders(filters(q));
    assert.equal(matches.length, 1);
    assert.equal(matches[0].customerId, "customer-0");
  }
  s.customers[0].name = "Priya Sharma";
  assert.equal((await s.catalog.getAdminOrders(filters("priya sharma")))[0].customerId, "customer-0");
});

test("guest orders are searchable without a guessed customer profile link", async () => {
  const s = fixture();
  Object.assign(s.orders[0], { customer: null, guestName: "Guest Name", guestEmail: "guest@example.test", guestPhone: "8181234567" });
  for (const q of ["Guest Name", "guest@example.test", "8181234567"]) {
    const [order] = await s.catalog.getAdminOrders(filters(q));
    assert.equal(order.customerId, null);
    assert.equal(order.customer, "Guest Name");
  }
});

test("status filtering happens before pagination and includes legacy order states", async () => {
  const s = fixture();
  s.orders[0].status = "DECLINED";
  s.orders[1].status = "CANCELLED";
  s.orders[2].status = "PENDING_PAYMENT";
  s.orders[3].status = "DELIVERED";
  const cancelled = await s.catalog.getAdminOrders(filters("", "1", "Cancelled"));
  assert.deepEqual(cancelled.map((order) => order.id), ["CK-0001", "CK-0000"]);
  assert.equal((await s.catalog.getAdminOrders(filters("", "1", "Pending payment")))[0].id, "CK-0002");
  assert.equal((await s.catalog.getAdminOrders(filters("CK-0003", "1", "Accepted")))[0].status, "Accepted");
  assert.deepEqual(await s.catalog.getAdminOrders(filters("CK-0002", "1", "Accepted")), []);
});

test("pagination fetches one extra row for next-page availability and keeps stable sorting", async () => {
  const s = fixture();
  const first = await s.catalog.getAdminOrders(filters());
  const second = await s.catalog.getAdminOrders(filters("", "2"));
  assert.equal(first.length, 51);
  assert.equal(second.length, 45);
  assert.equal(new Set([...first.slice(0, 50), ...second].map((order) => order.id)).size, 95);
  assert.deepEqual(s.calls[0].orderBy, [{ createdAt: "desc" }, { id: "desc" }]);
  assert.equal(s.calls[1].skip, 50);
});

test("customer name, email and phone search includes records older than the first 80", async () => {
  const s = fixture();
  assert.equal((await s.catalog.getAdminCustomers()).length, 80);
  for (const q of ["customer0@example.test", "8585550000"]) {
    const rows = await s.catalog.getAdminCustomers(filters(q));
    assert.equal(rows.length, 1);
    assert.equal(rows[0].id, "customer-0");
  }
  assert.equal((await s.catalog.getAdminCustomers(filters("CUSTOMER 0")))[0].id, "customer-0");
  assert.equal((await s.catalog.getAdminCustomers(filters())).length, 81);
  assert.equal((await s.catalog.getAdminCustomers(filters("", "2"))).length, 15);
  assert.deepEqual(await s.catalog.getAdminCustomers(filters("no-such-person")), []);
});

test("unauthenticated and customer sessions cannot query admin lists", async () => {
  for (const role of [null, "CUSTOMER"]) {
    const s = fixture(role);
    assert.deepEqual(await s.catalog.getAdminOrders(filters()), []);
    assert.deepEqual(await s.catalog.getAdminCustomers(filters()), []);
    assert.equal(s.calls.length, 0);
  }
});

test("a database failure is not presented as an empty search result", async () => {
  const s = fixture();
  s.fail();
  await assert.rejects(s.catalog.getAdminOrders(filters()), /Orders could not be loaded/);
  await assert.rejects(s.catalog.getAdminCustomers(filters()), /Customers could not be loaded/);
});
