"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarDays, Minus, Plus, ShoppingBag } from "lucide-react";
import { usePackageCart } from "@/components/providers/package-cart-provider";
import { Button } from "@/components/ui/button";
import type { CustomPackageConfig } from "@/lib/cart-lines";
import {
  customDeliveryDayCount,
  missingRequiredItems,
  priceCustomPackage,
  type CustomPackageItemOption,
} from "@/lib/custom-package";
import {
  MAX_CUSTOM_ITEM_QUANTITY,
  makePackageCartLineId,
  type CustomCartLine,
  type PackageCartItemInput,
} from "@/lib/package-cart";
import { nextEligiblePackageStartInput, packageStartDateIssue } from "@/lib/package-schedule";
import { formatCurrency } from "@/lib/utils";

type Cadence = CustomCartLine["cadence"];

const CADENCES: Array<{ value: Cadence; label: string; blurb: string }> = [
  { value: "WEEKLY", label: "Weekly", blurb: "One week of deliveries." },
  { value: "MONTHLY", label: "Monthly", blurb: "A full month of deliveries." },
];

export function CustomPackageBuilder({
  items,
  config,
  editLineId,
}: {
  items: CustomPackageItemOption[];
  config: CustomPackageConfig;
  editLineId?: string;
}) {
  const router = useRouter();
  const {
    items: cartItems,
    hydrated,
    registerCustomItems,
    addItem,
    updateItem,
    openCart,
  } = usePackageCart();

  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [cadence, setCadence] = useState<Cadence>("MONTHLY");
  const [startDate, setStartDate] = useState(nextEligiblePackageStartInput());
  const [loadedEdit, setLoadedEdit] = useState(false);

  useEffect(() => {
    registerCustomItems(items, config);
  }, [config, items, registerCustomItems]);

  // Seed the form from the cart line being edited, once the stored cart has
  // loaded. Adjusting state during render (rather than in an effect) avoids
  // painting the empty form for a frame before the saved values land.
  if (hydrated && !loadedEdit) {
    const existing = editLineId
      ? cartItems.find((item) => item.lineId === editLineId)
      : undefined;

    if (existing?.kind === "custom") {
      setQuantities(
        Object.fromEntries(existing.items.map((entry) => [entry.itemId, entry.quantity])),
      );
      setCadence(existing.cadence);
      setStartDate(existing.startDate);
    }

    setLoadedEdit(true);
  }

  const selections = useMemo(
    () => items.map((item) => ({ itemId: item.id, quantity: quantities[item.id] ?? 0 })),
    [items, quantities],
  );
  const deliveryDayCount = customDeliveryDayCount(
    cadence,
    config.deliveryWeekdayCount,
    config.customMonthlyDays,
  );
  const pricing = priceCustomPackage(selections, items, deliveryDayCount);
  const missing = missingRequiredItems(selections, items);
  const startDateError = packageStartDateIssue(startDate);

  function setQuantity(itemId: string, value: number) {
    setQuantities((current) => ({
      ...current,
      [itemId]: Math.max(0, Math.min(MAX_CUSTOM_ITEM_QUANTITY, Math.round(value) || 0)),
    }));
  }

  function save() {
    if (missing.length) {
      toast.error("Add the required items", {
        description: `${missing.map((item) => item.name).join(", ")} must be included.`,
      });
      return;
    }

    if (pricing.perDay <= 0) {
      toast.error("Your package is empty", { description: "Add at least one item." });
      return;
    }

    if (startDateError) {
      toast.error("Choose another start date", { description: startDateError });
      return;
    }

    const line: PackageCartItemInput = {
      kind: "custom",
      lineId: editLineId ?? makePackageCartLineId(),
      cadence,
      items: selections.filter((entry) => entry.quantity > 0),
      startDate,
    };

    if (editLineId) {
      updateItem(line);
      toast.success("Custom package updated.");
    } else if (!addItem(line)) {
      toast.error("Your cart is full", { description: "Remove a package before adding another." });
      return;
    } else {
      toast.success("Custom package added to cart.");
    }

    openCart();
    router.push("/checkout");
  }

  if (!items.length) {
    return (
      <section className="section">
        <div className="section-shell rounded-lg border border-ink/10 bg-ivory p-10 text-center">
          <h2 className="font-display text-3xl font-black">Custom packages are not available yet.</h2>
          <p className="mt-3 text-sm font-bold text-ink/60">
            Please choose one of our weekly, monthly, or student plans for now.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="section">
      <div className="section-shell grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-start">
        <div className="rounded-lg border border-ink/10 bg-white p-6 shadow-soft lg:p-8">
          <h2 className="font-display text-3xl font-black">Build your plate</h2>
          <p className="mt-2 text-sm font-bold text-ink/58">
            Set how much of each item you want in a single day&rsquo;s tiffin.
          </p>

          <div className="mt-7 divide-y divide-ink/10 border-y border-ink/10">
            {items.map((item) => {
              const quantity = quantities[item.id] ?? 0;
              const lineTotal = item.pricePerUnit * quantity;

              return (
                <div key={item.id} className="flex flex-wrap items-center gap-4 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-lg font-black">
                      {item.name}
                      {item.required ? (
                        <span className="ml-2 rounded-full bg-rose px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-masala">
                          Required
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-1 text-xs font-bold text-ink/50">
                      {formatCurrency(item.pricePerUnit)} per {item.unitLabel}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label={`Decrease ${item.name}`}
                      onClick={() => setQuantity(item.id, quantity - 1)}
                      className="grid size-9 place-items-center rounded-button border border-ink/10 bg-white transition hover:border-saffron disabled:opacity-40"
                      disabled={quantity <= 0}
                    >
                      <Minus size={15} />
                    </button>
                    <label className="sr-only" htmlFor={`qty-${item.id}`}>
                      {item.name} quantity in {item.unitLabel}
                    </label>
                    <input
                      id={`qty-${item.id}`}
                      type="number"
                      min={0}
                      max={MAX_CUSTOM_ITEM_QUANTITY}
                      step={1}
                      value={quantity}
                      onChange={(event) => setQuantity(item.id, Number(event.target.value))}
                      aria-invalid={item.required && quantity < 1}
                      className="h-9 w-16 rounded-button border border-ink/12 bg-ivory text-center text-sm font-black"
                    />
                    <button
                      type="button"
                      aria-label={`Increase ${item.name}`}
                      onClick={() => setQuantity(item.id, quantity + 1)}
                      className="grid size-9 place-items-center rounded-button border border-ink/10 bg-white transition hover:border-saffron"
                    >
                      <Plus size={15} />
                    </button>
                  </div>

                  <p className="w-20 shrink-0 text-right text-sm font-black">
                    {formatCurrency(lineTotal)}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm font-black uppercase tracking-[0.14em] text-ink/45">Per day</p>
            <p className="font-display text-2xl font-black">{formatCurrency(pricing.perDay)}</p>
          </div>
        </div>

        <div className="rounded-lg border border-ink/10 bg-ink p-6 text-ivory shadow-soft lg:p-8">
          <h2 className="font-display text-2xl font-black">How long?</h2>
          <div className="mt-5 grid gap-3">
            {CADENCES.map((option) => {
              const days = customDeliveryDayCount(
                option.value,
                config.deliveryWeekdayCount,
                config.customMonthlyDays,
              );

              return (
                <label
                  key={option.value}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition ${
                    cadence === option.value
                      ? "border-saffron bg-white/10"
                      : "border-white/15 hover:border-white/35"
                  }`}
                >
                  <input
                    type="radio"
                    name="cadence"
                    value={option.value}
                    checked={cadence === option.value}
                    onChange={() => setCadence(option.value)}
                    className="mt-1 size-4 accent-saffron"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-3">
                      <span className="font-display text-lg font-black">{option.label}</span>
                      <span className="text-sm font-black text-saffron">
                        {formatCurrency(pricing.perDay * days)}
                      </span>
                    </span>
                    <span className="mt-1 block text-xs font-bold text-ivory/55">
                      {option.blurb} {days} delivery days.
                    </span>
                  </span>
                </label>
              );
            })}
          </div>

          <div className="mt-6">
            <label
              htmlFor="custom-start-date"
              className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-ivory/60"
            >
              <CalendarDays size={14} /> Start date
            </label>
            <input
              id="custom-start-date"
              type="date"
              value={startDate}
              min={nextEligiblePackageStartInput()}
              onChange={(event) => setStartDate(event.target.value)}
              className="mt-2 h-11 w-full rounded-button border border-white/15 bg-white/10 px-3 text-sm font-extrabold text-ivory"
            />
            {startDateError ? (
              <p className="mt-2 text-xs font-bold text-saffron">{startDateError}</p>
            ) : null}
          </div>

          <div className="mt-7 border-t border-white/12 pt-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-black uppercase tracking-[0.14em] text-ivory/55">Total</p>
              <p className="font-display text-3xl font-black">{formatCurrency(pricing.total)}</p>
            </div>
            <p className="mt-1 text-xs font-bold text-ivory/50">
              {formatCurrency(pricing.perDay)} per day &times; {deliveryDayCount} delivery days
            </p>
          </div>

          {missing.length ? (
            <p className="mt-5 rounded-button bg-white/10 p-3 text-xs font-bold text-saffron">
              Add at least one unit of {missing.map((item) => item.name).join(", ")} to continue.
            </p>
          ) : null}

          <Button
            type="button"
            onClick={save}
            disabled={Boolean(missing.length) || pricing.perDay <= 0 || Boolean(startDateError)}
            className="mt-5 w-full"
          >
            <ShoppingBag size={18} />
            {editLineId ? "Save changes" : "Add to cart"}
          </Button>
        </div>
      </div>
    </section>
  );
}
