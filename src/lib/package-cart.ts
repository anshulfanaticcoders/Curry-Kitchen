export type PackageCartItemInput = {
  lineId: string;
  packageId: string;
  addonIds: string[];
  startDate: string;
};

export const MAX_PACKAGE_CART_ITEMS = 10;

function isCartItem(value: unknown): value is PackageCartItemInput {
  if (!value || typeof value !== "object") {
    return false;
  }

  const item = value as Partial<PackageCartItemInput>;

  return (
    typeof item.lineId === "string" &&
    item.lineId.length > 0 &&
    typeof item.packageId === "string" &&
    item.packageId.length > 0 &&
    Array.isArray(item.addonIds) &&
    item.addonIds.length > 0 &&
    item.addonIds.every((id) => typeof id === "string" && id.length > 0) &&
    typeof item.startDate === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(item.startDate)
  );
}

export function parsePackageCart(value?: string | null): PackageCartItemInput[] {
  if (!value) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(value);

    if (!Array.isArray(parsed)) {
      return [];
    }

    const seenLineIds = new Set<string>();

    return parsed
      .filter(isCartItem)
      .filter((item) => {
        if (seenLineIds.has(item.lineId)) return false;

        seenLineIds.add(item.lineId);
        return true;
      })
      .slice(0, MAX_PACKAGE_CART_ITEMS)
      .map(({ lineId, packageId, addonIds, startDate }) => ({
        lineId,
        packageId,
        addonIds,
        startDate,
      }));
  } catch {
    return [];
  }
}

export function packageCartQuery(items: PackageCartItemInput[]) {
  const seenLineIds = new Set<string>();
  const payload = items
    .filter((item) => {
      if (seenLineIds.has(item.lineId)) return false;

      seenLineIds.add(item.lineId);
      return true;
    })
    .slice(0, MAX_PACKAGE_CART_ITEMS)
    .map((item) => ({
      lineId: item.lineId,
      packageId: item.packageId,
      addonIds: Array.from(new Set(item.addonIds)),
      startDate: item.startDate,
    }));

  return encodeURIComponent(JSON.stringify(payload));
}

export function makePackageCartLineId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `line-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
