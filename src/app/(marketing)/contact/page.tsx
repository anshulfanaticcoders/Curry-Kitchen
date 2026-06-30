import { ArrowRight, Clock, Mail, MapPin, Phone, Send } from "lucide-react";
import { PageHero } from "@/components/sections/page-hero";
import { RevealItem, StaggerGroup } from "@/components/ui/animated-section";
import { ButtonLink, buttonStyles } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";

const contactCards = [
  {
    icon: Phone,
    title: "Call",
    value: "(858) 599-1613",
    copy: "Best for package questions, delivery help, and urgent order updates.",
  },
  {
    icon: Mail,
    title: "Email",
    value: "info@currykitcheninc.com",
    copy: "Useful for student verification, event orders, and account support.",
  },
  {
    icon: MapPin,
    title: "Delivery area",
    value: "California Bay Area",
    copy: "Checkout checks city and ZIP against active delivery zones.",
  },
];

export default function ContactPage() {
  return (
    <main>
      <PageHero
        eyebrow="Contact"
        title="Need help choosing the right tiffin rhythm?"
        image="https://images.unsplash.com/photo-1551218808-94e220e084d2?auto=format&fit=crop&w=1400&q=80"
        imageAlt="Kitchen counter with fresh ingredients"
        chips={["Package help", "Delivery zones", "Student support"]}
        actions={
          <>
            <a href="tel:+18585991613" className={buttonStyles()}>
              <Phone size={18} />
              Call now
            </a>
            <a href="mailto:info@currykitcheninc.com" className={buttonStyles("secondary")}>
              <Mail size={18} />
              Email us
            </a>
          </>
        }
        imageCaption={
          <>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-saffron">
              Dinner support
            </p>
            <p className="mt-2 font-display text-3xl font-black leading-none">
              Questions answered before checkout.
            </p>
          </>
        }
      >
        Reach Curry Kitchen for plan guidance, delivery-zone questions, student verification, and
        order support.
      </PageHero>

      <section className="section bg-ivory text-ink">
        <StaggerGroup className="section-shell">
          <SectionHeading
            eyebrow="Get in touch"
            title="Real support for real weekday meals."
          >
            Customers can call, email, or send order notes during checkout. Delivery pricing remains
            visible before payment.
          </SectionHeading>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {contactCards.map((card) => (
              <RevealItem
                key={card.title}
                as="article"
                className="rounded-lg border border-ink/10 bg-white p-7 shadow-soft"
              >
                <span className="grid size-12 place-items-center rounded-button bg-saffron text-ink">
                  <card.icon size={22} />
                </span>
                <p className="mt-5 text-sm font-black uppercase tracking-[0.16em] text-masala">
                  {card.title}
                </p>
                <h2 className="mt-2 font-display text-2xl font-black">{card.value}</h2>
                <p className="mt-3 text-sm font-medium leading-6 text-ink/62">{card.copy}</p>
              </RevealItem>
            ))}
          </div>
        </StaggerGroup>
      </section>

      <section className="section bg-white text-ink">
        <div className="section-shell grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-lg border border-ink/10 bg-rose p-7 shadow-soft">
            <Clock className="text-masala" size={28} />
            <h2 className="mt-5 font-display text-3xl font-black">Delivery rhythm</h2>
            <p className="mt-3 text-sm font-medium leading-6 text-ink/64">
              Monday to Friday dinner delivery, usually between 6:00 PM and 8:00 PM. Customers
              confirm city and ZIP during checkout.
            </p>
            <ButtonLink href="/faq" variant="dark" className="mt-6">
              Read FAQ
              <ArrowRight size={18} />
            </ButtonLink>
          </div>

          <form
            action="mailto:info@currykitcheninc.com"
            className="rounded-lg border border-ink/10 bg-white p-7 shadow-soft"
          >
            <p className="text-sm font-black uppercase tracking-[0.18em] text-masala">
              Message Curry Kitchen
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-extrabold">
                Name
                <input className="h-12 rounded-button border border-ink/10 bg-ivory px-4 outline-none transition focus:border-leaf" />
              </label>
              <label className="grid gap-2 text-sm font-extrabold">
                Email
                <input type="email" className="h-12 rounded-button border border-ink/10 bg-ivory px-4 outline-none transition focus:border-leaf" />
              </label>
              <label className="grid gap-2 text-sm font-extrabold md:col-span-2">
                What can we help with?
                <textarea className="min-h-32 rounded-button border border-ink/10 bg-ivory px-4 py-3 outline-none transition focus:border-leaf" />
              </label>
            </div>
            <a
              href="mailto:info@currykitcheninc.com"
              className={buttonStyles("primary", "mt-5")}
            >
              <Send size={18} />
              Send email
            </a>
          </form>
        </div>
      </section>
    </main>
  );
}
