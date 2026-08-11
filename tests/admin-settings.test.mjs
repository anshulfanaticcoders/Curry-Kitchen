import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const actions = read("../src/lib/actions/admin.ts");
const loader = read("../src/lib/server/admin.ts");
const client = read("../src/components/dashboard/admin-settings-client.tsx");
const page = read("../src/app/admin/settings/page.tsx");

assert.match(actions, /export async function saveAdminSettingsAction/);
assert.match(actions, /await requireAdmin\(\)/);
assert.match(actions, /db\.setting\.upsert/);
assert.match(actions, /revalidatePath\("\/admin\/settings"\)/);
assert.match(loader, /export async function getAdminSettings/);
assert.match(loader, /db\.setting\.findMany/);
assert.match(client, /saveAdminSettingsAction/);
assert.match(client, /isPending/);
assert.match(client, /toast\.success/);
assert.match(client, /EmptyState/);
assert.match(page, /getAdminSettings/);

console.log("✓ admin settings use authenticated persistence and actionable UI states");
