"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgePercent,
  Bell,
  CalendarDays,
  CreditCard,
  ExternalLink,
  Image as ImageIcon,
  LayoutDashboard,
  Loader2,
  LogOut,
  type LucideIcon,
  Menu,
  Package,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Star,
  Tags,
  User,
  Users,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: LucideIcon };

const adminNav: NavItem[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { href: "/admin/packages", label: "Packages", icon: Package },
  { href: "/admin/menu", label: "Menus", icon: UtensilsCrossed },
  { href: "/admin/media", label: "Media", icon: ImageIcon },
  { href: "/admin/categories", label: "Categories", icon: Tags },
  { href: "/admin/offers", label: "Offers", icon: BadgePercent },
  { href: "/admin/reviews", label: "Reviews", icon: Star },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/students", label: "Verifications", icon: ShieldCheck },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/seo", label: "SEO", icon: Search },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

const customerNav: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/orders", label: "Orders", icon: ShoppingBag },
  { href: "/dashboard/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/dashboard/payments", label: "Payments", icon: CreditCard },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
  { href: "/dashboard/profile", label: "Profile", icon: User },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin" || href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function initialsFromSession(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.split("@")[0] || "CK";
  const parts = source.split(/[\s._-]+/).filter(Boolean);

  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function DashboardShell({
  role,
  children,
}: {
  role: "admin" | "customer";
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const nav = role === "admin" ? adminNav : customerNav;
  const current = nav.find((item) => isActive(pathname, item.href));
  const sessionUser = session?.user;
  const userName = sessionUser?.name ?? (role === "admin" ? "Admin user" : "Customer");
  const userEmail = sessionUser?.email ?? "";
  const persona = {
    name: userName,
    sub: userEmail || (role === "admin" ? "Curry Kitchen admin" : "Regular tiffin plan"),
    initials: initialsFromSession(sessionUser?.name, sessionUser?.email),
  };

  async function handleSignOut() {
    setSigningOut(true);
    await signOut({ callbackUrl: "/login" });
  }

  const SidebarBody = (
    <div className="flex h-full flex-col border-r border-ink/8 bg-white">
      <div className="flex items-center justify-between px-5 py-6">
        <Link href={role === "admin" ? "/admin" : "/dashboard"} className="flex items-center gap-2.5">
          <span className="grid size-10 place-items-center rounded-2xl bg-saffron font-display text-lg font-black text-white shadow-[0_8px_20px_rgba(255,122,26,0.35)]">
            CK
          </span>
          <span>
            <span className="block font-display text-lg font-black leading-none tracking-tight">
              Curry Kitchen<span className="text-saffron">.</span>
            </span>
            <span className="mt-1 block text-[11px] font-bold uppercase tracking-[0.14em] text-ink/40">
              {role === "admin" ? "Admin" : "My account"}
            </span>
          </span>
        </Link>
        <button
          className="grid size-9 place-items-center rounded-xl border border-ink/10 text-ink/60 lg:hidden"
          onClick={() => setOpen(false)}
          aria-label="Close menu"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 space-y-1.5 overflow-y-auto px-4 py-2">
        {nav.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-bold transition-colors duration-150",
                active
                  ? "bg-saffron text-white shadow-[0_10px_24px_rgba(255,122,26,0.35)]"
                  : "text-ink/55 hover:bg-ink/[0.04] hover:text-ink",
              )}
            >
              <item.icon size={18} strokeWidth={2.2} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-ink/8 p-4">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-bold text-ink/55 transition-colors duration-150 hover:bg-ink/[0.04] hover:text-ink"
        >
          <ExternalLink size={18} />
          View live site
        </Link>
        <div className="mt-2 flex items-center gap-3 rounded-2xl bg-frost px-4 py-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-ink text-sm font-black text-saffron">
            {persona.initials}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-extrabold">{persona.name}</span>
            <span className="block truncate text-xs font-bold text-ink/45">{persona.sub}</span>
          </span>
        </div>
        <button
          type="button"
          disabled={signingOut}
          onClick={handleSignOut}
          className="mt-2 flex w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-left text-sm font-bold text-ink/55 transition-colors duration-150 hover:bg-rose hover:text-masala disabled:cursor-not-allowed disabled:opacity-60"
        >
          {signingOut ? <Loader2 className="animate-spin" size={18} /> : <LogOut size={18} />}
          {signingOut ? "Signing out" : "Sign out"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-frost">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">{SidebarBody}</aside>

      {/* Mobile drawer */}
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 bg-ink/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-label="Close menu overlay"
          />
          <div className="absolute inset-y-0 left-0 w-72">{SidebarBody}</div>
        </div>
      ) : null}

      <div className="lg:pl-64">
        {/* Topbar */}
        <header className="sticky top-0 z-30 border-b border-ink/6 bg-frost/90 backdrop-blur-xl">
          <div className="flex h-16 items-center gap-4 px-4 md:px-8">
            <button
              className="grid size-10 place-items-center rounded-xl border border-ink/10 bg-white lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
            <p className="font-display text-xl font-black tracking-tight">{current?.label ?? "Dashboard"}</p>
            <div className="ml-auto flex items-center gap-3">
              <span className="hidden text-sm font-bold text-ink/45 md:block">{persona.name}</span>
              <span className="grid size-10 place-items-center rounded-full bg-ink text-sm font-black text-saffron">
                {persona.initials}
              </span>
            </div>
          </div>
        </header>

        <main className="p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
