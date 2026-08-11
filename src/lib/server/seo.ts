import "server-only";

import type { Metadata, MetadataRoute } from "next";
import type { PackagePlan, SeoSettings, WeeklyMenuDay } from "@/lib/types";
import { db } from "@/lib/db";
import { packagePlans as mockPackagePlans } from "@/lib/mock-data";
import { hasDatabaseUrl } from "@/lib/server/data-source";
import {
  STATIC_SEO_ROUTES,
  buildFaqSchema,
  buildHomeSchemas,
  buildPackageSchemas,
  buildSitemapEntries,
  canonicalUrl,
  resolveSeoMetadata,
  siteOrigin,
} from "@/lib/seo-core.mjs";

export const DEFAULT_SEO_SETTINGS: SeoSettings = {
  titleSuffix: " | Curry Kitchen",
  defaultDescription: "Homestyle Indian tiffin meal plans and weekday dinner delivery in San Diego.",
  defaultSocialImage: "",
  logoUrl: "",
  cuisine: "Indian",
  priceRange: "$$",
  socialProfiles: [],
  googleVerification: "",
};

type SeoRecordValue = {
  title: string | null;
  description: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImageUrl: string | null;
  ogImageAlt: string | null;
  indexed: boolean;
  includeInSitemap: boolean;
  schemaEnabled: boolean;
  updatedAt: Date;
};

type BusinessSeoContext = {
  businessName: string;
  currency: string;
  serviceAreas: string[];
};

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

export function getSiteOrigin() {
  return siteOrigin(process.env.NEXT_PUBLIC_APP_URL);
}

export async function getSeoSettings(): Promise<SeoSettings> {
  if (!hasDatabaseUrl()) return DEFAULT_SEO_SETTINGS;

  try {
    const setting = await db.setting.findUnique({ where: { key: "seo_settings" } });
    const value = objectValue(setting?.value);
    return {
      titleSuffix: stringValue(value.titleSuffix, DEFAULT_SEO_SETTINGS.titleSuffix),
      defaultDescription: stringValue(value.defaultDescription, DEFAULT_SEO_SETTINGS.defaultDescription),
      defaultSocialImage: stringValue(value.defaultSocialImage, ""),
      logoUrl: stringValue(value.logoUrl, ""),
      cuisine: stringValue(value.cuisine, DEFAULT_SEO_SETTINGS.cuisine),
      priceRange: stringValue(value.priceRange, DEFAULT_SEO_SETTINGS.priceRange),
      socialProfiles: Array.isArray(value.socialProfiles) ? value.socialProfiles.map(String).filter(Boolean) : [],
      googleVerification: stringValue(value.googleVerification, ""),
    };
  } catch {
    return DEFAULT_SEO_SETTINGS;
  }
}

export async function getBusinessSeoContext(): Promise<BusinessSeoContext> {
  if (!hasDatabaseUrl()) {
    return { businessName: "Curry Kitchen", currency: "USD", serviceAreas: ["San Diego", "Chula Vista", "La Jolla"] };
  }

  try {
    const setting = await db.setting.findUnique({ where: { key: "admin_settings" } });
    const value = objectValue(setting?.value);
    return {
      businessName: stringValue(value.businessName, "Curry Kitchen"),
      currency: stringValue(value.currency, "USD"),
      serviceAreas: stringValue(value.serviceAreas, "San Diego, Chula Vista, La Jolla").split(",").map((area) => area.trim()).filter(Boolean),
    };
  } catch {
    return { businessName: "Curry Kitchen", currency: "USD", serviceAreas: ["San Diego"] };
  }
}

async function findSeoRecord(path: string, packageId?: string): Promise<SeoRecordValue | null> {
  if (!hasDatabaseUrl()) return null;

  try {
    return await db.seoRecord.findFirst({
      where: packageId
        ? { packageId, status: "ACTIVE" }
        : { path, targetType: "STATIC_PAGE", status: "ACTIVE" },
      select: {
        title: true,
        description: true,
        ogTitle: true,
        ogDescription: true,
        ogImageUrl: true,
        ogImageAlt: true,
        indexed: true,
        includeInSitemap: true,
        schemaEnabled: true,
        updatedAt: true,
      },
    });
  } catch {
    return null;
  }
}

export async function getMarketingMetadata(
  path: string,
  packagePlan?: PackagePlan,
): Promise<Metadata> {
  const staticRoute = STATIC_SEO_ROUTES.find((route) => route.path === path);
  const route = staticRoute ?? {
    path,
    page: packagePlan?.name ?? "Curry Kitchen",
    title: packagePlan?.name ?? "Curry Kitchen",
    description: packagePlan?.description ?? DEFAULT_SEO_SETTINGS.defaultDescription,
    schemaKind: "package",
  };
  const [settings, business, record] = await Promise.all([
    getSeoSettings(),
    getBusinessSeoContext(),
    findSeoRecord(path, packagePlan?.id),
  ]);

  return resolveSeoMetadata({
    origin: getSiteOrigin(),
    route,
    record: record ?? undefined,
    settings: { ...settings, businessName: business.businessName },
  }) as Metadata;
}

export async function schemasEnabled(path: string, packageId?: string) {
  const record = await findSeoRecord(path, packageId);
  return record?.schemaEnabled !== false;
}

function pageSchema(type: string, path: string, name: string, description: string) {
  return {
    "@context": "https://schema.org",
    "@type": type,
    url: canonicalUrl(getSiteOrigin(), path),
    name,
    description,
  };
}

export async function getHomeSchemas() {
  if (!(await schemasEnabled("/"))) return [];
  const [settings, business] = await Promise.all([getSeoSettings(), getBusinessSeoContext()]);
  return buildHomeSchemas({
    origin: getSiteOrigin(),
    businessName: business.businessName,
    description: settings.defaultDescription,
    serviceAreas: business.serviceAreas,
    cuisine: settings.cuisine,
    priceRange: settings.priceRange,
    logoUrl: settings.logoUrl,
    socialProfiles: settings.socialProfiles,
  });
}

export async function getPackagesSchemas(plans: PackagePlan[]) {
  if (!(await schemasEnabled("/packages"))) return [];
  const route = STATIC_SEO_ROUTES.find((item) => item.path === "/packages")!;
  return [
    pageSchema("CollectionPage", route.path, route.title, route.description),
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      itemListElement: plans.map((plan, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: plan.name,
        url: canonicalUrl(getSiteOrigin(), `/packages/${plan.slug}`),
      })),
    },
  ];
}

export async function getMenuSchemas(menu: WeeklyMenuDay[]) {
  if (!(await schemasEnabled("/menu"))) return [];
  const route = STATIC_SEO_ROUTES.find((item) => item.path === "/menu")!;
  return [
    pageSchema("CollectionPage", route.path, route.title, route.description),
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      itemListElement: menu.map((day, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: `${day.day}: ${day.headline}`,
      })),
    },
  ];
}

export async function getSimplePageSchemas(path: string, faqItems?: Array<{ question: string; answer: string }>) {
  if (!(await schemasEnabled(path))) return [];
  const route = STATIC_SEO_ROUTES.find((item) => item.path === path);
  if (!route) return [];
  if (path === "/faq" && faqItems) return [buildFaqSchema(faqItems)];
  const type = path === "/about" ? "AboutPage" : path === "/contact" ? "ContactPage" : path === "/blog" ? "Blog" : "WebPage";
  return [pageSchema(type, path, route.title, route.description)];
}

export async function getPackageSchemas(plan: PackagePlan) {
  if (!(await schemasEnabled(`/packages/${plan.slug}`, plan.id))) return [];
  const business = await getBusinessSeoContext();
  return buildPackageSchemas({ origin: getSiteOrigin(), businessName: business.businessName, currency: business.currency, plan });
}

const allowMockSeoContent = process.env.NODE_ENV !== "production";

export async function getSitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = getSiteOrigin();
  if (!hasDatabaseUrl()) {
    return buildSitemapEntries({
      origin,
      targets: [
        ...STATIC_SEO_ROUTES.map((route) => ({ path: route.path, indexed: true, includeInSitemap: true })),
        ...(allowMockSeoContent
          ? mockPackagePlans.map((plan) => ({ path: `/packages/${plan.slug}`, indexed: true, includeInSitemap: true }))
          : []),
      ],
    });
  }

  try {
    const [records, packages, menu] = await Promise.all([
      db.seoRecord.findMany({ where: { status: "ACTIVE" } }),
      db.package.findMany({ where: { status: "ACTIVE" }, select: { id: true, slug: true, updatedAt: true } }),
      db.weeklyMenu.findFirst({ where: { status: "ACTIVE" }, orderBy: { weekStart: "desc" }, select: { updatedAt: true } }),
    ]);
    const byPath = new Map(records.filter((record) => record.targetType === "STATIC_PAGE").map((record) => [record.path, record]));
    const byPackage = new Map(records.filter((record) => record.packageId).map((record) => [record.packageId!, record]));
    const staticTargets = STATIC_SEO_ROUTES.map((route) => {
      const record = byPath.get(route.path);
      const lastModified = route.path === "/menu" ? menu?.updatedAt : record?.updatedAt;
      return {
        path: route.path,
        indexed: record?.indexed ?? true,
        includeInSitemap: record?.includeInSitemap ?? true,
        lastModified,
      };
    });
    const packageTargets = packages.map((plan) => {
      const record = byPackage.get(plan.id);
      return {
        path: `/packages/${plan.slug}`,
        indexed: record?.indexed ?? true,
        includeInSitemap: record?.includeInSitemap ?? true,
        lastModified: record?.updatedAt ?? plan.updatedAt,
      };
    });
    return buildSitemapEntries({ origin, targets: [...staticTargets, ...packageTargets] });
  } catch (error) {
    console.error("getSitemap failed", error);
    return buildSitemapEntries({
      origin,
      targets: [
        ...STATIC_SEO_ROUTES.map((route) => ({ path: route.path })),
        ...(allowMockSeoContent
          ? mockPackagePlans.map((plan) => ({ path: `/packages/${plan.slug}` }))
          : []),
      ],
    });
  }
}
