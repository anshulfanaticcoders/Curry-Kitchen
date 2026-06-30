import "server-only";

import type {
  AdminAddonRecord,
  AdminPackageRecord,
  Category,
  Coupon,
  DeliveryZoneRecord,
  MenuItem,
} from "@/lib/types";
import { db } from "@/lib/db";
import { shouldUseMockData } from "@/lib/server/data-source";

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

function formatDate(value?: Date | null) {
  if (!value) return "No expiry";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

const fallbackDeliveryZones: DeliveryZoneRecord[] = [
  {
    id: "fallback-fremont-free",
    name: "Fremont Free Zone",
    cities: ["Fremont"],
    postalCodes: ["94536", "94538", "94539"],
    fee: 0,
    isFreeDelivery: true,
    outsideZone: false,
    status: "Active",
  },
  {
    id: "fallback-san-jose",
    name: "San Jose Zone",
    cities: ["San Jose"],
    postalCodes: ["95112", "95123", "95129"],
    fee: 6,
    isFreeDelivery: false,
    outsideZone: false,
    status: "Active",
  },
  {
    id: "fallback-milpitas",
    name: "Milpitas Zone",
    cities: ["Milpitas"],
    postalCodes: ["95035"],
    fee: 4,
    isFreeDelivery: false,
    outsideZone: false,
    status: "Active",
  },
  {
    id: "fallback-outside-zone",
    name: "Outside Service Zone",
    cities: [],
    postalCodes: [],
    fee: 12,
    isFreeDelivery: false,
    outsideZone: true,
    status: "Active",
  },
];

export async function getAdminPackageManagerData() {
  const [categories, addons, packages] = await Promise.all([
    db.packageCategory.findMany({
      where: { status: { not: "ARCHIVED" } },
      include: { _count: { select: { packages: true } } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    db.addon.findMany({
      where: { status: { not: "ARCHIVED" } },
      orderBy: { name: "asc" },
    }),
    db.package.findMany({
      where: { status: { not: "ARCHIVED" } },
      include: {
        category: true,
        items: { orderBy: { sortOrder: "asc" } },
        addons: { include: { addon: true } },
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
    addons: addons.map<AdminAddonRecord>((addon) => ({
      id: addon.id,
      name: addon.name,
      description: addon.description ?? "",
      price: toNumber(addon.price),
      imageUrl: addon.imageUrl ?? undefined,
      status: mapStatus(addon.status),
    })),
    packages: packages.map<AdminPackageRecord>((plan) => ({
      id: plan.id,
      categoryId: plan.categoryId,
      name: plan.name,
      category:
        plan.category.name === "Weekly" || plan.category.name === "Student"
          ? plan.category.name
          : "Monthly",
      badge: plan.badge ?? titleCase(plan.cadence),
      price: toNumber(plan.price),
      taxRate: toNumber(plan.taxRate),
      cadence: titleCase(plan.cadence),
      deliveryDayCount: plan.deliveryDayCount,
      servings: plan.servings,
      image: plan.imageUrl,
      description: plan.description,
      bestFor: plan.bestFor ?? "",
      includes: plan.items.map((item) =>
        item.quantity ? `${item.quantity} ${item.name}` : item.name,
      ),
      addOns: plan.addons.map(({ addon }) => ({
        id: addon.id,
        name: addon.name,
        description: addon.description ?? "",
        price: toNumber(addon.price),
      })),
      addonIds: plan.addons.map(({ addonId }) => addonId),
      accent:
        plan.accent === "leaf" || plan.accent === "masala" ? plan.accent : "saffron",
      status: mapStatus(plan.status),
      studentOnly: plan.studentOnly,
    })),
  };
}

export async function getDeliveryZoneManagerData(): Promise<DeliveryZoneRecord[]> {
  if (shouldUseMockData()) {
    return fallbackDeliveryZones;
  }

  try {
    const zones = await db.deliveryZone.findMany({
      where: { status: { not: "ARCHIVED" } },
      orderBy: [{ outsideZone: "asc" }, { createdAt: "asc" }],
    });

    if (!zones.length) {
      return fallbackDeliveryZones;
    }

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
    return fallbackDeliveryZones;
  }
}

export async function getAdminCategoryManagerData() {
  const [categories, packages] = await Promise.all([
    db.packageCategory.findMany({
      where: { status: { not: "ARCHIVED" } },
      include: { _count: { select: { packages: true } } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    db.package.findMany({
      where: { status: { not: "ARCHIVED" } },
      include: { category: true },
      orderBy: { name: "asc" },
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
    taxRows: packages.map((plan) => ({
      id: plan.id,
      name: plan.name,
      category: plan.category.name,
      taxRate: toNumber(plan.taxRate),
      status: mapStatus(plan.status),
    })),
  };
}

export async function getAdminMenuManagerData() {
  const [items, weeklyMenu] = await Promise.all([
    db.menuItem.findMany({
      where: { status: { not: "ARCHIVED" } },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    }),
    db.weeklyMenu.findFirst({
      where: { status: "ACTIVE" },
      include: { days: { orderBy: { dayOfWeek: "asc" } } },
      orderBy: { weekStart: "desc" },
    }),
  ]);

  return {
    items: items.map<MenuItem>((item) => ({
      id: item.id,
      name: item.name,
      type: item.type as MenuItem["type"],
      spice: item.spice as MenuItem["spice"],
      veg: item.vegetarian,
      status: item.status === "ACTIVE" ? "Active" : "Draft",
      description: item.description ?? "",
    })),
    weeklyMenu:
      weeklyMenu?.days.map((day) => ({
        day: new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(day.date),
        date: new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(day.date),
        daal: day.daal,
        sabzi: day.sabzi,
        rice: day.rice,
        dessert: day.dessert ?? undefined,
      })) ?? [],
  };
}

export async function getAdminCouponManagerData(): Promise<Coupon[]> {
  const coupons = await db.coupon.findMany({
    where: { status: { not: "ARCHIVED" } },
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
  }));
}

export { mapRecordStatus };
