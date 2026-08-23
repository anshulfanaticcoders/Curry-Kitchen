"use client";

import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Quote, Star } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { Testimonial } from "@/lib/server/catalog";
import { cn } from "@/lib/utils";

const reviewImages = [
  "https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=1200&q=84",
  "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=1200&q=84",
  "https://images.unsplash.com/photo-1631452180539-96aca7d48617?auto=format&fit=crop&w=1200&q=84",
  "https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?auto=format&fit=crop&w=1200&q=84",
];

export function TestimonialsCarousel({ items }: { items: Testimonial[] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: "start", loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const updateSelected = useCallback(() => {
    if (emblaApi) setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", updateSelected);
    emblaApi.on("reInit", updateSelected);
    updateSelected();

    return () => {
      emblaApi.off("select", updateSelected);
      emblaApi.off("reInit", updateSelected);
    };
  }, [emblaApi, updateSelected]);

  if (!items.length) return null;

  return (
    <section id="reviews" className="section overflow-hidden bg-[#f8f0e7] text-ink">
      <div className="section-shell">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <h2 className="font-display text-4xl font-black leading-[1.08] sm:text-5xl">
              People who miss Ghar Ka Khana.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-ink/60">
              The best review is a tiffin that feels familiar on a day that needed to be easier.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Previous testimonial"
              onClick={() => emblaApi?.scrollPrev()}
              className="grid size-12 place-items-center rounded-full border border-ink/14 bg-white text-ink transition hover:border-saffron hover:text-saffron focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron"
            >
              <motion.span whileHover={{ x: -3 }} whileTap={{ x: -1 }} transition={{ type: "spring", stiffness: 520, damping: 22 }}>
                <ArrowLeft size={20} strokeWidth={2} />
              </motion.span>
            </button>
            <button
              type="button"
              aria-label="Next testimonial"
              onClick={() => emblaApi?.scrollNext()}
              className="grid size-12 place-items-center rounded-full bg-saffron text-ink shadow-lift transition hover:bg-[#ff8f33] focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron focus-visible:ring-offset-2 focus-visible:ring-offset-[#f8f0e7]"
            >
              <motion.span whileHover={{ x: 3 }} whileTap={{ x: 1 }} transition={{ type: "spring", stiffness: 520, damping: 22 }}>
                <ArrowRight size={20} strokeWidth={2.2} />
              </motion.span>
            </button>
          </div>
        </div>

        <div className="mt-11 overflow-hidden" ref={emblaRef}>
          <div className="flex">
            {items.map((item, index) => (
              <article key={`${item.name}-${index}`} className="min-w-0 flex-[0_0_100%]">
                <div className="grid overflow-hidden rounded-lg bg-white shadow-[0_24px_60px_rgba(30,18,8,0.1)] lg:grid-cols-[0.86fr_1.14fr]">
                  <div className="relative min-h-[280px] lg:min-h-[410px]">
                    <Image
                      src={reviewImages[index % reviewImages.length]}
                      alt="Fresh Curry Kitchen meal served at home"
                      fill
                      className="object-cover"
                      sizes="(min-width: 1024px) 42vw, 100vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/68 via-transparent to-transparent" />
                    <div className="absolute bottom-7 left-7 right-7 text-white">
                      <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-white/64">
                        From {item.area}
                      </p>
                      <p className="mt-2 font-display text-2xl font-black">{item.role}</p>
                    </div>
                  </div>

                  <div className="dark-band relative flex min-h-[360px] flex-col justify-between px-7 py-8 text-white sm:px-10 sm:py-10 lg:min-h-[410px] lg:px-14 lg:py-12">
                    <div className="absolute right-8 top-8 text-saffron/24 sm:right-12 sm:top-10">
                      <Quote size={76} strokeWidth={1.3} />
                    </div>
                    <div className="relative">
                      <div className="flex gap-1 text-saffron" aria-label={`${item.rating} star rating`}>
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
                      <blockquote className="mt-9 max-w-2xl font-display text-3xl font-black leading-[1.18] sm:text-4xl">
                        &ldquo;{item.quote}&rdquo;
                      </blockquote>
                    </div>
                    <div className="relative mt-10 flex items-end justify-between gap-5 border-t border-white/14 pt-5">
                      <div>
                        <p className="font-display text-xl font-black">{item.name}</p>
                        <p className="mt-1 text-sm font-medium text-white/56">Curry Kitchen customer</p>
                      </div>
                      <span className="text-sm font-black text-saffron">
                        {String(index + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="mt-6 flex items-center gap-2" role="tablist" aria-label="Testimonials">
          {items.map((item, index) => (
            <button
              key={`${item.name}-dot`}
              type="button"
              role="tab"
              aria-label={`Show testimonial ${index + 1}`}
              aria-selected={selectedIndex === index}
              onClick={() => emblaApi?.scrollTo(index)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                selectedIndex === index ? "w-10 bg-saffron" : "w-4 bg-ink/16 hover:bg-ink/35",
              )}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
