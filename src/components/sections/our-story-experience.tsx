"use client";

import Image from "next/image";
import { motion, useReducedMotion, useScroll, useTransform, type Transition } from "framer-motion";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  HeartHandshake,
  MapPin,
  PackageCheck,
  Salad,
  ShieldCheck,
  Sparkles,
  Sprout,
  Truck,
  Utensils,
} from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const easeOut: Transition["ease"] = [0.16, 1, 0.3, 1];

const storyBeats = [
  {
    icon: HeartHandshake,
    label: "Family recipes",
    title: "Flavor remembered",
    copy: "Recipes come from the kind of cooking learned at home, passed through grandparents and parents.",
  },
  {
    icon: Sprout,
    label: "Fresh market rhythm",
    title: "Vegetables weekly",
    copy: "Fresh vegetables come in every week so the menu can rotate with real variety through the month.",
  },
  {
    icon: Utensils,
    label: "Morning prep",
    title: "Cooked with care",
    copy: "Meals are prepared fresh in small batches, then packed around dal, sabzi, roti, rice, and salad.",
  },
  {
    icon: Truck,
    label: "Dinner delivery",
    title: "Reliable evenings",
    copy: "Packages are built for students, families, and busy professionals who need dinner to arrive on time.",
  },
];

const differences = [
  "Daily fresh and hygienic meals",
  "Authentic Indian taste",
  "On-time delivery across San Diego zones",
  "Weekly, monthly, and student tiffin plans",
  "Vegetarian and customizable options",
];

const proofStats = [
  { value: "5", label: "weekday delivery rhythm" },
  { value: "20", label: "monthly meal days by default" },
  { value: "1", label: "pause built into customer packages" },
];

function FloatingIngredient({
  children,
  className,
  delay,
}: {
  children: string;
  className: string;
  delay: number;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.span
      initial={{ opacity: 0, y: reduceMotion ? 0 : 18, scale: 0.92 }}
      animate={{
        opacity: 1,
        y: reduceMotion ? 0 : [0, -12, 0],
        rotate: reduceMotion ? 0 : [0, 2, -1, 0],
        scale: 1,
      }}
      transition={{
        opacity: { duration: 0.5, delay },
        scale: { duration: 0.5, delay },
        y: { duration: 4.8, repeat: Infinity, ease: "easeInOut", delay },
        rotate: { duration: 5.4, repeat: Infinity, ease: "easeInOut", delay },
      }}
      className={cn(
        "absolute z-20 rounded-full border border-white/14 bg-white/12 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-white shadow-[0_18px_46px_rgba(0,0,0,0.22)] backdrop-blur-xl",
        className,
      )}
    >
      {children}
    </motion.span>
  );
}

function StoryTitle() {
  const words = ["A", "kitchen", "with", "memory,", "motion,", "and", "morning", "freshness."];

  return (
    <motion.h1
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.065, delayChildren: 0.12 } },
      }}
      className="max-w-5xl font-display text-[clamp(3.1rem,8vw,5.9rem)] font-black leading-[1.04] text-white"
    >
      {words.map((word) => (
        <motion.span
          key={word}
          variants={{
            hidden: { opacity: 0, y: 40, filter: "blur(12px)" },
            show: {
              opacity: 1,
              y: 0,
              filter: "blur(0px)",
              transition: { duration: 0.72, ease: easeOut },
            },
          }}
          className="mr-[0.26em] inline-block"
        >
          {word}
        </motion.span>
      ))}
    </motion.h1>
  );
}

function AnimatedThali() {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.84, rotate: -4, filter: "blur(16px)" }}
      whileInView={{ opacity: 1, scale: 1, rotate: 0, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.45 }}
      transition={{ duration: 1.1, ease: easeOut }}
      className="relative mx-auto grid aspect-square w-full max-w-[520px] place-items-center"
    >
      <motion.div
        aria-hidden
        animate={reduceMotion ? undefined : { rotate: 360 }}
        transition={{ duration: 34, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 rounded-full border border-dashed border-saffron/45"
      />
      <motion.div
        aria-hidden
        animate={reduceMotion ? undefined : { rotate: -360 }}
        transition={{ duration: 48, repeat: Infinity, ease: "linear" }}
        className="absolute inset-8 rounded-full border border-white/12"
      />

      <svg
        viewBox="0 0 420 420"
        role="img"
        aria-label="Animated Curry Kitchen thali illustration"
        className="relative z-10 h-full w-full drop-shadow-[0_34px_70px_rgba(0,0,0,0.34)]"
      >
        <defs>
          <radialGradient id="plateGlow" cx="50%" cy="42%" r="62%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="58%" stopColor="#fff3e6" />
            <stop offset="100%" stopColor="#f6c49a" />
          </radialGradient>
          <linearGradient id="routeStroke" x1="0" x2="1" y1="0" y2="1">
            <stop stopColor="#ff7a1a" />
            <stop offset="0.52" stopColor="#ffffff" />
            <stop offset="1" stopColor="#ff7a1a" />
          </linearGradient>
        </defs>

        <motion.path
          d="M72 260 C28 174 94 73 205 68 C321 63 390 159 350 253 C318 329 219 371 126 323"
          fill="none"
          stroke="url(#routeStroke)"
          strokeLinecap="round"
          strokeWidth="4"
          initial={{ pathLength: 0, opacity: 0 }}
          whileInView={{ pathLength: 1, opacity: 1 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: reduceMotion ? 0.2 : 1.7, ease: easeOut, delay: 0.25 }}
        />
        {[72, 205, 350, 126].map((cx, index) => (
          <motion.circle
            key={cx}
            cx={cx}
            cy={[260, 68, 253, 323][index]}
            r="8"
            fill={index % 2 === 0 ? "#ff7a1a" : "#ffffff"}
            initial={{ scale: 0, opacity: 0 }}
            whileInView={{ scale: [0, 1.25, 1], opacity: 1 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.58, ease: easeOut, delay: 0.75 + index * 0.12 }}
          />
        ))}

        <circle cx="210" cy="218" r="122" fill="url(#plateGlow)" />
        <circle cx="210" cy="218" r="96" fill="none" stroke="#211711" strokeOpacity="0.12" strokeWidth="2" />
        <circle cx="168" cy="187" r="36" fill="#f49b2f" />
        <circle cx="168" cy="187" r="23" fill="#ca4a13" opacity="0.82" />
        <circle cx="254" cy="183" r="34" fill="#1f7a41" />
        <circle cx="252" cy="181" r="20" fill="#68b06a" opacity="0.88" />
        <circle cx="176" cy="263" r="32" fill="#f1d39a" />
        <path d="M158 263 C171 251 186 251 198 263 C186 276 171 276 158 263Z" fill="#d7a960" />
        <circle cx="257" cy="261" r="36" fill="#ffffff" />
        <path d="M235 260 C247 250 267 250 279 262 C267 275 247 275 235 260Z" fill="#e7e0d2" />
        <motion.path
          d="M213 114 C205 94 220 86 210 69"
          fill="none"
          stroke="#ffffff"
          strokeLinecap="round"
          strokeWidth="5"
          opacity="0.65"
          animate={reduceMotion ? undefined : { y: [0, -7, 0], opacity: [0.32, 0.75, 0.32] }}
          transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.path
          d="M241 119 C235 98 255 91 244 73"
          fill="none"
          stroke="#ffffff"
          strokeLinecap="round"
          strokeWidth="5"
          opacity="0.55"
          animate={reduceMotion ? undefined : { y: [0, -9, 0], opacity: [0.24, 0.66, 0.24] }}
          transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
        />
        <motion.path
          d="M184 121 C175 101 193 94 183 78"
          fill="none"
          stroke="#ffffff"
          strokeLinecap="round"
          strokeWidth="5"
          opacity="0.5"
          animate={reduceMotion ? undefined : { y: [0, -8, 0], opacity: [0.22, 0.58, 0.22] }}
          transition={{ duration: 4.7, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
        />
      </svg>
    </motion.div>
  );
}

function RouteCard({
  beat,
  index,
}: {
  beat: (typeof storyBeats)[number];
  index: number;
}) {
  const Icon = beat.icon;

  return (
    <motion.article
      initial={{ opacity: 0, y: 32, filter: "blur(10px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.72, ease: easeOut, delay: index * 0.08 }}
      className="group relative overflow-hidden rounded-lg border border-white/12 bg-white/[0.055] p-5 text-white shadow-[0_22px_70px_rgba(0,0,0,0.22)] transition duration-500 hover:-translate-y-1 hover:border-saffron/60 hover:bg-white/[0.08]"
    >
      <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-saffron/80 to-transparent opacity-0 transition duration-500 group-hover:opacity-100" />
      <div className="flex items-start justify-between gap-4">
        <span className="grid size-11 place-items-center rounded-button bg-saffron text-ink">
          <Icon size={20} />
        </span>
        <span className="font-display text-3xl font-black text-white/12">
          {String(index + 1).padStart(2, "0")}
        </span>
      </div>
      <p className="mt-5 text-xs font-black uppercase tracking-[0.16em] text-saffron">{beat.label}</p>
      <h3 className="mt-2 font-display text-2xl font-black leading-tight">{beat.title}</h3>
      <p className="mt-3 text-sm font-medium leading-6 text-white/66">{beat.copy}</p>
    </motion.article>
  );
}

function StoryHero() {
  const reduceMotion = useReducedMotion();
  const { scrollY } = useScroll();
  const imageY = useTransform(scrollY, [0, 700], [0, reduceMotion ? 0 : 105]);
  const titleY = useTransform(scrollY, [0, 700], [0, reduceMotion ? 0 : -34]);

  return (
    <section className="dark-band relative isolate min-h-screen overflow-hidden">
      <motion.div style={{ y: imageY }} className="absolute inset-0 -z-20">
        <Image
          src="https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=1900&q=82"
          alt="Fresh food being prepared in a warm kitchen"
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
      </motion.div>
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_68%_22%,rgba(255,122,26,0.28),transparent_30%),linear-gradient(90deg,rgba(0,0,0,0.96)_0%,rgba(0,0,0,0.78)_47%,rgba(0,0,0,0.4)_100%)]" />
      <div className="absolute inset-x-0 top-0 -z-10 h-56 bg-gradient-to-b from-black/88 to-transparent" />
      <FloatingIngredient className="left-[8%] top-[24%]" delay={0.9}>
        Fresh every morning
      </FloatingIngredient>
      <FloatingIngredient className="right-[8%] top-[34%] hidden lg:inline-flex" delay={1.2}>
        MEHKO guided
      </FloatingIngredient>
      <FloatingIngredient className="bottom-[18%] right-[16%] hidden md:inline-flex" delay={1.45}>
        San Diego delivery
      </FloatingIngredient>

      <div className="section-shell flex min-h-screen items-center pb-20 pt-32">
        <motion.div style={{ y: titleY }} className="max-w-5xl">
          <motion.p
            initial={{ opacity: 0, y: 18, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.72, ease: easeOut }}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-white backdrop-blur-xl"
          >
            <Sparkles size={15} className="text-saffron" />
            Our story
          </motion.p>
          <StoryTitle />
          <motion.p
            initial={{ opacity: 0, y: 24, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.82, ease: easeOut, delay: 0.64 }}
            className="mt-7 max-w-3xl text-lg font-bold leading-8 text-white/78 md:text-xl"
          >
            Curry Kitchen began as a home-based kitchen near San Diego, built around
            family recipes, fresh vegetables, and the simple promise that weekday food should still
            feel personal.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 24, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.82, ease: easeOut, delay: 0.78 }}
            className="mt-8 flex flex-col gap-3 sm:flex-row"
          >
            <ButtonLink href="/packages">
              View packages
              <ArrowRight size={18} />
            </ButtonLink>
            <ButtonLink
              href="/menu"
              variant="secondary"
              className="border-white/20 bg-white/10 text-white hover:bg-white hover:text-ink"
            >
              <CalendarDays size={18} />
              This week menu
            </ButtonLink>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

export function OurStoryExperience() {
  return (
    <main className="overflow-hidden bg-white text-ink">
      <StoryHero />

      <section className="relative bg-white py-20 lg:py-28">
        <div className="section-shell grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <motion.div
            initial={{ opacity: 0, x: -40, filter: "blur(12px)" }}
            whileInView={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.8, ease: easeOut }}
          >
            <p className="inline-flex rounded-full bg-ink px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-saffron">
              Story of our kitchen
            </p>
            <h2 className="mt-5 max-w-2xl font-display text-[clamp(2.2rem,5vw,4.25rem)] font-black leading-[1.06]">
              Not restaurant food. Not meal-kit food. Real food with a route.
            </h2>
            <p className="mt-6 max-w-xl text-base font-bold leading-8 text-ink/66">
              The old Curry Kitchen story is simple and strong: a home kitchen, MEHKO-guided care,
              recipes passed down through family, fresh vegetables every week, and new meal
              combinations so dinner does not feel repeated.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40, scale: 0.96, filter: "blur(14px)" }}
            whileInView={{ opacity: 1, x: 0, scale: 1, filter: "blur(0px)" }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.9, ease: easeOut }}
            className="relative min-h-[520px] overflow-hidden rounded-lg bg-ink p-4 text-white shadow-[0_34px_90px_rgba(7,7,7,0.22)]"
          >
            <Image
              src="https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=1300&q=82"
              alt="Indian snacks and chutney prepared for a family meal"
              fill
              className="object-cover opacity-[0.58]"
              sizes="(min-width: 1024px) 50vw, 100vw"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,7,7,0.1),rgba(7,7,7,0.82)),radial-gradient(circle_at_20%_10%,rgba(255,122,26,0.34),transparent_34%)]" />
            <div className="relative z-10 flex h-full min-h-[488px] flex-col justify-end rounded-lg border border-white/14 p-6">
              <p className="max-w-sm font-display text-4xl font-black leading-tight">
                Fresh vegetables, rotating meals, family memory.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {proofStats.map((stat) => (
                  <div key={stat.label} className="rounded-lg border border-white/12 bg-white/10 p-4 backdrop-blur-md">
                    <p className="font-display text-3xl font-black text-saffron">{stat.value}</p>
                    <p className="mt-1 text-xs font-black uppercase tracking-[0.12em] text-white/64">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="dark-band relative py-20 text-white lg:py-28">
        <div className="pointer-events-none absolute inset-0 opacity-50 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.09)_1px,transparent_0)] [background-size:22px_22px]" />
        <div className="section-shell relative">
          <motion.div
            initial={{ opacity: 0, y: 28, filter: "blur(10px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.8, ease: easeOut }}
            className="mx-auto max-w-3xl text-center"
          >
            <p className="inline-flex rounded-full border border-white/14 bg-white/8 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-saffron">
              Main attraction
            </p>
            <h2 className="mt-5 font-display text-[clamp(2.35rem,5vw,4.7rem)] font-black leading-[1.05]">
              From morning prep to dinner at your door.
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base font-bold leading-8 text-white/64">
              This animated route is the heart of the page: the meal moves from family recipe to
              fresh prep, then into a packed tiffin and across San Diego delivery zones.
            </p>
          </motion.div>

          <div className="mt-14 grid items-center gap-8 lg:grid-cols-[0.9fr_1.2fr_0.9fr]">
            <div className="grid gap-5">
              {storyBeats.slice(0, 2).map((beat, index) => (
                <RouteCard key={beat.title} beat={beat} index={index} />
              ))}
            </div>

            <AnimatedThali />

            <div className="grid gap-5">
              {storyBeats.slice(2).map((beat, index) => (
                <RouteCard key={beat.title} beat={beat} index={index + 2} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative bg-rose py-20 lg:py-28">
        <div className="section-shell grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <motion.div
            initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.82, ease: easeOut }}
          >
            <h2 className="max-w-2xl font-display text-[clamp(2.1rem,4.8vw,4.4rem)] font-black leading-[1.06]">
              What makes the service feel different.
            </h2>
            <p className="mt-5 max-w-xl text-base font-bold leading-8 text-ink/66">
              The promise is not just food. It is predictability, customization, and a meal plan
              that understands real schedules.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 38, filter: "blur(12px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.84, ease: easeOut }}
            className="rounded-lg border border-ink/10 bg-white p-4 shadow-[0_28px_80px_rgba(33,23,17,0.12)]"
          >
            <div className="overflow-hidden rounded-lg bg-ink">
              {differences.map((item, index) => (
                <motion.div
                  key={item}
                  initial={{ opacity: 0, x: 26 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.8 }}
                  transition={{ duration: 0.58, ease: easeOut, delay: index * 0.05 }}
                  className="flex items-center gap-4 border-b border-white/10 px-5 py-4 last:border-b-0"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-saffron text-ink">
                    <CheckCircle2 size={18} />
                  </span>
                  <span className="text-sm font-black text-white md:text-base">{item}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <section className="relative bg-white py-20 lg:py-28">
        <div className="section-shell">
          <div className="grid overflow-hidden rounded-lg border border-ink/10 bg-ink text-white shadow-[0_34px_95px_rgba(7,7,7,0.2)] lg:grid-cols-[0.92fr_1.08fr]">
            <motion.div
              initial={{ opacity: 0, scale: 1.05 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 1, ease: easeOut }}
              className="relative min-h-[420px]"
            >
              <Image
                src="https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=1300&q=82"
                alt="Fresh herbs and Indian meal ingredients arranged for cooking"
                fill
                className="object-cover"
                sizes="(min-width: 1024px) 45vw, 100vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/78 via-black/18 to-transparent" />
            </motion.div>

            <div className="relative p-8 md:p-12 lg:p-14">
              <div className="pointer-events-none absolute right-8 top-8 text-saffron/18">
                <Salad size={96} />
              </div>
              <motion.div
                initial={{ opacity: 0, y: 28, filter: "blur(10px)" }}
                whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                viewport={{ once: true, amount: 0.35 }}
                transition={{ duration: 0.8, ease: easeOut }}
                className="relative z-10 max-w-xl"
              >
                <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-saffron">
                  <ShieldCheck size={15} />
                  Built for trust
                </p>
                <h2 className="mt-5 font-display text-[clamp(2.15rem,4.6vw,4.35rem)] font-black leading-[1.07]">
                  Premium, but still personal.
                </h2>
                <p className="mt-5 text-base font-bold leading-8 text-white/68">
                  The new website should make customers feel the same care before checkout that
                  Curry Kitchen puts into every package: clear pricing, delivery zones, student
                  verification, pause rules, and simple reordering from the dashboard.
                </p>
                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  {[
                    { icon: PackageCheck, text: "Flexible package ordering" },
                    { icon: Clock, text: "Pause support when life changes" },
                    { icon: MapPin, text: "Zone-based delivery clarity" },
                    { icon: Utensils, text: "Add-ons for appetite" },
                  ].map((item) => (
                    <div key={item.text} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.055] p-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-button bg-saffron text-ink">
                        <item.icon size={17} />
                      </span>
                      <span className="text-sm font-black text-white/78">{item.text}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                  <ButtonLink href="/packages">
                    Build a package
                    <ArrowRight size={18} />
                  </ButtonLink>
                  <ButtonLink
                    href="/contact"
                    variant="secondary"
                    className="border-white/18 bg-white/10 text-white hover:bg-white hover:text-ink"
                  >
                    Ask a question
                  </ButtonLink>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
