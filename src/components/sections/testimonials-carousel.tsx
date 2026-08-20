"use client";

import useEmblaCarousel from "embla-carousel-react";
import { ArrowLeft, ArrowRight, Quote, Star } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { Testimonial } from "@/lib/server/catalog";
import { cn } from "@/lib/utils";

export function TestimonialsCarousel({ items }: { items: Testimonial[] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: "start", loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  const updateSelected = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", updateSelected);
    emblaApi.on("reInit", updateSelected);

    return () => {
      emblaApi.off("select", updateSelected);
      emblaApi.off("reInit", updateSelected);
    };
  }, [emblaApi, updateSelected]);

  if (!items.length) {
    return null;
  }

  return (
    <section id="reviews" className="section relative overflow-hidden bg-mint text-ink">
      <div className="section-shell relative flex flex-col">
        {/* Header — full width so the display heading wraps cleanly */}
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl font-black leading-[1.15] lg:text-4xl">
              Reviews that sell the weekly habit.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-ink/62">
              Families, students, and professionals come back because dinner becomes predictable again.
            </p>
          </div>

          {/* Controls — top-right on desktop */}
          <div className="flex items-center gap-4">
            <span className="text-sm font-bold text-ink/45">
              {String(selectedIndex + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}
            </span>
            <div className="flex items-center gap-3">
              <button
                aria-label="Previous testimonial"
                onClick={scrollPrev}
                className="grid size-12 place-items-center rounded-full border border-ink/14 bg-white text-ink transition hover:border-saffron/60"
              >
                <ArrowLeft size={19} />
              </button>
              <button
                aria-label="Next testimonial"
                onClick={scrollNext}
                className="grid size-12 place-items-center rounded-full bg-saffron text-ink transition hover:bg-[#ff8f33]"
              >
                <ArrowRight size={19} />
              </button>
            </div>
          </div>
        </div>

        {/* Rotating quote — full width */}
        <div className="mt-10">
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex gap-6">
              {items.map((item) => (
                <article
                  key={item.name}
                  className="min-w-0 flex-[0_0_100%] md:flex-[0_0_calc(50%-12px)] lg:flex-[0_0_calc(33.333%-16px)]"
                >
                  <div className="flex h-full min-h-[280px] flex-col justify-between rounded-lg border border-ink/10 bg-white p-6 shadow-soft">
                    <div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="grid size-11 place-items-center rounded-button bg-saffron text-ink">
                          <Quote size={20} />
                        </span>
                        <div
                          className="flex items-center gap-0.5 text-saffron"
                          aria-label={`${item.rating} star rating`}
                        >
                          {Array.from({ length: 5 }).map((_, starIndex) => (
                            <Star key={starIndex} size={15} fill="currentColor" />
                          ))}
                        </div>
                      </div>

                      <blockquote className="mt-6 font-display text-xl font-black leading-[1.32]">
                        &ldquo;{item.quote}&rdquo;
                      </blockquote>
                    </div>

                    <div className="mt-7 flex flex-wrap items-end justify-between gap-4 border-t border-ink/10 pt-5">
                      <div>
                        <p className="font-display text-lg font-black">{item.name}</p>
                        <p className="mt-1 text-xs font-bold text-ink/52">{item.role}</p>
                      </div>
                      <span className="rounded-full bg-rose px-3 py-1.5 text-xs font-black text-masala">
                        {item.area}
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="mt-5 flex gap-2">
            {items.map((item, index) => (
              <button
                key={item.name}
                aria-label={`Go to testimonial ${index + 1}`}
                onClick={() => emblaApi?.scrollTo(index)}
                className={cn(
                  "h-2.5 rounded-full transition-all",
                  selectedIndex === index ? "w-9 bg-saffron" : "w-2.5 bg-ink/15 hover:bg-ink/30",
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
