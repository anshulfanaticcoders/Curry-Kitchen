"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowDown, CalendarDays, Check, ChefHat, Minus, Plus, ShoppingBag } from "lucide-react";
import { usePackageCart } from "@/components/providers/package-cart-provider";
import { Button } from "@/components/ui/button";
import { HolidayAvailabilityNotice } from "@/components/schedule/holiday-availability-notice";
import { DeliveryPolicyNotice } from "@/components/schedule/delivery-policy-notice";
import { useLiveAvailability } from "@/components/schedule/use-live-availability";
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
import styles from "./custom-package-builder.module.css";

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
  availability: initialAvailability,
}: {
  items: CustomPackageItemOption[];
  config: CustomPackageConfig;
  editLineId?: string;
  availability: PackageScheduleAvailability;
}) {
  const availability = useLiveAvailability(initialAvailability);
  const router = useRouter();
  const { items: cartItems, hydrated, registerCustomItems, addItem, updateItem, openCart } = usePackageCart();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [startDate, setStartDate] = useState(availability.earliestStartDate);
  const [loadedEdit, setLoadedEdit] = useState(false);
  const categories = useMemo(() => groupedCategories(items), [items]);
  const [activeCategory, setActiveCategory] = useState(categories[0]?.id ?? "");

  useEffect(() => {
    let frame = 0;
    function updateActiveCategory() {
      const marker = window.innerWidth < 1024 ? 200 : 140;
      let current = categories[0]?.id ?? "";
      for (const category of categories) {
        const section = document.getElementById(`custom-category-${category.id}`);
        if (section && section.getBoundingClientRect().top <= marker) current = category.id;
      }
      setActiveCategory(current);
      frame = 0;
    }
    function onScroll() {
      if (!frame) frame = requestAnimationFrame(updateActiveCategory);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [categories]);

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
    <section className={styles.builder} aria-labelledby="custom-builder-title">
      <div className={styles.shell}>
        <header className={styles.heading}>
          <div><p className={styles.eyebrow}>Your monthly tiffin</p><h2 id="custom-builder-title">Build your plate, your way.</h2></div>
          <a href="#custom-package-summary" className={styles.summaryLink}>Review package <ArrowDown size={16} /></a>
        </header>
        <div className={styles.layout}>
          <nav className={styles.categoryNav} aria-label="Custom package categories">
            <p className={styles.navLabel}>Categories</p>
            <div className={styles.categoryLinks}>
              {categories.map((category) => {
                const selectedCount = category.items.filter((item) => (quantities[item.id] ?? 0) > 0).length;
                return <a key={category.id} href={`#custom-category-${category.id}`} aria-current={activeCategory === category.id ? "location" : undefined}>
                  <span>{category.name}</span>
                  {selectedCount > 0 ? <span className={styles.categoryCount} aria-label={`${selectedCount} selected`}>{selectedCount}</span> : null}
                </a>;
              })}
            </div>
          </nav>
          <div className={styles.catalog}>
          {categories.map((category) => {
            const categoryFailure = validationFailures.some((failure) => failure.type === "category" && failure.id === category.id);
            return (
              <section key={category.id} id={`custom-category-${category.id}`} aria-labelledby={`category-heading-${category.id}`} className={styles.category}>
                <header className={styles.categoryHeading}>
                  <div>
                    <h3 id={`category-heading-${category.id}`}>{category.name}</h3>
                    {category.description ? <p>{category.description}</p> : null}
                  </div>
                  <span className={styles.requirement}>{category.required ? "Required" : "Optional"}</span>
                </header>
                <div className={styles.itemGrid}>
                  {category.items.map((item) => {
                    const quantity = quantities[item.id] ?? 0;
                    const selected = quantity > 0;
                    const minimumFailure = validationFailures.some((failure) => failure.type === "minimum" && failure.id === item.id);
                    const inputId = `qty-${item.id}`;
                    return (
                      <article key={item.id} className={styles.itemCard} data-selected={selected}>
                        <div className={styles.itemImage}>
                          {item.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element -- customer content selected by admin
                            <img src={item.imageUrl} alt={item.name} loading="lazy" />
                          ) : <div className={styles.imagePlaceholder}><ChefHat size={36} strokeWidth={1.5} aria-hidden="true" /></div>}
                          {selected ? <span className={styles.selectedBadge}><Check size={13} />Selected</span> : null}
                        </div>
                        <div className={styles.itemBody}><h4>{item.name}</h4>{item.description ? <p>{item.description}</p> : null}</div>
                        <div className={styles.itemControls}>
                          <label className={styles.quantityLabel} htmlFor={inputId}>Quantity <span>({item.unitLabel})</span></label>
                          {category.quantityControl === "COUNTER" ? (
                            <div className={styles.counter}><button type="button" aria-label={`Decrease ${item.name}`} onClick={() => decreaseQuantity(item, quantity)} disabled={quantity <= 0}><Minus size={18} /></button><input id={inputId} aria-label={`${item.name} quantity in ${item.unitLabel}`} aria-describedby={`${inputId}-hint`} type="number" inputMode="numeric" min={0} max={MAX_CUSTOM_ITEM_QUANTITY} value={quantity} onChange={(event) => setQuantity(item.id, Number(event.target.value))} aria-invalid={minimumFailure} /><button type="button" aria-label={`Increase ${item.name}`} onClick={() => increaseQuantity(item, quantity)} disabled={quantity >= MAX_CUSTOM_ITEM_QUANTITY}><Plus size={18} /></button></div>
                          ) : (
                            <input id={inputId} aria-label={`${item.name} quantity in ${item.unitLabel}`} aria-describedby={`${inputId}-hint`} type="number" inputMode="numeric" min={0} max={MAX_CUSTOM_ITEM_QUANTITY} step={1} value={quantity || ""} placeholder={`Enter ${item.minQuantity}+ ${item.unitLabel}`} onChange={(event) => setQuantity(item.id, Number(event.target.value))} aria-invalid={minimumFailure} className={styles.quantityInput} />
                          )}
                          <p id={`${inputId}-hint`} className={styles.quantityHint} data-invalid={minimumFailure}>{minimumLabel(item)}</p>
                        </div>
                      </article>
                    );
                  })}
                </div>
                {categoryFailure ? <p className={styles.categoryHint}>Choose one option from {category.name} to continue.</p> : null}
              </section>
            );
          })}
        </div>

        <aside id="custom-package-summary" className={styles.summary} aria-labelledby="custom-summary-title">
          <div className={styles.summaryHeading}><ShoppingBag size={21} /><h2 id="custom-summary-title">Package summary</h2></div>
          <p className={styles.summaryCadence}>Monthly package · {deliveryDayCount} delivery days</p>
          {pricing.lines.length ? <ul className={styles.selectedItems} aria-label="Selected portions per delivery">
            {pricing.lines.map(({ item, quantity }) => <li key={item.id}><span>{item.name}</span><strong>{quantity} {item.unitLabel}</strong></li>)}
          </ul> : <p className={styles.summaryEmpty}>Your tiffin is empty.</p>}
          <DeliveryPolicyNotice availability={availability} tone="dark" className="mt-5" />
          <HolidayAvailabilityNotice availability={availability} tone="dark" className="mt-5" />
          <div className={styles.startDate}><label htmlFor="custom-start-date"><CalendarDays size={15} /> Start date</label><input id="custom-start-date" type="date" value={startDate} min={availability.earliestStartDate} onChange={(event) => setStartDate(event.target.value)} aria-invalid={Boolean(startDateError)} aria-describedby={startDateError ? "custom-start-date-error" : undefined} />{startDateError ? <p id="custom-start-date-error" className={styles.summaryError}>{startDateError}</p> : null}</div>
          <div className={styles.total}><p>Monthly total</p><output aria-live="polite" aria-atomic="true">{formatCurrency(pricing.total)}</output></div>
          {validationFailures.length ? <p className={styles.summaryError}>{failureMessage(validationFailures)}</p> : null}
          <Button type="button" onClick={save} disabled={!loadedEdit || Boolean(validationFailures.length) || pricing.perDay <= 0 || Boolean(startDateError)} className="mt-5 w-full"><ShoppingBag size={18} />{editLineId ? "Save changes" : "Add to cart"}</Button>
        </aside>
        </div>
      </div>
    </section>
  );
}
