"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import type { PackagePlan } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";

const accentStyles = {
  saffron: "border-saffron/70 bg-saffron/15 text-ink",
  leaf: "border-ink/15 bg-mint text-ink",
  masala: "border-masala/30 bg-rose text-masala",
};

export function PackageCard({
  plan,
  onSelect,
  compact = false,
  selected = false,
}: {
  plan: PackagePlan;
  onSelect?: (plan: PackagePlan) => void;
  compact?: boolean;
  selected?: boolean;
}) {
  const router = useRouter();

  return (
    <motion.article
      whileHover={selected ? undefined : { y: -10, scale: 1.012 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      aria-selected={selected}
      className={cn(
        "group overflow-hidden rounded-lg border bg-white shadow-soft transition",
        selected
          ? "border-saffron shadow-[0_22px_58px_rgba(255,122,26,0.2)] ring-2 ring-saffron/30"
          : "border-ink/10 hover:shadow-lift",
      )}
    >
      <div className="relative h-56 overflow-hidden">
        <Image
          src={plan.image}
          alt={plan.name}
          fill
          className="object-cover transition duration-700 group-hover:scale-105"
          sizes="(min-width: 1024px) 33vw, 100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/76 via-black/16 to-transparent" />
        <div className="absolute inset-x-0 top-0 h-1 bg-saffron" />
        <div className="absolute left-4 top-4">
          <StatusPill tone={plan.accent === "leaf" ? "green" : plan.accent === "masala" ? "red" : "amber"}>
            {plan.badge}
          </StatusPill>
        </div>
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-white/72">
            {plan.category}
          </p>
          <h3 className="mt-1 font-display text-3xl font-black leading-none">{plan.name}</h3>
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-3xl font-black">{formatCurrency(plan.price)}</p>
            <p className="text-sm font-bold text-ink/55">{plan.cadence}</p>
          </div>
          <span className={cn("rounded-full border px-3 py-1 text-xs font-extrabold", accentStyles[plan.accent])}>
            {plan.bestFor}
          </span>
        </div>

        <p className="mt-4 text-sm leading-7 text-ink/64">{plan.description}</p>

        {!compact ? (
          <ul className="mt-5 grid gap-3">
            {plan.includes.slice(0, 4).map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm font-bold text-ink/72">
                <CheckCircle2 size={17} className="text-leaf" />
                {item}
              </li>
            ))}
          </ul>
        ) : null}

        <Button
          className={cn(
            "mt-6 w-full",
            selected && "cursor-default bg-ink text-saffron shadow-none hover:translate-y-0 hover:bg-ink",
          )}
          variant={selected || plan.accent === "leaf" ? "dark" : "primary"}
          disabled={selected}
          onClick={() =>
            onSelect
              ? onSelect(plan)
              : router.push(`/packages?plan=${encodeURIComponent(plan.id)}#build-plan`)
          }
        >
          {selected ? (
            <>
              Selected
              <CheckCircle2 size={18} />
            </>
          ) : (
            <>
              Select plan
              <ArrowRight size={18} />
            </>
          )}
        </Button>
      </div>
    </motion.article>
  );
}
