import { ArrowRight, ListChecks } from "lucide-react";
import { PageHero } from "@/components/sections/page-hero";
import { PackageExperience } from "@/components/sections/package-experience";
import { AnimatedSection } from "@/components/ui/animated-section";
import { ButtonLink } from "@/components/ui/button";
import { getPackagePlans } from "@/lib/server/catalog";
import { parsePackageCart } from "@/lib/package-cart";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PackagesPage({
  searchParams,
}: {
  searchParams: Promise<{
    plan?: string | string[];
    cart?: string | string[];
    edit?: string | string[];
  }>;
}) {
  const [params, packagePlans] = await Promise.all([searchParams, getPackagePlans()]);
  const initialPlanId = Array.isArray(params.plan) ? params.plan[0] : params.plan;
  const cartParam = Array.isArray(params.cart) ? params.cart[0] : params.cart;
  const editLineId = Array.isArray(params.edit) ? params.edit[0] : params.edit;
  const initialCartItems = parsePackageCart(cartParam);

  return (
    <main>
      <PageHero
        eyebrow="Packages"
        title="Choose the tiffin rhythm that fits the week."
        image="https://images.unsplash.com/photo-1630409346824-4f0e7b080087?auto=format&fit=crop&w=1400&q=80"
        imageAlt="Stacked tiffin meal containers"
        chips={["Weekly trial packages", "Monthly fixed packages", "Student and military packages"]}
        actions={
          <>
            <ButtonLink href="#build-plan">
              Build your plan
              <ArrowRight size={18} />
            </ButtonLink>
            <ButtonLink href="#comparison" variant="secondary">
              <ListChecks size={18} />
              Compare plans
            </ButtonLink>
          </>
        }
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
        Compare portions, cadence, add-ons, and estimated totals without the clutter of a generic
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
          />
        </AnimatedSection>
      </section>

      {/* Comparison — DARK band */}
      <section id="comparison" className="section dark-band relative text-white">
        <AnimatedSection className="relative">
          <div className="mb-8 max-w-2xl">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-saffron">Comparison</p>
            <h2 className="mt-3 font-display text-3xl font-black leading-[1.04] lg:text-4xl">
              Simple plan math, no hidden steps.
            </h2>
          </div>
          <div className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.04] backdrop-blur-sm">
            <div className="grid grid-cols-[1.1fr_0.8fr_0.8fr_1fr] gap-4 border-b border-white/10 bg-white/[0.04] px-5 py-4 text-xs font-black uppercase tracking-[0.14em] text-white/55">
              <span>Plan</span>
              <span>Price</span>
              <span>Cadence</span>
              <span>Best for</span>
            </div>
            {packagePlans.map((plan) => (
              <div
                key={plan.id}
                className="grid grid-cols-[1.1fr_0.8fr_0.8fr_1fr] items-center gap-4 border-b border-white/8 px-5 py-5 text-sm transition last:border-0 hover:bg-white/[0.04]"
              >
                <span className="font-extrabold">{plan.name}</span>
                <span className="font-black text-saffron">{formatCurrency(plan.price)}</span>
                <span className="text-white/60">{plan.cadence}</span>
                <span className="text-white/60">{plan.bestFor}</span>
              </div>
            ))}
          </div>
          <div className="mt-8">
            <ButtonLink href="#build-plan">
              Build your plan
              <ArrowRight size={18} />
            </ButtonLink>
          </div>
        </AnimatedSection>
      </section>
    </main>
  );
}
