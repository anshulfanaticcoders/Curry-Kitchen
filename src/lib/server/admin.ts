import "server-only";

import type {
  AdminCustomPackageItemRecord,
  AdminCustomerOption,
  AdminMediaAsset,
  AdminMenuUpload,
  AdminPackageRecord,
  AdminSettings,
  AdminSeoManagerData,
  AdminSeoRecord,
  Category,
  Coupon,
  DeliveryZoneRecord,
} from "@/lib/types";
import { db } from "@/lib/db";
import { DEFAULT_MEDIA_FOLDERS } from "@/lib/media";
import { STATIC_SEO_ROUTES } from "@/lib/seo-core.mjs";
import { DEFAULT_SEO_SETTINGS, getSeoSettings, getSiteOrigin } from "@/lib/server/seo";

type DecimalLike = { toNumber: () => number } | number | string | null | undefined;

function toNumber(value: DecimalLike) {
  if (typeof value === "object" && value && "toNumber" in value) {
    return value.toNumber();
  }

  return Number(value ?? 0);
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function mapStatus(status: string) {
  if (status === "ACTIVE") return "Active" as const;
  if (status === "ARCHIVED") return "Archived" as const;
  return "Draft" as const;
}

function mapRecordStatus(status: string) {
  if (status === "Active") return "ACTIVE" as const;
  if (status === "Archived") return "ARCHIVED" as const;
  return "DRAFT" as const;
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.map(String) : [];
}

function toDateInputValue(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function formatMenuDateRange(start: Date, end: Date) {
  const format = (date: Date) =>
    new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
  return `${format(start)} – ${format(end)}`;
}

const defaultAdminSettings: AdminSettings = {
  maintenanceMode: false,
  businessName: "Curry Kitchen Inc.",
  supportEmail: "currykitcheninc@gmail.com",
  phone: "(858) 599-1613",
  currency: "USD",
  taxRate: 0.0875,
  serviceAreas: "San Diego, Chula Vista, La Jolla",
  deliveryWindowStart: "08:00",
  deliveryWindowEnd: "11:00",
  orderCutoff: "Noon",
  deliveryDays: "Monday - Friday",
  customMonthlyDays: 21,
  acceptWeeklyTrials: true,
  enableCheckoutPauses: true,
  orderConfirmationEmails: true,
  packageReminderEmails: true,
  packageReminderSms: false,
  packageCompletedEmails: true,
  outForDeliverySms: false,
  weeklyMenuEmails: true,
};

function adminSettingsFromValue(value: unknown): AdminSettings {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return defaultAdminSettings;
  }

  const candidate = value as Record<string, unknown>;
  return {
    ...defaultAdminSettings,
    ...Object.fromEntries(
      Object.entries(defaultAdminSettings).flatMap(([key, fallback]) => {
        const value = candidate[key];
        return typeof value === typeof fallback ? [[key, value]] : [];
      }),
    ),
  } as AdminSettings;
}

export async function getAdminSettings(): Promise<AdminSettings> {
  try {
    const records = await db.setting.findMany({ where: { key: "admin_settings" } });
    return adminSettingsFromValue(records[0]?.value);
  } catch {
    return defaultAdminSettings;
  }
}

export async function getAdminSeoManagerData(): Promise<AdminSeoManagerData> {
  try {
    const [records, packages, settings] = await Promise.all([
      db.seoRecord.findMany({ where: { status: "ACTIVE" } }),
      db.package.findMany({
        where: { status: "ACTIVE" },
        select: { id: true, name: true, slug: true, description: true },
        orderBy: { name: "asc" },
      }),
      getSeoSettings(),
    ]);
    const byPath = new Map(records.filter((record) => record.targetType === "STATIC_PAGE").map((record) => [record.path, record]));
    const byPackage = new Map(records.filter((record) => record.packageId).map((record) => [record.packageId!, record]));
    const targets = [
      ...STATIC_SEO_ROUTES.map((route) => ({
        targetType: "STATIC_PAGE" as const,
        page: route.page,
        path: route.path,
        defaultTitle: route.title,
        defaultDescription: route.description,
        packageId: undefined,
        record: byPath.get(route.path),
      })),
      ...packages.map((plan) => ({
        targetType: "PACKAGE" as const,
        packageId: plan.id,
        page: plan.name,
        path: `/packages/${plan.slug}`,
        defaultTitle: plan.name,
        defaultDescription: plan.description,
        record: byPackage.get(plan.id),
      })),
      // Custom pages the admin added beyond the built-in route registry.
      ...records
        .filter(
          (record) =>
            record.targetType === "STATIC_PAGE" &&
            !STATIC_SEO_ROUTES.some((route) => route.path === record.path),
        )
        .map((record) => ({
          targetType: "STATIC_PAGE" as const,
          packageId: undefined,
          page: record.page,
          path: record.path,
          defaultTitle: record.page,
          defaultDescription: record.description ?? "",
          record,
        })),
    ];
    const mapped: AdminSeoRecord[] = targets.map((target) => ({
      id: target.record?.id,
      targetType: target.targetType,
      packageId: target.packageId,
      page: target.page,
      path: target.path,
      title: target.record?.title ?? "",
      description: target.record?.description ?? "",
      defaultTitle: target.defaultTitle,
      defaultDescription: target.defaultDescription,
      ogTitle: target.record?.ogTitle ?? "",
      ogDescription: target.record?.ogDescription ?? "",
      ogImageUrl: target.record?.ogImageUrl ?? "",
      ogImageAlt: target.record?.ogImageAlt ?? "",
      indexed: target.record?.indexed ?? true,
      includeInSitemap: target.record?.includeInSitemap ?? true,
      schemaEnabled: target.record?.schemaEnabled ?? true,
      configured: Boolean(target.record),
      status: target.record ? mapStatus(target.record.status) : "Active",
      updatedAt: target.record?.updatedAt.toISOString(),
    }));
    return { origin: getSiteOrigin(), settings, records: mapped };
  } catch {
    return {
      origin: getSiteOrigin(),
      settings: DEFAULT_SEO_SETTINGS,
      records: STATIC_SEO_ROUTES.map((route) => ({
        targetType: "STATIC_PAGE",
        page: route.page,
        path: route.path,
        title: "",
        description: "",
        defaultTitle: route.title,
        defaultDescription: route.description,
        ogTitle: "",
        ogDescription: "",
        ogImageUrl: "",
        ogImageAlt: "",
        indexed: true,
        includeInSitemap: true,
        schemaEnabled: true,
        configured: false,
        status: "Active",
      })),
    };
  }
}

export async function getAdminSeoRecords(): Promise<AdminSeoRecord[]> {
  return (await getAdminSeoManagerData()).records;
}

function formatDate(value?: Date | null) {
  if (!value) return "No expiry";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

export async function getAdminPackageManagerData() {
  const [categories, customPackageItems, packages] = await Promise.all([
    db.packageCategory.findMany({
      where: { status: { not: "ARCHIVED" } },
      include: {
        _count: { select: { packages: { where: { status: { not: "ARCHIVED" } } } } },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    db.customPackageItem.findMany({
      where: { status: { not: "ARCHIVED" } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    db.package.findMany({
      where: { status: { not: "ARCHIVED" }, isCustom: false },
      include: {
        category: true,
        items: { orderBy: { sortOrder: "asc" } },
      },
      orderBy: [{ cadence: "asc" }, { price: "asc" }],
    }),
  ]);

  return {
    categories: categories.map<Category>((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      count: category._count.packages,
      description: category.description ?? "",
      status: mapStatus(category.status),
    })),
    customPackageItems: customPackageItems.map<AdminCustomPackageItemRecord>((item) => ({
      id: item.id,
      name: item.name,
      unitLabel: item.unitLabel,
      pricePerUnit: toNumber(item.pricePerUnit),
      required: item.required,
      sortOrder: item.sortOrder,
      status: mapStatus(item.status),
    })),
    packages: packages.map<AdminPackageRecord>((plan) => ({
      id: plan.id,
      slug: plan.slug,
      categoryId: plan.categoryId,
      name: plan.name,
      category:
        plan.category.name === "Weekly" || plan.category.name === "Student"
          ? plan.category.name
          : "Monthly",
      badge: plan.badge ?? titleCase(plan.cadence),
      price: toNumber(plan.price),
      cadence: titleCase(plan.cadence),
      deliveryDayCount: plan.deliveryDayCount,
      servings: plan.servings,
      image: plan.imageUrl,
      description: plan.description,
      bestFor: plan.bestFor ?? "",
      includes: plan.items.map((item) =>
        item.quantity ? `${item.quantity} ${item.name}` : item.name,
      ),
      accent:
        plan.accent === "leaf" || plan.accent === "masala" ? plan.accent : "saffron",
      status: mapStatus(plan.status),
      studentOnly: plan.studentOnly,
    })),
  };
}

export async function getDeliveryZoneManagerData(): Promise<DeliveryZoneRecord[]> {
  try {
    const zones = await db.deliveryZone.findMany({
      where: { status: { not: "ARCHIVED" } },
      orderBy: [{ outsideZone: "asc" }, { createdAt: "asc" }],
    });

    return zones.map((zone) => ({
      id: zone.id,
      name: zone.name,
      cities: asStringArray(zone.cities),
      postalCodes: asStringArray(zone.postalCodes),
      fee: toNumber(zone.fee),
      isFreeDelivery: zone.isFreeDelivery,
      outsideZone: zone.outsideZone,
      status: mapStatus(zone.status),
    }));
  } catch {
    return [];
  }
}

export async function getAdminCategoryManagerData() {
  const categories = await db.packageCategory.findMany({
    where: { status: { not: "ARCHIVED" } },
    include: { _count: { select: { packages: true } } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return {
    categories: categories.map<Category>((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      count: category._count.packages,
      description: category.description ?? "",
      status: mapStatus(category.status),
    })),
  };
}

export async function getAdminMenuManagerData() {
  const uploads = await db.menuUpload.findMany({ orderBy: { startDate: "asc" } });
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return {
    uploads: uploads.map<AdminMenuUpload>((upload) => ({
      id: upload.id,
      title: upload.title,
      fileUrl: upload.fileUrl,
      isPdf: upload.fileUrl.toLowerCase().endsWith(".pdf"),
      startDate: toDateInputValue(upload.startDate),
      endDate: toDateInputValue(upload.endDate),
      dateRangeLabel: formatMenuDateRange(upload.startDate, upload.endDate),
      expired: upload.endDate < today,
    })),
  };
}

export async function getAdminMediaLibrary(): Promise<{
  assets: AdminMediaAsset[];
  folders: string[];
}> {
  const [assets, folderSetting] = await Promise.all([
    db.mediaAsset.findMany({ orderBy: { createdAt: "desc" } }),
    db.setting.findUnique({ where: { key: "media_folders" } }),
  ]);

  const storedFolders = Array.isArray(folderSetting?.value)
    ? folderSetting.value.map(String)
    : DEFAULT_MEDIA_FOLDERS;
  const folders = Array.from(
    new Set(["general", ...storedFolders, ...assets.map((asset) => asset.folder)]),
  ).sort();

  return {
    folders,
    assets: assets.map((asset) => ({
      id: asset.id,
      fileName: asset.fileName,
      fileUrl: asset.fileUrl,
      folder: asset.folder,
      sizeLabel: `${Math.max(1, Math.round(asset.size / 1024))} KB`,
      uploadedAt: new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(asset.createdAt),
    })),
  };
}

export async function getAdminCouponManagerData(): Promise<Coupon[]> {
  const coupons = await db.coupon.findMany({
    where: { status: { not: "ARCHIVED" } },
    include: { customer: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });

  return coupons.map((coupon) => ({
    id: coupon.id,
    code: coupon.code,
    type: coupon.type === "PERCENT" ? "Percent" : "Flat",
    value: toNumber(coupon.value),
    status:
      coupon.status === "ACTIVE"
        ? "Active"
        : coupon.expiresAt && coupon.expiresAt < new Date()
          ? "Expired"
          : "Scheduled",
    usage: coupon.usageCount,
    limit: coupon.usageLimit ?? 0,
    expires: formatDate(coupon.expiresAt),
    expiresAt: coupon.expiresAt?.toISOString().slice(0, 10),
    customerId: coupon.customerId,
    customerName: coupon.customer?.name ?? null,
  }));
}

export async function getAdminCustomerOptions(): Promise<AdminCustomerOption[]> {
  const customers = await db.customer.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
    take: 500,
  });

  return customers.map((customer) => ({
    id: customer.id,
    name: customer.name,
    email: customer.email,
  }));
}

export { mapRecordStatus };
