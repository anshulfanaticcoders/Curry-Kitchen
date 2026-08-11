"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CalendarDays, Check, PackagePlus, ShoppingBag } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { usePackageCart } from "@/components/providers/package-cart-provider";
import { Button, ButtonLink } from "@/components/ui/button";
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
import type { PackagePlan } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";

function categoryLabel(category: PackagePlan["category"]) {
  return category === "Student" ? "Student / Military" : category;
}

export function PackageCustomizer({
  plan,
  plans,
  initialCartItems = [],
  initialEditLineId,
  initialStartDate,
  initialAddonIds = [],
}: {
  plan: PackagePlan;
  plans: PackagePlan[];
  initialCartItems?: PackageCartItemInput[];
  initialEditLineId?: string;
  initialStartDate?: string;
  initialAddonIds?: string[];
}) {
  const router = useRouter();
  const {
    items: savedCartItems,
    hydrated,
    registerPlans,
    replaceCart,
    addItem,
    updateItem,
  } = usePackageCart();
  const [selectedAddOns, setSelectedAddOns] = useState(() =>
    Array.from(
      new Set(initialAddonIds.filter((id) => plan.addOns.some((addon) => addon.id === id))),
    ),
  );
  const [startDate, setStartDate] = useState(initialStartDate ?? nextEligiblePackageStartInput());
  const initialCartApplied = useRef(false);
  const cartItems = !hydrated && initialCartItems.length ? initialCartItems : savedCartItems;
  const initialCartKey = initialCartItems.length ? packageCartQuery(initialCartItems) : "";
  const selectedAddonRecords = useMemo(
    () => plan.addOns.filter((addon) => selectedAddOns.includes(addon.id)),
    [plan.addOns, selectedAddOns],
  );
  const startDateError = packageStartDateIssue(startDate);
  const minimumStartDate = nextEligiblePackageStartInput();
  const total = plan.price + selectedAddonRecords.reduce((sum, addon) => sum + addon.price, 0);

  useEffect(() => {
    registerPlans(plans);
  }, [plans, registerPlans]);

  useEffect(() => {
    if (!hydrated || !initialCartKey || initialCartApplied.current) return;

    // Only import a legacy ?cart= URL snapshot into an empty stored cart —
    // stale URLs must never overwrite the customer's current cart.
    if (savedCartItems.length === 0) {
      replaceCart(initialCartItems);
    }

    initialCartApplied.current = true;
  }, [hydrated, initialCartItems, initialCartKey, replaceCart, savedCartItems.length]);

  function toggleAddOn(id: string) {
    setSelectedAddOns((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function saveCustomizedPackage() {
    if (startDateError) {
      toast.error("Choose another start date", { description: startDateError });
      return null;
    }

    const item: PackageCartItemInput = {
      lineId: initialEditLineId ?? makePackageCartLineId(),
      packageId: plan.id,
      addonIds: selectedAddOns,
      startDate,
    };

    if (initialEditLineId) {
      updateItem(item);
      return {
        item,
        nextItems: cartItems.map((current) =>
          current.lineId === initialEditLineId ? item : current,
        ),
        updated: true,
      };
    }

    if (cartItems.length >= MAX_PACKAGE_CART_ITEMS) {
      toast.error("Cart limit reached", {
        description: `A single order can contain up to ${MAX_PACKAGE_CART_ITEMS} package configurations.`,
      });
      return null;
    }

    if (!addItem(item)) {
      toast.error("Cart could not be updated", { description: "Please try adding this package again." });
      return null;
    }

    return { item, nextItems: [...cartItems, item], updated: false };
  }

  function addToCart() {
    const result = saveCustomizedPackage();
    if (!result) return;

    toast.success(result.updated ? "Package updated" : "Added to cart", {
      description: `${plan.name} is ready in your cart.`,
    });
    router.push("/packages#build-plan");
  }

  function proceedToPayment() {
    const result = saveCustomizedPackage();
    if (!result) return;

    router.push("/checkout");
  }

  const packagesHref = "/packages#build-plan";

  return (
    <section className="section section-shell pt-28 lg:pt-32">
      <div className="mx-auto max-w-5xl">
        <ButtonLink href={packagesHref} variant="ghost" className="px-0">
          <ArrowLeft size={18} />
          Back to packages
        </ButtonLink>

        <div className="mt-5 overflow-hidden rounded-lg border border-ink/10 bg-white shadow-soft">
          <div className="flex flex-col gap-5 border-b border-ink/10 bg-ivory p-6 md:flex-row md:items-center md:p-8">
            <div className="relative h-28 w-full shrink-0 overflow-hidden rounded-button bg-ink md:w-40">
              <Image src={plan.image} alt={plan.name} fill className="object-cover" sizes="(min-width: 768px) 160px, 100vw" />
            </div>
            <div className="min-w-0 flex-1">
              <StatusPill tone={plan.accent === "leaf" ? "green" : "amber"}>
                {categoryLabel(plan.category)}
              </StatusPill>
              <h1 className="mt-3 font-display text-4xl font-black leading-[1.12]">Customize {plan.name}</h1>
              <p className="mt-2 text-sm font-bold text-ink/58">
                Add any extras you want — every choice below is optional.
              </p>
            </div>
            <div className="md:text-right">
              <p className="text-xs font-black uppercase tracking-[0.15em] text-ink/45">Current total</p>
              <p className="mt-1 font-display text-3xl font-black">{formatCurrency(total)}</p>
            </div>
          </div>

          <div className="grid gap-8 p-6 md:grid-cols-[0.8fr_1.2fr] md:p-8">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.16em] text-masala">Your plan includes</p>
              <p className="mt-3 text-sm leading-6 text-ink/62">{plan.description}</p>
              <ul className="mt-5 grid gap-3">
                {plan.includes.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm font-bold text-ink/78">
                    <span className="grid size-5 place-items-center rounded-full bg-mint text-leaf"><Check size={13} /></span>
                    {item}
                  </li>
                ))}
              </ul>

              <label className="mt-7 grid gap-2 text-sm font-extrabold">
                Package start date
                <span className="relative">
                  <CalendarDays className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/36" size={18} />
                  <input
                    type="date"
                    min={minimumStartDate}
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                    className={cn(
                      "h-12 w-full rounded-button border bg-ivory px-4 pl-11 font-medium outline-none transition focus:border-leaf",
                      startDateError ? "border-masala/45" : "border-ink/10",
                    )}
                  />
                </span>
                <span className={cn("text-xs font-bold", startDateError ? "text-masala" : "text-ink/48")}>
                  {startDateError || "Starts tomorrow or later. Weekend delivery is unavailable."}
                </span>
              </label>
            </div>

            <div>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm font-extrabold">Optional add-ons</p>
                  <p className="mt-1 text-xs font-bold text-ink/48">Skip them all to keep your plan exactly as it is.</p>
                </div>
                <span className="text-xs font-black text-ink/48">{selectedAddOns.length} selected</span>
              </div>

              {plan.addOns.length ? (
                <div className="mt-4 grid gap-2">
                  {plan.addOns.map((addOn) => {
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
              ) : (
                <div className="mt-4 rounded-lg border border-dashed border-ink/15 bg-ivory p-5 text-sm font-bold text-ink/55">
                  This package does not currently have optional add-ons.
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-ink/10 bg-ivory p-6 sm:flex-row sm:justify-end md:px-8">
            <Button variant="secondary" onClick={addToCart}>
              <PackagePlus size={18} />
              {initialEditLineId ? "Update cart" : "Add to cart"}
            </Button>
            <Button onClick={proceedToPayment}>
              <ShoppingBag size={18} />
              Proceed to payment
              <ArrowRight size={17} />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
