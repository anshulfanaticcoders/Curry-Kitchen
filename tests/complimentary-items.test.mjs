import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const { complimentaryItemIdsFromFormData } = await import("../src/lib/complimentary-items.ts");

test("keeps each selected complimentary item once when a plan is saved", () => {
  const formData = new FormData();
  formData.append("complimentaryItemIds", "curd");
  formData.append("complimentaryItemIds", "salad");
  formData.append("complimentaryItemIds", "curd");
  formData.append("complimentaryItemIds", "");

  assert.deepEqual(complimentaryItemIdsFromFormData(formData), ["curd", "salad"]);
});

test("models reusable complimentary items separately from paid add-ons", () => {
  const schema = readFileSync(join(process.cwd(), "prisma/schema.prisma"), "utf8");
  const types = readFileSync(join(process.cwd(), "src/lib/types.ts"), "utf8");

  assert.match(schema, /model ComplimentaryItem \{/);
  assert.match(schema, /model PackageComplimentaryItem \{/);
  assert.match(schema, /complimentaryItems\s+PackageComplimentaryItem\[\]/);
  assert.match(schema, /model OrderComplimentaryItem \{/);
  assert.match(types, /complimentaryItems:\s+ComplimentaryItem\[\];/);
  assert.match(types, /complimentaryItemIds:\s+string\[\];/);
});

test("admin can manage the catalog and assign its items to each plan", () => {
  const actions = readFileSync(join(process.cwd(), "src/lib/actions/admin.ts"), "utf8");
  const adminLoader = readFileSync(join(process.cwd(), "src/lib/server/admin.ts"), "utf8");
  const adminUi = readFileSync(join(process.cwd(), "src/components/dashboard/admin-packages-client.tsx"), "utf8");

  assert.match(actions, /complimentaryItemIdsFromFormData\(formData\)/);
  assert.match(actions, /export async function saveComplimentaryItemAction/);
  assert.match(actions, /complimentaryItems:\s*\{\s*deleteMany:/s);
  assert.match(adminLoader, /db\.complimentaryItem\.findMany/);
  assert.match(adminUi, /name="complimentaryItemIds"/);
  assert.match(adminUi, /Complimentary items/);
  assert.match(adminUi, /item \? statusValue\(item\.status\) : "ACTIVE"/);
  assert.match(adminUi, /item\.status === "Active"/);
});

test("customers see only their plan's complimentary items and checkout snapshots them", () => {
  const catalog = readFileSync(join(process.cwd(), "src/lib/server/catalog.ts"), "utf8");
  const packageExperience = readFileSync(
    join(process.cwd(), "src/components/sections/package-experience.tsx"),
    "utf8",
  );
  const checkout = readFileSync(join(process.cwd(), "src/lib/server/checkout.ts"), "utf8");

  assert.match(catalog, /complimentaryItems:\s*\{\s*where:\s*\{\s*complimentaryItem:/s);
  assert.match(catalog, /complimentaryItems:\s*plan\.complimentaryItems\.map/);
  assert.match(packageExperience, /Complimentary with this plan/);
  assert.match(checkout, /complimentaryItems:\s*\{\s*where:\s*\{\s*complimentaryItem:/s);
  assert.match(checkout, /tx\.orderComplimentaryItem\.createMany/);
});
