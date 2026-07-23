"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
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

export function PackageCartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<PackageCartItemInput[]>([]);
  const [plansById, setPlansById] = useState<Record<string, PackagePlan>>({});
  const [hydrated, setHydrated] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [pulseKey, setPulseKey] = useState(0);

  useEffect(() => {
    try {
      setItems(parsePackageCart(window.localStorage.getItem(STORAGE_KEY)));
    } catch {
      // The cart still works for this visit when storage is unavailable.
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Local state remains usable if the browser rejects persistent storage.
    }
  }, [hydrated, items]);

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
    setItems(normalizeCart(nextItems));
  }, []);

  const addItem = useCallback((item: PackageCartItemInput) => {
    if (items.length >= MAX_PACKAGE_CART_ITEMS) return false;

    setItems((current) => normalizeCart([...current, item]));
    setPulseKey((current) => current + 1);
    return true;
  }, [items.length]);

  const updateItem = useCallback((item: PackageCartItemInput) => {
    setItems((current) => normalizeCart(current.map((currentItem) => (
      currentItem.lineId === item.lineId ? item : currentItem
    ))));
  }, []);

  const removeItem = useCallback((lineId: string) => {
    setItems((current) => current.filter((item) => item.lineId !== lineId));
  }, []);

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
