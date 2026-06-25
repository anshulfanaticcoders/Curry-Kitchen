import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "dark";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-saffron text-ink shadow-lift hover:-translate-y-0.5 hover:bg-[#ff8f33] active:translate-y-0",
  secondary:
    "border border-ink/15 bg-white text-ink hover:-translate-y-0.5 hover:border-saffron hover:bg-rose",
  ghost: "text-ink hover:bg-ink/5",
  dark: "bg-ink text-ivory shadow-soft hover:-translate-y-0.5 hover:bg-charcoal",
};

export function buttonStyles(variant: ButtonVariant = "primary", className?: string) {
  return cn(
    "inline-flex h-12 items-center justify-center gap-2 rounded-button px-5 text-sm font-extrabold transition duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron focus-visible:ring-offset-2 focus-visible:ring-offset-ivory",
    variants[variant],
    className,
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export function Button({ variant = "primary", className, ...props }: ButtonProps) {
  return <button className={buttonStyles(variant, className)} {...props} />;
}

type ButtonLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  children: ReactNode;
  variant?: ButtonVariant;
};

export function ButtonLink({
  href,
  variant = "primary",
  className,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link href={href} className={buttonStyles(variant, className)} {...props}>
      {children}
    </Link>
  );
}
