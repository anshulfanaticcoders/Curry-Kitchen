import { CreditCard, PackageCheck } from "lucide-react";
import { CheckoutFlow } from "@/components/checkout/checkout-flow";
import { PageHero } from "@/components/sections/page-hero";
import { ButtonLink } from "@/components/ui/button";
import { getDeliveryZoneManagerData } from "@/lib/server/admin";
import { getPackagePlans } from "@/lib/server/catalog";
import {
  makePackageCartLineId,
  parsePackageCart,
  type PackageCartItemInput,
} from "@/lib/package-cart";
import { nextEligiblePackageStartInput } from "@/lib/package-schedule";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ package?: string; addons?: string; cart?: string }>;
}) {
  const [params, packagePlans, deliveryZones] = await Promise.all([
    searchParams,
    getPackagePlans(),
    getDeliveryZoneManagerData(),
  ]);
  let initialItems = parsePackageCart(params.cart);

  if (!initialItems.length && params.package) {
    const legacyPlan = packagePlans.find((plan) => plan.id === params.package);
    const requestedAddonIds = params.addons?.split(",").filter(Boolean) ?? [];
    const eligibleAddonIds =
      legacyPlan?.addOns
        .filter((addon) => requestedAddonIds.includes(addon.id))
        .map((addon) => addon.id) ?? [];
    const fallbackAddonId = legacyPlan?.addOns[0]?.id;

    if (legacyPlan && (eligibleAddonIds.length || fallbackAddonId)) {
      initialItems = [
        {
          lineId: makePackageCartLineId(),
          packageId: legacyPlan.id,
          addonIds: eligibleAddonIds.length ? eligibleAddonIds : [fallbackAddonId as string],
          startDate: nextEligiblePackageStartInput(),
        } satisfies PackageCartItemInput,
      ];
    }
  }

  return (
    <main>
      <PageHero
        eyebrow="Checkout"
        title="One checkout for every tiffin plan."
        image="https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=1400&q=80"
        imageAlt="Fresh Indian food packed for delivery"
        chips={["Plan", "Delivery", "Payment"]}
        actions={
          <>
            <ButtonLink href="/packages">
              <PackageCheck size={18} />
              Change package
            </ButtonLink>
            <ButtonLink href="/dashboard" variant="secondary">
              <CreditCard size={18} />
              View dashboard
            </ButtonLink>
          </>
        }
        imageCaption={
          <>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-saffron">
              Secure meal setup
            </p>
            <p className="mt-2 font-display text-3xl font-black leading-none">
              Confirm your tiffin, delivery window, and food notes.
            </p>
          </>
        }
      >
        Review each package, confirm one shared delivery address, and pay for the complete order
        in a focused step-by-step flow.
      </PageHero>
      <CheckoutFlow
        plans={packagePlans}
        deliveryZones={deliveryZones}
        initialItems={initialItems}
      />
    </main>
  );
}
