import Image from "next/image";
import type { Metadata } from "next";
import { ArrowRight, FileText } from "lucide-react";
import { PackageCard } from "@/components/food/package-card";
import { JsonLd } from "@/components/seo/json-ld";
import { HeroSection } from "@/components/sections/hero-section";
import { HowItWorks } from "@/components/sections/how-it-works";
import { TestimonialsCarousel } from "@/components/sections/testimonials-carousel";
import { RevealItem, StaggerGroup } from "@/components/ui/animated-section";
import { ButtonLink } from "@/components/ui/button";
import { getActiveMenuUploads, getPackagePlans, getTestimonials, getWeeklyMenu } from "@/lib/server/catalog";
import { getPageBackgrounds } from "@/lib/server/page-backgrounds";
import { getHomeSchemas, getMarketingMetadata } from "@/lib/server/seo";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return getMarketingMetadata("/");
}

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
  const [packagePlans, weeklyMenu, menuUploads, testimonials, schemas, backgrounds] = await Promise.all([
    getPackagePlans(),
    getWeeklyMenu(),
    getActiveMenuUploads(),
    getTestimonials(),
    getHomeSchemas(),
    getPageBackgrounds(),
  ]);
  const featuredPlans = packagePlans.filter((plan) => plan.isFeatured).slice(0, 3);
  const menuPreview = weeklyMenu.slice(0, 4);
  const uploadedMenus = menuUploads.slice(0, 3);
  return (
    <main className="overflow-hidden bg-[#fffdf9] text-ink">
      <JsonLd data={schemas} />
      <HeroSection background={backgrounds["home.hero"]} />

      <section className="section texture overflow-hidden bg-[#fffdf9]">
        <StaggerGroup className="section-shell grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-24">
          <div className="max-w-xl">
            <RevealItem className="mb-6 flex items-center gap-3 text-[11px] font-extrabold uppercase tracking-[0.22em] text-masala">
              <span className="h-px w-10 bg-saffron" />
              Ghar Ka Khana
            </RevealItem>
            <RevealItem as="h2" className="font-display text-4xl font-black leading-[1.06] sm:text-5xl">
              Healthy, delicious meals, <span className="text-saffron">delivered.</span>
            </RevealItem>
            <RevealItem as="p" className="mt-6 max-w-md text-base leading-7 text-ink/62">
              We bring authentic, home-style Indian food into busy San Diego weeks with fresh ingredients,
              generous portions, and recipes made to feel familiar.
            </RevealItem>
            <RevealItem className="mt-8 border-l-2 border-saffron pl-6">
              <p className="max-w-sm font-display text-xl font-bold leading-snug text-ink/80">
                Freshly made in San Diego, for people who miss Ghar Ka Khana.
              </p>
            </RevealItem>
            <RevealItem className="mt-9">
              <ButtonLink href="/packages" className="rounded-full px-6">
                Explore our meals
                <ArrowRight size={18} />
              </ButtonLink>
            </RevealItem>
          </div>

          <RevealItem className="relative mx-auto w-full max-w-[26rem] lg:max-w-[28rem]">
            <div
              aria-hidden
              className="absolute inset-0 translate-x-5 translate-y-5 rounded-b-lg rounded-t-full border-2 border-saffron/40"
            />
            <div className="group relative aspect-[4/5] overflow-hidden rounded-b-lg rounded-t-full shadow-[0_34px_90px_rgba(30,18,8,0.24)]">
              {/* eslint-disable-next-line @next/next/no-img-element -- this image is selected by an admin and may be hosted externally. */}
              <img
                src={backgrounds["home.comfort"].imageUrl}
                alt="A comforting home-style Indian meal, freshly prepared"
                className="absolute inset-0 size-full object-cover transition duration-700 group-hover:scale-[1.04]"
                style={{ objectPosition: `${backgrounds["home.comfort"].focalPoint.toLowerCase()} center` }}
              />
              <div className={`absolute inset-0 ${backgroundOverlay[backgrounds["home.comfort"].overlay]}`} />
            </div>
          </RevealItem>
        </StaggerGroup>
      </section>

      <HowItWorks />

      {uploadedMenus.length || menuPreview.length ? (
        <section className="dark-band relative overflow-hidden py-20 text-white lg:py-28">
          <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(rgba(255,122,26,0.26)_1px,transparent_1px)] [background-size:20px_20px]" />
          <StaggerGroup className="section-shell relative">
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div className="max-w-2xl">
                <RevealItem className="mb-6 flex items-center gap-3 text-[11px] font-extrabold uppercase tracking-[0.2em] text-saffron">
                  <span className="h-px w-9 bg-saffron" />
                  This week&apos;s kitchen
                </RevealItem>
                <RevealItem as="h2" className="font-display text-4xl font-black leading-[1.08] sm:text-5xl">
                  Meals that bring <span className="text-saffron">comfort.</span>
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
              <div className="mt-11 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {uploadedMenus.map((menu) => {
                  const badge = menu.current ? (
                    <span className="rounded-full bg-saffron px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-ink">
                      This week
                    </span>
                  ) : (
                    <span className="rounded-full border border-current/20 bg-black/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] backdrop-blur-sm">
                      Upcoming
                    </span>
                  );

                  return menu.isPdf ? (
                    // PDF menus have nothing to preview, so the card is a document tile: no placeholder art.
                    <RevealItem
                      key={menu.id}
                      as="article"
                      className="group relative flex min-h-[300px] flex-col overflow-hidden rounded-lg border border-white/10 bg-[#171310] p-7 lg:min-h-[380px] text-white shadow-[0_24px_60px_rgba(0,0,0,0.35)] transition duration-500 hover:-translate-y-1.5 hover:border-saffron/50"
                    >
                      <div className="absolute -right-10 -top-10 size-40 rounded-full bg-saffron/10 blur-2xl transition duration-700 group-hover:bg-saffron/20" />
                      <div className="relative flex items-center justify-between">
                        <span className="grid size-12 place-items-center rounded-full bg-saffron text-ink transition duration-300 group-hover:scale-110">
                          <FileText size={22} />
                        </span>
                        {badge}
                      </div>
                      <span className="relative mt-8 text-[11px] font-extrabold uppercase tracking-[0.15em] text-saffron">
                        PDF menu
                      </span>
                      <h3 className="relative mt-3 font-display text-3xl font-black leading-tight">{menu.title}</h3>
                      <p className="relative mt-3 text-sm font-semibold text-white/60">{menu.dateRangeLabel}</p>
                      <div className="relative mt-auto pt-8">
                        <ButtonLink href={menu.fileUrl} className="h-11 w-full rounded-full px-4 text-xs" target="_blank" rel="noreferrer">
                          Open PDF menu
                          <ArrowRight size={15} />
                        </ButtonLink>
                      </div>
                    </RevealItem>
                  ) : (
                    <RevealItem
                      key={menu.id}
                      as="article"
                      className="group relative flex min-h-[380px] flex-col overflow-hidden rounded-lg bg-[#fffdf9] text-ink shadow-[0_24px_60px_rgba(0,0,0,0.35)] transition duration-500 hover:-translate-y-1.5"
                    >
                      <a href={menu.fileUrl} target="_blank" rel="noreferrer" className="relative block aspect-[4/3] overflow-hidden bg-ink">
                        {/* eslint-disable-next-line @next/next/no-img-element -- uploaded menu image is served through our own media API with unknown dimensions. */}
                        <img
                          src={menu.fileUrl}
                          alt={`${menu.title} - Curry Kitchen menu`}
                          className="absolute inset-0 h-full w-full object-cover object-top transition duration-700 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/10" />
                        <div className="absolute left-4 top-4 text-white">{badge}</div>
                        <span className="absolute bottom-4 right-4 grid size-10 place-items-center rounded-full bg-white/90 text-ink opacity-0 transition duration-300 group-hover:opacity-100">
                          <ArrowRight size={18} />
                        </span>
                      </a>
                      <div className="flex flex-1 flex-col p-6">
                        <h3 className="font-display text-2xl font-black leading-tight">{menu.title}</h3>
                        <p className="mt-2 text-sm font-semibold text-ink/55">{menu.dateRangeLabel}</p>
                        <div className="mt-auto pt-6">
                          <ButtonLink href={menu.fileUrl} className="h-11 w-full rounded-full px-4 text-xs" target="_blank" rel="noreferrer">
                            Open menu
                            <ArrowRight size={15} />
                          </ButtonLink>
                        </div>
                      </div>
                    </RevealItem>
                  );
                })}
              </div>
            ) : (
              <div className="mt-11 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {menuPreview.map((item) => (
                  <RevealItem
                    key={`${item.day}-${item.date}`}
                    as="article"
                    className="group overflow-hidden rounded-lg bg-[#fffdf9] text-ink shadow-[0_24px_60px_rgba(0,0,0,0.35)] transition duration-500 hover:-translate-y-1.5"
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
        <section className="section texture bg-rose">
          <StaggerGroup className="section-shell">
            <div className="mx-auto max-w-2xl text-center">
              <RevealItem className="mb-6 flex items-center justify-center gap-4 text-[11px] font-extrabold uppercase tracking-[0.22em] text-masala">
                <span className="h-px w-10 bg-saffron" />
                Tiffin packages
                <span className="h-px w-10 bg-saffron" />
              </RevealItem>
              <RevealItem as="h2" className="font-display text-4xl font-black leading-[1.06] sm:text-5xl">
                A dinner rhythm for <span className="text-saffron">every week.</span>
              </RevealItem>
              <RevealItem as="p" className="mx-auto mt-5 max-w-xl text-base leading-7 text-ink/60">
                Start small, commit to the month, or choose a plan built for student life. Every package stays
                clear about portions, dates, and what is included.
              </RevealItem>
            </div>

            <div className="mt-14 grid gap-6 lg:grid-cols-3 lg:gap-7">
              {featuredPlans.map((plan) => (
                <RevealItem key={plan.id}>
                  <PackageCard plan={plan} />
                </RevealItem>
              ))}
            </div>

            <RevealItem className="mt-12 flex justify-center">
              <ButtonLink href="/packages" variant="dark" className="rounded-full px-7">
                View all packages
                <ArrowRight size={18} />
              </ButtonLink>
            </RevealItem>
          </StaggerGroup>
        </section>
      ) : null}

      <section className="dark-band relative overflow-hidden py-20 text-white lg:py-28">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_42%,rgba(255,122,26,0.16),transparent_30%)]" />
        <StaggerGroup className="section-shell relative grid items-center gap-12 lg:grid-cols-[1.06fr_0.94fr] lg:gap-20">
          <RevealItem className="relative">
            <div
              aria-hidden
              className="absolute -bottom-5 -left-5 hidden size-full rounded-lg border-2 border-saffron/35 lg:block"
            />
            <div className="group relative min-h-[390px] overflow-hidden rounded-lg shadow-[0_34px_90px_rgba(0,0,0,0.45)] sm:min-h-[520px]">
              {/* eslint-disable-next-line @next/next/no-img-element -- this image is selected by an admin and may be hosted externally. */}
              <img
                src={backgrounds["home.tiffin-details"].imageUrl}
                alt="A complete Indian thali with roti, dal, sabzi, rice, and accompaniments"
                className="absolute inset-0 size-full object-cover transition duration-1000 group-hover:scale-[1.04]"
                style={{ objectPosition: `${backgrounds["home.tiffin-details"].focalPoint.toLowerCase()} center` }}
              />
              <div className={`absolute inset-0 ${backgroundOverlay[backgrounds["home.tiffin-details"].overlay]}`} />
              <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/78 to-transparent" />
              <p className="absolute bottom-7 left-7 right-7 max-w-sm font-display text-2xl font-black leading-tight text-white sm:text-3xl">
                A proper thali, packed with care.
              </p>
            </div>
          </RevealItem>
          <div className="max-w-xl">
            <RevealItem className="mb-6 flex items-center gap-3 text-[11px] font-extrabold uppercase tracking-[0.2em] text-saffron">
              <span className="h-px w-9 bg-saffron" />
              Inside every tiffin
            </RevealItem>
            <RevealItem as="h2" className="font-display text-4xl font-black leading-[1.08] sm:text-5xl">
              The comfort is in the <span className="text-saffron">details.</span>
            </RevealItem>
            <RevealItem as="p" className="mt-6 max-w-lg text-base leading-7 text-white/64">
              A Curry Kitchen tiffin is not a random collection of food. It is a complete, familiar dinner,
              prepared around the things that make a home-style meal feel right.
            </RevealItem>
            <div className="mt-10 grid gap-px overflow-hidden rounded-lg border border-white/14 bg-white/14 sm:grid-cols-2">
              {tiffinElements.map(([title, copy], index) => (
                <RevealItem
                  key={title}
                  className="group bg-[#0e0c0a] p-7 transition duration-500 hover:bg-[#171310]"
                >
                  <span className="text-sm font-black text-saffron">0{index + 1}</span>
                  <span className="mt-4 block font-display text-xl font-black">{title}</span>
                  <span className="mt-1.5 block text-sm font-medium text-white/52">{copy}</span>
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
        {/* eslint-disable-next-line @next/next/no-img-element -- this image is selected by an admin and may be hosted externally. */}
        <img
          src={backgrounds["home.final-cta"].imageUrl}
          alt="Fresh vegetables and ingredients in a warm kitchen"
          className="absolute inset-0 size-full object-cover"
          style={{ objectPosition: `${backgrounds["home.final-cta"].focalPoint.toLowerCase()} center` }}
        />
        <div className={`absolute inset-0 ${backgroundOverlay[backgrounds["home.final-cta"].overlay]}`} />
        <StaggerGroup className="section-shell relative flex flex-col items-center text-center">
          <RevealItem as="h2" className="font-display text-5xl font-black leading-[1.03] sm:text-7xl">
            Good food. <span className="text-saffron">Good mood.</span>
          </RevealItem>
          <RevealItem as="p" className="mt-6 max-w-xl text-base leading-7 text-white/72 sm:text-lg">
            Order now and bring the true taste of home back to your weekday table.
          </RevealItem>
          <RevealItem className="mt-9">
            <ButtonLink
              href="/packages"
              className="rounded-full px-8 shadow-[0_18px_50px_rgba(255,122,26,0.4)]"
            >
              Order now
              <ArrowRight size={18} />
            </ButtonLink>
          </RevealItem>
          <RevealItem className="mt-16 w-full">
            <ul className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-x-12 gap-y-4 border-t border-white/18 pt-7">
              {["Freshly cooked every day", "Ingredients chosen with care", "Reliable San Diego delivery"].map(
                (item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm font-bold text-white/80">
                    <span className="size-1.5 rounded-full bg-saffron" aria-hidden />
                    {item}
                  </li>
                ),
              )}
            </ul>
          </RevealItem>
        </StaggerGroup>
      </section>
    </main>
  );
}
