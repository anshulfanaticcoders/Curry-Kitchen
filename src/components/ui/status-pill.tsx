import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type StatusTone = "green" | "amber" | "red" | "ink";

const toneStyles: Record<StatusTone, string> = {
  green: "border-leaf/20 bg-mint text-leaf",
  amber: "border-saffron/30 bg-saffron/15 text-ink",
  red: "border-masala/20 bg-rose/25 text-masala",
  ink: "border-ink/10 bg-ink/5 text-ink",
};

export function StatusPill({
  children,
  tone = "ink",
}: {
  children: ReactNode;
  tone?: StatusTone;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-extrabold",
        toneStyles[tone],
      )}
    >
      {children}
    </span>
  );
}
