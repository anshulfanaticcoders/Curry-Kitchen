"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, CirclePlay } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import type { PageBackgroundVisual } from "@/lib/page-backgrounds";
import { cn } from "@/lib/utils";

const reveal = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0 },
};

const titleCharacter = {
  hidden: { opacity: 0, y: 26 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const heroOverlay = {
  NONE: "bg-[linear-gradient(90deg,rgba(6,6,5,0.56)_0%,rgba(6,6,5,0.38)_42%,rgba(6,6,5,0.14)_74%,rgba(6,6,5,0.26)_100%)]",
  LIGHT: "bg-[linear-gradient(90deg,rgba(6,6,5,0.72)_0%,rgba(6,6,5,0.52)_42%,rgba(6,6,5,0.2)_74%,rgba(6,6,5,0.32)_100%)]",
  MEDIUM: "bg-[linear-gradient(90deg,rgba(6,6,5,0.85)_0%,rgba(6,6,5,0.66)_42%,rgba(6,6,5,0.27)_74%,rgba(6,6,5,0.4)_100%)]",
  DARK: "bg-[linear-gradient(90deg,rgba(6,6,5,0.96)_0%,rgba(6,6,5,0.82)_42%,rgba(6,6,5,0.33)_74%,rgba(6,6,5,0.5)_100%)]",
} as const;

const heroPromises = [
  "Freshly cooked every day",
  "Ingredients chosen with care",
  "Reliable San Diego delivery",
];

const heroStripItems = ["San Diego rooted", "Freshly made", "Delivered daily"];

function AnimatedTitle() {
  return (
    <motion.h1
      variants={reveal}
      transition={{ staggerChildren: 0.09, delayChildren: 0.16 }}
      className="font-display text-[clamp(2.9rem,5.2vw,4.7rem)] font-black leading-[1.04] tracking-[-0.03em] [text-shadow:0_20px_60px_rgba(0,0,0,0.5)]"
    >
      <span className="block">
        {"Honest Indian food,".split(" ").map((word, index) => (
          <motion.span
            key={`line1-${index}`}
            variants={titleCharacter}
            className="mr-[0.24em] inline-block"
          >
            {word}
          </motion.span>
        ))}
      </span>
      <span className="block text-saffron">
        {"cooked fresh each day.".split(" ").map((word, index) => (
          <motion.span
            key={`line2-${index}`}
            variants={titleCharacter}
            className="mr-[0.24em] inline-block"
          >
            {word}
          </motion.span>
        ))}
      </span>
    </motion.h1>
  );
}

export function HeroSection({ background }: { background: PageBackgroundVisual }) {
  const { scrollY } = useScroll();
  const imageY = useTransform(scrollY, [0, 760], [0, 96]);
  const imageScale = useTransform(scrollY, [0, 760], [1.04, 1.12]);

  return (
    <section className="dark-band relative isolate flex min-h-[100svh] flex-col overflow-hidden text-white">
      <motion.div style={{ y: imageY, scale: imageScale }} className="absolute inset-0 -z-20">
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
      <div className="absolute inset-x-0 bottom-0 -z-10 h-[42%] bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
      <div className="absolute inset-x-0 top-0 -z-10 h-40 bg-gradient-to-b from-black/70 to-transparent" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(85%_60%_at_10%_92%,rgba(255,122,26,0.13),transparent_58%)]" />
      <div className="texture-light absolute inset-0 -z-10 opacity-50" />

      <div className="section-shell grid w-full flex-1 items-center gap-14 pb-16 pt-32 lg:grid-cols-[1.15fr_0.85fr] lg:gap-20 lg:pt-36">
        <motion.div
          initial="hidden"
          animate="show"
          transition={{ staggerChildren: 0.11, delayChildren: 0.04 }}
          className="max-w-2xl"
        >
          <motion.p
            variants={reveal}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className="mb-7 flex items-center gap-3 text-[11px] font-extrabold uppercase tracking-[0.24em] text-white/80"
          >
            <span className="h-px w-10 bg-saffron" />
            Fresh. Healthy. Homemade.
          </motion.p>
          <AnimatedTitle />
          <motion.p
            variants={reveal}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="mt-7 max-w-xl text-base font-medium leading-7 text-white/82 sm:text-lg sm:leading-8"
          >
            Curry Kitchen delivers home-style Indian dinners in the comforting rhythm of a proper
            tiffin.
          </motion.p>
          <motion.div
            variants={reveal}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="mt-9 flex flex-wrap items-center gap-4"
          >
            <ButtonLink
              href="/packages"
              className="rounded-full px-7 shadow-[0_18px_50px_rgba(255,122,26,0.38)]"
            >
              Order now
              <ArrowRight size={18} />
            </ButtonLink>
            <ButtonLink
              href="/about"
              variant="secondary"
              className="rounded-full border-white/28 bg-transparent px-6 text-white hover:bg-white hover:text-ink"
            >
              <CirclePlay size={19} />
              Our story
            </ButtonLink>
          </motion.div>
        </motion.div>

        <motion.ul
          initial="hidden"
          animate="show"
          transition={{ staggerChildren: 0.13, delayChildren: 0.7 }}
          className="hidden self-end lg:block"
        >
          {heroPromises.map((item, index) => (
            <motion.li
              key={item}
              variants={reveal}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-baseline gap-5 border-t border-white/16 py-5"
            >
              <span className="text-sm font-black text-saffron">0{index + 1}</span>
              <span className="font-display text-lg font-bold text-white/88">{item}</span>
            </motion.li>
          ))}
        </motion.ul>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.9 }}
        className="border-t border-white/12 bg-black/25"
      >
        <ul className="section-shell flex flex-wrap items-center justify-center gap-x-6 gap-y-2 py-5 text-[11px] font-extrabold uppercase tracking-[0.24em] text-white/62 sm:justify-between">
          {heroStripItems.map((item) => (
            <li key={item} className="flex items-center gap-6">
              {item}
            </li>
          ))}
        </ul>
      </motion.div>
    </section>
  );
}
