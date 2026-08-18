import { Prisma } from "@prisma/client";
import { z } from "zod";
import { getAppUrl } from "@/lib/app-url";
import { getCurrentSession } from "@/lib/auth";
import { businessRulesFromValue, getBusinessRules, isAfterOrderCutoff } from "@/lib/business-rules";
import { db } from "@/lib/db";
import { sendOrderPaidEmails, sendZelleOrderEmails } from "@/lib/email/notifications";
import {
  calculateDeliveryDates,
  nextEligiblePackageStartDate,
  validatePackageStartInput,
} from "@/lib/package-schedule";
import { CouponError, findValidCoupon } from "@/lib/server/coupons";
import { shouldUseMockData } from "@/lib/server/data-source";
import { getStripe } from "@/lib/stripe";

const checkoutItemSchema = z.object({
  packageId: z.string().min(1),
  addonIds: z.array(z.string().min(1)).max(20),
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
  paymentMethod: z
    .enum(["CREDIT_CARD", "DEBIT_CARD", "APPLE_PAY", "ZELLE"])
    .default("CREDIT_CARD"),
  student: z
    .object({
      verificationType: z.enum(["STUDENT", "MILITARY"]).default("STUDENT"),
      universityName: z.string().min(2),
      studentNumber: z.string().min(2),
      idCardUrl: z.string().min(1, "Upload the front of your student or military ID."),
      idCardBackUrl: z.string().min(1, "Upload the back of your student or military ID."),
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

export const DEFAULT_TAX_RATE = 0.0875;

export function globalTaxRateFromValue(value: unknown) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const candidate = (value as Record<string, unknown>).taxRate;
    if (typeof candidate === "number" && candidate >= 0 && candidate <= 1) {
      return candidate;
    }
  }

  return DEFAULT_TAX_RATE;
}

export async function markOrderPaidAndActivate(orderId: string, stripePaymentId?: string) {
  const rules = await getBusinessRules();
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      customer: true,
      customerPackages: { include: { package: true, deliveryDays: true } },
    },
  });

  if (!order) {
    return;
  }

  // Stripe retries webhooks; a second delivery must not re-activate packages,
  // send duplicate confirmation emails, or resurrect a cancelled order.
  if (order.status !== "PENDING_PAYMENT") {
    return;
  }

  await db.$transaction(async (tx) => {
    await tx.payment.updateMany({
      where: { orderId: order.id },
      data: { status: "PAID", stripePaymentId },
    });

    // Paid orders are accepted automatically — the kitchen delivers every
    // morning between the package start and end dates. Admins only step in
    // to cancel an order.
    await tx.order.update({
      where: { id: order.id },
      data: { status: "ACCEPTED" },
    });

    for (const customerPackage of order.customerPackages) {
      const requiresStudentApproval = customerPackage.package.studentOnly;
      const nextStatus = requiresStudentApproval ? "PENDING_STUDENT_VERIFICATION" : "ACTIVE";
      const startDate = customerPackage.startDate ?? nextEligiblePackageStartDate(new Date(), rules.deliveryWeekdays);
      const deliveryDates = requiresStudentApproval
        ? []
        : calculateDeliveryDates(customerPackage.totalDeliveryDays, startDate, rules.deliveryWeekdays);

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
            deliveryWindow: rules.deliveryWindow,
          })),
        });
      }
    }
  });

  await sendOrderPaidEmails(order);
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

  const appUrl = getAppUrl();

  const created = await db.$transaction(async (tx) => {
    const settings = await tx.setting.findUnique({ where: { key: "admin_settings" } });
    const rules = businessRulesFromValue(settings?.value);

    if (rules.maintenanceMode) {
      throw new CheckoutError(
        "Ordering is temporarily unavailable while Curry Kitchen is under maintenance.",
        503,
        "MAINTENANCE_MODE",
      );
    }

    const packageIds = Array.from(new Set(input.items.map((item) => item.packageId)));
    const plans = await tx.package.findMany({
      where: { id: { in: packageIds }, status: "ACTIVE" },
      include: {
        addons: { include: { addon: true } },
        complimentaryItems: {
          where: { complimentaryItem: { status: "ACTIVE" } },
          include: { complimentaryItem: true },
        },
      },
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

      if (eligibleAddons.length !== requestedAddonIds.length) {
        throw new CheckoutError(
          `${plan.name} has an unavailable add-on.`,
          409,
          "ADDON_UNAVAILABLE",
        );
      }

      if (plan.cadence === "WEEKLY" && !rules.acceptWeeklyTrials) {
        throw new CheckoutError("Weekly trial packages are not available right now.", 409, "WEEKLY_TRIALS_DISABLED");
      }

      const startDate = validatePackageStartInput(item.startDate, rules.deliveryWeekdays);
      const nextDeliveryDate = nextEligiblePackageStartDate(new Date(), rules.deliveryWeekdays);
      if (isAfterOrderCutoff(rules.orderCutoff) && startDate.getTime() === nextDeliveryDate.getTime()) {
        throw new CheckoutError("Today’s order cut-off has passed. Choose the following delivery day.", 409, "ORDER_CUTOFF_PASSED");
      }
      const packageTotal = toNumber(plan.price);
      const addonTotal = eligibleAddons.reduce((sum, addon) => sum + toNumber(addon.price), 0);
      const subtotal = packageTotal + addonTotal;

      return {
        plan,
        eligibleAddons,
        complimentaryItems: plan.complimentaryItems.map(({ complimentaryItem }) => complimentaryItem),
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

    let coupon = null;

    if (input.couponCode) {
      try {
        coupon = await findValidCoupon(tx, {
          code: input.couponCode,
          customerId: customer.id,
        });
      } catch (error) {
        if (error instanceof CouponError) {
          throw new CheckoutError(error.message, error.statusCode, error.code);
        }

        throw error;
      }
    }

    const rawDiscount = coupon
      ? coupon.type === "PERCENT"
        ? subtotal * (toNumber(coupon.value) / 100)
        : toNumber(coupon.value)
      : 0;
    const discountAmount = Math.min(subtotal, Math.max(0, rawDiscount));
    const taxAmount = (subtotal - discountAmount) * globalTaxRateFromValue(settings?.value);
    const total = roundMoney(subtotal - discountAmount + taxAmount + deliveryFee);

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
          create: {
            amount: decimal(total),
            status: "PENDING",
            method: input.paymentMethod === "ZELLE" ? "ZELLE" : "STRIPE",
          },
        },
        studentVerifications: input.student
          ? {
              create: {
                customerId: customer.id,
                verificationType: input.student.verificationType,
                universityName: input.student.universityName,
                studentNumber: input.student.studentNumber,
                idCardUrl: input.student.idCardUrl,
                idCardBackUrl: input.student.idCardBackUrl,
                status: "PENDING",
              },
            }
          : undefined,
      },
    });

    if (coupon) {
      await tx.coupon.update({
        where: { id: coupon.id },
        data: { usageCount: { increment: 1 } },
      });
    }

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

      if (pricedItem.eligibleAddons.length) {
        await tx.orderAddon.createMany({
          data: pricedItem.eligibleAddons.map((addon) => ({
            orderId: order.id,
            orderItemId: orderItem.id,
            addonId: addon.id,
            unitPrice: addon.price,
            total: addon.price,
          })),
        });
      }

      if (pricedItem.complimentaryItems.length) {
        await tx.orderComplimentaryItem.createMany({
          data: pricedItem.complimentaryItems.map((item) => ({
            orderItemId: orderItem.id,
            complimentaryItemId: item.id,
            name: item.name,
          })),
        });
      }

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

  if (input.paymentMethod === "ZELLE") {
    // Zelle is paid outside the platform: the order stays pending until an
    // admin confirms the transfer and marks the payment as paid.
    await sendZelleOrderEmails({
      orderId: created.orderId,
      orderNumber: created.orderNumber,
      customerName: input.customer.name,
      customerEmail: input.customer.email,
      planNames: created.planNames,
      total: created.total,
    });

    return {
      checkoutUrl: `/dashboard/orders?checkout=zelle&order=${created.orderNumber}`,
      orderNumber: created.orderNumber,
    };
  }

  const stripe = getStripe();

  if (!stripe) {
    if (process.env.NODE_ENV === "production") {
      throw new CheckoutError(
        "Card payment is temporarily unavailable. Please choose Zelle or try again later.",
        503,
        "CARD_PAYMENT_UNAVAILABLE",
      );
    }

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
