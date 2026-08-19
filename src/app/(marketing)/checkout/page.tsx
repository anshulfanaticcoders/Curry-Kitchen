import { CreditCard, PackageCheck } from "lucide-react";
import type { Metadata } from "next";
import { CheckoutFlow } from "@/components/checkout/checkout-flow";
import { PageHero } from "@/components/sections/page-hero";
import { ButtonLink } from "@/components/ui/button";
import { getAdminSettings, getDeliveryZoneManagerData } from "@/lib/server/admin";
import {
  getCustomPackageItems,
  getCustomerProfileDetails,
  getPackagePlans,
} from "@/lib/server/catalog";
import {
  makePackageCartLineId,
  parsePackageCart,
  type PackageCartItemInput,
} from "@/lib/package-cart";
import { deliveryWeekdaysFromText } from "@/lib/business-rules";
import { nextEligiblePackageStartInput } from "@/lib/package-schedule";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Checkout", robots: { index: false, follow: false } };

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ package?: string; cart?: string }>;
}) {
  const [params, packagePlans, customPackageItems, deliveryZones, customerProfile, adminSettings] =
    await Promise.all([
      searchParams,
      getPackagePlans(),
      getCustomPackageItems(),
      getDeliveryZoneManagerData(),
      getCustomerProfileDetails(),
      getAdminSettings(),
    ]);
  const deliveryWeekdayCount = deliveryWeekdaysFromText(adminSettings.deliveryDays).length;
  let initialItems = parsePackageCart(params.cart);

  if (!initialItems.length && params.package) {
    const legacyPlan = packagePlans.find((plan) => plan.id === params.package);

    if (legacyPlan) {
      initialItems = [
        {
          kind: "plan",
          lineId: makePackageCartLineId(),
          packageId: legacyPlan.id,
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
        customItems={customPackageItems}
        customMonthlyDays={adminSettings.customMonthlyDays}
        deliveryWeekdayCount={deliveryWeekdayCount}
        deliveryZones={deliveryZones}
        initialItems={initialItems}
        customerProfile={customerProfile}
        taxRate={adminSettings.taxRate}
      />
    </main>
  );
}
