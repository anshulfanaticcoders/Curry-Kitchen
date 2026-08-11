"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BadgePercent,
  CalendarDays,
  Check,
  CheckCircle2,
  CircleAlert,
  CreditCard,
  Loader2,
  LockKeyhole,
  MapPin,
  Pencil,
  ShoppingBag,
  Trash2,
  Truck,
  Upload,
  X,
} from "lucide-react";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { SiApplepay, SiMastercard, SiVisa, SiZelle } from "react-icons/si";
import { toast } from "sonner";
import { usePackageCart } from "@/components/providers/package-cart-provider";
import { Button, ButtonLink } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { type PackageCartItemInput } from "@/lib/package-cart";
import { packageStartDateIssue } from "@/lib/package-schedule";
import type { CustomerProfileDetails, DeliveryZoneRecord, PackagePlan } from "@/lib/types";
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

const MAX_ID_FILE_SIZE = 5 * 1024 * 1024;

type PaymentMethodOption = "CREDIT_CARD" | "DEBIT_CARD" | "APPLE_PAY" | "ZELLE";

const paymentMethods: Array<{
  value: PaymentMethodOption;
  label: string;
  description: string;
  icons: React.ReactNode;
}> = [
  {
    value: "CREDIT_CARD",
    label: "Credit card",
    description: "Visa, Mastercard & more via Stripe",
    icons: (
      <span className="flex items-center gap-1.5">
        <SiVisa size={30} color="#1A1F71" aria-label="Visa" />
        <SiMastercard size={24} color="#EB001B" aria-label="Mastercard" />
      </span>
    ),
  },
  {
    value: "DEBIT_CARD",
    label: "Debit card",
    description: "Bank debit cards via Stripe",
    icons: (
      <span className="flex items-center gap-1.5">
        <SiVisa size={30} color="#1A1F71" aria-label="Visa Debit" />
        <SiMastercard size={24} color="#EB001B" aria-label="Mastercard Debit" />
      </span>
    ),
  },
  {
    value: "APPLE_PAY",
    label: "Apple Pay",
    description: "Fast checkout on Apple devices",
    icons: <SiApplepay size={34} aria-label="Apple Pay" />,
  },
  {
    value: "ZELLE",
    label: "Zelle",
    description: "Direct bank transfer, confirmed by our team",
    icons: <SiZelle size={26} color="#6D1ED4" aria-label="Zelle" />,
  },
];

function FieldError({ message }: { message: string }) {
  if (!message) return null;

  return (
    <span role="alert" className="flex items-center gap-1.5 text-xs font-bold text-masala">
      <CircleAlert size={13} className="shrink-0" />
      {message}
    </span>
  );
}

function fieldInputClass(hasError: boolean, onWhite = false) {
  return cn(
    "h-12 rounded-button border px-4 font-medium outline-none transition",
    onWhite ? "bg-white" : "bg-ivory",
    hasError ? "border-masala/60 bg-rose/40 focus:border-masala" : "border-ink/10 focus:border-leaf",
  );
}

function customerFormValues(profile: CustomerProfileDetails) {
  const nameParts = profile.name.trim().split(/\s+/).filter(Boolean);

  return {
    firstName: nameParts[0] ?? "",
    lastName: nameParts.slice(1).join(" "),
    phone: profile.phone,
    email: profile.email,
  };
}

export function CheckoutFlow({
  plans,
  deliveryZones,
  initialItems,
  customerProfile,
  taxRate,
}: {
  plans: PackagePlan[];
  deliveryZones: DeliveryZoneRecord[];
  initialItems: PackageCartItemInput[];
  customerProfile: CustomerProfileDetails;
  taxRate: number;
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
  const [customer, setCustomer] = useState(() => customerFormValues(customerProfile));
  const [address, setAddress] = useState({
    line1: customerProfile.line1,
    line2: "",
    city: customerProfile.city,
    state: customerProfile.state || "CA",
    postalCode: customerProfile.postalCode,
  });
  const [foodPreferences, setFoodPreferences] = useState(() => customerProfile.preferences.join(", "));
  const [student, setStudent] = useState({
    verificationType: "STUDENT" as "STUDENT" | "MILITARY",
    universityName: "",
    studentNumber: "",
    idCardUrl: "",
    idCardBackUrl: "",
  });
  const [idCardNames, setIdCardNames] = useState({ front: "", back: "" });
  const [idUploadingSide, setIdUploadingSide] = useState<"front" | "back" | null>(null);
  const [showDeliveryErrors, setShowDeliveryErrors] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    type: "PERCENT" | "FLAT";
    value: number;
  } | null>(null);
  const [couponError, setCouponError] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodOption>("CREDIT_CARD");
  const initialCartApplied = useRef(false);
  const cartItems = !cartHydrated && initialItems.length ? initialItems : savedCartItems;

  useEffect(() => {
    registerPlans(plans);
  }, [plans, registerPlans]);

  useEffect(() => {
    if (!cartHydrated || initialCartApplied.current) return;

    // Only import a legacy ?cart= URL snapshot into an empty stored cart —
    // the stored cart is the source of truth and stale URLs must not
    // resurrect removed packages.
    if (initialItems.length && savedCartItems.length === 0) {
      replaceCart(initialItems);
    }

    initialCartApplied.current = true;
  }, [cartHydrated, initialItems, replaceCart, savedCartItems.length]);

  const resolvedItems = useMemo(
    () =>
      cartItems.flatMap((item) => {
        const plan = plans.find((candidate) => candidate.id === item.packageId);

        if (!plan) return [];

        const addons = plan.addOns.filter((addon) => item.addonIds.includes(addon.id));
        const addonTotal = addons.reduce((total, addon) => total + addon.price, 0);
        const subtotal = plan.price + addonTotal;
        const valid =
          addons.length === new Set(item.addonIds).size &&
          !packageStartDateIssue(item.startDate);

        return [{ item, plan, addons, addonTotal, subtotal, valid }];
      }),
    [cartItems, plans],
  );

  const subtotal = resolvedItems.reduce((total, line) => total + line.subtotal, 0);
  const discountAmount = appliedCoupon
    ? Math.min(
        subtotal,
        Math.max(
          0,
          appliedCoupon.type === "PERCENT"
            ? subtotal * (appliedCoupon.value / 100)
            : appliedCoupon.value,
        ),
      )
    : 0;
  const taxAmount = (subtotal - discountAmount) * taxRate;
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
  const total = subtotal - discountAmount + taxAmount + deliveryFee;
  const requiresStudent = resolvedItems.some((line) => line.plan.category === "Student");
  const deliveryErrors = {
    firstName: customer.firstName.trim() ? "" : "Enter your first name.",
    lastName: customer.lastName.trim() ? "" : "Enter your last name.",
    phone:
      customer.phone.trim().length >= 7 ? "" : "Enter a phone number with at least 7 digits.",
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email.trim())
      ? ""
      : "Enter a valid email address.",
    line1: address.line1.trim().length >= 4 ? "" : "Enter your full street address.",
    city: address.city.trim().length >= 2 ? "" : "Enter your city.",
    postalCode:
      address.postalCode.trim().length >= 5 ? "" : "Enter a valid ZIP / postal code.",
    universityName:
      !requiresStudent || student.universityName.trim().length >= 2
        ? ""
        : student.verificationType === "MILITARY"
          ? "Enter your branch or organization."
          : "Enter your university or school name.",
    studentNumber:
      !requiresStudent || student.studentNumber.trim().length >= 2
        ? ""
        : student.verificationType === "MILITARY"
          ? "Enter your service or DoD ID number."
          : "Enter your student ID or roll number.",
    idCardFront:
      !requiresStudent || student.idCardUrl
        ? ""
        : student.verificationType === "MILITARY"
          ? "Upload the front of your military ID."
          : "Upload the front of your student ID.",
    idCardBack:
      !requiresStudent || student.idCardBackUrl
        ? ""
        : student.verificationType === "MILITARY"
          ? "Upload the back of your military ID."
          : "Upload the back of your student ID.",
  };
  const addressReady =
    !deliveryErrors.line1 && !deliveryErrors.city && !deliveryErrors.postalCode;
  const deliveryReady = Object.values(deliveryErrors).every((message) => !message);
  const cartReady =
    resolvedItems.length === cartItems.length &&
    resolvedItems.length > 0 &&
    resolvedItems.every((line) => line.valid);
  const isSignedIn = Boolean(session?.user?.id);
  const signInHref = `/login?callbackUrl=${encodeURIComponent("/checkout")}`;
  const registerHref = `/register?callbackUrl=${encodeURIComponent("/checkout")}`;
  const packagesHref = "/packages#build-plan";
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

  async function applyCoupon() {
    const code = couponInput.trim();

    if (!code) {
      setCouponError("Enter a coupon code.");
      return;
    }

    if (!isSignedIn) {
      setCouponError("Sign in to apply a coupon.");
      return;
    }

    setCouponLoading(true);
    setCouponError("");

    try {
      const response = await fetch("/api/coupons/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const payload = (await response.json()) as {
        ok: boolean;
        coupon?: { code: string; type: "PERCENT" | "FLAT"; value: number };
        error?: string;
      };

      if (!response.ok || !payload.ok || !payload.coupon) {
        throw new Error(payload.error ?? "This coupon code is not valid.");
      }

      setAppliedCoupon(payload.coupon);
      setCouponInput("");
      toast.success(`Coupon ${payload.coupon.code} applied`);
    } catch (error) {
      setAppliedCoupon(null);
      setCouponError(
        error instanceof Error ? error.message : "Coupon could not be checked.",
      );
    } finally {
      setCouponLoading(false);
    }
  }

  function removeCoupon() {
    setAppliedCoupon(null);
    setCouponError("");
  }

  async function handleIdUpload(
    side: "front" | "back",
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const input = event.target;
    const file = input.files?.[0];

    input.value = "";

    if (!file) return;

    if (file.size > MAX_ID_FILE_SIZE) {
      toast.error("File too large", { description: "Upload an ID smaller than 5MB." });
      return;
    }

    setIdUploadingSide(side);

    try {
      const body = new FormData();
      body.append("file", file);

      const response = await fetch("/api/uploads/verification", { method: "POST", body });
      const payload = (await response.json()) as { ok: boolean; url?: string; error?: string };

      if (!response.ok || !payload.ok || !payload.url) {
        throw new Error(payload.error ?? "ID could not be uploaded.");
      }

      const url = payload.url;

      setStudent((current) =>
        side === "front"
          ? { ...current, idCardUrl: url }
          : { ...current, idCardBackUrl: url },
      );
      setIdCardNames((current) => ({ ...current, [side]: file.name }));
      toast.success(side === "front" ? "ID front uploaded" : "ID back uploaded", {
        description: "Our team reviews it after checkout to activate your discount.",
      });
    } catch (error) {
      toast.error("ID upload failed", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIdUploadingSide(null);
    }
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
        description: "Each package needs valid optional add-ons and a valid start date.",
      });
      return;
    }

    if (!deliveryReady) {
      setShowDeliveryErrors(true);
      setStep(1);
      toast.error("Delivery details incomplete", {
        description: "Fix the highlighted fields before payment.",
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
            name: `${customer.firstName.trim()} ${customer.lastName.trim()}`.trim(),
            email: customer.email.trim(),
            phone: customer.phone.trim(),
          },
          address: {
            line1: address.line1,
            line2: address.line2,
            city: address.city,
            state: address.state,
            postalCode: address.postalCode,
          },
          foodPreferences,
          couponCode: appliedCoupon?.code,
          paymentMethod,
          student: requiresStudent
            ? {
                verificationType: student.verificationType,
                universityName: student.universityName,
                studentNumber: student.studentNumber,
                idCardUrl: student.idCardUrl,
                idCardBackUrl: student.idCardBackUrl,
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

      if (paymentMethod === "ZELLE") {
        toast.success("Order placed", {
          description:
            "Send the total via Zelle using the instructions shown. Your packages activate once we confirm the transfer.",
        });
      } else {
        toast.success("Checkout created", {
          description: `${cartItems.length} configured ${cartItems.length === 1 ? "package is" : "packages are"} ready for payment.`,
        });
      }

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
                    if (
                      index === 0 ||
                      (isSignedIn && index === 1 && cartReady) ||
                      (isSignedIn && index === 2 && cartReady && deliveryReady)
                    ) {
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
              <div className="flex shrink-0 flex-wrap gap-2">
                <ButtonLink href={signInHref} variant="dark">Sign in</ButtonLink>
                <ButtonLink href={registerHref} variant="secondary">Create account</ButtonLink>
              </div>
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
                  const editHref = `/packages?edit=${encodeURIComponent(item.lineId)}#build-plan`;

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
                            {addons.length ? addons.map((addon) => addon.name).join(", ") : "No add-ons selected"}
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

            <Button
              className="mt-6"
              disabled={!resolvedItems.length}
              onClick={() => {
                if (!cartReady) {
                  toast.error("Cart needs attention", {
                    description:
                      "Each package needs valid add-ons and a valid start date. Use Edit to fix the flagged packages.",
                  });
                  return;
                }

                if (!isSignedIn) {
                  toast.info("Sign in to continue", {
                    description: "Your cart comes back automatically after you sign in.",
                  });
                  router.push(signInHref);
                  return;
                }

                setStep(1);
              }}
            >
              {isSignedIn || status === "loading" ? "Continue to delivery" : "Sign in to continue"}
            </Button>
          </div>
        ) : null}

        {step === 1 ? (
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-masala">Shared delivery details</p>
            <p className="mt-2 text-sm font-bold text-ink/55">This address applies to every package in this order.</p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-extrabold">
                First name
                <input
                  type="text"
                  autoComplete="given-name"
                  aria-invalid={Boolean(showDeliveryErrors && deliveryErrors.firstName)}
                  className={fieldInputClass(showDeliveryErrors && Boolean(deliveryErrors.firstName))}
                  value={customer.firstName}
                  onChange={(event) => setCustomer((current) => ({ ...current, firstName: event.target.value }))}
                />
                {showDeliveryErrors ? <FieldError message={deliveryErrors.firstName} /> : null}
              </label>
              <label className="grid gap-2 text-sm font-extrabold">
                Last name
                <input
                  type="text"
                  autoComplete="family-name"
                  aria-invalid={Boolean(showDeliveryErrors && deliveryErrors.lastName)}
                  className={fieldInputClass(showDeliveryErrors && Boolean(deliveryErrors.lastName))}
                  value={customer.lastName}
                  onChange={(event) => setCustomer((current) => ({ ...current, lastName: event.target.value }))}
                />
                {showDeliveryErrors ? <FieldError message={deliveryErrors.lastName} /> : null}
              </label>
              <label className="grid gap-2 text-sm font-extrabold">
                Phone
                <input
                  type="tel"
                  autoComplete="tel"
                  aria-invalid={Boolean(showDeliveryErrors && deliveryErrors.phone)}
                  className={fieldInputClass(showDeliveryErrors && Boolean(deliveryErrors.phone))}
                  value={customer.phone}
                  onChange={(event) => setCustomer((current) => ({ ...current, phone: event.target.value }))}
                />
                {showDeliveryErrors ? <FieldError message={deliveryErrors.phone} /> : null}
              </label>
              <label className="grid gap-2 text-sm font-extrabold">
                Email
                <input
                  type="email"
                  autoComplete="email"
                  aria-invalid={Boolean(showDeliveryErrors && deliveryErrors.email)}
                  className={fieldInputClass(showDeliveryErrors && Boolean(deliveryErrors.email))}
                  value={customer.email}
                  onChange={(event) => setCustomer((current) => ({ ...current, email: event.target.value }))}
                />
                {showDeliveryErrors ? <FieldError message={deliveryErrors.email} /> : null}
              </label>
              <label className="grid gap-2 text-sm font-extrabold md:col-span-2">
                Street address
                <input
                  autoComplete="address-line1"
                  aria-invalid={Boolean(showDeliveryErrors && deliveryErrors.line1)}
                  className={fieldInputClass(showDeliveryErrors && Boolean(deliveryErrors.line1))}
                  value={address.line1}
                  onChange={(event) => setAddress((current) => ({ ...current, line1: event.target.value }))}
                />
                {showDeliveryErrors ? <FieldError message={deliveryErrors.line1} /> : null}
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
                  autoComplete="address-level2"
                  aria-invalid={Boolean(showDeliveryErrors && deliveryErrors.city)}
                  className={fieldInputClass(showDeliveryErrors && Boolean(deliveryErrors.city))}
                  value={address.city}
                  onChange={(event) => setAddress((current) => ({ ...current, city: event.target.value }))}
                />
                {showDeliveryErrors ? <FieldError message={deliveryErrors.city} /> : null}
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
                  autoComplete="postal-code"
                  aria-invalid={Boolean(showDeliveryErrors && deliveryErrors.postalCode)}
                  className={fieldInputClass(showDeliveryErrors && Boolean(deliveryErrors.postalCode))}
                  value={address.postalCode}
                  onChange={(event) => setAddress((current) => ({ ...current, postalCode: event.target.value }))}
                  placeholder="92101"
                />
                {showDeliveryErrors ? <FieldError message={deliveryErrors.postalCode} /> : null}
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
                  <div className="grid gap-2 text-sm font-extrabold md:col-span-2">
                    I am a
                    <div className="flex flex-wrap gap-2">
                      {(
                        [
                          { value: "STUDENT" as const, label: "Student" },
                          { value: "MILITARY" as const, label: "Military person" },
                        ]
                      ).map(({ value, label }) => (
                        <button
                          key={value}
                          type="button"
                          aria-pressed={student.verificationType === value}
                          onClick={() =>
                            setStudent((current) => ({ ...current, verificationType: value }))
                          }
                          className={cn(
                            "rounded-full border px-4 py-2 text-sm font-extrabold transition",
                            student.verificationType === value
                              ? "border-ink bg-ink text-ivory"
                              : "border-ink/10 bg-white text-ink/60 hover:border-masala/35 hover:text-ink",
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <label className="grid min-w-0 gap-2 text-sm font-extrabold">
                    {student.verificationType === "MILITARY"
                      ? "Branch / organization"
                      : "University / school name"}
                    <input
                      placeholder={
                        student.verificationType === "MILITARY"
                          ? "e.g. U.S. Army, U.S. Navy"
                          : "e.g. San Diego State University"
                      }
                      aria-invalid={Boolean(showDeliveryErrors && deliveryErrors.universityName)}
                      className={fieldInputClass(showDeliveryErrors && Boolean(deliveryErrors.universityName), true)}
                      value={student.universityName}
                      onChange={(event) => setStudent((current) => ({ ...current, universityName: event.target.value }))}
                    />
                    {showDeliveryErrors ? <FieldError message={deliveryErrors.universityName} /> : null}
                  </label>
                  <label className="grid min-w-0 gap-2 text-sm font-extrabold">
                    {student.verificationType === "MILITARY"
                      ? "Service / DoD ID number"
                      : "Student ID / roll number"}
                    <input
                      aria-invalid={Boolean(showDeliveryErrors && deliveryErrors.studentNumber)}
                      className={fieldInputClass(showDeliveryErrors && Boolean(deliveryErrors.studentNumber), true)}
                      value={student.studentNumber}
                      onChange={(event) => setStudent((current) => ({ ...current, studentNumber: event.target.value }))}
                    />
                    {showDeliveryErrors ? <FieldError message={deliveryErrors.studentNumber} /> : null}
                  </label>
                  {(
                    [
                      {
                        side: "front" as const,
                        url: student.idCardUrl,
                        error: deliveryErrors.idCardFront,
                      },
                      {
                        side: "back" as const,
                        url: student.idCardBackUrl,
                        error: deliveryErrors.idCardBack,
                      },
                    ]
                  ).map(({ side, url, error }) => (
                    <div key={side} className="grid min-w-0 gap-2 text-sm font-extrabold">
                      {`${student.verificationType === "MILITARY" ? "Military" : "Student"} ID - ${side}`}
                      <label
                        className={cn(
                          "flex min-w-0 cursor-pointer items-center justify-between gap-3 rounded-button border bg-white px-4 py-3 transition",
                          showDeliveryErrors && error
                            ? "border-masala/60"
                            : "border-ink/10 hover:border-leaf",
                        )}
                      >
                        <span className="flex min-w-0 items-center gap-3 text-sm font-bold text-ink/70">
                          {idUploadingSide === side ? (
                            <Loader2 className="shrink-0 animate-spin text-masala" size={17} />
                          ) : url ? (
                            <CheckCircle2 className="shrink-0 text-leaf" size={17} />
                          ) : (
                            <Upload className="shrink-0 text-masala" size={17} />
                          )}
                          <span className="truncate">
                            {idUploadingSide === side
                              ? "Uploading..."
                              : idCardNames[side] || `Upload the ${side} of your ID`}
                          </span>
                        </span>
                        <span className="shrink-0 rounded-full bg-ink px-3 py-1 text-xs font-black text-saffron">
                          {url ? "Replace" : "Browse"}
                        </span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
                          className="hidden"
                          disabled={idUploadingSide !== null}
                          onChange={(event) => handleIdUpload(side, event)}
                        />
                      </label>
                      {showDeliveryErrors ? <FieldError message={error} /> : null}
                    </div>
                  ))}
                  <span className="text-xs font-bold text-ink/45 md:col-span-2">
                    {`Upload both sides of your ${student.verificationType === "MILITARY" ? "military" : "student"} ID. JPG, PNG, WEBP, HEIC, or PDF up to 5MB each. Only the Curry Kitchen team can view them.`}
                  </span>
                </div>
              ) : null}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button variant="secondary" onClick={() => setStep(0)}>
                <ArrowLeft size={18} />
                Back
              </Button>
              <Button
                onClick={() => {
                  if (!deliveryReady) {
                    setShowDeliveryErrors(true);
                    toast.error("Some details are missing", {
                      description: "Fix the highlighted fields to continue.",
                    });
                    return;
                  }

                  setStep(2);
                }}
              >
                Continue to payment
              </Button>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-masala">Payment method</p>
            <p className="mt-2 text-sm font-bold text-ink/55">Choose how you want to pay for this order.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Payment method">
              {paymentMethods.map((method) => {
                const selected = paymentMethod === method.value;

                return (
                  <button
                    key={method.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setPaymentMethod(method.value)}
                    className={cn(
                      "flex items-center justify-between gap-4 rounded-lg border bg-white p-4 text-left transition",
                      selected
                        ? "border-saffron shadow-[0_10px_28px_rgba(255,122,26,0.16)] ring-2 ring-saffron/30"
                        : "border-ink/10 hover:border-masala/35",
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span
                        className={cn(
                          "grid size-5 shrink-0 place-items-center rounded-full border-2 transition",
                          selected ? "border-saffron" : "border-ink/20",
                        )}
                      >
                        {selected ? <span className="size-2.5 rounded-full bg-saffron" /> : null}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-extrabold">{method.label}</span>
                        <span className="mt-0.5 block truncate text-xs font-bold text-ink/50">
                          {method.description}
                        </span>
                      </span>
                    </span>
                    <span className="shrink-0 text-ink">{method.icons}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 rounded-lg border border-ink/10 bg-ivory p-4">
              {paymentMethod === "ZELLE" ? (
                <div className="text-sm font-bold text-ink/70">
                  <p className="font-extrabold text-ink">How Zelle payment works</p>
                  <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs font-bold leading-5 text-ink/60">
                    <li>Place the order — your packages are reserved with payment pending.</li>
                    <li>
                      Send the order total via Zelle to{" "}
                      <span className="font-black text-masala">info@currykitcheninc.com</span> with your
                      order number in the memo.
                    </li>
                    <li>Our team confirms the transfer and activates your deliveries.</li>
                  </ol>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-4">
                  <p className="text-xs font-bold leading-5 text-ink/55">
                    {paymentMethod === "APPLE_PAY"
                      ? "You'll confirm with Apple Pay on Stripe's secure payment page after placing the order."
                      : "Card details are entered on Stripe's secure payment page after placing the order."}
                  </p>
                  <CreditCard className="shrink-0 text-leaf" size={28} />
                </div>
              )}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button variant="secondary" onClick={() => setStep(1)}>
                <ArrowLeft size={18} />
                Back
              </Button>
              <Button onClick={submitCheckout} disabled={loading}>
                {loading ? <Loader2 className="animate-spin" size={18} /> : null}
                {loading
                  ? "Placing order"
                  : !isSignedIn
                    ? "Sign in to confirm"
                    : paymentMethod === "ZELLE"
                      ? "Place order - pay via Zelle"
                      : "Confirm order"}
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

        <div className="relative mt-5">
          {appliedCoupon ? (
            <div className="flex items-center justify-between gap-3 rounded-button border border-saffron/40 bg-white/5 px-4 py-3">
              <span className="flex items-center gap-2 text-sm font-extrabold">
                <BadgePercent className="text-saffron" size={17} />
                <span className="font-mono uppercase text-saffron">{appliedCoupon.code}</span>
                <span className="text-ivory/62">
                  {appliedCoupon.type === "PERCENT"
                    ? `${appliedCoupon.value}% off`
                    : `${formatCurrency(appliedCoupon.value)} off`}
                </span>
              </span>
              <button
                type="button"
                onClick={removeCoupon}
                aria-label="Remove coupon"
                className="grid size-8 place-items-center rounded-full text-ivory/55 transition hover:bg-white/10 hover:text-ivory"
              >
                <X size={15} />
              </button>
            </div>
          ) : (
            <div>
              <div className="flex gap-2">
                <input
                  value={couponInput}
                  onChange={(event) => {
                    setCouponInput(event.target.value);
                    setCouponError("");
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      applyCoupon();
                    }
                  }}
                  placeholder="Coupon code"
                  className="h-11 min-w-0 flex-1 rounded-button border border-white/15 bg-white/10 px-4 font-mono text-sm font-bold uppercase text-ivory outline-none transition placeholder:font-sans placeholder:normal-case placeholder:text-ivory/40 focus:border-saffron"
                />
                <button
                  type="button"
                  onClick={applyCoupon}
                  disabled={couponLoading}
                  className="inline-flex shrink-0 items-center gap-2 rounded-button bg-saffron px-4 text-sm font-black text-ink transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {couponLoading ? <Loader2 className="animate-spin" size={15} /> : null}
                  Apply
                </button>
              </div>
              {couponError ? (
                <p role="alert" className="mt-2 flex items-center gap-1.5 text-xs font-bold text-saffron">
                  <CircleAlert size={13} className="shrink-0" />
                  {couponError}
                </p>
              ) : null}
            </div>
          )}
        </div>

        <div className="relative mt-5 grid gap-4 text-sm font-bold">
          <div className="flex justify-between border-b border-white/10 pb-4">
            <span className="text-ivory/62">Package subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {discountAmount > 0 && appliedCoupon ? (
            <div className="flex justify-between border-b border-white/10 pb-4">
              <span className="text-ivory/62">Discount · {appliedCoupon.code}</span>
              <span className="text-saffron">-{formatCurrency(discountAmount)}</span>
            </div>
          ) : null}
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
