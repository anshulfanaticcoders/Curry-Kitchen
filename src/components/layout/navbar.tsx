"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  ShieldCheck,
  ShoppingBag,
  User,
  UserCircle,
  X,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { ButtonLink, buttonStyles } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Home" },
  { href: "/menu", label: "Menu" },
  { href: "/packages", label: "Packages" },
  { href: "/#story", label: "Our story" },
  { href: "/#reviews", label: "Reviews" },
];

function initialsFromSession(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.split("@")[0] || "CK";
  const parts = source.split(/[\s._-]+/).filter(Boolean);

  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function Navbar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [pastHero, setPastHero] = useState(false);
  const profileRef = useRef<HTMLDivElement | null>(null);
  const transparent = pathname === "/" && !pastHero && !open;
  const user = session?.user;
  const isAdmin = user?.role === "ADMIN";
  const dashboardHref = isAdmin ? "/admin" : "/dashboard";
  const userInitials = initialsFromSession(user?.name, user?.email);
  const userLabel = isAdmin ? "Admin" : "Customer";

  useEffect(() => {
    function updateHeader() {
      setPastHero(window.scrollY > Math.max(360, window.innerHeight * 0.58));
    }

    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });
    window.addEventListener("resize", updateHeader);

    return () => {
      window.removeEventListener("scroll", updateHeader);
      window.removeEventListener("resize", updateHeader);
    };
  }, []);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!profileRef.current?.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setProfileOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  async function handleSignOut() {
    setSigningOut(true);
    await signOut({ callbackUrl: "/login" });
  }

  const profileControl =
    status === "loading" ? (
      <span
        className={cn(
          "inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-extrabold",
          transparent ? "border-white/18 bg-white/10 text-white" : "border-ink/10 bg-white text-ink",
        )}
      >
        <Loader2 className="animate-spin" size={17} />
        Checking
      </span>
    ) : user ? (
      <div ref={profileRef} className="relative">
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={profileOpen}
          onClick={() => setProfileOpen((value) => !value)}
          className={cn(
            "inline-flex h-11 items-center gap-2 rounded-full border px-2.5 pl-2 text-sm font-extrabold transition duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron focus-visible:ring-offset-2",
            transparent
              ? "border-white/18 bg-white/10 text-white hover:bg-white hover:text-ink focus-visible:ring-offset-ink"
              : "border-ink/10 bg-white text-ink hover:border-saffron hover:bg-rose focus-visible:ring-offset-ivory",
          )}
        >
          <span className="grid size-8 place-items-center rounded-full bg-saffron font-black text-ink">
            {userInitials}
          </span>
          <span className="hidden xl:block">{userLabel}</span>
          <ChevronDown
            size={16}
            className={cn("transition", profileOpen && "rotate-180")}
            aria-hidden="true"
          />
        </button>

        {profileOpen ? (
          <div
            role="menu"
            className="absolute right-0 top-[calc(100%+0.75rem)] z-[70] w-72 rounded-lg border border-ink/10 bg-white p-2 text-ink shadow-[0_24px_70px_rgba(7,7,7,0.2)]"
          >
            <div className="flex items-center gap-3 border-b border-ink/8 px-3 py-3">
              <span className="grid size-11 place-items-center rounded-full bg-ink font-black text-saffron">
                {userInitials}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-black">{user.name ?? userLabel}</span>
                <span className="block truncate text-xs font-bold text-ink/50">{user.email}</span>
              </span>
            </div>

            <Link
              href={dashboardHref}
              role="menuitem"
              onClick={() => setProfileOpen(false)}
              className="mt-2 flex items-center gap-3 rounded-button px-3 py-2.5 text-sm font-extrabold transition hover:bg-rose"
            >
              {isAdmin ? <ShieldCheck size={18} /> : <LayoutDashboard size={18} />}
              {isAdmin ? "Admin dashboard" : "My dashboard"}
            </Link>

            <button
              type="button"
              role="menuitem"
              disabled={signingOut}
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 rounded-button px-3 py-2.5 text-left text-sm font-extrabold text-masala transition hover:bg-rose disabled:cursor-not-allowed disabled:opacity-60"
            >
              {signingOut ? <Loader2 className="animate-spin" size={18} /> : <LogOut size={18} />}
              {signingOut ? "Signing out" : "Sign out"}
            </button>
          </div>
        ) : null}
      </div>
    ) : (
      <ButtonLink
        href="/login"
        variant="secondary"
        className={cn(
          "h-11 rounded-full px-5",
          transparent && "border-white/18 bg-white/10 text-white hover:bg-white hover:text-ink",
        )}
      >
        <UserCircle size={18} />
        Sign in
      </ButtonLink>
    );

  return (
    <header
      className={cn(
        "z-50 transition duration-500",
        pathname === "/" ? "fixed inset-x-0 top-4" : "sticky top-0 bg-white/88 py-3 backdrop-blur-xl",
      )}
    >
      <div
        className={cn(
          "section-shell flex h-16 items-center justify-between rounded-full border px-3 pl-4 transition duration-500 md:px-4",
          transparent
            ? "border-white/16 bg-black/30 text-white shadow-[0_18px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl"
            : "border-ink/10 bg-white/94 text-ink shadow-[0_18px_46px_rgba(7,7,7,0.08)] backdrop-blur-xl",
        )}
      >
        <Link href="/" className="group flex items-center gap-3" onClick={() => setOpen(false)}>
          <span
            className={cn(
              "grid size-10 place-items-center rounded-full font-display text-lg font-black shadow-inset transition group-hover:rotate-[-4deg]",
              transparent ? "bg-saffron text-ink" : "bg-ink text-saffron",
            )}
          >
            CK
          </span>
          <span>
            <span className="block font-display text-2xl font-black leading-none">Curry Kitchen</span>
          </span>
        </Link>

        <nav
          className={cn(
            "hidden items-center gap-1 rounded-full border p-1 lg:flex",
            transparent ? "border-white/12 bg-white/8" : "border-ink/10 bg-ink/[0.03]",
          )}
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-extrabold transition",
                transparent
                  ? "text-white/80 hover:bg-white hover:text-ink"
                  : "text-ink/64 hover:bg-white hover:text-ink",
                pathname === link.href &&
                  (transparent
                    ? "bg-white text-ink"
                    : "bg-ink text-ivory hover:bg-ink hover:text-ivory"),
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          {profileControl}
          <ButtonLink
            href="/checkout"
            variant="primary"
            className={cn(
              "h-11 rounded-full px-5",
              transparent && "shadow-[0_18px_40px_rgba(255,122,26,0.24)]",
            )}
          >
            <ShoppingBag size={18} />
            Order now
          </ButtonLink>
        </div>

        <button
          className={cn(
            "grid size-11 place-items-center rounded-full border lg:hidden",
            transparent ? "border-white/18 bg-white/10 text-white" : "border-ink/10 bg-white text-ink",
          )}
          aria-label="Toggle navigation"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X size={21} /> : <Menu size={21} />}
        </button>
      </div>

      {open ? (
        <div className="section-shell mt-3 rounded-lg border border-ink/10 bg-ivory px-4 py-5 shadow-soft lg:hidden">
          <nav className="grid gap-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-button px-4 py-3 text-sm font-extrabold",
                  pathname === link.href ? "bg-ink text-ivory" : "bg-white/70 text-ink",
                )}
              >
                {link.label}
              </Link>
            ))}
            <ButtonLink href="/checkout" className="mt-2" onClick={() => setOpen(false)}>
              <ShoppingBag size={18} />
              Open cart
            </ButtonLink>
            {user ? (
              <>
                <Link
                  href={dashboardHref}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-button bg-white/70 px-4 py-3 text-sm font-extrabold text-ink"
                >
                  {isAdmin ? <ShieldCheck size={18} /> : <User size={18} />}
                  {isAdmin ? "Admin dashboard" : "My dashboard"}
                </Link>
                <button
                  type="button"
                  disabled={signingOut}
                  onClick={handleSignOut}
                  className={cn(
                    buttonStyles("secondary", "w-full justify-start"),
                    signingOut && "cursor-not-allowed opacity-60",
                  )}
                >
                  {signingOut ? <Loader2 className="animate-spin" size={18} /> : <LogOut size={18} />}
                  {signingOut ? "Signing out" : "Sign out"}
                </button>
              </>
            ) : (
              <ButtonLink href="/login" variant="secondary" onClick={() => setOpen(false)}>
                <UserCircle size={18} />
                Sign in
              </ButtonLink>
            )}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
