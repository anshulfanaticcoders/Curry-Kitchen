import {
  customDeliveryDayCount,
  describeCustomPackage,
  priceCustomPackage,
  type CustomPackageItemOption,
} from "@/lib/custom-package";
import type { PackageCartItemInput } from "@/lib/package-cart";
import type { PackagePlan } from "@/lib/types";

export type CustomPackageConfig = {
  customMonthlyDays: number;
  deliveryWeekdayCount: number;
};

export const DEFAULT_CUSTOM_CONFIG: CustomPackageConfig = {
  customMonthlyDays: 21,
  deliveryWeekdayCount: 5,
};

export type ResolvedCartLine = {
  item: PackageCartItemInput;
  /** Present only for fixed-plan lines. */
  plan?: PackagePlan;
  name: string;
  detail: string;
  image?: string;
  subtotal: number;
  isStudent: boolean;
  valid: boolean;
};

/**
 * Resolves a stored cart line into everything the UI needs to price and render
 * it. Custom lines have no `packageId`, so anything that resolves lines by
 * plan lookup alone silently drops them and shows the customer a $0 cart.
 */
export function resolveCartLine(
  item: PackageCartItemInput,
  plans: PackagePlan[],
  customItems: CustomPackageItemOption[],
  config: CustomPackageConfig,
): ResolvedCartLine {
  if (item.kind === "custom") {
    const deliveryDayCount = customDeliveryDayCount(
      item.cadence,
      config.deliveryWeekdayCount,
      config.customMonthlyDays,
    );
    const pricing = priceCustomPackage(item.items, customItems, deliveryDayCount);
    const known = item.items.every((entry) =>
      customItems.some((option) => option.id === entry.itemId),
    );
    const cadenceLabel = item.cadence === "WEEKLY" ? "Weekly" : "Monthly";

    return {
      item,
      name: `Custom ${cadenceLabel.toLowerCase()} tiffin`,
      detail: describeCustomPackage(pricing) || "No items selected",
      subtotal: pricing.total,
      isStudent: false,
      valid: known && pricing.perDay > 0,
    };
  }

  const plan = plans.find((candidate) => candidate.id === item.packageId);

  return {
    item,
    plan,
    name: plan?.name ?? "Package configuration",
    detail: plan?.servings ?? "",
    image: plan?.image,
    subtotal: plan?.price ?? 0,
    isStudent: plan?.category === "Student",
    valid: Boolean(plan),
  };
}

export function cartLineEditHref(item: PackageCartItemInput) {
  return item.kind === "custom"
    ? `/packages/build?edit=${encodeURIComponent(item.lineId)}`
    : `/packages?edit=${encodeURIComponent(item.lineId)}#build-plan`;
}
