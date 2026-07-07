"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Check, CheckCircle2, CreditCard, Loader2, MapPin, Minus, Plus, ShoppingBag, Truck } from "lucide-react";
import { Fragment, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button, ButtonLink } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import type { DeliveryZoneRecord, PackagePlan } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";

const checkoutSteps = [
  { label: "Cart", icon: ShoppingBag },
  { label: "Delivery", icon: MapPin },
  { label: "Payment", icon: CreditCard },
];

export function CheckoutFlow({
  plans,
  deliveryZones,
  initialPackageId,
  initialAddonIds = [],
}: {
  plans: PackagePlan[];
  deliveryZones: DeliveryZoneRecord[];
  initialPackageId?: string;
  initialAddonIds?: string[];
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [customer, setCustomer] = useState({
    firstName: "Priya",
    lastName: "Sharma",
    phone: "+1 510 555 0148",
    email: "priya@example.com",
  });
  const [address, setAddress] = useState({
    line1: "3988 Washington Blvd",
    line2: "",
    city: "Fremont",
    state: "CA",
    postalCode: "94538",
  });
  const [foodPreferences, setFoodPreferences] = useState("Medium spice, rice on Monday, no onion salad.");
  const [student, setStudent] = useState({
    universityName: "",
    studentNumber: "",
    idCardUrl: "",
  });
  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === initialPackageId) ?? plans[1] ?? plans[0],
    [initialPackageId, plans],
  );

  if (!selectedPlan) {
    return null;
  }

  const selectedAddonIds =
    initialAddonIds.length > 0
      ? initialAddonIds
      : selectedPlan?.addOns[0]
        ? [selectedPlan.addOns[0].id]
        : [];
  const selectedAddOns = selectedPlan.addOns.filter((addOn) => selectedAddonIds.includes(addOn.id));
  const addOnTotal = selectedAddOns.reduce((total, addOn) => total + addOn.price, 0);
  const subtotal = (selectedPlan.price + addOnTotal) * quantity;
  const normalizedCity = address.city.trim().toLowerCase();
  const normalizedPostalCode = address.postalCode.trim().toLowerCase();
  const matchedZone =
    deliveryZones.find(
      (zone) =>
        !zone.outsideZone &&
        (zone.cities.some((city) => city.toLowerCase() === normalizedCity) ||
          zone.postalCodes.some((postalCode) => postalCode.toLowerCase() === normalizedPostalCode)),
    ) ?? deliveryZones.find((zone) => zone.outsideZone);
  const deliveryFeePerPackage = matchedZone ? (matchedZone.isFreeDelivery ? 0 : matchedZone.fee) : 0;
  const deliveryFee = deliveryFeePerPackage * quantity;
  const taxAmount = subtotal * selectedPlan.taxRate;
  const total = subtotal + taxAmount + deliveryFee;
  const deliveryReady = address.city.trim().length > 1 && address.postalCode.trim().length >= 5;
  const requiresStudent = selectedPlan.category === "Student";
  const deliveryLabel = !deliveryReady
    ? "Enter ZIP"
    : matchedZone?.outsideZone
      ? "Outside zone"
      : matchedZone?.isFreeDelivery
        ? "Free delivery"
        : matchedZone?.name ?? "Delivery";

  async function submitCheckout() {
    setLoading(true);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId: selectedPlan.id,
          quantity,
          addonIds: selectedAddonIds,
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
          student:
            requiresStudent
              ? {
                  universityName: student.universityName,
                  studentNumber: student.studentNumber,
                  idCardUrl: student.idCardUrl,
                }
              : undefined,
        }),
      });
      const payload = (await response.json()) as { ok: boolean; checkoutUrl?: string; error?: string };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Checkout could not be created.");
      }

      toast.success("Checkout created", {
        description: "Your order was saved and payment is ready.",
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
            Dinner is on the schedule.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-ink/64">
            Your Regular 8 Roti Tiffin is queued for Monday delivery between 6:00 PM and 8:00 PM.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <ButtonLink href="/dashboard">Track in dashboard</ButtonLink>
            <ButtonLink href="/menu" variant="secondary">View weekly menu</ButtonLink>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section section-shell grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="rounded-lg border border-ink/10 bg-white p-6 shadow-soft md:p-8">
        {/* Numbered progress */}
        <div className="mb-8 flex items-center">
          {checkoutSteps.map((item, index) => {
            const done = index < step;
            const active = index === step;
            return (
              <Fragment key={item.label}>
                <button
                  onClick={() => setStep(index)}
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
                  <span
                    className={cn(
                      "hidden text-sm font-extrabold sm:block",
                      active ? "text-ink" : "text-ink/50",
                    )}
                  >
                    {item.label}
                  </span>
                </button>
                {index < checkoutSteps.length - 1 ? (
                  <span
                    className={cn(
                      "mx-3 h-px flex-1 transition",
                      index < step ? "bg-ink" : "bg-ink/12",
                    )}
                  />
                ) : null}
              </Fragment>
            );
          })}
        </div>

        {step === 0 ? (
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-masala">
              Selected plan
            </p>
            <div className="mt-5 rounded-lg border border-ink/10 bg-ivory p-5">
              <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                <div>
                  <StatusPill tone="amber">Monthly</StatusPill>
                  <h2 className="mt-4 font-display text-3xl font-black">{selectedPlan.name}</h2>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-ink/62">
                    Includes daal, sabzi, roti, yogurt, salad, dessert once a week, and rice add-on.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    aria-label="Decrease quantity"
                    className="grid size-10 place-items-center rounded-button border border-ink/10 bg-white transition hover:border-masala/40"
                    onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                  >
                    <Minus size={16} />
                  </button>
                  <span className="grid size-10 place-items-center rounded-button bg-white text-sm font-black">
                    {quantity}
                  </span>
                  <button
                    aria-label="Increase quantity"
                    className="grid size-10 place-items-center rounded-button border border-ink/10 bg-white transition hover:border-masala/40"
                    onClick={() => setQuantity((value) => value + 1)}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </div>
            <Button className="mt-6" onClick={() => setStep(1)}>
              Continue to delivery
            </Button>
          </div>
        ) : null}

        {step === 1 ? (
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-masala">
              Delivery details
            </p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {["First name", "Last name", "Phone", "Email"].map((label) => (
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
                  placeholder="94538"
                />
              </label>
              <div className="md:col-span-2 rounded-lg border border-ink/10 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-extrabold">Delivery eligibility</p>
                    <p className="mt-1 text-xs font-bold text-ink/50">
                      {deliveryReady
                        ? matchedZone
                          ? `${matchedZone.name} matched by city or ZIP.`
                          : "No active zone matched."
                        : "Enter city and ZIP to check delivery pricing."}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-black",
                      deliveryReady && deliveryFee === 0
                        ? "bg-mint text-leaf"
                        : "bg-rose text-masala",
                    )}
                  >
                    {deliveryReady
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
                <div className="md:col-span-2 grid gap-4 rounded-lg border border-saffron/30 bg-rose p-4 md:grid-cols-2">
                  <p className="md:col-span-2 text-sm font-extrabold text-masala">
                    Student verification is required before this package activates.
                  </p>
                  <label className="grid gap-2 text-sm font-extrabold">
                    University name
                    <input
                      className="h-12 rounded-button border border-ink/10 bg-white px-4 font-medium outline-none transition focus:border-leaf"
                      value={student.universityName}
                      onChange={(event) => setStudent((current) => ({ ...current, universityName: event.target.value }))}
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-extrabold">
                    Roll / student number
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
                      placeholder="/uploads/student-id-placeholder.jpg"
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
              <Button onClick={() => setStep(2)} disabled={!deliveryReady}>
                Continue to payment
              </Button>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-masala">
              Payment method
            </p>
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
            <Button onClick={submitCheckout} disabled={loading}>
              {loading ? <Loader2 className="animate-spin" size={18} /> : null}
              {loading ? "Creating checkout" : "Confirm order"}
            </Button>
            </div>
          </div>
        ) : null}
      </div>

      <aside className="dark-band relative h-fit rounded-lg border border-white/10 p-6 text-ivory shadow-soft lg:sticky lg:top-24">
        <div className="relative flex items-start justify-between gap-5">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-saffron">
              Order summary
            </p>
            <h2 className="mt-3 font-display text-3xl font-black">{selectedPlan.name}</h2>
          </div>
          <Truck className="text-saffron" size={30} />
        </div>

        <div className="relative mt-8 grid gap-4 text-sm font-bold">
          <div className="flex justify-between border-b border-white/10 pb-4">
            <span className="text-ivory/62">Base plan x{quantity}</span>
            <span>{formatCurrency(selectedPlan.price * quantity)}</span>
          </div>
          <div className="flex justify-between border-b border-white/10 pb-4">
            <span className="text-ivory/62">
              {selectedAddOns.length ? selectedAddOns.map((addOn) => addOn.name).join(", ") : "Add-ons"}
            </span>
            <span>{formatCurrency(addOnTotal * quantity)}</span>
          </div>
          <div className="flex justify-between border-b border-white/10 pb-4">
            <span className="text-ivory/62">Delivery x{quantity}</span>
            <span>{deliveryFee === 0 ? deliveryLabel : formatCurrency(deliveryFee)}</span>
          </div>
          <div className="flex justify-between border-b border-white/10 pb-4">
            <span className="text-ivory/62">Tax estimate ({(selectedPlan.taxRate * 100).toFixed(2)}%)</span>
            <span>{formatCurrency(taxAmount)}</span>
          </div>
        </div>

        <div className="relative mt-8 flex items-end justify-between">
          <span className="text-sm font-black uppercase tracking-[0.18em] text-saffron">Total</span>
          <span className="font-display text-4xl font-black">{formatCurrency(total)}</span>
        </div>
      </aside>
    </section>
  );
}
