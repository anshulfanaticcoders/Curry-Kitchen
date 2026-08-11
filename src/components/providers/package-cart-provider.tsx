"use client";

import { useSession } from "next-auth/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  MAX_PACKAGE_CART_ITEMS,
  parsePackageCart,
  type PackageCartItemInput,
} from "@/lib/package-cart";
import type { PackagePlan } from "@/lib/types";

// v2: the stored cart carries an owner ("guest" or a user id) so one
// account's cart never leaks into another account in the same browser.
const STORAGE_KEY = "currykitchen-package-cart-v2";
const STORAGE_EVENT = "currykitchen-package-cart-change";
const EMPTY_CART: PackageCartItemInput[] = [];
const GUEST_OWNER = "guest";

type CartEnvelope = { owner: string; items: PackageCartItemInput[] };

const LEGACY_PACKAGE_NAMES: Record<string, string[]> = {
  "monthly-small": ["Small 4 Roti Tiffin"],
  "monthly-regular": ["Regular 8 Roti Tiffin"],
  "monthly-xl": ["Extra Large 12 Roti Tiffin"],
  "weekly-trial": ["Weekly Trial Pack"],
  "student-pack": ["Student & Military Saver Pack", "Student Saver Pack"],
};

const LEGACY_ADDON_NAMES: Record<string, string> = {
  rice: "Rice bowl",
  "extra-yogurt": "Extra yogurt",
  "spice-note": "Spice note",
  dessert: "Extra dessert",
  salad: "Extra salad",
  roti: "Extra roti",
};

let cachedStorageValue: string | null | undefined;
let cachedEnvelope: CartEnvelope = { owner: GUEST_OWNER, items: EMPTY_CART };

type PackageCartContextValue = {
  items: PackageCartItemInput[];
  plansById: Record<string, PackagePlan>;
  catalogReady: boolean;
  hydrated: boolean;
  cartOpen: boolean;
  pulseKey: number;
  checkoutHref: string;
  registerPlans: (plans: PackagePlan[]) => void;
  replaceCart: (items: PackageCartItemInput[]) => void;
  addItem: (item: PackageCartItemInput) => boolean;
  updateItem: (item: PackageCartItemInput) => void;
  removeItem: (lineId: string) => void;
  openCart: () => void;
  closeCart: () => void;
};

const PackageCartContext = createContext<PackageCartContextValue | null>(null);

function normalizeCart(items: PackageCartItemInput[]) {
  const seenLineIds = new Set<string>();

  return items
    .filter((item) => {
      if (seenLineIds.has(item.lineId)) return false;

      seenLineIds.add(item.lineId);
      return true;
    })
    .slice(0, MAX_PACKAGE_CART_ITEMS)
    .map(({ lineId, packageId, addonIds, startDate }) => ({
      lineId,
      packageId,
      addonIds: Array.from(new Set(addonIds)),
      startDate,
    }));
}

function migrateCartToCatalog(items: PackageCartItemInput[], plans: PackagePlan[]) {
  return items.flatMap((item) => {
    const matchingPlan =
      plans.find((plan) => plan.id === item.packageId) ??
      plans.find((plan) => LEGACY_PACKAGE_NAMES[item.packageId]?.includes(plan.name));

    if (!matchingPlan) {
      return [];
    }

    const addonIds = Array.from(
      new Set(
        item.addonIds.flatMap((addonId) => {
          const matchingAddon =
            matchingPlan.addOns.find((addon) => addon.id === addonId) ??
            matchingPlan.addOns.find((addon) => addon.name === LEGACY_ADDON_NAMES[addonId]);

          return matchingAddon ? [matchingAddon.id] : [];
        }),
      ),
    );

    return [{ ...item, packageId: matchingPlan.id, addonIds }];
  });
}

function parseEnvelope(storedValue: string | null): CartEnvelope {
  if (!storedValue) return { owner: GUEST_OWNER, items: EMPTY_CART };

  try {
    const parsed: unknown = JSON.parse(storedValue);

    if (Array.isArray(parsed)) {
      return { owner: GUEST_OWNER, items: normalizeCart(parsePackageCart(storedValue)) };
    }

    if (parsed && typeof parsed === "object" && Array.isArray((parsed as CartEnvelope).items)) {
      const envelope = parsed as { owner?: unknown; items: unknown[] };

      return {
        owner: typeof envelope.owner === "string" && envelope.owner ? envelope.owner : GUEST_OWNER,
        items: normalizeCart(parsePackageCart(JSON.stringify(envelope.items))),
      };
    }
  } catch {
    // Fall through to an empty guest cart.
  }

  return { owner: GUEST_OWNER, items: EMPTY_CART };
}

function readStoredEnvelope(): CartEnvelope {
  if (typeof window === "undefined") return { owner: GUEST_OWNER, items: EMPTY_CART };

  try {
    const storedValue = window.localStorage.getItem(STORAGE_KEY);

    if (storedValue === cachedStorageValue) return cachedEnvelope;

    cachedStorageValue = storedValue;
    cachedEnvelope = parseEnvelope(storedValue);
    return cachedEnvelope;
  } catch {
    return cachedEnvelope;
  }
}

function readStoredCart() {
  return readStoredEnvelope().items;
}

function getServerCartSnapshot() {
  return EMPTY_CART;
}

function subscribeToCart(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => undefined;

  function handleStorage(event: StorageEvent) {
    if (event.key === STORAGE_KEY) onStoreChange();
  }

  window.addEventListener(STORAGE_EVENT, onStoreChange);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(STORAGE_EVENT, onStoreChange);
    window.removeEventListener("storage", handleStorage);
  };
}

function persistEnvelope(owner: string, nextItems: PackageCartItemInput[]) {
  const normalizedItems = normalizeCart(nextItems);
  const envelope: CartEnvelope = { owner, items: normalizedItems };
  const serialized = JSON.stringify(envelope);

  cachedStorageValue = serialized;
  cachedEnvelope = envelope;

  try {
    window.localStorage.setItem(STORAGE_KEY, serialized);
  } catch {
    // Memory remains the source of truth for this visit if storage is unavailable.
  }

  window.dispatchEvent(new Event(STORAGE_EVENT));
  return normalizedItems;
}

function persistCart(nextItems: PackageCartItemInput[]) {
  return persistEnvelope(readStoredEnvelope().owner, nextItems);
}

function subscribeToHydration() {
  return () => undefined;
}

function getClientHydrationState() {
  return true;
}

function getServerHydrationState() {
  return false;
}

export function PackageCartProvider({ children }: { children: ReactNode }) {
  const { data: session, status: sessionStatus } = useSession();
  const items = useSyncExternalStore(subscribeToCart, readStoredCart, getServerCartSnapshot);
  const [plansById, setPlansById] = useState<Record<string, PackagePlan>>({});
  const [catalogReady, setCatalogReady] = useState(false);
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    getClientHydrationState,
    getServerHydrationState,
  );
  const [cartOpen, setCartOpen] = useState(false);
  const [pulseKey, setPulseKey] = useState(0);
  const sessionUserId = session?.user?.id;

  // Keep the cart scoped to whoever is using the browser:
  // - a guest cart is adopted by the account that signs in (guest -> checkout flow),
  // - a cart owned by a DIFFERENT account is cleared on sign-in,
  // - signing out clears the departing account's cart.
  useEffect(() => {
    if (sessionStatus === "loading" || typeof window === "undefined") return;

    const envelope = readStoredEnvelope();

    if (sessionUserId) {
      if (envelope.owner === GUEST_OWNER) {
        persistEnvelope(sessionUserId, envelope.items);
      } else if (envelope.owner !== sessionUserId) {
        persistEnvelope(sessionUserId, EMPTY_CART);
      }
    } else if (envelope.owner !== GUEST_OWNER) {
      persistEnvelope(GUEST_OWNER, EMPTY_CART);
    }
  }, [sessionStatus, sessionUserId]);

  const registerPlans = useCallback((plans: PackagePlan[]) => {
    const storedItems = readStoredCart();
    const migratedItems = normalizeCart(migrateCartToCatalog(storedItems, plans));

    if (JSON.stringify(storedItems) !== JSON.stringify(migratedItems)) {
      persistCart(migratedItems);
    }

    setPlansById((current) => {
      const next = { ...current };

      for (const plan of plans) {
        next[plan.id] = plan;
      }

      return next;
    });
    setCatalogReady(true);
  }, []);

  const replaceCart = useCallback((nextItems: PackageCartItemInput[]) => {
    persistCart(nextItems);
  }, []);

  const addItem = useCallback((item: PackageCartItemInput) => {
    if (items.length >= MAX_PACKAGE_CART_ITEMS) return false;

    persistCart([...items, item]);
    setPulseKey((current) => current + 1);
    return true;
  }, [items]);

  const updateItem = useCallback((item: PackageCartItemInput) => {
    persistCart(items.map((currentItem) => (
      currentItem.lineId === item.lineId ? item : currentItem
    )));
  }, [items]);

  const removeItem = useCallback((lineId: string) => {
    persistCart(items.filter((item) => item.lineId !== lineId));
  }, [items]);

  const checkoutHref = useMemo(
    () => (items.length ? "/checkout" : "/packages#build-plan"),
    [items],
  );

  const value = useMemo<PackageCartContextValue>(
    () => ({
      items,
      plansById,
      catalogReady,
      hydrated,
      cartOpen,
      pulseKey,
      checkoutHref,
      registerPlans,
      replaceCart,
      addItem,
      updateItem,
      removeItem,
      openCart: () => setCartOpen(true),
      closeCart: () => setCartOpen(false),
    }),
    [
      addItem,
      cartOpen,
      catalogReady,
      checkoutHref,
      hydrated,
      items,
      plansById,
      pulseKey,
      registerPlans,
      removeItem,
      replaceCart,
      updateItem,
    ],
  );

  return <PackageCartContext.Provider value={value}>{children}</PackageCartContext.Provider>;
}

export function usePackageCart() {
  const context = useContext(PackageCartContext);

  if (!context) {
    throw new Error("usePackageCart must be used inside PackageCartProvider.");
  }

  return context;
}
