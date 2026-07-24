"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  CalendarDays,
  Check,
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

function categoryLabel(category: PackageCategory | "All") {
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
  const categories: Array<PackageCategory | "All"> = [
    "All",
    ...Array.from(new Set(plans.map((plan) => plan.category))),
  ];
  const validInitialCart = initialCartItems.filter((item) =>
    plans.some((plan) => plan.id === item.packageId),
  );
  const [category, setCategory] = useState<(typeof categories)[number]>("All");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [editingLineId, setEditingLineId] = useState<string | undefined>();
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [startDate, setStartDate] = useState(nextEligiblePackageStartInput());
  const appliedInitialCartKey = useRef<string | null>(null);
  const handledRouteKey = useRef<string | null>(null);

  const visiblePlans = useMemo(
    () => plans.filter((plan) => category === "All" || plan.category === category),
    [category, plans],
  );
  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId);
  const selectedAddonRecords =
    selectedPlan?.addOns.filter((addon) => selectedAddOns.includes(addon.id)) ?? [];
  const draftTotal = selectedPlan
    ? selectedPlan.price + selectedAddonRecords.reduce((total, addon) => total + addon.price, 0)
    : 0;
  const startDateError = packageStartDateIssue(startDate);
  const minimumStartDate = nextEligiblePackageStartInput();
  const initialCartKey = validInitialCart.length ? packageCartQuery(validInitialCart) : "";
  const routeKey = `${initialPlanId ?? ""}:${initialEditLineId ?? ""}:${initialCartKey}`;

  useEffect(() => {
    registerPlans(plans);
  }, [plans, registerPlans]);

  useEffect(() => {
    if (!initialCartKey || appliedInitialCartKey.current === initialCartKey) return;

    replaceCart(validInitialCart);
    appliedInitialCartKey.current = initialCartKey;
  }, [initialCartKey, replaceCart, validInitialCart]);

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
      setSelectedAddOns(editItem?.addonIds ?? []);
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
    setSelectedAddOns(item?.addonIds ?? []);
    setStartDate(item?.startDate ?? nextEligiblePackageStartInput());
    setModalOpen(true);
  }

  function toggleAddOn(id: string) {
    setSelectedAddOns((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function saveConfiguredPackage() {
    if (!selectedPlan) return null;

    if (!selectedPlan.addOns.length) {
      toast.error("Package is temporarily unavailable", {
        description: "An admin needs to assign at least one active add-on to this package.",
      });
      return null;
    }

    if (!selectedAddOns.length) {
      toast.error("Choose an add-on", {
        description: "At least one add-on is required for every package.",
      });
      return null;
    }

    if (startDateError) {
      toast.error("Choose another start date", { description: startDateError });
      return null;
    }

    const configuredItem: PackageCartItemInput = {
      lineId: editingLineId ?? makePackageCartLineId(),
      packageId: selectedPlan.id,
      addonIds: selectedAddOns,
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

    router.push(`/checkout?cart=${packageCartQuery(result.nextItems)}`);
  }

  return (
    <div id="build-plan" className="scroll-mt-32">
      <div className="mb-8 flex flex-col gap-5 border-b border-ink/10 pb-7 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-masala">Choose your tiffin</p>
          <h2 className="mt-2 font-display text-4xl font-black leading-[1.06]">Pick a plan, then make it yours.</h2>
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
                    <div className="mt-6 rounded-lg border border-saffron/24 bg-rose p-4">
                      <p className="text-xs font-black uppercase tracking-[0.15em] text-masala">Required customization</p>
                      <p className="mt-1.5 text-sm font-bold leading-5 text-ink/68">Choose at least one add-on before this package can be added.</p>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <p className="text-sm font-extrabold">Choose add-ons</p>
                        <p className="mt-1 text-xs font-bold text-ink/48">Required · pick one or more</p>
                      </div>
                      <span className="text-xs font-black text-ink/48">{selectedAddOns.length} selected</span>
                    </div>
                    <div className="mt-4 grid gap-2">
                      {selectedPlan.addOns.map((addOn) => {
                        const active = selectedAddOns.includes(addOn.id);

                        return (
                          <button
                            key={addOn.id}
                            type="button"
                            aria-pressed={active}
                            onClick={() => toggleAddOn(addOn.id)}
                            className={cn(
                              "flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left transition",
                              active
                                ? "border-leaf bg-mint"
                                : "border-ink/10 bg-white hover:border-saffron/55 hover:bg-rose/45",
                            )}
                          >
                            <span className="flex min-w-0 items-center gap-3">
                              <span className={cn("grid size-5 shrink-0 place-items-center rounded-full border", active ? "border-leaf bg-leaf text-white" : "border-ink/20 bg-white")}>
                                {active ? <Check size={12} /> : null}
                              </span>
                              <span className="min-w-0">
                                <span className="block text-sm font-extrabold">{addOn.name}</span>
                                <span className="block truncate text-xs font-bold text-ink/50">{addOn.description}</span>
                              </span>
                            </span>
                            <span className="shrink-0 text-sm font-black">+{formatCurrency(addOn.price)}</span>
                          </button>
                        );
                      })}
                    </div>

                    <label className="mt-6 grid gap-2 text-sm font-extrabold">
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
                <div className="grid gap-3 sm:grid-cols-2">
                  <Button variant="secondary" className="w-full" onClick={selectAnotherPlan}>
                    <PackagePlus size={18} />
                    {editingLineId ? "Update cart" : "Add to cart"}
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
