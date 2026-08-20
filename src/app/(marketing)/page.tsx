import Image from "next/image";
import type { Metadata } from "next";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CookingPot,
  Leaf,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { PackageCard } from "@/components/food/package-card";
import { JsonLd } from "@/components/seo/json-ld";
import { HeroSection } from "@/components/sections/hero-section";
import { TestimonialsCarousel } from "@/components/sections/testimonials-carousel";
import { RevealItem, StaggerGroup } from "@/components/ui/animated-section";
import { ButtonLink } from "@/components/ui/button";
import { getPackagePlans, getTestimonials, getWeeklyMenu } from "@/lib/server/catalog";
import { getHomeSchemas, getMarketingMetadata } from "@/lib/server/seo";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return getMarketingMetadata("/");
}

const serviceNotes = [
  {
    icon: CookingPot,
    title: "Guilt-free eating",
    copy: "#Ghar Ka Khana Roz Khana, without another takeout compromise.",
  },
  {
    icon: Leaf,
    title: "Homemade food",
    copy: "Dal, sabzi, roti, rice, and salad cooked with everyday home-kitchen care.",
  },
  {
    icon: Truck,
    title: "San Diego delivery",
    copy: "A dependable Monday to Friday dinner rhythm for local homes and students.",
  },
  {
    icon: ShieldCheck,
    title: "Plan clarity",
    copy: "Price, portions, and delivery clear before checkout.",
  },
];

const orderingSteps = [
  {
    title: "Choose your dabba",
    copy: "Weekly trial, monthly fixed, student and military plans — or build your own by the portion.",
  },
  {
    title: "Keep it simple",
    copy: "Rice, roti, and spice notes stay simple before checkout.",
  },
  {
    title: "Know what is coming",
    copy: "Weekly menu, upcoming deliveries, and active plan, all in one view.",
  },
];

export default async function Home() {
  const [packagePlans, weeklyMenu, testimonials, schemas] = await Promise.all([
    getPackagePlans(),
    getWeeklyMenu(),
    getTestimonials(),
    getHomeSchemas(),
  ]);
  const featured = [
    ...packagePlans.filter((plan) => plan.category === "Weekly").slice(0, 1),
    ...packagePlans.filter((plan) => plan.category === "Monthly").slice(0, 1),
    ...packagePlans.filter((plan) => plan.category === "Student").slice(0, 1),
  ];
  const featuredPlans = featured.length >= 3 ? featured : packagePlans.slice(0, 3);
  const menuPreview = weeklyMenu.slice(0, 3);

  return (
    <main className="overflow-hidden bg-white">
      <JsonLd data={schemas} />
      <HeroSection />

      {/* 2. Promise — calm white, plain columns instead of icon cards */}
      <section className="section bg-white text-ink">
        <StaggerGroup className="section-shell">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <RevealItem
              as="h2"
              className="max-w-xl font-display text-3xl font-black leading-[1.15] lg:text-4xl"
            >
              Homemade food for guilt-free weekday eating.
            </RevealItem>
            <RevealItem as="p" className="max-w-sm text-base font-medium leading-7 text-ink/64">
              #Ghar Ka Khana Roz Khana, built into clear weekly plans and dependable San Diego
              delivery.
            </RevealItem>
          </div>
          <div className="mt-12 grid gap-x-8 gap-y-10 border-t border-ink/10 pt-10 sm:grid-cols-2 lg:grid-cols-4">
            {serviceNotes.map((item) => (
              <RevealItem key={item.title} as="article">
                <item.icon size={22} strokeWidth={2.2} className="text-masala" />
                <h3 className="mt-4 font-display text-lg font-black leading-tight">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-ink/60">{item.copy}</p>
              </RevealItem>
            ))}
          </div>
        </StaggerGroup>
      </section>

      {/* 3. How it works — soft rose, simple numbered columns */}
      <section className="section bg-rose text-ink">
        <StaggerGroup className="section-shell">
          <div className="max-w-2xl">
            <RevealItem
              as="h2"
              className="font-display text-3xl font-black leading-[1.15] lg:text-4xl"
            >
              Let&apos;s keep the old-school method.
            </RevealItem>
            <RevealItem as="p" className="mt-4 text-base leading-7 text-ink/64">
              See what is cooking, pick the right portion, set preferences, and keep the week moving
              with a familiar tiffin rhythm.
            </RevealItem>
          </div>

          <div className="mt-12 grid gap-10 border-t border-ink/10 pt-10 lg:grid-cols-3">
            {orderingSteps.map((step, index) => (
              <RevealItem key={step.title} as="article">
                <p className="font-display text-3xl font-black text-saffron">{index + 1}</p>
                <h3 className="mt-3 font-display text-xl font-black leading-tight">{step.title}</h3>
                <p className="mt-2 max-w-xs text-sm leading-6 text-ink/60">{step.copy}</p>
              </RevealItem>
            ))}
          </div>

          <RevealItem className="mt-12">
            <ButtonLink href="/menu" className="w-fit">
              See this week&apos;s menu
              <ArrowRight size={18} />
            </ButtonLink>
          </RevealItem>
        </StaggerGroup>
      </section>

      {/* 4. Weekly menu — white, food photography carries the color */}
      <section className="section bg-white text-ink">
        <StaggerGroup className="section-shell">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <RevealItem
              as="h2"
              className="max-w-2xl font-display text-3xl font-black leading-[1.15] lg:text-4xl"
            >
              A weekly menu that still feels old school.
            </RevealItem>
            <RevealItem>
              <ButtonLink href="/menu" variant="dark" className="w-fit">
                View full menu
                <CalendarDays size={18} />
              </ButtonLink>
            </RevealItem>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {menuPreview.map((item) => (
              <RevealItem
                key={item.day}
                as="article"
                className="group overflow-hidden rounded-lg border border-ink/10 bg-white shadow-soft transition hover:shadow-lift"
              >
                <div className="relative h-52 overflow-hidden">
                  <Image
                    src={item.image}
                    alt={`${item.day} tiffin preview`}
                    fill
                    className="object-cover transition duration-700 group-hover:scale-[1.03]"
                    sizes="(min-width: 1024px) 33vw, 100vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/72 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <p className="text-xs font-bold text-white/72">{item.date}</p>
                    <h3 className="font-display text-2xl font-black">{item.day}</h3>
                  </div>
                </div>
                <div className="p-5">
                  <p className="font-black text-masala">{item.headline}</p>
                  <p className="mt-2 text-sm leading-6 text-ink/60">
                    {item.daal}, {item.sabzi}, {item.rice}, and {item.side}.
                  </p>
                </div>
              </RevealItem>
            ))}
          </div>
        </StaggerGroup>
      </section>

      {/* 5. Packages — the single dark anchor of the page */}
      <section className="section dark-band relative text-white">
        <StaggerGroup className="section-shell relative">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <RevealItem
                as="h2"
                className="max-w-2xl font-display text-3xl font-black leading-[1.15] lg:text-4xl"
              >
                Weekly trial, monthly fixed, student and military packages.
              </RevealItem>
              <RevealItem as="p" className="mt-4 max-w-xl text-base leading-7 text-white/64">
                Clear portions and transparent pricing customers understand in seconds.
              </RevealItem>
            </div>
            <RevealItem>
              <ButtonLink href="/packages" className="w-fit">
                Compare all plans
                <ArrowRight size={18} />
              </ButtonLink>
            </RevealItem>
          </div>
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {featuredPlans.map((plan) => (
              <RevealItem key={plan.id}>
                <PackageCard plan={plan} />
              </RevealItem>
            ))}
          </div>
        </StaggerGroup>
      </section>

      {/* 6. Our Story — soft rose */}
      <section id="story" className="section bg-rose text-ink">
        <StaggerGroup className="section-shell grid items-center gap-12 lg:grid-cols-[0.92fr_1.08fr]">
          <RevealItem className="media-panel relative overflow-hidden rounded-lg bg-ink shadow-soft">
            <Image
              src="https://images.unsplash.com/photo-1567337710282-00832b415979?auto=format&fit=crop&w=1400&q=80"
              alt="Homestyle Indian thali with dal, sabzi, roti, and rice"
              fill
              className="object-cover"
              sizes="(min-width: 1024px) 44vw, 100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            <div className="absolute bottom-5 left-5 right-5 text-white">
              <p className="text-xs font-bold text-white/72">Cooked in small batches</p>
              <p className="mt-1 font-display text-2xl font-black leading-tight">
                Made to feel close to home.
              </p>
            </div>
          </RevealItem>

          <div>
            <RevealItem
              as="h2"
              className="max-w-2xl font-display text-3xl font-black leading-[1.15] lg:text-4xl"
            >
              For people who miss Ghar Ka Khana.
            </RevealItem>
            <RevealItem as="p" className="mt-5 max-w-xl text-base font-medium leading-7 text-ink/64">
              Curry Kitchen is built around home-style Indian comfort: dal that changes through the
              week, freshly prepared sabzi, soft roti, rice, salad, and the occasional sweet.
            </RevealItem>
            <div className="mt-10 grid gap-6 border-t border-ink/10 pt-8 sm:grid-cols-3">
              {[
                { title: "San Diego rooted", copy: "Cooked locally and delivered by people nearby." },
                { title: "Freshly made", copy: "Prepared the same morning it reaches your door." },
                { title: "Delivered daily", copy: "A steady Monday to Friday dinner rhythm." },
              ].map((item) => (
                <RevealItem key={item.title}>
                  <p className="font-display text-lg font-black">{item.title}</p>
                  <p className="mt-1.5 text-sm font-medium leading-6 text-ink/58">{item.copy}</p>
                </RevealItem>
              ))}
            </div>
          </div>
        </StaggerGroup>
      </section>

      {/* 7. Reviews — component carries its own layout */}
      <TestimonialsCarousel items={testimonials} />

      {/* 8. Final CTA — contained dark inset on white */}
      <section className="section bg-white text-ink">
        <StaggerGroup className="section-shell">
          <div className="dark-band relative grid items-center gap-8 overflow-hidden rounded-lg p-8 text-white md:grid-cols-[1.2fr_auto] md:p-12">
            <div className="relative">
              <RevealItem
                as="h2"
                className="max-w-2xl font-display text-3xl font-black leading-[1.15] lg:text-4xl"
              >
                Build your weekly dinner rhythm.
              </RevealItem>
              <RevealItem as="p" className="mt-4 flex items-center gap-2 text-sm font-bold text-white/68">
                <CheckCircle2 size={18} className="text-saffron" />
                San Diego rooted, freshly made, delivered daily.
              </RevealItem>
            </div>
            <RevealItem className="relative flex flex-col gap-3 sm:flex-row md:flex-col">
              <ButtonLink href="/packages">
                Start with packages
                <ArrowRight size={18} />
              </ButtonLink>
              <ButtonLink
                href="/packages/build"
                variant="secondary"
                className="border-white/18 bg-transparent text-white hover:bg-white hover:text-ink"
              >
                Build your own
              </ButtonLink>
            </RevealItem>
          </div>
        </StaggerGroup>
      </section>
    </main>
  );
}
