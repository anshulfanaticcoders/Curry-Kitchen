import { ArrowRight, HelpCircle, MapPin, ReceiptText, Truck } from "lucide-react";
import { FaqAccordion } from "@/components/sections/faq-accordion";
import { PageHero } from "@/components/sections/page-hero";
import { RevealItem, StaggerGroup } from "@/components/ui/animated-section";
import { ButtonLink } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";

const faqGroups = [
  {
    icon: ReceiptText,
    title: "Plans and pricing",
    questions: [
      {
        question: "Is tax included in the package price?",
        answer:
          "Package cards show the base package price only. Any applicable sales tax is calculated clearly during checkout before payment.",
      },
      {
        question: "Can I add rice, roti, or sabzi to a plan?",
        answer:
          "Yes. Eligible add-ons appear with each package. Add-ons customize the same meal delivery and do not create a separate delivery charge.",
      },
      {
        question: "Can I buy without creating an account?",
        answer:
          "No. Customers need an account before checkout so package tracking, start dates, reminders, order history, and notifications stay connected to the right profile.",
      },
    ],
  },
  {
    icon: Truck,
    title: "Delivery",
    questions: [
      {
        question: "How is delivery calculated?",
        answer:
          "Delivery is charged per meal package only. One package with multiple add-ons receives one package delivery charge; two packages receive two package delivery charges.",
      },
      {
        question: "How do I check if my ZIP code is covered?",
        answer:
          "Checkout asks for city and ZIP code, then shows whether the address matches a free delivery zone, paid zone, or outside-zone delivery fee.",
      },
      {
        question: "What time does food arrive?",
        answer:
          "Most dinner deliveries are scheduled Monday through Friday between 6:00 PM and 8:00 PM.",
      },
    ],
  },
  {
    icon: HelpCircle,
    title: "Account support",
    questions: [
      {
        question: "Can I pause a package?",
        answer:
          "Customers can request one self-pause per package. Admin can pause or resume packages when a customer needs help.",
      },
      {
        question: "How do student packages work?",
        answer:
          "Student packages collect university details and student ID metadata during checkout. Payment can complete first, but activation waits for admin approval.",
      },
      {
        question: "Can I reorder an expired package?",
        answer:
          "Yes. The customer dashboard shows package status and makes it easy to buy again after a package expires.",
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <main>
      <PageHero
        eyebrow="FAQ"
        title="Clear answers before dinner is on the way."
        image="https://images.unsplash.com/photo-1543353071-10c8ba85a904?auto=format&fit=crop&w=1400&q=80"
        imageAlt="Fresh Indian meal bowls on a table"
        chips={["Package pricing", "Delivery zones", "Student and military plans"]}
        actions={
          <>
            <ButtonLink href="/packages">
              View packages
              <ArrowRight size={18} />
            </ButtonLink>
            <ButtonLink href="/contact" variant="secondary">
              Ask a question
            </ButtonLink>
          </>
        }
        imageCaption={
          <>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-saffron">
              No surprises
            </p>
            <p className="mt-2 font-display text-3xl font-black leading-none">
              Pricing, delivery, and account rules explained plainly.
            </p>
          </>
        }
      >
        The most common questions about Curry Kitchen plans, add-ons, delivery, pauses, and
        student verification.
      </PageHero>

      <section className="section bg-ivory text-ink">
        <StaggerGroup className="section-shell">
          <SectionHeading
            eyebrow="Answers"
            title="Everything customers usually ask before checkout."
          >
            FAQ content is written around the exact pricing and delivery rules in the new checkout
            flow.
          </SectionHeading>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {faqGroups.map((group) => (
              <RevealItem
                key={group.title}
                as="article"
                className="rounded-lg border border-ink/10 bg-white p-6 shadow-soft"
              >
                <span className="grid size-12 place-items-center rounded-button bg-saffron/15 text-masala">
                  <group.icon size={22} />
                </span>
                <h2 className="mt-5 font-display text-2xl font-black">{group.title}</h2>
                <FaqAccordion items={group.questions} className="mt-5" />
              </RevealItem>
            ))}
          </div>
        </StaggerGroup>
      </section>

      <section className="section bg-white">
        <div className="section-shell grid items-center gap-6 rounded-lg border border-ink/10 bg-ink p-8 text-white shadow-soft md:grid-cols-[1fr_auto]">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-saffron">
              Still deciding?
            </p>
            <h2 className="mt-3 font-display text-3xl font-black">
              Check your delivery zone during checkout.
            </h2>
          </div>
          <ButtonLink href="/checkout">
            <MapPin size={18} />
            Start checkout
          </ButtonLink>
        </div>
      </section>
    </main>
  );
}
