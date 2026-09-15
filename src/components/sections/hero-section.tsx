"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, CalendarDays, ChefHat, CirclePlay, Clock3, MapPin, CookingPot, Utensils, PackageCheck } from "lucide-react";
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
  const reducedMotion = useReducedMotion();
  return (
    <motion.h1
      variants={reveal}
      transition={{ staggerChildren: 0.035, delayChildren: 0.18 }}
      aria-label="Curry Kitchen"
      className="flex flex-nowrap justify-center whitespace-nowrap font-display text-[36px] font-black leading-none tracking-normal min-[375px]:text-[42px] min-[430px]:text-5xl sm:text-6xl lg:text-[80px] xl:text-[88px]"
    >
      {"Curry".split("").map((character, index) => (
        <motion.span key={`curry-${index}`} variants={titleCharacter} className="inline-block">
          {character}
        </motion.span>
      ))}
      <span className="inline-block w-[0.22em] lg:w-[0.25em]" aria-hidden />
      {"Kitchen".split("").map((character, index) =>
        character === "i" ? (
          <span key={`kitchen-${index}`} className="relative inline-block">
            <motion.span variants={titleCharacter} className="inline-block">
              {"ı"}
            </motion.span>
            <motion.span
              aria-hidden
              className="pointer-events-none absolute -top-[0.46em] left-1/2 -translate-x-1/2 text-saffron"
              initial={{ opacity: 0, rotate: -10, y: -12 }}
              animate={{ opacity: 1, rotate: 0, y: reducedMotion ? 0 : [0, -5, 0] }}
              transition={{
                opacity: { delay: 1, duration: 0.65, ease: [0.22, 1, 0.36, 1] },
                rotate: { delay: 1, duration: 0.65, ease: [0.22, 1, 0.36, 1] },
                y: { delay: 1.65, duration: 2.4, ease: "easeInOut", repeat: Infinity },
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
const promiseIcons = [CookingPot, Utensils, PackageCheck];

export type HeroFacts = {
  deliveryDays: string;
  deliveryWindow: string;
  serviceAreas: string;
};

export function HeroSection({ background, facts }: { background: PageBackgroundVisual; facts: HeroFacts }) {
  const reducedMotion = useReducedMotion();

  return (
    <section aria-label="Curry Kitchen" className="dark-band relative isolate flex min-h-[calc(100svh-24px)] flex-col overflow-hidden text-white">
      <div className="absolute inset-0 -z-20">
        {/* eslint-disable-next-line @next/next/no-img-element -- admin can choose a secure external background URL. */}
        <img
          src={background.imageUrl}
          alt="Freshly prepared Indian tiffin meal served in a steel bowl"
          className="size-full object-cover"
          style={{ objectPosition: `${background.focalPoint.toLowerCase()} center` }}
          fetchPriority="high"
        />
      </div>
      <div className={cn("absolute inset-0 -z-10", heroOverlay[background.overlay])} />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-[42%] bg-gradient-to-t from-black/80 via-black/28 to-transparent" />
      <div className="absolute inset-x-0 top-0 -z-10 h-36 bg-gradient-to-b from-black/64 to-transparent" />

      <div className="section-shell flex w-full flex-1 flex-col justify-center pb-14 pt-32 text-center sm:pb-20 sm:pt-32 lg:min-h-[460px] lg:pb-28 lg:pt-28">
        <motion.div
          initial={reducedMotion ? false : "hidden"}
          animate="show"
          transition={{ staggerChildren: 0.11, delayChildren: 0.04 }}
          className="mx-auto w-full max-w-3xl"
        >
          <AnimatedTitle />
          <motion.p
            variants={reveal}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto mt-6 max-w-2xl text-base font-medium leading-7 text-white/85 sm:text-lg sm:leading-8"
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
      </div>
      <div className="relative border-b border-white/15 bg-black/65 py-7 backdrop-blur-sm sm:py-8">
        <motion.div
          initial={reducedMotion ? false : "hidden"}
          animate="show"
          transition={{ staggerChildren: 0.11, delayChildren: 0.5 }}
          className="section-shell w-full"
        >
          <motion.p
            variants={reveal}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center justify-center gap-4 text-center text-xs font-extrabold uppercase tracking-normal text-saffron before:h-px before:max-w-60 before:flex-1 before:bg-saffron/50 after:h-px after:max-w-60 after:flex-1 after:bg-saffron/50 sm:gap-7"
          >
            The Curry Kitchen promise
          </motion.p>
          <ul className="mt-6 grid gap-5 md:grid-cols-3 md:gap-0">
            {promises.map(([title, copy], index) => {
              const Icon = promiseIcons[index];
              return (
                <motion.li
                key={title}
                variants={reveal}
                transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
                className={cn(
                  "grid min-w-0 grid-cols-[40px_minmax(0,1fr)] items-start gap-x-4 md:flex md:flex-col md:items-center md:px-6 md:text-center",
                  index > 0 && "border-t border-white/14 pt-5 md:border-l md:border-t-0 md:pt-0",
                )}
              >
                <Icon aria-hidden size={36} strokeWidth={1.5} className="row-span-2 text-saffron md:mb-4" />
                <span className="block font-display text-base font-black leading-tight md:min-h-[2.5em] lg:min-h-0 lg:text-lg">{title}</span>
                <span className="mt-2 block max-w-sm text-sm leading-6 text-white/75">{copy}</span>
                </motion.li>
              );
            })}
          </ul>
        </motion.div>
      </div>

      <motion.div
        initial={reducedMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative mt-auto bg-[#090a09]/95"
      >
        <dl className="section-shell grid grid-cols-2 py-2 md:grid-cols-[1fr_1fr_1.35fr] md:py-0">
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
                  "flex min-w-0 items-center gap-2 py-4 sm:gap-3 md:my-5 md:px-6 md:py-0",
                  index === 1 && "border-l border-white/14 pl-3",
                  index === 2 && "col-span-2 border-t border-white/14 md:col-span-1 md:border-l md:border-t-0",
                  index === 0 && "md:pl-0",
                  index === 2 && "md:pr-0",
                )}
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-full border border-saffron/40 bg-saffron/12 text-saffron">
                  <DetailIcon size={18} strokeWidth={2} aria-hidden />
                </span>
                <span className="min-w-0">
                  <dt className="text-[10px] font-extrabold uppercase tracking-normal text-white/55 sm:text-[11px]">{label as string}</dt>
                  <dd className="mt-1 text-xs font-bold leading-5 text-white/90 sm:text-sm">{value as string}</dd>
                </span>
              </div>
            );
          })}
        </dl>
      </motion.div>
    </section>
  );
}
