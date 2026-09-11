"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarDays, ChefHat, Minus, Plus, ShoppingBag, Sparkles } from "lucide-react";
import { usePackageCart } from "@/components/providers/package-cart-provider";
import { Button } from "@/components/ui/button";
import { HolidayAvailabilityNotice } from "@/components/schedule/holiday-availability-notice";
import type { CustomPackageConfig } from "@/lib/cart-lines";
import {
  customDeliveryDayCount,
  priceCustomPackage,
  validateCustomPackageSelections,
  type CustomPackageItemOption,
} from "@/lib/custom-package";
import {
  MAX_CUSTOM_ITEM_QUANTITY,
  makePackageCartLineId,
  type PackageCartItemInput,
} from "@/lib/package-cart";
import { packageStartDateIssue, type PackageScheduleAvailability } from "@/lib/package-schedule";
import { formatCurrency } from "@/lib/utils";

type ItemCategory = {
  id: string;
  name: string;
  description: string;
  required: boolean;
  quantityControl: "COUNTER" | "INPUT";
  items: CustomPackageItemOption[];
};

function groupedCategories(items: CustomPackageItemOption[]): ItemCategory[] {
  const byId = new Map<string, ItemCategory>();
  for (const item of items) {
    const category = byId.get(item.categoryId) ?? {
      id: item.categoryId,
      name: item.categoryName,
      description: item.categoryDescription,
      required: item.categoryRequired,
      quantityControl: item.quantityControl,
      items: [],
    };
    category.items.push(item);
    byId.set(item.categoryId, category);
  }
  return [...byId.values()];
}

function minimumLabel(item: CustomPackageItemOption) {
  return `Minimum ${item.minQuantity} ${item.unitLabel}`;
}

function failureMessage(failures: ReturnType<typeof validateCustomPackageSelections>) {
  return failures
    .map((failure) =>
      failure.type === "category"
        ? `Choose one ${failure.name} option.`
        : `${failure.name}: at least ${failure.minQuantity} ${failure.unitLabel}.`,
    )
    .join(" ");
}

export function CustomPackageBuilder({
  items,
  config,
  editLineId,
  availability,
}: {
  items: CustomPackageItemOption[];
  config: CustomPackageConfig;
  editLineId?: string;
  availability: PackageScheduleAvailability;
}) {
  const router = useRouter();
  const { items: cartItems, hydrated, registerCustomItems, addItem, updateItem, openCart } = usePackageCart();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [startDate, setStartDate] = useState(availability.earliestStartDate);
  const [loadedEdit, setLoadedEdit] = useState(false);
  const categories = useMemo(() => groupedCategories(items), [items]);

  useEffect(() => {
    registerCustomItems(items, config);
  }, [config, items, registerCustomItems]);

  useEffect(() => {
    if (!hydrated || loadedEdit) return;
    const existing = editLineId ? cartItems.find((item) => item.lineId === editLineId) : undefined;
    startTransition(() => {
      if (existing?.kind === "custom") {
        setQuantities(Object.fromEntries(existing.items.map((entry) => [entry.itemId, entry.quantity])));
        setStartDate(existing.startDate);
      }
      setLoadedEdit(true);
    });
  }, [cartItems, editLineId, hydrated, loadedEdit]);

  const selections = useMemo(
    () => items.map((item) => ({ itemId: item.id, quantity: quantities[item.id] ?? 0 })),
    [items, quantities],
  );
  const deliveryDayCount = customDeliveryDayCount(config.customMonthlyDays);
  const pricing = priceCustomPackage(selections, items, deliveryDayCount);
  const validationFailures = validateCustomPackageSelections(selections, items);
  const startDateError = packageStartDateIssue(
    startDate,
    availability.deliveryWeekdays,
    availability.holidays,
    availability.earliestStartDate,
  );

  function setQuantity(itemId: string, value: number) {
    setQuantities((current) => ({
      ...current,
      [itemId]: Math.max(0, Math.min(MAX_CUSTOM_ITEM_QUANTITY, Math.round(value) || 0)),
    }));
  }

  function decreaseQuantity(item: CustomPackageItemOption, quantity: number) {
    setQuantity(item.id, quantity <= item.minQuantity ? 0 : quantity - 1);
  }

  function increaseQuantity(item: CustomPackageItemOption, quantity: number) {
    setQuantity(item.id, quantity === 0 ? item.minQuantity : quantity + 1);
  }

  function save() {
    if (validationFailures.length) {
      toast.error("Complete your plate", { description: failureMessage(validationFailures) });
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
          <p className="mt-3 text-sm font-bold text-ink/60">Please choose one of our monthly or student plans for now.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="section">
      <div className="section-shell grid gap-8 lg:grid-cols-[minmax(0,1.45fr)_minmax(21rem,0.8fr)] lg:items-start">
        <div className="space-y-7">
          <div>
            <div className="flex items-center gap-2 text-saffron"><Sparkles size={16} /><p className="text-xs font-black uppercase tracking-[0.16em]">Your monthly tiffin</p></div>
            <h2 className="mt-3 font-display text-3xl font-black sm:text-4xl">Build your plate, your way.</h2>
            <p className="mt-3 max-w-2xl text-sm font-bold leading-6 text-ink/58">Choose one option from each required group, then set the portions that feel right for one day.</p>
          </div>

          {categories.map((category, categoryIndex) => {
            const categoryFailure = validationFailures.some((failure) => failure.type === "category" && failure.id === category.id);
            return (
              <section key={category.id} className="overflow-hidden rounded-lg border border-ink/10 bg-white shadow-soft">
                <header className="flex flex-wrap items-end justify-between gap-4 border-b border-ink/8 bg-ivory/65 px-5 py-5 sm:px-6">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-saffron">{String(categoryIndex + 1).padStart(2, "0")} / {category.required ? "Required choice" : "Optional choice"}</p>
                    <h3 className="mt-1 font-display text-2xl font-black">{category.name}</h3>
                    {category.description ? <p className="mt-1 text-sm font-bold text-ink/55">{category.description}</p> : null}
                  </div>
                  <span className={category.required ? "rounded-full bg-ink px-3 py-1.5 text-xs font-black text-white" : "rounded-full border border-ink/12 px-3 py-1.5 text-xs font-black text-ink/55"}>{category.required ? "Choose one" : "Your call"}</span>
                </header>
                <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
                  {category.items.map((item) => {
                    const quantity = quantities[item.id] ?? 0;
                    const selected = quantity > 0;
                    const minimumFailure = validationFailures.some((failure) => failure.type === "minimum" && failure.id === item.id);
                    const inputId = `qty-${item.id}`;
                    return (
                      <article key={item.id} className={`group overflow-hidden rounded-lg border transition-all duration-300 ${selected ? "-translate-y-0.5 border-saffron bg-rose/30 shadow-[0_15px_30px_rgba(255,122,26,0.13)]" : "border-ink/10 bg-white hover:-translate-y-0.5 hover:border-ink/25 hover:shadow-soft"}`}>
                        <div className="grid min-h-28 grid-cols-[7rem_minmax(0,1fr)] bg-ink/[0.025]">
                          {item.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element -- customer content selected by admin
                            <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                          ) : <div className="grid place-items-center bg-ink text-saffron"><ChefHat size={28} strokeWidth={1.7} /></div>}
                          <div className="min-w-0 p-4">
                            <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h4 className="font-display text-lg font-black leading-tight">{item.name}</h4>{item.description ? <p className="mt-1 line-clamp-2 text-xs font-bold leading-5 text-ink/55">{item.description}</p> : null}</div>{selected ? <span className="shrink-0 rounded-full bg-saffron px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-ink">Selected</span> : null}</div>
                          </div>
                        </div>
                        <div className="border-t border-ink/8 p-4">
                          {category.quantityControl === "COUNTER" ? (
                            <div className="flex items-center gap-2"><button type="button" aria-label={`Decrease ${item.name}`} onClick={() => decreaseQuantity(item, quantity)} disabled={quantity <= 0} className="grid size-12 place-items-center rounded-button border border-ink/12 bg-white text-ink transition hover:border-saffron hover:text-saffron disabled:cursor-not-allowed disabled:opacity-35"><Minus size={19} /></button><label className="sr-only" htmlFor={inputId}>{item.name} quantity in {item.unitLabel}</label><input id={inputId} type="number" min={0} max={MAX_CUSTOM_ITEM_QUANTITY} value={quantity} onChange={(event) => setQuantity(item.id, Number(event.target.value))} aria-invalid={minimumFailure} className="h-12 w-16 rounded-button border border-ink/12 bg-ivory text-center text-base font-black" /><button type="button" aria-label={`Increase ${item.name}`} onClick={() => increaseQuantity(item, quantity)} className="grid size-12 place-items-center rounded-button bg-saffron text-ink shadow-[0_8px_20px_rgba(255,122,26,0.25)] transition hover:scale-[1.04] active:scale-95"><Plus size={19} /></button></div>
                          ) : (
                            <div className="min-w-0"><label className="sr-only" htmlFor={inputId}>{item.name} quantity in {item.unitLabel}</label><input id={inputId} type="number" inputMode="numeric" min={0} max={MAX_CUSTOM_ITEM_QUANTITY} step={1} value={quantity || ""} placeholder={`Enter ${item.minQuantity}+ ${item.unitLabel}`} onChange={(event) => setQuantity(item.id, Number(event.target.value))} aria-invalid={minimumFailure} className="h-12 w-full rounded-button border border-ink/12 bg-ivory px-3 text-sm font-black placeholder:text-ink/38 focus:border-saffron focus:outline-none" /><p className={`mt-1.5 text-[11px] font-bold ${minimumFailure ? "text-masala" : "text-ink/48"}`}>{minimumFailure ? minimumLabel(item) : `Enter any amount from ${item.minQuantity} ${item.unitLabel}.`}</p></div>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
                {categoryFailure ? <p className="border-t border-masala/15 bg-rose px-5 py-3 text-xs font-black text-masala">Choose one option from {category.name} to continue.</p> : null}
              </section>
            );
          })}
        </div>

        <aside className="rounded-lg border border-ink/10 bg-ink p-6 text-ivory shadow-soft lg:sticky lg:top-24 lg:p-7">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-saffron">Monthly custom package</p><h2 className="mt-2 font-display text-2xl font-black">Your tiffin, counted clearly.</h2>
          <HolidayAvailabilityNotice availability={availability} tone="dark" className="mt-5" />
          <div className="mt-5 rounded-lg border border-white/12 bg-white/10 p-4"><p className="font-display text-lg font-black">{deliveryDayCount} delivery days</p><p className="mt-1 text-xs font-bold leading-5 text-ivory/60">Your selected portions are prepared for every delivery day this month.</p></div>
          <div className="mt-6"><label htmlFor="custom-start-date" className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-ivory/60"><CalendarDays size={14} /> Start date</label><input id="custom-start-date" type="date" value={startDate} min={availability.earliestStartDate} onChange={(event) => setStartDate(event.target.value)} className="mt-2 h-11 w-full rounded-button border border-white/15 bg-white/10 px-3 text-sm font-extrabold text-ivory" />{startDateError ? <p className="mt-2 text-xs font-bold text-saffron">{startDateError}</p> : null}</div>
          <div className="mt-7 border-t border-white/12 pt-5"><div className="flex items-center justify-between"><p className="text-sm font-black uppercase tracking-[0.14em] text-ivory/55">Monthly total</p><p className="font-display text-3xl font-black">{formatCurrency(pricing.total)}</p></div></div>
          {validationFailures.length ? <p className="mt-5 rounded-button bg-white/10 p-3 text-xs font-bold leading-5 text-saffron">{failureMessage(validationFailures)}</p> : null}
          <Button type="button" onClick={save} disabled={!loadedEdit || Boolean(validationFailures.length) || pricing.perDay <= 0 || Boolean(startDateError)} className="mt-5 w-full"><ShoppingBag size={18} />{editLineId ? "Save changes" : "Add to cart"}</Button>
        </aside>
      </div>
    </section>
  );
}
