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
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.6, ease: [0.25, 1, 0.5, 1], delay }}
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
    transition: { staggerChildren: 0.07 },
  },
};

/** Per-child reveal: a short lift, nothing theatrical. Pair with `staggerContainer`. */
export const revealChild = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.25, 1, 0.5, 1] as const },
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
