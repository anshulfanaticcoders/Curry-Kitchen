import "server-only";

import { getCurrentSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildOrderReceipt } from "@/lib/order-receipt";

export class ReceiptAccessError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function getAdminOrderReceipt(orderNumber: string) {
  const session = await getCurrentSession();
  if (!session?.user) throw new ReceiptAccessError(401, "Sign in to view this receipt.");
  if (session.user.role !== "ADMIN") throw new ReceiptAccessError(403, "Admin access is required.");
  if (!orderNumber || orderNumber.length > 191) throw new ReceiptAccessError(400, "Invalid order number.");

  const order = await db.order.findUnique({
    where: { orderNumber },
    select: {
      orderNumber: true, status: true, createdAt: true,
      subtotal: true, deliveryFee: true, discountAmount: true, taxAmount: true, total: true,
      guestName: true, guestEmail: true,
      customer: { select: { name: true, email: true } },
      items: { orderBy: { id: "asc" }, select: {
        id: true, quantity: true, unitPrice: true, total: true,
        package: { select: { name: true } },
        legacyComplimentary: { select: { name: true } },
      } },
      legacyAddons: { orderBy: { id: "asc" }, select: { id: true, quantity: true, unitPrice: true, total: true } },
      payments: { orderBy: [{ createdAt: "desc" }, { id: "asc" }], select: {
        id: true, method: true, status: true, amount: true, currency: true,
        stripePaymentId: true, stripeSessionId: true, createdAt: true,
      } },
    },
  });
  if (!order) throw new ReceiptAccessError(404, "This order could not be found.");
  return buildOrderReceipt(order);
}
