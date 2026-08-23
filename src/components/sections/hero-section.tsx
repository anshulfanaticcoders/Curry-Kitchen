"use client";

import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, ChefHat, CirclePlay } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";

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

function AnimatedTitle() {
  return (
    <motion.h1
      variants={reveal}
      transition={{ staggerChildren: 0.035, delayChildren: 0.18 }}
      className="flex flex-nowrap whitespace-nowrap font-display text-[clamp(3.15rem,7vw,6.35rem)] font-black leading-[0.94] tracking-[-0.045em]"
    >
      {"Curry".split("").map((character, index) => (
        <motion.span key={`curry-${index}`} variants={titleCharacter} className="inline-block">
          {character}
        </motion.span>
      ))}
      <span className="inline-block w-[0.23em]" aria-hidden />
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
              animate={{ opacity: 1, rotate: 0, y: 0 }}
              transition={{ delay: 1, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
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

export function HeroSection() {
  const { scrollY } = useScroll();
  const imageY = useTransform(scrollY, [0, 760], [0, 96]);

  return (
    <section className="dark-band relative isolate flex min-h-[720px] overflow-hidden text-white lg:min-h-[780px]">
      <motion.div style={{ y: imageY }} className="absolute inset-0 -z-20">
        <Image
          src="https://images.unsplash.com/photo-1630409346824-4f0e7b080087?auto=format&fit=crop&w=2000&q=88"
          alt="Freshly prepared Indian tiffin meal served in a steel bowl"
          fill
          priority
          className="object-cover object-[62%_center]"
          sizes="100vw"
        />
      </motion.div>
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(6,6,5,0.96)_0%,rgba(6,6,5,0.8)_39%,rgba(6,6,5,0.31)_72%,rgba(6,6,5,0.48)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-[42%] bg-gradient-to-t from-black/88 via-black/34 to-transparent" />
      <div className="absolute inset-x-0 top-0 -z-10 h-36 bg-gradient-to-b from-black/64 to-transparent" />

      <div className="section-shell flex w-full flex-col justify-center pb-16 pt-36 lg:pt-40">
        <motion.div
          initial="hidden"
          animate="show"
          transition={{ staggerChildren: 0.11, delayChildren: 0.04 }}
          className="max-w-2xl"
        >
          <motion.p
            variants={reveal}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className="mb-7 flex items-center gap-3 text-[11px] font-extrabold uppercase tracking-[0.18em] text-white/76"
          >
            <span className="h-px w-9 bg-saffron" />
            Fresh. Healthy. Homemade.
          </motion.p>
          <AnimatedTitle />
          <motion.p
            variants={reveal}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="mt-7 max-w-xl text-base font-medium leading-7 text-white/78 sm:text-lg sm:leading-8"
          >
            Honest Indian food, cooked fresh each day and delivered in the comforting rhythm of a proper tiffin.
          </motion.p>
          <motion.div
            variants={reveal}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="mt-9 flex flex-wrap items-center gap-4"
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
    </section>
  );
}
