import {
  adminOrders as mockAdminOrders,
  customers as mockCustomers,
  packagePlans as mockPackagePlans,
  recentOrders as mockRecentOrders,
  testimonials as mockTestimonials,
  transactions as mockTransactions,
  upcomingDeliveries as mockUpcomingDeliveries,
  weeklyMenu as mockWeeklyMenu,
} from "@/lib/mock-data";
import type {
  AdminOrder,
  Customer,
  CustomerProfileDetails,
  Delivery,
  NotificationItem,
  Order,
  PackageCategory,
  PackagePlan,
  ReviewItem,
  Transaction,
  WeeklyMenuDay,
} from "@/lib/types";
import { getCurrentSession } from "@/lib/auth";
import { db } from "@/lib/db";

type DecimalLike = { toNumber: () => number } | number | string | null | undefined;

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

function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL);
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

function asPackageCategory(value: string): PackageCategory {
  if (value === "Weekly" || value === "Student") {
    return value;
  }

  return "Monthly";
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
  if (status === "DELIVERED") return "Delivered";
  if (status === "OUT_FOR_DELIVERY") return "Out for delivery";
  if (status === "PAUSED" || status === "CANCELLED") return "Paused";
  return "Preparing";
}

function mapPaymentStatus(status: string): Transaction["status"] {
  if (status === "PAID") return "Paid";
  if (status === "REFUNDED" || status === "FAILED") return "Refunded";
  return "Pending";
}

function mapReviewStatus(status: string): ReviewItem["status"] {
  if (status === "ACTIVE") return "Published";
  if (status === "ARCHIVED") return "Spam";
  return "Pending";
}

function planFromRecord(plan: {
  id: string;
  name: string;
  category: { name: string };
  badge: string | null;
  price: DecimalLike;
  taxRate: DecimalLike;
  cadence: string;
  servings: string;
  imageUrl: string;
  description: string;
  bestFor: string | null;
  accent: string;
  items: Array<{ name: string; quantity: string | null }>;
  addons: Array<{
    addon: { id: string; name: string; description: string | null; price: DecimalLike };
  }>;
}): PackagePlan {
  const accent =
    plan.accent === "leaf" || plan.accent === "masala" ? plan.accent : "saffron";

  return {
    id: plan.id,
    name: plan.name,
    category: asPackageCategory(plan.category.name),
    badge: plan.badge ?? titleCase(plan.cadence),
    price: toNumber(plan.price),
    taxRate: toNumber(plan.taxRate),
    cadence: titleCase(plan.cadence),
    servings: plan.servings,
    image: plan.imageUrl,
    description: plan.description,
    bestFor: plan.bestFor ?? "Everyday meals",
    includes: plan.items.map((item) => (item.quantity ? `${item.quantity} ${item.name}` : item.name)),
    addOns: plan.addons.map(({ addon }) => ({
      id: addon.id,
      name: addon.name,
      description: addon.description ?? "Optional add-on",
      price: toNumber(addon.price),
    })),
    accent,
  };
}

export async function getPackagePlans(): Promise<PackagePlan[]> {
  if (!hasDatabaseUrl()) {
    return mockPackagePlans;
  }

  try {
    const plans = await db.package.findMany({
      where: { status: "ACTIVE" },
      include: {
        category: true,
        items: { orderBy: { sortOrder: "asc" } },
        addons: { include: { addon: true } },
      },
      orderBy: [{ studentOnly: "asc" }, { price: "asc" }],
    });

    if (!plans.length) {
      return mockPackagePlans;
    }

    return plans.map(planFromRecord);
  } catch {
    return mockPackagePlans;
  }
}

export async function getWeeklyMenu(): Promise<WeeklyMenuDay[]> {
  if (!hasDatabaseUrl()) {
    return mockWeeklyMenu;
  }

  try {
    const menu = await db.weeklyMenu.findFirst({
      where: { status: "ACTIVE" },
      include: { days: { orderBy: { dayOfWeek: "asc" } } },
      orderBy: { weekStart: "desc" },
    });

    if (!menu?.days.length) {
      return mockWeeklyMenu;
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
  } catch {
    return mockWeeklyMenu;
  }
}

export async function getTestimonials(): Promise<Testimonial[]> {
  if (!hasDatabaseUrl()) {
    return mockTestimonials;
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
      area: "California",
      rating: review.rating,
      quote: review.text,
    }));
  } catch {
    return mockTestimonials;
  }
}

export async function getAdminReviews(): Promise<ReviewItem[]> {
  if (!hasDatabaseUrl()) {
    const { reviewItems } = await import("@/lib/mock-data");
    return reviewItems;
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
    const { reviewItems } = await import("@/lib/mock-data");
    return reviewItems;
  }
}

export async function getAdminOrders(): Promise<AdminOrder[]> {
  if (!hasDatabaseUrl()) {
    return mockAdminOrders;
  }

  try {
    const orders = await db.order.findMany({
      include: {
        customer: true,
        items: { include: { package: true } },
        payments: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    if (!orders.length) {
      return mockAdminOrders;
    }

    return orders.map((order) => ({
      id: order.orderNumber,
      customer: order.customer?.name ?? order.guestName ?? "Guest customer",
      plan: order.items[0]?.package.name ?? "Custom tiffin",
      items: order.items.reduce((total, item) => total + item.quantity, 0),
      total: toNumber(order.total),
      payment: mapPaymentStatus(order.payments[0]?.status ?? "PENDING"),
      status: mapOrderStatus(order.status),
      date: formatDate(order.createdAt),
      window: "6:00 PM - 8:00 PM",
    }));
  } catch {
    return mockAdminOrders;
  }
}

export async function getAdminCustomers(): Promise<Customer[]> {
  if (!hasDatabaseUrl()) {
    return mockCustomers;
  }

  try {
    const customers = await db.customer.findMany({
      include: {
        addresses: { where: { isDefault: true }, take: 1 },
        orders: true,
        packages: { include: { package: true }, orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { joinedAt: "desc" },
      take: 80,
    });

    if (!customers.length) {
      return mockCustomers;
    }

    return customers.map((customer) => {
      const activePackage = customer.packages[0];
      const spend = customer.orders.reduce((total, order) => total + toNumber(order.total), 0);
      const status =
        activePackage?.status === "PAUSED"
          ? "Paused"
          : activePackage?.package.cadence === "WEEKLY"
            ? "Trial"
            : "Active";

      return {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone ?? "Not provided",
        plan: activePackage?.package.name ?? "No active plan",
        status,
        joined: formatDate(customer.joinedAt),
        orders: customer.orders.length,
        spend,
        area: customer.addresses[0]?.city ?? "California",
      };
    });
  } catch {
    return mockCustomers;
  }
}

export async function getPayments(): Promise<Transaction[]> {
  if (!hasDatabaseUrl()) {
    return mockTransactions;
  }

  try {
    const payments = await db.payment.findMany({
      include: { order: { include: { customer: true } } },
      orderBy: { createdAt: "desc" },
      take: 80,
    });

    if (!payments.length) {
      return mockTransactions;
    }

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
    return mockTransactions;
  }
}

export async function getCustomerOrders(): Promise<Order[]> {
  if (!hasDatabaseUrl()) {
    return mockRecentOrders;
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
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return orders.map((order) => ({
      id: order.orderNumber,
      plan: order.items[0]?.package.name ?? "Custom tiffin",
      date: formatDate(order.createdAt),
      total: toNumber(order.total),
      status: mapOrderStatus(order.status),
      deliveryWindow: "6:00 PM - 8:00 PM",
    }));
  } catch {
    return mockRecentOrders;
  }
}

export async function getUpcomingDeliveries(): Promise<Delivery[]> {
  if (!hasDatabaseUrl()) {
    return mockUpcomingDeliveries;
  }

  try {
    const customer = await getCurrentCustomer();

    if (!customer) {
      return [];
    }

    const deliveries = await db.packageDeliveryDay.findMany({
      where: {
        deliveryDate: { gte: new Date() },
        customerPackage: { customerId: customer.id },
      },
      include: { customerPackage: { include: { package: true } } },
      orderBy: { deliveryDate: "asc" },
      take: 5,
    });

    return deliveries.map((delivery) => ({
      id: delivery.id,
      day: formatDay(delivery.deliveryDate),
      meal: delivery.menuSummary ?? delivery.customerPackage.package.name,
      status: mapOrderStatus(delivery.status),
      eta: delivery.deliveryWindow,
    }));
  } catch {
    return mockUpcomingDeliveries;
  }
}

export async function getCustomerNotifications(): Promise<NotificationItem[]> {
  if (!hasDatabaseUrl()) {
    const { notifications } = await import("@/lib/mock-data");
    return notifications;
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
    const { notifications } = await import("@/lib/mock-data");
    return notifications;
  }
}

export async function getCustomerProfileDetails(): Promise<CustomerProfileDetails> {
  if (!hasDatabaseUrl()) {
    const { customerProfile } = await import("@/lib/mock-data");
    return {
      ...customerProfile,
      line1: customerProfile.address,
      city: "Fremont",
      state: "CA",
      postalCode: "94538",
    };
  }

  try {
    const customer = await getCurrentCustomer();

    if (!customer) {
      const session = await getCurrentSession().catch(() => null);

      return {
        name: session?.user?.name ?? "Customer",
        email: session?.user?.email ?? "",
        phone: "",
        plan: "No active plan",
        renewalDate: "Not scheduled",
        address: "No default address",
        preferences: [],
        line1: "",
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
    const currentPackage = fullCustomer?.packages[0];
    const preferenceText = fullCustomer?.orders[0]?.foodPreferences ?? "";

    return {
      name: fullCustomer?.name ?? customer.name,
      email: fullCustomer?.email ?? customer.email,
      phone: fullCustomer?.phone ?? "",
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
      city: address?.city ?? "",
      state: address?.state ?? "CA",
      postalCode: address?.postalCode ?? "",
    };
  } catch {
    const { customerProfile } = await import("@/lib/mock-data");
    return {
      ...customerProfile,
      line1: customerProfile.address,
      city: "Fremont",
      state: "CA",
      postalCode: "94538",
    };
  }
}

export async function getCustomerPayments(): Promise<Transaction[]> {
  if (!hasDatabaseUrl()) {
    return mockTransactions;
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
    return mockTransactions;
  }
}
