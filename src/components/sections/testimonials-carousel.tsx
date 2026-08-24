"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Star } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { Testimonial } from "@/lib/server/catalog";
import { cn } from "@/lib/utils";

const reviewImages = [
  "https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=1200&q=84",
  "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=1200&q=84",
  "https://images.unsplash.com/photo-1631452180539-96aca7d48617?auto=format&fit=crop&w=1200&q=84",
  "https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?auto=format&fit=crop&w=1200&q=84",
];

// Fixed fan angles instead of Math.random(): stable across SSR/hydration and re-renders.
const fanRotations = [-9, 7, -5, 10, -7, 5];
const AUTOPLAY_MS = 6000;

export function TestimonialsCarousel({ items }: { items: Testimonial[] }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = items.length;

  const next = useCallback(() => setActive((i) => (i + 1) % count), [count]);
  const prev = useCallback(() => setActive((i) => (i - 1 + count) % count), [count]);

  useEffect(() => {
    if (paused || count < 2) return;
    const id = setInterval(next, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [paused, count, next]);

  if (!count) return null;

  const current = items[active];

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
          className="mt-12 grid gap-12 md:grid-cols-2 md:gap-16 lg:gap-24"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={() => setPaused(false)}
        >
          {/* Fanned image stack */}
          <div className="relative mx-auto h-72 w-full max-w-md sm:h-80 md:h-[420px] md:max-w-none">
            <AnimatePresence>
              {items.map((item, index) => {
                const isActive = index === active;
                const rotate = fanRotations[index % fanRotations.length];
                return (
                  <motion.div
                    key={`${item.name}-${index}`}
                    initial={{ opacity: 0, scale: 0.9, rotate }}
                    animate={{
                      opacity: isActive ? 1 : 0.7,
                      scale: isActive ? 1 : 0.95,
                      rotate: isActive ? 0 : rotate,
                      zIndex: isActive ? 40 : count + 2 - index,
                      y: isActive ? [0, -60, 0] : 0,
                    }}
                    exit={{ opacity: 0, scale: 0.9, rotate }}
                    transition={{ duration: 0.4, ease: "easeInOut" }}
                    className="absolute inset-0 origin-bottom"
                  >
                    <div className="relative h-full w-full overflow-hidden rounded-lg shadow-[0_24px_60px_rgba(30,18,8,0.18)]">
                      <Image
                        src={reviewImages[index % reviewImages.length]}
                        alt={`Curry Kitchen meal enjoyed by ${item.name}`}
                        fill
                        draggable={false}
                        className="object-cover object-center"
                        sizes="(min-width: 768px) 45vw, 100vw"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      <motion.div
                        animate={{ opacity: isActive ? 1 : 0 }}
                        transition={{ duration: 0.3 }}
                        className="absolute bottom-5 left-5 right-5 text-white"
                      >
                        <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-white/70">
                          From {item.area}
                        </p>
                        <p className="mt-1 font-display text-xl font-black">{item.role}</p>
                      </motion.div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Quote */}
          <div className="flex flex-col justify-between py-2">
            <motion.div
              key={active}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
            >
              <div className="flex gap-1 text-saffron" aria-label={`${current.rating} star rating`}>
                {Array.from({ length: 5 }).map((_, starIndex) => (
                  <motion.span
                    key={starIndex}
                    initial={{ opacity: 0, scale: 0.45 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 + starIndex * 0.06, type: "spring", stiffness: 360, damping: 18 }}
                  >
                    <Star size={17} fill="currentColor" />
                  </motion.span>
                ))}
              </div>
              <h3 className="mt-6 font-display text-2xl font-black">{current.name}</h3>
              <p className="mt-1 text-sm font-semibold text-ink/55">{current.role}</p>
              <blockquote className="mt-8 font-display text-2xl font-bold leading-[1.3] text-ink/85 sm:text-3xl">
                {current.quote.split(" ").map((word, index) => (
                  <motion.span
                    key={`${active}-${index}`}
                    initial={{ filter: "blur(10px)", opacity: 0, y: 5 }}
                    animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, ease: "easeInOut", delay: 0.02 * index }}
                    className="inline-block"
                  >
                    {word}&nbsp;
                  </motion.span>
                ))}
              </blockquote>
            </motion.div>

            <div className="mt-10 flex items-center justify-between gap-5 border-t border-ink/10 pt-6">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  aria-label="Previous testimonial"
                  onClick={prev}
                  className="group/button grid size-12 place-items-center rounded-full border border-ink/14 bg-white text-ink transition hover:border-saffron hover:text-saffron focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron"
                >
                  <ArrowLeft size={20} strokeWidth={2} className="transition-transform duration-300 group-hover/button:rotate-12" />
                </button>
                <button
                  type="button"
                  aria-label="Next testimonial"
                  onClick={next}
                  className="group/button grid size-12 place-items-center rounded-full bg-saffron text-ink shadow-lift transition hover:bg-[#ff8f33] focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron focus-visible:ring-offset-2 focus-visible:ring-offset-[#f8f0e7]"
                >
                  <ArrowRight size={20} strokeWidth={2.2} className="transition-transform duration-300 group-hover/button:-rotate-12" />
                </button>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2" role="tablist" aria-label="Testimonials">
                  {items.map((item, index) => (
                    <button
                      key={`${item.name}-dot`}
                      type="button"
                      role="tab"
                      aria-label={`Show testimonial ${index + 1}`}
                      aria-selected={active === index}
                      onClick={() => setActive(index)}
                      className={cn(
                        "h-1.5 rounded-full transition-all duration-300",
                        active === index ? "w-8 bg-saffron" : "w-3 bg-ink/16 hover:bg-ink/35",
                      )}
                    />
                  ))}
                </div>
                <span className="text-sm font-black text-saffron">
                  {String(active + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
