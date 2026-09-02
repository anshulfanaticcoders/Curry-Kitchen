import { Prisma } from "@prisma/client";
import { z } from "zod";
import { getAppUrl } from "@/lib/app-url";
import { getCurrentSession } from "@/lib/auth";
import { businessRulesFromValue, getBusinessRules, isAfterOrderCutoff } from "@/lib/business-rules";
import { db } from "@/lib/db";
import { sendOrderPaidEmails, sendZelleOrderEmails } from "@/lib/email/notifications";
import {
  buildPackageScheduleAvailability,
  businessDateInput,
  calculateDeliveryDates,
  dateToInput,
  inputToDate,
  nextEligiblePackageStartDate,
  packageStartDateIssue,
} from "@/lib/package-schedule";
import {
  belowMinimumItems,
  customDeliveryDayCount,
  customPackageName,
  formatCustomQuantity,
  priceCustomPackage,
  type CustomPackageItemOption,
} from "@/lib/custom-package";
import { MAX_CUSTOM_ITEM_QUANTITY } from "@/lib/package-cart";
import { calculateOrderTotals } from "@/lib/order-totals";
import { CouponError, findValidCoupon } from "@/lib/server/coupons";
import { shouldUseMockData } from "@/lib/server/data-source";
import { getStripe } from "@/lib/stripe";
import { getActiveHolidayDateRanges } from "@/lib/server/delivery-schedule-adjustments";

const startDateField = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid package start date.");

const checkoutItemSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("plan"),
    packageId: z.string().min(1),
    startDate: startDateField,
  }),
  z.object({
    kind: z.literal("custom"),
    cadence: z.literal("MONTHLY"),
    items: z
      .array(
        z.object({
          itemId: z.string().min(1),
          quantity: z.number().int().min(0).max(MAX_CUSTOM_ITEM_QUANTITY),
        }),
      )
      .min(1)
      .max(40),
    startDate: startDateField,
  }),
]);

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
  allergies: z.string().max(1000).optional(),
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

function isWeeklyTrialPackage(plan: {
  cadence: string;
  isCustom: boolean;
  category: { slug: string };
}) {
  return plan.isCustom ? plan.cadence === "WEEKLY" : /weekly|trial/i.test(plan.category.slug);
}

function makeOrderNumber() {
  return `CK-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;
}

const CUSTOM_PACKAGE_IMAGE =
  "https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=1200&q=80";

export const DEFAULT_TAX_RATE = 0.0875;
export const DEFAULT_DELIVERY_CHARGE = 30;

export function globalTaxRateFromValue(value: unknown) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const candidate = (value as Record<string, unknown>).taxRate;
    if (typeof candidate === "number" && candidate >= 0 && candidate <= 1) {
      return candidate;
    }
  }

  return DEFAULT_TAX_RATE;
}

export function globalDeliveryChargeFromValue(value: unknown) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const candidate = value as Record<string, unknown>;
    const amount = candidate.deliveryCharge;
    const enabled = candidate.deliveryChargeEnabled;

    return {
      enabled: typeof enabled === "boolean" ? enabled : true,
      amount:
        typeof amount === "number" && Number.isFinite(amount) && amount >= 0
          ? amount
          : DEFAULT_DELIVERY_CHARGE,
    };
  }

  return { enabled: true, amount: DEFAULT_DELIVERY_CHARGE };
}

export async function markOrderPaidAndActivate(orderId: string, stripePaymentId?: string) {
  const [rules, holidayRanges] = await Promise.all([getBusinessRules(), getActiveHolidayDateRanges()]);
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      customer: true,
      customerPackages: { include: { package: { include: { category: true } }, deliveryDays: true } },
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
      const requiresStudentApproval = customerPackage.package.category.requiresVerification;
      const nextStatus = requiresStudentApproval ? "PENDING_STUDENT_VERIFICATION" : "ACTIVE";
      const startDate = customerPackage.startDate ?? nextEligiblePackageStartDate(new Date(), rules.deliveryWeekdays);
      const deliveryDates = requiresStudentApproval
        ? []
        : calculateDeliveryDates(customerPackage.totalDeliveryDays, startDate, rules.deliveryWeekdays, holidayRanges);
      const effectiveStartDate = deliveryDates[0] ?? startDate;

      await tx.customerPackage.update({
        where: { id: customerPackage.id },
        data: {
          status: nextStatus,
          startDate: effectiveStartDate,
          endDate: deliveryDates.at(-1) ?? null,
        },
      });

      if (customerPackage.orderItemId && effectiveStartDate.getTime() !== startDate.getTime()) {
        await tx.orderItem.update({
          where: { id: customerPackage.orderItemId },
          data: { startDate: effectiveStartDate },
        });
      }

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

  const activatedOrder = await db.order.findUnique({
    where: { id: order.id },
    include: {
      customer: true,
      customerPackages: { include: { package: true } },
    },
  });
  if (activatedOrder) await sendOrderPaidEmails(activatedOrder);
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
    const checkoutNow = new Date();
    const today = inputToDate(businessDateInput(checkoutNow));
    const activeHolidays = await tx.businessHoliday.findMany({
      where: { status: "ACTIVE", endDate: { gte: today } },
      orderBy: { startDate: "asc" },
      select: { id: true, name: true, startDate: true, endDate: true, note: true },
    });
    const availability = buildPackageScheduleAvailability({
      now: checkoutNow,
      deliveryWeekdays: rules.deliveryWeekdays,
      orderCutoff: rules.orderCutoff,
      orderCutoffPassed: isAfterOrderCutoff(rules.orderCutoff, checkoutNow),
      holidays: activeHolidays.map((holiday) => ({
        id: holiday.id,
        name: holiday.name,
        startDate: dateToInput(holiday.startDate),
        endDate: dateToInput(holiday.endDate),
        note: holiday.note ?? "",
      })),
    });

    if (rules.maintenanceMode) {
      throw new CheckoutError(
        "Ordering is temporarily unavailable while Curry Kitchen is under maintenance.",
        503,
        "MAINTENANCE_MODE",
      );
    }

    const packageIds = Array.from(
      new Set(input.items.flatMap((item) => (item.kind === "plan" ? [item.packageId] : []))),
    );
    const plans = await tx.package.findMany({
      where: { id: { in: packageIds }, status: "ACTIVE" },
      include: { category: true },
    });

    if (plans.length !== packageIds.length) {
      throw new CheckoutError(
        "One or more selected packages are no longer available. Review your cart and try again.",
        409,
        "PACKAGE_UNAVAILABLE",
      );
    }

    // Custom builds are materialised into real (hidden) Package rows before the
    // pricing pass below, so every priced line ends up with a plan and the rest
    // of checkout — fulfilment, packing, pause/resume — needs no special case.
    const customPackagesByLine = new Map<number, (typeof plans)[number]>();
    const customLines = input.items.flatMap((item, index) =>
      item.kind === "custom" ? [{ item, index }] : [],
    );

    if (customLines.length) {
      const catalogueRows = await tx.customPackageItem.findMany({ where: { status: "ACTIVE" } });
      const catalogue: CustomPackageItemOption[] = catalogueRows.map((row) => ({
        id: row.id,
        name: row.name,
        unitLabel: row.unitLabel,
        pricePerUnit: toNumber(row.pricePerUnit),
        minQuantity: row.minQuantity,
        required: row.required,
        sortOrder: row.sortOrder,
      }));
      const catalogueIds = new Set(catalogue.map((option) => option.id));
      const category = await tx.packageCategory.upsert({
        where: { slug: "custom-build" },
        update: {},
        // ARCHIVED keeps it out of the admin category tab and the package-form
        // dropdown; it exists only as the required FK target for custom rows.
        create: {
          name: "Custom build",
          slug: "custom-build",
          description: "Customer-built tiffins. Managed automatically.",
          status: "ARCHIVED",
        },
      });

      for (const { item, index } of customLines) {
        if (item.items.some((entry) => !catalogueIds.has(entry.itemId))) {
          throw new CheckoutError(
            "Your custom package contains an item that is no longer available. Rebuild it and try again.",
            409,
            "CUSTOM_ITEM_UNAVAILABLE",
          );
        }

        const minimumFailures = belowMinimumItems(item.items, catalogue);

        if (minimumFailures.length) {
          throw new CheckoutError(
            `Your custom package needs ${minimumFailures
              .map((option) => `${option.name} (minimum ${option.minQuantity} ${option.unitLabel})`)
              .join(", ")}.`,
            409,
            "CUSTOM_ITEM_MINIMUM",
          );
        }

        const deliveryDayCount = customDeliveryDayCount(rules.customMonthlyDays);
        const pricing = priceCustomPackage(item.items, catalogue, deliveryDayCount);

        if (pricing.perDay <= 0) {
          throw new CheckoutError(
            "Add at least one item to your custom package.",
            400,
            "CUSTOM_PACKAGE_EMPTY",
          );
        }

        const name = customPackageName(pricing);
        const created = await tx.package.create({
          data: {
            categoryId: category.id,
            name,
            // randomUUID, not a timestamp: a slug collision here would throw
            // P2002 inside the transaction and kill a paying customer's order.
            slug: `custom-${crypto.randomUUID()}`,
            description: name,
            price: decimal(pricing.total),
            cadence: "MONTHLY",
            deliveryDayCount,
            servings: "1 person",
            imageUrl: CUSTOM_PACKAGE_IMAGE,
            isCustom: true,
            // Must stay false: studentOnly parks the package in
            // PENDING_STUDENT_VERIFICATION with zero delivery days generated.
            studentOnly: false,
            status: "ARCHIVED",
            items: {
              create: pricing.lines.map((line, sortOrder) => ({
                name: line.item.name,
                quantity: formatCustomQuantity(line.item, line.quantity),
                sortOrder,
              })),
            },
          },
          include: { category: true },
        });

        customPackagesByLine.set(index, created);
      }
    }

    const pricedItems = input.items.map((item, index) => {
      const plan =
        item.kind === "custom"
          ? customPackagesByLine.get(index)
          : plans.find((candidate) => candidate.id === item.packageId);

      if (!plan) {
        throw new CheckoutError("Selected package is not available.", 409, "PACKAGE_UNAVAILABLE");
      }

      if (isWeeklyTrialPackage(plan) && !rules.acceptWeeklyTrials) {
        throw new CheckoutError("Weekly trial packages are not available right now.", 409, "WEEKLY_TRIALS_DISABLED");
      }

      const startDateError = packageStartDateIssue(
        item.startDate,
        availability.deliveryWeekdays,
        availability.holidays,
        availability.earliestStartDate,
      );
      if (startDateError) {
        throw new CheckoutError(startDateError, 409, "START_DATE_UNAVAILABLE");
      }
      const startDate = inputToDate(item.startDate);
      const packageTotal = toNumber(plan.price);

      return {
        plan,
        startDate,
        packageTotal,
        subtotal: packageTotal,
      };
    });

    if (pricedItems.some(({ plan }) => plan.category.requiresVerification) && !input.student) {
      throw new CheckoutError(
        "Student or military packages require verification details.",
        400,
        "VERIFICATION_REQUIRED",
      );
    }

    const subtotal = pricedItems.reduce((sum, item) => sum + item.subtotal, 0);
    const deliveryCharge = globalDeliveryChargeFromValue(settings?.value);
    // Delivery is still charged once per order; each category can override the
    // global amount, and a mixed cart pays the highest applicable charge.
    const deliveryFee = deliveryCharge.enabled
      ? pricedItems.reduce((highest, { plan }) => {
          const categoryCharge =
            plan.category.deliveryCharge == null
              ? deliveryCharge.amount
              : toNumber(plan.category.deliveryCharge);
          return Math.max(highest, categoryCharge);
        }, 0)
      : 0;
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
    const { taxAmount, total } = calculateOrderTotals({
      subtotal,
      discountAmount,
      deliveryFee,
      taxRate: globalTaxRateFromValue(settings?.value),
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
        deliveryZoneId: null,
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
        allergies: input.allergies?.trim() || null,
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

      await tx.customerPackage.create({
        data: {
          customerId: customer.id,
          orderId: order.id,
          orderItemId: orderItem.id,
          packageId: pricedItem.plan.id,
          totalDeliveryDays: pricedItem.plan.isCustom
            ? pricedItem.plan.deliveryDayCount
            : pricedItem.plan.category.deliveryDayCount,
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
      emailReceipts: customer.emailReceipts,
    };
  }, {
    // Materialising custom packages adds writes to an already long
    // transaction; Prisma's 5s default is too tight for a full cart.
    timeout: 15_000,
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
      sendCustomerReceipt: created.emailReceipts,
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
