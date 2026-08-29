"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, CalendarDays, ChefHat, CirclePlay, Clock3, MapPin } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import type { PageBackgroundVisual } from "@/lib/page-backgrounds";
import { cn } from "@/lib/utils";

const reveal = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0 },
};

const titleCharacter = {
  hidden: { opacity: 0, y: 30 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const heroOverlay = {
  NONE: "bg-[linear-gradient(90deg,rgba(6,6,5,0.50)_0%,rgba(6,6,5,0.34)_39%,rgba(6,6,5,0.12)_72%,rgba(6,6,5,0.22)_100%)]",
  LIGHT: "bg-[linear-gradient(90deg,rgba(6,6,5,0.68)_0%,rgba(6,6,5,0.50)_39%,rgba(6,6,5,0.18)_72%,rgba(6,6,5,0.30)_100%)]",
  MEDIUM: "bg-[linear-gradient(90deg,rgba(6,6,5,0.82)_0%,rgba(6,6,5,0.64)_39%,rgba(6,6,5,0.25)_72%,rgba(6,6,5,0.38)_100%)]",
  DARK: "bg-[linear-gradient(90deg,rgba(6,6,5,0.96)_0%,rgba(6,6,5,0.80)_39%,rgba(6,6,5,0.31)_72%,rgba(6,6,5,0.48)_100%)]",
} as const;

function AnimatedTitle() {
  return (
    <motion.h1
      variants={reveal}
      transition={{ staggerChildren: 0.035, delayChildren: 0.18 }}
      className="flex flex-nowrap justify-center whitespace-nowrap font-display text-[clamp(2.45rem,10vw,4.2rem)] font-black leading-[0.94] tracking-[-0.045em] lg:text-[clamp(3rem,6vw,5.6rem)]"
    >
      {"Curry".split("").map((character, index) => (
        <motion.span key={`curry-${index}`} variants={titleCharacter} className="inline-block">
          {character}
        </motion.span>
      ))}
      <span className="inline-block w-[0.2em] lg:w-[0.23em]" aria-hidden />
      {"Kitchen".split("").map((character, index) =>
        character === "i" ? (
          <span key={`kitchen-${index}`} className="relative inline-block">
            <motion.span variants={titleCharacter} className="inline-block">
              {"ı"}
            </motion.span>
            <motion.span
              aria-hidden
              className="pointer-events-none absolute -top-[0.55em] left-1/2 -translate-x-1/2 text-saffron"
              initial={{ opacity: 0, rotate: -16, y: -16 }}
              animate={{ opacity: 1, rotate: [0, 2, 0, -2, 0], y: [0, -5, 0, -4, 0] }}
              transition={{
                opacity: { delay: 1, duration: 0.65, ease: [0.22, 1, 0.36, 1] },
                rotate: { delay: 1.65, duration: 3.6, ease: "easeInOut", repeat: Infinity },
                y: { delay: 1.65, duration: 3.6, ease: "easeInOut", repeat: Infinity },
              }}
            >
              <ChefHat className="h-[0.6em] w-[0.6em]" strokeWidth={2.25} />
            </motion.span>
          </span>
        ) : (
          <motion.span key={`kitchen-${index}`} variants={titleCharacter} className="inline-block">
            {character}
          </motion.span>
        ),
      )}
    </motion.h1>
  );
}

const promises = [
  ["Cooked fresh each morning", "Nothing sits overnight. Your dabba is made the day it reaches you."],
  ["A proper home-style meal", "Roti, sabzi, dal, rice, and a fresh side — the dinner you grew up with."],
  ["Packed with care", "Generous portions in a real tiffin, sealed warm and ready to open."],
] as const;

export type HeroFacts = {
  deliveryDays: string;
  deliveryWindow: string;
  serviceAreas: string;
};

export function HeroSection({ background, facts }: { background: PageBackgroundVisual; facts: HeroFacts }) {
  const { scrollY } = useScroll();
  const imageY = useTransform(scrollY, [0, 760], [0, 96]);

  return (
    <section className="dark-band relative isolate flex min-h-[100svh] flex-col overflow-hidden text-white">
      <motion.div style={{ y: imageY }} className="absolute inset-0 -z-20">
        {/* eslint-disable-next-line @next/next/no-img-element -- admin can choose a secure external background URL. */}
        <img
          src={background.imageUrl}
          alt="Freshly prepared Indian tiffin meal served in a steel bowl"
          className="size-full object-cover"
          style={{ objectPosition: `${background.focalPoint.toLowerCase()} center` }}
          fetchPriority="high"
        />
      </motion.div>
      <div className={cn("absolute inset-0 -z-10", heroOverlay[background.overlay])} />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-[42%] bg-gradient-to-t from-black/80 via-black/28 to-transparent" />
      <div className="absolute inset-x-0 top-0 -z-10 h-36 bg-gradient-to-b from-black/64 to-transparent" />

      <div className="section-shell flex w-full flex-1 flex-col justify-center py-28 sm:py-32 lg:pb-20 lg:pt-16">
        <div className="flex flex-col items-center gap-12 text-center lg:gap-8">
        <motion.div
          initial="hidden"
          animate="show"
          transition={{ staggerChildren: 0.11, delayChildren: 0.04 }}
          className="mx-auto max-w-2xl"
        >
          <AnimatedTitle />
          <motion.p
            variants={reveal}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto mt-7 max-w-xl text-base font-medium leading-7 text-white/78 sm:text-lg sm:leading-8 lg:mt-5 lg:max-w-3xl"
          >
            Honest Indian food, cooked fresh each day and delivered in the comforting rhythm of a proper tiffin.
          </motion.p>
          <motion.div
            variants={reveal}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="mt-9 flex flex-wrap items-center justify-center gap-4 lg:mt-7"
          >
            <ButtonLink href="/packages" className="rounded-full px-6">
              Order now
              <ArrowRight size={18} />
            </ButtonLink>
            <ButtonLink
              href="/about"
              variant="secondary"
              className="rounded-full border-white/22 bg-transparent px-5 text-white hover:bg-white hover:text-ink"
            >
              <CirclePlay size={19} />
              Our story
            </ButtonLink>
          </motion.div>
        </motion.div>

        <motion.div
          initial="hidden"
          animate="show"
          transition={{ staggerChildren: 0.11, delayChildren: 0.5 }}
          className="w-full"
        >
          <motion.p
            variants={reveal}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-saffron"
          >
            The Curry Kitchen promise
          </motion.p>
          <ul className="mt-4 flex flex-col border-y border-white/16 md:flex-row">
            {promises.map(([title, copy], index) => (
              <motion.li
                key={title}
                variants={reveal}
                transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
                className={cn(
                  "py-5 text-left md:flex-1 md:px-7",
                  index > 0 && "border-t border-white/14 md:border-l md:border-t-0",
                  index === 0 && "md:pl-0",
                  index === promises.length - 1 && "md:pr-0",
                )}
              >
                <span className="block font-display text-lg font-black leading-tight">{title}</span>
                <span className="mt-1 block text-sm leading-6 text-white/64">{copy}</span>
              </motion.li>
            ))}
          </ul>
        </motion.div>
        </div>

      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative mt-auto border-t border-white/18 bg-black/45 backdrop-blur-md lg:absolute lg:inset-x-0 lg:bottom-0 lg:bg-black/35"
      >
        <dl className="section-shell grid md:grid-cols-3">
          {[
            [CalendarDays, "Delivery days", facts.deliveryDays],
            [Clock3, "Delivery window", facts.deliveryWindow],
            [MapPin, "Serving", facts.serviceAreas],
          ].map(([Icon, label, value], index) => {
            const DetailIcon = Icon as typeof CalendarDays;

            return (
              <div
                key={label as string}
                className={cn(
                  "flex items-center gap-3 py-5 md:px-6 lg:py-3",
                  index > 0 && "border-t border-white/14 md:border-l md:border-t-0",
                  index === 0 && "md:pl-0",
                  index === 2 && "md:pr-0",
                )}
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-full border border-saffron/40 bg-saffron/12 text-saffron">
                  <DetailIcon size={18} strokeWidth={2} aria-hidden />
                </span>
                <span className="min-w-0">
                  <dt className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-white/56">{label as string}</dt>
                  <dd className="mt-1 text-sm font-bold text-white/92">{value as string}</dd>
                </span>
              </div>
            );
          })}
        </dl>
      </motion.div>
    </section>
  );
}
