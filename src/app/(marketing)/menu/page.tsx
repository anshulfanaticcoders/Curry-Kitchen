import { ArrowRight, CalendarClock, CookingPot, Download, Eye, Truck } from "lucide-react";
import { MenuDayCard } from "@/components/food/menu-day-card";
import { PageHero } from "@/components/sections/page-hero";
import { RevealItem, StaggerGroup } from "@/components/ui/animated-section";
import { ButtonLink } from "@/components/ui/button";
import { getWeeklyMenu } from "@/lib/server/catalog";

export const dynamic = "force-dynamic";

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
  const weeklyMenu = await getWeeklyMenu();

  return (
    <main>
      <PageHero
        eyebrow="Weekly menu"
        title="A meal calendar worth checking every Monday."
        image="https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=1400&q=80"
        imageAlt="Indian thali menu"
        chips={["Jun 22 – Jun 26", "Fresh roti daily", "Dessert twice weekly"]}
        actions={
          <>
            <ButtonLink href="/packages">
              <Eye size={18} />
              Choose a package
            </ButtonLink>
            <ButtonLink href="/checkout" variant="secondary">
              <Download size={18} />
              Download menu
            </ButtonLink>
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
            <RevealItem as="h2" className="mt-3 font-display text-3xl font-black leading-[1.05] lg:text-4xl">
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

      {/* This week — LIGHT (white), 3-column grid */}
      <section className="section relative bg-white">
        <StaggerGroup className="section-shell">
          <div className="mb-9 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <RevealItem as="p" className="text-sm font-black uppercase tracking-[0.18em] text-masala">
                Monday to Friday
              </RevealItem>
              <RevealItem as="h2" className="mt-3 max-w-xl font-display text-3xl font-black leading-[1.04] lg:text-5xl">
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
    </main>
  );
}
