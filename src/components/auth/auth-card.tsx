import Link from "next/link";
import { ChefHat } from "lucide-react";
import { AuroraBackground } from "@/components/ui/aurora-background";

export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <AuroraBackground className="h-auto min-h-screen bg-[#f3f6f8] px-4 py-8 sm:px-8" showRadialGradient={false}>
      <div data-auth-shell className="relative z-10 grid w-full max-w-[1080px] overflow-hidden rounded-[1.25rem] bg-white shadow-[0_24px_70px_rgba(17,25,39,0.16)] lg:min-h-[38rem] lg:grid-cols-[0.92fr_1.08fr]">
        <section className="dark-band relative hidden overflow-hidden p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="pointer-events-none absolute inset-0 opacity-45">
            <div className="absolute -left-20 -top-28 size-80 rounded-full border-[24px] border-saffron/45" />
            <div className="absolute -bottom-20 left-20 size-80 rounded-full bg-saffron/15 blur-3xl" />
          </div>
          <div className="relative z-10 text-center">
            <p className="text-xl font-bold text-white/90">Welcome to</p>
            <Link href="/" aria-label="Curry Kitchen home" className="mt-14 inline-flex flex-col items-center gap-4">
              <span className="grid size-24 place-items-center rounded-full bg-white text-masala shadow-[0_14px_30px_rgba(0,0,0,0.2)]">
                <ChefHat size={48} strokeWidth={2.1} />
              </span>
              <span className="font-display text-3xl font-black tracking-[-0.04em]">Curry Kitchen</span>
            </Link>
          </div>
          <p className="relative z-10 mx-auto max-w-[18rem] text-center text-sm leading-6 text-white/70">
            Homemade meals for busy weeks—planned with care and delivered to your door.
          </p>
          <div className="relative z-10 flex justify-center gap-4 text-[10px] font-bold uppercase tracking-[0.12em] text-white/55">
            <span>Eat well</span>
            <span className="text-saffron">|</span>
            <span>Live well</span>
          </div>

          <svg aria-hidden="true" className="absolute -right-px top-0 z-20 h-full w-20" viewBox="0 0 96 1000" preserveAspectRatio="none">
            <path
              d="M46 0C0 65 96 125 46 190C0 255 96 315 46 380C0 445 96 505 46 570C0 635 96 695 46 760C0 825 96 890 46 1000H96V0H46Z"
              fill="white"
            />
          </svg>
        </section>

        <section className="flex items-center justify-center px-6 py-12 sm:px-12 lg:px-20">
          <div className="w-full max-w-sm">
            <div className="text-center">
              <h1 className="font-display text-4xl font-black tracking-[-0.04em] text-ink">{title}</h1>
              <p className="mt-3 text-sm leading-6 text-ink/55">{description}</p>
            </div>
            <div className="mt-8">{children}</div>
            <div className="mt-7 text-center text-sm text-ink/55">{footer}</div>
          </div>
        </section>
      </div>
    </AuroraBackground>
  );
}
