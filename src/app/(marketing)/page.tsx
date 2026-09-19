import type { Metadata } from "next";
import {
  ArrowRight,
  CalendarRange,
  ClipboardCheck,
  CookingPot,
  FileText,
  Truck,
} from "lucide-react";
import { PackageCard } from "@/components/food/package-card";
import { MenuEmptyState } from "@/components/food/menu-empty-state";
import { JsonLd } from "@/components/seo/json-ld";
import { HeroSection } from "@/components/sections/hero-section";
import { TestimonialsCarousel } from "@/components/sections/testimonials-carousel";
import { RevealItem, StaggerGroup } from "@/components/ui/animated-section";
import { ButtonLink } from "@/components/ui/button";
import { getBusinessRules } from "@/lib/business-rules";
import { getAdminSettings } from "@/lib/server/admin";
import { getActiveMenuUploads, getPackagePlans, getTestimonials } from "@/lib/server/catalog";
import { getPageBackgrounds } from "@/lib/server/page-backgrounds";
import { getHomeSchemas, getMarketingMetadata } from "@/lib/server/seo";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return getMarketingMetadata("/");
}

const steps = [
  {
    icon: CookingPot,
    title: "Choose your dabba",
    copy: "Pick a weekly, monthly, or student plan — or build your own dabba from the dishes you love.",
  },
  {
    icon: ClipboardCheck,
    title: "Know your dabba",
    copy: "See exactly what is packed each day, set your start date and preferences, and pay the way you like.",
  },
  {
    icon: Truck,
    title: "Dabba delivery",
    copy: "Prepared fresh in the morning and delivered to your doorstep for lunch or dinner.",
  },
];

const tiffinElements = [
  ["Soft roti", "Made fresh for the day."],
  ["Seasonal sabzi", "The warm centre of every meal."],
  ["Dal and rice", "The familiar comfort you expect."],
  ["A fresh side", "A little lift with every tiffin."],
];

const backgroundOverlay = {
  NONE: "bg-transparent",
  LIGHT: "bg-black/20",
  MEDIUM: "bg-black/42",
  DARK: "bg-black/64",
} as const;

export default async function Home() {
  const [packagePlans, testimonials, schemas, backgrounds, settings, rules, menuUploads] = await Promise.all([
    getPackagePlans(),
    getTestimonials(),
    getHomeSchemas(),
    getPageBackgrounds(),
    getAdminSettings(),
    getBusinessRules(),
    getActiveMenuUploads(),
  ]);
  const featuredPlans = packagePlans.filter((plan) => plan.isFeatured).slice(0, 3);
  const featuredMenus = menuUploads.slice(0, 3);
  return (
    <main className="overflow-hidden bg-[#fffdf9] text-ink">
      <JsonLd data={schemas} />
      <HeroSection
        background={backgrounds["home.hero"]}
        facts={{
          deliveryDays: settings.deliveryDays,
          deliveryWindow: `${rules.deliveryWindow} PT`,
          serviceAreas: settings.serviceAreas,
        }}
      />

      <section className="section bg-[#fffdf9]">
        <StaggerGroup className="section-shell grid items-center gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:gap-20">
          <div className="max-w-xl">
            <RevealItem as="h2" className="font-display text-4xl font-black leading-[1.08] sm:text-5xl">
              Guilt free eating..! <span className="text-saffron">Ghar Ka Khana Roz Khana</span>
            </RevealItem>
            <RevealItem className="mt-5">
              <h3 className="font-display text-2xl font-black leading-tight text-ink/78 sm:text-3xl">
                Healthy, delicious meals, delivered.
              </h3>
            </RevealItem>
            <RevealItem as="p" className="mt-5 max-w-lg text-base leading-7 text-ink/62">
              Authentic North Indian vegetarian meals, freshly prepared with quality ingredients and delivered to your
              doorstep with care.
            </RevealItem>
            <RevealItem className="mt-8">
              <ButtonLink href="/packages" className="rounded-full px-6">
                Explore our meals
                <ArrowRight size={18} />
              </ButtonLink>
            </RevealItem>
          </div>

          <RevealItem className="relative min-h-[340px] overflow-hidden rounded-lg sm:min-h-[440px]">
            {/* eslint-disable-next-line @next/next/no-img-element -- this image is selected by an admin and may be hosted externally. */}
            <img
              src={backgrounds["home.comfort"].imageUrl}
              alt="A comforting home-style Indian meal, freshly prepared"
              className="absolute inset-0 size-full object-cover transition duration-700 hover:scale-[1.025]"
              style={{ objectPosition: `${backgrounds["home.comfort"].focalPoint.toLowerCase()} center` }}
            />
            <div className={`absolute inset-0 ${backgroundOverlay[backgrounds["home.comfort"].overlay]}`} />
            <p className="absolute bottom-6 left-6 max-w-xs text-sm font-bold leading-6 text-white">
              Freshly made in San Diego, for people who miss Ghar Ka Khana.
            </p>
          </RevealItem>
        </StaggerGroup>
      </section>

        <section className="dark-band relative overflow-hidden py-20 text-white lg:py-24">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,rgba(255,122,26,0.14),transparent_31%)]" />
          <StaggerGroup className="section-shell relative">
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div className="max-w-2xl">
                <RevealItem as="p" className="text-xs font-black uppercase tracking-[0.18em] text-saffron">
                  Fresh from the kitchen
                </RevealItem>
                <RevealItem as="h2" className="mt-3 font-display text-4xl font-black leading-[1.08] sm:text-5xl">
                  This month&apos;s menus, week by week.
                </RevealItem>
              </div>
              {featuredMenus.length > 0 ? <RevealItem>
                <ButtonLink href="/menu" variant="secondary" className="rounded-full border-white/20 bg-transparent px-6 text-white hover:bg-white hover:text-ink">
                  View full menu
                  <ArrowRight size={18} />
                </ButtonLink>
              </RevealItem> : null}
            </div>

            {featuredMenus.length > 0 ? <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {featuredMenus.map((menu) => (
                    <RevealItem key={menu.id}>
                      <a
                        href={`/menu/view/${menu.id}`}
                        className="group block overflow-hidden rounded-lg border border-white/12 bg-white text-ink transition duration-500 hover:-translate-y-1 hover:border-saffron/55 hover:shadow-[0_22px_65px_rgba(0,0,0,0.34)]"
                      >
                        <span className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-[#f7f1e9]">
                          {menu.isPdf ? (
                            <span className="flex flex-col items-center gap-3 text-center">
                              <span className="grid size-14 place-items-center rounded-full bg-saffron text-ink">
                                <FileText size={25} />
                              </span>
                              <span className="text-sm font-black">Open PDF menu</span>
                            </span>
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element -- admin-uploaded menu artwork can have any dimensions.
                            <img
                              src={menu.fileUrl}
                              alt={`${menu.title} Curry Kitchen menu`}
                              loading="lazy"
                              className="size-full object-contain object-center transition duration-700 group-hover:scale-[1.025]"
                            />
                          )}
                        </span>
                        <span className="flex items-center justify-between gap-4 px-5 py-4">
                          <span>
                            <span className="block font-display text-xl font-black">{menu.title}</span>
                            <span className="mt-1 flex items-center gap-1.5 text-xs font-bold text-ink/55">
                              <CalendarRange size={14} />
                              {menu.dateRangeLabel}
                            </span>
                          </span>
                          <ArrowRight className="shrink-0 transition duration-300 group-hover:translate-x-1" size={19} />
                        </span>
                      </a>
                    </RevealItem>
                  ))}
            </div> : <MenuEmptyState dark />}
          </StaggerGroup>
        </section>

      <section className="section bg-[#f8f0e7]">
        <StaggerGroup className="section-shell">
          <div className="mx-auto max-w-2xl text-center">
            <RevealItem as="h2" className="font-display text-4xl font-black leading-[1.1] sm:text-5xl">
              How your dabba works.
            </RevealItem>
            <RevealItem as="p" className="mx-auto mt-5 max-w-xl text-base leading-7 text-ink/58">
              From picking a plan to opening the lid — three simple steps, no fuss.
            </RevealItem>
          </div>

          <div className="mt-14 grid gap-10 lg:grid-cols-3 lg:gap-16">
            {steps.map((step, index) => (
              <RevealItem key={step.title} as="article" className="relative text-center">
                {index < steps.length - 1 ? (
                  <ArrowRight
                    aria-hidden
                    className="absolute -right-9 top-9 hidden text-ink/28 lg:block"
                    size={22}
                  />
                ) : null}
                <span className="mx-auto grid size-[4.6rem] place-items-center rounded-full bg-saffron/12 text-saffron">
                  <step.icon size={28} strokeWidth={1.8} />
                </span>
                <h3 className="mt-6 font-display text-2xl font-black">{step.title}</h3>
                <p className="mx-auto mt-3 max-w-[16rem] text-sm leading-6 text-ink/58">{step.copy}</p>
              </RevealItem>
            ))}
          </div>
        </StaggerGroup>
      </section>

      {featuredPlans.length ? (
        <section className="section bg-[#fffdf9]">
          <StaggerGroup className="section-shell">
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div className="max-w-2xl">
                <RevealItem as="h2" className="font-display text-4xl font-black leading-[1.08] sm:text-5xl">
                  A dinner rhythm for every week.
                </RevealItem>
                <RevealItem as="p" className="mt-5 max-w-xl text-base leading-7 text-ink/60">
                  Start small, commit to the month, or choose a plan built for student life. Every package stays
                  clear about portions, dates, and what is included.
                </RevealItem>
              </div>
              <RevealItem>
                <ButtonLink href="/packages" variant="dark" className="rounded-full px-6">
                  View all packages
                  <ArrowRight size={18} />
                </ButtonLink>
              </RevealItem>
            </div>

            <div className="mt-12 grid gap-5 lg:grid-cols-3">
              {featuredPlans.map((plan) => (
                <RevealItem key={plan.id}>
                  <PackageCard plan={plan} />
                </RevealItem>
              ))}
            </div>
          </StaggerGroup>
        </section>
      ) : null}

      <section className="dark-band relative overflow-hidden py-20 text-white lg:py-28">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_42%,rgba(255,122,26,0.16),transparent_30%)]" />
        <StaggerGroup className="section-shell relative grid items-center gap-12 lg:grid-cols-[1.06fr_0.94fr] lg:gap-20">
          <RevealItem className="relative min-h-[390px] overflow-hidden rounded-lg sm:min-h-[520px]">
            {/* eslint-disable-next-line @next/next/no-img-element -- this image is selected by an admin and may be hosted externally. */}
            <img
              src={backgrounds["home.tiffin-details"].imageUrl}
              alt="A complete Indian thali with roti, dal, sabzi, rice, and accompaniments"
              className="absolute inset-0 size-full object-cover transition duration-1000 hover:scale-[1.04]"
              style={{ objectPosition: `${backgrounds["home.tiffin-details"].focalPoint.toLowerCase()} center` }}
            />
            <div className={`absolute inset-0 ${backgroundOverlay[backgrounds["home.tiffin-details"].overlay]}`} />
            <p className="absolute bottom-7 left-7 right-7 max-w-sm font-display text-2xl font-black leading-tight text-white sm:text-3xl">
              A proper thali, packed with care.
            </p>
          </RevealItem>
          <div className="max-w-xl lg:flex lg:h-[520px] lg:flex-col">
            <RevealItem as="h2" className="font-display text-4xl font-black leading-[1.08] sm:text-5xl">
              The comfort is in the details.
            </RevealItem>
            <RevealItem as="p" className="mt-4 max-w-lg text-base leading-7 text-white/64">
              A Curry Kitchen tiffin is not a random collection of food. It is a complete, familiar dinner,
              prepared around the things that make a home-style meal feel right.
            </RevealItem>
            <div className="mt-5 grid border-y border-white/14 sm:grid-cols-2 lg:min-h-0 lg:flex-1">
              {tiffinElements.map(([title, copy], index) => (
                <RevealItem
                  key={title}
                  className="grid grid-cols-[2.25rem_1fr] gap-3 border-b border-white/12 py-3 last:border-b-0 sm:[&:nth-child(odd)]:border-r sm:[&:nth-last-child(-n+2)]:border-b-0 sm:px-5 sm:even:pl-6 sm:odd:pr-6"
                >
                  <span className="pt-0.5 text-sm font-black text-saffron">0{index + 1}</span>
                  <span>
                    <span className="block font-display text-lg font-black">{title}</span>
                    <span className="mt-0.5 block text-sm font-medium text-white/52">{copy}</span>
                  </span>
                </RevealItem>
              ))}
            </div>
            <RevealItem className="mt-5">
              <ButtonLink href="/packages" className="rounded-full px-6">
                Find your tiffin
                <ArrowRight size={18} />
              </ButtonLink>
            </RevealItem>
          </div>
        </StaggerGroup>
      </section>

      <TestimonialsCarousel items={testimonials} />
    </main>
  );
}
