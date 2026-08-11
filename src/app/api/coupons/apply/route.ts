import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { CouponError, findValidCoupon } from "@/lib/server/coupons";

export const runtime = "nodejs";

const applySchema = z.object({ code: z.string().min(1).max(60) });

export async function POST(request: Request) {
  const session = await getCurrentSession();

  if (!session?.user?.id) {
    return NextResponse.json(
      { ok: false, error: "Sign in to apply a coupon." },
      { status: 401 },
    );
  }

  let code: string;

  try {
    const body = await request.json();
    code = applySchema.parse(body).code;
  } catch {
    return NextResponse.json({ ok: false, error: "Enter a coupon code." }, { status: 400 });
  }

  try {
    const customer = await db.customer.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    const coupon = await findValidCoupon(db, {
      code,
      customerId: customer?.id ?? null,
    });

    return NextResponse.json({
      ok: true,
      coupon: {
        code: coupon.code,
        type: coupon.type,
        value: Number(coupon.value.toString()),
      },
    });
  } catch (error) {
    if (error instanceof CouponError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.statusCode },
      );
    }

    console.error("Coupon apply failed", error);
    return NextResponse.json(
      { ok: false, error: "Coupon could not be checked. Please try again." },
      { status: 500 },
    );
  }
}
