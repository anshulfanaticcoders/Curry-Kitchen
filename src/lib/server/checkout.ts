import { Prisma } from "@prisma/client";
import { z } from "zod";
import { getCurrentSession } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  calculateDeliveryDates,
  nextEligiblePackageStartDate,
  validatePackageStartInput,
} from "@/lib/package-schedule";
import { shouldUseMockData } from "@/lib/server/data-source";
import { getStripe } from "@/lib/stripe";

const checkoutItemSchema = z.object({
  packageId: z.string().min(1),
  addonIds: z.array(z.string().min(1)).min(1).max(20),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid package start date."),
});

const checkoutSchema = z.object({
  items: z.array(checkoutItemSchema).min(1).max(10),
  customer: z.object({
    name: z.string().min(2),
    email: z.string().email().trim().toLowerCase(),
    phone: z.string().min(7).optional(),
  }),
  address: z.object({
    line1: z.string().min(4),
    line2: z.string().optional(),
    city: z.string().min(2),
    state: z.string().default("CA"),
    postalCode: z.string().min(5),
  }),
  foodPreferences: z.string().optional(),
  couponCode: z.string().optional(),
  student: z
    .object({
      universityName: z.string().min(2),
      studentNumber: z.string().min(2),
      idCardUrl: z.string().optional(),
    })
    .optional(),
});

type DeliveryZoneCandidate = {
  id: string;
  fee: Prisma.Decimal;
  isFreeDelivery: boolean;
  outsideZone: boolean;
  cities: Prisma.JsonValue;
  postalCodes: Prisma.JsonValue;
};

export class CheckoutError extends Error {
  constructor(
    message: string,
    public statusCode = 400,
    public code = "CHECKOUT_INVALID",
  ) {
    super(message);
    this.name = "CheckoutError";
  }
}

function toNumber(value: Prisma.Decimal | number | string) {
  return Number(value.toString());
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function decimal(value: number) {
  return new Prisma.Decimal(roundMoney(value).toFixed(2));
}

function cents(value: number) {
  return Math.round(value * 100);
}

function asArray(value: Prisma.JsonValue) {
  return Array.isArray(value) ? value.map(String) : [];
}

function matchesZone(zone: DeliveryZoneCandidate, city: string, postalCode: string) {
  const normalizedCity = city.trim().toLowerCase();
  const normalizedPostalCode = postalCode.trim().toLowerCase();

  return (
    asArray(zone.cities).some((item) => item.toLowerCase() === normalizedCity) ||
    asArray(zone.postalCodes).some((item) => item.toLowerCase() === normalizedPostalCode)
  );
}

async function getOutsideZoneFee(tx: Prisma.TransactionClient) {
  const setting = await tx.setting.findUnique({ where: { key: "outside_zone_fee" } });
  const value = setting?.value;

  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);

  return 12.99;
}

function makeOrderNumber() {
  return `CK-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;
}

export async function markOrderPaidAndActivate(orderId: string, stripePaymentId?: string) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      customerPackages: { include: { package: true, deliveryDays: true } },
    },
  });

  if (!order) {
    return;
  }

  await db.$transaction(async (tx) => {
    await tx.payment.updateMany({
      where: { orderId: order.id },
      data: { status: "PAID", stripePaymentId },
    });

    await tx.order.update({
      where: { id: order.id },
      data: { status: "PAID" },
    });

    for (const customerPackage of order.customerPackages) {
      const requiresStudentApproval = customerPackage.package.studentOnly;
      const nextStatus = requiresStudentApproval ? "PENDING_STUDENT_VERIFICATION" : "ACTIVE";
      const startDate = customerPackage.startDate ?? nextEligiblePackageStartDate();
      const deliveryDates = requiresStudentApproval
        ? []
        : calculateDeliveryDates(customerPackage.totalDeliveryDays, startDate);

      await tx.customerPackage.update({
        where: { id: customerPackage.id },
        data: {
          status: nextStatus,
          startDate,
          endDate: deliveryDates.at(-1) ?? null,
        },
      });

      if (!requiresStudentApproval && customerPackage.deliveryDays.length === 0) {
        await tx.packageDeliveryDay.createMany({
          data: deliveryDates.map((deliveryDate) => ({
            customerPackageId: customerPackage.id,
            deliveryDate,
            status: "PREPARING",
            menuSummary: customerPackage.package.name,
          })),
        });
      }
    }
  });
}

export async function createCheckoutOrder(rawInput: unknown) {
  const input = checkoutSchema.parse(rawInput);

  const session = await getCurrentSession().catch(() => null);

  if (!session?.user?.id) {
    throw new CheckoutError(
      "Please sign in or create an account before checkout.",
      401,
      "AUTH_REQUIRED",
    );
  }

  if (shouldUseMockData()) {
    return {
      checkoutUrl: `/dashboard/orders?checkout=mock&order=CK-MOCK-${Date.now().toString().slice(-5)}`,
      orderNumber: makeOrderNumber(),
    };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const created = await db.$transaction(async (tx) => {
    const packageIds = Array.from(new Set(input.items.map((item) => item.packageId)));
    const plans = await tx.package.findMany({
      where: { id: { in: packageIds }, status: "ACTIVE" },
      include: { addons: { include: { addon: true } } },
    });

    if (plans.length !== packageIds.length) {
      throw new CheckoutError(
        "One or more selected packages are no longer available. Review your cart and try again.",
        409,
        "PACKAGE_UNAVAILABLE",
      );
    }

    const pricedItems = input.items.map((item) => {
      const plan = plans.find((candidate) => candidate.id === item.packageId);

      if (!plan) {
        throw new CheckoutError("Selected package is not available.", 409, "PACKAGE_UNAVAILABLE");
      }

      const requestedAddonIds = Array.from(new Set(item.addonIds));
      const eligibleAddons = plan.addons
        .map(({ addon }) => addon)
        .filter(
          (addon) => requestedAddonIds.includes(addon.id) && addon.status === "ACTIVE",
        );

      if (!requestedAddonIds.length || eligibleAddons.length !== requestedAddonIds.length) {
        throw new CheckoutError(
          `${plan.name} needs at least one currently available add-on.`,
          409,
          "ADDON_UNAVAILABLE",
        );
      }

      const startDate = validatePackageStartInput(item.startDate);
      const packageTotal = toNumber(plan.price);
      const addonTotal = eligibleAddons.reduce((sum, addon) => sum + toNumber(addon.price), 0);
      const subtotal = packageTotal + addonTotal;

      return {
        plan,
        eligibleAddons,
        startDate,
        packageTotal,
        addonTotal,
        subtotal,
      };
    });

    if (pricedItems.some(({ plan }) => plan.studentOnly) && !input.student) {
      throw new CheckoutError(
        "Student or military packages require verification details.",
        400,
        "VERIFICATION_REQUIRED",
      );
    }

    const subtotal = pricedItems.reduce((sum, item) => sum + item.subtotal, 0);
    const zones = await tx.deliveryZone.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ outsideZone: "asc" }, { createdAt: "asc" }],
    });
    const matchedZone =
      zones.find(
        (zone) =>
          !zone.outsideZone && matchesZone(zone, input.address.city, input.address.postalCode),
      ) ?? zones.find((zone) => zone.outsideZone);
    const deliveryFeePerPackage = matchedZone
      ? matchedZone.isFreeDelivery
        ? 0
        : toNumber(matchedZone.fee)
      : await getOutsideZoneFee(tx);
    const deliveryFee = deliveryFeePerPackage * pricedItems.length;
    const coupon = input.couponCode
      ? await tx.coupon.findUnique({ where: { code: input.couponCode.toUpperCase() } })
      : null;
    const rawDiscount =
      coupon && coupon.status === "ACTIVE"
        ? coupon.type === "PERCENT"
          ? subtotal * (toNumber(coupon.value) / 100)
          : toNumber(coupon.value)
        : 0;
    const discountAmount = Math.min(subtotal, Math.max(0, rawDiscount));
    const discountRatio = subtotal > 0 ? discountAmount / subtotal : 0;
    const taxAmount = pricedItems.reduce(
      (sum, item) =>
        sum + item.subtotal * (1 - discountRatio) * toNumber(item.plan.taxRate),
      0,
    );
    const total = roundMoney(subtotal - discountAmount + taxAmount + deliveryFee);

    let customer = await tx.customer.findUnique({ where: { userId: session.user.id } });
    customer ??= await tx.customer.findFirst({ where: { email: input.customer.email } });

    if (customer && !customer.userId) {
      customer = await tx.customer.update({
        where: { id: customer.id },
        data: { userId: session.user.id },
      });
    }

    customer ??= await tx.customer.create({
      data: {
        userId: session.user.id,
        name: input.customer.name,
        email: input.customer.email,
        phone: input.customer.phone,
      },
    });

    const address = await tx.address.create({
      data: {
        customerId: customer.id,
        name: input.customer.name,
        line1: input.address.line1,
        line2: input.address.line2,
        city: input.address.city,
        state: input.address.state,
        postalCode: input.address.postalCode,
        isDefault: true,
      },
    });

    const order = await tx.order.create({
      data: {
        orderNumber: makeOrderNumber(),
        customerId: customer.id,
        addressId: address.id,
        deliveryZoneId: matchedZone?.id,
        couponId: coupon?.id,
        guestName: null,
        guestEmail: null,
        guestPhone: null,
        subtotal: decimal(subtotal),
        deliveryFee: decimal(deliveryFee),
        taxAmount: decimal(taxAmount),
        discountAmount: decimal(discountAmount),
        total: decimal(total),
        foodPreferences: input.foodPreferences,
        payments: {
          create: { amount: decimal(total), status: "PENDING", method: "STRIPE" },
        },
        studentVerifications: input.student
          ? {
              create: {
                customerId: customer.id,
                universityName: input.student.universityName,
                studentNumber: input.student.studentNumber,
                idCardUrl: input.student.idCardUrl,
                status: "PENDING",
              },
            }
          : undefined,
      },
    });

    for (const pricedItem of pricedItems) {
      const orderItem = await tx.orderItem.create({
        data: {
          orderId: order.id,
          packageId: pricedItem.plan.id,
          startDate: pricedItem.startDate,
          unitPrice: pricedItem.plan.price,
          total: decimal(pricedItem.packageTotal),
        },
      });

      await tx.orderAddon.createMany({
        data: pricedItem.eligibleAddons.map((addon) => ({
          orderId: order.id,
          orderItemId: orderItem.id,
          addonId: addon.id,
          unitPrice: addon.price,
          total: addon.price,
        })),
      });

      await tx.customerPackage.create({
        data: {
          customerId: customer.id,
          orderId: order.id,
          orderItemId: orderItem.id,
          packageId: pricedItem.plan.id,
          totalDeliveryDays: pricedItem.plan.deliveryDayCount,
          status: "PENDING_PAYMENT",
          startDate: pricedItem.startDate,
        },
      });
    }

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      planNames: pricedItems.map((item) => item.plan.name),
      total,
    };
  });

  const stripe = getStripe();

  if (!stripe) {
    await markOrderPaidAndActivate(created.orderId);
    return {
      checkoutUrl: `/dashboard/orders?checkout=mock&order=${created.orderNumber}`,
      orderNumber: created.orderNumber,
    };
  }

  const stripeSession = await stripe.checkout.sessions.create({
    mode: "payment",
    success_url: `${appUrl}/dashboard/orders?checkout=success&order=${created.orderNumber}`,
    cancel_url: `${appUrl}/dashboard/orders?checkout=cancelled&order=${created.orderNumber}`,
    metadata: { orderId: created.orderId, orderNumber: created.orderNumber },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: cents(created.total),
          product_data: {
            name:
              created.planNames.length === 1
                ? `Curry Kitchen - ${created.planNames[0]}`
                : `Curry Kitchen - ${created.planNames.length} tiffin packages`,
          },
        },
      },
    ],
  });

  await db.order.update({
    where: { id: created.orderId },
    data: {
      stripeCheckoutId: stripeSession.id,
      payments: {
        updateMany: {
          where: { orderId: created.orderId },
          data: { stripeSessionId: stripeSession.id },
        },
      },
    },
  });

  return {
    checkoutUrl: stripeSession.url ?? `/dashboard/orders?order=${created.orderNumber}`,
    orderNumber: created.orderNumber,
  };
}
