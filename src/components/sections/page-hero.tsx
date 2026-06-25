import Image from "next/image";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PageHeroProps = {
  eyebrow: string;
  title: string;
  children: ReactNode;
  image: string;
  imageAlt: string;
  actions?: ReactNode;
  chips?: string[];
  imageCaption?: ReactNode;
  className?: string;
};

export function PageHero({
  eyebrow,
  title,
  children,
  image,
  imageAlt,
  actions,
  chips,
  imageCaption,
  className,
}: PageHeroProps) {
  return (
    <section className={cn("dark-band relative isolate overflow-hidden text-white", className)}>
      <Image
        src={image}
        alt={imageAlt}
        fill
        priority
        className="object-cover"
        sizes="100vw"
      />
      {/* Legibility overlays — dark on the left where the copy sits, image breathes on the right */}
      <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/90 to-ink/35" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-transparent to-ink/40" />
      <div className="absolute inset-x-0 top-0 h-1 bg-saffron" />

      <div className="section-shell relative grid min-h-[64vh] items-center gap-10 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
        <div className="max-w-2xl">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-saffron">{eyebrow}</p>
          <h1 className="mt-4 font-display text-4xl font-black leading-[1.02] md:text-5xl lg:text-6xl">
            {title}
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-white/75">{children}</p>
          {actions ? <div className="mt-8 flex flex-wrap gap-3">{actions}</div> : null}
          {chips?.length ? (
            <div className="mt-9 flex flex-wrap gap-2.5">
              {chips.map((chip) => (
                <span
                  key={chip}
                  className="rounded-full border border-white/16 bg-white/[0.08] px-4 py-2 text-sm font-bold text-white/80 backdrop-blur-sm"
                >
                  {chip}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        {imageCaption ? (
          <div className="lg:justify-self-end lg:self-end">
            <div className="max-w-sm rounded-lg border border-white/15 bg-black/55 p-5 backdrop-blur-md">
              {imageCaption}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
