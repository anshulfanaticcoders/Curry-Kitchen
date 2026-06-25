import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
  align?: "left" | "center";
  className?: string;
};

export function SectionHeading({
  eyebrow,
  title,
  children,
  align = "left",
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "max-w-3xl",
        align === "center" && "mx-auto text-center",
        className,
      )}
    >
      {eyebrow ? (
        <p className="mb-3 text-sm font-black uppercase tracking-[0.18em] text-masala">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="font-display text-3xl font-black leading-[1.04] text-ink md:text-4xl lg:text-5xl">
        {title}
      </h2>
      {children ? <p className="mt-4 text-base leading-7 text-ink/68">{children}</p> : null}
    </div>
  );
}
