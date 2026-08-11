import assert from "node:assert/strict";
import { existsSync } from "node:fs";

const moduleUrl = new URL("../src/lib/seo-core.mjs", import.meta.url);

assert.ok(existsSync(moduleUrl), "SEO core should exist");

const {
  STATIC_SEO_ROUTES,
  buildFaqSchema,
  buildHomeSchemas,
  buildPackageSchemas,
  buildSitemapEntries,
  canonicalUrl,
  normalizeSeoInput,
  resolveSeoMetadata,
  serializeJsonLd,
  siteOrigin,
  validateHttpsImageUrl,
  validateHttpsUrl,
} = await import(moduleUrl);

assert.deepEqual(
  STATIC_SEO_ROUTES.map((route) => route.path),
  ["/", "/packages", "/menu", "/about", "/faq", "/blog", "/contact"],
  "the registry should contain every public marketing route exactly once",
);

assert.deepEqual(
  normalizeSeoInput({ indexed: false, includeInSitemap: true }),
  { indexed: false, includeInSitemap: false },
  "no-index targets must never remain in the sitemap",
);

assert.equal(canonicalUrl("https://currykitchen.ca/ignored/path", "/packages"), "https://currykitchen.ca/packages");
assert.equal(siteOrigin("http://localhost:3000"), "https://currykitchen.ca");
assert.equal(validateHttpsImageUrl("https://cdn.example.com/social.jpg"), true);
assert.equal(validateHttpsImageUrl("http://cdn.example.com/social.jpg"), false);
assert.equal(validateHttpsImageUrl("/social.jpg"), true);
assert.equal(validateHttpsUrl("https://instagram.com/currykitchen"), true);
assert.equal(validateHttpsUrl("http://instagram.com/currykitchen"), false);
assert.equal(validateHttpsUrl("/social-profile"), false);

const metadata = resolveSeoMetadata({
  origin: "https://currykitchen.ca",
  route: STATIC_SEO_ROUTES[1],
  record: {
    title: "Flexible tiffin plans",
    description: null,
    indexed: true,
    ogTitle: null,
    ogDescription: null,
    ogImageUrl: null,
    ogImageAlt: null,
  },
  settings: {
    titleSuffix: " | Curry Kitchen",
    defaultDescription: "Fresh homestyle meals delivered across San Diego.",
    defaultSocialImage: "https://cdn.example.com/default.jpg",
  },
});

assert.equal(metadata.title, "Flexible tiffin plans | Curry Kitchen");
assert.equal(metadata.description, "Fresh homestyle meals delivered across San Diego.");
assert.equal(metadata.alternates.canonical, "https://currykitchen.ca/packages");
assert.deepEqual(metadata.robots, { index: true, follow: true });
assert.equal(metadata.openGraph.images[0].url, "https://cdn.example.com/default.jpg");
assert.equal(metadata.twitter.card, "summary_large_image");

const sitemap = buildSitemapEntries({
  origin: "https://currykitchen.ca",
  targets: [
    { path: "/", indexed: true, includeInSitemap: true },
    { path: "/faq", indexed: false, includeInSitemap: true },
    { path: "/contact", indexed: true, includeInSitemap: false },
    { path: "/packages/family", indexed: true, includeInSitemap: true, lastModified: "2026-08-04T12:00:00.000Z" },
    { path: "/packages/family", indexed: true, includeInSitemap: true },
    { path: "/checkout", indexed: true, includeInSitemap: true },
  ],
});

assert.deepEqual(sitemap, [
  { url: "https://currykitchen.ca" },
  { url: "https://currykitchen.ca/packages/family", lastModified: new Date("2026-08-04T12:00:00.000Z") },
]);

const planSchemas = buildPackageSchemas({
  origin: "https://currykitchen.ca",
  businessName: "Curry Kitchen",
  currency: "USD",
  plan: {
    name: "Family Tiffin",
    slug: "family-tiffin",
    description: "A generous weekday dinner plan.",
    image: "https://cdn.example.com/family.jpg",
    price: 350,
  },
});

assert.ok(planSchemas.some((schema) => schema["@type"] === "Product"));
assert.ok(planSchemas.some((schema) => schema["@type"] === "BreadcrumbList"));
assert.equal(JSON.stringify(planSchemas).includes("aggregateRating"), false);
assert.equal(JSON.stringify(planSchemas).includes("review"), false);

const homeSchemas = buildHomeSchemas({
  origin: "https://currykitchen.ca",
  businessName: "Curry Kitchen",
  description: "Delivery-only homestyle Indian meal plans.",
  serviceAreas: ["San Diego", "Chula Vista"],
  cuisine: "Indian",
  priceRange: "$$",
  logoUrl: "https://cdn.example.com/logo.png",
  socialProfiles: ["https://instagram.com/currykitchen"],
});
assert.ok(homeSchemas.some((schema) => schema["@type"] === "FoodService"));
assert.equal(JSON.stringify(homeSchemas).includes("PostalAddress"), false);

const faq = buildFaqSchema([{ question: "How does delivery work?", answer: "We deliver weekday dinners." }]);
assert.equal(faq.mainEntity[0].name, "How does delivery work?");

const serialized = serializeJsonLd({ value: "</script><script>alert(1)</script>" });
assert.equal(serialized.includes("<"), false);
assert.match(serialized, /\\u003c\/script>/);

console.log("✓ SEO control center invariants, metadata, sitemap, and truthful schemas");
