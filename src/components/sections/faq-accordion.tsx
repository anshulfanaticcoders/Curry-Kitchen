"use client";

import { AnimatePresence, motion, type Transition } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";
import { cn } from "@/lib/utils";

type FaqItem = {
  question: string;
  answer: string;
};

type FaqAccordionProps = {
  items: FaqItem[];
  className?: string;
};

const panelTransition: Transition = {
  duration: 0.42,
  ease: [0.22, 1, 0.36, 1],
};

export function FaqAccordion({ items, className }: FaqAccordionProps) {
  const baseId = useId();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className={cn("grid gap-3", className)}>
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        const buttonId = `${baseId}-faq-button-${index}`;
        const panelId = `${baseId}-faq-panel-${index}`;

        return (
          <div
            key={item.question}
            className={cn(
              "overflow-hidden rounded-lg border transition-[background-color,border-color,box-shadow] duration-300",
              isOpen
                ? "border-saffron/70 bg-white shadow-[0_18px_45px_rgba(33,23,17,0.1)]"
                : "border-ink/10 bg-rose/35 hover:border-masala/25 hover:bg-white",
            )}
          >
            <button
              id={buttonId}
              type="button"
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => setOpenIndex(isOpen ? null : index)}
              className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left"
            >
              <span className="text-sm font-black leading-6 text-ink">{item.question}</span>
              <span
                className={cn(
                  "grid size-8 shrink-0 place-items-center rounded-full transition-[background-color,color,box-shadow] duration-300",
                  isOpen
                    ? "bg-saffron text-ink"
                    : "bg-white text-masala shadow-[inset_0_0_0_1px_rgba(33,23,17,0.08)]",
                )}
              >
                <ChevronDown
                  size={17}
                  className={cn("transition-transform duration-300 ease-out", isOpen && "rotate-180")}
                />
              </span>
            </button>

            <AnimatePresence initial={false}>
              {isOpen ? (
                <motion.div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={panelTransition}
                  className="overflow-hidden"
                >
                  <motion.p
                    initial={{ y: -6 }}
                    animate={{ y: 0 }}
                    exit={{ y: -4 }}
                    transition={panelTransition}
                    className="px-4 pb-4 pt-0 text-sm font-medium leading-6 text-ink/64"
                  >
                    {item.answer}
                  </motion.p>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
