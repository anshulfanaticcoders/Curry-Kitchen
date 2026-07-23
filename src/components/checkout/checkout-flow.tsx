"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  CreditCard,
  Loader2,
  LockKeyhole,
  MapPin,
  Pencil,
  ShoppingBag,
  Trash2,
  Truck,
} from "lucide-react";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { usePackageCart } from "@/components/providers/package-cart-provider";
import { Button, ButtonLink } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import {
  packageCartQuery,
  type PackageCartItemInput,
} from "@/lib/package-cart";
import { packageStartDateIssue } from "@/lib/package-schedule";
import type { DeliveryZoneRecord, PackagePlan } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";

const checkoutSteps = [
  { label: "Cart", icon: ShoppingBag },
  { label: "Delivery", icon: MapPin },
  { label: "Payment", icon: CreditCard },
];

function categoryLabel(category: PackagePlan["category"]) {
  return category === "Student" ? "Student / Military" : category;
}

function displayStartDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

export function CheckoutFlow({
  plans,
  deliveryZones,
  initialItems,
}: {
  plans: PackagePlan[];
  deliveryZones: DeliveryZoneRecord[];
  initialItems: PackageCartItemInput[];
}) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const {
    items: savedCartItems,
    hydrated: cartHydrated,
    registerPlans,
    replaceCart,
    removeItem,
  } = usePackageCart();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [customer, setCustomer] = useState({
    firstName: "Priya",
    lastName: "Sharma",
    phone: "+1 858 555 0148",
    email: "priya@example.com",
  });
  const [address, setAddress] = useState({
    line1: "750 B St",
    line2: "",
    city: "San Diego",
    state: "CA",
    postalCode: "92101",
  });
  const [foodPreferences, setFoodPreferences] = useState(
    "Medium spice, rice on Monday, no onion salad.",
  );
  const [student, setStudent] = useState({
    universityName: "",
    studentNumber: "",
    idCardUrl: "",
  });
  const initialCartApplied = useRef(false);
  const cartItems = !cartHydrated && initialItems.length ? initialItems : savedCartItems;

  useEffect(() => {
    registerPlans(plans);
  }, [plans, registerPlans]);

  useEffect(() => {
    if (!cartHydrated || initialCartApplied.current) return;

    if (initialItems.length) {
      replaceCart(initialItems);
    }

    initialCartApplied.current = true;
  }, [cartHydrated, initialItems, replaceCart]);

  const resolvedItems = useMemo(
    () =>
      cartItems.flatMap((item) => {
        const plan = plans.find((candidate) => candidate.id === item.packageId);

        if (!plan) return [];

        const addons = plan.addOns.filter((addon) => item.addonIds.includes(addon.id));
        const addonTotal = addons.reduce((total, addon) => total + addon.price, 0);
        const subtotal = plan.price + addonTotal;
        const valid =
          addons.length > 0 &&
          addons.length === new Set(item.addonIds).size &&
          !packageStartDateIssue(item.startDate);

        return [{ item, plan, addons, addonTotal, subtotal, valid }];
      }),
    [cartItems, plans],
  );

  const subtotal = resolvedItems.reduce((total, line) => total + line.subtotal, 0);
  const taxAmount = resolvedItems.reduce(
    (total, line) => total + line.subtotal * line.plan.taxRate,
    0,
  );
  const normalizedCity = address.city.trim().toLowerCase();
  const normalizedPostalCode = address.postalCode.trim().toLowerCase();
  const matchedZone =
    deliveryZones.find(
      (zone) =>
        !zone.outsideZone &&
        (zone.cities.some((city) => city.toLowerCase() === normalizedCity) ||
          zone.postalCodes.some(
            (postalCode) => postalCode.toLowerCase() === normalizedPostalCode,
          )),
    ) ?? deliveryZones.find((zone) => zone.outsideZone);
  const deliveryFeePerPackage = matchedZone
    ? matchedZone.isFreeDelivery
      ? 0
      : matchedZone.fee
    : 0;
  const deliveryFee = deliveryFeePerPackage * resolvedItems.length;
  const total = subtotal + taxAmount + deliveryFee;
  const addressReady =
    address.line1.trim().length >= 4 &&
    address.city.trim().length > 1 &&
    address.postalCode.trim().length >= 5;
  const requiresStudent = resolvedItems.some((line) => line.plan.category === "Student");
  const studentReady =
    !requiresStudent ||
    (student.universityName.trim().length > 1 && student.studentNumber.trim().length > 1);
  const cartReady =
    resolvedItems.length === cartItems.length &&
    resolvedItems.length > 0 &&
    resolvedItems.every((line) => line.valid);
  const isSignedIn = Boolean(session?.user?.id);
  const currentCheckoutPath = `/checkout?cart=${packageCartQuery(cartItems)}`;
  const signInHref = `/login?callbackUrl=${encodeURIComponent(currentCheckoutPath)}`;
  const packagesHref = `/packages?cart=${packageCartQuery(cartItems)}#build-plan`;
  const canConfirm = isSignedIn && addressReady && studentReady && cartReady;
  const deliveryLabel = !addressReady
    ? "Enter ZIP"
    : matchedZone?.outsideZone
      ? "Outside zone"
      : matchedZone?.isFreeDelivery
        ? "Free delivery"
        : matchedZone?.name ?? "Delivery";

  function removeLine(lineId: string) {
    removeItem(lineId);
    toast.success("Package removed");
  }

  async function submitCheckout() {
    if (!isSignedIn) {
      toast.error("Sign in required", {
        description: "Create an account or sign in before checkout.",
      });
      router.push(signInHref);
      return;
    }

    if (!cartReady) {
      toast.error("Cart needs attention", {
        description: "Every package needs an active add-on and a valid start date.",
      });
      return;
    }

    if (!addressReady) {
      toast.error("Delivery address required", {
        description: "Enter a complete street address, city, and ZIP code.",
      });
      return;
    }

    if (!studentReady) {
      toast.error("Verification details required", {
        description: "Enter the school or military organization and verification number.",
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cartItems.map(({ packageId, addonIds, startDate }) => ({
            packageId,
            addonIds,
            startDate,
          })),
          customer: {
            name: `${customer.firstName} ${customer.lastName}`.trim(),
            email: customer.email,
            phone: customer.phone,
          },
          address: {
            line1: address.line1,
            line2: address.line2,
            city: address.city,
            state: address.state,
            postalCode: address.postalCode,
          },
          foodPreferences,
          student: requiresStudent
            ? {
                universityName: student.universityName,
                studentNumber: student.studentNumber,
                idCardUrl: student.idCardUrl,
              }
            : undefined,
        }),
      });
      const payload = (await response.json()) as {
        ok: boolean;
        checkoutUrl?: string;
        error?: string;
      };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Checkout could not be created.");
      }

      toast.success("Checkout created", {
        description: `${cartItems.length} configured ${cartItems.length === 1 ? "package is" : "packages are"} ready for payment.`,
      });

      if (payload.checkoutUrl?.startsWith("http")) {
        window.location.href = payload.checkoutUrl;
        return;
      }

      router.push(payload.checkoutUrl ?? "/dashboard/orders");
      setConfirmed(true);
    } catch (error) {
      toast.error("Checkout failed", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  if (confirmed) {
    return (
      <section className="section section-shell">
        <div className="mx-auto max-w-2xl rounded-lg border border-leaf/20 bg-white p-8 text-center shadow-soft md:p-12">
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-mint text-leaf">
            <CheckCircle2 size={34} />
          </span>
          <p className="mt-6 text-sm font-black uppercase tracking-[0.18em] text-masala">
            Order received
          </p>
          <h1 className="mt-3 font-display text-4xl font-black leading-tight">
            Your tiffin plans are scheduled.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-ink/64">
            Each package will begin on its selected start date and can be tracked separately from
            your dashboard.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <ButtonLink href="/dashboard">Track packages</ButtonLink>
            <ButtonLink href="/menu" variant="secondary">View weekly menu</ButtonLink>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section section-shell grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="rounded-lg border border-ink/10 bg-white p-6 shadow-soft md:p-8">
        <div className="mb-8 flex items-center">
          {checkoutSteps.map((item, index) => {
            const done = index < step;
            const active = index === step;

            return (
              <Fragment key={item.label}>
                <button
                  type="button"
                  onClick={() => {
                    if (index === 0 || (index === 1 && cartReady) || (index === 2 && cartReady && addressReady && studentReady)) {
                      setStep(index);
                    }
                  }}
                  className="flex items-center gap-3"
                  aria-current={active ? "step" : undefined}
                >
                  <span
                    className={cn(
                      "grid size-10 shrink-0 place-items-center rounded-full text-sm font-black transition",
                      active && "bg-saffron text-ink",
                      done && "bg-ink text-saffron",
                      !active && !done && "border border-ink/15 bg-white text-ink/45",
                    )}
                  >
                    {done ? <Check size={18} /> : index + 1}
                  </span>
                  <span className={cn("hidden text-sm font-extrabold sm:block", active ? "text-ink" : "text-ink/50")}>
                    {item.label}
                  </span>
                </button>
                {index < checkoutSteps.length - 1 ? (
                  <span className={cn("mx-3 h-px flex-1 transition", index < step ? "bg-ink" : "bg-ink/12")} />
                ) : null}
              </Fragment>
            );
          })}
        </div>

        {status !== "loading" && !isSignedIn ? (
          <div className="mb-6 rounded-lg border border-saffron/35 bg-rose p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-saffron text-ink">
                  <LockKeyhole size={18} />
                </span>
                <div>
                  <p className="text-sm font-black">Account required for checkout</p>
                  <p className="mt-1 text-xs font-bold leading-5 text-ink/58">
                    Your cart will return after sign-in so every package can be tracked separately.
                  </p>
                </div>
              </div>
              <ButtonLink href={signInHref} variant="dark" className="shrink-0">Sign in</ButtonLink>
            </div>
          </div>
        ) : null}

        {step === 0 ? (
          <div>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.16em] text-masala">Package review</p>
                <h2 className="mt-2 font-display text-3xl font-black">Your configured tiffins</h2>
              </div>
              <ButtonLink href={packagesHref} variant="secondary">Add another package</ButtonLink>
            </div>

            {resolvedItems.length ? (
              <div className="mt-6 divide-y divide-ink/10 overflow-hidden rounded-lg border border-ink/10 bg-ivory">
                {resolvedItems.map(({ item, plan, addons, subtotal: lineSubtotal, valid }, index) => {
                  const editHref = `/packages?cart=${packageCartQuery(cartItems)}&edit=${encodeURIComponent(item.lineId)}#build-plan`;

                  return (
                    <article key={item.lineId} className="p-5">
                      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-ink text-sm font-black text-saffron">
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusPill tone={valid ? "green" : "red"}>{valid ? "Ready" : "Needs attention"}</StatusPill>
                            <StatusPill tone="amber">{categoryLabel(plan.category)}</StatusPill>
                          </div>
                          <h3 className="mt-3 font-display text-2xl font-black">{plan.name}</h3>
                          <p className="mt-2 text-sm font-bold text-ink/58">
                            {addons.length ? addons.map((addon) => addon.name).join(", ") : "No active add-on selected"}
                          </p>
                          <p className="mt-2 flex items-center gap-2 text-sm font-extrabold text-leaf">
                            <CalendarDays size={16} />
                            Starts {displayStartDate(item.startDate)}
                          </p>
                        </div>
                        <div className="flex items-center justify-between gap-4 sm:block sm:text-right">
                          <p className="text-xl font-black">{formatCurrency(lineSubtotal)}</p>
                          <div className="mt-3 flex justify-end gap-2">
                            <ButtonLink href={editHref} variant="secondary" className="h-9 px-3 text-xs">
                              <Pencil size={14} />
                              Edit
                            </ButtonLink>
                            <button
                              type="button"
                              aria-label={`Remove ${plan.name}`}
                              onClick={() => removeLine(item.lineId)}
                              className="grid size-9 place-items-center rounded-button border border-ink/10 bg-white text-masala transition hover:border-masala/35 hover:bg-rose"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="mt-6 rounded-lg border border-dashed border-ink/15 bg-ivory p-8 text-center">
                <ShoppingBag className="mx-auto text-masala" size={30} />
                <h3 className="mt-4 font-display text-2xl font-black">No packages in your cart</h3>
                <p className="mt-2 text-sm font-bold text-ink/55">Configure at least one package before checkout.</p>
              </div>
            )}

            <Button className="mt-6" onClick={() => setStep(1)} disabled={!cartReady}>
              Continue to delivery
            </Button>
          </div>
        ) : null}

        {step === 1 ? (
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-masala">Shared delivery details</p>
            <p className="mt-2 text-sm font-bold text-ink/55">This address applies to every package in this order.</p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {(["First name", "Last name", "Phone", "Email"] as const).map((label) => (
                <label key={label} className="grid gap-2 text-sm font-extrabold">
                  {label}
                  <input
                    type={label === "Email" ? "email" : "text"}
                    className="h-12 rounded-button border border-ink/10 bg-ivory px-4 font-medium outline-none transition focus:border-leaf"
                    value={
                      label === "First name"
                        ? customer.firstName
                        : label === "Last name"
                          ? customer.lastName
                          : label === "Phone"
                            ? customer.phone
                            : customer.email
                    }
                    onChange={(event) => {
                      const value = event.target.value;
                      setCustomer((current) => ({
                        ...current,
                        ...(label === "First name"
                          ? { firstName: value }
                          : label === "Last name"
                            ? { lastName: value }
                            : label === "Phone"
                              ? { phone: value }
                              : { email: value }),
                      }));
                    }}
                  />
                </label>
              ))}
              <label className="grid gap-2 text-sm font-extrabold md:col-span-2">
                Street address
                <input
                  className="h-12 rounded-button border border-ink/10 bg-ivory px-4 font-medium outline-none transition focus:border-leaf"
                  value={address.line1}
                  onChange={(event) => setAddress((current) => ({ ...current, line1: event.target.value }))}
                />
              </label>
              <label className="grid gap-2 text-sm font-extrabold">
                Apt / suite
                <input
                  className="h-12 rounded-button border border-ink/10 bg-ivory px-4 font-medium outline-none transition focus:border-leaf"
                  value={address.line2}
                  onChange={(event) => setAddress((current) => ({ ...current, line2: event.target.value }))}
                />
              </label>
              <label className="grid gap-2 text-sm font-extrabold">
                City
                <input
                  className="h-12 rounded-button border border-ink/10 bg-ivory px-4 font-medium outline-none transition focus:border-leaf"
                  value={address.city}
                  onChange={(event) => setAddress((current) => ({ ...current, city: event.target.value }))}
                />
              </label>
              <label className="grid gap-2 text-sm font-extrabold">
                State
                <input
                  className="h-12 rounded-button border border-ink/10 bg-ivory px-4 font-medium outline-none transition focus:border-leaf"
                  value={address.state}
                  onChange={(event) => setAddress((current) => ({ ...current, state: event.target.value }))}
                />
              </label>
              <label className="grid gap-2 text-sm font-extrabold">
                ZIP / postal code
                <input
                  className="h-12 rounded-button border border-ink/10 bg-ivory px-4 font-medium outline-none transition focus:border-leaf"
                  value={address.postalCode}
                  onChange={(event) => setAddress((current) => ({ ...current, postalCode: event.target.value }))}
                  placeholder="92101"
                />
              </label>
              <div className="rounded-lg border border-ink/10 bg-white p-4 md:col-span-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-extrabold">Delivery eligibility</p>
                    <p className="mt-1 text-xs font-bold text-ink/50">
                      {addressReady
                        ? matchedZone
                          ? `${matchedZone.name} matched by city or ZIP.`
                          : "No active zone matched."
                        : "Enter a complete address and ZIP to check delivery pricing."}
                    </p>
                  </div>
                  <span className={cn("rounded-full px-3 py-1 text-xs font-black", addressReady && deliveryFee === 0 ? "bg-mint text-leaf" : "bg-rose text-masala")}>
                    {addressReady
                      ? deliveryFee === 0
                        ? "Free delivery"
                        : `${formatCurrency(deliveryFee)} delivery`
                      : "Check ZIP"}
                  </span>
                </div>
              </div>
              <label className="grid gap-2 text-sm font-extrabold md:col-span-2">
                Food preferences
                <textarea
                  className="min-h-28 rounded-button border border-ink/10 bg-ivory px-4 py-3 font-medium outline-none transition focus:border-leaf"
                  value={foodPreferences}
                  onChange={(event) => setFoodPreferences(event.target.value)}
                />
              </label>
              {requiresStudent ? (
                <div className="grid gap-4 rounded-lg border border-saffron/30 bg-rose p-4 md:col-span-2 md:grid-cols-2">
                  <p className="text-sm font-extrabold text-masala md:col-span-2">
                    Verification is required before student or military packages activate.
                  </p>
                  <label className="grid gap-2 text-sm font-extrabold">
                    School / military organization
                    <input
                      className="h-12 rounded-button border border-ink/10 bg-white px-4 font-medium outline-none transition focus:border-leaf"
                      value={student.universityName}
                      onChange={(event) => setStudent((current) => ({ ...current, universityName: event.target.value }))}
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-extrabold">
                    Student / service number
                    <input
                      className="h-12 rounded-button border border-ink/10 bg-white px-4 font-medium outline-none transition focus:border-leaf"
                      value={student.studentNumber}
                      onChange={(event) => setStudent((current) => ({ ...current, studentNumber: event.target.value }))}
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-extrabold md:col-span-2">
                    ID card URL / metadata
                    <input
                      className="h-12 rounded-button border border-ink/10 bg-white px-4 font-medium outline-none transition focus:border-leaf"
                      value={student.idCardUrl}
                      onChange={(event) => setStudent((current) => ({ ...current, idCardUrl: event.target.value }))}
                      placeholder="/uploads/verification-id-placeholder.jpg"
                    />
                  </label>
                </div>
              ) : null}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button variant="secondary" onClick={() => setStep(0)}>
                <ArrowLeft size={18} />
                Back
              </Button>
              <Button onClick={() => setStep(2)} disabled={!addressReady || !studentReady}>
                Continue to payment
              </Button>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-masala">Payment method</p>
            <div className="mt-5 rounded-lg border border-ink/10 bg-ivory p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-extrabold">Stripe Checkout</p>
                  <p className="mt-1 text-xs font-bold text-ink/55">Card details are entered securely after order confirmation.</p>
                </div>
                <CreditCard className="text-leaf" size={34} />
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button variant="secondary" onClick={() => setStep(1)}>
                <ArrowLeft size={18} />
                Back
              </Button>
              <Button onClick={submitCheckout} disabled={loading || !canConfirm}>
                {loading ? <Loader2 className="animate-spin" size={18} /> : null}
                {loading ? "Creating checkout" : isSignedIn ? "Confirm order" : "Sign in to confirm"}
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <aside className="dark-band relative h-fit rounded-lg border border-white/10 p-6 text-ivory shadow-soft lg:sticky lg:top-24">
        <div className="relative flex items-start justify-between gap-5">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-saffron">Order summary</p>
            <h2 className="mt-3 font-display text-3xl font-black">
              {resolvedItems.length} {resolvedItems.length === 1 ? "package" : "packages"}
            </h2>
          </div>
          <Truck className="text-saffron" size={30} />
        </div>

        <div className="relative mt-7 max-h-72 divide-y divide-white/10 overflow-y-auto border-y border-white/10">
          {resolvedItems.map(({ item, plan, addons, subtotal: lineSubtotal }) => (
            <div key={item.lineId} className="py-4">
              <div className="flex justify-between gap-4 text-sm font-extrabold">
                <span>{plan.name}</span>
                <span>{formatCurrency(lineSubtotal)}</span>
              </div>
              <p className="mt-1 text-xs font-bold text-ivory/55">{addons.map((addon) => addon.name).join(", ")}</p>
              <p className="mt-1 text-xs font-bold text-saffron">Starts {displayStartDate(item.startDate)}</p>
            </div>
          ))}
        </div>

        <div className="relative mt-5 grid gap-4 text-sm font-bold">
          <div className="flex justify-between border-b border-white/10 pb-4">
            <span className="text-ivory/62">Package subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between border-b border-white/10 pb-4">
            <span className="text-ivory/62">Delivery · {deliveryLabel}</span>
            <span>{deliveryFee === 0 ? deliveryLabel : formatCurrency(deliveryFee)}</span>
          </div>
          <div className="flex justify-between border-b border-white/10 pb-4">
            <span className="text-ivory/62">Tax estimate</span>
            <span>{formatCurrency(taxAmount)}</span>
          </div>
        </div>

        <div className="relative mt-8 flex items-end justify-between gap-4">
          <span className="text-sm font-black uppercase tracking-[0.18em] text-saffron">Total</span>
          <span className="font-display text-4xl font-black">{formatCurrency(total)}</span>
        </div>
      </aside>
    </section>
  );
}
