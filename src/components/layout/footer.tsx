import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";

const quickLinks = [
  { href: "/about", label: "Our story" },
  { href: "/menu", label: "Weekly menu" },
  { href: "/packages", label: "Packages" },
  { href: "/checkout", label: "Order flow" },
];

export function Footer() {
  return (
    <footer className="dark-band relative text-ivory">
      <div className="h-1 bg-saffron" />
      <div className="section-shell relative grid gap-12 py-16 md:grid-cols-[1.2fr_0.8fr_1fr]">
        <div>
          <p className="font-display text-4xl font-black">Curry Kitchen</p>
          <p className="mt-4 max-w-sm text-sm leading-7 text-ivory/70">
            Homemade Indian tiffin plans, weekly menus, and daily delivery designed for busy homes,
            students, and professionals.
          </p>
          <p className="mt-6 inline-flex rounded-full border border-white/12 px-4 py-2 text-xs font-black text-saffron">
            Monday to Friday dinner delivery
          </p>
        </div>
        <div>
          <p className="mb-4 text-sm font-extrabold uppercase tracking-[0.2em] text-saffron">
            Explore
          </p>
          <div className="grid gap-3">
            {quickLinks.map((link) => (
              <Link key={link.href} href={link.href} className="text-sm font-bold text-ivory/72 transition hover:text-saffron">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-4 text-sm font-extrabold uppercase tracking-[0.2em] text-saffron">
            Connect
          </p>
          <div className="grid gap-3 text-sm font-bold text-ivory/72">
            <span className="flex items-center gap-3">
              <Phone size={17} /> (858) 599-1613
            </span>
            <span className="flex items-center gap-3">
              <Mail size={17} /> info@currykitcheninc.com
            </span>
            <span className="flex items-center gap-3">
              <MapPin size={17} /> California Bay Area delivery zones
            </span>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 py-5">
        <div className="section-shell flex flex-col gap-2 text-xs font-bold uppercase tracking-[0.16em] text-ivory/48 md:flex-row md:items-center md:justify-between">
          <span>Fresh meals. Clear plans. Daily comfort.</span>
          <span>2026 Curry Kitchen</span>
        </div>
      </div>
    </footer>
  );
}
