import Link from "next/link";

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
    <main className="min-h-screen bg-ivory">
      <div className="grid min-h-screen lg:grid-cols-[0.85fr_1.15fr]">
        <section className="dark-band relative hidden overflow-hidden p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-full bg-saffron font-display text-lg font-black text-ink">
              CK
            </span>
            <span>
              <span className="block font-display text-xl font-black leading-none">Curry Kitchen</span>
              <span className="mt-1 block text-xs font-bold uppercase tracking-[0.16em] text-saffron">
                California tiffin delivery
              </span>
            </span>
          </Link>
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-saffron">Meal plans with control</p>
            <h1 className="mt-4 max-w-xl font-display text-5xl font-black leading-[1.02]">
              Homemade meals, cleaner ordering, better package tracking.
            </h1>
            <p className="mt-5 max-w-lg text-base font-medium leading-7 text-white/64">
              Sign in to track package days, pause delivery once, review payments, and buy again.
            </p>
          </div>
        </section>

        <section className="flex items-center justify-center px-5 py-12">
          <div className="w-full max-w-md rounded-lg border border-ink/10 bg-white p-6 shadow-soft md:p-8">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-masala">Account</p>
              <h2 className="mt-3 font-display text-4xl font-black leading-tight">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-ink/60">{description}</p>
            </div>
            <div className="mt-7">{children}</div>
            <div className="mt-6 border-t border-ink/10 pt-5 text-sm font-bold text-ink/60">
              {footer}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
