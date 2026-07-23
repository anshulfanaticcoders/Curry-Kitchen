"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
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
import { PackageCartDrawer } from "@/components/cart/package-cart-drawer";
import { usePackageCart } from "@/components/providers/package-cart-provider";
import { ButtonLink, buttonStyles } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Home" },
  { href: "/menu", label: "Menu" },
  { href: "/packages", label: "Packages" },
  { href: "/about", label: "Our story" },
  { href: "/#reviews", label: "Reviews" },
  { href: "/contact", label: "Contact" },
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
  const { items: cartItems, openCart, pulseKey } = usePackageCart();
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
  const cartCount = cartItems.length;

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
    <>
      <header
      className={cn(
        "z-50 transition duration-500",
        pathname === "/" ? "fixed inset-x-0 top-4" : "sticky top-0 bg-white/88 py-3 backdrop-blur-xl",
      )}
    >
      <div
        className={cn(
          "section-shell flex min-h-16 items-center justify-between rounded-[2rem] border px-3 py-2 pl-4 transition duration-500 md:px-4",
          transparent
            ? "border-white/16 bg-black/30 text-white shadow-[0_18px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl"
            : "border-ink/10 bg-white/94 text-ink shadow-[0_18px_46px_rgba(7,7,7,0.08)] backdrop-blur-xl",
        )}
      >
        <div className="flex min-w-0 shrink-0 items-center">
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
              <span className="block whitespace-nowrap font-display text-2xl font-black leading-none">Curry Kitchen</span>
            </span>
          </Link>

          <nav
            className={cn(
              "mx-8 hidden items-center gap-1 rounded-full border p-1 min-[1240px]:flex",
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
        </div>

        <div className="hidden shrink-0 items-center gap-2 min-[1240px]:flex">
          {profileControl}
          <motion.button
            key={pulseKey}
            type="button"
            aria-label={`Open package cart${cartCount ? `, ${cartCount} package${cartCount === 1 ? "" : "s"}` : ""}`}
            title="Open cart"
            onClick={openCart}
            initial={pulseKey ? { scale: 0.92, rotate: -8 } : false}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 20 }}
            className={cn(
              "relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-sm font-extrabold transition duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron focus-visible:ring-offset-2",
              transparent
                ? "border-white/18 bg-white/10 text-white hover:bg-white hover:text-ink focus-visible:ring-offset-ink"
                : "border-ink/15 bg-white text-ink hover:-translate-y-0.5 hover:border-saffron hover:bg-rose focus-visible:ring-offset-ivory",
            )}
          >
            <ShoppingBag size={18} />
            <AnimatePresence initial={false}>
              {cartCount ? (
                <motion.span
                  key={cartCount}
                  initial={{ opacity: 0, scale: 0.4, y: 4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.4 }}
                  transition={{ type: "spring", stiffness: 520, damping: 24 }}
                  className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-saffron text-[10px] font-black text-ink shadow-[0_4px_14px_rgba(255,122,26,0.48)]"
                >
                  {cartCount > 9 ? "9+" : cartCount}
                </motion.span>
              ) : null}
            </AnimatePresence>
            <span className="sr-only">Open cart</span>
          </motion.button>
          <ButtonLink
            href="/packages#build-plan"
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

        <div className="flex shrink-0 items-center gap-2 min-[1240px]:hidden">
          <motion.button
            key={`mobile-${pulseKey}`}
            type="button"
            aria-label={`Open package cart${cartCount ? `, ${cartCount} package${cartCount === 1 ? "" : "s"}` : ""}`}
            onClick={openCart}
            initial={pulseKey ? { scale: 0.9, rotate: -8 } : false}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 20 }}
            className={cn(
              "relative grid size-11 place-items-center rounded-full border",
              transparent ? "border-white/18 bg-white/10 text-white" : "border-ink/10 bg-white text-ink",
            )}
          >
            <ShoppingBag size={18} />
            {cartCount ? (
              <span className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-saffron text-[10px] font-black text-ink">
                {cartCount > 9 ? "9+" : cartCount}
              </span>
            ) : null}
          </motion.button>
          <button
            className={cn(
              "grid size-11 place-items-center rounded-full border",
              transparent ? "border-white/18 bg-white/10 text-white" : "border-ink/10 bg-white text-ink",
            )}
            aria-label="Toggle navigation"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="section-shell mt-3 rounded-lg border border-ink/10 bg-ivory px-4 py-5 shadow-soft min-[1240px]:hidden">
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
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                openCart();
              }}
              className={buttonStyles("primary", "mt-2 w-full")}
            >
              <ShoppingBag size={18} />
              Open cart{cartCount ? ` (${cartCount})` : ""}
            </button>
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
      <PackageCartDrawer />
    </>
  );
}
