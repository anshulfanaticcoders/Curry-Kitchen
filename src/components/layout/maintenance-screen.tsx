import { ChefHat, Clock3, LogIn, Wrench } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";

export function MaintenanceScreen({
  customerView = false,
}: {
  customerView?: boolean;
}) {
  return (
    <main className="dark-band grid min-h-screen place-items-center px-5 py-12 text-ivory">
      <div className="w-full max-w-2xl text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-full border border-saffron/35 bg-saffron/15 text-saffron">
          <Wrench size={28} />
        </span>
        <p className="mt-7 text-xs font-black uppercase tracking-[0.2em] text-saffron">
          Curry Kitchen is being refreshed
        </p>
        <h1 className="mt-4 font-display text-4xl font-black leading-tight sm:text-5xl">
          We&apos;ll be back shortly.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-ivory/70">
          {customerView
            ? "Customer access is temporarily paused while we make an update. Your existing packages and delivery details remain safely saved."
            : "We&apos;re making a few improvements before reopening orders. Thank you for your patience."}
        </p>
        {!customerView ? (
          <div className="mt-8 flex justify-center">
            <ButtonLink href="/login" variant="secondary" className="border-white/25 bg-white/10 text-white hover:border-saffron hover:bg-white/15">
              <LogIn size={17} />
              Admin sign in
            </ButtonLink>
          </div>
        ) : null}
        <div className="mt-10 flex items-center justify-center gap-2 text-sm font-bold text-ivory/55">
          <Clock3 size={16} className="text-saffron" />
          We&apos;ll reopen as soon as the update is complete.
        </div>
        <div className="mt-12 flex items-center justify-center gap-2 text-sm font-black text-ivory/80">
          <ChefHat size={18} className="text-saffron" />
          Curry Kitchen
        </div>
      </div>
    </main>
  );
}
