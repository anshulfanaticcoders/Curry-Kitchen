import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth";
import { shouldUseMockData } from "@/lib/server/data-source";
import { getStripe } from "@/lib/stripe";

const checkoutSchema = z.object({
  packageId: z.string().min(1),
  quantity: z.number().int().min(1).max(10).default(1),
  addonIds: z.array(z.string()).default([]),
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

function toNumber(value: Prisma.Decimal | number | string) {
  return Number(value.toString());
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

async function getOutsideZoneFee() {
  const setting = await db.setting.findUnique({ where: { key: "outside_zone_fee" } });
  const value = setting?.value;

  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);

  return 12.99;
}

function makeOrderNumber() {
  return `CK-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;
}

function calculateDeliveryDates(totalDays: number) {
  const dates: Date[] = [];
  const cursor = new Date();
  cursor.setDate(cursor.getDate() + 1);

  while (dates.length < totalDays) {
    const day = cursor.getDay();

    if (day !== 0 && day !== 6) {
      dates.push(new Date(cursor));
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

export async function markOrderPaidAndActivate(orderId: string, stripePaymentId?: string) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      items: { include: { package: true } },
      customerPackages: { include: { package: true, deliveryDays: true } },
      studentVerifications: true,
      payments: true,
    },
  });

  if (!order) {
    return;
  }

  await db.$transaction(async (tx) => {
    await tx.payment.updateMany({
      where: { orderId: order.id },
      data: {
        status: "PAID",
        stripePaymentId,
      },
    });

    await tx.order.update({
      where: { id: order.id },
      data: { status: "PAID" },
    });

    for (const customerPackage of order.customerPackages) {
      const requiresStudentApproval = customerPackage.package.studentOnly;
      const nextStatus = requiresStudentApproval ? "PENDING_STUDENT_VERIFICATION" : "ACTIVE";
      const startDate = requiresStudentApproval ? null : new Date();
      const deliveryDates = requiresStudentApproval
        ? []
        : calculateDeliveryDates(customerPackage.totalDeliveryDays);

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

  if (shouldUseMockData()) {
    return {
      checkoutUrl: `/dashboard/orders?checkout=mock&order=CK-MOCK-${Date.now().toString().slice(-5)}`,
      orderNumber: makeOrderNumber(),
    };
  }

  const session = await getCurrentSession().catch(() => null);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const created = await db.$transaction(async (tx) => {
    const plan = await tx.package.findUnique({
      where: { id: input.packageId },
      include: {
        addons: { include: { addon: true } },
      },
    });

    if (!plan || plan.status !== "ACTIVE") {
      throw new Error("Selected package is not available.");
    }

    if (plan.studentOnly && !input.student) {
      throw new Error("Student package requires university verification details.");
    }

    const eligibleAddons = plan.addons
      .map(({ addon }) => addon)
      .filter((addon) => input.addonIds.includes(addon.id) && addon.status === "ACTIVE");
    const subtotal =
      (toNumber(plan.price) +
        eligibleAddons.reduce((sum, addon) => sum + toNumber(addon.price), 0)) *
      input.quantity;

    const zones = await tx.deliveryZone.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ outsideZone: "asc" }, { createdAt: "asc" }],
    });
    const matchedZone =
      zones.find(
        (zone) => !zone.outsideZone && matchesZone(zone, input.address.city, input.address.postalCode),
      ) ?? zones.find((zone) => zone.outsideZone);
    const deliveryFeePerPackage = matchedZone
      ? matchedZone.isFreeDelivery
        ? 0
        : toNumber(matchedZone.fee)
      : await getOutsideZoneFee();
    const deliveryFee = deliveryFeePerPackage * input.quantity;

    const coupon = input.couponCode
      ? await tx.coupon.findUnique({ where: { code: input.couponCode.toUpperCase() } })
      : null;
    const discountAmount =
      coupon && coupon.status === "ACTIVE"
        ? coupon.type === "PERCENT"
          ? subtotal * (toNumber(coupon.value) / 100)
          : toNumber(coupon.value)
        : 0;
    const taxableSubtotal = Math.max(0, subtotal - discountAmount);
    const taxAmount = taxableSubtotal * toNumber(plan.taxRate);
    const total = taxableSubtotal + taxAmount + deliveryFee;

    let customer = session?.user?.id
      ? await tx.customer.findUnique({ where: { userId: session.user.id } })
      : null;

    customer ??= await tx.customer.findFirst({
      where: { email: input.customer.email },
    });

    customer ??= await tx.customer.create({
      data: {
        userId: session?.user?.id,
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
        guestName: session?.user ? null : input.customer.name,
        guestEmail: session?.user ? null : input.customer.email,
        guestPhone: session?.user ? null : input.customer.phone,
        subtotal: new Prisma.Decimal(subtotal),
        deliveryFee: new Prisma.Decimal(deliveryFee),
        taxAmount: new Prisma.Decimal(taxAmount),
        discountAmount: new Prisma.Decimal(discountAmount),
        total: new Prisma.Decimal(total),
        foodPreferences: input.foodPreferences,
        items: {
          create: {
            packageId: plan.id,
            quantity: input.quantity,
            unitPrice: plan.price,
            total: new Prisma.Decimal(toNumber(plan.price) * input.quantity),
          },
        },
        addons: {
          create: eligibleAddons.map((addon) => ({
            addonId: addon.id,
            quantity: input.quantity,
            unitPrice: addon.price,
            total: new Prisma.Decimal(toNumber(addon.price) * input.quantity),
          })),
        },
        payments: {
          create: {
            amount: new Prisma.Decimal(total),
            status: "PENDING",
            method: "STRIPE",
          },
        },
        customerPackages: {
          create: {
            customerId: customer.id,
            packageId: plan.id,
            totalDeliveryDays: plan.deliveryDayCount * input.quantity,
            status: "PENDING_PAYMENT",
          },
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
      include: {
        payments: true,
      },
    });

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      planName: plan.name,
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
    cancel_url: `${appUrl}/checkout?checkout=cancelled`,
    metadata: {
      orderId: created.orderId,
      orderNumber: created.orderNumber,
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: cents(created.total),
          product_data: {
            name: `Curry Kitchen - ${created.planName}`,
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
