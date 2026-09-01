"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { animate, AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
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
import type { CustomPackageConfig } from "@/lib/cart-lines";
import type { CustomPackageItemOption } from "@/lib/custom-package";
import type { PackagePlan } from "@/lib/types";
import type { PackageScheduleAvailability } from "@/lib/package-schedule";

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

export function Navbar({
  plans,
  customItems,
  customConfig,
  availability,
}: {
  plans: PackagePlan[];
  customItems: CustomPackageItemOption[];
  customConfig: CustomPackageConfig;
  availability: PackageScheduleAvailability;
}) {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const {
    items: cartItems,
    openCart,
    pulseKey,
    registerPlans,
    registerCustomItems,
    registerAvailability,
  } = usePackageCart();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const profileRef = useRef<HTMLDivElement | null>(null);
  const navRef = useRef<HTMLElement | null>(null);
  const spotlightX = useRef(0);
  const ambienceX = useRef(0);
  const transparent = true;
  const user = session?.user;
  const isAdmin = user?.role === "ADMIN";
  const dashboardHref = isAdmin ? "/admin" : "/dashboard";
  const userInitials = initialsFromSession(user?.name, user?.email);
  const userLabel = isAdmin ? "Admin" : "Customer";
  const cartCount = cartItems.length;

  useEffect(() => {
    registerPlans(plans);
  }, [plans, registerPlans]);

  // The cart drawer is reachable from every marketing page, so the custom-item
  // catalogue has to be registered globally — otherwise a custom line renders
  // as unavailable at $0 anywhere outside the builder and checkout.
  useEffect(() => {
    registerCustomItems(customItems, customConfig);
  }, [customConfig, customItems, registerCustomItems]);

  useEffect(() => {
    registerAvailability(availability);
  }, [availability, registerAvailability]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!profileRef.current?.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setProfileOpen(false);
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const activeLinkIndex = Math.max(0, links.findIndex((link) => link.href === pathname));

  useEffect(() => {
    const nav = navRef.current;
    const activeLink = nav?.querySelector<HTMLElement>(`[data-nav-index="${activeLinkIndex}"]`);

    if (!nav || !activeLink) return;

    const navRect = nav.getBoundingClientRect();
    const activeRect = activeLink.getBoundingClientRect();
    const targetX = activeRect.left - navRect.left + activeRect.width / 2;

    animate(ambienceX.current, targetX, {
      type: "spring",
      stiffness: 240,
      damping: 24,
      onUpdate: (value) => {
        ambienceX.current = value;
        nav.style.setProperty("--nav-ambience-x", `${value}px`);
      },
    });
  }, [activeLinkIndex]);

  function handleNavMouseMove(event: React.MouseEvent<HTMLElement>) {
    const nav = event.currentTarget;
    const x = event.clientX - nav.getBoundingClientRect().left;

    spotlightX.current = x;
    nav.style.setProperty("--nav-spotlight-x", `${x}px`);
    nav.style.setProperty("--nav-spotlight-opacity", "1");
  }

  function handleNavMouseLeave() {
    const nav = navRef.current;
    const activeLink = nav?.querySelector<HTMLElement>(`[data-nav-index="${activeLinkIndex}"]`);

    if (!nav || !activeLink) return;

    nav.style.setProperty("--nav-spotlight-opacity", "0");
    const navRect = nav.getBoundingClientRect();
    const activeRect = activeLink.getBoundingClientRect();
    const targetX = activeRect.left - navRect.left + activeRect.width / 2;

    animate(spotlightX.current, targetX, {
      type: "spring",
      stiffness: 240,
      damping: 24,
      onUpdate: (value) => {
        spotlightX.current = value;
        nav.style.setProperty("--nav-spotlight-x", `${value}px`);
      },
    });
  }

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
          <span className="sr-only">{userLabel}</span>
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
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#0a0a0a]/95 text-white shadow-[0_12px_38px_rgba(0,0,0,0.2)] backdrop-blur-xl">
      <div
        className={cn(
          "section-shell flex min-h-[72px] items-center justify-between px-3 py-2 pl-4 md:px-4",
          transparent
            ? "text-white"
            : "text-ink",
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

        </div>

        <nav
          ref={navRef}
          onMouseMove={handleNavMouseMove}
          onMouseLeave={handleNavMouseLeave}
          className={cn(
            "absolute left-1/2 hidden h-11 -translate-x-1/2 items-center gap-1 overflow-hidden rounded-full min-[1240px]:flex",
            transparent ? "border-transparent bg-transparent" : "border-ink/10 bg-ink/[0.03]",
          )}
          style={
            {
              "--nav-spotlight-x": "0px",
              "--nav-ambience-x": "0px",
              "--nav-spotlight-opacity": 0,
            } as React.CSSProperties
          }
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[var(--nav-spotlight-opacity)] transition-opacity duration-300"
            style={{
              background:
                "radial-gradient(110px circle at var(--nav-spotlight-x) 100%, rgba(255, 122, 26, 0.28), transparent 68%)",
            }}
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
            style={{
              background:
                "radial-gradient(58px circle at var(--nav-ambience-x) 0%, rgba(255, 122, 26, 1), transparent 100%)",
            }}
          />
          {links.map((link, index) => (
            <Link
              key={link.href}
              href={link.href}
              data-nav-index={index}
              className={cn(
                "relative z-10 px-4 py-2 text-sm font-extrabold transition-colors duration-200",
                transparent ? "text-white/72 hover:text-white" : "text-ink/64 hover:text-ink",
                pathname === link.href &&
                  (transparent ? "text-saffron" : "bg-ink text-ivory hover:bg-ink hover:text-ivory"),
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

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

      </header>

      <AnimatePresence>
        {open ? (
          <>
            <motion.button
              type="button"
              aria-label="Close navigation"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[60] bg-black/62 min-[1240px]:hidden"
            />
            <motion.aside
              aria-label="Mobile navigation"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 330, damping: 34, mass: 0.9 }}
              className="fixed inset-y-0 left-0 z-[70] flex w-[min(86vw,23rem)] flex-col bg-[#11100e] px-5 pb-6 pt-5 text-white shadow-[20px_0_70px_rgba(0,0,0,0.42)] min-[1240px]:hidden"
            >
              <div className="flex items-center justify-between border-b border-white/12 pb-5">
                <Link href="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
                  <span className="grid size-10 place-items-center rounded-full bg-saffron font-display text-lg font-black text-ink">CK</span>
                  <span className="font-display text-xl font-black">Curry Kitchen</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close navigation"
                  className="grid size-11 place-items-center rounded-full border border-white/18 bg-white/8 transition duration-300 hover:bg-white hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron"
                >
                  <X size={21} />
                </button>
              </div>

              <motion.nav
                initial="hidden"
                animate="show"
                exit="hidden"
                variants={{
                  hidden: {},
                  show: { transition: { staggerChildren: 0.045, delayChildren: 0.12 } },
                }}
                className="mt-7 grid gap-1"
              >
                {links.map((link) => (
                  <motion.div
                    key={link.href}
                    variants={{ hidden: { opacity: 0, x: -16 }, show: { opacity: 1, x: 0 } }}
                    transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <Link
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center justify-between border-b border-white/10 px-1 py-4 font-display text-2xl font-black transition-colors duration-200",
                        pathname === link.href ? "text-saffron" : "text-white/88 hover:text-saffron",
                      )}
                    >
                      {link.label}
                      <ArrowRight size={18} aria-hidden />
                    </Link>
                  </motion.div>
                ))}
              </motion.nav>

              <div className="mt-auto grid gap-3 border-t border-white/12 pt-5">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    openCart();
                  }}
                  className={buttonStyles("primary", "w-full")}
                >
                  <ShoppingBag size={18} />
                  Open cart{cartCount ? ` (${cartCount})` : ""}
                </button>
                {user ? (
                  <>
                    <Link
                      href={dashboardHref}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 rounded-button border border-white/18 px-4 py-3 text-sm font-extrabold text-white transition hover:border-saffron hover:text-saffron"
                    >
                      {isAdmin ? <ShieldCheck size={18} /> : <User size={18} />}
                      {isAdmin ? "Admin dashboard" : "My dashboard"}
                    </Link>
                    <button
                      type="button"
                      disabled={signingOut}
                      onClick={handleSignOut}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-button border border-white/18 px-4 py-3 text-left text-sm font-extrabold text-white transition hover:border-white hover:bg-white hover:text-ink",
                        signingOut && "cursor-not-allowed opacity-60",
                      )}
                    >
                      {signingOut ? <Loader2 className="animate-spin" size={18} /> : <LogOut size={18} />}
                      {signingOut ? "Signing out" : "Sign out"}
                    </button>
                  </>
                ) : (
                  <ButtonLink href="/login" variant="secondary" onClick={() => setOpen(false)} className="w-full border-white/18 bg-white/8 text-white hover:bg-white hover:text-ink">
                    <UserCircle size={18} />
                    Sign in
                  </ButtonLink>
                )}
              </div>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
      <PackageCartDrawer />
    </>
  );
}
