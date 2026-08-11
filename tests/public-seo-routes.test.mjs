import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
for (const path of [
  "../src/app/sitemap.ts",
  "../src/app/robots.ts",
  "../src/app/(marketing)/packages/[slug]/page.tsx",
]) {
  assert.ok(existsSync(new URL(path, import.meta.url)), `${path} should exist`);
}
const sitemap = read("../src/app/sitemap.ts");
const robots = read("../src/app/robots.ts");
const detail = read("../src/app/(marketing)/packages/[slug]/page.tsx");
const card = read("../src/components/food/package-card.tsx");
const faq = read("../src/app/(marketing)/faq/page.tsx");
const serverSeo = read("../src/lib/server/seo.ts");
const catalog = read("../src/lib/server/catalog.ts");

assert.match(sitemap, /getSitemap/);
assert.doesNotMatch(sitemap, /priority|changeFrequency/);
assert.match(robots, /\/admin\//);
assert.match(robots, /"\/admin"/);
assert.match(robots, /\/api\//);
assert.match(robots, /"\/dashboard"/);
assert.match(robots, /sitemap\.xml/);
assert.match(detail, /generateMetadata/);
assert.match(detail, /notFound\(\)/);
assert.match(detail, /getPackageSchemas/);
assert.match(detail, /Breadcrumb/);
assert.match(card, /View plan details/);
assert.match(faq, /buildFaqSchema/);
assert.match(serverSeo, /mockPackagePlans/);
assert.match(catalog, /catch \{\s*return mockPackagePlans\.find\(\(plan\) => plan\.slug === slug\) \?\? null;/);

for (const path of [
  "../src/app/(marketing)/page.tsx",
  "../src/app/(marketing)/packages/page.tsx",
  "../src/app/(marketing)/menu/page.tsx",
  "../src/app/(marketing)/about/page.tsx",
  "../src/app/(marketing)/faq/page.tsx",
  "../src/app/(marketing)/blog/page.tsx",
  "../src/app/(marketing)/contact/page.tsx",
]) {
  assert.match(read(path), /generateMetadata/);
}

console.log("✓ public routes expose metadata, truthful JSON-LD, package details, sitemap, and robots");
