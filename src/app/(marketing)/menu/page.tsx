import { ArrowRight, CalendarClock, CalendarRange, CookingPot, Download, Eye, FileText, Truck } from "lucide-react";
import type { Metadata } from "next";
import { MenuDayCard } from "@/components/food/menu-day-card";
import { JsonLd } from "@/components/seo/json-ld";
import { PageHero } from "@/components/sections/page-hero";
import { RevealItem, StaggerGroup } from "@/components/ui/animated-section";
import { ButtonLink } from "@/components/ui/button";
import { getActiveMenuUploads, getWeeklyMenu } from "@/lib/server/catalog";
import { getMarketingMetadata, getMenuSchemas } from "@/lib/server/seo";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return getMarketingMetadata("/menu");
}

const menuSteps = [
  {
    icon: CalendarClock,
    title: "Published every Monday",
    copy: "The full week of dishes goes live so you can plan dinners ahead.",
  },
  {
    icon: CookingPot,
    title: "Cooked fresh each day",
    copy: "Small batches prepared the same day, never reheated from a freezer.",
  },
  {
    icon: Truck,
    title: "Delivered 6–8 PM",
    copy: "Your tiffin arrives in the dinner window, Monday through Friday.",
  },
];

export default async function MenuPage() {
  const [weeklyMenu, menuUploads] = await Promise.all([getWeeklyMenu(), getActiveMenuUploads()]);
  const schemas = await getMenuSchemas(weeklyMenu);
  const heroChips = menuUploads.length
    ? menuUploads.slice(0, 3).map((menu) => menu.dateRangeLabel)
    : ["Fresh roti daily", "Dessert twice weekly"];
  const downloadHref = menuUploads.find((menu) => menu.current)?.fileUrl ?? menuUploads[0]?.fileUrl;

  return (
    <main>
      <JsonLd data={schemas} />
      <PageHero
        eyebrow="Weekly menu"
        title="A meal calendar worth checking every Monday."
        image="https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=1400&q=80"
        imageAlt="Indian thali menu"
        chips={heroChips}
        actions={
          <>
            <ButtonLink href="/packages">
              <Eye size={18} />
              Choose a package
            </ButtonLink>
            {downloadHref ? (
              <ButtonLink href={downloadHref} variant="secondary">
                <Download size={18} />
                Download menu
              </ButtonLink>
            ) : null}
          </>
        }
        imageCaption={
          <>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-saffron">
              This week&apos;s rotation
            </p>
            <p className="mt-2 font-display text-3xl font-black leading-none">
              Dal, sabzi, rice, roti, salad, and weekly sweets.
            </p>
          </>
        }
      >
        Scan the week before ordering, then revisit the menu from your dashboard once deliveries
        begin.
      </PageHero>

      {/* How the weekly menu works — LIGHT procedural strip */}
      <section className="section relative bg-rose text-ink">
        <StaggerGroup className="section-shell">
          <div className="max-w-2xl">
            <RevealItem as="p" className="text-sm font-black uppercase tracking-[0.18em] text-masala">
              How it works
            </RevealItem>
            <RevealItem as="h2" className="mt-3 font-display text-3xl font-black leading-[1.12] lg:text-4xl">
              Fresh every week, in three simple beats.
            </RevealItem>
          </div>
          <div className="mt-9 grid gap-5 md:grid-cols-3">
            {menuSteps.map((step, index) => (
              <RevealItem
                key={step.title}
                as="article"
                className="rounded-lg border border-ink/10 bg-white p-6 shadow-soft"
              >
                <div className="flex items-center gap-3">
                  <span className="grid size-11 place-items-center rounded-button bg-saffron text-ink">
                    <step.icon size={20} />
                  </span>
                  <span className="font-display text-2xl font-black text-masala/80">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="mt-5 font-display text-xl font-black">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-ink/62">{step.copy}</p>
              </RevealItem>
            ))}
          </div>
        </StaggerGroup>
      </section>

      {menuUploads.length ? (
        /* Uploaded weekly menus — LIGHT (white), up to 4 scheduled menus */
        <section className="section relative bg-white">
          <StaggerGroup className="section-shell">
            <div className="mb-9 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div>
                <RevealItem as="p" className="text-sm font-black uppercase tracking-[0.18em] text-masala">
                  Fresh from the kitchen
                </RevealItem>
                <RevealItem as="h2" className="mt-3 max-w-xl font-display text-3xl font-black leading-[1.12] lg:text-5xl">
                  This month&apos;s menus, week by week.
                </RevealItem>
              </div>
              <RevealItem>
                <ButtonLink href="/packages" variant="dark" className="w-fit">
                  Pick a plan to start
                  <ArrowRight size={18} />
                </ButtonLink>
              </RevealItem>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {menuUploads.map((menu) => (
                <RevealItem key={menu.id}>
                  <article className="overflow-hidden rounded-lg border border-ink/10 bg-white shadow-soft">
                    {menu.isPdf ? (
                      <a
                        href={menu.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="grid min-h-56 place-items-center bg-ivory transition hover:bg-rose/45"
                      >
                        <span className="grid place-items-center gap-3 p-10 text-center">
                          <span className="grid size-14 place-items-center rounded-full bg-saffron text-ink">
                            <FileText size={26} />
                          </span>
                          <span className="text-sm font-extrabold text-ink/70">Open menu (PDF)</span>
                        </span>
                      </a>
                    ) : (
                      <a href={menu.fileUrl} target="_blank" rel="noreferrer" className="block bg-ivory">
                        {/* eslint-disable-next-line @next/next/no-img-element -- admin-uploaded file of unknown dimensions served from our own API route */}
                        <img
                          src={menu.fileUrl}
                          alt={`${menu.title} — Curry Kitchen weekly menu`}
                          loading="lazy"
                          className="h-auto w-full"
                        />
                      </a>
                    )}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 bg-white px-5 py-4">
                      <div>
                        <h3 className="font-display text-xl font-black">{menu.title}</h3>
                        <p className="mt-0.5 inline-flex items-center gap-1.5 text-xs font-bold text-ink/55">
                          <CalendarRange size={14} className="text-ink/40" />
                          {menu.dateRangeLabel}
                        </p>
                      </div>
                      {menu.current ? (
                        <span className="rounded-full bg-mint px-3 py-1 text-xs font-black text-leaf">
                          This week
                        </span>
                      ) : (
                        <span className="rounded-full bg-ivory px-3 py-1 text-xs font-black text-ink/55">
                          Upcoming
                        </span>
                      )}
                    </div>
                  </article>
                </RevealItem>
              ))}
            </div>
          </StaggerGroup>
        </section>
      ) : (
        /* Fallback while no menus are uploaded — day-by-day grid from the dish schedule */
        <section className="section relative bg-white">
          <StaggerGroup className="section-shell">
            <div className="mb-9 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div>
                <RevealItem as="p" className="text-sm font-black uppercase tracking-[0.18em] text-masala">
                  Monday to Friday
                </RevealItem>
                <RevealItem as="h2" className="mt-3 max-w-xl font-display text-3xl font-black leading-[1.12] lg:text-5xl">
                  This week, day by day.
                </RevealItem>
              </div>
              <RevealItem>
                <ButtonLink href="/packages" variant="dark" className="w-fit">
                  Pick a plan to start
                  <ArrowRight size={18} />
                </ButtonLink>
              </RevealItem>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {weeklyMenu.map((item) => (
                <RevealItem key={item.day}>
                  <MenuDayCard item={item} />
                </RevealItem>
              ))}
            </div>
          </StaggerGroup>
        </section>
      )}
    </main>
  );
}
