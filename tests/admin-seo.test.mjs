import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const schema = read("../prisma/schema.prisma");
const actions = read("../src/lib/actions/admin.ts");
const loader = read("../src/lib/server/admin.ts");
const page = read("../src/app/admin/seo/page.tsx");
const client = read("../src/components/dashboard/admin-seo-client.tsx");
const form = read("../src/components/dashboard/forms/seo-form.tsx");

assert.match(schema, /model SeoRecord \{/);
assert.match(schema, /path\s+String\s+@unique/);
assert.match(schema, /targetType\s+SeoTargetType/);
assert.match(schema, /packageId\s+String\?\s+@unique/);
assert.match(schema, /ogTitle\s+String\?/);
assert.match(schema, /ogImageUrl\s+String\?/);
assert.match(schema, /includeInSitemap\s+Boolean/);
assert.match(schema, /schemaEnabled\s+Boolean/);
assert.match(actions, /export async function saveSeoRecordAction/);
assert.match(actions, /export async function resetSeoRecordAction/);
assert.match(actions, /export async function saveSeoSettingsAction/);
assert.match(actions, /validateHttpsUrl/);
assert.match(actions, /revalidatePath\("\/admin\/seo"\)/);
assert.match(loader, /export async function getAdminSeoManagerData/);
assert.doesNotMatch(page, /seoEntries/);
assert.match(page, /AdminSeoClient/);
assert.match(form, /Search preview/);
assert.match(form, /Social preview/);
assert.match(form, /origin\.replace/);
assert.match(form, /applyTitleSuffix/);
assert.match(client, /Using defaults/);
assert.match(client, /Reset to automatic defaults/);
assert.doesNotMatch(client, /Add SEO entry/);

console.log("✓ admin SEO uses registered targets, guided settings, and resettable overrides");
