import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, ArrowRight, CheckCircle2, Gift, PackagePlus } from "lucide-react";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/json-ld";
import { ButtonLink } from "@/components/ui/button";
import { getPackagePlanBySlug } from "@/lib/server/catalog";
import { getMarketingMetadata, getPackageSchemas } from "@/lib/server/seo";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const plan = await getPackagePlanBySlug(slug);
  if (!plan) notFound();
  return getMarketingMetadata(`/packages/${plan.slug}`, plan);
}

export default async function PackageDetailPage({ params }: Props) {
  const { slug } = await params;
  const plan = await getPackagePlanBySlug(slug);
  if (!plan) notFound();
  const schemas = await getPackageSchemas(plan);

  return (
    <main className="bg-white text-ink">
      <JsonLd data={schemas} />
      <div className="section-shell pt-28 lg:pt-32">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm font-bold text-ink/52">
          <Link href="/" className="transition hover:text-masala">Home</Link>
          <span aria-hidden="true">/</span>
          <Link href="/packages" className="transition hover:text-masala">Packages</Link>
          <span aria-hidden="true">/</span>
          <span className="text-ink">{plan.name}</span>
        </nav>
      </div>

      <section className="section pt-8">
        <div className="section-shell grid items-stretch gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="relative min-h-[420px] overflow-hidden rounded-lg bg-ink lg:min-h-[610px]">
            <Image src={plan.image} alt={`${plan.name} tiffin meal`} fill priority className="object-cover" sizes="(min-width: 1024px) 55vw, 100vw" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/10" />
            <p className="absolute bottom-6 left-6 rounded-full bg-saffron px-4 py-2 text-xs font-black uppercase tracking-[0.15em]">{plan.badge}</p>
          </div>

          <div className="flex flex-col justify-center rounded-lg border border-ink/10 bg-ivory p-7 shadow-soft lg:p-10">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-masala">{plan.category} tiffin plan</p>
            <h1 className="mt-3 font-display text-4xl font-black leading-[1.12] lg:text-6xl">{plan.name}</h1>
            <p className="mt-5 text-base font-medium leading-8 text-ink/66">{plan.description}</p>
            <div className="mt-7 grid grid-cols-2 gap-4 border-y border-ink/10 py-6">
              <div><p className="text-xs font-black uppercase tracking-[0.14em] text-ink/42">Price</p><p className="mt-2 font-display text-3xl font-black">{formatCurrency(plan.price)}</p></div>
              <div><p className="text-xs font-black uppercase tracking-[0.14em] text-ink/42">Cadence</p><p className="mt-2 text-lg font-extrabold">{plan.cadence}</p></div>
              <div><p className="text-xs font-black uppercase tracking-[0.14em] text-ink/42">Portions</p><p className="mt-2 text-sm font-extrabold leading-6">{plan.servings}</p></div>
              <div><p className="text-xs font-black uppercase tracking-[0.14em] text-ink/42">Best for</p><p className="mt-2 text-sm font-extrabold leading-6">{plan.bestFor}</p></div>
            </div>
            <div className="mt-7 flex flex-wrap gap-3">
              <ButtonLink href={`/packages?plan=${encodeURIComponent(plan.id)}#build-plan`}>Select this plan <ArrowRight size={18} /></ButtonLink>
              <ButtonLink href={`/packages/customize?plan=${encodeURIComponent(plan.id)}`} variant="secondary"><PackagePlus size={18} />Customize</ButtonLink>
            </div>
          </div>
        </div>
      </section>

      <section className="section bg-rose">
        <div className="section-shell grid gap-6 lg:grid-cols-3">
          <article className="rounded-lg border border-ink/10 bg-white p-7 shadow-soft">
            <CheckCircle2 className="text-masala" size={24} />
            <h2 className="mt-4 font-display text-2xl font-black">What is included</h2>
            <ul className="mt-5 grid gap-3">{plan.includes.map((item) => <li key={item} className="flex gap-2 text-sm font-bold leading-6 text-ink/68"><CheckCircle2 className="mt-0.5 shrink-0 text-leaf" size={16} />{item}</li>)}</ul>
          </article>
          <article className="rounded-lg border border-ink/10 bg-white p-7 shadow-soft">
            <Gift className="text-masala" size={24} />
            <h2 className="mt-4 font-display text-2xl font-black">Complimentary items</h2>
            <ul className="mt-5 grid gap-4">{plan.complimentaryItems.length ? plan.complimentaryItems.map((item) => <li key={item.id}><p className="text-sm font-extrabold">{item.name}</p>{item.description ? <p className="mt-1 text-xs leading-5 text-ink/55">{item.description}</p> : null}</li>) : <li className="text-sm text-ink/55">No complimentary items are currently listed.</li>}</ul>
          </article>
          <article className="rounded-lg border border-ink/10 bg-white p-7 shadow-soft">
            <PackagePlus className="text-masala" size={24} />
            <h2 className="mt-4 font-display text-2xl font-black">Eligible add-ons</h2>
            <ul className="mt-5 grid gap-4">{plan.addOns.length ? plan.addOns.map((addon) => <li key={addon.id} className="flex justify-between gap-4"><div><p className="text-sm font-extrabold">{addon.name}</p><p className="mt-1 text-xs leading-5 text-ink/55">{addon.description}</p></div><span className="text-sm font-black">{formatCurrency(addon.price)}</span></li>) : <li className="text-sm text-ink/55">No add-ons are currently available.</li>}</ul>
          </article>
        </div>
      </section>

      <section className="section bg-ink text-white">
        <div className="section-shell flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div><p className="text-sm font-black uppercase tracking-[0.18em] text-saffron">Ready for dinner?</p><h2 className="mt-3 font-display text-3xl font-black">Choose {plan.name} and set your start date.</h2></div>
          <ButtonLink href={`/packages?plan=${encodeURIComponent(plan.id)}#build-plan`}>Select plan <ArrowRight size={18} /></ButtonLink>
        </div>
      </section>

      <div className="section-shell py-8"><Link href="/packages" className="inline-flex items-center gap-2 text-sm font-extrabold text-ink/58 hover:text-masala"><ArrowLeft size={16} />Back to all packages</Link></div>
    </main>
  );
}
