import type { ReactNode } from "react";
import type { PageBackgroundFocalPoint, PageBackgroundOverlay } from "@/lib/page-backgrounds";
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
  focalPoint?: PageBackgroundFocalPoint;
  overlay?: PageBackgroundOverlay;
};

const focalPosition: Record<PageBackgroundFocalPoint, string> = {
  LEFT: "left center",
  CENTER: "center center",
  RIGHT: "right center",
};

const horizontalOverlay: Record<PageBackgroundOverlay, string> = {
  NONE: "bg-gradient-to-r from-ink/50 via-ink/26 to-ink/8",
  LIGHT: "bg-gradient-to-r from-ink/68 via-ink/42 to-ink/16",
  MEDIUM: "bg-gradient-to-r from-ink/82 via-ink/62 to-ink/25",
  DARK: "bg-gradient-to-r from-ink via-ink/90 to-ink/35",
};

const verticalOverlay: Record<PageBackgroundOverlay, string> = {
  NONE: "bg-gradient-to-t from-ink/38 via-transparent to-ink/18",
  LIGHT: "bg-gradient-to-t from-ink/56 via-transparent to-ink/28",
  MEDIUM: "bg-gradient-to-t from-ink/72 via-transparent to-ink/36",
  DARK: "bg-gradient-to-t from-ink/85 via-transparent to-ink/40",
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
  focalPoint = "CENTER",
  overlay = "DARK",
}: PageHeroProps) {
  return (
    <section className={cn("dark-band relative isolate overflow-hidden text-white", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- admin can choose a secure external background URL. */}
      <img
        src={image}
        alt={imageAlt}
        className="absolute inset-0 size-full object-cover"
        style={{ objectPosition: focalPosition[focalPoint] }}
        fetchPriority="high"
      />
      <div className={cn("absolute inset-0", horizontalOverlay[overlay])} />
      <div className={cn("absolute inset-0", verticalOverlay[overlay])} />
      <div className="absolute inset-x-0 top-0 h-1 bg-saffron" />

      <div className="section-shell relative grid min-h-[64vh] items-center gap-10 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
        <div className="max-w-2xl">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-saffron">{eyebrow}</p>
          <h1 className="mt-4 font-display text-4xl font-black leading-[1.12] md:text-5xl lg:text-6xl">
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
