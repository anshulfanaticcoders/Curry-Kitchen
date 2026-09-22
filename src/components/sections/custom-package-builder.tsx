"use client";

import { startTransition, useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowDown, ArrowRight, CalendarDays, Check, ChefHat, Clock3, Info, Minus, Plus, ShoppingBag } from "lucide-react";
import { usePackageCart } from "@/components/providers/package-cart-provider";
import { Button } from "@/components/ui/button";
import { HolidayAvailabilityNotice } from "@/components/schedule/holiday-availability-notice";
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
import { DEFAULT_DELIVERY_WINDOW, formatInputDate, formatOrderCutoff, packageStartDateIssue, type PackageScheduleAvailability } from "@/lib/package-schedule";
import { formatCurrency } from "@/lib/utils";
import styles from "./custom-package-builder.module.css";

type ItemCategory = {
  id: string;
  name: string;
  items: CustomPackageItemOption[];
};

function groupedCategories(items: CustomPackageItemOption[]): ItemCategory[] {
  const byId = new Map<string, ItemCategory>();
  for (const item of items) {
    const category = byId.get(item.categoryId) ?? {
      id: item.categoryId,
      name: item.categoryName,
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

function BuilderDeliveryNotice({ availability }: { availability: PackageScheduleAvailability }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const tooltipId = useId();
  const cutoff = formatOrderCutoff(availability.orderCutoff);

  useEffect(() => {
    if (!open) return;
    function dismiss(event: PointerEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  return (
    <div className={styles.deliveryNotice}>
      <div ref={ref} className={styles.cutoff} onMouseLeave={() => setOpen(false)}>
        <p>After {cutoff}: order for the day after tomorrow.</p>
        <button type="button" className={styles.infoButton} aria-label="About the order cutoff" aria-expanded={open} aria-describedby={open ? tooltipId : undefined} onMouseEnter={() => setOpen(true)} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)} onClick={() => setOpen(true)}><Info size={17} /></button>
        <div id={tooltipId} role="tooltip" className={styles.tooltip} hidden={!open}>
          At or after {cutoff} Pacific Time, orders start no earlier than the day after tomorrow so our kitchen has time to prepare. Non-delivery days and kitchen holidays move the start to the next available delivery day.
        </div>
      </div>
      <p className={styles.deliveryWindow}><Clock3 size={14} aria-hidden="true" /> Delivery: {availability.deliveryWindow ?? DEFAULT_DELIVERY_WINDOW}</p>
    </div>
  );
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
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const builderRef = useRef<HTMLElement>(null);
  const summaryRef = useRef<HTMLElement>(null);
  const [showMobileReview, setShowMobileReview] = useState(false);
  const [summaryFits, setSummaryFits] = useState(false);
  const visibleItems = categories.flatMap((category) =>
    activeCategory === null || category.id === activeCategory ? category.items : [],
  );

  useEffect(() => {
    const builder = builderRef.current;
    const summary = summaryRef.current;
    if (!builder || !summary) return;
    let builderVisible = false;
    let summaryVisible = false;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === builder) builderVisible = entry.isIntersecting;
        if (entry.target === summary) summaryVisible = entry.isIntersecting;
      }
      setShowMobileReview(builderVisible && !summaryVisible);
    });
    observer.observe(builder);
    observer.observe(summary);
    // Tall summaries stay in page flow, so every item remains reachable without an inner scrollbar.
    const measureSummary = () => {
      setSummaryFits(summary.getBoundingClientRect().height <= window.innerHeight - 120);
    };
    const resizeObserver = new ResizeObserver(measureSummary);
    resizeObserver.observe(summary);
    window.addEventListener("resize", measureSummary);
    return () => {
      observer.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener("resize", measureSummary);
    };
  }, [items.length]);

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
    <section ref={builderRef} className={styles.builder} aria-labelledby="custom-builder-title">
      <div className={styles.shell}>
        <header className={styles.heading}>
          <div><p className={styles.eyebrow}>Your monthly tiffin</p><h2 id="custom-builder-title">Build your plate, your way.</h2><p className={styles.subtitle}>Fresh favourites. Portions that suit you.</p></div>
          <a href="#custom-package-summary" className={styles.summaryLink}>Review package <ArrowDown size={16} /></a>
        </header>
        <div className={styles.layout}>
          <div className={styles.catalog}>
          <nav className={styles.categoryLinks} aria-label="Custom package categories">
              <button type="button" onClick={() => setActiveCategory(null)} aria-pressed={activeCategory === null} aria-controls="custom-item-grid">All</button>
              {categories.map((category) => {
                const selectedCount = category.items.filter((item) => (quantities[item.id] ?? 0) > 0).length;
                return <button type="button" key={category.id} onClick={() => setActiveCategory(category.id)} aria-pressed={activeCategory === category.id} aria-controls="custom-item-grid">
                  <span>{category.name}</span>
                  {selectedCount > 0 ? <span className={styles.categoryCount} aria-label={`${selectedCount} selected`}>{selectedCount}</span> : null}
                </button>;
              })}
          </nav>
                <div id="custom-item-grid" className={styles.itemGrid}>
                  {visibleItems.map((item) => {
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
                          {selected ? <span className={styles.selectedBadge}><Check size={14} aria-hidden="true" /><span className={styles.selectedText}>Selected</span></span> : null}
                        </div>
                        <div className={styles.itemBody}>
                          <div className={styles.categoryHeading}><span>{item.categoryName}</span><span className={styles.requirement} data-required={item.categoryRequired}>{item.categoryRequired ? <><Check size={11} aria-hidden="true" />Required</> : "Optional"}</span></div>
                          <h3>{item.name}</h3>{item.description ? <p>{item.description}</p> : null}
                        </div>
                        <div className={styles.itemControls}>
                          <label className={styles.quantityLabel} htmlFor={inputId}>Quantity <span>({item.unitLabel})</span></label>
                            <div className={styles.counter}><button type="button" aria-label={`Decrease ${item.name}`} onClick={() => decreaseQuantity(item, quantity)} disabled={quantity <= 0}><Minus size={18} /></button><input id={inputId} aria-label={`${item.name} quantity in ${item.unitLabel}`} aria-describedby={`${inputId}-hint`} type="number" inputMode="numeric" min={0} max={MAX_CUSTOM_ITEM_QUANTITY} value={quantity} onChange={(event) => setQuantity(item.id, Number(event.target.value))} aria-invalid={minimumFailure} /><button type="button" aria-label={`Increase ${item.name}`} onClick={() => increaseQuantity(item, quantity)} disabled={quantity >= MAX_CUSTOM_ITEM_QUANTITY}><Plus size={18} /></button></div>
                          <p id={`${inputId}-hint`} className={styles.quantityHint} data-invalid={minimumFailure}>{minimumLabel(item)}</p>
                        </div>
                      </article>
                    );
                  })}
                </div>
        </div>

        <aside ref={summaryRef} id="custom-package-summary" className={styles.summary} data-sticky={summaryFits} aria-labelledby="custom-summary-title">
          <div className={styles.summaryHeading}><ShoppingBag size={21} /><h2 id="custom-summary-title">Your tiffin</h2></div>
          <p className={styles.summaryCadence}>Monthly package · {deliveryDayCount} delivery days</p>
          {pricing.lines.length ? <ul className={styles.selectedItems} aria-label="Selected portions per delivery">
            {pricing.lines.map(({ item, quantity }) => <li key={item.id}><span>{item.name}</span><strong>{quantity} {item.unitLabel}</strong></li>)}
          </ul> : <p className={styles.summaryEmpty}>Your tiffin is empty.</p>}
          <BuilderDeliveryNotice availability={availability} />
          {availability.holidays.length ? <details className={styles.holidays}><summary>Kitchen closures ({availability.holidays.length})</summary><HolidayAvailabilityNotice availability={availability} tone="dark" className="mt-3" /></details> : null}
          <div className={styles.startDate}><label htmlFor="custom-start-date"><CalendarDays size={15} /> First delivery</label><input id="custom-start-date" type="date" value={startDate} min={availability.earliestStartDate} onChange={(event) => setStartDate(event.target.value)} aria-invalid={Boolean(startDateError)} aria-describedby={startDateError ? "custom-start-date-error custom-start-date-hint" : "custom-start-date-hint"} /><p id="custom-start-date-hint" className={styles.dateHint}>Earliest available: {formatInputDate(availability.earliestStartDate)}</p>{startDateError ? <p id="custom-start-date-error" className={styles.summaryError}>{startDateError}</p> : null}</div>
          <div className={styles.total}><p>Monthly total</p><output aria-live="polite" aria-atomic="true">{formatCurrency(pricing.total)}</output></div>
          {validationFailures.length ? <p className={styles.summaryError}>{failureMessage(validationFailures)}</p> : null}
          <Button type="button" onClick={save} disabled={!loadedEdit || Boolean(validationFailures.length) || pricing.perDay <= 0 || Boolean(startDateError)} className="mt-5 w-full"><ShoppingBag size={18} />{editLineId ? "Save changes" : "Add to cart"}</Button>
        </aside>
        </div>
      </div>
      {showMobileReview ? <div className={styles.mobileReview}><div><span>Monthly total</span><strong>{formatCurrency(pricing.total)}</strong></div><a href="#custom-package-summary">Review tiffin <ArrowRight size={17} /></a></div> : null}
    </section>
  );
}
