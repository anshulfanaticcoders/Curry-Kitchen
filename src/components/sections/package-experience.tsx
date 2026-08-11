"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  CalendarDays,
  Check,
  Gift,
  PackagePlus,
  ShoppingBag,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { PackageCard } from "@/components/food/package-card";
import { usePackageCart } from "@/components/providers/package-cart-provider";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import {
  makePackageCartLineId,
  MAX_PACKAGE_CART_ITEMS,
  packageCartQuery,
  type PackageCartItemInput,
} from "@/lib/package-cart";
import {
  nextEligiblePackageStartInput,
  packageStartDateIssue,
} from "@/lib/package-schedule";
import type { PackageCategory, PackagePlan } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";

function categoryLabel(category: PackageCategory) {
  return category === "Student" ? "Student / Military" : category;
}

export function PackageExperience({
  plans,
  initialPlanId,
  initialCartItems = [],
  initialEditLineId,
}: {
  plans: PackagePlan[];
  initialPlanId?: string;
  initialCartItems?: PackageCartItemInput[];
  initialEditLineId?: string;
}) {
  const router = useRouter();
  const {
    items: cartItems,
    registerPlans,
    replaceCart,
    addItem,
    updateItem,
  } = usePackageCart();
  const categories: PackageCategory[] = Array.from(
    new Set(plans.map((plan) => plan.category)),
  );
  const validInitialCart = initialCartItems.filter((item) =>
    plans.some((plan) => plan.id === item.packageId),
  );
  const [category, setCategory] = useState<PackageCategory>("Monthly");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [editingLineId, setEditingLineId] = useState<string | undefined>();
  const [editingAddonIds, setEditingAddonIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState(nextEligiblePackageStartInput());
  const appliedInitialCartKey = useRef<string | null>(null);
  const handledRouteKey = useRef<string | null>(null);

  const visiblePlans = useMemo(
    () => plans.filter((plan) => plan.category === category),
    [category, plans],
  );
  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId);
  const draftTotal = selectedPlan?.price ?? 0;
  const startDateError = packageStartDateIssue(startDate);
  const minimumStartDate = nextEligiblePackageStartInput();
  const initialCartKey = validInitialCart.length ? packageCartQuery(validInitialCart) : "";
  const routeKey = `${initialPlanId ?? ""}:${initialEditLineId ?? ""}:${initialCartKey}`;

  useEffect(() => {
    registerPlans(plans);
  }, [plans, registerPlans]);

  useEffect(() => {
    if (!initialCartKey || appliedInitialCartKey.current === initialCartKey) return;

    // Legacy links may still carry a ?cart= snapshot. The stored cart is the
    // source of truth, so a URL snapshot is only imported into an empty cart —
    // otherwise stale URLs would resurrect removed packages.
    if (cartItems.length === 0) {
      replaceCart(validInitialCart);
    }

    appliedInitialCartKey.current = initialCartKey;
  }, [cartItems.length, initialCartKey, replaceCart, validInitialCart]);

  useEffect(() => {
    if (handledRouteKey.current === routeKey) return;

    const timeoutId = window.setTimeout(() => {
      if (handledRouteKey.current === routeKey) return;

      const editItem = initialEditLineId
        ? cartItems.find((item) => item.lineId === initialEditLineId) ??
          validInitialCart.find((item) => item.lineId === initialEditLineId)
        : undefined;
      const plan = plans.find((candidate) => candidate.id === (editItem?.packageId ?? initialPlanId));

      if (!plan) {
        handledRouteKey.current = routeKey;
        return;
      }

      setSelectedPlanId(plan.id);
      setEditingLineId(editItem?.lineId);
      setEditingAddonIds(editItem?.addonIds ?? []);
      setStartDate(editItem?.startDate ?? nextEligiblePackageStartInput());
      setModalOpen(true);
      handledRouteKey.current = routeKey;
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [
    cartItems,
    initialEditLineId,
    initialPlanId,
    plans,
    routeKey,
    validInitialCart,
  ]);

  useEffect(() => {
    if (!modalOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setModalOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [modalOpen]);

  function openPlan(plan: PackagePlan, item?: PackageCartItemInput) {
    setSelectedPlanId(plan.id);
    setEditingLineId(item?.lineId);
    setEditingAddonIds(item?.addonIds ?? []);
    setStartDate(item?.startDate ?? nextEligiblePackageStartInput());
    setModalOpen(true);
  }

  function saveConfiguredPackage() {
    if (!selectedPlan) return null;

    if (startDateError) {
      toast.error("Choose another start date", { description: startDateError });
      return null;
    }

    const configuredItem: PackageCartItemInput = {
      lineId: editingLineId ?? makePackageCartLineId(),
      packageId: selectedPlan.id,
      addonIds: editingLineId ? editingAddonIds : [],
      startDate,
    };

    if (editingLineId) {
      updateItem(configuredItem);
      return {
        item: configuredItem,
        nextItems: cartItems.map((item) => (item.lineId === editingLineId ? configuredItem : item)),
        updated: true,
      };
    }

    if (cartItems.length >= MAX_PACKAGE_CART_ITEMS) {
      toast.error("Cart limit reached", {
        description: `A single order can contain up to ${MAX_PACKAGE_CART_ITEMS} package configurations.`,
      });
      return null;
    }

    if (!addItem(configuredItem)) {
      toast.error("Cart could not be updated", {
        description: "Please try adding this package again.",
      });
      return null;
    }

    return { item: configuredItem, nextItems: [...cartItems, configuredItem], updated: false };
  }

  function selectAnotherPlan() {
    const result = saveConfiguredPackage();
    if (!result || !selectedPlan) return;

    setModalOpen(false);
    setEditingLineId(undefined);
    toast.success(result.updated ? "Package updated" : "Added to cart", {
      description: result.updated
        ? `${selectedPlan.name} has been updated.`
        : `${selectedPlan.name} is ready in your cart.`,
    });
  }

  function proceedToPayment() {
    const result = saveConfiguredPackage();
    if (!result) return;

    router.push("/checkout");
  }

  function customizePackage() {
    if (!selectedPlan) return;

    if (startDateError) {
      toast.error("Choose another start date", { description: startDateError });
      return;
    }

    const params = new URLSearchParams({
      plan: selectedPlan.id,
      startDate,
    });

    if (editingLineId) params.set("edit", editingLineId);

    router.push(`/packages/customize?${params.toString()}`);
  }

  return (
    <div id="build-plan" className="scroll-mt-32">
      <div className="mb-8 flex flex-col gap-5 border-b border-ink/10 pb-7 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-masala">Choose your tiffin</p>
          <h2 className="mt-2 font-display text-4xl font-black leading-[1.12]">Pick a plan, then make it yours.</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-extrabold transition",
                category === item
                  ? "border-ink bg-ink text-ivory"
                  : "border-ink/10 bg-white/70 text-ink/68 hover:border-masala/35 hover:text-ink",
              )}
            >
              {categoryLabel(item)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 min-[1180px]:grid-cols-4">
        {visiblePlans.map((plan) => (
          <PackageCard key={plan.id} plan={plan} onSelect={openPlan} actionLabel="Select plan" />
        ))}
      </div>

      {typeof document !== "undefined" ? createPortal(
      <AnimatePresence>
        {modalOpen && selectedPlan ? (
          <motion.div
            className="fixed inset-0 z-[90] flex items-center justify-center p-4 sm:p-6"
            initial="closed"
            animate="open"
            exit="closed"
            role="presentation"
          >
            <motion.button
              type="button"
              aria-label="Close package configuration"
              className="absolute inset-0 h-full w-full bg-ink/48 backdrop-blur-[1px]"
              variants={{ open: { opacity: 1 }, closed: { opacity: 0 } }}
              transition={{ duration: 0.2 }}
              onClick={() => setModalOpen(false)}
            />
            <motion.section
              role="dialog"
              aria-modal="true"
              aria-labelledby="configure-plan-title"
              className="relative flex max-h-[calc(100dvh-2rem)] w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-ink/10 bg-ivory shadow-[0_30px_110px_rgba(7,7,7,0.34)] sm:max-h-[calc(100dvh-3rem)]"
              variants={{ open: { opacity: 1, y: 0, scale: 1 }, closed: { opacity: 0, y: 14, scale: 0.985 } }}
              transition={{ type: "spring", stiffness: 340, damping: 30 }}
            >
              <div className="flex items-start justify-between gap-5 border-b border-ink/10 bg-white px-5 py-5 sm:px-7">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-button bg-ink sm:size-20">
                    <Image src={selectedPlan.image} alt={selectedPlan.name} fill className="object-cover" sizes="80px" />
                  </div>
                  <div className="min-w-0">
                    <StatusPill tone={selectedPlan.accent === "leaf" ? "green" : "amber"}>
                      {categoryLabel(selectedPlan.category)}
                    </StatusPill>
                    <h2 id="configure-plan-title" className="mt-2 truncate font-display text-2xl font-black sm:text-3xl">
                      {selectedPlan.name}
                    </h2>
                    <p className="mt-1 text-sm font-bold text-ink/55">
                      {formatCurrency(selectedPlan.price)} · {selectedPlan.cadence}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  aria-label="Close package configuration"
                  className="grid size-10 shrink-0 place-items-center rounded-full border border-ink/10 bg-white text-ink transition hover:border-saffron hover:text-masala"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-7">
                <div className="grid gap-7 md:grid-cols-[0.82fr_1.18fr]">
                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.16em] text-masala">Your plan includes</p>
                    <p className="mt-3 text-sm leading-6 text-ink/62">{selectedPlan.description}</p>
                    <ul className="mt-5 grid gap-3">
                      {selectedPlan.includes.map((item) => (
                        <li key={item} className="flex items-center gap-2 text-sm font-bold text-ink/78">
                          <span className="grid size-5 place-items-center rounded-full bg-mint text-leaf"><Check size={13} /></span>
                          {item}
                        </li>
                      ))}
                    </ul>
                    {selectedPlan.complimentaryItems.length ? (
                      <div className="mt-6 rounded-lg border border-saffron/30 bg-rose p-4">
                        <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.15em] text-masala">
                          <Gift size={15} /> Complimentary with this plan
                        </p>
                        <ul className="mt-3 grid gap-2">
                          {selectedPlan.complimentaryItems.map((item) => (
                            <li key={item.id} className="flex gap-2 text-sm font-bold text-ink/78">
                              <Check size={16} className="mt-0.5 shrink-0 text-masala" />
                              <span>
                                {item.name}
                                {item.description ? <span className="block text-xs font-semibold text-ink/55">{item.description}</span> : null}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    <div className="mt-6 rounded-lg border border-leaf/24 bg-mint p-4">
                      <p className="text-xs font-black uppercase tracking-[0.15em] text-leaf">Customization is optional</p>
                      <p className="mt-1.5 text-sm font-bold leading-5 text-ink/68">Add this plan as-is, or choose extras on the next page.</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-extrabold">When should it start?</p>
                    <p className="mt-1 text-xs font-bold text-ink/48">Choose your first eligible delivery date.</p>
                    <label className="mt-5 grid gap-2 text-sm font-extrabold">
                      Package start date
                      <span className="relative">
                        <CalendarDays className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/36" size={18} />
                        <input
                          type="date"
                          min={minimumStartDate}
                          value={startDate}
                          onChange={(event) => setStartDate(event.target.value)}
                          className={cn(
                            "h-12 w-full rounded-button border bg-white px-4 pl-11 font-medium outline-none transition focus:border-leaf",
                            startDateError ? "border-masala/45" : "border-ink/10",
                          )}
                        />
                      </span>
                      <span className={cn("text-xs font-bold", startDateError ? "text-masala" : "text-ink/48")}>
                        {startDateError || "Starts tomorrow or later. Weekend delivery is unavailable."}
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="border-t border-ink/10 bg-white px-5 py-5 sm:px-7">
                <div className="mb-4 flex items-end justify-between gap-5">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-ink/45">Configured total</p>
                    <p className="mt-1 text-sm font-bold text-ink/55">Before tax and delivery</p>
                  </div>
                  <span className="font-display text-3xl font-black">{formatCurrency(draftTotal)}</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Button variant="secondary" className="w-full" onClick={selectAnotherPlan}>
                    <PackagePlus size={18} />
                    {editingLineId ? "Update cart" : "Add to cart"}
                  </Button>
                  <Button variant="dark" className="w-full" onClick={customizePackage}>
                    Customize
                    <ArrowRight size={17} />
                  </Button>
                  <Button className="w-full" onClick={proceedToPayment}>
                    <ShoppingBag size={18} />
                    Proceed to payment
                    <ArrowRight size={17} />
                  </Button>
                </div>
              </div>
            </motion.section>
          </motion.div>
        ) : null}
      </AnimatePresence>,
      document.body,
      ) : null}
    </div>
  );
}
