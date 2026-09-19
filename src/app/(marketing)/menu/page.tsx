import { ArrowRight, CalendarClock, CalendarRange, CookingPot, Download, Eye, FileText, Truck } from "lucide-react";
import type { Metadata } from "next";
import { MenuEmptyState } from "@/components/food/menu-empty-state";
import { JsonLd } from "@/components/seo/json-ld";
import { PageHero } from "@/components/sections/page-hero";
import { RevealItem, StaggerGroup } from "@/components/ui/animated-section";
import { ButtonLink } from "@/components/ui/button";
import { getActiveMenuUploads } from "@/lib/server/catalog";
import { getPageBackgrounds } from "@/lib/server/page-backgrounds";
import { getMarketingMetadata, getMenuSchemas } from "@/lib/server/seo";
import { getBusinessRules } from "@/lib/business-rules";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return getMarketingMetadata("/menu");
}

const getMenuSteps = (deliveryWindow: string) => [
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
    title: "Lunch or dinner at your door",
    copy: `Your tiffin arrives ${deliveryWindow} Pacific Time, Monday through Friday.`,
  },
];

export default async function MenuPage() {
  const [menuUploads, backgrounds, rules] = await Promise.all([getActiveMenuUploads(), getPageBackgrounds(), getBusinessRules()]);
  const menuSteps = getMenuSteps(rules.deliveryWindow);
  const schemas = await getMenuSchemas([]);
  const heroChips = menuUploads.length
    ? menuUploads.slice(0, 3).map((menu) => menu.dateRangeLabel)
    : [];
  const downloadHref = menuUploads.find((menu) => menu.current)?.fileUrl ?? menuUploads[0]?.fileUrl;

  return (
    <main>
      <JsonLd data={schemas} />
      <PageHero
        eyebrow="Weekly menu"
        title="A meal calendar worth checking every Monday."
        image={backgrounds["menu.hero"].imageUrl}
        imageAlt="Indian thali menu"
        focalPoint={backgrounds["menu.hero"].focalPoint}
        overlay={backgrounds["menu.hero"].overlay}
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
        imageCaption={menuUploads.length ? (
          <>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-saffron">
              This week&apos;s rotation
            </p>
            <p className="mt-2 font-display text-3xl font-black leading-none">
              Dal, sabzi, rice, roti, salad, and weekly sweets.
            </p>
          </>
        ) : undefined}
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
        <section id="monthly-menus" className="section relative scroll-mt-28 bg-white">
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
                        href={`/menu/view/${menu.id}`}
                        className="flex items-center gap-4 bg-ink px-5 py-6 text-white transition hover:bg-[#1f1a16]"
                      >
                        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-saffron text-ink">
                          <FileText size={22} />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[11px] font-extrabold uppercase tracking-[0.15em] text-saffron">PDF menu</span>
                          <span className="mt-1 block text-sm font-extrabold">Open the full menu in a new tab</span>
                        </span>
                        <ArrowRight size={18} className="ml-auto shrink-0 text-white/60" />
                      </a>
                    ) : (
                      <a href={`/menu/view/${menu.id}`} className="group relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-[#f7f1e9]">
                        {/* eslint-disable-next-line @next/next/no-img-element -- admin-uploaded file of unknown dimensions served from our own API route */}
                        <img
                          src={menu.fileUrl}
                          alt={`${menu.title} — Curry Kitchen weekly menu`}
                          loading="lazy"
                          className="h-full w-full object-contain object-center transition duration-700 group-hover:scale-[1.025]"
                        />
                        <span className="absolute bottom-4 right-4 grid size-10 place-items-center rounded-full bg-white/90 text-ink opacity-0 transition duration-300 group-hover:opacity-100">
                          <ArrowRight size={18} />
                        </span>
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
        <section className="section relative bg-white">
          <div className="section-shell">
            <MenuEmptyState />
          </div>
        </section>
      )}
    </main>
  );
}
