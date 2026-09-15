"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, CalendarDays, ChefHat, CirclePlay, Clock3, MapPin, Sun, Utensils, Circle, Cylinder } from "lucide-react";
import { PiCookingPotLight } from "react-icons/pi";
import { ButtonLink } from "@/components/ui/button";
import type { PageBackgroundVisual } from "@/lib/page-backgrounds";
import styles from "./hero-section.module.css";

const reveal = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };
const promises = [
  ["Cooked fresh each morning", "Nothing sits overnight. Your dabba is made the day it reaches you."],
  ["A proper home-style meal", "Roti, sabzi, dal, rice, and a fresh side — the dinner you grew up with."],
  ["Packed with care", "Generous portions in a real tiffin, sealed warm and ready to open."],
] as const;

function PromiseIcon({ index }: { index: number }) {
  return (
    <span className={styles.promiseIcon} aria-hidden="true">
      <span className={styles.promiseIconArt}>
      {index === 0 ? <>
        <Sun className={styles.sun} strokeWidth={1.5} />
        <PiCookingPotLight className={styles.pot} />
      </> : index === 1 ? <>
        <Utensils className={styles.fork} strokeWidth={1.5} />
        <Utensils className={styles.knife} strokeWidth={1.5} />
        <Circle className={styles.plate} strokeWidth={1.5} />
      </> : <>
        <span className={styles.tiffinHandle} />
        <Cylinder className={styles.tiffin} strokeWidth={1.5} />
        <span className={styles.tiffinDivider} />
      </>}
      </span>
    </span>
  );
}

export type HeroFacts = { deliveryDays: string; deliveryWindow: string; serviceAreas: string };

export function HeroSection({ background, facts }: { background: PageBackgroundVisual; facts: HeroFacts }) {
  const reducedMotion = useReducedMotion();
  const fadeIn = {
    initial: reducedMotion ? false as const : "hidden",
    animate: "show",
    variants: reveal,
    transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] as const },
  };

  return (
    <section aria-label="Curry Kitchen" className={styles.hero}>
      {/* eslint-disable-next-line @next/next/no-img-element -- admin-managed image with unrestricted secure hosts. */}
      <img src={background.imageUrl} alt="North Indian vegetarian thali with roti, rice, dal, rajma, vegetables and salad"
        className={styles.background} style={{ objectPosition: `${background.focalPoint.toLowerCase()} center` }} fetchPriority="high" />
      <div aria-hidden="true" className={styles.overlay} data-level={background.overlay} />
      <div className={styles.lead}>
        <motion.div {...fadeIn} className={styles.intro}>
          <h1 aria-label="Curry Kitchen" className={styles.title}>
            <span aria-hidden="true">Curry K<span className={styles.letterI}>ı
              <motion.span className={styles.hat} animate={{ y: reducedMotion ? 0 : [0, -4, 0] }}
                transition={{ duration: 3, ease: "easeInOut", repeat: Infinity }}>
                <ChefHat strokeWidth={2} />
              </motion.span>
            </span>tchen</span>
          </h1>
          <p className={styles.description}>Honest Indian food, cooked fresh each day and delivered in the comforting rhythm of a proper tiffin.</p>
          <div className={styles.actions}>
            <ButtonLink href="/packages" className={styles.orderButton}>Order now <ArrowRight size={19} /></ButtonLink>
            <ButtonLink href="/about" variant="secondary" className={styles.storyButton}><CirclePlay size={22} />Our story</ButtonLink>
          </div>
        </motion.div>
      </div>
      <div className={styles.promiseBand}>
        <div className={styles.container}>
          <p className={styles.promiseLabel}>The Curry Kitchen promise</p>
          <ul className={styles.promises}>
            {promises.map(([title, copy], index) => (
              <motion.li key={title} {...fadeIn} transition={{ ...fadeIn.transition, delay: reducedMotion ? 0 : 0.15 + index * 0.08 }}>
                <PromiseIcon index={index} />
                <h2>{title}</h2><p>{copy}</p>
              </motion.li>
            ))}
          </ul>
        </div>
      </div>
      <div className={styles.factsBand}>
        <dl className={`${styles.container} ${styles.facts}`}>
          {[
            { Icon: CalendarDays, label: "Delivery days", value: facts.deliveryDays },
            { Icon: Clock3, label: "Delivery window", value: facts.deliveryWindow },
            { Icon: MapPin, label: "Serving", value: facts.serviceAreas },
          ].map(({ Icon, label, value }) => (
            <div key={label} className={styles.fact}>
              <span className={styles.factIcon} aria-hidden="true"><Icon size={23} strokeWidth={1.8} /></span>
              <div><dt>{label}</dt><dd>{value}</dd></div>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
