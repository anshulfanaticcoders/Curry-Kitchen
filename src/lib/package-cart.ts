export type PackageCustomItemInput = {
  itemId: string;
  quantity: number;
};

export type PlanCartLine = {
  kind: "plan";
  lineId: string;
  packageId: string;
  startDate: string;
};

export type CustomCartLine = {
  kind: "custom";
  lineId: string;
  cadence: "WEEKLY" | "MONTHLY";
  items: PackageCustomItemInput[];
  startDate: string;
};

export type PackageCartItemInput = PlanCartLine | CustomCartLine;

export const MAX_PACKAGE_CART_ITEMS = 10;
export const MAX_CUSTOM_ITEM_QUANTITY = 99;

function isDateString(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isCustomItem(value: unknown): value is PackageCustomItemInput {
  if (!value || typeof value !== "object") return false;

  const item = value as Partial<PackageCustomItemInput>;

  return (
    isNonEmptyString(item.itemId) &&
    typeof item.quantity === "number" &&
    Number.isInteger(item.quantity) &&
    item.quantity >= 0 &&
    item.quantity <= MAX_CUSTOM_ITEM_QUANTITY
  );
}

function isCartItem(value: unknown): value is PackageCartItemInput {
  if (!value || typeof value !== "object") return false;

  const item = value as Record<string, unknown>;

  if (!isNonEmptyString(item.lineId) || !isDateString(item.startDate)) return false;


  if (item.kind === "plan") {
    return isNonEmptyString(item.packageId);
  }

  if (item.kind === "custom") {
    return (
      (item.cadence === "WEEKLY" || item.cadence === "MONTHLY") &&
      Array.isArray(item.items) &&
      item.items.every(isCustomItem)
    );
  }

  return false;
}

// Strips a parsed line down to exactly the fields we persist. Every field a
// cart line carries has to be listed here, or it is silently dropped on the
// next round-trip through localStorage or the ?cart= query.
function normalizeLine(item: PackageCartItemInput): PackageCartItemInput {
  if (item.kind === "custom") {
    const seenItemIds = new Set<string>();

    return {
      kind: "custom",
      lineId: item.lineId,
      cadence: item.cadence,
      startDate: item.startDate,
      items: item.items.filter((entry) => {
        if (seenItemIds.has(entry.itemId)) return false;

        seenItemIds.add(entry.itemId);
        return entry.quantity > 0;
      }),
    };
  }

  return {
    kind: "plan",
    lineId: item.lineId,
    packageId: item.packageId,
    startDate: item.startDate,
  };
}

function dedupeLines(items: PackageCartItemInput[]) {
  const seenLineIds = new Set<string>();

  return items
    .filter((item) => {
      if (seenLineIds.has(item.lineId)) return false;

      seenLineIds.add(item.lineId);
      return true;
    })
    .slice(0, MAX_PACKAGE_CART_ITEMS);
}

export function parsePackageCart(value?: string | null): PackageCartItemInput[] {
  if (!value) return [];

  try {
    const parsed: unknown = JSON.parse(value);

    if (!Array.isArray(parsed)) return [];

    return dedupeLines(parsed.filter(isCartItem)).map(normalizeLine);
  } catch {
    return [];
  }
}

export function packageCartQuery(items: PackageCartItemInput[]) {
  return encodeURIComponent(JSON.stringify(dedupeLines(items).map(normalizeLine)));
}

export function makePackageCartLineId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `line-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
