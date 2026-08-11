import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const schema = read("../prisma/schema.prisma");
const actions = read("../src/lib/actions/admin.ts");
const loader = read("../src/lib/server/admin.ts");
const page = read("../src/app/admin/seo/page.tsx");
const client = read("../src/components/dashboard/admin-seo-client.tsx");

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
assert.match(loader, /export async function getAdminSeoRecords/);
assert.doesNotMatch(loader, /fallbackImage/);
assert.doesNotMatch(page, /seoEntries/);
assert.match(page, /AdminSeoClient/);
assert.match(client, /Search preview/);
assert.match(client, /Social preview/);
assert.match(client, /origin\.replace/);
assert.match(client, /applyTitleSuffix/);
assert.match(client, /FAQPage/);
assert.match(client, /BreadcrumbList/);
assert.match(client, /Using defaults/);
assert.match(client, /Reset to automatic defaults/);
assert.doesNotMatch(client, /Add SEO entry/);

console.log("✓ admin SEO uses registered targets, guided settings, and resettable overrides");
