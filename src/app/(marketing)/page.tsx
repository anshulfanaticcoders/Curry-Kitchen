import Image from "next/image";
import type { Metadata } from "next";
import {
  ArrowRight,
  CookingPot,
  FileText,
  ShoppingBag,
  Truck,
} from "lucide-react";
import { PackageCard } from "@/components/food/package-card";
import { JsonLd } from "@/components/seo/json-ld";
import { HeroSection } from "@/components/sections/hero-section";
import { TestimonialsCarousel } from "@/components/sections/testimonials-carousel";
import { RevealItem, StaggerGroup } from "@/components/ui/animated-section";
import { ButtonLink } from "@/components/ui/button";
import { getActiveMenuUploads, getPackagePlans, getTestimonials, getWeeklyMenu } from "@/lib/server/catalog";
import { getHomeSchemas, getMarketingMetadata } from "@/lib/server/seo";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return getMarketingMetadata("/");
}

const steps = [
  {
    icon: CookingPot,
    title: "Choose your meal",
    copy: "Pick the tiffin plan that fits the way your week actually runs.",
  },
  {
    icon: ShoppingBag,
    title: "Place your order",
    copy: "Set your delivery start date, extras, and food preferences in a few calm steps.",
  },
  {
    icon: Truck,
    title: "Enjoy at your doorstep",
    copy: "Your freshly made meal arrives ready to bring some ease to dinner.",
  },
];

const tiffinElements = [
  ["Soft roti", "Made fresh for the day."],
  ["Seasonal sabzi", "The warm centre of every meal."],
  ["Dal and rice", "The familiar comfort you expect."],
  ["A fresh side", "A little lift with every tiffin."],
];

export default async function Home() {
  const [packagePlans, weeklyMenu, menuUploads, testimonials, schemas] = await Promise.all([
    getPackagePlans(),
    getWeeklyMenu(),
    getActiveMenuUploads(),
    getTestimonials(),
    getHomeSchemas(),
  ]);
  const featuredPlans = packagePlans.filter((plan) => plan.isFeatured).slice(0, 3);
  const menuPreview = weeklyMenu.slice(0, 4);
  const uploadedMenus = menuUploads.slice(0, 3);
  const comfortImage = menuPreview[0]?.image ?? packagePlans[0]?.image;

  return (
    <main className="overflow-hidden bg-[#fffdf9] text-ink">
      <JsonLd data={schemas} />
      <HeroSection />

      <section className="section bg-[#fffdf9]">
        <StaggerGroup className="section-shell grid items-center gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:gap-20">
          <div className="max-w-xl">
            <RevealItem as="h2" className="font-display text-4xl font-black leading-[1.08] sm:text-5xl">
              Healthy, delicious meals, delivered.
            </RevealItem>
            <RevealItem as="p" className="mt-6 max-w-md text-base leading-7 text-ink/62">
              We bring authentic, home-style Indian food into busy San Diego weeks with fresh ingredients,
              generous portions, and recipes made to feel familiar.
            </RevealItem>
            <RevealItem className="mt-8">
              <ButtonLink href="/packages" className="rounded-full px-6">
                Explore our meals
                <ArrowRight size={18} />
              </ButtonLink>
            </RevealItem>
          </div>

          <RevealItem className="relative min-h-[340px] overflow-hidden rounded-lg sm:min-h-[440px]">
            <Image
              src={comfortImage ?? "https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=1400&q=82"}
              alt="A comforting home-style Indian meal, freshly prepared"
              fill
              className="object-cover transition duration-700 hover:scale-[1.025]"
              sizes="(min-width: 1024px) 50vw, 100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/44 via-transparent to-transparent" />
            <p className="absolute bottom-6 left-6 max-w-xs text-sm font-bold leading-6 text-white">
              Freshly made in San Diego, for people who miss Ghar Ka Khana.
            </p>
          </RevealItem>
        </StaggerGroup>
      </section>

      <section className="section bg-[#f8f0e7]">
        <StaggerGroup className="section-shell">
          <div className="mx-auto max-w-2xl text-center">
            <RevealItem as="h2" className="font-display text-4xl font-black leading-[1.1] sm:text-5xl">
              Fresh meals in three simple steps.
            </RevealItem>
            <RevealItem as="p" className="mx-auto mt-5 max-w-xl text-base leading-7 text-ink/58">
              Good food should fit comfortably into the week. We keep the ordering part simple.
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

      {uploadedMenus.length || menuPreview.length ? (
        <section className="dark-band relative overflow-hidden py-20 text-white lg:py-28">
          <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(rgba(255,122,26,0.26)_1px,transparent_1px)] [background-size:20px_20px]" />
          <StaggerGroup className="section-shell relative">
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div className="max-w-2xl">
                <RevealItem as="h2" className="font-display text-4xl font-black leading-[1.08] sm:text-5xl">
                  Meals that bring comfort.
                </RevealItem>
                <RevealItem as="p" className="mt-5 max-w-xl text-base leading-7 text-white/64">
                  A changing lineup of simple, satisfying Indian meals made for the week ahead.
                </RevealItem>
              </div>
              <RevealItem>
                <ButtonLink
                  href="/menu"
                  variant="secondary"
                  className="rounded-full border-white/20 bg-transparent text-white hover:bg-white hover:text-ink"
                >
                  View full menu
                  <ArrowRight size={18} />
                </ButtonLink>
              </RevealItem>
            </div>

            {uploadedMenus.length ? (
              <div className="mt-11 grid gap-5 lg:grid-cols-3">
                {uploadedMenus.map((menu) => (
                  <RevealItem
                    key={menu.id}
                    as="article"
                    className="group overflow-hidden rounded-lg bg-[#fffdf9] text-ink shadow-[0_20px_50px_rgba(0,0,0,0.25)]"
                  >
                    <a
                      href={menu.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="relative grid min-h-[320px] place-items-center bg-[#f8f0e7] p-6"
                    >
                      {menu.isPdf ? (
                        <span className="text-center">
                          <span className="mx-auto grid size-16 place-items-center rounded-full bg-saffron text-ink transition duration-300 group-hover:scale-110">
                            <FileText size={30} />
                          </span>
                          <span className="mt-5 block font-display text-2xl font-black">Open menu</span>
                          <span className="mt-2 block text-sm font-semibold text-ink/58">PDF menu</span>
                        </span>
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element -- uploaded menu image is served through our own media API with unknown dimensions.
                        <img
                          src={menu.fileUrl}
                          alt={`${menu.title} - Curry Kitchen menu`}
                          className="absolute inset-0 h-full w-full object-contain transition duration-700 group-hover:scale-[1.025]"
                        />
                      )}
                    </a>
                    <div className="p-6">
                      <span className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-masala">
                        {menu.current ? "This week" : "Upcoming menu"}
                      </span>
                      <h3 className="mt-3 font-display text-2xl font-black leading-tight">{menu.title}</h3>
                      <p className="mt-3 text-sm font-semibold text-ink/55">{menu.dateRangeLabel}</p>
                      <ButtonLink href={menu.fileUrl} className="mt-6 h-10 w-full rounded-full px-4 text-xs" target="_blank" rel="noreferrer">
                        Open menu
                        <ArrowRight size={15} />
                      </ButtonLink>
                    </div>
                  </RevealItem>
                ))}
              </div>
            ) : (
              <div className="mt-11 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {menuPreview.map((item) => (
                  <RevealItem
                    key={`${item.day}-${item.date}`}
                    as="article"
                    className="group overflow-hidden rounded-lg bg-[#fffdf9] text-ink shadow-[0_20px_50px_rgba(0,0,0,0.25)]"
                  >
                    <div className="relative h-48 overflow-hidden">
                      <Image
                        src={item.image}
                        alt={`${item.day}: ${item.headline}`}
                        fill
                        className="object-cover transition duration-700 group-hover:scale-105"
                        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/64 to-transparent" />
                      <p className="absolute bottom-4 left-4 text-xs font-extrabold text-white/78">{item.day}</p>
                    </div>
                    <div className="p-5">
                      <h3 className="font-display text-xl font-black leading-tight">{item.headline}</h3>
                      <p className="mt-3 min-h-11 text-xs font-semibold leading-5 text-ink/58">
                        {item.daal} · {item.sabzi} · {item.rice}
                      </p>
                      <ButtonLink href="/menu" className="mt-5 h-10 rounded-full px-4 text-xs">
                        See menu
                        <ArrowRight size={15} />
                      </ButtonLink>
                    </div>
                  </RevealItem>
                ))}
              </div>
            )}
          </StaggerGroup>
        </section>
      ) : null}

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
            <Image
              src="https://images.unsplash.com/photo-1567337710282-00832b415979?auto=format&fit=crop&w=1600&q=86"
              alt="A complete Indian thali with roti, dal, sabzi, rice, and accompaniments"
              fill
              className="object-cover transition duration-1000 hover:scale-[1.04]"
              sizes="(min-width: 1024px) 52vw, 100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            <p className="absolute bottom-7 left-7 right-7 max-w-sm font-display text-2xl font-black leading-tight text-white sm:text-3xl">
              A proper thali, packed with care.
            </p>
          </RevealItem>
          <div className="max-w-xl">
            <RevealItem as="h2" className="font-display text-4xl font-black leading-[1.08] sm:text-5xl">
              The comfort is in the details.
            </RevealItem>
            <RevealItem as="p" className="mt-6 max-w-lg text-base leading-7 text-white/64">
              A Curry Kitchen tiffin is not a random collection of food. It is a complete, familiar dinner,
              prepared around the things that make a home-style meal feel right.
            </RevealItem>
            <div className="mt-10 border-y border-white/14">
              {tiffinElements.map(([title, copy], index) => (
                <RevealItem
                  key={title}
                  className="grid grid-cols-[2.5rem_1fr] gap-4 border-b border-white/12 py-5 last:border-b-0"
                >
                  <span className="pt-0.5 text-sm font-black text-saffron">0{index + 1}</span>
                  <span>
                    <span className="block font-display text-xl font-black">{title}</span>
                    <span className="mt-1 block text-sm font-medium text-white/52">{copy}</span>
                  </span>
                </RevealItem>
              ))}
            </div>
            <RevealItem className="mt-9">
              <ButtonLink href="/packages" className="rounded-full px-6">
                Find your tiffin
                <ArrowRight size={18} />
              </ButtonLink>
            </RevealItem>
          </div>
        </StaggerGroup>
      </section>

      <TestimonialsCarousel items={testimonials} />

      <section className="dark-band relative overflow-hidden py-20 text-white lg:py-24">
        <Image
          src="https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=1800&q=84"
          alt="Fresh vegetables and ingredients in a warm kitchen"
          fill
          className="object-cover opacity-26"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-black/56" />
        <StaggerGroup className="section-shell relative flex flex-col justify-between gap-12 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <RevealItem as="h2" className="font-display text-4xl font-black leading-[1.08] sm:text-5xl">
              Good food. Good mood.
            </RevealItem>
            <RevealItem as="p" className="mt-5 text-base leading-7 text-white/68">
              Order now and bring the true taste of home back to your weekday table.
            </RevealItem>
            <RevealItem className="mt-8">
              <ButtonLink href="/packages" className="rounded-full px-6">
                Order now
                <ArrowRight size={18} />
              </ButtonLink>
            </RevealItem>
          </div>
          <RevealItem className="grid gap-5 sm:grid-cols-3 lg:w-[34rem]">
            {["Freshly cooked every day", "Ingredients chosen with care", "Reliable San Diego delivery"].map(
              (item) => (
                <div key={item} className="border-t border-white/20 pt-4 text-sm font-bold text-white/78">
                  {item}
                </div>
              ),
            )}
          </RevealItem>
        </StaggerGroup>
      </section>
    </main>
  );
}
