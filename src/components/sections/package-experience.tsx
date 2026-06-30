"use client";

import Image from "next/image";
import { ArrowRight, Check, ShoppingBag } from "lucide-react";
import { useMemo, useState } from "react";
import { PackageCard } from "@/components/food/package-card";
import { ButtonLink } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import type { PackageCategory, PackagePlan } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";

export function PackageExperience({
  plans,
  initialPlanId,
}: {
  plans: PackagePlan[];
  initialPlanId?: string;
}) {
  const categories: Array<PackageCategory | "All"> = [
    "All",
    ...Array.from(new Set(plans.map((plan) => plan.category))),
  ];
  const initialPlan = plans.find((plan) => plan.id === initialPlanId) ?? plans[1] ?? plans[0];
  const [category, setCategory] = useState<(typeof categories)[number]>("All");
  const [selectedPlan, setSelectedPlan] = useState<PackagePlan | undefined>(initialPlan);
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>(
    initialPlan?.addOns[0] ? [initialPlan.addOns[0].id] : [],
  );

  const visiblePlans = useMemo(
    () => plans.filter((plan) => category === "All" || plan.category === category),
    [category, plans],
  );

  if (!selectedPlan) {
    return null;
  }

  const addOnTotal = selectedPlan.addOns
    .filter((addOn) => selectedAddOns.includes(addOn.id))
    .reduce((total, addOn) => total + addOn.price, 0);
  const subtotal = selectedPlan.price + addOnTotal;
  const packageQuery = encodeURIComponent(selectedPlan.id);
  const addOnsQuery = selectedAddOns.map((id) => encodeURIComponent(id)).join(",");
  const checkoutHref = selectedAddOns.length
    ? `/checkout?package=${packageQuery}&addons=${addOnsQuery}`
    : `/checkout?package=${packageQuery}`;
  const hiddenIncludes = Math.max(0, selectedPlan.includes.length - 4);

  function toggleAddOn(id: string) {
    setSelectedAddOns((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function selectPlan(plan: PackagePlan) {
    setSelectedPlan(plan);
    setSelectedAddOns(plan.addOns[0] ? [plan.addOns[0].id] : []);
  }

  return (
    <div id="build-plan" className="grid scroll-mt-32 gap-10 lg:grid-cols-[1.42fr_0.78fr]">
      <div>
        <div className="mb-7 flex flex-wrap gap-2">
          {categories.map((item) => (
            <button
              key={item}
              onClick={() => setCategory(item)}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-extrabold transition",
                category === item
                  ? "border-ink bg-ink text-ivory"
                  : "border-ink/10 bg-white/70 text-ink/68 hover:border-masala/35 hover:text-ink",
              )}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          {visiblePlans.map((plan) => (
            <PackageCard
              key={plan.id}
              plan={plan}
              onSelect={selectPlan}
              compact
              selected={selectedPlan.id === plan.id}
            />
          ))}
        </div>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="overflow-hidden rounded-lg border border-ink/10 bg-white shadow-soft">
          <div className="border-b border-ink/10 bg-ink px-5 py-4 text-white">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-saffron">
              Your order
            </p>
            <p className="mt-1 text-sm font-bold text-white/66">
              Customize add-ons, then continue.
            </p>
          </div>

          <div className="p-5">
            <div className="flex gap-4">
              <div className="relative size-24 shrink-0 overflow-hidden rounded-lg bg-ink">
                <Image
                  src={selectedPlan.image}
                  alt={selectedPlan.name}
                  fill
                  className="object-cover"
                  sizes="96px"
                />
              </div>
              <div className="min-w-0 flex-1">
                <StatusPill tone={selectedPlan.accent === "leaf" ? "green" : "amber"}>
                  {selectedPlan.category}
                </StatusPill>
                <h2 className="mt-2 font-display text-2xl font-black leading-tight">
                  {selectedPlan.name}
                </h2>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-bold text-ink/56">
                  <span>{selectedPlan.cadence}</span>
                  <span>{formatCurrency(selectedPlan.price)}</span>
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-2">
              {selectedPlan.includes.slice(0, 4).map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm font-bold text-ink/72">
                  <span className="grid size-5 place-items-center rounded-full bg-mint text-leaf">
                    <Check size={13} />
                  </span>
                  {item}
                </div>
              ))}
              {hiddenIncludes ? (
                <p className="pl-7 text-xs font-extrabold text-ink/46">
                  +{hiddenIncludes} more included
                </p>
              ) : null}
            </div>

            <div className="mt-5">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-ink/45">
                  Add-ons
                </p>
                <p className="text-xs font-bold text-ink/45">
                  {selectedAddOns.length} selected
                </p>
              </div>
              <div className="grid max-h-44 gap-2 overflow-y-auto pr-1">
                {selectedPlan.addOns.map((addOn) => {
                  const active = selectedAddOns.includes(addOn.id);

                  return (
                    <button
                      key={addOn.id}
                      onClick={() => toggleAddOn(addOn.id)}
                      className={cn(
                        "flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition",
                        active
                          ? "border-leaf bg-mint/70"
                          : "border-ink/10 bg-rose/35 hover:border-masala/30",
                      )}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-extrabold">{addOn.name}</span>
                        <span className="block truncate text-xs font-bold text-ink/52">
                          {addOn.description}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-black">
                        {addOn.price === 0 ? "Free" : `+${formatCurrency(addOn.price)}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 rounded-lg border border-ink/10 bg-[#f7f6f2] p-4">
              <div className="flex justify-between text-sm font-bold text-ink/58">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="mt-3 flex items-end justify-between border-t border-ink/10 pt-3">
                <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-masala">
                  Package total
                </span>
                <span className="font-display text-3xl font-black">{formatCurrency(subtotal)}</span>
              </div>
            </div>

            <ButtonLink href={checkoutHref} className="mt-4 w-full rounded-full">
              <ShoppingBag size={18} />
              Continue to checkout
              <ArrowRight size={18} />
            </ButtonLink>
          </div>
        </div>
      </aside>
    </div>
  );
}
