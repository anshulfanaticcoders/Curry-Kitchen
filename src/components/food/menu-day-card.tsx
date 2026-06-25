import Image from "next/image";
import { Flame, Sparkles } from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";
import type { WeeklyMenuDay } from "@/lib/types";

export function MenuDayCard({ item }: { item: WeeklyMenuDay }) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-lg border border-ink/10 bg-white shadow-soft transition hover:-translate-y-1 hover:shadow-lift">
      <div className="relative h-52 overflow-hidden">
        <Image
          src={item.image}
          alt={`${item.day} menu`}
          fill
          className="object-cover transition duration-700 group-hover:scale-105"
          sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
        <div className="absolute right-4 top-4">
          <StatusPill tone={item.spice === "Mild" ? "green" : "amber"}>
            <Flame size={14} className="mr-1" />
            {item.spice}
          </StatusPill>
        </div>
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-saffron">{item.date}</p>
          <h3 className="mt-0.5 font-display text-3xl font-black leading-none">{item.day}</h3>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="text-base font-extrabold text-leaf">{item.headline}</p>
        <dl className="mt-4 grid grid-cols-2 gap-3">
          {[
            ["Daal", item.daal],
            ["Sabzi", item.sabzi],
            ["Rice", item.rice],
            ["Side", item.side],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs font-black uppercase tracking-[0.14em] text-ink/42">{label}</dt>
              <dd className="mt-0.5 text-sm font-bold">{value}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-auto pt-4">
          {item.dessert ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-saffron/15 px-3 py-1.5 text-xs font-extrabold text-masala">
              <Sparkles size={15} />
              Dessert: {item.dessert}
            </span>
          ) : null}
        </p>
      </div>
    </article>
  );
}
