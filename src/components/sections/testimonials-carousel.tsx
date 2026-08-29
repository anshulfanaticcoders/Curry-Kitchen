"use client";

import { motion } from "framer-motion";
import { Quote, Star } from "lucide-react";
import { useState } from "react";
import type { Testimonial } from "@/lib/server/catalog";

function ratingStars(rating: Testimonial["rating"]) {
  return Math.min(5, Math.max(1, Math.round(Number(rating) || 5)));
}

export function TestimonialsCarousel({ items }: { items: Testimonial[] }) {
  const [paused, setPaused] = useState(false);

  if (!items.length) return null;

  const marqueeItems = [...items, ...items];

  return (
    <section id="reviews" className="section texture overflow-hidden bg-[#f8f0e7] text-ink">
      <div className="section-shell">
        <div className="max-w-2xl">
          <p className="mb-6 flex items-center gap-3 text-[11px] font-extrabold uppercase tracking-[0.2em] text-masala">
            <span className="h-px w-9 bg-saffron" />
            Loved in San Diego
          </p>
          <h2 className="font-display text-4xl font-black leading-[1.08] sm:text-5xl">
            People who miss <span className="text-saffron">Ghar Ka Khana.</span>
          </h2>
        </div>
        <div
          className="relative mt-12 overflow-hidden"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
        >
        <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-[#f8f0e7] to-transparent sm:w-24" />
        <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-[#f8f0e7] to-transparent sm:w-24" />
        <div
          className="flex w-max gap-5 pr-5 [animation:testimonial-marquee_44s_linear_infinite] hover:[animation-play-state:paused]"
          style={{ animationPlayState: paused ? "paused" : "running" }}
          role="list"
          aria-label="Customer reviews"
        >
          {marqueeItems.map((item, index) => {
            const duplicate = index >= items.length;
            const stars = ratingStars(item.rating);

            return (
              <motion.article
                key={`${item.name}-${item.area}-${index}`}
                role="listitem"
                aria-hidden={duplicate}
                tabIndex={duplicate ? -1 : 0}
                whileHover={{ y: -6 }}
                transition={{ type: "spring", stiffness: 340, damping: 26 }}
                className="w-[min(84vw,25rem)] shrink-0 rounded-lg border border-ink/10 bg-white p-6 shadow-[0_12px_28px_rgba(43,24,13,0.07)] outline-none transition-shadow duration-300 hover:shadow-[0_20px_44px_rgba(43,24,13,0.13)] focus-visible:ring-2 focus-visible:ring-saffron sm:w-[25rem]"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex gap-1 text-saffron" aria-label={`${stars} star rating`}>
                    {Array.from({ length: stars }).map((_, starIndex) => (
                      <Star key={starIndex} size={15} fill="currentColor" aria-hidden />
                    ))}
                  </div>
                  <Quote size={22} strokeWidth={1.5} className="text-saffron/50" aria-hidden />
                </div>
                <blockquote className="mt-6 text-lg font-semibold leading-8 text-ink/82">&quot;{item.quote}&quot;</blockquote>
                <footer className="mt-7 border-t border-ink/10 pt-4">
                  <p className="font-display text-lg font-black">{item.name}</p>
                  <p className="mt-1 text-sm font-semibold text-ink/55">
                    {item.role} <span aria-hidden>-</span> {item.area}
                  </p>
                </footer>
              </motion.article>
            );
          })}
        </div>
        </div>
      </div>
    </section>
  );
}
