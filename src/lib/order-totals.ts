export type OrderTotalsInput = {
  subtotal: number;
  discountAmount?: number;
  deliveryFee?: number;
  taxRate: number;
};

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateOrderTotals({
  subtotal,
  discountAmount = 0,
  deliveryFee = 0,
  taxRate,
}: OrderTotalsInput) {
  const discountedSubtotal = roundCurrency(Math.max(0, subtotal - discountAmount));
  const taxableAmount = roundCurrency(discountedSubtotal + Math.max(0, deliveryFee));
  const taxAmount = roundCurrency(taxableAmount * Math.max(0, taxRate));

  return {
    discountedSubtotal,
    taxableAmount,
    taxAmount,
    total: roundCurrency(taxableAmount + taxAmount),
  };
}
