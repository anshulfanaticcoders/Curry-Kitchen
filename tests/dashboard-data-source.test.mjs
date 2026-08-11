import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

function source(path) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function exportedFunction(file, name, nextName) {
  const start = file.indexOf(`export async function ${name}`);
  const end = nextName ? file.indexOf(`export async function ${nextName}`, start + 1) : file.length;

  assert.notEqual(start, -1, `Could not find ${name}`);
  assert.notEqual(end, -1, `Could not find the end of ${name}`);
  return file.slice(start, end);
}

test("protected dashboard loaders do not present mock records as live data", () => {
  const catalog = source("src/lib/server/catalog.ts");
  const protectedLoaders = [
    ["getAdminReviews", "getAdminOrders"],
    ["getAdminOrders", "getAdminCustomers"],
    ["getAdminCustomers", "getAdminPackagingRecord"],
    ["getAdminPackagingRecord", "getPayments"],
    ["getPayments", "getCustomerOrders"],
    ["getCustomerOrders", "getUpcomingDeliveries"],
    ["getUpcomingDeliveries", "getCustomerPackageSummaries"],
    ["getCustomerPackageSummaries", "getCustomerPackageSummary"],
    ["getCustomerNotifications", "getCustomerProfileDetails"],
    ["getCustomerProfileDetails", "getCustomerPayments"],
    ["getCustomerPayments"],
  ];

  for (const [name, nextName] of protectedLoaders) {
    assert.doesNotMatch(exportedFunction(catalog, name, nextName), /mock[A-Z]/);
  }
});

test("admin delivery settings do not substitute a demo zone list", () => {
  const admin = source("src/lib/server/admin.ts");
  const loader = exportedFunction(admin, "getDeliveryZoneManagerData", "getAdminCategoryManagerData");

  assert.doesNotMatch(loader, /fallbackDeliveryZones|shouldUseMockData/);
});
