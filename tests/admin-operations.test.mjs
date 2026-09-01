import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const packageControl = read("../src/components/dashboard/admin-package-control.tsx");
const orders = read("../src/components/dashboard/admin-orders-client.tsx");
const payments = read("../src/app/admin/payments/page.tsx");

assert.ok(existsSync(new URL("../src/app/api/admin/orders/export/route.ts", import.meta.url)));
assert.ok(existsSync(new URL("../src/app/api/admin/payments/export/route.ts", import.meta.url)));
assert.match(packageControl, /adminPausePackageAction/);
assert.match(packageControl, /adminResumePackageAction/);
assert.match(packageControl, /activePackageId/);
assert.match(orders, /\/api\/admin\/orders\/export/);
assert.match(payments, /\/api\/admin\/payments\/export/);
assert.doesNotMatch(payments, /href="\/admin\/payments"/);

console.log("✓ admin operations expose protected exports and customer package controls");
