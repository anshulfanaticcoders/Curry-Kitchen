const DEFAULT_DESCRIPTION =
  "Homestyle Indian tiffin meal plans and weekday dinner delivery in San Diego.";

export const STATIC_SEO_ROUTES = Object.freeze([
  { path: "/", page: "Home", title: "San Diego tiffin delivery", description: DEFAULT_DESCRIPTION, schemaKind: "home" },
  { path: "/packages", page: "Packages", title: "Tiffin meal plans", description: "Compare flexible weekly, monthly, student, and military tiffin plans for San Diego delivery.", schemaKind: "packages" },
  { path: "/packages/build", page: "Build your own", title: "Build your own tiffin", description: "Price your own Indian tiffin per portion. Choose exactly how much roti, rice, dal, sabzi, raita, and salad you want in every delivery.", schemaKind: "packages" },
  { path: "/menu", page: "Menu", title: "Weekly Indian tiffin menu", description: "See this week's rotating homestyle Indian dinner menu, including daal, sabzi, rice, roti, sides, and dessert.", schemaKind: "menu" },
  { path: "/about", page: "About", title: "About Curry Kitchen", description: "Learn how Curry Kitchen prepares dependable homestyle Indian meals for delivery across San Diego.", schemaKind: "about" },
  { path: "/faq", page: "FAQ", title: "Tiffin delivery questions", description: "Get answers about Curry Kitchen meal plans, delivery, menu rotation, pauses, and student or military pricing.", schemaKind: "faq" },
  { path: "/blog", page: "Blog", title: "Curry Kitchen journal", description: "Practical notes about Indian home cooking, weekly meal planning, tiffin delivery, and the Curry Kitchen menu.", schemaKind: "blog" },
  { path: "/contact", page: "Contact", title: "Contact Curry Kitchen", description: "Contact Curry Kitchen about meal plans, delivery areas, orders, and homestyle Indian tiffin service.", schemaKind: "contact" },
]);

const BLOCKED_SITEMAP_PATHS = [
  "/admin",
  "/api",
  "/checkout",
  "/dashboard",
  "/login",
  "/register",
];

function cleanPath(path) {
  if (!path || path === "/") return "/";
  const withSlash = path.startsWith("/") ? path : `/${path}`;
  return withSlash.replace(/\/+$/, "");
}

// The public origin comes from NEXT_PUBLIC_APP_URL (set at build time in
// production). The hardcoded domain is only a last-resort fallback.
const FALLBACK_ORIGIN = "https://currykitchen.ca";

export function siteOrigin(value = "") {
  try {
    const url = new URL(value || process.env.NEXT_PUBLIC_APP_URL || FALLBACK_ORIGIN);
    if (["localhost", "127.0.0.1", "::1"].includes(url.hostname)) {
      return process.env.NODE_ENV === "production" ? FALLBACK_ORIGIN : url.origin;
    }
    return url.origin;
  } catch {
    return FALLBACK_ORIGIN;
  }
}

export function canonicalUrl(origin, path) {
  const base = siteOrigin(origin);
  const normalized = cleanPath(path);
  return normalized === "/" ? base : `${base}${normalized}`;
}

export function validateHttpsImageUrl(value) {
  if (!value) return true;
  if (value.startsWith("/")) return value.startsWith("/") && !value.startsWith("//");

  return validateHttpsUrl(value);
}

export function validateHttpsUrl(value) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export function normalizeSeoInput(input) {
  const indexed = input.indexed !== false;
  return {
    ...input,
    indexed,
    includeInSitemap: indexed && input.includeInSitemap !== false,
  };
}

function withTitleSuffix(title, suffix) {
  const cleanTitle = title.trim();
  const cleanSuffix = suffix?.trimEnd() ?? "";
  if (!cleanSuffix || cleanTitle.endsWith(cleanSuffix)) return cleanTitle;
  return `${cleanTitle}${cleanSuffix}`;
}

function absoluteImage(origin, image) {
  if (!image) return null;
  return image.startsWith("/") ? canonicalUrl(origin, image) : image;
}

export function resolveSeoMetadata({ origin, route, record = {}, settings = {} }) {
  const title = withTitleSuffix(record.title || route.title, settings.titleSuffix || " | Curry Kitchen");
  const description = record.description || settings.defaultDescription || route.description || DEFAULT_DESCRIPTION;
  const canonical = canonicalUrl(origin, route.path);
  const indexed = record.indexed !== false;
  const socialTitle = record.ogTitle || title;
  const socialDescription = record.ogDescription || description;
  const socialImage = absoluteImage(origin, record.ogImageUrl || settings.defaultSocialImage);
  const images = socialImage
    ? [{ url: socialImage, alt: record.ogImageAlt || `${route.page} – Curry Kitchen` }]
    : [];

  return {
    title,
    description,
    alternates: { canonical },
    robots: { index: indexed, follow: indexed },
    openGraph: {
      type: "website",
      url: canonical,
      siteName: settings.businessName || "Curry Kitchen",
      title: socialTitle,
      description: socialDescription,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description: socialDescription,
      images: images.map((image) => image.url),
    },
  };
}

function isBlockedSitemapPath(path) {
  return BLOCKED_SITEMAP_PATHS.some((blocked) => path === blocked || path.startsWith(`${blocked}/`));
}

export function buildSitemapEntries({ origin, targets }) {
  const seen = new Set();
  const entries = [];

  for (const target of targets) {
    const path = cleanPath(target.path);
    if (target.indexed === false || target.includeInSitemap === false || isBlockedSitemapPath(path) || seen.has(path)) {
      continue;
    }

    seen.add(path);
    const entry = { url: canonicalUrl(origin, path) };
    if (target.lastModified) entry.lastModified = new Date(target.lastModified);
    entries.push(entry);
  }

  return entries;
}

function context(type, properties) {
  return { "@context": "https://schema.org", "@type": type, ...properties };
}

export function buildHomeSchemas({ origin, businessName, description, serviceAreas = /** @type {string[]} */ ([]), cuisine, priceRange, logoUrl, socialProfiles = /** @type {string[]} */ ([]) }) {
  const base = siteOrigin(origin);
  const organizationId = `${base}/#organization`;
  const organization = context("Organization", {
    "@id": organizationId,
    name: businessName,
    url: base,
    ...(logoUrl ? { logo: absoluteImage(base, logoUrl) } : {}),
    ...(socialProfiles.length ? { sameAs: socialProfiles } : {}),
  });
  const website = context("WebSite", { "@id": `${base}/#website`, url: base, name: businessName, publisher: { "@id": organizationId } });
  const foodService = context("FoodService", {
    "@id": `${base}/#foodservice`,
    name: businessName,
    url: base,
    description,
    provider: { "@id": organizationId },
    areaServed: serviceAreas.map((name) => ({ "@type": "City", name })),
    ...(cuisine ? { servesCuisine: cuisine } : {}),
    ...(priceRange ? { priceRange } : {}),
  });
  const webPage = context("WebPage", { "@id": `${base}/#webpage`, url: base, name: businessName, description, isPartOf: { "@id": `${base}/#website` } });
  return [organization, website, foodService, webPage];
}

export function buildPackageSchemas({ origin, businessName, currency, plan }) {
  const url = canonicalUrl(origin, `/packages/${plan.slug}`);
  const product = context("Product", {
    "@id": `${url}#product`,
    name: plan.name,
    description: plan.description,
    image: [absoluteImage(origin, plan.image)],
    brand: { "@type": "Brand", name: businessName },
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: currency,
      price: String(plan.price),
      availability: "https://schema.org/InStock",
    },
  });
  const webPage = context("WebPage", { "@id": `${url}#webpage`, url, name: plan.name, description: plan.description, mainEntity: { "@id": `${url}#product` } });
  const breadcrumbs = context("BreadcrumbList", {
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: canonicalUrl(origin, "/") },
      { "@type": "ListItem", position: 2, name: "Packages", item: canonicalUrl(origin, "/packages") },
      { "@type": "ListItem", position: 3, name: plan.name, item: url },
    ],
  });
  return [product, webPage, breadcrumbs];
}

export function buildFaqSchema(items) {
  return context("FAQPage", {
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  });
}

export function serializeJsonLd(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
