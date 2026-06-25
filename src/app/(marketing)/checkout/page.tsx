import { CreditCard, PackageCheck } from "lucide-react";
import { CheckoutFlow } from "@/components/checkout/checkout-flow";
import { PageHero } from "@/components/sections/page-hero";
import { ButtonLink } from "@/components/ui/button";
import { getDeliveryZoneManagerData } from "@/lib/server/admin";
import { getPackagePlans } from "@/lib/server/catalog";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ package?: string; addons?: string }>;
}) {
  const [params, packagePlans, deliveryZones] = await Promise.all([
    searchParams,
    getPackagePlans(),
    getDeliveryZoneManagerData(),
  ]);
  const initialAddonIds = params.addons?.split(",").filter(Boolean) ?? [];

  return (
    <main>
      <PageHero
        eyebrow="Checkout"
        title="A cleaner path from plan to delivery."
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
        Select the right plan, tune delivery preferences, and confirm the weekly dinner routine
        in a focused step-by-step flow.
      </PageHero>
      <CheckoutFlow
        plans={packagePlans}
        deliveryZones={deliveryZones}
        initialPackageId={params.package}
        initialAddonIds={initialAddonIds}
      />
    </main>
  );
}
