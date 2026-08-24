"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CookingPot, ShoppingBag, Truck } from "lucide-react";
import { useState } from "react";
import { RevealItem, StaggerGroup } from "@/components/ui/animated-section";

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

export function HowItWorks() {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <section className="section texture bg-[#f8f0e7]">
      <StaggerGroup className="section-shell">
        <div className="mx-auto max-w-2xl text-center">
          <RevealItem className="mb-6 flex items-center justify-center gap-3 text-[11px] font-extrabold uppercase tracking-[0.22em] text-masala">
            <span className="h-px w-10 bg-saffron" />
            How it works
            <span className="h-px w-10 bg-saffron" />
          </RevealItem>
          <RevealItem as="h2" className="font-display text-4xl font-black leading-[1.06] sm:text-5xl">
            Fresh meals in <span className="text-saffron">three simple steps.</span>
          </RevealItem>
          <RevealItem as="p" className="mx-auto mt-6 max-w-md text-base leading-7 text-ink/58">
            Good food should fit comfortably into the week. We keep the ordering part simple.
          </RevealItem>
        </div>

        <div className="mt-12 grid gap-2 sm:grid-cols-2 md:grid-cols-3" onMouseLeave={() => setHovered(null)}>
          {steps.map((step, index) => (
            <RevealItem key={step.title} className="h-full">
              <div
                className="group relative block h-full w-full p-2"
                onMouseEnter={() => setHovered(index)}
              >
                <AnimatePresence>
                  {hovered === index ? (
                    <motion.span
                      layoutId="how-it-works-hover"
                      className="absolute inset-0 block rounded-lg bg-saffron/12"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1, transition: { duration: 0.15 } }}
                      exit={{ opacity: 0, transition: { duration: 0.15, delay: 0.2 } }}
                    />
                  ) : null}
                </AnimatePresence>

                <article className="relative z-20 flex h-full flex-col items-center rounded-lg border border-ink/10 bg-white px-7 py-10 text-center shadow-soft transition-colors duration-300 group-hover:border-saffron/50">
                  <span className="grid size-16 place-items-center rounded-full border border-ink/10 bg-ivory text-saffron transition duration-500 group-hover:border-saffron group-hover:bg-saffron group-hover:text-white">
                    <step.icon size={28} strokeWidth={1.8} />
                  </span>
                  <span className="mt-6 font-display text-sm font-black tracking-[0.2em] text-saffron">
                    0{index + 1}
                  </span>
                  <h3 className="mt-2 font-display text-2xl font-black">{step.title}</h3>
                  <p className="mt-3 max-w-xs text-sm leading-6 text-ink/58">{step.copy}</p>
                </article>
              </div>
            </RevealItem>
          ))}
        </div>
      </StaggerGroup>
    </section>
  );
}
