import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const required = [
  "../src/app/admin/loading.tsx",
  "../src/app/admin/error.tsx",
  "../src/app/dashboard/loading.tsx",
  "../src/app/dashboard/error.tsx",
  "../src/app/api/admin/orders/export/route.ts",
  "../src/app/api/admin/payments/export/route.ts",
];

for (const path of required) assert.ok(existsSync(new URL(path, import.meta.url)), `${path} should exist`);
for (const path of ["../src/app/admin/error.tsx", "../src/app/dashboard/error.tsx"]) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  assert.match(source, /"use client"/);
  assert.match(source, /reset/);
}

console.log("✓ protected dashboard segments provide loading and recovery boundaries");
