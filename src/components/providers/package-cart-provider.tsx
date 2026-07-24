"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  MAX_PACKAGE_CART_ITEMS,
  packageCartQuery,
  parsePackageCart,
  type PackageCartItemInput,
} from "@/lib/package-cart";
import type { PackagePlan } from "@/lib/types";

const STORAGE_KEY = "currykitchen-package-cart";
const STORAGE_EVENT = "currykitchen-package-cart-change";
const EMPTY_CART: PackageCartItemInput[] = [];

let cachedStorageValue: string | null | undefined;
let cachedCartItems: PackageCartItemInput[] = EMPTY_CART;

type PackageCartContextValue = {
  items: PackageCartItemInput[];
  plansById: Record<string, PackagePlan>;
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

function readStoredCart() {
  if (typeof window === "undefined") return EMPTY_CART;

  try {
    const storedValue = window.localStorage.getItem(STORAGE_KEY);

    if (storedValue === cachedStorageValue) return cachedCartItems;

    cachedStorageValue = storedValue;
    cachedCartItems = normalizeCart(parsePackageCart(storedValue));
    return cachedCartItems;
  } catch {
    return cachedCartItems;
  }
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

function persistCart(nextItems: PackageCartItemInput[]) {
  const normalizedItems = normalizeCart(nextItems);
  const serializedItems = JSON.stringify(normalizedItems);

  cachedStorageValue = serializedItems;
  cachedCartItems = normalizedItems;

  try {
    window.localStorage.setItem(STORAGE_KEY, serializedItems);
  } catch {
    // Memory remains the source of truth for this visit if storage is unavailable.
  }

  window.dispatchEvent(new Event(STORAGE_EVENT));
  return normalizedItems;
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
  const items = useSyncExternalStore(subscribeToCart, readStoredCart, getServerCartSnapshot);
  const [plansById, setPlansById] = useState<Record<string, PackagePlan>>({});
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    getClientHydrationState,
    getServerHydrationState,
  );
  const [cartOpen, setCartOpen] = useState(false);
  const [pulseKey, setPulseKey] = useState(0);

  const registerPlans = useCallback((plans: PackagePlan[]) => {
    setPlansById((current) => {
      const next = { ...current };

      for (const plan of plans) {
        next[plan.id] = plan;
      }

      return next;
    });
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
    () => (items.length ? `/checkout?cart=${packageCartQuery(items)}` : "/packages#build-plan"),
    [items],
  );

  const value = useMemo<PackageCartContextValue>(
    () => ({
      items,
      plansById,
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
