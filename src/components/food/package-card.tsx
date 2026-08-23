"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PackagePlan } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";

export function PackageCard({
  plan,
  onSelect,
  compact = false,
  selected = false,
  actionLabel = "Select plan",
  selectedLabel = "Selected",
  disableSelected = true,
}: {
  plan: PackagePlan;
  onSelect?: (plan: PackagePlan) => void;
  compact?: boolean;
  selected?: boolean;
  actionLabel?: string;
  selectedLabel?: string;
  disableSelected?: boolean;
}) {
  const router = useRouter();

  return (
    <motion.article
      whileHover={selected ? undefined : { y: -6, scale: 1.005 }}
      transition={{ type: "spring", stiffness: 240, damping: 24, mass: 0.85 }}
      aria-selected={selected}
      className={cn(
        "group will-change-transform overflow-hidden rounded-lg border bg-white shadow-soft transition-[box-shadow,border-color] duration-500 ease-out",
        selected
          ? "border-saffron shadow-[0_22px_58px_rgba(255,122,26,0.2)] ring-2 ring-saffron/30"
          : "border-ink/10 hover:shadow-lift",
      )}
    >
      <div className="relative h-52 overflow-hidden">
        <Image
          src={plan.image}
          alt={plan.name}
          fill
          className="object-cover transition duration-700 group-hover:scale-105"
          sizes="(min-width: 1024px) 33vw, 100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/18 to-transparent" />
        <div className="absolute inset-x-0 top-0 h-1 bg-saffron" />
        {plan.badge ? (
          <span className="absolute left-5 top-5 rounded-full border border-white/20 bg-black/45 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-white shadow-[0_10px_28px_rgba(0,0,0,0.22)] backdrop-blur-md">
            {plan.badge}
          </span>
        ) : null}
        <h3 className="absolute bottom-5 left-5 right-5 font-display text-3xl font-black leading-none text-white">
          {plan.name}
        </h3>
      </div>

      <div className="p-6">
        <div>
          <p className="text-3xl font-black">{formatCurrency(plan.price)}</p>
          <p className="mt-1 text-xs font-bold text-ink/52">{plan.cadence}</p>
        </div>

        <p className="mt-5 text-sm leading-6 text-ink/62">{plan.description}</p>

        {!compact ? (
          <ul className="mt-5 grid gap-2 border-t border-ink/8 pt-5">
            {plan.includes.map((item) => (
              <li key={item} className="flex items-center gap-2 text-xs font-bold text-ink/70">
                <CircleCheck size={15} className="shrink-0 text-saffron" />
                {item}
              </li>
            ))}
          </ul>
        ) : null}

        <Button
          className={cn(
            "mt-6 w-full rounded-full",
            selected && "bg-ink text-saffron shadow-none hover:bg-ink",
            selected && disableSelected && "cursor-default hover:translate-y-0",
          )}
          variant={selected ? "dark" : "primary"}
          disabled={selected && disableSelected}
          onClick={() =>
            onSelect
              ? onSelect(plan)
              : router.push(`/packages?plan=${encodeURIComponent(plan.id)}#build-plan`)
          }
        >
          {selected ? (
            <>
              {selectedLabel}
              <CheckCircle2 size={18} />
            </>
          ) : (
            <>
              {actionLabel}
              <ArrowRight size={18} />
            </>
          )}
        </Button>
      </div>
    </motion.article>
  );
}
