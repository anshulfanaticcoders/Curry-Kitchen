import type { Prisma } from "@prisma/client";

export class CouponError extends Error {
  constructor(
    message: string,
    public statusCode = 400,
    public code = "COUPON_INVALID",
  ) {
    super(message);
    this.name = "CouponError";
  }
}

type CouponClient = Pick<Prisma.TransactionClient, "coupon" | "order">;

/**
 * Validates a coupon code for a customer. Enforces: active status, expiry date,
 * global usage limit, per-customer assignment, and one-use-per-customer.
 * Throws CouponError with a customer-facing message when invalid.
 */
export async function findValidCoupon(
  client: CouponClient,
  { code, customerId }: { code: string; customerId: string | null },
) {
  const coupon = await client.coupon.findUnique({
    where: { code: code.trim().toUpperCase() },
  });

  if (!coupon || coupon.status !== "ACTIVE") {
    throw new CouponError("This coupon code is not valid.");
  }

  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    throw new CouponError("This coupon has expired.");
  }

  if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
    throw new CouponError("This coupon is no longer available.");
  }

  if (coupon.customerId && coupon.customerId !== customerId) {
    throw new CouponError("This coupon is linked to a different account.");
  }

  if (customerId) {
    const previousUse = await client.order.findFirst({
      where: {
        couponId: coupon.id,
        customerId,
        status: { not: "CANCELLED" },
      },
      select: { id: true },
    });

    if (previousUse) {
      throw new CouponError("You have already used this coupon.");
    }
  }

  return coupon;
}
