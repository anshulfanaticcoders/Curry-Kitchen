import Image from "next/image";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CookingPot,
  HeartHandshake,
  Leaf,
  PackageOpen,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { PackageCard } from "@/components/food/package-card";
import { HeroSection } from "@/components/sections/hero-section";
import { TestimonialsCarousel } from "@/components/sections/testimonials-carousel";
import { RevealItem, StaggerGroup } from "@/components/ui/animated-section";
import { ButtonLink } from "@/components/ui/button";
import { getPackagePlans, getTestimonials, getWeeklyMenu } from "@/lib/server/catalog";

export const dynamic = "force-dynamic";

const serviceNotes = [
  {
    icon: CookingPot,
    title: "Small-batch cooking",
    copy: "Daily prep and rotating dishes, portioned for regular life.",
  },
  {
    icon: Leaf,
    title: "Veg-first comfort",
    copy: "Daal, sabzi, roti, rice, and salad without decision fatigue.",
  },
  {
    icon: Truck,
    title: "Dinner-hour delivery",
    copy: "A dependable Mon-Fri rhythm for Fremont, San Jose, and Milpitas.",
  },
  {
    icon: ShieldCheck,
    title: "Plan clarity",
    copy: "Price, portions, add-ons, and delivery clear before checkout.",
  },
];

const orderingSteps = [
  {
    title: "Choose your rhythm",
    copy: "Monthly, weekly, or student plans organized by appetite and routine.",
  },
  {
    title: "Tune the tiffin",
    copy: "Rice, roti, spice notes, and delivery preferences set before checkout.",
  },
  {
    title: "Know what is coming",
    copy: "Weekly menu, upcoming deliveries, and active plan, all in one view.",
  },
];

export default async function Home() {
  const [packagePlans, weeklyMenu, testimonials] = await Promise.all([
    getPackagePlans(),
    getWeeklyMenu(),
    getTestimonials(),
  ]);
  const featured = packagePlans.slice(0, 3);
  const menuPreview = weeklyMenu.slice(0, 3);

  return (
    <main className="overflow-hidden bg-white">
      <HeroSection />

      {/* 2. Promise — LIGHT (warm) */}
      <section className="section relative bg-rose text-ink">
        <StaggerGroup className="section-shell">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <RevealItem as="p" className="text-sm font-black uppercase tracking-[0.18em] text-masala">
                The Curry Kitchen promise
              </RevealItem>
              <RevealItem as="h2" className="mt-3 max-w-xl font-display text-4xl font-black leading-[1.04] lg:text-5xl">
                Homemade care, delivered with modern control.
              </RevealItem>
            </div>
            <RevealItem as="p" className="max-w-sm text-base font-medium leading-7 text-ink/68">
              Fresh meals, clear weekly plans, and dependable dinner delivery in one premium tiffin
              experience.
            </RevealItem>
          </div>
          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {serviceNotes.map((item) => (
              <RevealItem
                key={item.title}
                as="article"
                className="group rounded-lg border border-ink/10 bg-white p-6 shadow-soft transition hover:-translate-y-1 hover:border-saffron/50 hover:shadow-lift"
              >
                <span className="grid size-11 place-items-center rounded-button bg-saffron/15 text-masala transition group-hover:bg-saffron group-hover:text-ink">
                  <item.icon size={22} strokeWidth={2.4} />
                </span>
                <h3 className="mt-5 font-display text-xl font-black leading-tight">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-ink/62">{item.copy}</p>
              </RevealItem>
            ))}
          </div>
        </StaggerGroup>
      </section>

      {/* 3. How it works — DARK gradient, orange only as accent */}
      <section className="section section--screen dark-band relative text-white">
        <Image
          src="https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=1600&q=80"
          alt="Fresh Indian snacks and chutneys arranged on a table"
          fill
          className="object-cover opacity-[0.07] mix-blend-luminosity"
          sizes="100vw"
        />
        <StaggerGroup className="section-shell relative w-full">
          <div className="max-w-2xl">
            <RevealItem as="p" className="text-sm font-black uppercase tracking-[0.18em] text-saffron">
              A calmer order path
            </RevealItem>
            <RevealItem as="h2" className="mt-3 font-display text-4xl font-black leading-[1.04] lg:text-5xl">
              From weekly menu to doorstep without the extra clicks.
            </RevealItem>
            <RevealItem as="p" className="mt-5 text-base leading-7 text-white/68">
              See what is cooking, pick the right portion, set preferences, and keep the week moving
              without another dinner decision.
            </RevealItem>
          </div>

          <div className="relative mt-12 grid gap-6 lg:grid-cols-3">
            <div className="absolute left-0 right-0 top-6 hidden h-px bg-gradient-to-r from-saffron/10 via-saffron/45 to-saffron/10 lg:block" />
            {orderingSteps.map((step, index) => (
              <RevealItem
                key={step.title}
                as="article"
                className="relative rounded-lg border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm transition hover:-translate-y-1 hover:border-saffron/45 hover:bg-white/[0.07]"
              >
                <span className="grid size-12 place-items-center rounded-full bg-saffron font-display text-lg font-black text-ink">
                  {index + 1}
                </span>
                <h3 className="mt-5 font-display text-2xl font-black leading-tight">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/64">{step.copy}</p>
              </RevealItem>
            ))}
          </div>

          <RevealItem className="mt-9">
            <ButtonLink href="/menu" className="w-fit">
              See this week&apos;s menu
              <ArrowRight size={18} />
            </ButtonLink>
          </RevealItem>
        </StaggerGroup>
      </section>

      {/* 4. Weekly menu — LIGHT, food cards carry the color */}
      <section className="section section--screen relative bg-ivory text-ink">
        <StaggerGroup className="section-shell w-full">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <RevealItem as="p" className="text-sm font-black uppercase tracking-[0.18em] text-masala">
                This week on the menu
              </RevealItem>
              <RevealItem as="h2" className="mt-3 max-w-2xl font-display text-4xl font-black leading-[1.04] lg:text-5xl">
                Taste the week before choosing a plan.
              </RevealItem>
            </div>
            <RevealItem>
              <ButtonLink href="/menu" variant="dark" className="w-fit">
                View full menu
                <CalendarDays size={18} />
              </ButtonLink>
            </RevealItem>
          </div>

          <div className="mt-9 grid gap-5 lg:grid-cols-3">
            {menuPreview.map((item) => (
              <RevealItem
                key={item.day}
                as="article"
                className="group overflow-hidden rounded-lg border border-ink/10 bg-white shadow-soft transition hover:-translate-y-1 hover:shadow-lift"
              >
                <div className="relative h-56 overflow-hidden">
                  <Image
                    src={item.image}
                    alt={`${item.day} tiffin preview`}
                    fill
                    className="object-cover transition duration-700 group-hover:scale-105"
                    sizes="(min-width: 1024px) 33vw, 100vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-saffron">{item.date}</p>
                    <h3 className="font-display text-3xl font-black">{item.day}</h3>
                  </div>
                </div>
                <div className="p-5">
                  <p className="font-black text-masala">{item.headline}</p>
                  <p className="mt-2 text-sm leading-6 text-ink/64">
                    {item.daal}, {item.sabzi}, {item.rice}, and {item.side}.
                  </p>
                </div>
              </RevealItem>
            ))}
          </div>
        </StaggerGroup>
      </section>

      {/* 5. Packages — DARK gradient, white cards pop */}
      <section className="section section--screen dark-band dark-band--alt relative text-white">
        <Image
          src="https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=1600&q=80"
          alt="Indian meal ingredients and prepared dishes"
          fill
          className="object-cover opacity-[0.06] mix-blend-luminosity"
          sizes="100vw"
        />
        <StaggerGroup className="section-shell relative w-full">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <RevealItem
                as="p"
                className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-saffron"
              >
                <PackageOpen size={16} />
                Featured packages
              </RevealItem>
              <RevealItem as="h2" className="mt-3 max-w-2xl font-display text-4xl font-black leading-[1.04] lg:text-5xl">
                Plans built around real weekly routines.
              </RevealItem>
              <RevealItem as="p" className="mt-4 max-w-xl text-base leading-7 text-white/68">
                Clear portions, transparent pricing, and add-ons customers understand in seconds.
              </RevealItem>
            </div>
            <RevealItem>
              <ButtonLink href="/packages" className="w-fit">
                Compare all plans
                <ArrowRight size={18} />
              </ButtonLink>
            </RevealItem>
          </div>
          <div className="mt-9 grid gap-6 lg:grid-cols-3">
            {featured.map((plan) => (
              <RevealItem key={plan.id}>
                <PackageCard plan={plan} />
              </RevealItem>
            ))}
          </div>
        </StaggerGroup>
      </section>

      {/* 6. Our Story — LIGHT (warm) */}
      <section id="story" className="section relative bg-rose text-ink">
        <StaggerGroup className="section-shell grid items-center gap-10 lg:grid-cols-[0.92fr_1.08fr]">
          <RevealItem className="media-panel relative overflow-hidden rounded-lg bg-ink shadow-soft">
            <Image
              src="https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=1400&q=80"
              alt="Kitchen team preparing fresh food"
              fill
              className="object-cover"
              sizes="(min-width: 1024px) 44vw, 100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/74 via-black/10 to-transparent" />
            <div className="absolute bottom-5 left-5 right-5 rounded-lg border border-white/15 bg-black/70 p-4 text-white backdrop-blur-md">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-saffron">Cooked in small batches</p>
              <p className="mt-1 font-display text-3xl font-black leading-none">Made to feel close to home.</p>
            </div>
          </RevealItem>

          <div>
            <RevealItem
              as="p"
              className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-saffron"
            >
              <HeartHandshake size={16} />
              Our story
            </RevealItem>
            <RevealItem as="h2" className="mt-4 max-w-2xl font-display text-4xl font-black leading-[1.05] lg:text-5xl">
              A local kitchen for people who miss real weekday food.
            </RevealItem>
            <RevealItem as="p" className="mt-5 max-w-xl text-base font-medium leading-7 text-ink/68">
              Curry Kitchen is built around home-style Indian comfort: dal that changes through the
              week, freshly prepared sabzi, soft roti, rice, salad, and the occasional sweet.
            </RevealItem>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {["Bay Area rooted", "Daily cooking", "Clear portions"].map((item) => (
                <RevealItem key={item} className="border-y border-ink/12 py-4">
                  <p className="font-display text-xl font-black">{item}</p>
                  <p className="mt-1 text-sm font-medium leading-5 text-ink/55">
                    Built for students, families, and busy professionals.
                  </p>
                </RevealItem>
              ))}
            </div>
          </div>
        </StaggerGroup>
      </section>

      {/* 7. Reviews — DARK, immersive (component carries layout) */}
      <TestimonialsCarousel items={testimonials} />

      {/* 8. Final CTA — LIGHT band with dark inset */}
      <section className="section relative bg-ivory text-ink">
        <StaggerGroup className="section-shell">
          <div className="dark-band relative grid items-center gap-8 overflow-hidden rounded-lg p-8 text-white shadow-[0_28px_80px_rgba(7,7,7,0.28)] md:grid-cols-[1.2fr_auto] md:p-10">
            <Image
              src="https://images.unsplash.com/photo-1631292784640-2b24be784d5d?auto=format&fit=crop&w=1400&q=80"
              alt="Fresh Indian curries served for a shared meal"
              fill
              className="object-cover opacity-[0.12] mix-blend-luminosity"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-ink/80 via-ink/40 to-transparent" />
            <div className="relative">
              <RevealItem as="p" className="text-sm font-black uppercase tracking-[0.18em] text-saffron">
                Ready to order
              </RevealItem>
              <RevealItem as="h2" className="mt-3 max-w-2xl font-display text-4xl font-black leading-[1.04] lg:text-5xl">
                Build your weekly dinner rhythm.
              </RevealItem>
              <RevealItem as="p" className="mt-4 flex items-center gap-2 text-sm font-bold text-white/70">
                <CheckCircle2 size={18} className="text-saffron" />
                Monday to Friday delivery across California Bay Area zones.
              </RevealItem>
            </div>
            <RevealItem className="relative flex flex-col gap-3 sm:flex-row md:flex-col">
              <ButtonLink href="/packages">
                Start with packages
                <ArrowRight size={18} />
              </ButtonLink>
              <ButtonLink
                href="/checkout"
                variant="secondary"
                className="border-white/18 bg-white/10 text-white hover:bg-white hover:text-ink"
              >
                Preview checkout
              </ButtonLink>
            </RevealItem>
          </div>
        </StaggerGroup>
      </section>
    </main>
  );
}
