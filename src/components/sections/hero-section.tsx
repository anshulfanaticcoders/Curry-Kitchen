"use client";

import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, CalendarDays, ChefHat, Clock, MapPin, Truck } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";

const heroReveal = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0 },
};

const titleChar = {
  hidden: { opacity: 0, y: 30 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.25, 1, 0.5, 1] as const },
  },
};

function AnimatedTitle() {
  const curry = "Curry".split("");
  const kitchen = "Kitchen".split("");

  return (
    <motion.h1
      variants={heroReveal}
      transition={{ duration: 0.8, ease: [0.25, 1, 0.5, 1], staggerChildren: 0.04, delayChildren: 0.15 }}
      className="flex flex-nowrap whitespace-nowrap font-display text-5xl font-black leading-[1.12] tracking-tight sm:text-6xl md:text-7xl"
    >
      {curry.map((char, i) => (
        <motion.span key={`c-${i}`} variants={titleChar} className="inline-block">
          {char}
        </motion.span>
      ))}
      <span className="inline-block w-[0.28em]" aria-hidden />
      {kitchen.map((char, i) =>
        char === "i" ? (
          <span key={`k-${i}`} className="relative inline-block">
            <motion.span variants={titleChar} className="inline-block">
              {"ı"}
            </motion.span>
            <motion.span
              aria-hidden
              className="pointer-events-none absolute -top-[0.5em] left-1/2 -translate-x-1/2 text-saffron"
              initial={{ y: -20, opacity: 0, rotate: -12 }}
              animate={{ y: 0, opacity: 1, rotate: 0 }}
              transition={{ delay: 0.9, duration: 0.6, ease: [0.25, 1, 0.5, 1] }}
            >
              <ChefHat className="h-[0.62em] w-[0.62em]" strokeWidth={2.1} />
            </motion.span>
          </span>
        ) : (
          <motion.span key={`k-${i}`} variants={titleChar} className="inline-block">
            {char}
          </motion.span>
        ),
      )}
    </motion.h1>
  );
}

export function HeroSection() {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 600], [0, 90]);

  return (
    <section className="dark-band relative isolate flex min-h-[100svh] flex-col overflow-hidden">
      <motion.div style={{ y }} className="absolute inset-0 -z-10">
        <Image
          src="https://images.unsplash.com/photo-1630409346824-4f0e7b080087?auto=format&fit=crop&w=1800&q=82"
          alt="Nostalgic steel tiffin dabba packed with Indian food"
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
      </motion.div>
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/90 via-black/62 to-black/24" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-52 bg-gradient-to-t from-black/85 via-black/34 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-saffron/70 to-transparent" />

      <div className="section-shell flex flex-1 items-center pb-14 pt-32">
        <motion.div
          initial="hidden"
          animate="show"
          transition={{ staggerChildren: 0.1, delayChildren: 0.05 }}
          className="max-w-3xl text-white"
        >
          <motion.p
            variants={heroReveal}
            transition={{ duration: 0.7, ease: [0.25, 1, 0.5, 1] }}
            className="mb-6 inline-flex items-center gap-2.5 text-sm font-bold text-white/78"
          >
            <MapPin size={16} className="text-saffron" />
            San Diego tiffin delivery
          </motion.p>
          <AnimatedTitle />
          <motion.p
            variants={heroReveal}
            transition={{ duration: 0.75, ease: [0.25, 1, 0.5, 1] }}
            className="mt-7 max-w-xl text-lg font-medium leading-8 text-white/78"
          >
            Fresh Indian meals cooked daily, packed in the spirit of a classic tiffin dabba,
            and delivered across San Diego for students, families, and busy professionals.
          </motion.p>
          <motion.div
            variants={heroReveal}
            transition={{ duration: 0.75, ease: [0.25, 1, 0.5, 1] }}
            className="mt-9 flex flex-col gap-3 sm:flex-row"
          >
            <ButtonLink href="/packages">
              View packages
              <ArrowRight size={18} />
            </ButtonLink>
            <ButtonLink
              href="/menu"
              variant="secondary"
              className="border-white/25 bg-transparent text-white hover:bg-white hover:text-ink"
            >
              <CalendarDays size={18} />
              This week&apos;s menu
            </ButtonLink>
          </motion.div>
        </motion.div>
      </div>

      {/* In-flow strip (not absolute) so it can never overlap the hero copy. */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.75, delay: 0.5, ease: [0.25, 1, 0.5, 1] }}
        className="relative hidden border-t border-white/10 lg:block"
      >
        <div className="section-shell grid grid-cols-3 py-6 text-white">
          {[
            { icon: MapPin, label: "Delivery area", value: "San Diego" },
            { icon: Clock, label: "Delivery", value: "Every morning" },
            { icon: Truck, label: "Weekly rhythm", value: "Monday to Friday" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3.5">
              <item.icon size={18} className="shrink-0 text-saffron" />
              <span>
                <span className="block text-xs font-bold text-white/52">{item.label}</span>
                <span className="mt-0.5 block font-display text-lg font-black">{item.value}</span>
              </span>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
