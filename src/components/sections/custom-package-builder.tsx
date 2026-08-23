"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarDays, Minus, Plus, ShoppingBag } from "lucide-react";
import { usePackageCart } from "@/components/providers/package-cart-provider";
import { Button } from "@/components/ui/button";
import type { CustomPackageConfig } from "@/lib/cart-lines";
import {
  belowMinimumItems,
  customDeliveryDayCount,
  priceCustomPackage,
  type CustomPackageItemOption,
} from "@/lib/custom-package";
import {
  MAX_CUSTOM_ITEM_QUANTITY,
  makePackageCartLineId,
  type PackageCartItemInput,
} from "@/lib/package-cart";
import { nextEligiblePackageStartInput, packageStartDateIssue } from "@/lib/package-schedule";
import { formatCurrency } from "@/lib/utils";

function initialRequiredQuantities(items: CustomPackageItemOption[]) {
  return Object.fromEntries(
    items.filter((item) => item.required).map((item) => [item.id, item.minQuantity]),
  );
}

function isRoti(item: CustomPackageItemOption) {
  return item.name.trim().toLowerCase() === "roti";
}

function minimumLabel(item: CustomPackageItemOption) {
  return `Min ${item.minQuantity} ${item.unitLabel}`;
}

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
  const { items: cartItems, hydrated, registerCustomItems, addItem, updateItem, openCart } =
    usePackageCart();
  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    initialRequiredQuantities(items),
  );
  const [startDate, setStartDate] = useState(nextEligiblePackageStartInput());
  const [loadedEdit, setLoadedEdit] = useState(false);

  useEffect(() => {
    registerCustomItems(items, config);
  }, [config, items, registerCustomItems]);

  if (hydrated && !loadedEdit) {
    const existing = editLineId ? cartItems.find((item) => item.lineId === editLineId) : undefined;

    if (existing?.kind === "custom") {
      setQuantities(Object.fromEntries(existing.items.map((entry) => [entry.itemId, entry.quantity])));
      setStartDate(existing.startDate);
    }

    setLoadedEdit(true);
  }

  const selections = useMemo(
    () => items.map((item) => ({ itemId: item.id, quantity: quantities[item.id] ?? 0 })),
    [items, quantities],
  );
  const deliveryDayCount = customDeliveryDayCount(config.customMonthlyDays);
  const pricing = priceCustomPackage(selections, items, deliveryDayCount);
  const minimumFailures = belowMinimumItems(selections, items);
  const startDateError = packageStartDateIssue(startDate);

  function setQuantity(itemId: string, value: number) {
    setQuantities((current) => ({
      ...current,
      [itemId]: Math.max(0, Math.min(MAX_CUSTOM_ITEM_QUANTITY, Math.round(value) || 0)),
    }));
  }

  function decreaseQuantity(item: CustomPackageItemOption, quantity: number) {
    if (item.required) {
      setQuantity(item.id, Math.max(item.minQuantity, quantity - 1));
      return;
    }

    setQuantity(item.id, quantity <= item.minQuantity ? 0 : quantity - 1);
  }

  function increaseQuantity(item: CustomPackageItemOption, quantity: number) {
    setQuantity(item.id, quantity === 0 ? item.minQuantity : quantity + 1);
  }

  function save() {
    if (minimumFailures.length) {
      toast.error("Check the minimum portions", {
        description: minimumFailures
          .map((item) => `${item.name}: at least ${item.minQuantity} ${item.unitLabel}`)
          .join(". "),
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
      cadence: "MONTHLY",
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
            Please choose one of our monthly or student plans for now.
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
            Set the portions for one day&apos;s tiffin. Minimum portions protect the quality and
            value of every meal.
          </p>

          <div className="mt-7 divide-y divide-ink/10 border-y border-ink/10">
            {items.map((item) => {
              const quantity = quantities[item.id] ?? 0;
              const lineTotal = item.pricePerUnit * quantity;
              const hasMinimumError = minimumFailures.some((failure) => failure.id === item.id);

              return (
                <div key={item.id} className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_11rem_5rem] sm:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-display text-lg font-black">{item.name}</p>
                      {item.required ? (
                        <span className="rounded-full bg-rose px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-masala">
                          Required
                        </span>
                      ) : null}
                      <span className="rounded-full border border-ink/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.1em] text-ink/55">
                        {minimumLabel(item)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs font-bold text-ink/50">
                      {formatCurrency(item.pricePerUnit)} per {item.unitLabel}
                    </p>
                  </div>

                  {isRoti(item) ? (
                    <div className="flex items-center justify-start gap-2 sm:justify-center">
                      <button
                        type="button"
                        aria-label={`Decrease ${item.name}`}
                        onClick={() => decreaseQuantity(item, quantity)}
                        className="grid size-9 place-items-center rounded-button border border-ink/10 bg-white transition hover:border-saffron disabled:opacity-40"
                        disabled={item.required ? quantity <= item.minQuantity : quantity <= 0}
                      >
                        <Minus size={15} />
                      </button>
                      <label className="sr-only" htmlFor={`qty-${item.id}`}>
                        {item.name} quantity in {item.unitLabel}
                      </label>
                      <input
                        id={`qty-${item.id}`}
                        type="number"
                        min={item.required ? item.minQuantity : 0}
                        max={MAX_CUSTOM_ITEM_QUANTITY}
                        step={1}
                        value={quantity}
                        onChange={(event) => setQuantity(item.id, Number(event.target.value))}
                        aria-invalid={hasMinimumError}
                        className="h-9 w-16 rounded-button border border-ink/12 bg-ivory text-center text-sm font-black"
                      />
                      <button
                        type="button"
                        aria-label={`Increase ${item.name}`}
                        onClick={() => increaseQuantity(item, quantity)}
                        className="grid size-9 place-items-center rounded-button border border-ink/10 bg-white transition hover:border-saffron"
                      >
                        <Plus size={15} />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <label className="sr-only" htmlFor={`qty-${item.id}`}>
                        {item.name} quantity in {item.unitLabel}
                      </label>
                      <input
                        id={`qty-${item.id}`}
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={MAX_CUSTOM_ITEM_QUANTITY}
                        step={1}
                        value={quantity === 0 ? "" : quantity}
                        placeholder={minimumLabel(item)}
                        onChange={(event) => setQuantity(item.id, Number(event.target.value))}
                        aria-invalid={hasMinimumError}
                        aria-describedby={hasMinimumError ? `minimum-${item.id}` : undefined}
                        className="h-10 w-full rounded-button border border-ink/12 bg-ivory px-3 text-sm font-black placeholder:text-ink/40"
                      />
                      {hasMinimumError ? (
                        <p id={`minimum-${item.id}`} className="mt-1 text-xs font-bold text-masala">
                          Minimum is {item.minQuantity} {item.unitLabel}.
                        </p>
                      ) : null}
                    </div>
                  )}

                  <p className="text-right text-sm font-black">{formatCurrency(lineTotal)}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm font-black uppercase tracking-[0.14em] text-ink/45">Per day</p>
            <p className="font-display text-2xl font-black">{formatCurrency(pricing.perDay)}</p>
          </div>
        </div>

        <div className="rounded-lg border border-ink/10 bg-ink p-6 text-ivory shadow-soft lg:sticky lg:top-24 lg:p-8">
          <h2 className="font-display text-2xl font-black">Monthly custom package</h2>
          <div className="mt-5 rounded-lg border border-white/15 bg-white/10 p-4">
            <p className="font-display text-lg font-black">{deliveryDayCount} delivery days</p>
            <p className="mt-1 text-xs font-bold text-ivory/60">
              Your daily plate is prepared across the full monthly delivery cycle.
            </p>
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
            {startDateError ? <p className="mt-2 text-xs font-bold text-saffron">{startDateError}</p> : null}
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

          {minimumFailures.length ? (
            <p className="mt-5 rounded-button bg-white/10 p-3 text-xs font-bold text-saffron">
              {minimumFailures
                .map((item) => `${item.name}: at least ${item.minQuantity} ${item.unitLabel}`)
                .join(". ")}
            </p>
          ) : null}

          <Button
            type="button"
            onClick={save}
            disabled={!loadedEdit || Boolean(minimumFailures.length) || pricing.perDay <= 0 || Boolean(startDateError)}
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
