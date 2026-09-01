import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/json-ld";
import { PageHero } from "@/components/sections/page-hero";
import { PackageExperience } from "@/components/sections/package-experience";
import { AnimatedSection } from "@/components/ui/animated-section";
import { getPackagePlans } from "@/lib/server/catalog";
import { parsePackageCart } from "@/lib/package-cart";
import { getPageBackgrounds } from "@/lib/server/page-backgrounds";
import { formatCurrency } from "@/lib/utils";
import { getMarketingMetadata, getPackagesSchemas } from "@/lib/server/seo";
import { getPackageScheduleAvailability } from "@/lib/server/delivery-schedule-adjustments";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return getMarketingMetadata("/packages");
}

export default async function PackagesPage({
  searchParams,
}: {
  searchParams: Promise<{
    plan?: string | string[];
    cart?: string | string[];
    edit?: string | string[];
  }>;
}) {
  const [params, packagePlans, backgrounds, availability] = await Promise.all([
    searchParams,
    getPackagePlans(),
    getPageBackgrounds(),
    getPackageScheduleAvailability(),
  ]);
  const initialPlanId = Array.isArray(params.plan) ? params.plan[0] : params.plan;
  const cartParam = Array.isArray(params.cart) ? params.cart[0] : params.cart;
  const editLineId = Array.isArray(params.edit) ? params.edit[0] : params.edit;
  const initialCartItems = parsePackageCart(cartParam);
  const schemas = await getPackagesSchemas(packagePlans);

  return (
    <main>
      <JsonLd data={schemas} />
      <PageHero
        eyebrow="Packages"
        title="Choose the tiffin rhythm that fits the week."
        image={backgrounds["packages.hero"].imageUrl}
        imageAlt="Stacked tiffin meal containers"
        focalPoint={backgrounds["packages.hero"].focalPoint}
        overlay={backgrounds["packages.hero"].overlay}
        imageCaption={
          <>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-saffron">
              Most loved
            </p>
            <p className="mt-2 font-display text-3xl font-black leading-none">
              Regular 8 Roti Tiffin for steady weeknight dinners.
            </p>
          </>
        }
      >
        Compare portions, package duration, and estimated totals without the clutter of a generic
        ecommerce product page.
      </PageHero>

      {/* Build your plan — LIGHT */}
      <section className="section relative bg-ivory">
        <AnimatedSection>
          <PackageExperience
            plans={packagePlans}
            initialPlanId={initialPlanId}
            initialCartItems={initialCartItems}
            initialEditLineId={editLineId}
            availability={availability}
          />
        </AnimatedSection>
      </section>

      {/* Comparison — DARK band */}
      <section id="comparison" className="section dark-band relative text-white">
        <AnimatedSection className="relative">
          <div className="mb-8 max-w-2xl">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-saffron">Comparison</p>
            <h2 className="mt-3 font-display text-3xl font-black leading-[1.12] lg:text-4xl">
              Simple plan math, no hidden steps.
            </h2>
          </div>
          <div className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.04] backdrop-blur-sm">
            <div className="hidden grid-cols-[1.1fr_0.8fr_0.8fr_1fr] gap-4 border-b border-white/10 bg-white/[0.04] px-5 py-4 sm:grid text-xs font-black uppercase tracking-[0.14em] text-white/55">
              <span>Plan</span>
              <span>Price</span>
              <span>Delivery days</span>
              <span>Best for</span>
            </div>
            {packagePlans.map((plan) => (
              <div
                key={plan.id}
                className="grid grid-cols-2 items-center gap-x-4 gap-y-2 border-b border-white/8 px-5 py-5 sm:grid-cols-[1.1fr_0.8fr_0.8fr_1fr] sm:gap-4 text-sm transition last:border-0 hover:bg-white/[0.04]"
              >
                <span className="font-extrabold">{plan.name}</span>
                <span className="text-right font-black text-saffron sm:text-left">{formatCurrency(plan.price)}</span>
                <span className="text-white/60">{plan.cadence}</span>
                <span className="text-right text-white/60 sm:text-left">{plan.bestFor}</span>
              </div>
            ))}
          </div>
        </AnimatedSection>
      </section>
    </main>
  );
}
