"use client";

import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, CalendarDays, ChefHat, Clock, MapPin, Sparkles, Truck } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";

const heroReveal = {
  hidden: { opacity: 0.72, y: 36, filter: "blur(12px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)" },
};

const titleChar = {
  hidden: { opacity: 0, y: 48, filter: "blur(8px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
  },
};

function AnimatedTitle() {
  const curry = "Curry".split("");
  const kitchen = "Kitchen".split("");

  return (
    <motion.h1
      variants={heroReveal}
      transition={{ duration: 0.95, ease: [0.16, 1, 0.3, 1], staggerChildren: 0.05, delayChildren: 0.2 }}
      className="flex flex-nowrap whitespace-nowrap font-display text-5xl font-black leading-[1.1] tracking-tight sm:text-6xl md:text-7xl"
    >
      {curry.map((char, i) => (
        <motion.span key={`c-${i}`} variants={titleChar} className="inline-block">
          {char}
        </motion.span>
      ))}
      <span className="inline-block w-[0.28em]" aria-hidden />
      {kitchen.map((char, i) =>
        char === "h" ? (
          <span key={`k-${i}`} className="relative inline-block">
            <motion.span variants={titleChar} className="inline-block">
              {char}
            </motion.span>
            <motion.span
              aria-hidden
              className="pointer-events-none absolute -top-[0.5em] left-1/2 -translate-x-1/2 text-saffron"
              initial={{ y: -28, opacity: 0, rotate: -16 }}
              animate={{ y: 0, opacity: 1, rotate: 0 }}
              transition={{ delay: 1.05, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              <motion.span
                className="block"
                animate={{ y: [0, -5, 0], rotate: [0, -3, 0] }}
                transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut", delay: 1.9 }}
              >
                <ChefHat className="h-[0.62em] w-[0.62em]" strokeWidth={2.1} />
              </motion.span>
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
  const y = useTransform(scrollY, [0, 600], [0, 120]);

  return (
    <section className="dark-band relative isolate min-h-screen overflow-hidden">
      <motion.div style={{ y }} className="absolute inset-0 -z-10">
        <Image
          src="https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=1800&q=80"
          alt="Colorful Indian thali with curry, rice, and flatbread"
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
      </motion.div>
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/92 via-black/66 to-black/24" />
      <div className="absolute inset-x-0 top-0 -z-10 h-52 bg-gradient-to-b from-black/88 via-black/52 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-56 bg-gradient-to-t from-black/82 via-black/32 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-saffron to-transparent" />

      <div className="section-shell flex min-h-screen items-center pb-40 pt-28">
        <motion.div
          initial="hidden"
          animate="show"
          transition={{ staggerChildren: 0.12, delayChildren: 0.1 }}
          className="max-w-3xl text-white"
        >
          <motion.p
            variants={heroReveal}
            transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.24em] backdrop-blur-md"
          >
            <Sparkles size={15} className="text-saffron" />
            Homemade tiffin delivery
          </motion.p>
          <AnimatedTitle />
          <motion.p
            variants={heroReveal}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 max-w-2xl text-lg font-medium leading-8 text-white/82 md:text-xl"
          >
            Fresh Indian meals cooked daily, packed with care, and delivered across California
            for students, families, and busy professionals.
          </motion.p>
          <motion.div
            variants={heroReveal}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="mt-8 flex flex-col gap-3 sm:flex-row"
          >
            <ButtonLink href="/packages">
              View packages
              <ArrowRight size={18} />
            </ButtonLink>
            <ButtonLink href="/menu" variant="secondary" className="border-white/25 bg-white/10 text-white hover:bg-white hover:text-ink">
              <CalendarDays size={18} />
              This week menu
            </ButtonLink>
          </motion.div>
          <motion.div
            variants={heroReveal}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="mt-9 flex flex-wrap gap-3 text-sm font-extrabold text-white/78"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-4 py-2">
              <MapPin size={16} />
              Fremont, San Jose, Milpitas
            </span>
            <span className="rounded-full border border-white/14 bg-white/10 px-4 py-2">
              Monday to Friday delivery
            </span>
          </motion.div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0.78, y: 34, scale: 0.98, filter: "blur(12px)" }}
        animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.95, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="absolute bottom-7 left-0 right-0 hidden lg:block"
      >
        <div className="section-shell grid grid-cols-[1fr_1fr_1fr_auto] overflow-hidden rounded-full border border-white/16 bg-white/12 p-2 text-white shadow-[0_24px_80px_rgba(0,0,0,0.38)] backdrop-blur-xl">
          {[
            { icon: MapPin, label: "Delivery area", value: "California Bay Area" },
            { icon: Clock, label: "Dinner window", value: "6:00 PM - 8:00 PM" },
            { icon: Truck, label: "Weekly rhythm", value: "Monday to Friday" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-4 border-r border-white/12 px-5 py-3 last:border-r-0">
              <span className="grid size-11 place-items-center rounded-full bg-black/36 text-saffron">
                <item.icon size={19} />
              </span>
              <span>
                <span className="block text-xs font-extrabold uppercase tracking-[0.18em] text-white/48">
                  {item.label}
                </span>
                <span className="mt-1 block font-display text-xl font-black">{item.value}</span>
              </span>
            </div>
          ))}
          <ButtonLink href="/checkout" className="h-auto rounded-full px-7">
            Build order
            <ArrowRight size={18} />
          </ButtonLink>
        </div>
      </motion.div>
    </section>
  );
}
