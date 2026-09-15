import { ChefHat, ClipboardList, Clock3 } from "lucide-react";

export function MenuEmptyState({ dark = false }: { dark?: boolean }) {
  return (
    <div className="flex flex-col items-center px-4 py-12 text-center sm:py-16">
      <div aria-hidden="true" className="relative mb-6 flex h-28 w-32 items-end justify-center text-saffron">
        <ClipboardList size={80} strokeWidth={1.25} />
        <ChefHat size={44} strokeWidth={1.5} className={`absolute left-0 top-0 -rotate-12 ${dark ? "bg-[#0c0b09]" : "bg-white"}`} />
        <Clock3 size={30} strokeWidth={1.5} className={`absolute bottom-0 right-0 ${dark ? "bg-[#0c0b09]" : "bg-white"}`} />
      </div>
      <h3 className="font-display text-2xl font-black sm:text-3xl">Menu not updated yet</h3>
      <p className={`mt-3 max-w-md text-sm leading-6 sm:text-base ${dark ? "text-white/65" : "text-ink/60"}`}>
        Our next menu hasn&apos;t been published yet. Please check back soon for the latest update from our kitchen.
      </p>
    </div>
  );
}
