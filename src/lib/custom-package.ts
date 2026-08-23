import type { PackageCustomItemInput } from "@/lib/package-cart";

export type CustomPackageItemOption = {
  id: string;
  name: string;
  unitLabel: string;
  pricePerUnit: number;
  minQuantity: number;
  required: boolean;
  sortOrder: number;
};

export type CustomPackagePricing = {
  perDay: number;
  total: number;
  deliveryDayCount: number;
  lines: Array<{ item: CustomPackageItemOption; quantity: number; total: number }>;
};

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function customDeliveryDayCount(customMonthlyDays: number) {
  return Math.max(1, customMonthlyDays);
}

/**
 * The single source of truth for custom-package money. The checkout server and
 * the browser both call this; if they ever disagree the customer sees one price
 * and Stripe charges another.
 */
export function priceCustomPackage(
  selections: PackageCustomItemInput[],
  options: CustomPackageItemOption[],
  deliveryDayCount: number,
): CustomPackagePricing {
  const optionsById = new Map(options.map((option) => [option.id, option]));
  const lines = selections.flatMap((selection) => {
    const item = optionsById.get(selection.itemId);

    if (!item || selection.quantity <= 0) return [];

    return [{ item, quantity: selection.quantity, total: roundMoney(item.pricePerUnit * selection.quantity) }];
  });

  const perDay = roundMoney(lines.reduce((sum, line) => sum + line.total, 0));

  return { perDay, total: roundMoney(perDay * deliveryDayCount), deliveryDayCount, lines };
}

export function belowMinimumItems(
  selections: PackageCustomItemInput[],
  options: CustomPackageItemOption[],
) {
  const quantityById = new Map(selections.map((selection) => [selection.itemId, selection.quantity]));

  return options.filter((option) => {
    const quantity = quantityById.get(option.id) ?? 0;
    return option.required ? quantity < option.minQuantity : quantity > 0 && quantity < option.minQuantity;
  });
}

export function describeCustomPackage(pricing: CustomPackagePricing) {
  return pricing.lines
    .map((line) => {
      const quantity = formatCustomQuantity(line.item, line.quantity);
      const name = line.item.name.toLowerCase();

      // "2 roti" reads better than "2 roti roti" when the unit is the item.
      return line.item.unitLabel.toLowerCase() === name ? quantity : `${quantity} ${name}`;
    })
    .join(", ");
}

export function formatCustomQuantity(item: CustomPackageItemOption, quantity: number) {
  return `${quantity} ${item.unitLabel}`.trim();
}

const MAX_PACKAGE_NAME = 120;

/**
 * Package.name is the whole customer-facing surface for a custom order: it
 * becomes the Stripe line item on the card receipt, the delivery-day menu
 * summary, and the plan name in every reminder email. So it has to describe
 * the plate, not just say "Custom".
 */
export function customPackageName(pricing: CustomPackagePricing) {
  const base = "Custom monthly tiffin";
  const detail = describeCustomPackage(pricing);

  if (!detail) return base;

  const full = `${base} — ${detail}`;

  return full.length <= MAX_PACKAGE_NAME ? full : `${full.slice(0, MAX_PACKAGE_NAME - 1).trimEnd()}…`;
}
