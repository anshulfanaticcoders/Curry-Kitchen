"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, Pencil, ShoppingBag, Trash2, X } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { usePackageCart } from "@/components/providers/package-cart-provider";
import { packageCartQuery } from "@/lib/package-cart";
import { formatCurrency } from "@/lib/utils";

function displayStartDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

export function PackageCartDrawer() {
  const {
    cartOpen,
    closeCart,
    items,
    plansById,
    removeItem,
    checkoutHref,
  } = usePackageCart();
  const subtotal = items.reduce((total, item) => {
    const plan = plansById[item.packageId];
    const addons = plan?.addOns.filter((addon) => item.addonIds.includes(addon.id)) ?? [];

    return total + (plan?.price ?? 0) + addons.reduce((sum, addon) => sum + addon.price, 0);
  }, 0);

  return (
    <AnimatePresence>
      {cartOpen ? (
        <motion.div
          className="fixed inset-0 z-[100]"
          initial="closed"
          animate="open"
          exit="closed"
        >
          <motion.button
            type="button"
            aria-label="Close cart"
            className="absolute inset-0 h-full w-full bg-ink/48 backdrop-blur-[2px]"
            variants={{ open: { opacity: 1 }, closed: { opacity: 0 } }}
            transition={{ duration: 0.24 }}
            onClick={closeCart}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Your package cart"
            className="absolute inset-y-0 right-0 flex w-full max-w-[31rem] flex-col border-l border-white/10 bg-ivory shadow-[-28px_0_80px_rgba(7,7,7,0.28)]"
            variants={{ open: { x: 0 }, closed: { x: "100%" } }}
            transition={{ type: "spring", stiffness: 330, damping: 34 }}
          >
            <div className="flex items-center justify-between border-b border-white/10 bg-ink px-6 py-5 text-white">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-saffron">Your order</p>
                <h2 className="mt-1 font-display text-3xl font-black">Tiffin cart</h2>
              </div>
              <button
                type="button"
                aria-label="Close cart"
                onClick={closeCart}
                className="grid size-10 place-items-center rounded-full border border-white/15 text-white transition hover:border-saffron hover:text-saffron"
              >
                <X size={19} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {items.length ? (
                <div className="divide-y divide-ink/10">
                  {items.map((item, index) => {
                    const plan = plansById[item.packageId];
                    const addons = plan?.addOns.filter((addon) => item.addonIds.includes(addon.id)) ?? [];
                    const lineTotal = (plan?.price ?? 0) + addons.reduce((sum, addon) => sum + addon.price, 0);
                    const editHref = `/packages?cart=${packageCartQuery(items)}&edit=${encodeURIComponent(item.lineId)}#build-plan`;

                    return (
                      <motion.article
                        key={item.lineId}
                        layout
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: 24 }}
                        className="p-5"
                      >
                        <div className="flex gap-4">
                          {plan ? (
                            <div className="relative size-16 shrink-0 overflow-hidden rounded-button bg-ink">
                              <Image src={plan.image} alt="" fill className="object-cover" sizes="64px" />
                            </div>
                          ) : (
                            <span className="grid size-16 shrink-0 place-items-center rounded-button bg-ink text-saffron">
                              <ShoppingBag size={22} />
                            </span>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-xs font-black uppercase tracking-[0.14em] text-masala">
                                  Package {index + 1}
                                </p>
                                <h3 className="mt-1 truncate font-display text-xl font-black">
                                  {plan?.name ?? "Package configuration"}
                                </h3>
                              </div>
                              <span className="shrink-0 text-sm font-black">{formatCurrency(lineTotal)}</span>
                            </div>
                            <p className="mt-2 line-clamp-2 text-xs font-bold leading-5 text-ink/55">
                              {addons.length ? addons.map((addon) => addon.name).join(", ") : "Add-ons loading"}
                            </p>
                            <p className="mt-2 flex items-center gap-1.5 text-xs font-extrabold text-leaf">
                              <CalendarDays size={14} />
                              Starts {displayStartDate(item.startDate)}
                            </p>
                            <div className="mt-3 flex justify-end gap-2">
                              <Link
                                href={editHref}
                                onClick={closeCart}
                                className="inline-flex h-9 items-center gap-2 rounded-button border border-ink/10 bg-white px-3 text-xs font-extrabold transition hover:border-saffron"
                              >
                                <Pencil size={14} />
                                Edit
                              </Link>
                              <button
                                type="button"
                                aria-label={`Remove ${plan?.name ?? "package"}`}
                                onClick={() => removeItem(item.lineId)}
                                className="grid size-9 place-items-center rounded-button border border-ink/10 bg-white text-masala transition hover:border-masala/35 hover:bg-rose"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.article>
                    );
                  })}
                </div>
              ) : (
                <div className="grid min-h-80 place-items-center px-8 text-center">
                  <div>
                    <span className="mx-auto grid size-16 place-items-center rounded-full bg-rose text-masala">
                      <ShoppingBag size={28} />
                    </span>
                    <h3 className="mt-5 font-display text-3xl font-black">Your cart is empty</h3>
                    <p className="mt-3 text-sm font-bold leading-6 text-ink/55">
                      Select a plan, choose its required add-ons, then it will appear here.
                    </p>
                    <ButtonLink href="/packages#build-plan" onClick={closeCart} className="mt-6">
                      Browse packages
                    </ButtonLink>
                  </div>
                </div>
              )}
            </div>

            {items.length ? (
              <div className="border-t border-ink/10 bg-white p-6">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.15em] text-ink/44">Subtotal</p>
                    <p className="mt-1 text-sm font-bold text-ink/54">Tax and delivery calculated at checkout</p>
                  </div>
                  <p className="font-display text-3xl font-black">{formatCurrency(subtotal)}</p>
                </div>
                <ButtonLink href={checkoutHref} onClick={closeCart} className="mt-5 w-full">
                  Continue to checkout
                </ButtonLink>
              </div>
            ) : null}
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
