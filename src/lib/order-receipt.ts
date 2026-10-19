type SavedMoney = string | number | { toString(): string } | null;

export type ReceiptSource = {
  orderNumber: string;
  status: string;
  createdAt: Date;
  subtotal: SavedMoney;
  deliveryFee: SavedMoney;
  discountAmount: SavedMoney;
  taxAmount: SavedMoney;
  total: SavedMoney;
  guestName: string | null;
  guestEmail: string | null;
  customer: { name: string; email: string } | null;
  items: Array<{
    id: string;
    quantity: number;
    unitPrice: SavedMoney;
    total: SavedMoney;
    package: { name: string } | null;
    legacyComplimentary: Array<{ name: string }>;
  }>;
  legacyAddons: Array<{ id: string; quantity: number; unitPrice: SavedMoney; total: SavedMoney }>;
  payments: Array<{
    id: string;
    method: string;
    status: string;
    amount: SavedMoney;
    currency: string;
    stripePaymentId: string | null;
    stripeSessionId: string | null;
    createdAt: Date;
  }>;
};

export type ReceiptOrderOption = { number: string; date: string };

// Parse persisted Decimal values into cents without floating-point arithmetic.
export function receiptCents(value: SavedMoney | undefined): number | null {
  if (value == null) return null;
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(String(value));
  if (!match) return null;
  const cents = Number(match[2]) * 100 + Number((match[3] ?? "").padEnd(2, "0"));
  return Number.isSafeInteger(cents) ? (match[1] ? -cents : cents) : null;
}

export function receiptStatus(value: string) {
  return value.toLowerCase().replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
}

export function buildOrderReceipt(order: ReceiptSource) {
  const warnings: string[] = [];
  const amounts = {
    subtotal: receiptCents(order.subtotal),
    discount: receiptCents(order.discountAmount),
    delivery: receiptCents(order.deliveryFee),
    tax: receiptCents(order.taxAmount),
    total: receiptCents(order.total),
  };
  const items = [
    ...order.items.map((item) => ({
      id: item.id,
      name: item.package?.name || "Package name not recorded",
      quantity: item.quantity,
      unitPrice: receiptCents(item.unitPrice),
      total: receiptCents(item.total),
      complimentary: item.legacyComplimentary.map((entry) => entry.name),
    })),
    ...order.legacyAddons.map((item) => ({
      id: item.id,
      name: "Historical add-on (name not recorded)",
      quantity: item.quantity,
      unitPrice: receiptCents(item.unitPrice),
      total: receiptCents(item.total),
      complimentary: [] as string[],
    })),
  ];
  const missingAmounts = Object.values(amounts).some((value) => value === null);
  if (missingAmounts) warnings.push("Some original charges were not recorded. The missing amounts have not been estimated.");
  if (Object.values(amounts).some((value) => value !== null && value < 0)) {
    warnings.push("This order contains negative charges. Review the original payment record.");
  }
  if (amounts.subtotal !== null && amounts.discount !== null && amounts.delivery !== null && amounts.tax !== null && amounts.total !== null
    && amounts.subtotal - amounts.discount + amounts.delivery + amounts.tax !== amounts.total) {
    warnings.push("The saved charge breakdown does not match the saved order total. Original amounts are shown unchanged.");
  }
  if (!items.length) warnings.push("Package details were not recorded for this order.");
  if (items.some((item) => item.total === null || item.unitPrice === null || !Number.isInteger(item.quantity) || item.quantity < 1)) {
    warnings.push("Some purchased item details are incomplete.");
  }
  if (items.length && amounts.subtotal !== null && items.every((item) => item.total !== null)
    && items.reduce((sum, item) => sum + item.total!, 0) !== amounts.subtotal) {
    warnings.push("The recorded items do not add up to the saved subtotal. Original values are shown without adjustment.");
  }
  if (items.some((item) => item.unitPrice !== null && item.total !== null && item.unitPrice * item.quantity !== item.total)) {
    warnings.push("An item's saved quantity and unit price differ from its saved line total. The original line total is retained.");
  }
  const payments = order.payments.map((payment) => ({
    id: payment.id,
    method: payment.method === "STRIPE" ? "Stripe" : receiptStatus(payment.method),
    status: payment.status,
    amount: receiptCents(payment.amount),
    currency: payment.currency.toUpperCase(),
    reference: payment.stripePaymentId || payment.stripeSessionId || payment.id,
    recordedAt: payment.createdAt.toISOString(),
  }));
  // Checkout and the Order monetary columns are USD. Payment currencies are
  // displayed separately; a foreign-currency attempt cannot prove USD payment.
  const currency = "USD";
  const successful = payments.filter((payment) => payment.status === "PAID");
  const refunded = payments.some((payment) => payment.status === "REFUNDED");
  const invalidPayment = payments.some((payment) => payment.amount === null || payment.amount < 0 || payment.currency !== currency);
  const paidCents = successful.reduce((sum, payment) => sum + (payment.amount ?? 0), 0);
  if (refunded) warnings.push("A refund is recorded. The exact refunded amount is not stored here; confirm it with the payment provider.");
  if (invalidPayment) warnings.push("A payment has a missing amount or different currency. Check the original transaction before reconciling this order.");
  if (successful.length && amounts.total !== null && paidCents !== amounts.total) {
    warnings.push("Successful payment amounts do not match the saved order total.");
  }
  const paid = successful.length > 0 && !refunded && !invalidPayment && amounts.total !== null && paidCents === amounts.total;
  const paymentStatus = refunded ? "Refund recorded"
    : invalidPayment ? "Needs review"
      : paid ? "Paid"
        : successful.length ? (amounts.total !== null && paidCents < amounts.total ? "Partially paid" : "Needs review")
          : payments.some((payment) => payment.status === "PENDING") ? "Pending payment"
            : payments.some((payment) => payment.status === "FAILED") ? "Payment failed" : "Not recorded";
  return {
    number: order.orderNumber,
    title: paid ? "Payment receipt" : "Order summary",
    status: receiptStatus(order.status),
    createdAt: order.createdAt.toISOString(),
    customer: {
      name: order.guestName || order.customer?.name || "Customer not recorded",
      email: order.guestEmail || order.customer?.email || null,
    },
    currency,
    amounts,
    items,
    payments,
    paymentStatus,
    warnings,
  };
}

export type OrderReceipt = ReturnType<typeof buildOrderReceipt>;
