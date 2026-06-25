"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgePercent,
  Bell,
  CreditCard,
  ExternalLink,
  LayoutDashboard,
  Loader2,
  LogOut,
  type LucideIcon,
  Menu,
  Package,
  Search,
  Settings,
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
  { href: "/admin/menu", label: "Menu items", icon: UtensilsCrossed },
  { href: "/admin/categories", label: "Categories & tags", icon: Tags },
  { href: "/admin/offers", label: "Offers", icon: BadgePercent },
  { href: "/admin/reviews", label: "Reviews", icon: Star },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/seo", label: "SEO", icon: Search },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

const customerNav: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/orders", label: "Orders", icon: ShoppingBag },
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
  const persona =
    role === "admin"
      ? {
          name: userName,
          sub: userEmail || "Curry Kitchen admin",
          initials: initialsFromSession(sessionUser?.name, sessionUser?.email),
        }
      : {
          name: userName,
          sub: userEmail || "Regular tiffin plan",
          initials: initialsFromSession(sessionUser?.name, sessionUser?.email),
        };

  async function handleSignOut() {
    setSigningOut(true);
    await signOut({ callbackUrl: "/login" });
  }

  const SidebarBody = (
    <div className="dark-band flex h-full flex-col text-white">
      <div className="flex items-center justify-between px-5 py-5">
        <Link href={role === "admin" ? "/admin" : "/dashboard"} className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-full bg-saffron font-display text-lg font-black text-ink">
            CK
          </span>
          <span>
            <span className="block font-display text-lg font-black leading-none">Curry Kitchen</span>
            <span className="mt-1 block text-xs font-bold uppercase tracking-[0.16em] text-saffron">
              {role === "admin" ? "Admin" : "My account"}
            </span>
          </span>
        </Link>
        <button
          className="grid size-9 place-items-center rounded-button border border-white/15 text-white/80 lg:hidden"
          onClick={() => setOpen(false)}
          aria-label="Close menu"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {nav.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-button px-3 py-2.5 text-sm font-bold transition",
                active
                  ? "bg-saffron text-ink shadow-[0_10px_30px_rgba(255,122,26,0.25)]"
                  : "text-white/70 hover:bg-white/[0.06] hover:text-white",
              )}
            >
              <item.icon size={18} strokeWidth={2.2} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-3">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-button px-3 py-2.5 text-sm font-bold text-white/70 transition hover:bg-white/[0.06] hover:text-white"
        >
          <ExternalLink size={18} />
          View live site
        </Link>
        <div className="mt-2 flex items-center gap-3 rounded-button bg-white/[0.05] px-3 py-2.5">
          <span className="grid size-9 place-items-center rounded-full bg-white/10 text-sm font-black text-saffron">
            {persona.initials}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-extrabold">{persona.name}</span>
            <span className="block truncate text-xs font-bold text-white/55">{persona.sub}</span>
          </span>
        </div>
        <button
          type="button"
          disabled={signingOut}
          onClick={handleSignOut}
          className="mt-2 flex w-full items-center gap-3 rounded-button px-3 py-2.5 text-left text-sm font-bold text-white/70 transition hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {signingOut ? <Loader2 className="animate-spin" size={18} /> : <LogOut size={18} />}
          {signingOut ? "Signing out" : "Sign out"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f4f3ef]">
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
        <header className="sticky top-0 z-30 border-b border-ink/8 bg-white/90 backdrop-blur-xl">
          <div className="flex h-16 items-center gap-4 px-4 md:px-7">
            <button
              className="grid size-10 place-items-center rounded-button border border-ink/10 lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
            <p className="font-display text-xl font-black">{current?.label ?? "Dashboard"}</p>
            <div className="ml-auto flex items-center gap-2">
              <div className="hidden items-center gap-2 rounded-button border border-ink/10 bg-ivory px-3 py-2 text-sm text-ink/50 md:flex">
                <Search size={16} />
                <span>Search…</span>
              </div>
              <button
                className="relative grid size-10 place-items-center rounded-button border border-ink/10 text-ink/70 transition hover:bg-ivory"
                aria-label="Notifications"
              >
                <Bell size={18} />
                <span className="absolute right-2.5 top-2.5 size-2 rounded-full bg-masala" />
              </button>
              <span className="grid size-10 place-items-center rounded-full bg-ink text-sm font-black text-saffron">
                {persona.initials}
              </span>
            </div>
          </div>
        </header>

        <main className="p-4 md:p-7">{children}</main>
      </div>
    </div>
  );
}
