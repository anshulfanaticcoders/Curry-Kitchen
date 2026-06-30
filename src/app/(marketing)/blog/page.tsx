import Image from "next/image";
import { ArrowRight, BookOpen, CalendarDays, Clock3 } from "lucide-react";
import { PageHero } from "@/components/sections/page-hero";
import { RevealItem, StaggerGroup } from "@/components/ui/animated-section";
import { ButtonLink } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";

const posts = [
  {
    title: "How to choose the right monthly tiffin size",
    category: "Meal planning",
    readTime: "4 min read",
    image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=900&q=80",
    excerpt:
      "A practical guide to matching appetite, schedule, and add-ons before starting a monthly package.",
  },
  {
    title: "Why delivery fees should follow packages, not add-ons",
    category: "Checkout clarity",
    readTime: "3 min read",
    image: "https://images.unsplash.com/photo-1526367790999-0150786686a2?auto=format&fit=crop&w=900&q=80",
    excerpt:
      "Rice, roti, and sabzi add-ons belong to the same meal delivery. The checkout should keep that math transparent.",
  },
  {
    title: "Student tiffin plans without weekday dinner stress",
    category: "Student meals",
    readTime: "5 min read",
    image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=900&q=80",
    excerpt:
      "How student verification, predictable deliveries, and package tracking make weekly meals easier.",
  },
];

export default function BlogPage() {
  return (
    <main>
      <PageHero
        eyebrow="Blog"
        title="Meal planning notes from the Curry Kitchen counter."
        image="https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=1400&q=80"
        imageAlt="Fresh cooked food and vegetables"
        chips={["Meal planning", "Delivery clarity", "Student support"]}
        actions={
          <>
            <ButtonLink href="/packages">
              Browse plans
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
              Kitchen journal
            </p>
            <p className="mt-2 font-display text-3xl font-black leading-none">
              Useful notes before the next order.
            </p>
          </>
        }
      >
        Short articles for customers comparing packages, understanding delivery rules, and planning
        easy weekday meals.
      </PageHero>

      <section className="section bg-ivory text-ink">
        <StaggerGroup className="section-shell">
          <SectionHeading
            eyebrow="Latest"
            title="Practical reads for cleaner ordering."
          >
            The blog supports the sales flow with transparent notes about packages, delivery, and
            weekday meal planning.
          </SectionHeading>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {posts.map((post) => (
              <RevealItem
                key={post.title}
                as="article"
                className="overflow-hidden rounded-lg border border-ink/10 bg-white shadow-soft"
              >
                <div className="relative h-56">
                  <Image
                    src={post.image}
                    alt={post.title}
                    fill
                    className="object-cover"
                    sizes="(min-width: 1024px) 33vw, 100vw"
                  />
                  <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/65 to-transparent" />
                  <span className="absolute bottom-4 left-4 rounded-full bg-saffron px-3 py-1 text-xs font-black text-ink">
                    {post.category}
                  </span>
                </div>
                <div className="p-6">
                  <div className="flex flex-wrap gap-3 text-xs font-bold text-ink/48">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays size={14} />
                      Jun 2026
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock3 size={14} />
                      {post.readTime}
                    </span>
                  </div>
                  <h2 className="mt-4 font-display text-2xl font-black leading-tight">
                    {post.title}
                  </h2>
                  <p className="mt-3 text-sm font-medium leading-6 text-ink/62">{post.excerpt}</p>
                  <ButtonLink href="/contact" variant="secondary" className="mt-5">
                    <BookOpen size={18} />
                    Ask about this
                  </ButtonLink>
                </div>
              </RevealItem>
            ))}
          </div>
        </StaggerGroup>
      </section>
    </main>
  );
}
