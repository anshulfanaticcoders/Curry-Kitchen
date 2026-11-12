import {
  customPackageItems as mockCustomPackageItems,
  packagePlans as mockPackagePlans,
  testimonials as mockTestimonials,
  weeklyMenu as mockWeeklyMenu,
} from "@/lib/mock-data";
import type { CustomPackageItemOption } from "@/lib/custom-package";
import type {
  AdminOrder,
  AdminStudentVerification,
  Customer,
  CustomerPackageSummary,
  CustomerProfileDetails,
  Delivery,
  NotificationItem,
  Order,
  PackagePlan,
  PackagingRecord,
  ReviewItem,
  Transaction,
  MenuUploadView,
  WeeklyMenuDay,
} from "@/lib/types";
import { getCurrentSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { businessDateInput, dateToInput, inputToDate, isDeliveryDayElapsed } from "@/lib/package-schedule";
import { hasDatabaseUrl, shouldUseMockData } from "@/lib/server/data-source";
import { getPendingRenewalDeliveries } from "@/lib/server/pending-renewal-deliveries";
import { ADMIN_CUSTOMER_PAGE_SIZE, ADMIN_ORDER_PAGE_SIZE, type AdminListQuery } from "@/lib/admin-list-query";

type DecimalLike = { toNumber: () => number } | number | string | null | undefined;

// Mock content is a dev/demo convenience only. Production must never serve
// fabricated packages, menus, or testimonials — fail empty instead.
const allowMockContent = process.env.NODE_ENV !== "production" || shouldUseMockData();

export type Testimonial = {
  name: string;
  role: string;
  area: string;
  rating: number | string;
  quote: string;
};

function toNumber(value: DecimalLike) {
  if (typeof value === "object" && value && "toNumber" in value) {
    return value.toNumber();
  }

  return Number(value ?? 0);
}

async function getCurrentCustomer() {
  const session = await getCurrentSession().catch(() => null);

  if (!session?.user?.id) {
    return null;
  }

  return db.customer.findFirst({
    where: {
      OR: [
        { userId: session.user.id },
        ...(session.user.email ? [{ email: session.user.email }] : []),
      ],
    },
    select: { id: true, name: true, email: true },
  });
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(value);
}

function formatDay(value: Date) {
  return new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(value);
}

function mapOrderStatus(status: string): Order["status"] {
  if (status === "DECLINED" || status === "CANCELLED") return "Cancelled";
  if (status === "PENDING_PAYMENT") return "Pending payment";
  // PAID, ACCEPTED, and legacy fulfilment statuses all mean the order is on.
  return "Accepted";
}


function mapPaymentStatus(status: string): Transaction["status"] {
  if (status === "PAID") return "Paid";
  if (status === "REFUNDED" || status === "FAILED") return "Refunded";
  return "Pending";
}

function mapCustomerPackageStatus(status: string): CustomerPackageSummary["status"] {
  if (status === "ACTIVE") return "Active";
  if (status === "PAUSED") return "Paused";
  if (status === "PENDING_PAYMENT") return "Pending payment";
  if (status === "PENDING_STUDENT_VERIFICATION") return "Needs student approval";
  if (status === "CANCELLED") return "Cancelled";
  return "Expired";
}

function mapReviewStatus(status: string): ReviewItem["status"] {
  if (status === "ACTIVE") return "Published";
  if (status === "ARCHIVED") return "Spam";
  return "Pending";
}

function planFromRecord(plan: {
  id: string;
  slug: string;
  name: string;
  category: {
    name: string;
    deliveryDayCount: number;
    deliveryCharge: DecimalLike | null;
    requiresVerification: boolean;
  };
  isFeatured: boolean;
  badge: string | null;
  price: DecimalLike;
  servings: string;
  imageUrl: string;
  description: string;
  bestFor: string | null;
  accent: string;
  updatedAt: Date;
  items: Array<{ name: string; quantity: string | null }>;
}): PackagePlan {
  const accent =
    plan.accent === "leaf" || plan.accent === "masala" ? plan.accent : "saffron";

  return {
    id: plan.id,
    slug: plan.slug,
    name: plan.name,
    category: plan.category.name,
    deliveryDayCount: plan.category.deliveryDayCount,
    categoryDeliveryCharge:
      plan.category.deliveryCharge == null ? null : toNumber(plan.category.deliveryCharge),
    requiresVerification: plan.category.requiresVerification,
    isFeatured: plan.isFeatured,
    badge: plan.badge ?? plan.category.name,
    price: toNumber(plan.price),
    cadence: `${plan.category.deliveryDayCount} delivery day${plan.category.deliveryDayCount === 1 ? "" : "s"}`,
    servings: plan.servings,
    image: plan.imageUrl,
    description: plan.description,
    bestFor: plan.bestFor ?? "Everyday meals",
    includes: plan.items.map((item) => (item.quantity ? `${item.quantity} ${item.name}` : item.name)),
    accent,
    updatedAt: plan.updatedAt.toISOString(),
  };
}

export async function getCustomPackageItems(): Promise<CustomPackageItemOption[]> {
  if (!hasDatabaseUrl()) {
    return allowMockContent ? mockCustomPackageItems : [];
  }

  try {
    const items = await db.customPackageItem.findMany({
      where: { status: "ACTIVE", category: { status: "ACTIVE" } },
      include: { category: true },
      orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }, { name: "asc" }],
    });

    if (!items.length) {
      return allowMockContent ? mockCustomPackageItems : [];
    }

    return items.map((item) => ({
      id: item.id,
      categoryId: item.categoryId,
      categoryName: item.category.name,
      categoryDescription: item.category.description ?? "",
      categoryRequired: item.category.required,
      quantityControl: item.category.quantityControl,
      name: item.name,
      description: item.description ?? "",
      imageUrl: item.imageUrl ?? "",
      unitLabel: item.unitLabel,
      pricePerUnit: toNumber(item.pricePerUnit),
      minQuantity: item.minQuantity,
      sortOrder: item.sortOrder,
    }));
  } catch {
    return allowMockContent ? mockCustomPackageItems : [];
  }
}

export async function getPackagePlans(): Promise<PackagePlan[]> {
  if (!hasDatabaseUrl()) {
    return allowMockContent ? mockPackagePlans : [];
  }

  try {
    const plans = await db.package.findMany({
      where: { status: "ACTIVE" },
      include: {
        category: true,
        items: { orderBy: { sortOrder: "asc" } },
      },
      orderBy: [{ studentOnly: "asc" }, { price: "asc" }],
    });

    if (!plans.length) {
      return allowMockContent ? mockPackagePlans : [];
    }

    return plans.map(planFromRecord);
  } catch (error) {
    console.error("getPackagePlans failed", error);
    return allowMockContent ? mockPackagePlans : [];
  }
}

export async function getPackagePlanBySlug(slug: string): Promise<PackagePlan | null> {
  if (!hasDatabaseUrl()) {
    return allowMockContent
      ? (mockPackagePlans.find((plan) => plan.slug === slug) ?? null)
      : null;
  }

  try {
    const plan = await db.package.findFirst({
      where: { slug, status: "ACTIVE" },
      include: {
        category: true,
        items: { orderBy: { sortOrder: "asc" } },
      },
    });

    return plan ? planFromRecord(plan) : null;
  } catch (error) {
    console.error("getPackagePlanBySlug failed", error);
    return allowMockContent
      ? (mockPackagePlans.find((plan) => plan.slug === slug) ?? null)
      : null;
  }
}

export async function getWeeklyMenu(): Promise<WeeklyMenuDay[]> {
  if (!hasDatabaseUrl()) {
    return allowMockContent ? mockWeeklyMenu : [];
  }

  try {
    const menu = await db.weeklyMenu.findFirst({
      where: { status: "ACTIVE" },
      include: { days: { orderBy: { dayOfWeek: "asc" } } },
      orderBy: { weekStart: "desc" },
    });

    if (!menu?.days.length) {
      return allowMockContent ? mockWeeklyMenu : [];
    }

    return menu.days.map((day) => ({
      day: formatDay(day.date),
      date: formatDate(day.date),
      headline: day.headline,
      daal: day.daal,
      sabzi: day.sabzi,
      rice: day.rice,
      side: day.side,
      dessert: day.dessert ?? undefined,
      spice: day.spice as WeeklyMenuDay["spice"],
      image: day.imageUrl,
    }));
  } catch (error) {
    console.error("getWeeklyMenu failed", error);
    return allowMockContent ? mockWeeklyMenu : [];
  }
}

export async function getActiveMenuUploads(): Promise<MenuUploadView[]> {
  if (!hasDatabaseUrl()) {
    return [];
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Expired menus disappear automatically: only ranges ending today or later
    // qualify, and the frontend shows at most four at a time.
    const uploads = await db.menuUpload.findMany({
      where: { endDate: { gte: today } },
      orderBy: { startDate: "asc" },
      take: 4,
    });

    const rangeLabel = (start: Date, end: Date) => {
      const format = (date: Date) =>
        new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
      return `${format(start)} – ${format(end)}`;
    };

    return uploads.map((upload) => ({
      id: upload.id,
      title: upload.title,
      fileUrl: upload.fileUrl,
      isPdf: upload.fileUrl.toLowerCase().endsWith(".pdf"),
      dateRangeLabel: rangeLabel(upload.startDate, upload.endDate),
      current: upload.startDate <= new Date(),
    }));
  } catch {
    return [];
  }
}

export async function getTestimonials(): Promise<Testimonial[]> {
  if (!hasDatabaseUrl()) {
    return allowMockContent ? mockTestimonials : [];
  }

  try {
    const reviews = await db.review.findMany({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      take: 8,
    });

    return reviews.map((review) => ({
      name: review.name,
      role: review.planName ?? "Curry Kitchen customer",
      area: "San Diego",
      rating: review.rating,
      quote: review.text,
    }));
  } catch (error) {
    console.error("getTestimonials failed", error);
    return allowMockContent ? mockTestimonials : [];
  }
}

export async function getAdminReviews(): Promise<ReviewItem[]> {
  if (!hasDatabaseUrl()) {
    return [];
  }

  try {
    const reviews = await db.review.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return reviews.map((review) => ({
      id: review.id,
      name: review.name,
      plan: review.planName ?? "Unknown plan",
      rating: review.rating,
      text: review.text,
      status: mapReviewStatus(review.status),
      date: formatDate(review.createdAt),
    }));
  } catch {
    return [];
  }
}

export async function getAdminStudentVerifications(): Promise<AdminStudentVerification[]> {
  if (!hasDatabaseUrl()) {
    return [];
  }

  const session = await getCurrentSession();

  if (session?.user?.role !== "ADMIN") {
    return [];
  }

  try {
    const verifications = await db.studentVerification.findMany({
      include: { customer: true, order: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return verifications.map((verification) => ({
      id: verification.id,
      customerName: verification.customer?.name ?? "Unknown customer",
      customerEmail: verification.customer?.email ?? "",
      orderNumber: verification.order?.orderNumber ?? null,
      verificationType:
        verification.verificationType as AdminStudentVerification["verificationType"],
      universityName: verification.universityName,
      studentNumber: verification.studentNumber,
      idCardUrl: verification.idCardUrl,
      idCardBackUrl: verification.idCardBackUrl,
      status: verification.status as AdminStudentVerification["status"],
      adminNote: verification.adminNote,
      submittedAt: formatDate(verification.createdAt),
      reviewedAt: verification.reviewedAt ? formatDate(verification.reviewedAt) : null,
    }));
  } catch {
    return [];
  }
}

export async function getAdminOrders(filters?: AdminListQuery): Promise<AdminOrder[]> {
  if (!hasDatabaseUrl()) {
    return [];
  }

  if ((await getCurrentSession())?.user.role !== "ADMIN") return [];

  try {
    const q = filters?.q ?? "";
    const orders = await db.order.findMany({
      where: {
        ...(q ? { OR: [
          { orderNumber: { contains: q } }, { guestName: { contains: q } },
          { guestEmail: { contains: q } }, { guestPhone: { contains: q } },
          { customer: { name: { contains: q } } }, { customer: { email: { contains: q } } },
          { customer: { phone: { contains: q } } },
        ] } : {}),
        ...(filters?.status === "Cancelled" ? { status: { in: ["DECLINED", "CANCELLED"] as const } }
          : filters?.status === "Pending payment" ? { status: "PENDING_PAYMENT" as const }
          : filters?.status === "Accepted" ? { status: { notIn: ["DECLINED", "CANCELLED", "PENDING_PAYMENT"] as const } } : {}),
      },
      include: {
        customer: true,
        items: { include: { package: true } },
        payments: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: filters ? (filters.page - 1) * ADMIN_ORDER_PAGE_SIZE : 0,
      take: ADMIN_ORDER_PAGE_SIZE + (filters ? 1 : 0),
    });

    return orders.map((order) => ({
      id: order.orderNumber,
      customer: order.customer?.name ?? order.guestName ?? "Guest customer",
      customerId: order.customer?.id ?? null,
      plan: order.items.map((item) => item.package.name).join(", ") || "Custom tiffin",
      items: order.items.reduce((total, item) => total + item.quantity, 0),
      total: toNumber(order.total),
      payment: mapPaymentStatus(order.payments[0]?.status ?? "PENDING"),
      status: mapOrderStatus(order.status),
      date: formatDate(order.createdAt),
      allergies: order.allergies?.trim() ?? "",
    }));
  } catch {
    if (filters) throw new Error("Orders could not be loaded. Please try again.");
    return [];
  }
}

function adminCustomerStatus(packages: { status: string; order?: { studentVerifications?: { status: string }[] } }[]): Customer["status"] {
  if (packages.some((item) => item.status === "ACTIVE")) return "Active";
  if (packages.some((item) => item.status === "PAUSED")) return "Paused";
  if (packages.some((item) => item.status === "PENDING_STUDENT_VERIFICATION" && item.order?.studentVerifications?.[0]?.status === "APPROVED")) return "Needs schedule review";
  if (packages.some((item) => item.status === "PENDING_STUDENT_VERIFICATION")) return "Awaiting verification";
  if (packages.some((item) => item.status === "PENDING_PAYMENT")) return "Awaiting payment";
  if (packages.some((item) => item.status === "EXPIRED")) return "Ended";
  return packages.length ? "Cancelled" : "No active plan";
}

export async function getAdminCustomers(filters?: AdminListQuery): Promise<Customer[]> {
  if (!hasDatabaseUrl()) {
    return [];
  }

  if ((await getCurrentSession())?.user.role !== "ADMIN") return [];

  try {
    const q = filters?.q ?? "";
    const customers = await db.customer.findMany({
      where: q ? { OR: [{ name: { contains: q } }, { email: { contains: q } }, { phone: { contains: q } }] } : {},
      include: {
        addresses: { where: { isDefault: true }, take: 1 },
        orders: { include: { payments: true } },
        packages: { include: { package: true, order: { select: { studentVerifications: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true } } } } }, orderBy: { createdAt: "desc" } },
      },
      orderBy: [{ joinedAt: "desc" }, { id: "desc" }],
      skip: filters ? (filters.page - 1) * ADMIN_CUSTOMER_PAGE_SIZE : 0,
      take: ADMIN_CUSTOMER_PAGE_SIZE + (filters ? 1 : 0),
    });

    return customers.map((customer) => {
      const activePackage =
        customer.packages.find((candidate) => candidate.status === "ACTIVE" || candidate.status === "PAUSED") ??
        customer.packages[0];
      const spend = customer.orders.flatMap((order) => order.payments ?? [])
        .filter((payment) => payment.status === "PAID" && payment.currency === "USD")
        .reduce((total, payment) => total + toNumber(payment.amount), 0);
      const status = adminCustomerStatus(customer.packages);
      const activeCount = customer.packages.filter((item) => ["ACTIVE", "PAUSED"].includes(item.status)).length;

      return {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone ?? "Not provided",
        plan: activePackage ? `${activePackage.package.name}${activeCount > 1 ? ` + ${activeCount - 1} more` : ""}` : "No active plan",
        status,
        joined: formatDate(customer.joinedAt),
        orders: customer.orders.length,
        spend,
        area: customer.addresses[0]?.city ?? "San Diego",
        activePackageId:
          activePackage?.status === "ACTIVE" || activePackage?.status === "PAUSED"
            ? activePackage.id
            : undefined,
      };
    });
  } catch {
    if (filters) throw new Error("Customers could not be loaded. Please try again.");
    return [];
  }
}

// The customer list intentionally stays lightweight. The detail page needs a
// fuller operational record so the kitchen can prepare and deliver without
// opening the QR packing view first.
export async function getAdminCustomerDetail(customerId: string) {
  if (!hasDatabaseUrl()) {
    return null;
  }

  try {
    const customer = await db.customer.findUnique({
      where: { id: customerId },
      include: {
        addresses: {
          orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
          take: 1,
        },
        orders: {
          orderBy: { createdAt: "desc" },
          include: {
            payments: { orderBy: { createdAt: "desc" } },
          },
        },
        packages: {
          orderBy: { createdAt: "desc" },
          include: {
            package: { select: { name: true, cadence: true } },
            order: { select: { foodPreferences: true, allergies: true, studentVerifications: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true } } } },
            deliveryDays: { orderBy: { deliveryDate: "asc" } },
          },
        },
        studentVerifications: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!customer) return null;

    const activePackage =
      customer.packages.find((item) => item.status === "ACTIVE" || item.status === "PAUSED") ??
      customer.packages[0];
    const address = customer.addresses[0];
    const latestOrder = customer.orders[0];
    const latestPayment = customer.orders
      .flatMap((order) => order.payments)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0];
    const spend = customer.orders.flatMap((order) => order.payments)
      .filter((payment) => payment.status === "PAID" && payment.currency === "USD")
      .reduce((total, payment) => total + toNumber(payment.amount), 0);
    const status = adminCustomerStatus(customer.packages);
    const now = new Date();
    const scheduledDeliveryDays = activePackage?.deliveryDays.filter((day) => !["CANCELLED", "PAUSED", "DECLINED", "PENDING_PAYMENT"].includes(day.status)) ?? [];
    const nextDelivery = activePackage?.status === "ACTIVE" ? scheduledDeliveryDays.find(
      (day) => dateToInput(day.deliveryDate) >= businessDateInput(now) && !isDeliveryDayElapsed(day, now),
    ) : undefined;
    const pendingRenewal = (await getPendingRenewalDeliveries(customer.id, now))[0];
    const nextDeliveryText = pendingRenewal && (!nextDelivery || pendingRenewal.deliveryDate < nextDelivery.deliveryDate)
      ? `${formatFullDate(pendingRenewal.deliveryDate)} / ${pendingRenewal.label} (renewal pending)`
      : nextDelivery ? formatFullDate(nextDelivery.deliveryDate) : "No upcoming delivery scheduled";
    const completedDays = activePackage
      ? Math.max(
          activePackage.usedDeliveryDays,
          (activePackage.unrepresentedUsedDays ?? 0) + scheduledDeliveryDays.filter((day) => isDeliveryDayElapsed(day, now)).length,
        )
      : 0;
    const foodPreferences = activePackage?.order.foodPreferences?.trim() || latestOrder?.foodPreferences?.trim() || "";
    const allergies = activePackage?.order.allergies?.trim() || latestOrder?.allergies?.trim() || "";

    return {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone ?? "",
      joined: formatTimestampDate(customer.joinedAt),
      status,
      plan: activePackage?.package.name ?? "No active plan",
      activePackageId:
        activePackage?.status === "ACTIVE" || activePackage?.status === "PAUSED"
          ? activePackage.id
          : undefined,
      orders: customer.orders.length,
      spend,
      emailReceipts: customer.emailReceipts,
      smsUpdates: customer.smsUpdates,
      address: address
        ? {
            name: address.name ?? "Delivery address",
            lines: [address.line1, address.line2, `${address.city}, ${address.state} ${address.postalCode}`, address.country]
              .filter(Boolean),
            city: address.city,
            isDefault: address.isDefault,
          }
        : null,
      currentPackage: activePackage
        ? {
            id: activePackage.id,
            name: activePackage.package.name,
            status: titleCase(activePackage.status),
            startDate: activePackage.startDate ? formatFullDate(activePackage.startDate) : "Not scheduled",
            endDate: activePackage.endDate ? formatFullDate(activePackage.endDate) : "To be scheduled",
            deliveryProgress: `${completedDays} of ${activePackage.totalDeliveryDays} deliveries completed`,
            remainingDeliveries: Math.max(activePackage.totalDeliveryDays - completedDays, 0),
            nextDelivery: nextDeliveryText,
          }
        : null,
      kitchenNotes: {
        foodPreferences,
        allergies,
      },
      latestOrder: latestOrder
        ? {
            number: latestOrder.orderNumber,
            status: mapOrderStatus(latestOrder.status),
            date: formatTimestampDate(latestOrder.createdAt),
            total: toNumber(latestOrder.total),
          }
        : null,
      receiptOrders: customer.orders.map((order) => ({
        number: order.orderNumber,
        date: formatTimestampDate(order.createdAt),
        status: mapOrderStatus(order.status),
        total: toNumber(order.total),
      })),
      latestPayment: latestPayment
        ? {
            method: titleCase(latestPayment.method),
            status: titleCase(latestPayment.status),
            date: formatTimestampDate(latestPayment.createdAt),
            amount: toNumber(latestPayment.amount),
          }
        : null,
      verification: customer.studentVerifications[0]
        ? {
            type: titleCase(customer.studentVerifications[0].verificationType),
            status: titleCase(customer.studentVerifications[0].status),
          }
        : null,
    };
  } catch {
    return null;
  }
}

function formatTimestampDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "America/Los_Angeles" }).format(value);
}

function formatFullDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(value);
}

export async function getAdminPackagingRecord(customerId: string): Promise<PackagingRecord | null> {
  if (!hasDatabaseUrl()) {
    return null;
  }

  try {
    const customer = await db.customer.findUnique({
      where: { id: customerId },
      include: {
        addresses: {
          orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
          take: 1,
        },
        packages: {
          where: { status: "ACTIVE", deliveryDays: { some: {
            deliveryDate: { gte: inputToDate(businessDateInput(), 0) },
            status: { notIn: ["CANCELLED", "PAUSED", "DECLINED", "PENDING_PAYMENT", "DELIVERED"] },
          } } },
          orderBy: { createdAt: "desc" },
          include: {
            package: {
              include: {
                items: { orderBy: { sortOrder: "asc" } },
              },
            },
            order: { select: { foodPreferences: true, allergies: true } },
            deliveryDays: {
              orderBy: { deliveryDate: "asc" },
            },
          },
        },
      },
    });

    if (!customer) return null;

    const address = customer.addresses[0];
    const now = new Date();
    const nextDayFor = (item: (typeof customer.packages)[number]) => item.deliveryDays.find(
      (day) => !["CANCELLED", "PAUSED", "DECLINED", "PENDING_PAYMENT", "DELIVERED"].includes(day.status)
        && dateToInput(day.deliveryDate) >= businessDateInput(now)
        && !isDeliveryDayElapsed(day, now),
    );
    const pendingRenewals = await getPendingRenewalDeliveries(customer.id, now);
    const paidDates = customer.packages.flatMap((item) => item.deliveryDays.filter((day) =>
      !["CANCELLED", "PAUSED", "DECLINED", "PENDING_PAYMENT", "DELIVERED"].includes(day.status)).map((day) => dateToInput(day.deliveryDate)));
    const pendingToPack = pendingRenewals.filter((record) => !customer.packages.some((item) => item.id === record.sourcePackageId
      && item.deliveryDays.some((day) => !["CANCELLED", "PAUSED", "DECLINED", "PENDING_PAYMENT"].includes(day.status)
        && dateToInput(day.deliveryDate) === dateToInput(record.deliveryDate))));
    const nextPackingDate = [...customer.packages.map(nextDayFor).filter((day) => day !== undefined)
      .map((day) => dateToInput(day.deliveryDate)), ...pendingToPack.map((record) => dateToInput(record.deliveryDate))].sort()[0];

    return {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone ?? "Not provided",
      address: address
        ? [address.name, address.line1, address.line2, `${address.city}, ${address.state} ${address.postalCode}`]
            .filter(Boolean)
            .join(", ")
        : "No delivery address on file",
      warning: pendingRenewals.some((record) => dateToInput(record.deliveryDate) === nextPackingDate && paidDates.includes(nextPackingDate))
        ? "Paid and renewal-pending meals share this date. Review their purchases and quantities before packing; include any renewal meals in the correct paid package." : undefined,
      packages: [...customer.packages.filter((item) => {
        const next = nextDayFor(item);
        return next && dateToInput(next.deliveryDate) === nextPackingDate;
      }).map((customerPackage) => {
        const activeDays = customerPackage.deliveryDays.filter(
          (day) => !["CANCELLED", "PAUSED", "DECLINED", "PENDING_PAYMENT"].includes(day.status),
        );
        const nextDelivery = nextDayFor(customerPackage);
        const elapsedDays = activeDays.filter((day) => isDeliveryDayElapsed(day, now)).length;
        const usedDays = Math.max(customerPackage.usedDeliveryDays, (customerPackage.unrepresentedUsedDays ?? 0) + elapsedDays);

        return {
          id: customerPackage.id,
          name: customerPackage.package.name,
          status: titleCase(customerPackage.status),
          quantity: customerPackage.quantity,
          startDate: customerPackage.startDate
            ? formatFullDate(customerPackage.startDate)
            : "Not scheduled",
          deliveryProgress: `${usedDays} of ${customerPackage.totalDeliveryDays} delivery days used`,
          nextDelivery: nextDelivery
            ? formatFullDate(nextDelivery.deliveryDate)
            : "No upcoming delivery scheduled",
          includes: customerPackage.package.items.map((item) =>
            item.quantity ? `${item.quantity} ${item.name}` : item.name,
          ),
          foodPreferences: customerPackage.order.foodPreferences?.trim() || "No special food preferences",
          allergies: customerPackage.order.allergies?.trim() ?? "",
        };
      }), ...pendingToPack.filter((record) => dateToInput(record.deliveryDate) === nextPackingDate).map((record) => ({
        id: record.id, name: record.label, status: "Renewal pending", quantity: record.quantity,
        startDate: formatFullDate(record.deliveryDate), deliveryProgress: "Admin-authorized delivery; renewal pending",
        nextDelivery: formatFullDate(record.deliveryDate),
        includes: record.sourcePackage?.package.items.map((item) => item.quantity ? `${item.quantity} ${item.name}` : item.name) ?? [],
        foodPreferences: record.sourcePackage?.order.foodPreferences?.trim() || "No special food preferences",
        allergies: record.sourcePackage?.order.allergies?.trim() ?? "",
      }))],
    };
  } catch {
    return null;
  }
}

export async function getPayments(): Promise<Transaction[]> {
  if (!hasDatabaseUrl()) {
    return [];
  }

  try {
    const payments = await db.payment.findMany({
      include: { order: { include: { customer: true } } },
      orderBy: { createdAt: "desc" },
      take: 80,
    });

    return payments.map((payment) => ({
      id: payment.id,
      orderId: payment.order.orderNumber,
      customer: payment.order.customer?.name ?? payment.order.guestName ?? "Guest customer",
      method: titleCase(payment.method),
      amount: toNumber(payment.amount),
      status: mapPaymentStatus(payment.status),
      date: formatDate(payment.createdAt),
    }));
  } catch {
    return [];
  }
}

export async function getCustomerOrders(): Promise<Order[]> {
  if (!hasDatabaseUrl()) {
    return [];
  }

  try {
    const customer = await getCurrentCustomer();

    if (!customer) {
      return [];
    }

    const orders = await db.order.findMany({
      where: { customerId: customer.id },
      include: {
        customer: true,
        items: { include: { package: true } },
        payments: { select: { method: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return orders.map((order) => ({
      id: order.orderNumber,
      plan: order.items.map((item) => item.package.name).join(", ") || "Custom tiffin",
      date: formatDate(order.createdAt),
      total: toNumber(order.total),
      status: mapOrderStatus(order.status),
      awaitingZelle:
        order.status === "PENDING_PAYMENT" && order.payments.some((payment) => payment.method === "ZELLE"),
    }));
  } catch {
    return [];
  }
}

export async function getUpcomingDeliveries(): Promise<Delivery[]> {
  if (!hasDatabaseUrl()) {
    return [];
  }

  try {
    const customer = await getCurrentCustomer();

    if (!customer) {
      return [];
    }

    const now = new Date();
    const deliveries = await db.packageDeliveryDay.findMany({
      where: {
        deliveryDate: { gte: inputToDate(businessDateInput(now), 0) },
        status: { notIn: ["CANCELLED", "PAUSED", "DELIVERED", "DECLINED", "PENDING_PAYMENT"] },
        customerPackage: { customerId: customer.id, status: "ACTIVE" },
      },
      include: { customerPackage: { include: { package: true } } },
      orderBy: { deliveryDate: "asc" },
      take: 5,
    });

    const pendingRenewals = await getPendingRenewalDeliveries(customer.id, now);
    const visible = deliveries.filter((day) => !isDeliveryDayElapsed(day, now));
    return [...visible.map((delivery) => ({
      id: delivery.id,
      day: formatDay(delivery.deliveryDate),
      date: formatDate(delivery.deliveryDate),
      meal: delivery.menuSummary ?? delivery.customerPackage.package.name,
      sortDate: delivery.deliveryDate,
    })), ...pendingRenewals.filter((record) => !visible.some((day) => day.customerPackageId === record.sourcePackageId && dateToInput(day.deliveryDate) === dateToInput(record.deliveryDate)))
      .map((record) => ({ id: record.id, day: formatDay(record.deliveryDate), date: formatDate(record.deliveryDate),
        meal: `${record.label} (renewal pending)`, sortDate: record.deliveryDate }))]
      .sort((a, b) => a.sortDate.getTime() - b.sortDate.getTime()).slice(0, 5)
      .map(({ sortDate: _sortDate, ...delivery }) => { void _sortDate; return delivery; });
  } catch {
    return [];
  }
}

const emptyCustomerPackage: CustomerPackageSummary = {
  plan: "No active plan",
  quantity: 0,
  status: "No active plan",
  totalDeliveryDays: 0,
  usedDeliveryDays: 0,
  remainingDeliveryDays: 0,
  customerPauseUsed: false,
  canSelfPause: false,
  startDate: "Not started",
  endDate: "Not scheduled",
};

export async function getCustomerPackageSummaries(): Promise<CustomerPackageSummary[]> {
  if (!hasDatabaseUrl()) {
    return [];
  }

  try {
    const customer = await getCurrentCustomer();

    if (!customer) {
      return [];
    }

    const now = new Date();
    const packages = await db.customerPackage.findMany({
      where: { customerId: customer.id },
      include: {
        package: true,
        deliveryDays: true,
        order: { select: { studentVerifications: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true } } } },
        pauseRequests: {
          where: { status: "ACTIVE", endDate: { gte: now } },
          orderBy: { startDate: "asc" },
          take: 1,
        },
        holidayCredits: {
          where: { businessHoliday: { status: "ACTIVE", endDate: { gte: now } } },
          include: { businessHoliday: true },
          orderBy: { originalDeliveryDate: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return packages.map((customerPackage) => {
      // Keep today's delivery outstanding until the Pacific delivery window ends.
      const elapsedDays = customerPackage.deliveryDays.filter(
        (day) => isDeliveryDayElapsed(day, now),
      ).length;
      const usedDeliveryDays = Math.max(customerPackage.usedDeliveryDays, (customerPackage.unrepresentedUsedDays ?? 0) + elapsedDays);
      const remainingDeliveryDays = Math.max(
        customerPackage.totalDeliveryDays - usedDeliveryDays,
        0,
      );
      const status = customerPackage.status === "PENDING_STUDENT_VERIFICATION" && customerPackage.order?.studentVerifications?.[0]?.status === "APPROVED"
        ? "Needs schedule review" as const : mapCustomerPackageStatus(customerPackage.status);
      const holidayImpacts = new Map<string, NonNullable<CustomerPackageSummary["holidayImpacts"]>[number]>();

      for (const credit of customerPackage.holidayCredits) {
        const existing = holidayImpacts.get(credit.businessHolidayId);
        if (existing) {
          existing.creditedDeliveries += 1;
          continue;
        }

        holidayImpacts.set(credit.businessHolidayId, {
          id: credit.businessHolidayId,
          name: credit.businessHoliday.name,
          startDate: formatDate(credit.businessHoliday.startDate),
          endDate: formatDate(credit.businessHoliday.endDate),
          note: credit.businessHoliday.note ?? "",
          creditedDeliveries: 1,
        });
      }

      return {
        id: customerPackage.id,
        packageId: customerPackage.packageId,
        plan: customerPackage.package.name,
        quantity: customerPackage.quantity,
        status,
        totalDeliveryDays: customerPackage.totalDeliveryDays,
        usedDeliveryDays,
        remainingDeliveryDays,
        customerPauseUsed: customerPackage.customerPauseUsed,
        canSelfPause: status === "Active" && !customerPackage.customerPauseUsed,
        startDate: customerPackage.startDate ? formatDate(customerPackage.startDate) : "Not started",
        endDate: customerPackage.endDate ? formatDate(customerPackage.endDate) : "Not scheduled",
        scheduledPause: customerPackage.pauseRequests[0]
          ? {
              startDate: formatDate(customerPackage.pauseRequests[0].startDate),
              endDate: formatDate(customerPackage.pauseRequests[0].endDate),
            }
          : undefined,
        holidayImpacts: Array.from(holidayImpacts.values()),
      };
    });
  } catch {
    return [];
  }
}

export async function getCustomerPackageSummary(): Promise<CustomerPackageSummary> {
  return (await getCustomerPackageSummaries())[0] ?? emptyCustomerPackage;
}

export async function getCustomerNotifications(): Promise<NotificationItem[]> {
  if (!hasDatabaseUrl()) {
    return [];
  }

  try {
    const session = await getCurrentSession().catch(() => null);

    if (!session?.user?.id) {
      return [];
    }

    const notifications = await db.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    return notifications.map((item) => ({
      id: item.id,
      title: item.title,
      body: item.body,
      time: formatDate(item.createdAt),
      type:
        item.type === "VERIFICATION"
          ? "system"
          : (item.type.toLowerCase() as NotificationItem["type"]),
      read: item.read,
    }));
  } catch {
    return [];
  }
}

export async function getCustomerProfileDetails(): Promise<CustomerProfileDetails> {
  try {
    const customer = await getCurrentCustomer();

    if (!customer) {
      const session = await getCurrentSession().catch(() => null);

      return {
        name: session?.user?.name ?? "Customer",
        email: session?.user?.email ?? "",
        phone: "",
        emailReceipts: true,
        smsUpdates: false,
        plan: "No active plan",
        renewalDate: "Not scheduled",
        address: "No default address",
        preferences: [],
        line1: "",
        line2: "",
        city: "",
        state: "CA",
        postalCode: "",
      };
    }

    const fullCustomer = await db.customer.findUnique({
      where: { id: customer.id },
      include: {
        addresses: { where: { isDefault: true }, take: 1 },
        packages: { include: { package: true }, orderBy: { createdAt: "desc" }, take: 1 },
        orders: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

    const address = fullCustomer?.addresses[0];
    const currentPackage =
      fullCustomer?.packages.find((item) => ["ACTIVE", "PAUSED", "PENDING_PAYMENT", "PENDING_STUDENT_VERIFICATION"].includes(item.status)) ??
      fullCustomer?.packages[0];
    const preferenceText = fullCustomer?.orders[0]?.foodPreferences ?? "";

    return {
      name: fullCustomer?.name ?? customer.name,
      email: fullCustomer?.email ?? customer.email,
      phone: fullCustomer?.phone ?? "",
      emailReceipts: fullCustomer?.emailReceipts ?? true,
      smsUpdates: fullCustomer?.smsUpdates ?? false,
      plan: currentPackage?.package.name ?? "No active plan",
      renewalDate: currentPackage?.endDate ? formatDate(currentPackage.endDate) : "Not scheduled",
      address: address
        ? `${address.line1}, ${address.city}, ${address.state} ${address.postalCode}`
        : "No default address",
      preferences: preferenceText
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      addressId: address?.id,
      line1: address?.line1 ?? "",
      line2: address?.line2 ?? "",
      city: address?.city ?? "",
      state: address?.state ?? "CA",
      postalCode: address?.postalCode ?? "",
    };
  } catch {
    const session = await getCurrentSession().catch(() => null);

    return {
      name: session?.user?.name ?? "Customer",
      email: session?.user?.email ?? "",
      phone: "",
      emailReceipts: true,
      smsUpdates: false,
      plan: "No active plan",
      renewalDate: "Not scheduled",
      address: "No default address",
      preferences: [],
      line1: "",
      line2: "",
      city: "",
      state: "CA",
      postalCode: "",
    };
  }
}

export async function getCustomerPayments(): Promise<Transaction[]> {
  if (!hasDatabaseUrl()) {
    return [];
  }

  try {
    const customer = await getCurrentCustomer();

    if (!customer) {
      return [];
    }

    const payments = await db.payment.findMany({
      where: { order: { customerId: customer.id } },
      include: { order: true },
      orderBy: { createdAt: "desc" },
      take: 80,
    });

    return payments.map((payment) => ({
      id: payment.id,
      orderId: payment.order.orderNumber,
      customer: customer.name,
      method: titleCase(payment.method),
      amount: toNumber(payment.amount),
      status: mapPaymentStatus(payment.status),
      date: formatDate(payment.createdAt),
    }));
  } catch {
    return [];
  }
}
