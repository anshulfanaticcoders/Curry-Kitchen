"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type AnimatedSectionProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  id?: string;
};

export function AnimatedSection({ children, className, delay = 0, id }: AnimatedSectionProps) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0.82, y: 38, scale: 0.985, filter: "blur(10px)" }}
      whileInView={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.18 }}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay }}
      className={cn("section-shell", className)}
    >
      {children}
    </motion.section>
  );
}

/** Stagger container: children with `revealChild` variants animate in sequence. */
export const staggerContainer = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.1, delayChildren: 0.05 },
  },
};

/** Per-child reveal: opacity + lift + blur. Pair with `staggerContainer`. */
export const revealChild = {
  hidden: { opacity: 0, y: 26, filter: "blur(8px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const },
  },
};

/** Motion-wrapped container that triggers stagger on scroll into view. */
export function StaggerGroup({ children, className, id }: AnimatedSectionProps) {
  return (
    <motion.div
      id={id}
      variants={staggerContainer}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

type RevealItemProps = AnimatedSectionProps & {
  /** Render element. Defaults to a div. */
  as?: "div" | "article" | "li" | "p" | "h2";
};

/** Single staggered child. Must live inside a `StaggerGroup`. */
export function RevealItem({ children, className, as = "div" }: RevealItemProps) {
  const MotionTag = motion[as];
  return (
    <MotionTag variants={revealChild} className={className}>
      {children}
    </MotionTag>
  );
}
