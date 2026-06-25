import { ArrowRight, HeartHandshake, MapPin, PackageOpen, Truck, Utensils } from "lucide-react";
import { PageHero } from "@/components/sections/page-hero";
import { RevealItem, StaggerGroup } from "@/components/ui/animated-section";
import { ButtonLink } from "@/components/ui/button";

const reasons = [
  {
    icon: Utensils,
    title: "Home-style meals",
    copy: "Familiar dishes built around dal, sabzi, roti, rice, salad, and weekly sweets.",
  },
  {
    icon: MapPin,
    title: "Local delivery",
    copy: "A practical dinner-hour rhythm for California Bay Area delivery zones.",
  },
];

const journey = [
  {
    icon: PackageOpen,
    title: "Pick a plan",
    copy: "Choose a monthly, weekly, or student tiffin that matches your appetite.",
  },
  {
    icon: HeartHandshake,
    title: "Tune your tiffin",
    copy: "Set spice, rice or roti, and any food notes before checkout.",
  },
  {
    icon: Utensils,
    title: "We cook fresh",
    copy: "Small batches prepared daily from the rotating weekly menu.",
  },
  {
    icon: Truck,
    title: "Delivered nightly",
    copy: "Your dinner arrives between 6 and 8 PM, Monday to Friday.",
  },
];

export default function AboutPage() {
  return (
    <main>
      <PageHero
        eyebrow="Our story"
        title="A local kitchen for people who miss real weekday food."
        image="https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=1400&q=80"
        imageAlt="Kitchen team preparing fresh food"
        chips={["Bay Area rooted", "Small-batch cooking", "Weekly tiffin rhythm"]}
        actions={
          <>
            <ButtonLink href="/packages">
              View packages
              <ArrowRight size={18} />
            </ButtonLink>
            <ButtonLink href="/menu" variant="secondary">
              This week menu
            </ButtonLink>
          </>
        }
        imageCaption={
          <>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-saffron">
              Made close to home
            </p>
            <p className="mt-2 font-display text-3xl font-black leading-none">
              Food that fits real weekdays.
            </p>
          </>
        }
      >
        Curry Kitchen brings home-style Indian comfort into a simpler weekly service: fresh dal,
        sabzi, roti, rice, salad, and delivery that busy homes can rely on.
      </PageHero>

      {/* Why we exist — LIGHT */}
      <section className="section relative bg-rose text-ink">
        <StaggerGroup className="section-shell grid items-center gap-10 lg:grid-cols-[1fr_0.95fr]">
          <div>
            <RevealItem
              as="p"
              className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-saffron"
            >
              <HeartHandshake size={16} />
              Why Curry Kitchen exists
            </RevealItem>
            <RevealItem as="h2" className="mt-4 max-w-2xl font-display text-3xl font-black leading-[1.04] lg:text-5xl">
              Dinner should feel cared for, even on the busiest days.
            </RevealItem>
            <RevealItem as="p" className="mt-5 max-w-xl text-base font-medium leading-7 text-ink/68">
              The service is built for students, families, and professionals who want reliable Indian
              meals without planning, shopping, cooking, and cleaning after a long day.
            </RevealItem>
          </div>
          <div className="grid gap-4">
            {reasons.map((item) => (
              <RevealItem
                key={item.title}
                as="article"
                className="rounded-lg border border-ink/10 bg-white p-6 shadow-soft"
              >
                <span className="grid size-11 place-items-center rounded-button bg-saffron/15 text-masala">
                  <item.icon size={22} />
                </span>
                <h3 className="mt-4 font-display text-2xl font-black">{item.title}</h3>
                <p className="mt-2 text-sm font-medium leading-6 text-ink/62">{item.copy}</p>
              </RevealItem>
            ))}
          </div>
        </StaggerGroup>
      </section>

      {/* How it works — DARK procedural timeline */}
      <section className="section dark-band relative text-white">
        <StaggerGroup className="section-shell relative">
          <div className="max-w-2xl">
            <RevealItem as="p" className="text-sm font-black uppercase tracking-[0.18em] text-saffron">
              How it works
            </RevealItem>
            <RevealItem as="h2" className="mt-3 font-display text-3xl font-black leading-[1.05] lg:text-4xl">
              From sign-up to dinner, in four steps.
            </RevealItem>
          </div>
          <div className="relative mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="absolute left-0 right-0 top-6 hidden h-px bg-gradient-to-r from-saffron/10 via-saffron/40 to-saffron/10 lg:block" />
            {journey.map((step, index) => (
              <RevealItem
                key={step.title}
                as="article"
                className="relative rounded-lg border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="grid size-11 place-items-center rounded-full bg-saffron text-ink">
                    <step.icon size={20} />
                  </span>
                  <span className="font-display text-3xl font-black text-white/15">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="mt-5 font-display text-xl font-black">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/64">{step.copy}</p>
              </RevealItem>
            ))}
          </div>
        </StaggerGroup>
      </section>

      {/* Promise — LIGHT stat band */}
      <section className="section relative bg-ivory text-ink">
        <StaggerGroup className="section-shell">
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { title: "Fresh prep", copy: "Cooked daily in small batches, never frozen and reheated." },
              { title: "Clear plans", copy: "Transparent portions, pricing, and add-ons before you pay." },
              { title: "Dependable delivery", copy: "A steady Monday-to-Friday dinner rhythm you can rely on." },
            ].map((item) => (
              <RevealItem key={item.title} className="rounded-lg border border-ink/10 bg-white p-7 shadow-soft">
                <p className="font-display text-3xl font-black">{item.title}</p>
                <p className="mt-3 text-sm font-medium leading-6 text-ink/62">{item.copy}</p>
              </RevealItem>
            ))}
          </div>
          <RevealItem className="mt-10">
            <ButtonLink href="/packages">
              Browse the packages
              <ArrowRight size={18} />
            </ButtonLink>
          </RevealItem>
        </StaggerGroup>
      </section>
    </main>
  );
}
